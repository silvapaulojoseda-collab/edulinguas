import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { GraduationCap, Sparkles, Mail, Lock, ArrowRight, ShieldCheck, Users, BarChart3 } from "lucide-react";
import { useAuth, type Role } from "@/lib/auth";

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
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("gestor@edulinguas.ai");
  const [senha, setSenha] = useState("demo1234");
  const [papel, setPapel] = useState<Role>("gestor");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (!email || !senha) return setErro("Preencha e-mail e senha.");
    setLoading(true);
    try {
      await login(email, senha, papel);
      navigate({ to: "/" });
    } catch {
      setErro("Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Hero side */}
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
            Corrija gabaritos com OCR, gere pareceres por descritor BNCC/SPAECE
            e acompanhe a evolução de cada turma em tempo real.
          </p>

          <div className="grid grid-cols-3 gap-3 pt-4">
            {[
              { icon: Users, k: "415", v: "alunos" },
              { icon: BarChart3, k: "12", v: "turmas" },
              { icon: ShieldCheck, k: "100%", v: "LGPD" },
            ].map(({ icon: I, k, v }) => (
              <div key={v} className="glass rounded-xl p-3">
                <I className="size-4 text-ai mb-1.5" />
                <div className="text-lg font-bold leading-none">{k}</div>
                <div className="text-[11px] text-muted-foreground mt-1">{v}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-xs text-muted-foreground">
          © 2026 EduLinguas AI · EEEP Profa. Maria Dolores
        </div>
      </aside>

      {/* Form side */}
      <main className="flex items-center justify-center px-6 py-12 lg:px-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="size-10 rounded-xl bg-gradient-to-br from-primary to-ai grid place-items-center shadow-glow">
              <GraduationCap className="size-5 text-primary-foreground" />
            </div>
            <div className="font-display font-bold">EduLinguas <span className="text-ai">AI</span></div>
          </div>

          <h2 className="font-display text-3xl font-bold tracking-tight">Bem-vindo de volta</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Entre com sua conta institucional para continuar.
          </p>

          {/* Role selector */}
          <div className="mt-6 grid grid-cols-3 gap-2 p-1 rounded-xl bg-muted/60 border border-border">
            {([
              { v: "gestor", l: "Gestor" },
              { v: "professor", l: "Professor" },
              { v: "coordenador", l: "Coordenador" },
            ] as { v: Role; l: string }[]).map((opt) => (
              <button
                key={opt.v}
                type="button"
                onClick={() => setPapel(opt.v)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  papel === opt.v
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.l}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">E-mail</span>
              <div className="mt-1.5 flex items-center gap-2 px-3 h-11 rounded-xl bg-muted/40 border border-border focus-within:border-primary transition-colors">
                <Mail className="size-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@escola.edu.br"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  autoComplete="email"
                />
              </div>
            </label>

            <label className="block">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Senha</span>
                <button type="button" className="text-xs text-ai hover:underline">Esqueci</button>
              </div>
              <div className="mt-1.5 flex items-center gap-2 px-3 h-11 rounded-xl bg-muted/40 border border-border focus-within:border-primary transition-colors">
                <Lock className="size-4 text-muted-foreground" />
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  autoComplete="current-password"
                />
              </div>
            </label>

            {erro && (
              <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 px-3 py-2 rounded-lg">
                {erro}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-[oklch(0.65_0.18_220)] text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 shadow-glow hover:opacity-95 transition-opacity disabled:opacity-60"
            >
              {loading ? "Entrando..." : (<>Entrar <ArrowRight className="size-4" /></>)}
            </button>

            <div className="text-[11px] text-muted-foreground bg-muted/40 rounded-lg p-3 border border-border">
              <strong className="text-foreground">Demo:</strong> use{" "}
              <code className="text-ai">gestor@edulinguas.ai</code> ou{" "}
              <code className="text-ai">professor@edulinguas.ai</code> com qualquer senha.
            </div>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-8">
            Novo na plataforma?{" "}
            <Link to="/login" className="text-ai font-semibold hover:underline">
              Solicitar acesso
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
