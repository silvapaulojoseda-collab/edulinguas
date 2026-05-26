import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { agregarDesempenho, callAIJson, callAIChat } from "./ia.server";

const PROMPT_PARECER = `Você é um especialista em avaliação educacional (BNCC + SPAECE).
Receba um relatório agregado de desempenho de uma turma e produza:
- diagnostico (texto pedagógico de 4 a 6 frases)
- pontos_fortes (lista de até 4)
- gargalos (lista de até 4)
- descritores_criticos (lista com {code, descricao, media_pct})
- plano_intervencao (lista com {periodo, acao})
- previsao_spaece (objeto {pontuacao, faixa: "abaixo|intermediario|adequado|avancado"})
Linguagem clara, sem jargão acadêmico excessivo. Português do Brasil.`;

export const gerarParecer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        turmaId: z.string().uuid().nullable().optional(),
        avaliacaoId: z.string().uuid().nullable().optional(),
        disciplina: z.string().max(80).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: prof } = await supabase.from("profiles").select("escola_ativa_id").eq("user_id", userId).maybeSingle();
    const escolaId = prof?.escola_ativa_id;
    if (!escolaId) throw new Error("Sem escola ativa");


    const agregado = await agregarDesempenho({
      escolaId,
      turmaId: data.turmaId ?? null,
      avaliacaoId: data.avaliacaoId ?? null,
    });

    const schema = {
      name: "gerar_parecer",
      description: "Parecer pedagógico estruturado.",
      parameters: {
        type: "object",
        properties: {
          diagnostico: { type: "string" },
          pontos_fortes: { type: "array", items: { type: "string" } },
          gargalos: { type: "array", items: { type: "string" } },
          descritores_criticos: {
            type: "array",
            items: {
              type: "object",
              properties: {
                code: { type: "string" },
                descricao: { type: "string" },
                media_pct: { type: "number" },
              },
              required: ["code", "descricao", "media_pct"],
            },
          },
          plano_intervencao: {
            type: "array",
            items: {
              type: "object",
              properties: { periodo: { type: "string" }, acao: { type: "string" } },
              required: ["periodo", "acao"],
            },
          },
          previsao_spaece: {
            type: "object",
            properties: {
              pontuacao: { type: "number" },
              faixa: { type: "string", enum: ["abaixo", "intermediario", "adequado", "avancado"] },
            },
            required: ["pontuacao", "faixa"],
          },
        },
        required: [
          "diagnostico",
          "pontos_fortes",
          "gargalos",
          "descritores_criticos",
          "plano_intervencao",
          "previsao_spaece",
        ],
      },
    };

    const userMsg = `Disciplina: ${data.disciplina ?? "Geral"}
Agregado da turma (JSON):
${JSON.stringify(agregado, null, 2)}`;

    const dados = await callAIJson({
      model: "openai/gpt-5.2",
      system: PROMPT_PARECER,
      user: userMsg,
      schema,
    });

    const { data: parecer, error } = await supabase
      .from("pareceres_ia")
      .insert({
        escola_id: escolaId,
        turma_id: data.turmaId ?? null,
        avaliacao_id: data.avaliacaoId ?? null,
        disciplina: data.disciplina ?? null,
        texto: dados.diagnostico,
        dados: dados as never,
        modelo: "openai/gpt-5.2",
        gerado_por: userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    return { parecer };
  });

export const perguntarIA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        turmaId: z.string().uuid().nullable().optional(),
        pergunta: z.string().min(1).max(2000),
        historico: z
          .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
          .max(20)
          .optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: prof } = await supabase.from("profiles").select("escola_ativa_id").eq("user_id", userId).maybeSingle();
    const escolaId = prof?.escola_ativa_id;
    if (!escolaId) throw new Error("Sem escola ativa");

    const agregado = await agregarDesempenho({
      escolaId,
      turmaId: data.turmaId ?? null,
      avaliacaoId: null,
    });

    const sys = `Você é um assistente pedagógico do EduLinguas AI. Use os dados agregados (JSON) abaixo como única fonte da verdade sobre a turma. Seja conciso, pratique pedagogia BNCC/SPAECE. Português.
Dados: ${JSON.stringify(agregado)}`;

    const resposta = await callAIChat({
      model: "google/gemini-2.5-flash",
      system: sys,
      messages: [...(data.historico ?? []), { role: "user", content: data.pergunta }],
    });

    return { resposta };
  });
