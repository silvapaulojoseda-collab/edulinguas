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
      .select("id,nome,serie,curso,curso_id,ano_letivo")
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
      const { data: t } = await supabase.from("turmas").select("nome").eq("id", data.turmaId).maybeSingle();
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
  .inputValidator((input) => alunoInputSchema.extend({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let turmaNome: string | null = null;
    if (data.turmaId) {
      const { data: t } = await supabase.from("turmas").select("nome").eq("id", data.turmaId).maybeSingle();
      turmaNome = t?.nome ?? null;
    }
    const patch = {
      nome: data.nome.trim(),
      matricula: data.matricula?.trim() || null,
      turma_id: data.turmaId ?? null,
      ...(turmaNome ? { turma: turmaNome } : {}),
    };
    const { error } = await supabase.from("alunos").update(patch).eq("id", data.id).eq("escola_id", data.escolaId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const excluirAluno = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), escolaId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("alunos")
      .delete()
      .eq("id", data.id)
      .eq("escola_id", data.escolaId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================================================
// IMPORTAÇÃO EM MASSA
// ============================================================
const importRowSchema = z.object({
  matricula: z.string().trim().max(40).optional().nullable(),
  nome: z.string().trim().min(2).max(160),
  turma: z.string().trim().max(80).optional().nullable(),
  curso: z.string().trim().max(120).optional().nullable(),
});
const importSchema = z.object({
  escolaId: z.string().uuid(),
  anoLetivo: z.number().int().min(2000).max(2100),
  rows: z.array(importRowSchema).min(1).max(2000),
  fileName: z.string().max(200).optional(),
});

export type ImportResult = {
  total: number;
  importados: number;
  atualizados: number;
  ignorados: number;
  erros: number;
  erroDetalhes: { linha: number; nome?: string; matricula?: string | null; motivo: string }[];
};

export const importarAlunos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => importSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ resultado: ImportResult }> => {
    const { supabase, userId } = context;

    // Permissão: gestor ou coordenador
    const { data: gc } = await supabase.rpc("is_gestor_ou_coordenador", {
      _user_id: userId,
      _escola_id: data.escolaId,
    });
    if (!gc) throw new Error("Apenas gestores e coordenadores podem importar alunos.");

    // Cache de turmas existentes / criadas
    const { data: turmasExist } = await supabase
      .from("turmas")
      .select("id,nome,curso_id,ano_letivo")
      .eq("escola_id", data.escolaId)
      .eq("ano_letivo", data.anoLetivo);
    const turmaByNome = new Map<string, { id: string; nome: string }>();
    for (const t of turmasExist ?? []) turmaByNome.set(t.nome.toLowerCase(), { id: t.id, nome: t.nome });

    const { data: cursosExist } = await supabase
      .from("cursos").select("id,nome").eq("escola_id", data.escolaId);
    const cursoByNome = new Map<string, { id: string; nome: string }>();
    for (const c of cursosExist ?? []) cursoByNome.set(c.nome.toLowerCase(), c);

    const resultado: ImportResult = {
      total: data.rows.length,
      importados: 0,
      atualizados: 0,
      ignorados: 0,
      erros: 0,
      erroDetalhes: [],
    };

    for (let i = 0; i < data.rows.length; i++) {
      const linha = i + 2; // header + 1-based
      const r = data.rows[i];
      try {
        const nome = r.nome?.trim();
        if (!nome || nome.length < 2) {
          resultado.ignorados++;
          continue;
        }
        const matricula = r.matricula?.trim() || null;
        const turmaNome = r.turma?.trim() || null;
        const cursoNome = r.curso?.trim() || null;

        // Curso (cria se necessário)
        let cursoId: string | null = null;
        if (cursoNome) {
          const key = cursoNome.toLowerCase();
          let curso = cursoByNome.get(key);
          if (!curso) {
            const { data: novo, error: ec } = await supabase
              .from("cursos")
              .insert({ escola_id: data.escolaId, nome: cursoNome, ativo: true })
              .select("id,nome")
              .single();
            if (ec) throw new Error(`curso: ${ec.message}`);
            curso = novo!;
            cursoByNome.set(key, curso);
          }
          cursoId = curso.id;
        }

        // Turma (cria se necessário)
        let turmaId: string | null = null;
        let turmaFinal = turmaNome ?? "—";
        if (turmaNome) {
          const key = turmaNome.toLowerCase();
          let turma = turmaByNome.get(key);
          if (!turma) {
            const { data: nova, error: et } = await supabase
              .from("turmas")
              .insert({
                escola_id: data.escolaId,
                nome: turmaNome,
                curso: cursoNome,
                curso_id: cursoId,
                ano_letivo: data.anoLetivo,
                ativo: true,
              })
              .select("id,nome")
              .single();
            if (et) throw new Error(`turma: ${et.message}`);
            turma = { id: nova!.id, nome: nova!.nome };
            turmaByNome.set(key, turma);
          }
          turmaId = turma.id;
          turmaFinal = turma.nome;
        }

        // Aluno: se tem matrícula faz upsert por (escola_id, matricula); senão verifica por nome+turma
        if (matricula) {
          const { data: existente } = await supabase
            .from("alunos")
            .select("id")
            .eq("escola_id", data.escolaId)
            .eq("matricula", matricula)
            .maybeSingle();
          if (existente) {
            const { error: eu } = await supabase
              .from("alunos")
              .update({ nome, turma: turmaFinal, turma_id: turmaId })
              .eq("id", existente.id);
            if (eu) throw new Error(eu.message);
            resultado.atualizados++;
          } else {
            const { error: ei } = await supabase.from("alunos").insert({
              escola_id: data.escolaId,
              matricula,
              nome,
              turma: turmaFinal,
              turma_id: turmaId,
            });
            if (ei) throw new Error(ei.message);
            resultado.importados++;
          }
        } else {
          const { error: ei } = await supabase.from("alunos").insert({
            escola_id: data.escolaId,
            nome,
            turma: turmaFinal,
            turma_id: turmaId,
          });
          if (ei) throw new Error(ei.message);
          resultado.importados++;
        }
      } catch (e) {
        resultado.erros++;
        resultado.erroDetalhes.push({
          linha,
          nome: r.nome,
          matricula: r.matricula ?? null,
          motivo: (e as Error).message,
        });
      }
    }

    // Auditoria
    try {
      await supabase.rpc("log_audit", {
        _user_id: userId,
        _escola_id: data.escolaId,
        _acao: "importar_alunos",
        _entidade: "alunos",
        _metadata: {
          arquivo: data.fileName ?? null,
          ano_letivo: data.anoLetivo,
          ...resultado,
          erroDetalhes: resultado.erroDetalhes.slice(0, 50),
        },
      });
    } catch {
      // não bloqueia
    }

    return { resultado };
  });
