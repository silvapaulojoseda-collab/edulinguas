import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Loader2, FileSpreadsheet, FileDown, Upload, Printer, Save, ChevronLeft,
  ClipboardList, Calendar, CheckCircle2, AlertCircle, Sparkles,
} from "lucide-react";
import {
  listarAvaliacoesParaGabarito,
  listarGabarito,
  salvarGabarito,
  exportarGabaritoExcel,
  importarGabaritoExcel,
  exportarNotasExcel,
  gerarCartoesPdf,
} from "@/lib/gabaritos.functions";

export const Route = createFileRoute("/gabaritos")({
  head: () => ({
    meta: [
      { title: "Gabaritos · EduLinguas AI" },
      { name: "description", content: "Cadastre gabaritos, gere cartões-resposta impressos com QR e exporte notas em Excel." },
    ],
  }),
  component: GabaritosPage,
});

type Avaliacao = {
  id: string;
  titulo: string;
  disciplina: string;
  num_questoes: number;
  data: string;
  gabarito_count: number;
};

type Item = { ordem: number; alternativa_correta: "A" | "B" | "C" | "D" | "E" | ""; descritor: string };

const ALTS = ["A", "B", "C", "D", "E"] as const;

function downloadBase64(filename: string, base64: string, mime: string) {
  const bin = atob(base64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  const blob = new Blob([arr], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function GabaritosPage() {
  const listar = useServerFn(listarAvaliacoesParaGabarito);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [selected, setSelected] = useState<Avaliacao | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const r = await listar();
      setAvaliacoes(r.avaliacoes);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Gabaritos & Cartões</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Defina as respostas corretas, importe/exporte em Excel, gere PDFs com QR code para impressão.
          </p>
        </div>
      </div>

      {selected ? (
        <Editor
          avaliacao={selected}
          onBack={() => { setSelected(null); load(); }}
        />
      ) : loading ? (
        <div className="grid place-items-center py-20 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : avaliacoes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <ClipboardList className="size-10 mx-auto text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            Nenhuma avaliação cadastrada. Crie uma em <span className="font-semibold">Avaliações</span> primeiro.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {avaliacoes.map((a) => {
            const pct = a.num_questoes > 0 ? Math.round((a.gabarito_count / a.num_questoes) * 100) : 0;
            const done = a.gabarito_count >= a.num_questoes && a.num_questoes > 0;
            return (
              <button
                key={a.id}
                onClick={() => setSelected(a)}
                className="text-left rounded-2xl border border-border bg-card p-5 hover:border-primary/60 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-primary/10 text-primary">
                    {a.disciplina}
                  </span>
                  {done ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-success">
                      <CheckCircle2 className="size-3" /> Completo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-warning">
                      <AlertCircle className="size-3" /> {a.gabarito_count}/{a.num_questoes}
                    </span>
                  )}
                </div>
                <h3 className="mt-3 font-display font-bold text-lg leading-tight">{a.titulo}</h3>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                  <Calendar className="size-3" /> {new Date(a.data).toLocaleDateString("pt-BR")}
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

function Editor({ avaliacao, onBack }: { avaliacao: Avaliacao; onBack: () => void }) {
  const fetchG = useServerFn(listarGabarito);
  const saveG = useServerFn(salvarGabarito);
  const exportG = useServerFn(exportarGabaritoExcel);
  const importG = useServerFn(importarGabaritoExcel);
  const exportN = useServerFn(exportarNotasExcel);
  const gerarPdf = useServerFn(gerarCartoesPdf);

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"" | "save" | "export" | "import" | "pdf" | "notas">("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await fetchG({ data: { avaliacaoId: avaliacao.id } });
        const map = new Map(r.itens.map((i: any) => [i.ordem, i]));
        setItems(
          Array.from({ length: avaliacao.num_questoes }, (_, idx) => {
            const ordem = idx + 1;
            const it = map.get(ordem);
            return {
              ordem,
              alternativa_correta: (it?.alternativa_correta ?? "") as Item["alternativa_correta"],
              descritor: it?.descritor ?? "",
            };
          }),
        );
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao carregar gabarito");
      } finally {
        setLoading(false);
      }
    })();
  }, [avaliacao.id, avaliacao.num_questoes, fetchG]);

  const preenchidos = useMemo(() => items.filter((i) => i.alternativa_correta).length, [items]);

  function setAlt(ordem: number, alt: Item["alternativa_correta"]) {
    setItems((prev) => prev.map((i) => (i.ordem === ordem ? { ...i, alternativa_correta: alt } : i)));
  }
  function setDesc(ordem: number, descritor: string) {
    setItems((prev) => prev.map((i) => (i.ordem === ordem ? { ...i, descritor: descritor.slice(0, 60) } : i)));
  }

  async function salvar() {
    setBusy("save");
    try {
      const payload = items
        .filter((i) => i.alternativa_correta)
        .map((i) => ({
          ordem: i.ordem,
          alternativa_correta: i.alternativa_correta as "A" | "B" | "C" | "D" | "E",
          descritor: i.descritor ? i.descritor : null,
        }));
      await saveG({ data: { avaliacaoId: avaliacao.id, itens: payload } });
      toast.success(`Gabarito salvo (${payload.length} questões)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setBusy("");
    }
  }

  async function exportar() {
    setBusy("export");
    try {
      const r = await exportG({ data: { avaliacaoId: avaliacao.id } });
      downloadBase64(r.filename, r.base64, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao exportar");
    } finally {
      setBusy("");
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy("import");
    try {
      const buf = await f.arrayBuffer();
      const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      const r = await importG({ data: { avaliacaoId: avaliacao.id, base64: b64 } });
      toast.success(`Importado: ${r.count} questões`);
      // recarrega
      const fresh = await fetchG({ data: { avaliacaoId: avaliacao.id } });
      const map = new Map(fresh.itens.map((i: any) => [i.ordem, i]));
      setItems(
        Array.from({ length: avaliacao.num_questoes }, (_, idx) => {
          const ordem = idx + 1;
          const it = map.get(ordem);
          return {
            ordem,
            alternativa_correta: (it?.alternativa_correta ?? "") as Item["alternativa_correta"],
            descritor: it?.descritor ?? "",
          };
        }),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao importar");
    } finally {
      setBusy("");
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function pdf() {
    setBusy("pdf");
    try {
      const r = await gerarPdf({ data: { avaliacaoId: avaliacao.id } });
      downloadBase64(r.filename, r.base64, "application/pdf");
      toast.success(`PDF gerado para ${r.total} aluno(s)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar PDF");
    } finally {
      setBusy("");
    }
  }

  async function notas() {
    setBusy("notas");
    try {
      const r = await exportN({ data: { avaliacaoId: avaliacao.id } });
      downloadBase64(r.filename, r.base64, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao exportar notas");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl hover:bg-muted text-sm">
          <ChevronLeft className="size-4" /> Voltar
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-display font-bold text-lg truncate">{avaliacao.titulo}</h2>
          <p className="text-xs text-muted-foreground">{avaliacao.disciplina} · {avaliacao.num_questoes} questões · preenchidas {preenchidos}/{avaliacao.num_questoes}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={salvar} disabled={busy === "save"} className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60">
          {busy === "save" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Salvar gabarito
        </button>
        <button onClick={exportar} disabled={busy === "export"} className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-border text-sm font-semibold hover:bg-muted disabled:opacity-60">
          {busy === "export" ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />} Exportar Excel
        </button>
        <button onClick={() => fileRef.current?.click()} disabled={busy === "import"} className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-border text-sm font-semibold hover:bg-muted disabled:opacity-60">
          {busy === "import" ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Importar Excel
        </button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" hidden onChange={onFile} />
        <div className="grow" />
        <button onClick={pdf} disabled={busy === "pdf"} className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-ai text-ai-foreground text-sm font-semibold disabled:opacity-60">
          {busy === "pdf" ? <Loader2 className="size-4 animate-spin" /> : <Printer className="size-4" />} Gerar cartões PDF
        </button>
        <button onClick={notas} disabled={busy === "notas"} className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-border text-sm font-semibold hover:bg-muted disabled:opacity-60">
          {busy === "notas" ? <Loader2 className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />} Exportar notas
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        {loading ? (
          <div className="grid place-items-center py-12 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {items.map((it) => (
              <div key={it.ordem} className="rounded-xl border border-border bg-background/40 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-xs font-bold w-7">{String(it.ordem).padStart(2, "0")}</span>
                  <div className="flex gap-1">
                    {ALTS.map((a) => (
                      <button
                        key={a}
                        onClick={() => setAlt(it.ordem, it.alternativa_correta === a ? "" : a)}
                        className={`size-7 rounded-lg text-xs font-bold transition ${
                          it.alternativa_correta === a
                            ? "bg-primary text-primary-foreground shadow-glow"
                            : "bg-muted text-muted-foreground hover:bg-muted/70"
                        }`}
                        aria-pressed={it.alternativa_correta === a}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  value={it.descritor}
                  onChange={(e) => setDesc(it.ordem, e.target.value)}
                  placeholder="Descritor (ex: D5)"
                  className="w-full h-8 px-2 rounded-lg bg-muted/40 border border-border text-xs outline-none focus:border-primary"
                  maxLength={60}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-dashed border-border p-4 text-xs text-muted-foreground flex gap-2 items-start">
        <Sparkles className="size-4 text-ai shrink-0 mt-0.5" />
        <p>
          Os cartões impressos contêm um QR code assinado (HMAC) com o ID da escola, da avaliação e do aluno.
          O OCR rejeita automaticamente cartões de outra escola ou avaliação para evitar fraude e confusão de dados.
        </p>
      </div>
    </div>
  );
}
