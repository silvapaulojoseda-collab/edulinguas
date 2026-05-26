import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useMemo, useState } from "react";
import {
  Search, Plus, Mail, Phone, MoreVertical, Sparkles, TrendingUp, BookOpen,
  GraduationCap, CheckCircle2, Clock, Award, Filter,
} from "lucide-react";
import { TURMAS, DISCIPLINAS } from "@/lib/seed";
import { toast } from "sonner";

export const Route = createFileRoute("/professores")({
  head: () => ({
    meta: [
      { title: "Professores · EduLinguas AI" },
      { name: "description", content: "Gestão do corpo docente, carga horária, turmas atribuídas e desempenho por professor." },
    ],
  }),
  component: ProfessoresPage,
});

type Professor = {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  disciplina: string;
  turmas: string[];
  cargaHoraria: number;
  avaliacoesCorrigidas: number;
  mediaTurmas: number;
  status: "ativo" | "afastado" | "convidado";
  iniciais: string;
  ultimaAtividade: string;
};

const NOMES = [
  "Marina Rocha Albuquerque",
  "Caio Mendes Vasconcelos",
  "Letícia Bezerra Sales",
  "Rafael Holanda Pinheiro",
  "Juliana Carvalho Tavares",
  "Bruno Teixeira Magalhães",
  "Patrícia Andrade Lopes",
  "Eduardo Cavalcante Mota",
  "Camila Nogueira Freitas",
  "Thiago Barreto Lima",
  "Renata Souza Carneiro",
  "Felipe Oliveira Aragão",
];

const PROFESSORES: Professor[] = NOMES.map((nome, i) => {
  const disc = DISCIPLINAS[i % DISCIPLINAS.length];
  const turmasAt = TURMAS.slice(i % 4, (i % 4) + 3 + (i % 2));
  return {
    id: `p${i + 1}`,
    nome,
    email: nome.toLowerCase().replace(/\s+/g, ".").normalize("NFD").replace(/[\u0300-\u036f]/g, "") + "@edulinguas.ai",
    telefone: `(88) 9${(8000 + i * 137).toString().slice(-4)}-${(1000 + i * 241).toString().slice(-4)}`,
    disciplina: disc.label,
    turmas: turmasAt,
    cargaHoraria: 20 + ((i * 4) % 20),
    avaliacoesCorrigidas: 40 + ((i * 17) % 180),
    mediaTurmas: 55 + ((i * 7) % 35),
    status: (i % 9 === 0 ? "afastado" : i % 7 === 0 ? "convidado" : "ativo") as Professor["status"],
    iniciais: nome.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase(),
    ultimaAtividade: ["agora", "há 2h", "há 1d", "há 3d", "esta semana"][i % 5],
  };
});

const statusStyle: Record<Professor["status"], string> = {
  ativo: "bg-ai/15 text-ai border-ai/30",
  afastado: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  convidado: "bg-primary/15 text-primary border-primary/30",
};

function ProfessoresPage() {
  const [q, setQ] = useState("");
  const [discFilter, setDiscFilter] = useState<string>("todas");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [selected, setSelected] = useState<Professor | null>(null);

  const filtrados = useMemo(() => {
    return PROFESSORES.filter((p) => {
      if (q && !`${p.nome} ${p.email} ${p.disciplina}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (discFilter !== "todas" && p.disciplina !== discFilter) return false;
      if (statusFilter !== "todos" && p.status !== statusFilter) return false;
      return true;
    });
  }, [q, discFilter, statusFilter]);

  const kpis = useMemo(() => {
    const total = PROFESSORES.length;
    const ativos = PROFESSORES.filter((p) => p.status === "ativo").length;
    const corrig = PROFESSORES.reduce((s, p) => s + p.avaliacoesCorrigidas, 0);
    const cargaMedia = Math.round(PROFESSORES.reduce((s, p) => s + p.cargaHoraria, 0) / total);
    return { total, ativos, corrig, cargaMedia };
  }, []);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-ai uppercase tracking-wider">Corpo docente</div>
            <h1 className="font-display text-3xl font-bold tracking-tight mt-1">Professores</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie professores, atribua turmas e acompanhe desempenho pedagógico.
            </p>
          </div>
          <button onClick={() => toast.info("Convite por e-mail em breve")} className="h-10 px-4 rounded-xl bg-gradient-to-r from-primary to-[oklch(0.65_0.18_220)] text-primary-foreground text-sm font-semibold flex items-center gap-2 shadow-glow hover:opacity-95 transition-opacity">
            <Plus className="size-4" /> Novo professor
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { l: "Total de professores", v: kpis.total, i: GraduationCap, c: "text-primary" },
            { l: "Ativos hoje", v: kpis.ativos, i: CheckCircle2, c: "text-ai" },
            { l: "Avaliações corrigidas", v: kpis.corrig, i: BookOpen, c: "text-foreground" },
            { l: "Carga horária média", v: `${kpis.cargaMedia}h`, i: Clock, c: "text-muted-foreground" },
          ].map((k) => (
            <div key={k.l} className="glass rounded-2xl p-4 border border-border">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground font-medium">{k.l}</span>
                <k.i className={`size-4 ${k.c}`} />
              </div>
              <div className="text-2xl font-bold mt-2">{k.v}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 px-3 h-10 rounded-xl bg-muted/50 border border-border flex-1 min-w-[240px] max-w-md">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome, e-mail, disciplina..."
              className="bg-transparent text-sm flex-1 outline-none placeholder:text-muted-foreground"
            />
          </div>
          <select
            value={discFilter}
            onChange={(e) => setDiscFilter(e.target.value)}
            className="h-10 px-3 rounded-xl bg-muted/50 border border-border text-sm outline-none"
          >
            <option value="todas">Todas disciplinas</option>
            {DISCIPLINAS.map((d) => <option key={d.key} value={d.label}>{d.label}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-xl bg-muted/50 border border-border text-sm outline-none"
          >
            <option value="todos">Todos status</option>
            <option value="ativo">Ativos</option>
            <option value="afastado">Afastados</option>
            <option value="convidado">Convidados</option>
          </select>
          <button onClick={() => toast.info("Filtros avançados em breve")} className="h-10 px-3 rounded-xl bg-muted/50 border border-border text-sm flex items-center gap-2 hover:bg-muted">
            <Filter className="size-4" /> Mais filtros
          </button>
        </div>

        {/* Grid + side panel */}
        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtrados.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                className={`text-left glass rounded-2xl p-4 border transition-all hover:border-primary/50 hover:shadow-glow ${
                  selected?.id === p.id ? "border-primary shadow-glow" : "border-border"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="size-11 rounded-xl bg-gradient-to-br from-primary to-ai grid place-items-center text-primary-foreground text-sm font-bold shrink-0">
                    {p.iniciais}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm leading-tight truncate">{p.nome}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{p.email}</div>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusStyle[p.status]}`}>
                    {p.status}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-semibold">{p.disciplina}</span>
                  <span className="text-muted-foreground">{p.turmas.length} turmas</span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 pt-3 border-t border-border">
                  <div>
                    <div className="text-[10px] text-muted-foreground">Carga</div>
                    <div className="text-sm font-bold">{p.cargaHoraria}h</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground">Corrigidas</div>
                    <div className="text-sm font-bold">{p.avaliacoesCorrigidas}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground">Média</div>
                    <div className={`text-sm font-bold ${p.mediaTurmas >= 70 ? "text-ai" : p.mediaTurmas >= 50 ? "text-amber-500" : "text-destructive"}`}>
                      {p.mediaTurmas}
                    </div>
                  </div>
                </div>
              </button>
            ))}

            {filtrados.length === 0 && (
              <div className="col-span-full text-center text-sm text-muted-foreground py-12 glass rounded-2xl border border-border border-dashed">
                Nenhum professor encontrado com esses filtros.
              </div>
            )}
          </div>

          {/* Side panel */}
          <aside className="space-y-4 lg:sticky lg:top-24 self-start">
            {selected ? (
              <div className="glass rounded-2xl border border-border p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-14 rounded-2xl bg-gradient-to-br from-primary to-ai grid place-items-center text-primary-foreground font-bold shadow-glow">
                      {selected.iniciais}
                    </div>
                    <div>
                      <div className="font-display font-bold">{selected.nome}</div>
                      <div className="text-xs text-muted-foreground">{selected.disciplina}</div>
                    </div>
                  </div>
                  <button onClick={() => toast.info("Mais ações em breve")} className="size-8 grid place-items-center rounded-lg hover:bg-muted">
                    <MoreVertical className="size-4" />
                  </button>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="size-3.5" /> <span className="truncate">{selected.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="size-3.5" /> <span>{selected.telefone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="size-3.5" /> <span>Última atividade {selected.ultimaAtividade}</span>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Turmas atribuídas
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.turmas.map((t) => (
                      <span key={t} className="text-[11px] px-2 py-0.5 rounded-md bg-muted text-foreground font-medium border border-border">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl p-3 bg-gradient-to-br from-ai/10 to-primary/10 border border-ai/20">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-ai">
                    <Sparkles className="size-3.5" /> Insight da IA
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-snug">
                    {selected.mediaTurmas >= 70
                      ? `${selected.nome.split(" ")[0]} mantém turmas acima da meta — sugerimos compartilhar boas práticas no próximo planejamento.`
                      : `Detectamos queda em descritor D11 nas turmas de ${selected.disciplina}. Recomendamos plano de intervenção focal.`}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button onClick={() => toast.info(`Desempenho de ${selected.nome.split(" ")[0]} em breve`)} className="h-9 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1.5 hover:opacity-95">
                    <TrendingUp className="size-3.5" /> Ver desempenho
                  </button>
                  <button onClick={() => toast.success(`Pronto para atribuir turma a ${selected.nome.split(" ")[0]}`)} className="h-9 rounded-lg bg-muted border border-border text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-muted/70">
                    <Award className="size-3.5" /> Atribuir turma
                  </button>
                </div>
              </div>
            ) : (
              <div className="glass rounded-2xl border border-dashed border-border p-6 text-center">
                <GraduationCap className="size-8 mx-auto text-muted-foreground" />
                <div className="text-sm font-semibold mt-2">Selecione um professor</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Clique em um cartão para ver detalhes, turmas atribuídas e insights da IA.
                </p>
              </div>
            )}

            <div className="glass rounded-2xl border border-border p-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-ai">
                <Sparkles className="size-3.5" /> Recomendações da semana
              </div>
              <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                <li className="flex gap-2"><span className="text-ai">•</span> Distribuir 3 turmas órfãs entre professores convidados.</li>
                <li className="flex gap-2"><span className="text-ai">•</span> 2 docentes acima de 35h — risco de sobrecarga.</li>
                <li className="flex gap-2"><span className="text-ai">•</span> Formação BNCC: 5 inscrições pendentes.</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
