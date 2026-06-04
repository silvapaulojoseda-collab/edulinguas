import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

const DEFAULT_ESCOLA_ID = "00000000-0000-0000-0000-00000000e001";

/**
 * Garante que o usuário recém-criado tenha papel atribuído.
 * Primeiro usuário do sistema vira gestor da escola padrão.
 * Demais usuários entram como professor da escola padrão (gestor promove depois).
 */
export const ensureMembership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: existing } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .limit(1);

    if (existing && existing.length > 0) return { ok: true, created: false };

    // Count global gestores to decide role
    const { count } = await supabase
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("escola_id", DEFAULT_ESCOLA_ID)
      .eq("role", "gestor");

    const role = (count ?? 0) === 0 ? "gestor" : "professor";

    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, escola_id: DEFAULT_ESCOLA_ID, role });
    if (error) throw new Error(error.message);

    await supabase
      .from("profiles")
      .update({ escola_ativa_id: DEFAULT_ESCOLA_ID })
      .eq("user_id", userId);

    return { ok: true, created: true, role };
  });

/**
 * Atribui ou troca o papel de um usuário em uma escola.
 *
 * Segurança:
 * - apenas um gestor da própria escola pode chamar (checado server-side com supabaseAdmin);
 * - promoção a "gestor" é bloqueada nesta rota — usar fluxo administrativo dedicado;
 * - usa supabaseAdmin para a escrita (a policy de user_roles é restrita).
 */
export const promoverUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        userId: z.string().uuid(),
        escolaId: z.string().uuid(),
        role: z.enum(["coordenador", "professor"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId: callerId } = context;

    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", callerId)
      .eq("escola_id", data.escolaId)
      .eq("role", "gestor")
      .maybeSingle();
    if (!callerRole) {
      throw new Error("Apenas gestores desta escola podem alterar papéis.");
    }

    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: data.userId, escola_id: data.escolaId, role: data.role },
        { onConflict: "user_id,escola_id,role", ignoreDuplicates: true },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });


/**
 * Cria uma nova escola e atribui o usuário como gestor.
 * Usa supabaseAdmin pois:
 * - a tabela `escolas` não permite INSERT via RLS (apenas SELECT/UPDATE de membros)
 * - a policy de `user_roles` exige que o caller já seja gestor da escola para inserir papéis
 *
 * Esta é a única forma autorizada de bootstrapping de uma nova escola pelo próprio criador.
 */
export const criarEscola = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        nome: z.string().min(2).max(160),
        cidade: z.string().max(120).optional().nullable(),
        uf: z.string().length(2).optional().nullable(),
        inep: z
          .string()
          .regex(/^\d{6,10}$/u, "INEP inválido")
          .optional()
          .nullable(),
        ativarComoAtual: z.boolean().optional().default(true),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const payload = {
      nome: data.nome.trim(),
      cidade: data.cidade?.trim() || null,
      uf: data.uf?.trim().toUpperCase() || null,
      inep: data.inep?.trim() || null,
    };

    const { data: escola, error: errEscola } = await supabaseAdmin
      .from("escolas")
      .insert(payload)
      .select("id,nome,cidade,uf")
      .single();
    if (errEscola || !escola) throw new Error(errEscola?.message ?? "Falha ao criar escola");

    const { error: errRole } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, escola_id: escola.id, role: "gestor" });
    if (errRole) {
      // rollback best-effort
      await supabaseAdmin.from("escolas").delete().eq("id", escola.id);
      throw new Error(errRole.message);
    }

    if (data.ativarComoAtual) {
      await supabaseAdmin
        .from("profiles")
        .update({ escola_ativa_id: escola.id })
        .eq("user_id", userId);
    }

    return { ok: true, escola };
  });

export const listarMinhasEscolas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("user_roles")
      .select("role,escola:escolas(id,nome,cidade,uf,inep,created_at)")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { escolas: data ?? [] };
  });

export const ativarEscola = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ escolaId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // verifica vínculo
    const { data: membership, error: errCheck } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("escola_id", data.escolaId)
      .limit(1);
    if (errCheck) throw new Error(errCheck.message);
    if (!membership?.length) throw new Error("Você não é membro desta escola");

    const { error } = await supabase
      .from("profiles")
      .update({ escola_ativa_id: data.escolaId })
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
