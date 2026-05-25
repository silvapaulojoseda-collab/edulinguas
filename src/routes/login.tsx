import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { GraduationCap, Sparkles, Mail, Lock, ArrowRight, ShieldCheck, Users, BarChart3 } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar · EduLinguas AI" },
      { name: "description", content: "Acesse a plataforma EduLinguas AI — avaliação educacional inteligente." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { signInPassword, signInGoogle, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErro(""); setInfo("");
    if (!email || !senha) return setErro("Preencha e-mail e senha.");
    setLoading(true);
    try {
      await signInPassword(email, senha);
      navigate({ to: "/" });
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível entrar.");
    } finally { setLoading(false); }
  }

  async function google() {
    setErro("");
    try { await signInGoogle(); } catch (err) { setErro(err instanceof Error ? err.message : "Erro Google"); }
  }

  async function esqueci() {
    if (!email) return setErro("Digite seu e-mail primeiro.");
    try { await resetPassword(email); setInfo("Enviamos um link de recuperação para seu e-mail."); }
    catch (err) { setErro(err instanceof Error ? err.message : "Erro ao enviar"); }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <aside className="hidden lg:flex relative overflow-hidden flex-col justify-between p-10 bg-gradient-to-br from-primary/15 via-background to-ai/10 border-r border-border">
        <div className="absolute -top-32 -left-20 size-96 rounded-full bg-primary/25 blur-3xl" />
        <div className="absolute bottom-0 right-0 size-96 rounded-full bg-ai/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="size-11 rounded-2xl bg-gradient-to-br from-primary to-[oklch(0.65_0.18_220)] grid place-items-center shadow-glow">
            <GraduationCap className="size-6 text-primary-foreground" />
          </div>
          <div>
            <div className="font-display font-bold text-lg">EduLinguas <span className="text-ai">AI</span></div>
            <div className="text-xs text-muted-foreground">Avaliação educacional inteligente</div>
          </div>
        </div>
        <div className="relative space-y-6 max-w-md">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ai-chip">
            <Sparkles className="size-3" /> IA + OCR + BNCC
          </span>
          <h1 className="font-display text-4xl xl:text-5xl font-bold leading-[1.05] tracking-tight">
            Diagnósticos pedagógicos em minutos, não em semanas.
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            Corrija gabaritos com OCR, gere pareceres por descritor BNCC/SPAECE e acompanhe a evolução de cada turma em tempo real.
          </p>
          <div className="grid grid-cols-3 gap-3 pt-4">
            {[{ icon: Users, k: "415", v: "alunos" }, { icon: BarChart3, k: "12", v: "turmas" }, { icon: ShieldCheck, k: "100%", v: "LGPD" }].map(({ icon: I, k, v }) => (
              <div key={v} className="glass rounded-xl p-3">
                <I className="size-4 text-ai mb-1.5" />
                <div className="text-lg font-bold leading-none">{k}</div>
                <div className="text-[11px] text-muted-foreground mt-1">{v}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative text-xs text-muted-foreground">© 2026 EduLinguas AI</div>
      </aside>

      <main className="flex items-center justify-center px-6 py-12 lg:px-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="size-10 rounded-xl bg-gradient-to-br from-primary to-ai grid place-items-center shadow-glow">
              <GraduationCap className="size-5 text-primary-foreground" />
            </div>
            <div className="font-display font-bold">EduLinguas <span className="text-ai">AI</span></div>
          </div>

          <h2 className="font-display text-3xl font-bold tracking-tight">Bem-vindo de volta</h2>
          <p className="text-sm text-muted-foreground mt-2">Entre com sua conta institucional.</p>

          <button
            onClick={google}
            className="mt-6 w-full h-11 rounded-xl bg-card border border-border font-semibold text-sm flex items-center justify-center gap-2 hover:bg-muted transition-colors"
          >
            <svg className="size-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.5 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.12A6.6 6.6 0 0 1 5.5 12c0-.74.13-1.46.34-2.12V7.04H2.18a11 11 0 0 0 0 9.92l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
            Continuar com Google
          </button>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex-1 h-px bg-border" /> ou e-mail <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">E-mail</span>
              <div className="mt-1.5 flex items-center gap-2 px-3 h-11 rounded-xl bg-muted/40 border border-border focus-within:border-primary transition-colors">
                <Mail className="size-4 text-muted-foreground" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@escola.edu.br" className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" autoComplete="email" />
              </div>
            </label>
            <label className="block">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Senha</span>
                <button type="button" onClick={esqueci} className="text-xs text-ai hover:underline">Esqueci</button>
              </div>
              <div className="mt-1.5 flex items-center gap-2 px-3 h-11 rounded-xl bg-muted/40 border border-border focus-within:border-primary transition-colors">
                <Lock className="size-4 text-muted-foreground" />
                <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="••••••••" className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" autoComplete="current-password" />
              </div>
            </label>

            {erro && <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 px-3 py-2 rounded-lg">{erro}</div>}
            {info && <div className="text-xs text-success bg-success/10 border border-success/30 px-3 py-2 rounded-lg">{info}</div>}

            <button type="submit" disabled={loading} className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-[oklch(0.65_0.18_220)] text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 shadow-glow hover:opacity-95 transition-opacity disabled:opacity-60">
              {loading ? "Entrando..." : (<>Entrar <ArrowRight className="size-4" /></>)}
            </button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-8">
            Novo na plataforma?{" "}
            <Link to="/signup" className="text-ai font-semibold hover:underline">Criar conta</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
