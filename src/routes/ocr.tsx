import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Upload, ScanLine, QrCode, CheckCircle2, AlertTriangle, XCircle, Sparkles, Camera } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/ocr")({
  head: () => ({
    meta: [
      { title: "Leitura OCR · EduLinguas AI" },
      { name: "description", content: "Correção automática de cartões-resposta com OCR + visão computacional e detecção de inconsistências." },
    ],
  }),
  component: OCR,
});

const detected = [
  { aluno: "ADRIELLY DOS SANTOS NUNES", matricula: "4014651", acertos: 22, total: 30, status: "ok" },
  { aluno: "ANA CECILIA EUFRAZIO TEIXEIRA", matricula: "4923012", acertos: 18, total: 30, status: "ok" },
  { aluno: "ANA JULIA EUFRASIO DE MENESES", matricula: "4014627", acertos: 0, total: 30, status: "dupla" },
  { aluno: "ANA KELLY TELES DA SILVA", matricula: "4010257", acertos: 25, total: 30, status: "ok" },
  { aluno: "—", matricula: "—", acertos: 0, total: 30, status: "qr" },
];

function OCR() {
  const [drag, setDrag] = useState(false);
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
            onDrop={(e) => { e.preventDefault(); setDrag(false); }}
            className={`rounded-2xl border-2 border-dashed p-10 text-center transition-all ${drag ? "border-ai bg-ai/5" : "border-border bg-card"}`}
          >
            <div className="size-16 rounded-2xl bg-gradient-to-br from-primary to-ai grid place-items-center mx-auto shadow-glow">
              <ScanLine className="size-7 text-primary-foreground" />
            </div>
            <h3 className="mt-4 font-display font-bold text-xl">Arraste os cartões aqui</h3>
            <p className="text-sm text-muted-foreground mt-1">PDF, JPG ou PNG · até 50 páginas por lote</p>
            <div className="mt-5 flex flex-wrap gap-2 justify-center">
              <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-glow">
                <Upload className="size-4" /> Selecionar arquivos
              </button>
              <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border text-sm font-semibold">
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
                <h3 className="font-display font-semibold">Cartões detectados</h3>
                <p className="text-xs text-muted-foreground">5 processados · 1 atenção · 1 erro</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-md bg-ai/15 text-ai font-semibold inline-flex items-center gap-1">
                <Sparkles className="size-3" /> IA verificando
              </span>
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
                {detected.map((d, i) => (
                  <tr key={i} className="border-b border-border/60">
                    <td className="px-5 py-3 font-medium">{d.aluno}</td>
                    <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{d.matricula}</td>
                    <td className="px-3 py-3 text-sm">{d.status === "ok" ? `${d.acertos}/${d.total}` : "—"}</td>
                    <td className="px-3 py-3 text-right">
                      {d.status === "ok" && <span className="inline-flex items-center gap-1 text-success text-xs font-semibold"><CheckCircle2 className="size-3.5" /> OK</span>}
                      {d.status === "dupla" && <span className="inline-flex items-center gap-1 text-warning text-xs font-semibold"><AlertTriangle className="size-3.5" /> Dupla marcação</span>}
                      {d.status === "qr" && <span className="inline-flex items-center gap-1 text-destructive text-xs font-semibold"><XCircle className="size-3.5" /> QR ilegível</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-display font-semibold">Lote atual</h3>
            <div className="mt-4 space-y-3 text-sm">
              <Row k="Avaliação" v="Diagnóstica 2026.1" />
              <Row k="Turma" v="1º Administração" />
              <Row k="Total de cartões" v="42" />
              <Row k="Processados" v="5" />
            </div>
            <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-ai rounded-full" style={{ width: "12%" }} />
            </div>
            <button className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-glow">
              <ScanLine className="size-4" /> Processar lote
            </button>
          </div>

          <div className="rounded-2xl border border-ai/30 bg-gradient-to-br from-card to-[color-mix(in_oklab,var(--ai)_8%,var(--card))] p-5">
            <div className="flex items-center gap-2 text-ai font-semibold text-sm">
              <Sparkles className="size-4" /> IA sugere
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Detectei 1 cartão com QR Code danificado. Posso tentar identificar o aluno pela escrita à mão?
            </p>
            <button className="mt-3 text-xs font-semibold text-ai">Tentar reconhecimento manual →</button>
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
