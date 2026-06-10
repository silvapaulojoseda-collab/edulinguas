import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/lib/auth";
import { listarAlunos, listarTurmas, criarAluno, atualizarAluno, excluirAluno } from "@/lib/alunos.functions";
import { ImportarAlunosDialog } from "@/components/ImportarAlunosDialog";
import { useMemo, useState } from "react";
import { Search, Plus, Download, Pencil, Trash2, GraduationCap, Loader2, Upload, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/alunos")({
  head: () => ({
    meta: [
      { title: "Alunos · EduLinguas AI" },
      { name: "description", content: "Cadastro, importação e gestão de alunos por turma, curso e escola." },
    ],
  }),
  component: AlunosPage,
});

type AlunoRow = {
  id: string; nome: string; matricula: string | null; turma: string;
  turma_id: string | null; media_geral: number | null; progresso_spaece: number | null;
};
type TurmaRow = { id: string; nome: string; serie: string | null; curso: string | null; curso_id: string | null; ano_letivo: number };

const PAGE_SIZE = 25;

function AlunosPage() {
  const { user, loading } = useAuth();
  const escolaId = user?.escolaAtiva?.id ?? null;

  const _listarAlunos = useServerFn(listarAlunos);
  const _listarTurmas = useServerFn(listarTurmas);
  const _criar = useServerFn(criarAluno);
  const _atualizar = useServerFn(atualizarAluno);
  const _excluir = useServerFn(excluirAluno);

  const qc = useQueryClient();
  const alunosQ = useQuery({ queryKey: ["alunos", escolaId], queryFn: () => _listarAlunos({ data: { escolaId: escolaId! } }), enabled: !!escolaId });
  const turmasQ = useQuery({ queryKey: ["turmas", escolaId], queryFn: () => _listarTurmas({ data: { escolaId: escolaId! } }), enabled: !!escolaId });

  const alunos: AlunoRow[] = (alunosQ.data?.alunos ?? []) as AlunoRow[];
  const turmas: TurmaRow[] = (turmasQ.data?.turmas ?? []) as TurmaRow[];

  const cursos = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of turmas) if (t.curso_id && t.curso) m.set(t.curso_id, t.curso);
    return Array.from(m, ([id, nome]) => ({ id, nome }));
  }, [turmas]);

  const [q, setQ] = useState("");
  const [turmaFiltro, setTurmaFiltro] = useState("");
  const [cursoFiltro, setCursoFiltro] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: "nome" | "matricula" | "turma" | "media_geral"; dir: "asc" | "desc" }>({ key: "nome", dir: "asc" });
  const [open, setOpen] = useState<null | { mode: "criar" } | { mode: "editar"; aluno: AlunoRow } | { mode: "view"; aluno: AlunoRow }>(null);
  const [importOpen, setImportOpen] = useState(false);

  const filtrados = useMemo(() => {
    const turmaIdsCurso = cursoFiltro ? new Set(turmas.filter((t) => t.curso_id === cursoFiltro).map((t) => t.id)) : null;
    const arr = alunos.filter((a) =>
      (!turmaFiltro || a.turma_id === turmaFiltro)
      && (!turmaIdsCurso || (a.turma_id && turmaIdsCurso.has(a.turma_id)))
      && (q === "" || a.nome.toLowerCase().includes(q.toLowerCase()) || (a.matricula ?? "").toLowerCase().includes(q.toLowerCase()))
    );
    arr.sort((a, b) => {
      const va = a[sort.key] ?? ""; const vb = b[sort.key] ?? "";
      const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "pt-BR");
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [alunos, q, turmaFiltro, cursoFiltro, turmas, sort]);

  const totalPages = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const slice = filtrados.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["alunos", escolaId] });
  const mCriar = useMutation({
    mutationFn: (input: { nome: string; matricula: string | null; turmaId: string | null }) => _criar({ data: { escolaId: escolaId!, ...input } }),
    onSuccess: () => { toast.success("Aluno cadastrado"); invalidate(); setOpen(null); },
    onError: (e: Error) => toast.error(e.message),
  });
  const mAtualizar = useMutation({
    mutationFn: (input: { id: string; nome: string; matricula: string | null; turmaId: string | null }) => _atualizar({ data: { escolaId: escolaId!, ...input } }),
    onSuccess: () => { toast.success("Aluno atualizado"); invalidate(); setOpen(null); },
    onError: (e: Error) => toast.error(e.message),
  });
  const mExcluir = useMutation({
    mutationFn: (id: string) => _excluir({ data: { escolaId: escolaId!, id } }),
    onSuccess: () => { toast.success("Aluno removido"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading) return <AppShell><div className="grid place-items-center h-64 text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div></AppShell>;
  if (!escolaId) return (
    <AppShell>
      <div className="rounded-2xl border border-dashed border-border p-10 text-center">
        <GraduationCap className="size-8 mx-auto text-muted-foreground" />
        <h2 className="font-display font-bold mt-3">Nenhuma escola ativa</h2>
        <p className="text-sm text-muted-foreground mt-1">Acesse Configurações para criar ou selecionar uma escola.</p>
      </div>
    </AppShell>
  );

  function toggleSort(key: typeof sort.key) {
    setSort((s) => s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" });
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Alunos</h1>
          <p className="text-muted-foreground text-sm mt-1">{alunos.length} alunos · {turmas.length} turmas · {cursos.length} cursos</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setImportOpen(true)} className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-ai/10 text-ai border border-ai/30 text-sm font-semibold hover:bg-ai/20">
            <Upload className="size-4" /> Importar planilha
          </button>
          <button onClick={() => exportarCsv(filtrados)} className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-muted border border-border text-sm font-semibold hover:bg-muted/70">
            <Download className="size-4" /> Exportar CSV
          </button>
          <button onClick={() => setOpen({ mode: "criar" })} className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-glow">
            <Plus className="size-4" /> Novo aluno
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border flex flex-wrap gap-3">
          <div className="flex items-center gap-2 px-3 h-10 rounded-xl bg-muted/60 border border-border min-w-64 flex-1">
            <Search className="size-4 text-muted-foreground" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Buscar por nome ou matrícula..." className="bg-transparent flex-1 text-sm outline-none" />
          </div>
          <select value={cursoFiltro} onChange={(e) => { setCursoFiltro(e.target.value); setPage(1); }} className="h-10 px-3 rounded-xl bg-muted/60 border border-border text-sm outline-none">
            <option value="">Todos os cursos</option>
            {cursos.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <select value={turmaFiltro} onChange={(e) => { setTurmaFiltro(e.target.value); setPage(1); }} className="h-10 px-3 rounded-xl bg-muted/60 border border-border text-sm outline-none">
            <option value="">Todas as turmas</option>
            {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}{t.serie ? ` · ${t.serie}` : ""}</option>)}
          </select>
        </div>

        {alunosQ.isLoading ? <div className="grid place-items-center h-40 text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
          : slice.length === 0 ? <div className="p-10 text-center text-sm text-muted-foreground">{alunos.length === 0 ? "Nenhum aluno cadastrado. Use \"Importar planilha\" ou \"Novo aluno\"." : "Nenhum aluno encontrado com esses filtros."}</div>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <Th label="Aluno" onClick={() => toggleSort("nome")} active={sort.key === "nome"} dir={sort.dir} className="px-5" />
                  <Th label="Matrícula" onClick={() => toggleSort("matricula")} active={sort.key === "matricula"} dir={sort.dir} />
                  <Th label="Turma" onClick={() => toggleSort("turma")} active={sort.key === "turma"} dir={sort.dir} />
                  <Th label="Média" onClick={() => toggleSort("media_geral")} active={sort.key === "media_geral"} dir={sort.dir} align="right" />
                  <th className="px-3 py-3 font-medium text-right">SPAECE</th>
                  <th className="px-3 py-3"></th>
                </tr></thead>
                <tbody>
                  {slice.map((a) => (
                    <tr key={a.id} className="border-b border-border/60 hover:bg-muted/40 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-full bg-gradient-to-br from-primary to-ai grid place-items-center text-[10px] font-bold text-primary-foreground shrink-0">
                            {a.nome.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                          </div>
                          <span className="font-medium">{a.nome}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{a.matricula ?? "—"}</td>
                      <td className="px-3 py-3 text-xs"><span className="px-2 py-1 rounded-md bg-muted">{a.turma}</span></td>
                      <td className="px-3 py-3 text-right font-display font-bold">{Number(a.media_geral ?? 0).toFixed(1)}</td>
                      <td className="px-3 py-3 text-right text-muted-foreground">{Number(a.progresso_spaece ?? 0).toFixed(0)}%</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => setOpen({ mode: "view", aluno: a })} className="size-8 grid place-items-center rounded-lg hover:bg-muted" title="Ver"><Eye className="size-4" /></button>
                          <button onClick={() => setOpen({ mode: "editar", aluno: a })} className="size-8 grid place-items-center rounded-lg hover:bg-muted" title="Editar"><Pencil className="size-4" /></button>
                          <button onClick={() => confirm(`Remover ${a.nome}?`) && mExcluir.mutate(a.id)} className="size-8 grid place-items-center rounded-lg hover:bg-destructive/10 text-destructive" title="Remover"><Trash2 className="size-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        {filtrados.length > PAGE_SIZE && (
          <div className="flex items-center justify-between p-4 border-t border-border text-sm">
            <span className="text-muted-foreground">Página {pageSafe} de {totalPages} · {filtrados.length} registros</span>
            <div className="flex gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={pageSafe === 1} className="size-9 grid place-items-center rounded-lg hover:bg-muted disabled:opacity-30"><ChevronLeft className="size-4" /></button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={pageSafe === totalPages} className="size-9 grid place-items-center rounded-lg hover:bg-muted disabled:opacity-30"><ChevronRight className="size-4" /></button>
            </div>
          </div>
        )}
      </div>

      {open?.mode === "view" && <AlunoView aluno={open.aluno} onClose={() => setOpen(null)} />}
      {open && (open.mode === "criar" || open.mode === "editar") && (
        <AlunoForm
          turmas={turmas}
          initial={open.mode === "editar" ? open.aluno : undefined}
          saving={mCriar.isPending || mAtualizar.isPending}
          onCancel={() => setOpen(null)}
          onSubmit={(v) => open.mode === "editar" ? mAtualizar.mutate({ id: open.aluno.id, ...v }) : mCriar.mutate(v)}
        />
      )}
      {importOpen && <ImportarAlunosDialog escolaId={escolaId} onClose={() => setImportOpen(false)} onImported={() => { invalidate(); qc.invalidateQueries({ queryKey: ["turmas", escolaId] }); }} />}
    </AppShell>
  );
}

function Th({ label, onClick, active, dir, align, className }: { label: string; onClick: () => void; active: boolean; dir: "asc" | "desc"; align?: "right"; className?: string }) {
  return (
    <th className={`py-3 font-medium ${align === "right" ? "text-right" : ""} ${className ?? "px-3"}`}>
      <button onClick={onClick} className={`inline-flex items-center gap-1 ${active ? "text-foreground" : ""}`}>
        {label}{active && <span className="text-[10px]">{dir === "asc" ? "▲" : "▼"}</span>}
      </button>
    </th>
  );
}

function AlunoView({ aluno, onClose }: { aluno: AlunoRow; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-full bg-gradient-to-br from-primary to-ai grid place-items-center text-sm font-bold text-primary-foreground">
            {aluno.nome.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
          </div>
          <div><h3 className="font-display text-lg font-bold">{aluno.nome}</h3><p className="text-xs text-muted-foreground">{aluno.turma}</p></div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Info label="Matrícula" value={aluno.matricula ?? "—"} />
          <Info label="Turma" value={aluno.turma} />
          <Info label="Média geral" value={Number(aluno.media_geral ?? 0).toFixed(1)} />
          <Info label="SPAECE" value={`${Number(aluno.progresso_spaece ?? 0).toFixed(0)}%`} />
        </div>
        <button onClick={onClose} className="w-full h-10 rounded-xl bg-muted text-sm font-semibold">Fechar</button>
      </div>
    </div>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-muted/40 p-3"><div className="text-[11px] uppercase text-muted-foreground">{label}</div><div className="font-display font-bold">{value}</div></div>;
}

function AlunoForm({ turmas, initial, saving, onCancel, onSubmit }: {
  turmas: TurmaRow[]; initial?: AlunoRow; saving: boolean; onCancel: () => void;
  onSubmit: (v: { nome: string; matricula: string | null; turmaId: string | null }) => void;
}) {
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [matricula, setMatricula] = useState(initial?.matricula ?? "");
  const [turmaId, setTurmaId] = useState(initial?.turma_id ?? "");
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm p-4" onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl border border-border bg-card p-6 space-y-4">
        <div><h3 className="font-display text-xl font-bold">{initial ? "Editar aluno" : "Novo aluno"}</h3><p className="text-xs text-muted-foreground mt-1">Restrito à escola ativa.</p></div>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (nome.trim().length < 2) return toast.error("Nome muito curto"); onSubmit({ nome: nome.trim(), matricula: matricula.trim() || null, turmaId: turmaId || null }); }}>
          <div><label className="text-xs font-semibold text-muted-foreground">Nome completo</label><input value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={160} className="mt-1 w-full h-10 px-3 rounded-xl bg-muted/60 border border-border text-sm outline-none focus:border-primary" /></div>
          <div><label className="text-xs font-semibold text-muted-foreground">Matrícula</label><input value={matricula} onChange={(e) => setMatricula(e.target.value)} maxLength={40} className="mt-1 w-full h-10 px-3 rounded-xl bg-muted/60 border border-border text-sm outline-none focus:border-primary" /></div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Turma</label>
            <select value={turmaId} onChange={(e) => setTurmaId(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-xl bg-muted/60 border border-border text-sm outline-none focus:border-primary">
              <option value="">Sem turma</option>
              {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}{t.serie ? ` · ${t.serie}` : ""} ({t.ano_letivo})</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onCancel} className="h-10 px-4 rounded-xl bg-muted border border-border text-sm font-semibold">Cancelar</button>
            <button type="submit" disabled={saving} className="h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-glow disabled:opacity-50 inline-flex items-center gap-2">{saving && <Loader2 className="size-4 animate-spin" />} Salvar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function exportarCsv(rows: AlunoRow[]) {
  const header = ["matricula", "nome", "turma", "media_geral", "progresso_spaece"];
  const csv = [header.join(","), ...rows.map((s) => [s.matricula ?? "", `"${s.nome.replace(/"/g, '""')}"`, s.turma, Number(s.media_geral ?? 0).toFixed(2), Number(s.progresso_spaece ?? 0).toFixed(2)].join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url;
  a.download = `alunos-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  URL.revokeObjectURL(url); toast.success(`${rows.length} alunos exportados`);
}
