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

export const promoverUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        userId: z.string().uuid(),
        escolaId: z.string().uuid(),
        role: z.enum(["gestor", "coordenador", "professor"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("user_roles")
      .upsert(
        { user_id: data.userId, escola_id: data.escolaId, role: data.role },
        { onConflict: "user_id,escola_id,role" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
