import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Sparkles, Send, FileDown, Lightbulb, Target, Loader2, Wand2 } from "lucide-react";
import { DESCRITORES } from "@/lib/seed";
import { useEffect, useState } from "react";
import { gerarParecerIA, type Parecer } from "@/lib/edu-api";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/ia")({
  head: () => ({
    meta: [
      { title: "IA Pedagógica · EduLinguas AI" },
      { name: "description", content: "Parecer pedagógico automatizado com agrupamento de dificuldades, descritores críticos e plano de intervenção." },
    ],
  }),
  component: IA,
});

const TURMAS = ["2º Informática", "1º Administração", "1º Hospedagem", "1º Informática"];
const DISCIPLINAS = ["Português", "Inglês", "Espanhol"];

function IA() {
  const [turma, setTurma] = useState(TURMAS[0]);
  const [disciplina, setDisciplina] = useState(DISCIPLINAS[0]);
  const [loading, setLoading] = useState(false);
  const [parecer, setParecer] = useState<Parecer | null>(null);

  useEffect(() => {
    supabase
      .from("pareceres_ia")
      .select("*")
      .eq("turma", turma)
      .eq("disciplina", disciplina)
      .order("data_criacao", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setParecer((data as Parecer) ?? null));
  }, [turma, disciplina]);

  async function gerar() {
    setLoading(true);
    try {
      const novo = await gerarParecerIA(turma, disciplina);
      setParecer(novo);
      toast.success("Parecer gerado e salvo");
    } catch (e) {
      toast.error("Falha ao gerar parecer");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 ai-chip px-3 py-1 rounded-full text-xs font-semibold">
            <Sparkles className="size-3.5" /> Engine IA Pedagógica
          </div>
          <h1 className="mt-3 text-3xl font-display font-bold tracking-tight">Parecer da turma {turma}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {parecer ? `Gerado em ${new Date(parecer.data_criacao).toLocaleString("pt-BR")} · ${parecer.disciplina}` : "Nenhum parecer gerado ainda para essa combinação"}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={turma} onChange={(e) => setTurma(e.target.value)} className="h-10 px-3 rounded-xl bg-card border border-border text-sm">
            {TURMAS.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select value={disciplina} onChange={(e) => setDisciplina(e.target.value)} className="h-10 px-3 rounded-xl bg-card border border-border text-sm">
            {DISCIPLINAS.map((d) => <option key={d}>{d}</option>)}
          </select>
          <button onClick={gerar} disabled={loading} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-ai text-ai-foreground text-sm font-semibold disabled:opacity-60">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
            {loading ? "Gerando..." : "Gerar parecer com IA"}
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border text-sm font-semibold">
            <FileDown className="size-4" /> Exportar PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <article className="rounded-2xl border border-ai/30 bg-gradient-to-br from-card to-[color-mix(in_oklab,var(--ai)_6%,var(--card))] p-6 shadow-ai-glow">
            <h2 className="font-display font-bold text-lg flex items-center gap-2">
              <Lightbulb className="size-5 text-ai" /> Análise pedagógica
            </h2>
            <div className="mt-3 text-sm leading-relaxed whitespace-pre-wrap">
              {parecer ? parecer.texto_parecer : (
                <div className="text-muted-foreground py-8 text-center">
                  Nenhum parecer ainda. Clique em <strong className="text-ai">Gerar parecer com IA</strong> para que o sistema analise os descritores críticos da turma e produza um relatório pedagógico estruturado.
                </div>
              )}
            </div>
          </article>

          <article className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display font-bold text-lg flex items-center gap-2">
              <Target className="size-5 text-primary" /> Plano de intervenção sugerido
            </h2>
            <ol className="mt-4 space-y-3">
              {[
                { s: "Semana 1-2", t: "Oficina de inferência com manchetes de jornal — 4 encontros de 50min." },
                { s: "Semana 3", t: "Análise de infográficos da BBC/Nexo: dados, escalas e narrativa visual." },
                { s: "Semana 4", t: "Reaplicação de itens-âncora SPAECE 2023 (D5, D12) para reavaliação diagnóstica." },
                { s: "Contínuo", t: "Tutoria entre pares: 6 alunos de alto desempenho em duplas com 6 de baixo." },
              ].map((p, i) => (
                <li key={i} className="flex gap-3">
                  <div className="size-7 rounded-lg bg-primary/10 text-primary grid place-items-center text-xs font-bold shrink-0">{i + 1}</div>
                  <div>
                    <div className="text-xs font-semibold text-primary">{p.s}</div>
                    <div className="text-sm mt-0.5">{p.t}</div>
                  </div>
                </li>
              ))}
            </ol>
          </article>

          <article className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="size-4 text-ai" />
              <h3 className="font-semibold text-sm">Pergunte à IA sobre esta turma</h3>
            </div>
            <div className="flex items-center gap-2 px-3 h-12 rounded-xl bg-muted/60 border border-border">
              <input placeholder="Ex: Quais alunos precisam de recuperação urgente?" className="bg-transparent text-sm flex-1 outline-none" />
              <button className="size-9 grid place-items-center rounded-lg bg-ai text-ai-foreground">
                <Send className="size-4" />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {["Top 5 com maior queda", "Gere atividades sobre D12", "Compare com 2º Administração"].map((s) => (
                <button key={s} className="text-xs px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted">
                  {s}
                </button>
              ))}
            </div>
          </article>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-display font-semibold">Descritores críticos</h3>
            <ul className="mt-4 space-y-3">
              {DESCRITORES.map((d) => (
                <li key={d.code}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-semibold">{d.code} · {d.desc}</span>
                    <span className={`font-bold ${d.media < 50 ? "text-destructive" : d.media < 65 ? "text-warning" : "text-success"}`}>{d.media}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${d.media < 50 ? "bg-destructive" : d.media < 65 ? "bg-warning" : "bg-success"}`} style={{ width: `${d.media}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-display font-semibold text-sm">Previsão SPAECE 2026</h3>
            <div className="mt-3 flex items-end gap-3">
              <div className="font-display font-bold text-4xl">258</div>
              <div className="text-xs text-muted-foreground pb-1.5">pontos · faixa <strong className="text-warning">intermediário</strong></div>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              Projeção baseada em desempenho atual + tendência das últimas 12 semanas.
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
