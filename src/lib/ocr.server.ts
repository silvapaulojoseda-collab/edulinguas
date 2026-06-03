import jsQR from "jsqr";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyQR } from "./qr.server";

type GabaritoItem = { ordem: number; alternativa_correta: string; descritor: string | null };

type CartaoResult = { status: "ok" | "dupla" | "qr_invalido" | "erro"; acertos?: number; total?: number };

const PNG_SIG = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

/**
 * Processa 1 cartão:
 * 1. Baixa imagem do storage
 * 2. Pede ao Gemini Flash (vision) que extraia o payload bruto do QR + marcações
 * 3. Valida assinatura HMAC do QR (impede QR de outra escola/avaliação)
 * 4. Compara com gabarito, persiste respostas e atualiza cartão
 */
export async function processCartao(input: {
  cartaoId: string;
  filePath: string;
  escolaId: string;
  avaliacaoId: string;
  gabarito: GabaritoItem[];
}): Promise<CartaoResult> {
  const { cartaoId, filePath, escolaId, avaliacaoId, gabarito } = input;

  const { data: file, error: dErr } = await supabaseAdmin.storage
    .from("cartoes-resposta")
    .download(filePath);
  if (dErr || !file) throw new Error("Imagem não encontrada");

  const buf = new Uint8Array(await file.arrayBuffer());
  if (buf.length > PNG_SIG.length && PNG_SIG.every((b, i) => buf[i] === b)) {
    void jsQR; // reservado para decodificador local futuro
  }

  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");

  const base64 = btoa(String.fromCharCode(...buf));
  const mime = file.type || "image/png";

  const prompt = `Você é um leitor automatizado de cartões-resposta escolares.
Analise a imagem deste cartão (com QR code de identificação e marcações em bolhas A-E) e retorne:
- qr_payload: o conteúdo bruto (texto exato) lido do QR code. Geralmente é um JSON pequeno. Se não conseguir ler, retorne null.
- marcacoes: para cada questão (1..${Math.max(gabarito.length, 30)}), a alternativa marcada (A,B,C,D,E ou null se em branco).
- dupla_marcacao: lista de números de questões com mais de uma bolha pintada.
Responda APENAS chamando a função extrair_cartao.`;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:${mime};base64,${base64}` } },
          ],
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extrair_cartao",
            description: "Retorna leitura do cartão-resposta.",
            parameters: {
              type: "object",
              properties: {
                qr_payload: { type: ["string", "null"] },
                marcacoes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      questao: { type: "number" },
                      alternativa: { type: ["string", "null"], enum: ["A", "B", "C", "D", "E", null] },
                    },
                    required: ["questao", "alternativa"],
                  },
                },
                dupla_marcacao: { type: "array", items: { type: "number" } },
              },
              required: ["qr_payload", "marcacoes", "dupla_marcacao"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "extrair_cartao" } },
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`AI Gateway ${resp.status}: ${txt.slice(0, 200)}`);
  }
  const json = (await resp.json()) as {
    choices: Array<{ message: { tool_calls?: Array<{ function: { arguments: string } }> } }>;
  };
  const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("Resposta inválida da IA");
  const parsed = JSON.parse(args) as {
    qr_payload: string | null;
    marcacoes: Array<{ questao: number; alternativa: string | null }>;
    dupla_marcacao: number[];
  };

  // Valida QR via HMAC
  const verified = verifyQR(parsed.qr_payload);
  let alunoId: string | null = null;
  let qrInvalido = false;
  let motivoQr: string | null = null;

  if (!verified) {
    qrInvalido = true;
    motivoQr = parsed.qr_payload ? "Assinatura do QR inválida" : "QR não detectado";
  } else if (verified.escolaId !== escolaId) {
    qrInvalido = true;
    motivoQr = "QR pertence a outra escola";
  } else if (verified.avaliacaoId !== avaliacaoId) {
    qrInvalido = true;
    motivoQr = "QR pertence a outra avaliação";
  } else {
    const { data: aluno } = await supabaseAdmin
      .from("alunos")
      .select("id")
      .eq("id", verified.alunoId)
      .eq("escola_id", escolaId)
      .maybeSingle();
    if (!aluno) {
      qrInvalido = true;
      motivoQr = "Aluno do QR não encontrado nesta escola";
    } else {
      alunoId = aluno.id;
    }
  }

  // Computa respostas
  const gabMap = new Map(gabarito.map((g) => [g.ordem, g]));
  const total = Math.max(gabarito.length, parsed.marcacoes.length);
  let acertos = 0;
  const respostas = parsed.marcacoes.map((m) => {
    const g = gabMap.get(m.questao);
    const correta = g != null && m.alternativa === g.alternativa_correta;
    if (correta) acertos++;
    return {
      cartao_id: cartaoId,
      questao_ordem: m.questao,
      marcada: m.alternativa,
      correta,
      descritor: g?.descritor ?? null,
    };
  });

  if (respostas.length) {
    await supabaseAdmin.from("respostas").delete().eq("cartao_id", cartaoId);
    await supabaseAdmin.from("respostas").insert(respostas);
  }

  const dupla = parsed.dupla_marcacao.length > 0;
  const status: CartaoResult["status"] = qrInvalido ? "qr_invalido" : dupla ? "dupla" : "ok";

  await supabaseAdmin
    .from("cartoes_ocr")
    .update({
      qr_lido: parsed.qr_payload?.slice(0, 200) ?? null,
      aluno_id: alunoId,
      marcacoes: parsed as never,
      acertos,
      total,
      status,
      motivo_erro: qrInvalido
        ? motivoQr
        : dupla
          ? `Dupla marcação em ${parsed.dupla_marcacao.length} questão(ões)`
          : null,
    })
    .eq("id", cartaoId);

  return { status, acertos, total };
}
