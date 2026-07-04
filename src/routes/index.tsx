import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/lib/auth";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getDashboardStats } from "@/lib/dashboard.functions";
import {
  Users, Sparkles, ArrowUpRight, Trophy, ScanLine, FileBarChart,
  Activity, GraduationCap, ClipboardList, TrendingUp,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard · EduLinguas AI" },
      { name: "description", content: "Diagnóstico pedagógico em tempo real com IA, OCR de gabaritos e análise por descritor BNCC/SPAECE." },
    ],
  }),
  component: Dashboard,
});

function saudacao() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function Dashboard() {
  const { user } = useAuth();
  const escolaId = user?.escolaAtiva?.id ?? null;
  const getStats = useServerFn(getDashboardStats);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats", escolaId],
    queryFn: () => getStats({ data: { escolaId: escolaId! } }),
    enabled: !!escolaId,
  });

  const primeiroNome = (user?.nome ?? "Usuário").split(" ")[0];

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl border border-border glass p-6 lg:p-8">
          <div className="absolute -top-20 -right-10 size-72 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-10 size-72 rounded-full bg-ai/20 blur-3xl" />
          <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full ai-chip text-xs font-semibold">
                <Sparkles className="size-3.5" /> {user?.escolaAtiva?.nome ?? "Sem escola ativa"}
              </div>
              <h1 className="mt-4 text-3xl lg:text-4xl font-display font-bold tracking-tight">
                {saudacao()}, {primeiroNome}.
                <br />
                <span className="text-muted-foreground font-normal text-2xl lg:text-3xl">
                  Aqui está um resumo da sua escola em tempo real.
                </span>
              </h1>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to="/ocr" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-glow hover:opacity-90 transition">
                  <ScanLine className="size-4" /> Corrigir cartões
                </Link>
                <Link to="/ia" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border text-sm font-semibold hover:bg-muted transition">
                  <Sparkles className="size-4 text-ai" /> Gerar parecer com IA
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4 w-full lg:w-auto">
              <Kpi icon={Users} label="Alunos" value={fmt(stats?.alunos)} loading={isLoading} />
              <Kpi icon={GraduationCap} label="Turmas" value={fmt(stats?.turmas)} loading={isLoading} />
              <Kpi icon={ClipboardList} label="Avaliações" value={fmt(stats?.avaliacoes)} loading={isLoading} />
              <Kpi icon={Activity} label="Cartões lidos" value={fmt(stats?.cartoes)} loading={isLoading} accent />
            </div>
          </div>
        </section>

        {/* Overview */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-display font-semibold text-lg">Média geral</h2>
                <p className="text-sm text-muted-foreground">Consolidação da escola ativa</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-md bg-primary/15 text-primary font-semibold inline-flex items-center gap-1">
                <Trophy className="size-3" /> {stats?.mediaGeral ?? 0}
              </span>
            </div>
            {isLoading ? (
              <Placeholder text="Carregando dados…" />
            ) : (stats?.alunos ?? 0) === 0 ? (
              <EmptyState
                icon={Users}
                title="Nenhum aluno cadastrado ainda"
                desc="Cadastre alunos manualmente ou importe uma planilha."
                cta={{ to: "/alunos", label: "Ir para Alunos" }}
              />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MiniStat label="Média geral" value={stats?.mediaGeral?.toFixed(1) ?? "0.0"} />
                <MiniStat label="Alunos ativos" value={String(stats?.alunos ?? 0)} />
                <MiniStat label="Turmas ativas" value={String(stats?.turmas ?? 0)} />
                <MiniStat label="Cartões corrigidos" value={String(stats?.cartoes ?? 0)} />
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-ai/30 bg-gradient-to-br from-card to-[color-mix(in_oklab,var(--ai)_8%,var(--card))] p-5 shadow-ai-glow">
            <div className="flex items-center gap-2 text-ai font-semibold text-sm">
              <Sparkles className="size-4" /> Descritores mais frágeis
            </div>
            {isLoading ? (
              <Placeholder text="Analisando respostas…" />
            ) : (stats?.descritores?.length ?? 0) === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Ainda não há respostas processadas para gerar diagnóstico por descritor. Processe cartões em <Link to="/ocr" className="text-ai font-semibold">Leitura OCR</Link>.
              </p>
            ) : (
              <div className="mt-4 space-y-2">
                {stats!.descritores.map((d) => (
                  <div key={d.code} className="flex items-center gap-3">
                    <span className="text-[11px] font-mono w-14 text-muted-foreground truncate">{d.code}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="truncate">{d.amostras} respostas</span>
                        <span className={`font-semibold ${d.media < 50 ? "text-destructive" : d.media < 65 ? "text-warning" : "text-success"}`}>
                          {d.media}%
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${d.media < 50 ? "bg-destructive" : d.media < 65 ? "bg-warning" : "bg-success"}`}
                          style={{ width: `${d.media}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link to="/ia" className="mt-4 w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-ai text-ai-foreground text-sm font-semibold hover:opacity-90 transition">
              Abrir IA Pedagógica <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </section>

        {/* Atalhos */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <QuickCard to="/alunos" icon={Users} title="Alunos" desc="Cadastro e importação" />
          <QuickCard to="/turmas" icon={GraduationCap} title="Turmas" desc="Distribuição e vínculos" />
          <QuickCard to="/gabaritos" icon={ClipboardList} title="Gabaritos" desc="Modelos e QR Codes" />
          <QuickCard to="/relatorios" icon={FileBarChart} title="Relatórios" desc="Exportações e PDFs" />
        </section>
      </div>
    </AppShell>
  );
}

function fmt(n: number | undefined) {
  return typeof n === "number" ? n.toLocaleString("pt-BR") : "—";
}

function Kpi({ icon: Icon, label, value, accent, loading }: {
  icon: typeof Users; label: string; value: string; accent?: boolean; loading?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? "border-ai/40 bg-ai/5" : "border-border bg-card/60"}`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className={`size-3.5 ${accent ? "text-ai" : ""}`} /> {label}
      </div>
      <div className="mt-1.5 font-display font-bold text-2xl">{loading ? "…" : value}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/40 p-3">
      <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{label}</div>
      <div className="font-display text-xl font-bold mt-1">{value}</div>
    </div>
  );
}

function Placeholder({ text }: { text: string }) {
  return <div className="text-sm text-muted-foreground py-6 text-center">{text}</div>;
}

function EmptyState({ icon: Icon, title, desc, cta }: { icon: typeof Users; title: string; desc: string; cta: { to: string; label: string } }) {
  return (
    <div className="text-center py-6">
      <Icon className="size-8 text-muted-foreground mx-auto" />
      <div className="mt-2 font-semibold">{title}</div>
      <p className="text-sm text-muted-foreground mt-1">{desc}</p>
      <Link to={cta.to as string} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
        {cta.label} <TrendingUp className="size-4" />
      </Link>
    </div>
  );
}

function QuickCard({ to, icon: Icon, title, desc }: { to: string; icon: typeof Users; title: string; desc: string }) {
  return (
    <Link to={to as string} className="rounded-2xl border border-border bg-card p-4 hover:border-primary/50 hover:shadow-glow transition">
      <div className="size-9 rounded-lg bg-primary/10 text-primary grid place-items-center mb-3">
        <Icon className="size-4" />
      </div>
      <div className="font-semibold">{title}</div>
      <div className="text-xs text-muted-foreground">{desc}</div>
    </Link>
  );
}
