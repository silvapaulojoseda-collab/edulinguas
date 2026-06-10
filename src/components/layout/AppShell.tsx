import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  ScanLine,
  Sparkles,
  FileBarChart,
  Settings,
  GraduationCap,
  Moon,
  Sun,
  Search,
  Bell,
  LogOut,
  UserCog,
  Menu,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const nav: { to: string; label: string; icon: typeof LayoutDashboard; accent?: boolean }[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/alunos", label: "Alunos", icon: Users },
  { to: "/turmas", label: "Turmas", icon: GraduationCap },
  { to: "/cursos", label: "Cursos", icon: ClipboardList },
  { to: "/professores", label: "Professores", icon: UserCog },
  { to: "/avaliacoes", label: "Avaliações", icon: ClipboardList },
  { to: "/gabaritos", label: "Gabaritos", icon: ClipboardList },
  { to: "/ocr", label: "Leitura OCR", icon: ScanLine },
  { to: "/ia", label: "IA Pedagógica", icon: Sparkles, accent: true },
  { to: "/relatorios", label: "Relatórios", icon: FileBarChart },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [dark, setDark] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  useEffect(() => {
    setMobileOpen(false);
  }, [path]);

  if (loading || !user) return null;

  const papelLabel = user.papelAtual === "gestor" ? "Gestor(a)" : user.papelAtual === "professor" ? "Professor(a)" : user.papelAtual === "coordenador" ? "Coordenador(a)" : "Sem papel";
  const escolaNome = user.escolaAtiva?.nome ?? "Sem escola";

  const SidebarContent = (
    <>
      <div className="px-5 py-5 flex items-center gap-2.5">
        <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-[oklch(0.65_0.18_220)] grid place-items-center shadow-glow">
          <GraduationCap className="size-5 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <div className="font-display font-bold text-[15px] leading-tight">EduLinguas <span className="text-ai">AI</span></div>
          <div className="text-[11px] text-muted-foreground">Avaliação inteligente</div>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden size-8 grid place-items-center rounded-lg hover:bg-muted"
          aria-label="Fechar menu"
        >
          <X className="size-4" />
        </button>
      </div>

      <nav className="px-3 flex-1 space-y-0.5 overflow-y-auto">
        {nav.map((n) => {
          const Active = path === n.to;
          const Icon = n.icon;
          return (
            <Link
              key={n.to}
              to={n.to as string}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                ${Active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"}`}
            >
              <Icon className={`size-[18px] ${n.accent ? "text-ai" : ""}`} />
              <span>{n.label}</span>
              {n.accent && <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-md ai-chip">AI</span>}
            </Link>
          );
        })}
      </nav>

      <div className="m-3 p-3 rounded-xl glass">
        <div className="flex items-center gap-2 text-xs font-semibold text-ai">
          <Sparkles className="size-3.5" /> Insights da semana
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 leading-snug">
          3 turmas com queda em <strong className="text-foreground">interpretação textual</strong>. Toque para ver plano de intervenção.
        </p>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex">
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        {SidebarContent}
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <button
            aria-label="Fechar menu"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
          />
          <aside className="relative w-72 max-w-[85vw] flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
            {SidebarContent}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-background/60 backdrop-blur-xl sticky top-0 z-30 flex items-center px-3 sm:px-4 lg:px-8 gap-2 sm:gap-4">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden size-10 grid place-items-center rounded-xl hover:bg-muted transition-colors"
            aria-label="Abrir menu"
          >
            <Menu className="size-5" />
          </button>
          <div className="lg:hidden flex items-center gap-2 min-w-0">
            <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-[oklch(0.65_0.18_220)] grid place-items-center shrink-0">
              <GraduationCap className="size-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold truncate">EduLinguas <span className="text-ai">AI</span></span>
          </div>
          <div className="flex-1 max-w-md hidden md:flex items-center gap-2 px-3 h-10 rounded-xl bg-muted/60 border border-border">
            <Search className="size-4 text-muted-foreground" />
            <input
              placeholder="Buscar aluno, turma, avaliação..."
              className="bg-transparent text-sm flex-1 outline-none placeholder:text-muted-foreground"
            />
            <kbd className="text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">⌘K</kbd>
          </div>
          <div className="flex-1 md:hidden" />
          <button
            onClick={() => setDark((d) => !d)}
            className="size-10 grid place-items-center rounded-xl hover:bg-muted transition-colors"
            aria-label="Alternar tema"
          >
            {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          <button onClick={() => toast.info("3 notificações: OCR concluído, parecer IA pronto, 8 alertas")} className="size-10 grid place-items-center rounded-xl hover:bg-muted transition-colors relative">
            <Bell className="size-4" />
            <span className="absolute top-2.5 right-2.5 size-1.5 rounded-full bg-ai" />
          </button>
          <div className="flex items-center gap-2.5 pl-2 border-l border-border">
            <div className="size-9 rounded-full bg-gradient-to-br from-primary to-ai grid place-items-center text-primary-foreground text-xs font-bold">
              {user.iniciais}
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-semibold leading-tight">{user.nome}</div>
              <div className="text-[10px] text-muted-foreground">{papelLabel} · {escolaNome}</div>
            </div>
            <button
              onClick={() => { logout(); navigate({ to: "/login" }); }}
              className="size-9 grid place-items-center rounded-lg hover:bg-muted transition-colors ml-1"
              aria-label="Sair"
              title="Sair"
            >
              <LogOut className="size-4 text-muted-foreground" />
            </button>
          </div>
        </header>

        <main className="flex-1 px-3 sm:px-4 lg:px-8 py-5 sm:py-6 lg:py-8 max-w-[1500px] w-full mx-auto pb-24 lg:pb-8">
          {children}
        </main>

        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-background/90 backdrop-blur-xl border-t border-border flex items-center justify-around h-16 px-2 pb-[env(safe-area-inset-bottom)]">
          {nav.slice(0, 5).map((n) => {
            const Active = path === n.to;
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to as string}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-colors min-w-0 flex-1
                  ${Active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Icon className={`size-5 ${n.accent ? "text-ai" : ""}`} />
                <span className="truncate w-full text-center">{n.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
