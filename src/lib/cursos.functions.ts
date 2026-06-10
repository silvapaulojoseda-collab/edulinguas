import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const escolaIdSchema = z.object({ escolaId: z.string().uuid() });
const cursoInputSchema = z.object({
  escolaId: z.string().uuid(),
  nome: z.string().trim().min(2).max(120),
  descricao: z.string().trim().max(500).optional().nullable(),
  ativo: z.boolean().optional(),
});

export const listarCursos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => escolaIdSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("cursos")
      .select("id,nome,descricao,ativo,created_at")
      .eq("escola_id", data.escolaId)
      .order("nome");
    if (error) throw new Error(error.message);
    return { cursos: rows ?? [] };
  });

export const criarCurso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => cursoInputSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("cursos")
      .insert({
        escola_id: data.escolaId,
        nome: data.nome.trim(),
        descricao: data.descricao?.trim() || null,
        ativo: data.ativo ?? true,
      })
      .select("id,nome,descricao,ativo,created_at")
      .single();
    if (error) throw new Error(error.message);
    return { curso: row };
  });

export const atualizarCurso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => cursoInputSchema.extend({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("cursos")
      .update({
        nome: data.nome.trim(),
        descricao: data.descricao?.trim() || null,
        ativo: data.ativo ?? true,
      })
      .eq("id", data.id)
      .eq("escola_id", data.escolaId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const excluirCurso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({ id: z.string().uuid(), escolaId: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("cursos")
      .delete()
      .eq("id", data.id)
      .eq("escola_id", data.escolaId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
