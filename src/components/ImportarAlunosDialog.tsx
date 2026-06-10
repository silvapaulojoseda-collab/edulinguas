import { useState, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, X, Download } from "lucide-react";
import { toast } from "sonner";
import { importarAlunos, type ImportResult } from "@/lib/alunos.functions";

type RawRow = { matricula: string | null; nome: string; turma: string | null; curso: string | null };

const COL_MAP: Record<string, keyof RawRow> = {
  id_matricula: "matricula", matricula: "matricula", matrícula: "matricula", "id matricula": "matricula", id: "matricula",
  nome_aluno: "nome", nome: "nome", aluno: "nome", "nome do aluno": "nome",
  turma: "turma", classe: "turma",
  curso: "curso", "curso técnico": "curso",
};

function normalizeHeader(h: string) {
  return String(h).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function parseSheet(file: ArrayBuffer): RawRow[] {
  const wb = XLSX.read(file, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  return json.map((r) => {
    const out: RawRow = { matricula: null, nome: "", turma: null, curso: null };
    for (const [k, v] of Object.entries(r)) {
      const key = COL_MAP[normalizeHeader(k)];
      if (!key) continue;
      const val = String(v ?? "").trim();
      if (key === "nome") out.nome = val;
      else (out as Record<string, string | null>)[key] = val || null;
    }
    return out;
  }).filter((r) => r.nome && r.nome.length >= 2);
}

export function ImportarAlunosDialog({
  escolaId,
  onClose,
  onImported,
}: {
  escolaId: string;
  onClose: () => void;
  onImported: () => void;
}) {
  const [rows, setRows] = useState<RawRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [anoLetivo, setAnoLetivo] = useState<number>(new Date().getFullYear());
  const [result, setResult] = useState<ImportResult | null>(null);
  const _importar = useServerFn(importarAlunos);

  const mImport = useMutation({
    mutationFn: () => _importar({ data: { escolaId, anoLetivo, rows, fileName } }),
    onSuccess: ({ resultado }) => {
      setResult(resultado);
      toast.success(`Importação concluída: ${resultado.importados} novos, ${resultado.atualizados} atualizados`);
      onImported();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stats = useMemo(() => {
    const turmas = new Set<string>();
    const cursos = new Set<string>();
    let comMatricula = 0;
    for (const r of rows) {
      if (r.turma) turmas.add(r.turma);
      if (r.curso) cursos.add(r.curso);
      if (r.matricula) comMatricula++;
    }
    return { turmas: turmas.size, cursos: cursos.size, comMatricula };
  }, [rows]);

  async function onFile(file: File) {
    try {
      const buf = await file.arrayBuffer();
      const parsed = parseSheet(buf);
      if (parsed.length === 0) {
        toast.error("Nenhum aluno válido encontrado. Verifique cabeçalhos (NOME_ALUNO, ID_MATRICULA, TURMA).");
        return;
      }
      setRows(parsed);
      setFileName(file.name);
      setResult(null);
    } catch {
      toast.error("Falha ao ler a planilha");
    }
  }

  function exportRelatorio() {
    if (!result) return;
    const linhas = [
      ["Métrica", "Valor"],
      ["Total processados", result.total],
      ["Importados", result.importados],
      ["Atualizados", result.atualizados],
      ["Ignorados", result.ignorados],
      ["Erros", result.erros],
      [],
      ["Linha", "Matrícula", "Nome", "Motivo"],
      ...result.erroDetalhes.map((e) => [e.linha, e.matricula ?? "", e.nome ?? "", e.motivo]),
    ];
    const csv = linhas.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url;
    a.download = `relatorio-importacao-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-3xl rounded-2xl border border-border bg-card p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-display text-xl font-bold flex items-center gap-2"><FileSpreadsheet className="size-5 text-primary" /> Importar planilha de alunos</h3>
            <p className="text-xs text-muted-foreground mt-1">Aceita XLSX, XLS e CSV. Colunas reconhecidas: <strong>ID_MATRICULA, NOME_ALUNO, TURMA, CURSO</strong>.</p>
          </div>
          <button onClick={onClose} className="size-8 grid place-items-center rounded-lg hover:bg-muted"><X className="size-4" /></button>
        </div>

        {!result && (
          <>
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-8 cursor-pointer hover:border-primary transition-colors">
              <Upload className="size-8 text-muted-foreground" />
              <span className="text-sm font-semibold">{fileName || "Clique para selecionar a planilha"}</span>
              <span className="text-xs text-muted-foreground">{fileName ? `${rows.length} alunos detectados` : "XLSX · XLS · CSV"}</span>
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
            </label>

            {rows.length > 0 && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Stat label="Alunos" value={rows.length} />
                  <Stat label="Com matrícula" value={stats.comMatricula} />
                  <Stat label="Turmas" value={stats.turmas} />
                  <Stat label="Cursos" value={stats.cursos} />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Ano letivo</label>
                  <input
                    type="number" min={2020} max={2100} value={anoLetivo}
                    onChange={(e) => setAnoLetivo(Number(e.target.value))}
                    className="mt-1 w-32 h-10 px-3 rounded-xl bg-muted/60 border border-border text-sm outline-none"
                  />
                </div>

                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="px-4 py-2 text-xs font-semibold bg-muted/40">Pré-visualização (primeiras 8 linhas)</div>
                  <table className="w-full text-xs">
                    <thead><tr className="border-t border-border text-left text-muted-foreground">
                      <th className="px-3 py-2">Matrícula</th><th className="px-3 py-2">Nome</th><th className="px-3 py-2">Turma</th><th className="px-3 py-2">Curso</th>
                    </tr></thead>
                    <tbody>
                      {rows.slice(0, 8).map((r, i) => (
                        <tr key={i} className="border-t border-border/60">
                          <td className="px-3 py-2 font-mono">{r.matricula ?? "—"}</td>
                          <td className="px-3 py-2">{r.nome}</td>
                          <td className="px-3 py-2">{r.turma ?? "—"}</td>
                          <td className="px-3 py-2">{r.curso ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end gap-2">
                  <button onClick={onClose} className="h-10 px-4 rounded-xl bg-muted border border-border text-sm font-semibold">Cancelar</button>
                  <button
                    disabled={mImport.isPending}
                    onClick={() => {
                      if (!confirm(`Importar ${rows.length} alunos para ${anoLetivo}? Matrículas duplicadas serão atualizadas.`)) return;
                      mImport.mutate();
                    }}
                    className="h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-glow disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {mImport.isPending && <Loader2 className="size-4 animate-spin" />}
                    Confirmar importação
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {result && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-500"><CheckCircle2 className="size-5" /><span className="font-semibold">Importação concluída</span></div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Stat label="Processados" value={result.total} />
              <Stat label="Importados" value={result.importados} accent="emerald" />
              <Stat label="Atualizados" value={result.atualizados} accent="blue" />
              <Stat label="Ignorados" value={result.ignorados} accent="muted" />
              <Stat label="Erros" value={result.erros} accent="red" />
            </div>

            {result.erroDetalhes.length > 0 && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/5 overflow-hidden">
                <div className="px-4 py-2 text-xs font-semibold flex items-center gap-2 text-destructive">
                  <AlertCircle className="size-4" /> {result.erroDetalhes.length} erros
                </div>
                <div className="max-h-48 overflow-y-auto">
                  <table className="w-full text-xs">
                    <tbody>
                      {result.erroDetalhes.slice(0, 30).map((e, i) => (
                        <tr key={i} className="border-t border-destructive/20">
                          <td className="px-3 py-1.5 font-mono w-12">{e.linha}</td>
                          <td className="px-3 py-1.5">{e.nome}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">{e.motivo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button onClick={exportRelatorio} className="h-10 px-4 rounded-xl bg-muted border border-border text-sm font-semibold inline-flex items-center gap-2">
                <Download className="size-4" /> Exportar relatório
              </button>
              <button onClick={onClose} className="h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">Fechar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: "emerald" | "blue" | "red" | "muted" }) {
  const color = accent === "emerald" ? "text-emerald-500"
    : accent === "blue" ? "text-blue-500"
    : accent === "red" ? "text-destructive"
    : accent === "muted" ? "text-muted-foreground"
    : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-2xl font-display font-bold ${color}`}>{value}</div>
    </div>
  );
}
