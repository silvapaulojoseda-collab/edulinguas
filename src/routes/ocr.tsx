import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import {
  Upload, ScanLine, QrCode, CheckCircle2, AlertTriangle, XCircle, Sparkles, Camera, Loader2, RefreshCw,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { criarLoteOcr, getStatusLote, uploadCartaoUrl } from "@/lib/ocr.functions";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/ocr")({
  head: () => ({
    meta: [
      { title: "Leitura OCR · EduLinguas AI" },
      { name: "description", content: "Correção automática de cartões-resposta com OCR + visão computacional." },
    ],
  }),
  component: OCR,
});

type CartaoStatus = {
  id: string;
  file_path: string;
  status: string;
  acertos: number | null;
  total: number | null;
  motivo_erro: string | null;
  qr_lido: string | null;
  aluno_id: string | null;
  alunos?: { nome: string; matricula: string } | null;
};

function OCR() {
  const { user } = useAuth();
  const [drag, setDrag] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loteId, setLoteId] = useState<string | null>(null);
  const [lote, setLote] = useState<{ total: number; processados: number; erros: number; status: string } | null>(null);
  const [cartoes, setCartoes] = useState<CartaoStatus[]>([]);
  const [avaliacaoId, setAvaliacaoId] = useState<string>("");
  const [avaliacoes, setAvaliacoes] = useState<{ id: string; titulo: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  const criar = useServerFn(criarLoteOcr);
  const status = useServerFn(getStatusLote);
  const signUrl = useServerFn(uploadCartaoUrl);

  // Buscar avaliações disponíveis
  useEffect(() => {
    if (!user?.escolaAtiva?.id) return;
    supabase
      .from("avaliacoes")
      .select("id,titulo")
      .eq("escola_id", user.escolaAtiva.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setAvaliacoes(data ?? []);
        if (data?.[0]) setAvaliacaoId(data[0].id);
      });
  }, [user?.escolaAtiva?.id]);

  // Polling do status do lote
  useEffect(() => {
    if (!loteId) return;
    let stop = false;
    const tick = async () => {
      try {
        const res = await status({ data: { loteId } });
        if (stop) return;
        setLote(res.lote);
        setCartoes(res.cartoes as CartaoStatus[]);
        if (res.lote.status === "done" || res.lote.status === "error") return;
        setTimeout(tick, 2000);
      } catch (e) {
        console.error(e);
      }
    };
    tick();
    return () => { stop = true; };
  }, [loteId, status]);

  function pickFiles(list: FileList | null) {
    if (!list) return;
    const arr = Array.from(list).filter((f) => /^image\/|application\/pdf$/.test(f.type));
    setFiles((prev) => [...prev, ...arr].slice(0, 100));
  }

  async function processar() {
    if (!user?.escolaAtiva?.id) return toast.error("Sem escola ativa.");
    if (!avaliacaoId) return toast.error("Selecione uma avaliação.");
    if (files.length === 0) return toast.error("Adicione ao menos 1 arquivo.");
    setUploading(true);
    const t = toast.loading(`Enviando ${files.length} cartão(ões)...`);
    try {
      const loteRef = crypto.randomUUID().slice(0, 8);
      const arquivos: { path: string; nome: string }[] = [];
      for (const f of files) {
        const safe = f.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const { path, signedUrl, token } = await signUrl({
          data: { escolaId: user.escolaAtiva.id, loteRef, filename: safe },
        });
        const up = await supabase.storage.from("cartoes-resposta").uploadToSignedUrl(path, token, f);
        if (up.error) throw new Error(up.error.message);
        void signedUrl;
        arquivos.push({ path, nome: f.name });
      }
      const res = await criar({ data: { avaliacaoId, arquivos } });
      setLoteId(res.loteId);
      setFiles([]);
      toast.success("Lote criado! Processamento iniciado.", { id: t });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar", { id: t });
    } finally {
      setUploading(false);
    }
  }

  const processados = lote?.processados ?? 0;
  const total = lote?.total ?? 0;
  const pct = total ? Math.round((processados / total) * 100) : 0;

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold tracking-tight">Leitura OCR</h1>
        <p className="text-muted-foreground text-sm mt-1">Envie fotos ou PDFs dos cartões-resposta. A IA detecta QR, marcações e inconsistências.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); pickFiles(e.dataTransfer.files); }}
            className={`rounded-2xl border-2 border-dashed p-10 text-center transition-all ${drag ? "border-ai bg-ai/5" : "border-border bg-card"}`}
          >
            <div className="size-16 rounded-2xl bg-gradient-to-br from-primary to-ai grid place-items-center mx-auto shadow-glow">
              <ScanLine className="size-7 text-primary-foreground" />
            </div>
            <h3 className="mt-4 font-display font-bold text-xl">Arraste os cartões aqui</h3>
            <p className="text-sm text-muted-foreground mt-1">PDF, JPG ou PNG · até 100 por lote</p>
            <input ref={inputRef} type="file" multiple accept="image/*,application/pdf" hidden onChange={(e) => pickFiles(e.target.files)} />
            <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => pickFiles(e.target.files)} />
            <div className="mt-5 flex flex-wrap gap-2 justify-center">
              <button onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-glow">
                <Upload className="size-4" /> Selecionar arquivos
              </button>
              <button onClick={() => camRef.current?.click()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border text-sm font-semibold">
                <Camera className="size-4" /> Usar câmera
              </button>
            </div>
            {files.length > 0 && (
              <div className="mt-4 text-xs text-muted-foreground">
                {files.length} arquivo(s) selecionado(s){" "}
                <button onClick={() => setFiles([])} className="text-destructive font-semibold ml-1">limpar</button>
              </div>
            )}
            <div className="mt-6 flex items-center justify-center gap-6 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><QrCode className="size-3.5" /> QR automático</span>
              <span className="inline-flex items-center gap-1.5"><Sparkles className="size-3.5 text-ai" /> Dupla marcação</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-3.5" /> Tempo real</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-display font-semibold">Cartões detectados</h3>
                <p className="text-xs text-muted-foreground">
                  {cartoes.length === 0 ? "Nenhum lote processado ainda" : `${processados}/${total} processados · ${lote?.erros ?? 0} erro(s)`}
                </p>
              </div>
              {loteId && (
                <button
                  onClick={() => status({ data: { loteId } }).then((r) => { setLote(r.lote); setCartoes(r.cartoes as CartaoStatus[]); })}
                  className="text-xs px-2.5 py-1 rounded-md bg-muted hover:bg-muted/70 inline-flex items-center gap-1"
                >
                  <RefreshCw className="size-3" /> Atualizar
                </button>
              )}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="px-5 py-2.5 font-medium">Aluno</th>
                  <th className="px-3 py-2.5 font-medium">Matrícula</th>
                  <th className="px-3 py-2.5 font-medium">Acertos</th>
                  <th className="px-3 py-2.5 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {cartoes.length === 0 && (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-xs text-muted-foreground">Envie um lote para começar.</td></tr>
                )}
                {cartoes.map((d) => (
                  <tr key={d.id} className="border-b border-border/60">
                    <td className="px-5 py-3 font-medium">{d.alunos?.nome ?? "—"}</td>
                    <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{d.alunos?.matricula ?? d.qr_lido ?? "—"}</td>
                    <td className="px-3 py-3 text-sm">{d.acertos != null ? `${d.acertos}/${d.total}` : "—"}</td>
                    <td className="px-3 py-3 text-right">
                      {d.status === "ok" && <span className="inline-flex items-center gap-1 text-success text-xs font-semibold"><CheckCircle2 className="size-3.5" /> OK</span>}
                      {d.status === "pending" && <span className="inline-flex items-center gap-1 text-muted-foreground text-xs font-semibold"><Loader2 className="size-3.5 animate-spin" /> Aguardando</span>}
                      {d.status === "processing" && <span className="inline-flex items-center gap-1 text-primary text-xs font-semibold"><Loader2 className="size-3.5 animate-spin" /> Processando</span>}
                      {d.status === "dupla" && <span className="inline-flex items-center gap-1 text-warning text-xs font-semibold"><AlertTriangle className="size-3.5" /> Dupla marcação</span>}
                      {(d.status === "erro" || d.status === "qr_ilegivel") && (
                        <span className="inline-flex items-center gap-1 text-destructive text-xs font-semibold" title={d.motivo_erro ?? ""}>
                          <XCircle className="size-3.5" /> {d.motivo_erro?.slice(0, 30) ?? "Erro"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-display font-semibold">Configurar lote</h3>
            <div className="mt-4 space-y-3 text-sm">
              <label className="block">
                <span className="text-xs text-muted-foreground">Avaliação</span>
                <select
                  value={avaliacaoId}
                  onChange={(e) => setAvaliacaoId(e.target.value)}
                  className="mt-1 w-full h-10 px-3 rounded-xl bg-muted/60 border border-border text-sm outline-none"
                >
                  {avaliacoes.length === 0 && <option value="">Nenhuma avaliação cadastrada</option>}
                  {avaliacoes.map((a) => <option key={a.id} value={a.id}>{a.titulo}</option>)}
                </select>
              </label>
              <Row k="Arquivos selecionados" v={String(files.length)} />
              <Row k="Total de cartões" v={String(lote?.total ?? 0)} />
              <Row k="Processados" v={String(processados)} />
            </div>
            <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-ai rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <button
              disabled={uploading || files.length === 0 || !avaliacaoId}
              onClick={processar}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-glow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <ScanLine className="size-4" />}
              {uploading ? "Enviando..." : "Processar lote"}
            </button>
          </div>

          <div className="rounded-2xl border border-ai/30 bg-gradient-to-br from-card to-[color-mix(in_oklab,var(--ai)_8%,var(--card))] p-5">
            <div className="flex items-center gap-2 text-ai font-semibold text-sm">
              <Sparkles className="size-4" /> IA sugere
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {cartoes.some((c) => c.status === "erro" || c.status === "qr_ilegivel")
                ? "Detectei cartões com QR ilegível. Tente refotografar com mais luz."
                : "Boa! Os cartões estão sendo lidos sem inconsistências graves."}
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
