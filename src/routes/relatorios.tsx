import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { FileText, Download, Eye } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios · EduLinguas AI" },
      { name: "description", content: "Relatórios pedagógicos por turma e individuais em PDF com análise textual e plano de intervenção." },
    ],
  }),
  component: Relatorios,
});

const reports = [
  { tipo: "Turma", nome: "1º Administração — Diagnóstica 2026.1", data: "13 abr", paginas: 12 },
  { tipo: "Turma", nome: "2º Informática — Português", data: "12 abr", paginas: 14 },
  { tipo: "Individual", nome: "Adrielly dos Santos Nunes", data: "12 abr", paginas: 4 },
  { tipo: "Escola", nome: "Consolidado bimestral — EEEP Maria Dolores", data: "10 abr", paginas: 32 },
  { tipo: "Turma", nome: "3º Hospedagem — Inglês", data: "08 abr", paginas: 10 },
];

function Relatorios() {
  const navigate = useNavigate();
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground text-sm mt-1">Diagnósticos pedagógicos gerados pela IA, prontos para impressão.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground border-b border-border">
              <th className="px-5 py-3 font-medium">Tipo</th>
              <th className="px-3 py-3 font-medium">Nome</th>
              <th className="px-3 py-3 font-medium">Data</th>
              <th className="px-3 py-3 font-medium">Páginas</th>
              <th className="px-3 py-3 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r, i) => (
              <tr key={i} className="border-b border-border/60 hover:bg-muted/40">
                <td className="px-5 py-3">
                  <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-md bg-primary/10 text-primary">{r.tipo}</span>
                </td>
                <td className="px-3 py-3 font-medium flex items-center gap-2.5">
                  <FileText className="size-4 text-muted-foreground" /> {r.nome}
                </td>
                <td className="px-3 py-3 text-muted-foreground text-xs">{r.data}</td>
                <td className="px-3 py-3 text-xs">{r.paginas} pg</td>
                <td className="px-3 py-3 text-right">
                  <div className="inline-flex gap-1">
                    <button onClick={() => navigate({ to: "/ia" })} className="size-8 grid place-items-center rounded-lg hover:bg-muted" title="Visualizar"><Eye className="size-4" /></button>
                    <button onClick={() => toast.success(`Download de "${r.nome}" iniciado`)} className="size-8 grid place-items-center rounded-lg hover:bg-muted" title="Baixar PDF"><Download className="size-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
