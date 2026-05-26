import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Sparkles, Send, FileDown, Lightbulb, Target, Loader2, RefreshCw } from "lucide-react";
import { DESCRITORES } from "@/lib/seed";
import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { gerarParecer, perguntarIA } from "@/lib/ia.functions";

export const Route = createFileRoute("/ia")({
  head: () => ({
    meta: [
      { title: "IA Pedagógica · EduLinguas AI" },
      { name: "description", content: "Parecer pedagógico automatizado com descritores críticos e plano de intervenção." },
    ],
  }),
  component: IA,
});

type Msg = { role: "user" | "assistant"; content: string };

function IA() {
  const gerar = useServerFn(gerarParecer);
  const perguntar = useServerFn(perguntarIA);
  const [gerando, setGerando] = useState(false);
  const [parecer, setParecer] = useState<{
    diagnostico: string;
    pontos_fortes?: string[];
    gargalos?: string[];
    plano_intervencao?: { periodo: string; acao: string }[];
    previsao_spaece?: { pontuacao: number; faixa: string };
  } | null>(null);
  const [pergunta, setPergunta] = useState("");
  const [historico, setHistorico] = useState<Msg[]>([]);
  const [enviando, setEnviando] = useState(false);

  async function handleGerar() {
    setGerando(true);
    const t = toast.loading("Gerando parecer com IA...");
    try {
      const res = await gerar({ data: {} });
      const dados = res.parecer?.dados as typeof parecer;
      setParecer(dados);
      toast.success("Parecer gerado!", { id: t });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar parecer", { id: t });
    } finally {
      setGerando(false);
    }
  }

  async function handlePerguntar(text?: string) {
    const q = (text ?? pergunta).trim();
    if (!q) return;
    setHistorico((h) => [...h, { role: "user", content: q }]);
    setPergunta("");
    setEnviando(true);
    try {
      const res = await perguntar({ data: { pergunta: q, historico } });
      setHistorico((h) => [...h, { role: "assistant", content: res.resposta }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao consultar IA");
    } finally {
      setEnviando(false);
    }
  }

  function exportarPDF() {
    if (!parecer) return toast.error("Gere o parecer primeiro.");
    window.print();
  }

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="inline-flex items-center gap-2 ai-chip px-3 py-1 rounded-full text-xs font-semibold">
            <Sparkles className="size-3.5" /> Engine IA Pedagógica
          </div>
          <h1 className="mt-3 text-3xl font-display font-bold tracking-tight">Parecer pedagógico</h1>
          <p className="text-muted-foreground text-sm mt-1">Modelo educacional GPT-5.2 · BNCC/SPAECE</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleGerar}
            disabled={gerando}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-glow disabled:opacity-50"
          >
            {gerando ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            {parecer ? "Gerar novamente" : "Gerar parecer"}
          </button>
          <button onClick={exportarPDF} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border text-sm font-semibold">
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
            {!parecer ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Clique em <strong className="text-foreground">Gerar parecer</strong> para que a IA analise os dados agregados da sua escola e produza um diagnóstico completo.
              </p>
            ) : (
              <div className="mt-3 space-y-3 text-sm leading-relaxed">
                <p>{parecer.diagnostico}</p>
                {parecer.pontos_fortes && parecer.pontos_fortes.length > 0 && (
                  <div>
                    <div className="text-xs font-bold uppercase text-success mt-3 mb-1">Pontos fortes</div>
                    <ul className="list-disc pl-5 space-y-0.5">{parecer.pontos_fortes.map((p, i) => <li key={i}>{p}</li>)}</ul>
                  </div>
                )}
                {parecer.gargalos && parecer.gargalos.length > 0 && (
                  <div>
                    <div className="text-xs font-bold uppercase text-warning mt-3 mb-1">Gargalos</div>
                    <ul className="list-disc pl-5 space-y-0.5">{parecer.gargalos.map((p, i) => <li key={i}>{p}</li>)}</ul>
                  </div>
                )}
              </div>
            )}
          </article>

          {parecer?.plano_intervencao && parecer.plano_intervencao.length > 0 && (
            <article className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-display font-bold text-lg flex items-center gap-2">
                <Target className="size-5 text-primary" /> Plano de intervenção
              </h2>
              <ol className="mt-4 space-y-3">
                {parecer.plano_intervencao.map((p, i) => (
                  <li key={i} className="flex gap-3">
                    <div className="size-7 rounded-lg bg-primary/10 text-primary grid place-items-center text-xs font-bold shrink-0">{i + 1}</div>
                    <div>
                      <div className="text-xs font-semibold text-primary">{p.periodo}</div>
                      <div className="text-sm mt-0.5">{p.acao}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </article>
          )}

          <article className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="size-4 text-ai" />
              <h3 className="font-semibold text-sm">Pergunte à IA sobre sua escola</h3>
            </div>
            {historico.length > 0 && (
              <div className="space-y-2 mb-3 max-h-80 overflow-y-auto">
                {historico.map((m, i) => (
                  <div key={i} className={`text-sm p-3 rounded-xl ${m.role === "user" ? "bg-primary/10 ml-8" : "bg-muted mr-8"}`}>
                    <div className="text-[10px] font-bold uppercase opacity-60 mb-1">{m.role === "user" ? "Você" : "IA"}</div>
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  </div>
                ))}
                {enviando && <div className="text-xs text-muted-foreground"><Loader2 className="size-3 animate-spin inline" /> IA pensando...</div>}
              </div>
            )}
            <form
              onSubmit={(e) => { e.preventDefault(); handlePerguntar(); }}
              className="flex items-center gap-2 px-3 h-12 rounded-xl bg-muted/60 border border-border"
            >
              <input
                value={pergunta}
                onChange={(e) => setPergunta(e.target.value)}
                placeholder="Ex: Quais alunos precisam de recuperação urgente?"
                className="bg-transparent text-sm flex-1 outline-none"
                disabled={enviando}
              />
              <button type="submit" disabled={enviando || !pergunta.trim()} className="size-9 grid place-items-center rounded-lg bg-ai text-ai-foreground disabled:opacity-50">
                {enviando ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </button>
            </form>
            <div className="mt-3 flex flex-wrap gap-2">
              {["Top 5 com maior queda", "Resuma os descritores críticos", "Que turmas precisam de reforço?"].map((s) => (
                <button key={s} onClick={() => handlePerguntar(s)} disabled={enviando} className="text-xs px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-50">
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
            <h3 className="font-display font-semibold text-sm">Previsão SPAECE</h3>
            <div className="mt-3 flex items-end gap-3">
              <div className="font-display font-bold text-4xl">{parecer?.previsao_spaece?.pontuacao ?? "—"}</div>
              <div className="text-xs text-muted-foreground pb-1.5">
                pontos · faixa <strong className="text-warning">{parecer?.previsao_spaece?.faixa ?? "intermediário"}</strong>
              </div>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              {parecer ? "Projeção gerada pela IA com base no desempenho atual." : "Gere o parecer para ver a projeção."}
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
