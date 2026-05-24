import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Role = "gestor" | "professor" | "coordenador";
export type User = {
  nome: string;
  email: string;
  papel: Role;
  escola: string;
  iniciais: string;
};

const KEY = "edulinguas.session";

type Ctx = {
  user: User | null;
  login: (email: string, senha: string, papel?: Role) => Promise<User>;
  logout: () => void;
};

const AuthCtx = createContext<Ctx | null>(null);

const DEMO_USERS: Record<string, Omit<User, "iniciais">> = {
  "gestor@edulinguas.ai": {
    nome: "Profa. Marina Rocha",
    email: "gestor@edulinguas.ai",
    papel: "gestor",
    escola: "EEEP Profa. Maria Dolores",
  },
  "professor@edulinguas.ai": {
    nome: "Prof. Caio Mendes",
    email: "professor@edulinguas.ai",
    papel: "professor",
    escola: "EEEP Profa. Maria Dolores",
  },
};

function initials(nome: string) {
  return nome
    .replace(/^(Prof\.?a?\.?)\s+/i, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {}
  }, []);

  const login: Ctx["login"] = async (email, _senha, papel) => {
    const base = DEMO_USERS[email.toLowerCase()] ?? {
      nome: email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      email,
      papel: papel ?? "professor",
      escola: "EEEP Profa. Maria Dolores",
    };
    const u: User = { ...base, papel: papel ?? base.papel, iniciais: initials(base.nome) };
    localStorage.setItem(KEY, JSON.stringify(u));
    setUser(u);
    return u;
  };

  const logout = () => {
    localStorage.removeItem(KEY);
    setUser(null);
  };

  return <AuthCtx.Provider value={{ user, login, logout }}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function getStoredUser(): User | null {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}
