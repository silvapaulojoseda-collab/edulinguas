import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { processCartao } from "./ocr.server";

/**
 * Cria um lote OCR já com seus cartões marcados como `pending` e dispara
 * o pipeline assíncrono (fire-and-forget). O frontend acompanha via Realtime/polling.
 */
export const criarLoteOcr = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        avaliacaoId: z.string().uuid(),
        turmaId: z.string().uuid().nullable().optional(),
        arquivos: z
          .array(
            z.object({
              path: z.string().min(1).max(500),
              nome: z.string().min(1).max(255),
            }),
          )
          .min(1)
          .max(100),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: aval, error: aErr } = await supabase
      .from("avaliacoes")
      .select("id,escola_id")
      .eq("id", data.avaliacaoId)
      .maybeSingle();
    if (aErr || !aval) throw new Error("Avaliação não encontrada");

    const { data: lote, error: lErr } = await supabase
      .from("lotes_ocr")
      .insert({
        escola_id: aval.escola_id,
        avaliacao_id: aval.id,
        turma_id: data.turmaId ?? null,
        criado_por: userId,
        total: data.arquivos.length,
        status: "pending",
      })
      .select()
      .single();
    if (lErr || !lote) throw new Error(lErr?.message ?? "Erro ao criar lote");

    const cartoes = data.arquivos.map((a) => ({
      lote_id: lote.id,
      file_path: a.path,
      status: "pending" as const,
    }));
    const { error: cErr } = await supabase.from("cartoes_ocr").insert(cartoes);
    if (cErr) throw new Error(cErr.message);

    // Dispara processamento em background (não aguarda)
    processLoteBackground(lote.id).catch((e) => console.error("background OCR", e));

    return { loteId: lote.id };
  });

async function processLoteBackground(loteId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("lotes_ocr").update({ status: "processing" }).eq("id", loteId);

  const { data: cartoes } = await supabaseAdmin
    .from("cartoes_ocr")
    .select("id,file_path,lote_id")
    .eq("lote_id", loteId)
    .eq("status", "pending");

  if (!cartoes) return;

  const { data: lote } = await supabaseAdmin
    .from("lotes_ocr")
    .select("avaliacao_id,escola_id,criado_por")
    .eq("id", loteId)
    .single();
  if (!lote) return;

  const { data: gabarito } = await supabaseAdmin
    .from("gabaritos")
    .select("ordem,alternativa_correta,descritor")
    .eq("avaliacao_id", lote.avaliacao_id);

  let processados = 0;
  let erros = 0;

  for (const cartao of cartoes) {
    try {
      const resultado = await processCartao({
        cartaoId: cartao.id,
        filePath: cartao.file_path,
        escolaId: lote.escola_id,
        avaliacaoId: lote.avaliacao_id,
        gabarito: gabarito ?? [],
      });
      processados++;
      if (resultado.status !== "ok") erros++;
    } catch (e) {
      console.error("cartão erro", e);
      erros++;
      await supabaseAdmin
        .from("cartoes_ocr")
        .update({ status: "erro", motivo_erro: e instanceof Error ? e.message : "Erro desconhecido" })
        .eq("id", cartao.id);
    }
    await supabaseAdmin
      .from("lotes_ocr")
      .update({ processados, erros })
      .eq("id", loteId);
  }

  await supabaseAdmin
    .from("lotes_ocr")
    .update({ status: erros === cartoes.length ? "error" : "done" })
    .eq("id", loteId);

  if (lote.criado_por) {
    await supabaseAdmin.from("notificacoes").insert({
      user_id: lote.criado_por,
      escola_id: lote.escola_id,
      tipo: "ocr_concluido",
      mensagem: `Lote OCR finalizado: ${processados - erros}/${cartoes.length} cartões lidos com sucesso.`,
      link: `/ocr?lote=${loteId}`,
    });
  }
}

export const getStatusLote = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ loteId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: lote } = await supabase
      .from("lotes_ocr")
      .select("id,status,total,processados,erros,created_at")
      .eq("id", data.loteId)
      .maybeSingle();
    if (!lote) throw new Error("Lote não encontrado");

    const { data: cartoes } = await supabase
      .from("cartoes_ocr")
      .select("id,file_path,status,acertos,total,motivo_erro,qr_lido,aluno_id,alunos(nome,matricula)")
      .eq("lote_id", data.loteId)
      .order("created_at", { ascending: true });

    return { lote, cartoes: cartoes ?? [] };
  });

export const uploadCartaoUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        escolaId: z.string().uuid(),
        loteRef: z.string().min(1).max(100),
        filename: z.string().min(1).max(255).regex(/^[a-zA-Z0-9._-]+$/),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Verifica que o caller pertence à escola informada para evitar gravar em pastas alheias
    const { data: membership, error: mErr } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("escola_id", data.escolaId)
      .limit(1)
      .maybeSingle();
    if (mErr) throw new Error(mErr.message);
    if (!membership) throw new Error("Sem acesso a esta escola.");

    const path = `${data.escolaId}/${data.loteRef}/${Date.now()}-${data.filename}`;
    const { data: signed, error } = await supabase.storage
      .from("cartoes-resposta")
      .createSignedUploadUrl(path);
    if (error || !signed) throw new Error(error?.message ?? "Falha ao gerar URL de upload");
    return { path, token: signed.token, signedUrl: signed.signedUrl };
  });
