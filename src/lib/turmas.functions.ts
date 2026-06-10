import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const escolaIdSchema = z.object({ escolaId: z.string().uuid() });

const turmaInputSchema = z.object({
  escolaId: z.string().uuid(),
  nome: z.string().trim().min(1).max(80),
  serie: z.string().trim().max(40).optional().nullable(),
  cursoId: z.string().uuid().optional().nullable(),
  turno: z.enum(["manha", "tarde", "noite", "integral"]).optional().nullable(),
  capacidade: z.number().int().min(0).max(500).optional().nullable(),
  anoLetivo: z.number().int().min(2000).max(2100),
  ativo: z.boolean().optional(),
});

export const listarTurmasCompleto = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => escolaIdSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("turmas")
      .select("id,nome,serie,curso,curso_id,turno,capacidade,ano_letivo,ativo,created_at,cursos(nome)")
      .eq("escola_id", data.escolaId)
      .order("ano_letivo", { ascending: false })
      .order("nome");
    if (error) throw new Error(error.message);

    // Contagem de alunos por turma
    const { data: counts } = await context.supabase
      .from("alunos")
      .select("turma_id")
      .eq("escola_id", data.escolaId);
    const tally = new Map<string, number>();
    for (const r of counts ?? []) {
      if (r.turma_id) tally.set(r.turma_id, (tally.get(r.turma_id) ?? 0) + 1);
    }

    return {
      turmas: (rows ?? []).map((t) => ({
        ...t,
        curso_nome: (t.cursos as { nome: string } | null)?.nome ?? t.curso ?? null,
        total_alunos: tally.get(t.id) ?? 0,
      })),
    };
  });

export const criarTurma = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => turmaInputSchema.parse(i))
  .handler(async ({ data, context }) => {
    let cursoNome: string | null = null;
    if (data.cursoId) {
      const { data: c } = await context.supabase
        .from("cursos").select("nome").eq("id", data.cursoId).maybeSingle();
      cursoNome = c?.nome ?? null;
    }
    const { data: row, error } = await context.supabase
      .from("turmas")
      .insert({
        escola_id: data.escolaId,
        nome: data.nome.trim(),
        serie: data.serie?.trim() || null,
        curso: cursoNome,
        curso_id: data.cursoId ?? null,
        turno: data.turno ?? null,
        capacidade: data.capacidade ?? null,
        ano_letivo: data.anoLetivo,
        ativo: data.ativo ?? true,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { turma: row };
  });

export const atualizarTurma = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => turmaInputSchema.extend({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    let cursoNome: string | null = null;
    if (data.cursoId) {
      const { data: c } = await context.supabase
        .from("cursos").select("nome").eq("id", data.cursoId).maybeSingle();
      cursoNome = c?.nome ?? null;
    }
    const { error } = await context.supabase
      .from("turmas")
      .update({
        nome: data.nome.trim(),
        serie: data.serie?.trim() || null,
        curso: cursoNome,
        curso_id: data.cursoId ?? null,
        turno: data.turno ?? null,
        capacidade: data.capacidade ?? null,
        ano_letivo: data.anoLetivo,
        ativo: data.ativo ?? true,
      })
      .eq("id", data.id)
      .eq("escola_id", data.escolaId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const excluirTurma = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid(), escolaId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("turmas")
      .delete()
      .eq("id", data.id)
      .eq("escola_id", data.escolaId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
