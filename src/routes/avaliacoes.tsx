import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Plus, Calendar, Layers, Target, MoreHorizontal, Sparkles } from "lucide-react";

export const Route = createFileRoute("/avaliacoes")({
  head: () => ({
    meta: [
      { title: "Avaliações · EduLinguas AI" },
      { name: "description", content: "Crie avaliações com gabaritos, descritores BNCC, habilidades SPAECE e correção automática por OCR." },
    ],
  }),
  component: Avaliacoes,
});

const avals = [
  { id: 1, nome: "Diagnóstica 2026.1 — Português", disciplina: "Português", questoes: 30, turmas: 4, data: "13 Abr 2026", status: "Em correção", progresso: 78, descritores: ["D5", "D8", "D12", "D15"] },
  { id: 2, nome: "Simulado SPAECE — Inglês", disciplina: "Inglês", questoes: 10, turmas: 10, data: "20 Abr 2026", status: "Pronta", progresso: 100, descritores: ["D3", "D21"] },
  { id: 3, nome: "Avaliação Bimestral — Espanhol", disciplina: "Espanhol", questoes: 15, turmas: 3, data: "25 Abr 2026", status: "Rascunho", progresso: 35, descritores: ["D3", "D21", "D8"] },
  { id: 4, nome: "Diagnóstica — Arte", disciplina: "Arte", questoes: 10, turmas: 7, data: "02 Mai 2026", status: "Agendada", progresso: 0, descritores: ["D11", "D14"] },
];

const statusColor: Record<string, string> = {
  "Em correção": "bg-warning/15 text-warning",
  "Pronta": "bg-success/15 text-success",
  "Rascunho": "bg-muted text-muted-foreground",
  "Agendada": "bg-primary/15 text-primary",
};

function Avaliacoes() {
  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Avaliações</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie gabaritos, descritores e correção automatizada.</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-glow">
          <Plus className="size-4" /> Nova avaliação
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {avals.map((a) => (
          <article key={a.id} className="rounded-2xl border border-border bg-card p-5 hover:border-primary/50 transition-colors group">
            <div className="flex items-start justify-between">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${statusColor[a.status]}`}>
                {a.status}
              </span>
              <button className="size-7 grid place-items-center rounded-lg hover:bg-muted opacity-0 group-hover:opacity-100 transition">
                <MoreHorizontal className="size-4" />
              </button>
            </div>
            <h3 className="mt-3 font-display font-bold text-lg leading-tight">{a.nome}</h3>
            <p className="text-xs text-muted-foreground mt-1">{a.disciplina}</p>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-muted/60 py-2">
                <Layers className="size-3.5 mx-auto text-muted-foreground" />
                <div className="text-sm font-bold mt-1">{a.questoes}</div>
                <div className="text-[10px] text-muted-foreground">questões</div>
              </div>
              <div className="rounded-lg bg-muted/60 py-2">
                <Target className="size-3.5 mx-auto text-muted-foreground" />
                <div className="text-sm font-bold mt-1">{a.turmas}</div>
                <div className="text-[10px] text-muted-foreground">turmas</div>
              </div>
              <div className="rounded-lg bg-muted/60 py-2">
                <Calendar className="size-3.5 mx-auto text-muted-foreground" />
                <div className="text-sm font-bold mt-1">{a.data.split(" ")[0]}</div>
                <div className="text-[10px] text-muted-foreground">{a.data.split(" ").slice(1).join(" ")}</div>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span>Correção</span>
                <span className="font-semibold text-foreground">{a.progresso}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-ai rounded-full" style={{ width: `${a.progresso}%` }} />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {a.descritores.map((d) => (
                <span key={d} className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-ai/10 text-ai">
                  {d}
                </span>
              ))}
            </div>
          </article>
        ))}

        <article className="rounded-2xl border-2 border-dashed border-border bg-card/30 p-5 grid place-items-center text-center min-h-[280px] hover:border-ai/60 transition-colors cursor-pointer group">
          <div>
            <div className="size-12 rounded-2xl bg-ai/10 grid place-items-center mx-auto group-hover:scale-110 transition-transform">
              <Sparkles className="size-6 text-ai" />
            </div>
            <h3 className="mt-3 font-display font-semibold">Gerar avaliação com IA</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
              A IA monta questões alinhadas à BNCC com base nos descritores escolhidos.
            </p>
          </div>
        </article>
      </div>
    </AppShell>
  );
}
