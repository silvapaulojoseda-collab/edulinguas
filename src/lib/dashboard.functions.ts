import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Estatísticas do dashboard: totais e agregados por escola ativa.
 * Tudo em RLS do usuário — retorna zero se ele não pertence à escola.
 */
export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ escolaId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const escolaId = data.escolaId;

    const [alunos, turmas, avaliacoes, cartoes, alunosMedia, respostas] = await Promise.all([
      supabase.from("alunos").select("id", { count: "exact", head: true }).eq("escola_id", escolaId),
      supabase.from("turmas").select("id", { count: "exact", head: true }).eq("escola_id", escolaId).eq("ativo", true),
      supabase.from("avaliacoes").select("id", { count: "exact", head: true }).eq("escola_id", escolaId),
      supabase
        .from("cartoes_ocr")
        .select("id,lotes_ocr!inner(escola_id)", { count: "exact", head: true })
        .eq("status", "ok")
        .eq("lotes_ocr.escola_id", escolaId),
      supabase.from("alunos").select("media_geral").eq("escola_id", escolaId).not("media_geral", "is", null),
      supabase
        .from("respostas")
        .select("descritor,correta,cartoes_ocr!inner(lotes_ocr!inner(escola_id))")
        .eq("cartoes_ocr.lotes_ocr.escola_id", escolaId)
        .not("descritor", "is", null)
        .limit(20000),
    ]);

    const notas = (alunosMedia.data ?? [])
      .map((r) => Number(r.media_geral))
      .filter((n) => Number.isFinite(n));
    const mediaGeral = notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : 0;

    // Ranking descritor (para painel IA no dashboard)
    const bucket = new Map<string, { total: number; ok: number }>();
    for (const r of respostas.data ?? []) {
      const d = r.descritor as string | null;
      if (!d) continue;
      const cur = bucket.get(d) ?? { total: 0, ok: 0 };
      cur.total++;
      if (r.correta) cur.ok++;
      bucket.set(d, cur);
    }
    const descritores = Array.from(bucket.entries())
      .map(([code, v]) => ({
        code,
        desc: code,
        media: v.total ? Math.round((v.ok / v.total) * 100) : 0,
        amostras: v.total,
      }))
      .sort((a, b) => a.media - b.media)
      .slice(0, 6);

    return {
      alunos: alunos.count ?? 0,
      turmas: turmas.count ?? 0,
      avaliacoes: avaliacoes.count ?? 0,
      cartoes: cartoes.count ?? 0,
      mediaGeral: Number(mediaGeral.toFixed(1)),
      descritores,
    };
  });
