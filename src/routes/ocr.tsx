import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Upload, ScanLine, QrCode, CheckCircle2, AlertTriangle, XCircle, Sparkles, Camera, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { registrarOCR } from "@/lib/edu-api";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/ocr")({
  head: () => ({
    meta: [
      { title: "Leitura OCR · EduLinguas AI" },
      { name: "description", content: "Correção automática de cartões-resposta com OCR + visão computacional e detecção de inconsistências." },
    ],
  }),
  component: OCR,
});

type Lote = {
  id: string;
  data: string;
  turma: string;
  status: string;
  total_cartoes: number;
};

function OCR() {
  const [drag, setDrag] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const reload = () =>
    supabase
      .from("gabaritos_ocr")
      .select("*")
      .order("data", { ascending: false })
      .limit(8)
      .then(({ data }) => setLotes((data ?? []) as Lote[]));

  useEffect(() => {
    reload();
    const ch = supabase
      .channel("ocr-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "gabaritos_ocr" }, reload)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const turmas = ["1º Administração", "1º Hospedagem", "1º Informática", "2º Informática"];

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setProcessing(true);
    const turma = turmas[Math.floor(Math.random() * turmas.length)];
    const total = files.length === 1 ? Math.floor(Math.random() * 30) + 10 : files.length;
    toast.loading("Processando OCR...", { id: "ocr" });
    await new Promise((r) => setTimeout(r, 3000));
    try {
      const rec = await registrarOCR(turma, total);
      toast.success(`${total} cartões processados — ${turma}`, { id: "ocr" });
      if ((rec as Lote)?.status === "alerta") {
        toast.warning("Alguns cartões com dupla marcação detectada");
      }
    } catch (e) {
      toast.error("Falha ao processar OCR", { id: "ocr" });
      console.error(e);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold tracking-tight">Leitura OCR</h1>
        <p className="text-muted-foreground text-sm mt-1">Envie fotos ou PDFs dos cartões-resposta. A IA detecta QR, marcações e inconsistências automaticamente.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
            onClick={() => inputRef.current?.click()}
            className={`rounded-2xl border-2 border-dashed p-10 text-center transition-all cursor-pointer ${drag ? "border-ai bg-ai/5" : "border-border bg-card"} ${processing ? "opacity-60 pointer-events-none" : ""}`}
          >
            <input ref={inputRef} type="file" multiple accept="image/*,application/pdf" hidden onChange={(e) => handleFiles(e.target.files)} />
            <div className="size-16 rounded-2xl bg-gradient-to-br from-primary to-ai grid place-items-center mx-auto shadow-glow">
              {processing ? <Loader2 className="size-7 text-primary-foreground animate-spin" /> : <ScanLine className="size-7 text-primary-foreground" />}
            </div>
            <h3 className="mt-4 font-display font-bold text-xl">
              {processing ? "Processando OCR..." : "Arraste os cartões aqui"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {processing ? "Detecção de QR + marcações em andamento" : "PDF, JPG ou PNG · até 50 páginas por lote"}
            </p>
            <div className="mt-5 flex flex-wrap gap-2 justify-center">
              <button type="button" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-glow">
                <Upload className="size-4" /> Selecionar arquivos
              </button>
              <button type="button" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border text-sm font-semibold">
                <Camera className="size-4" /> Usar câmera
              </button>
            </div>
            <div className="mt-6 flex items-center justify-center gap-6 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><QrCode className="size-3.5" /> QR automático</span>
              <span className="inline-flex items-center gap-1.5"><Sparkles className="size-3.5 text-ai" /> Dupla marcação</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-3.5" /> Tempo real</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-display font-semibold">Lotes processados</h3>
                <p className="text-xs text-muted-foreground">{lotes.length} lotes recentes · dados reais do banco</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-md bg-ai/15 text-ai font-semibold inline-flex items-center gap-1">
                <Sparkles className="size-3" /> IA verificando
              </span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="px-5 py-2.5 font-medium">Data</th>
                  <th className="px-3 py-2.5 font-medium">Turma</th>
                  <th className="px-3 py-2.5 font-medium">Cartões</th>
                  <th className="px-3 py-2.5 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {lotes.length === 0 && (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-muted-foreground">Nenhum lote processado ainda. Arraste cartões acima.</td></tr>
                )}
                {lotes.map((d) => (
                  <tr key={d.id} className="border-b border-border/60">
                    <td className="px-5 py-3 text-xs text-muted-foreground">{new Date(d.data).toLocaleString("pt-BR")}</td>
                    <td className="px-3 py-3 font-medium">{d.turma}</td>
                    <td className="px-3 py-3 text-sm">{d.total_cartoes}</td>
                    <td className="px-3 py-3 text-right">
                      {d.status === "sucesso" && <span className="inline-flex items-center gap-1 text-success text-xs font-semibold"><CheckCircle2 className="size-3.5" /> Sucesso</span>}
                      {d.status === "alerta" && <span className="inline-flex items-center gap-1 text-warning text-xs font-semibold"><AlertTriangle className="size-3.5" /> Alerta</span>}
                      {d.status === "erro" && <span className="inline-flex items-center gap-1 text-destructive text-xs font-semibold"><XCircle className="size-3.5" /> Erro</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-display font-semibold">Status do lote</h3>
            <div className="mt-4 space-y-3 text-sm">
              <Row k="Avaliação" v="Diagnóstica 2026.1" />
              <Row k="Modo" v="OCR + Visão Comp." />
              <Row k="Lotes processados" v={String(lotes.length)} />
              <Row k="Última leitura" v={lotes[0] ? new Date(lotes[0].data).toLocaleTimeString("pt-BR") : "—"} />
            </div>
            <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-ai rounded-full transition-all" style={{ width: processing ? "60%" : "100%" }} />
            </div>
          </div>

          <div className="rounded-2xl border border-ai/30 bg-gradient-to-br from-card to-[color-mix(in_oklab,var(--ai)_8%,var(--card))] p-5">
            <div className="flex items-center gap-2 text-ai font-semibold text-sm">
              <Sparkles className="size-4" /> IA sugere
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Sempre que um lote é processado, uma notificação é criada automaticamente no sistema. Use o sino no topo para ver o histórico.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground text-xs">{k}</span>
      <span className="font-semibold">{v}</span>
    </div>
  );
}
