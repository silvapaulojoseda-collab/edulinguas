import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type MembroEscola = {
  user_id: string;
  nome: string;
  email: string;
  avatar_url: string | null;
  papeis: ("gestor" | "coordenador" | "professor")[];
};

/**
 * Lista todos os membros (gestores, coordenadores, professores) da escola.
 * Só gestores/coordenadores conseguem — RLS de user_roles permite via has_role.
 */
export const listarMembrosEscola = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ escolaId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }): Promise<{ membros: MembroEscola[] }> => {
    const { supabase, userId } = context;

    // Só gestor/coordenador vê todos. Se não, retorna apenas o próprio.
    const { data: gc } = await supabase.rpc("is_gestor_ou_coordenador", {
      _user_id: userId,
      _escola_id: data.escolaId,
    });

    if (!gc) {
      const { data: self } = await supabase
        .from("profiles")
        .select("user_id,nome,email,avatar_url")
        .eq("user_id", userId)
        .maybeSingle();
      const { data: papeis } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("escola_id", data.escolaId);
      if (!self) return { membros: [] };
      return {
        membros: [{
          user_id: self.user_id,
          nome: self.nome,
          email: self.email,
          avatar_url: self.avatar_url,
          papeis: (papeis ?? []).map((p) => p.role as MembroEscola["papeis"][number]),
        }],
      };
    }

    // Admin path: usa supabaseAdmin dentro do handler (server-only).
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles, error } = await supabaseAdmin
      .from("user_roles")
      .select("user_id,role")
      .eq("escola_id", data.escolaId);
    if (error) throw new Error(error.message);

    const ids = Array.from(new Set((roles ?? []).map((r) => r.user_id)));
    if (ids.length === 0) return { membros: [] };

    const { data: profs, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("user_id,nome,email,avatar_url")
      .in("user_id", ids);
    if (pErr) throw new Error(pErr.message);

    const map = new Map<string, MembroEscola>();
    for (const p of profs ?? []) {
      map.set(p.user_id, {
        user_id: p.user_id,
        nome: p.nome ?? p.email ?? "Usuário",
        email: p.email ?? "",
        avatar_url: p.avatar_url ?? null,
        papeis: [],
      });
    }
    for (const r of roles ?? []) {
      const m = map.get(r.user_id);
      if (m) m.papeis.push(r.role as MembroEscola["papeis"][number]);
    }
    const ordem = { gestor: 0, coordenador: 1, professor: 2 } as const;
    const membros = Array.from(map.values())
      .map((m) => ({ ...m, papeis: [...m.papeis].sort((a, b) => ordem[a] - ordem[b]) }))
      .sort((a, b) => {
        const pa = a.papeis[0] ? ordem[a.papeis[0]] : 3;
        const pb = b.papeis[0] ? ordem[b.papeis[0]] : 3;
        return pa - pb || a.nome.localeCompare(b.nome);
      });

    return { membros };
  });
