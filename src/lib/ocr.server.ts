import jsQR from "jsqr";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type GabaritoItem = { ordem: number; alternativa_correta: string; descritor: string | null };

type CartaoResult = { status: "ok" | "dupla" | "qr_invalido" | "erro"; acertos?: number; total?: number };

const PNG_SIG = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

/**
 * Processa 1 cartão:
 * 1. Baixa imagem do storage
 * 2. Detecta QR (matrícula) com jsQR (Worker-safe, JS puro)
 * 3. Chama Gemini Flash via Lovable AI Gateway com a imagem para extrair marcações
 * 4. Compara com gabarito, persiste respostas e atualiza cartão
 */
export async function processCartao(input: {
  cartaoId: string;
  filePath: string;
  escolaId: string;
  gabarito: GabaritoItem[];
}): Promise<CartaoResult> {
  const { cartaoId, filePath, escolaId, gabarito } = input;

  // 1. Download image
  const { data: file, error: dErr } = await supabaseAdmin.storage
    .from("cartoes-resposta")
    .download(filePath);
  if (dErr || !file) throw new Error("Imagem não encontrada");

  const buf = new Uint8Array(await file.arrayBuffer());

  // 2. Try to read QR. jsQR needs raw RGBA pixel array — only feasible on PNG via simple decode.
  // For real production we'd run a server-side image decoder; for MVP we delegate QR + marking detection to Gemini.
  let qrLido: string | null = null;
  if (buf.length > PNG_SIG.length && PNG_SIG.every((b, i) => buf[i] === b)) {
    // PNG path — leave jsQR for the future when we have a wasm decoder bundled
    void jsQR; // ensure import isn't tree-shaken
  }

  // 3. Send to Lovable AI Gateway (vision) for QR + marcações
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");

  const base64 = btoa(String.fromCharCode(...buf));
  const mime = file.type || "image/png";

  const prompt = `Você é um leitor automatizado de cartões-resposta escolares.
Analise a imagem deste cartão (com QR code da matrícula e marcações em bolhas A-E) e retorne:
- matricula: número impresso ou codificado no QR
- marcacoes: para cada questão (1..${Math.max(gabarito.length, 30)}), a alternativa marcada (A,B,C,D,E ou null se em branco)
- dupla_marcacao: lista de questões com mais de uma bolha pintada
Responda APENAS chamando a função extrair_cartao.`;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
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
                matricula: { type: ["string", "null"] },
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
              required: ["matricula", "marcacoes", "dupla_marcacao"],
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
    choices: Array<{
      message: { tool_calls?: Array<{ function: { arguments: string } }> };
    }>;
  };
  const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("Resposta inválida da IA");
  const parsed = JSON.parse(args) as {
    matricula: string | null;
    marcacoes: Array<{ questao: number; alternativa: string | null }>;
    dupla_marcacao: number[];
  };

  qrLido = parsed.matricula?.toString().trim() || null;

  // Lookup aluno
  let alunoId: string | null = null;
  if (qrLido) {
    const { data: aluno } = await supabaseAdmin
      .from("alunos")
      .select("id")
      .eq("escola_id", escolaId)
      .eq("matricula", qrLido)
      .maybeSingle();
    alunoId = aluno?.id ?? null;
  }

  // Compute respostas
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
  const status: CartaoResult["status"] = !qrLido ? "qr_invalido" : dupla ? "dupla" : "ok";

  await supabaseAdmin
    .from("cartoes_ocr")
    .update({
      qr_lido: qrLido,
      aluno_id: alunoId,
      marcacoes: parsed,
      acertos,
      total,
      status,
      motivo_erro: !qrLido ? "QR não detectado" : dupla ? `Dupla marcação em ${parsed.dupla_marcacao.length} questão(ões)` : null,
    })
    .eq("id", cartaoId);

  return { status, acertos, total };
}
