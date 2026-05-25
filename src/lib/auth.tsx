import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User as SupaUser } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Role = "gestor" | "coordenador" | "professor";

export type Escola = { id: string; nome: string; cidade: string | null; uf: string | null };
export type Profile = {
  user_id: string;
  nome: string;
  email: string;
  avatar_url: string | null;
  escola_ativa_id: string | null;
};
export type Membro = {
  escola: Escola;
  papeis: Role[];
};

export type AuthUser = {
  id: string;
  nome: string;
  email: string;
  iniciais: string;
  avatar_url: string | null;
  escolaAtiva: Escola | null;
  papelAtual: Role | null;
  escolas: Membro[];
};

type Ctx = {
  user: AuthUser | null;
  loading: boolean;
  signInPassword: (email: string, senha: string) => Promise<void>;
  signUpPassword: (email: string, senha: string, nome: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  setEscolaAtiva: (escolaId: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthCtx = createContext<Ctx | null>(null);

function initials(nome: string) {
  return (nome || "?")
    .replace(/^(Prof\.?a?\.?)\s+/i, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

async function buildAuthUser(supaUser: SupaUser): Promise<AuthUser> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id,nome,email,avatar_url,escola_ativa_id")
    .eq("user_id", supaUser.id)
    .maybeSingle();

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role,escola_id,escolas(id,nome,cidade,uf)")
    .eq("user_id", supaUser.id);

  const escolaMap = new Map<string, Membro>();
  for (const r of (roles ?? []) as Array<{ role: Role; escola_id: string; escolas: Escola | null }>) {
    if (!r.escolas) continue;
    const cur = escolaMap.get(r.escola_id) ?? { escola: r.escolas, papeis: [] };
    cur.papeis.push(r.role);
    escolaMap.set(r.escola_id, cur);
  }
  const escolas = Array.from(escolaMap.values());

  let ativa: Escola | null = null;
  if (profile?.escola_ativa_id) ativa = escolaMap.get(profile.escola_ativa_id)?.escola ?? null;
  if (!ativa && escolas.length) ativa = escolas[0].escola;

  const papelAtual: Role | null = ativa
    ? (escolaMap.get(ativa.id)?.papeis ?? []).sort(
        (a, b) =>
          ({ gestor: 0, coordenador: 1, professor: 2 }[a] - { gestor: 0, coordenador: 1, professor: 2 }[b]),
      )[0] ?? null
    : null;

  const nome = profile?.nome ?? supaUser.user_metadata?.full_name ?? supaUser.email?.split("@")[0] ?? "Usuário";

  return {
    id: supaUser.id,
    nome,
    email: profile?.email ?? supaUser.email ?? "",
    iniciais: initials(nome),
    avatar_url: profile?.avatar_url ?? null,
    escolaAtiva: ativa,
    papelAtual,
    escolas,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function hydrate(session: Session | null) {
    if (!session?.user) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const u = await buildAuthUser(session.user);
      setUser(u);
    } catch (e) {
      console.error("hydrate auth", e);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Listener FIRST, then getSession (Supabase best practice)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // Defer DB calls to avoid deadlock in callback
      setTimeout(() => hydrate(session), 0);
    });
    supabase.auth.getSession().then(({ data }) => hydrate(data.session));
    return () => sub.subscription.unsubscribe();
  }, []);

  const signInPassword: Ctx["signInPassword"] = async (email, senha) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) throw error;
  };

  const signUpPassword: Ctx["signUpPassword"] = async (email, senha, nome) => {
    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { emailRedirectTo: window.location.origin, data: { full_name: nome } },
    });
    if (error) throw error;
  };

  const signInGoogle: Ctx["signInGoogle"] = async () => {
    const { lovable } = await import("@/integrations/lovable");
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (res.error) throw res.error instanceof Error ? res.error : new Error(String(res.error));
  };

  const resetPassword: Ctx["resetPassword"] = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  };

  const setEscolaAtiva: Ctx["setEscolaAtiva"] = async (escolaId) => {
    if (!user) return;
    await supabase.from("profiles").update({ escola_ativa_id: escolaId }).eq("user_id", user.id);
    const { data } = await supabase.auth.getSession();
    if (data.session) await hydrate(data.session);
  };

  const refresh: Ctx["refresh"] = async () => {
    const { data } = await supabase.auth.getSession();
    await hydrate(data.session);
  };

  const logout: Ctx["logout"] = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthCtx.Provider
      value={{ user, loading, signInPassword, signUpPassword, signInGoogle, resetPassword, setEscolaAtiva, logout, refresh }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
