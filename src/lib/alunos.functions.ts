import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const escolaIdSchema = z.object({ escolaId: z.string().uuid() });

const alunoInputSchema = z.object({
  escolaId: z.string().uuid(),
  nome: z.string().trim().min(2).max(160),
  matricula: z.string().trim().max(40).optional().nullable(),
  turmaId: z.string().uuid().optional().nullable(),
});

/**
 * Lista alunos da escola informada. RLS garante que apenas gestor/coordenador
 * (toda escola) ou professor (apenas suas turmas) recebam linhas.
 */
export const listarAlunos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => escolaIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("alunos")
      .select("id,nome,matricula,turma,turma_id,media_geral,progresso_spaece,created_at")
      .eq("escola_id", data.escolaId)
      .order("nome", { ascending: true });
    if (error) throw new Error(error.message);
    return { alunos: rows ?? [] };
  });

export const listarTurmas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => escolaIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("turmas")
      .select("id,nome,serie,curso,ano_letivo")
      .eq("escola_id", data.escolaId)
      .order("nome", { ascending: true });
    if (error) throw new Error(error.message);
    return { turmas: rows ?? [] };
  });

export const criarAluno = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => alunoInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    let turmaNome = "—";
    if (data.turmaId) {
      const { data: t } = await supabase
        .from("turmas")
        .select("nome")
        .eq("id", data.turmaId)
        .maybeSingle();
      turmaNome = t?.nome ?? "—";
    }

    const { data: row, error } = await supabase
      .from("alunos")
      .insert({
        escola_id: data.escolaId,
        nome: data.nome.trim(),
        matricula: data.matricula?.trim() || null,
        turma_id: data.turmaId ?? null,
        turma: turmaNome,
      })
      .select("id,nome,matricula,turma,turma_id,media_geral,progresso_spaece,created_at")
      .single();
    if (error) throw new Error(error.message);
    return { aluno: row };
  });

export const atualizarAluno = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    alunoInputSchema.extend({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    let turmaNome: string | null = null;
    if (data.turmaId) {
      const { data: t } = await supabase
        .from("turmas")
        .select("nome")
        .eq("id", data.turmaId)
        .maybeSingle();
      turmaNome = t?.nome ?? null;
    }

    const patch: Record<string, unknown> = {
      nome: data.nome.trim(),
      matricula: data.matricula?.trim() || null,
      turma_id: data.turmaId ?? null,
    };
    if (turmaNome) patch.turma = turmaNome;

    const { error } = await supabase
      .from("alunos")
      .update(patch)
      .eq("id", data.id)
      .eq("escola_id", data.escolaId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const excluirAluno = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), escolaId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("alunos")
      .delete()
      .eq("id", data.id)
      .eq("escola_id", data.escolaId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
