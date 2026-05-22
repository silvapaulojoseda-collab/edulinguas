import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { STUDENTS, TURMAS, DESCRITORES, turmaStats, DISCIPLINAS } from "@/lib/seed";
import {
  AreaChart, Area, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from "recharts";
import {
  TrendingUp, TrendingDown, Users, Sparkles, ArrowUpRight, AlertTriangle, Trophy,
  ScanLine, FileBarChart, Activity,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard · EduLinguas AI" },
      { name: "description", content: "Diagnóstico pedagógico em tempo real com IA, OCR de gabaritos e análise por descritor BNCC/SPAECE." },
    ],
  }),
  component: Dashboard,
});

const trend = Array.from({ length: 12 }, (_, i) => ({
  semana: `S${i + 1}`,
  media: 55 + Math.round(Math.sin(i / 1.6) * 8 + i * 0.9),
  meta: 70,
}));

function Dashboard() {
  const stats = turmaStats();
  const turmasData = TURMAS.map((t) => ({ turma: t.replace(/^\dº\s/, ""), ano: t[0], ...turmaStats(t) }));
  const radarData = DISCIPLINAS.map((d) => ({ subject: d.label, A: Math.round(stats[d.key as keyof typeof stats] as number) }));

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
                <Sparkles className="size-3.5" /> Diagnóstico ativo · Avaliação Diagnóstica 2026.1
              </div>
              <h1 className="mt-4 text-3xl lg:text-4xl font-display font-bold tracking-tight">
                Bom dia, Marina.
                <br />
                <span className="text-muted-foreground font-normal text-2xl lg:text-3xl">
                  Sua escola subiu <span className="text-ai font-semibold">+12%</span> em proficiência este bimestre.
                </span>
              </h1>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to="/ocr" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-glow hover:opacity-90 transition">
                  <ScanLine className="size-4" /> Corrigir cartões agora
                </Link>
                <Link to="/ia" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border text-sm font-semibold hover:bg-muted transition">
                  <Sparkles className="size-4 text-ai" /> Gerar parecer com IA
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 lg:gap-4 w-full lg:w-auto">
              <Kpi icon={Users} label="Alunos" value={stats.alunos.toString()} delta="+24" />
              <Kpi icon={Activity} label="Cartões lidos" value="1.284" delta="+312" accent />
              <Kpi icon={Trophy} label="Média geral" value={stats.media.toFixed(1)} delta="+4.1" />
            </div>
          </div>
        </section>

        {/* Trend + Radar */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-display font-semibold text-lg">Evolução da proficiência</h2>
                <p className="text-sm text-muted-foreground">Média semanal vs. meta SPAECE</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-md bg-success/15 text-success font-semibold inline-flex items-center gap-1">
                <TrendingUp className="size-3" /> +12%
              </span>
            </div>
            <div className="h-64">
              <ResponsiveContainer>
                <AreaChart data={trend} margin={{ left: -10, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="semana" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                  <Area dataKey="media" stroke="var(--primary)" strokeWidth={2.5} fill="url(#g1)" />
                  <Area dataKey="meta" stroke="var(--ai)" strokeWidth={1.5} strokeDasharray="4 4" fill="transparent" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display font-semibold text-lg">Perfil por disciplina</h2>
            <p className="text-sm text-muted-foreground">Diagnóstico consolidado</p>
            <div className="h-64 mt-2">
              <ResponsiveContainer>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                  <Radar dataKey="A" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.35} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Turmas + AI panel */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display font-semibold text-lg">Desempenho por turma</h2>
                <p className="text-sm text-muted-foreground">{TURMAS.length} turmas · {STUDENTS.length} alunos</p>
              </div>
              <Link to="/relatorios" className="text-xs font-semibold text-primary inline-flex items-center gap-1 hover:gap-2 transition-all">
                Ver relatórios <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={turmasData} margin={{ left: -10, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="turma" stroke="var(--muted-foreground)" fontSize={10} interval={0} angle={-15} textAnchor="end" height={60} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="portugues" stackId="a" fill="oklch(0.62 0.20 25)" radius={[0,0,0,0]} />
                  <Bar dataKey="ingles" stackId="a" fill="oklch(0.60 0.18 250)" />
                  <Bar dataKey="espanhol" stackId="a" fill="oklch(0.72 0.18 85)" />
                  <Bar dataKey="arte" stackId="a" fill="oklch(0.65 0.20 320)" />
                  <Bar dataKey="edFisica" stackId="a" fill="oklch(0.72 0.18 155)" radius={[8,8,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-ai/30 bg-gradient-to-br from-card to-[color-mix(in_oklab,var(--ai)_8%,var(--card))] p-5 shadow-ai-glow">
            <div className="flex items-center gap-2 text-ai font-semibold text-sm">
              <Sparkles className="size-4" /> Parecer da IA Pedagógica
            </div>
            <p className="mt-3 text-sm leading-relaxed">
              A turma <strong>2º Informática</strong> apresenta baixo desempenho em <strong>inferência textual</strong> e <strong>interpretação de gráficos</strong>. Recomenda-se reforço focado nos descritores
              <span className="mx-1 px-1.5 py-0.5 rounded-md bg-ai/15 text-ai font-mono text-xs">D5</span>
              e
              <span className="mx-1 px-1.5 py-0.5 rounded-md bg-ai/15 text-ai font-mono text-xs">D12</span>.
            </p>
            <div className="mt-4 space-y-2">
              {DESCRITORES.slice(0, 4).map((d) => (
                <div key={d.code} className="flex items-center gap-3">
                  <span className="text-[11px] font-mono w-9 text-muted-foreground">{d.code}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="truncate">{d.desc}</span>
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
            <Link to="/ia" className="mt-4 w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-ai text-ai-foreground text-sm font-semibold hover:opacity-90 transition">
              Abrir relatório completo <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </section>

        {/* Activity feed */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display font-semibold text-lg">Atividade recente</h2>
            <ul className="mt-4 space-y-3">
              {[
                { i: ScanLine, t: "OCR processou 42 cartões — 1º Administração", time: "agora", color: "primary" },
                { i: Sparkles, t: "IA gerou parecer pedagógico de Português 2º ano", time: "12 min", color: "ai" },
                { i: AlertTriangle, t: "Alerta: 8 alunos com dupla marcação detectada", time: "1h", color: "warning" },
                { i: FileBarChart, t: "Relatório consolidado exportado em PDF", time: "3h", color: "primary" },
              ].map((a, i) => (
                <li key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/60 transition-colors">
                  <div className={`size-9 rounded-lg grid place-items-center bg-${a.color}/15 text-${a.color}`}>
                    <a.i className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{a.t}</div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{a.time}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display font-semibold text-lg">Ranking — Top 5</h2>
            <p className="text-sm text-muted-foreground">Alunos com maior progresso</p>
            <ul className="mt-4 space-y-2">
              {[...STUDENTS].sort((a, b) => b.nota - a.nota).slice(0, 5).map((s, i) => (
                <li key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/60">
                  <span className={`size-7 rounded-lg grid place-items-center text-xs font-bold ${i === 0 ? "bg-warning text-warning-foreground" : "bg-muted text-muted-foreground"}`}>
                    {i + 1}
                  </span>
                  <div className="size-8 rounded-full bg-gradient-to-br from-primary to-ai grid place-items-center text-[10px] font-bold text-primary-foreground">
                    {s.nome.split(" ").map(p => p[0]).slice(0, 2).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{s.nome}</div>
                    <div className="text-[11px] text-muted-foreground">{s.turma}</div>
                  </div>
                  <span className="font-display font-bold text-sm">{s.nota.toFixed(1)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Kpi({ icon: Icon, label, value, delta, accent }: { icon: typeof Users; label: string; value: string; delta: string; accent?: boolean }) {
  const positive = !delta.startsWith("-");
  return (
    <div className={`rounded-2xl border p-4 ${accent ? "border-ai/40 bg-ai/5" : "border-border bg-card/60"}`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className={`size-3.5 ${accent ? "text-ai" : ""}`} /> {label}
      </div>
      <div className="mt-1.5 font-display font-bold text-2xl">{value}</div>
      <div className={`mt-1 text-[11px] inline-flex items-center gap-0.5 font-semibold ${positive ? "text-success" : "text-destructive"}`}>
        {positive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />} {delta}
      </div>
    </div>
  );
}
