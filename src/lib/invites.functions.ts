import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { randomBytes } from "crypto";

const emailSchema = z.string().email().max(255).transform((s) => s.toLowerCase().trim());

function genToken() {
  return randomBytes(32).toString("base64url");
}

async function ensureGestor(userId: string, escolaId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("escola_id", escolaId)
    .eq("role", "gestor")
    .maybeSingle();
  if (!data) throw new Error("Apenas gestores podem gerenciar convites desta escola.");
}

async function logInvite(invite_id: string, acao: string, ator: string | null, metadata?: Record<string, unknown>) {
  await supabaseAdmin.from("invite_logs").insert({ invite_id, acao, ator, metadata: (metadata ?? null) as never });
}

/** Cria um convite e retorna o link compartilhável. */
export const convidarProfessor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        escolaId: z.string().uuid(),
        email: emailSchema,
        nome: z.string().min(1).max(120).optional(),
        role: z.enum(["gestor", "coordenador", "professor"]).default("professor"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    await ensureGestor(userId, data.escolaId);

    // Cancela convites pendentes anteriores para o mesmo email/escola
    await supabaseAdmin
      .from("teacher_invites")
      .update({ status: "cancelled" })
      .eq("escola_id", data.escolaId)
      .eq("email", data.email)
      .eq("status", "pending");

    const token = genToken();
    const { data: invite, error } = await supabaseAdmin
      .from("teacher_invites")
      .insert({
        escola_id: data.escolaId,
        email: data.email,
        nome: data.nome ?? null,
        role: data.role,
        token,
        convidado_por: userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    await logInvite(invite.id, "created", userId, { email: data.email, role: data.role });
    await supabaseAdmin.rpc("log_audit", {
      _user_id: userId,
      _escola_id: data.escolaId,
      _acao: "invite.created",
      _entidade: "teacher_invites",
      _entidade_id: invite.id,
      _metadata: { email: data.email, role: data.role } as never,
    });

    return { invite, token };
  });

export const listarConvites = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ escolaId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await ensureGestor(context.userId, data.escolaId);
    const { data: invites, error } = await supabaseAdmin
      .from("teacher_invites")
      .select("id,email,nome,role,status,token,expira_em,aceito_em,created_at")
      .eq("escola_id", data.escolaId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { invites: invites ?? [] };
  });

export const cancelarConvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ inviteId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: inv } = await supabaseAdmin
      .from("teacher_invites")
      .select("id,escola_id,status")
      .eq("id", data.inviteId)
      .maybeSingle();
    if (!inv) throw new Error("Convite não encontrado");
    await ensureGestor(context.userId, inv.escola_id);
    if (inv.status !== "pending") throw new Error("Convite não está pendente");

    const { error } = await supabaseAdmin
      .from("teacher_invites")
      .update({ status: "cancelled" })
      .eq("id", data.inviteId);
    if (error) throw new Error(error.message);

    await logInvite(inv.id, "cancelled", context.userId);
    return { ok: true };
  });

export const reenviarConvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ inviteId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: inv } = await supabaseAdmin
      .from("teacher_invites")
      .select("*")
      .eq("id", data.inviteId)
      .maybeSingle();
    if (!inv) throw new Error("Convite não encontrado");
    await ensureGestor(context.userId, inv.escola_id);

    const token = genToken();
    const expira = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: novo, error } = await supabaseAdmin
      .from("teacher_invites")
      .update({ token, expira_em: expira, status: "pending" })
      .eq("id", inv.id)
      .select()
      .single();
    if (error) throw new Error(error.message);

    await logInvite(inv.id, "resent", context.userId);
    return { invite: novo, token };
  });

/** Pré-visualiza convite pelo token (público). */
export const buscarConvitePorToken = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ token: z.string().min(10).max(200) }).parse(input))
  .handler(async ({ data }) => {
    const { data: inv } = await supabaseAdmin
      .from("teacher_invites")
      .select("id,email,nome,role,status,expira_em,escola_id,escolas(nome,cidade,uf)")
      .eq("token", data.token)
      .maybeSingle();
    if (!inv) return { invite: null as null };
    const expired = new Date(inv.expira_em).getTime() < Date.now();
    if (expired && inv.status === "pending") {
      await supabaseAdmin.from("teacher_invites").update({ status: "expired" }).eq("id", inv.id);
      inv.status = "expired";
    }
    return { invite: inv };
  });

/** Aceita o convite. Cria conta se necessário e vincula a escola. */
export const aceitarConvite = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        token: z.string().min(10).max(200),
        senha: z.string().min(8).max(128).optional(),
        nome: z.string().min(1).max(120).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { data: inv } = await supabaseAdmin
      .from("teacher_invites")
      .select("*")
      .eq("token", data.token)
      .maybeSingle();
    if (!inv) throw new Error("Convite inválido");
    if (inv.status !== "pending") throw new Error("Convite não está mais válido");
    if (new Date(inv.expira_em).getTime() < Date.now()) {
      await supabaseAdmin.from("teacher_invites").update({ status: "expired" }).eq("id", inv.id);
      throw new Error("Convite expirado");
    }

    // Procura conta existente por e-mail via profiles (evita listUsers que enumera toda a plataforma)
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("email", inv.email)
      .maybeSingle();

    let userId = prof?.user_id ?? undefined;
    if (!userId) {
      if (!data.senha) throw new Error("Defina uma senha para criar sua conta");
      const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
        email: inv.email,
        password: data.senha,
        email_confirm: true,
        user_metadata: { full_name: data.nome ?? inv.nome ?? inv.email.split("@")[0] },
      });
      if (cErr || !created.user) throw new Error(cErr?.message ?? "Falha ao criar conta");
      userId = created.user.id;
    }

    // Garante profile (trigger handle_new_user só roda em signUp via auth API pública)
    await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          user_id: userId,
          nome: data.nome ?? inv.nome ?? inv.email.split("@")[0],
          email: inv.email,
          escola_ativa_id: inv.escola_id,
        },
        { onConflict: "user_id" },
      );

    // Vincula role (idempotente)
    await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: userId, escola_id: inv.escola_id, role: inv.role },
        { onConflict: "user_id,escola_id,role", ignoreDuplicates: true },
      );

    await supabaseAdmin
      .from("teacher_invites")
      .update({ status: "accepted", aceito_por: userId, aceito_em: new Date().toISOString() })
      .eq("id", inv.id);

    await logInvite(inv.id, "accepted", userId);
    await supabaseAdmin.rpc("log_audit", {
      _user_id: userId,
      _escola_id: inv.escola_id,
      _acao: "invite.accepted",
      _entidade: "teacher_invites",
      _entidade_id: inv.id,
      _metadata: { email: inv.email, role: inv.role } as never,
    });

    return { ok: true, email: inv.email, criado: !prof };
  });
