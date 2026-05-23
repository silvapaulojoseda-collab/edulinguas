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
  CheckCircle2,
  AlertTriangle,
  Info,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAlunos, useNotificacoes } from "@/hooks/use-edu-data";
import { marcarNotificacoesLidas } from "@/lib/edu-api";

const nav: { to: string; label: string; icon: typeof LayoutDashboard; accent?: boolean }[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/alunos", label: "Alunos", icon: Users },
  { to: "/avaliacoes", label: "Avaliações", icon: ClipboardList },
  { to: "/ocr", label: "Leitura OCR", icon: ScanLine },
  { to: "/ia", label: "IA Pedagógica", icon: Sparkles, accent: true },
  { to: "/relatorios", label: "Relatórios", icon: FileBarChart },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [dark, setDark] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <div className="min-h-screen flex">
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="px-5 py-5 flex items-center gap-2.5">
          <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-[oklch(0.65_0.18_220)] grid place-items-center shadow-glow">
            <GraduationCap className="size-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-display font-bold text-[15px] leading-tight">EduLinguas <span className="text-ai">AI</span></div>
            <div className="text-[11px] text-muted-foreground">Avaliação inteligente</div>
          </div>
        </div>

        <nav className="px-3 flex-1 space-y-0.5">
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
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-background/60 backdrop-blur-xl sticky top-0 z-30 flex items-center px-4 lg:px-8 gap-4">
          <div className="lg:hidden flex items-center gap-2">
            <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-[oklch(0.65_0.18_220)] grid place-items-center">
              <GraduationCap className="size-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold">EduLinguas <span className="text-ai">AI</span></span>
          </div>

          <GlobalSearch />

          <div className="flex-1 md:hidden" />
          <button
            onClick={() => setDark((d) => !d)}
            className="size-10 grid place-items-center rounded-xl hover:bg-muted transition-colors"
            aria-label="Alternar tema"
          >
            {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>

          <NotificationsBell />

          <div className="flex items-center gap-2.5 pl-2 border-l border-border">
            <div className="size-9 rounded-full bg-gradient-to-br from-primary to-ai grid place-items-center text-primary-foreground text-xs font-bold">
              MR
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-semibold leading-tight">Profa. Marina R.</div>
              <div className="text-[10px] text-muted-foreground">EEEP Profa. Maria Dolores</div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 lg:px-8 py-6 lg:py-8 max-w-[1500px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

function GlobalSearch() {
  const { alunos } = useAlunos();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        (document.getElementById("global-search") as HTMLInputElement)?.focus();
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const term = q.trim().toLowerCase();
  const turmas = Array.from(new Set(alunos.map((a) => a.turma)));
  const turmasMatch = term ? turmas.filter((t) => t.toLowerCase().includes(term)).slice(0, 4) : [];
  const alunosMatch = term
    ? alunos
        .filter(
          (a) =>
            a.nome.toLowerCase().includes(term) ||
            (a.matricula ?? "").includes(term),
        )
        .slice(0, 6)
    : [];
  const avaliacoes = ["Diagnóstica 2026.1", "Simulado SPAECE", "Bimestral L2"];
  const avaliacoesMatch = term ? avaliacoes.filter((a) => a.toLowerCase().includes(term)) : [];

  const hasResults = turmasMatch.length + alunosMatch.length + avaliacoesMatch.length > 0;

  return (
    <div className="flex-1 max-w-md hidden md:block relative" ref={ref}>
      <div className="flex items-center gap-2 px-3 h-10 rounded-xl bg-muted/60 border border-border">
        <Search className="size-4 text-muted-foreground" />
        <input
          id="global-search"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar aluno, turma, avaliação..."
          className="bg-transparent text-sm flex-1 outline-none placeholder:text-muted-foreground"
        />
        <kbd className="text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">⌘K</kbd>
      </div>

      {open && term && (
        <div className="absolute top-12 left-0 right-0 rounded-xl border border-border bg-card shadow-2xl overflow-hidden z-40 max-h-[70vh] overflow-y-auto">
          {!hasResults && (
            <div className="p-6 text-center text-sm text-muted-foreground">Nenhum resultado para "{q}"</div>
          )}
          {alunosMatch.length > 0 && (
            <SearchGroup title="Alunos">
              {alunosMatch.map((a) => (
                <button
                  key={a.id}
                  onClick={() => { navigate({ to: "/alunos" }); setOpen(false); setQ(""); }}
                  className="w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-muted"
                >
                  <div className="size-7 rounded-full bg-gradient-to-br from-primary to-ai grid place-items-center text-[9px] font-bold text-primary-foreground">
                    {a.nome.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{a.nome}</div>
                    <div className="text-[11px] text-muted-foreground">{a.turma} · {a.matricula}</div>
                  </div>
                  <span className="text-xs font-semibold">{(a.media_geral ?? 0).toFixed(1)}</span>
                </button>
              ))}
            </SearchGroup>
          )}
          {turmasMatch.length > 0 && (
            <SearchGroup title="Turmas">
              {turmasMatch.map((t) => (
                <button
                  key={t}
                  onClick={() => { navigate({ to: "/alunos" }); setOpen(false); setQ(""); }}
                  className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex items-center gap-2"
                >
                  <Users className="size-3.5 text-muted-foreground" /> {t}
                </button>
              ))}
            </SearchGroup>
          )}
          {avaliacoesMatch.length > 0 && (
            <SearchGroup title="Avaliações">
              {avaliacoesMatch.map((a) => (
                <button
                  key={a}
                  onClick={() => { navigate({ to: "/avaliacoes" }); setOpen(false); setQ(""); }}
                  className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex items-center gap-2"
                >
                  <ClipboardList className="size-3.5 text-muted-foreground" /> {a}
                </button>
              ))}
            </SearchGroup>
          )}
        </div>
      )}
    </div>
  );
}

function SearchGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-1">
      <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}

function NotificationsBell() {
  const { items, naoLidas, reload } = useNotificacoes();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const iconFor = (t: string) =>
    t === "sucesso" ? CheckCircle2 : t === "alerta" ? AlertTriangle : t === "erro" ? XCircle : Info;
  const colorFor = (t: string) =>
    t === "sucesso" ? "text-success" : t === "alerta" ? "text-warning" : t === "erro" ? "text-destructive" : "text-primary";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="size-10 grid place-items-center rounded-xl hover:bg-muted transition-colors relative"
      >
        <Bell className="size-4" />
        {naoLidas > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-ai text-ai-foreground text-[10px] font-bold grid place-items-center">
            {naoLidas}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 rounded-xl border border-border bg-card shadow-2xl z-40 overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="font-semibold text-sm">Notificações</div>
            {naoLidas > 0 && (
              <button
                onClick={async () => { await marcarNotificacoesLidas(); reload(); }}
                className="text-xs text-primary font-semibold"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {items.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-muted-foreground">Sem notificações</li>
            )}
            {items.map((n) => {
              const Icon = iconFor(n.tipo);
              return (
                <li key={n.id} className={`px-4 py-3 border-b border-border/60 flex gap-3 ${!n.lida ? "bg-muted/40" : ""}`}>
                  <Icon className={`size-4 mt-0.5 shrink-0 ${colorFor(n.tipo)}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">{n.mensagem}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(n.criada_em).toLocaleString("pt-BR")}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
