import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { GraduationCap, Mail, Lock, User, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Criar conta · EduLinguas AI" }] }),
  component: SignupPage,
});

function SignupPage() {
  const { signUpPassword, signInGoogle } = useAuth();
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (senha.length < 8) return setErro("A senha precisa de pelo menos 8 caracteres.");
    setLoading(true);
    try {
      await signUpPassword(email, senha, nome);
      // Ensure membership after first sign-in
      const { ensureMembership } = await import("@/lib/escola.functions");
      try { await ensureMembership(); } catch { /* ignore — runs again on next login */ }
      navigate({ to: "/" });
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro no cadastro");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-background">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="size-10 rounded-xl bg-gradient-to-br from-primary to-ai grid place-items-center shadow-glow">
            <GraduationCap className="size-5 text-primary-foreground" />
          </div>
          <div className="font-display font-bold">EduLinguas <span className="text-ai">AI</span></div>
        </div>
        <h2 className="font-display text-3xl font-bold tracking-tight">Criar conta</h2>
        <p className="text-sm text-muted-foreground mt-2">Cadastre-se para acessar a plataforma.</p>

        <button onClick={() => signInGoogle().catch((e) => setErro(String(e)))} className="mt-6 w-full h-11 rounded-xl bg-card border border-border font-semibold text-sm hover:bg-muted transition-colors">
          Continuar com Google
        </button>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex-1 h-px bg-border" /> ou <div className="flex-1 h-px bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-4">
          <Field icon={User} label="Nome completo" type="text" value={nome} onChange={setNome} placeholder="Maria Silva" />
          <Field icon={Mail} label="E-mail" type="email" value={email} onChange={setEmail} placeholder="voce@escola.edu.br" />
          <Field icon={Lock} label="Senha (mínimo 8 caracteres)" type="password" value={senha} onChange={setSenha} placeholder="••••••••" />
          {erro && <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 px-3 py-2 rounded-lg">{erro}</div>}
          <button type="submit" disabled={loading} className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-[oklch(0.65_0.18_220)] text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 shadow-glow disabled:opacity-60">
            {loading ? "Criando..." : (<>Criar conta <ArrowRight className="size-4" /></>)}
          </button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-8">
          Já tem conta? <Link to="/login" className="text-ai font-semibold hover:underline">Entrar</Link>
        </p>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, type, value, onChange, placeholder }: { icon: typeof User; label: string; type: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <div className="mt-1.5 flex items-center gap-2 px-3 h-11 rounded-xl bg-muted/40 border border-border focus-within:border-primary transition-colors">
        <Icon className="size-4 text-muted-foreground" />
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" required />
      </div>
    </label>
  );
}
