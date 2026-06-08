import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/lib/auth";
import { listarAlunos, listarTurmas, criarAluno, atualizarAluno, excluirAluno } from "@/lib/alunos.functions";
import { useMemo, useState } from "react";
import { Search, Plus, Download, Pencil, Trash2, GraduationCap, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/alunos")({
  head: () => ({
    meta: [
      { title: "Alunos · EduLinguas AI" },
      { name: "description", content: "Cadastro, listagem e gestão de alunos por turma e escola." },
    ],
  }),
  component: AlunosPage,
});

type AlunoRow = {
  id: string;
  nome: string;
  matricula: string | null;
  turma: string;
  turma_id: string | null;
  media_geral: number | null;
  progresso_spaece: number | null;
};

type TurmaRow = { id: string; nome: string; serie: string | null; ano_letivo: number };

function AlunosPage() {
  const { user, loading } = useAuth();
  const escolaId = user?.escolaAtiva?.id ?? null;

  const _listarAlunos = useServerFn(listarAlunos);
  const _listarTurmas = useServerFn(listarTurmas);
  const _criar = useServerFn(criarAluno);
  const _atualizar = useServerFn(atualizarAluno);
  const _excluir = useServerFn(excluirAluno);

  const qc = useQueryClient();
  const alunosQ = useQuery({
    queryKey: ["alunos", escolaId],
    queryFn: () => _listarAlunos({ data: { escolaId: escolaId! } }),
    enabled: !!escolaId,
  });
  const turmasQ = useQuery({
    queryKey: ["turmas", escolaId],
    queryFn: () => _listarTurmas({ data: { escolaId: escolaId! } }),
    enabled: !!escolaId,
  });

  const alunos: AlunoRow[] = (alunosQ.data?.alunos ?? []) as AlunoRow[];
  const turmas: TurmaRow[] = (turmasQ.data?.turmas ?? []) as TurmaRow[];

  const [q, setQ] = useState("");
  const [turmaFiltro, setTurmaFiltro] = useState("");
  const [open, setOpen] = useState<null | { mode: "criar" } | { mode: "editar"; aluno: AlunoRow }>(null);

  const filtrados = useMemo(
    () =>
      alunos.filter(
        (a) =>
          (!turmaFiltro || a.turma_id === turmaFiltro) &&
          (q === "" ||
            a.nome.toLowerCase().includes(q.toLowerCase()) ||
            (a.matricula ?? "").toLowerCase().includes(q.toLowerCase())),
      ),
    [alunos, q, turmaFiltro],
  );

  const invalidate = () => qc.invalidateQueries({ queryKey: ["alunos", escolaId] });

  const mCriar = useMutation({
    mutationFn: (input: { nome: string; matricula: string | null; turmaId: string | null }) =>
      _criar({ data: { escolaId: escolaId!, ...input } }),
    onSuccess: () => {
      toast.success("Aluno cadastrado");
      invalidate();
      setOpen(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mAtualizar = useMutation({
    mutationFn: (input: { id: string; nome: string; matricula: string | null; turmaId: string | null }) =>
      _atualizar({ data: { escolaId: escolaId!, ...input } }),
    onSuccess: () => {
      toast.success("Aluno atualizado");
      invalidate();
      setOpen(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mExcluir = useMutation({
    mutationFn: (id: string) => _excluir({ data: { escolaId: escolaId!, id } }),
    onSuccess: () => {
      toast.success("Aluno removido");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading) {
    return (
      <AppShell>
        <div className="grid place-items-center h-64 text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
      </AppShell>
    );
  }

  if (!escolaId) {
    return (
      <AppShell>
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <GraduationCap className="size-8 mx-auto text-muted-foreground" />
          <h2 className="font-display font-bold mt-3">Nenhuma escola ativa</h2>
          <p className="text-sm text-muted-foreground mt-1">Acesse Configurações para criar ou selecionar uma escola.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Alunos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {alunos.length} alunos cadastrados · {turmas.length} turmas
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportarCsv(filtrados)}
            className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-muted border border-border text-sm font-semibold hover:bg-muted/70"
          >
            <Download className="size-4" /> Exportar CSV
          </button>
          <button
            onClick={() => setOpen({ mode: "criar" })}
            className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-glow hover:opacity-95"
          >
            <Plus className="size-4" /> Novo aluno
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border flex flex-wrap gap-3">
          <div className="flex items-center gap-2 px-3 h-10 rounded-xl bg-muted/60 border border-border min-w-64 flex-1">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome ou matrícula..."
              className="bg-transparent flex-1 text-sm outline-none"
            />
          </div>
          <select
            value={turmaFiltro}
            onChange={(e) => setTurmaFiltro(e.target.value)}
            className="h-10 px-3 rounded-xl bg-muted/60 border border-border text-sm outline-none"
          >
            <option value="">Todas as turmas</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>{t.nome}{t.serie ? ` · ${t.serie}` : ""}</option>
            ))}
          </select>
        </div>

        {alunosQ.isLoading ? (
          <div className="grid place-items-center h-40 text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
        ) : filtrados.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {alunos.length === 0
              ? "Nenhum aluno cadastrado. Clique em \"Novo aluno\" para começar."
              : "Nenhum aluno encontrado com esses filtros."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="px-5 py-3 font-medium">Aluno</th>
                  <th className="px-3 py-3 font-medium">Matrícula</th>
                  <th className="px-3 py-3 font-medium">Turma</th>
                  <th className="px-3 py-3 font-medium text-right">Média geral</th>
                  <th className="px-3 py-3 font-medium text-right">SPAECE</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((a) => (
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
                        <button
                          onClick={() => setOpen({ mode: "editar", aluno: a })}
                          className="size-8 grid place-items-center rounded-lg hover:bg-muted"
                          title="Editar"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Remover ${a.nome}?`)) mExcluir.mutate(a.id);
                          }}
                          className="size-8 grid place-items-center rounded-lg hover:bg-destructive/10 text-destructive"
                          title="Remover"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && (
        <AlunoForm
          turmas={turmas}
          initial={open.mode === "editar" ? open.aluno : undefined}
          saving={mCriar.isPending || mAtualizar.isPending}
          onCancel={() => setOpen(null)}
          onSubmit={(v) => {
            if (open.mode === "editar") {
              mAtualizar.mutate({ id: open.aluno.id, ...v });
            } else {
              mCriar.mutate(v);
            }
          }}
        />
      )}
    </AppShell>
  );
}

function AlunoForm({
  turmas,
  initial,
  saving,
  onCancel,
  onSubmit,
}: {
  turmas: TurmaRow[];
  initial?: AlunoRow;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (v: { nome: string; matricula: string | null; turmaId: string | null }) => void;
}) {
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [matricula, setMatricula] = useState(initial?.matricula ?? "");
  const [turmaId, setTurmaId] = useState(initial?.turma_id ?? "");

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm p-4" onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl border border-border bg-card p-6 space-y-4">
        <div>
          <h3 className="font-display text-xl font-bold">{initial ? "Editar aluno" : "Novo aluno"}</h3>
          <p className="text-xs text-muted-foreground mt-1">Os dados ficam restritos à escola ativa.</p>
        </div>

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (nome.trim().length < 2) {
              toast.error("Nome muito curto");
              return;
            }
            onSubmit({
              nome: nome.trim(),
              matricula: matricula.trim() || null,
              turmaId: turmaId || null,
            });
          }}
        >
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Nome completo</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              maxLength={160}
              className="mt-1 w-full h-10 px-3 rounded-xl bg-muted/60 border border-border text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Matrícula</label>
            <input
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
              maxLength={40}
              className="mt-1 w-full h-10 px-3 rounded-xl bg-muted/60 border border-border text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Turma</label>
            <select
              value={turmaId}
              onChange={(e) => setTurmaId(e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-xl bg-muted/60 border border-border text-sm outline-none focus:border-primary"
            >
              <option value="">Sem turma</option>
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}{t.serie ? ` · ${t.serie}` : ""} ({t.ano_letivo})</option>
              ))}
            </select>
            {turmas.length === 0 && (
              <p className="text-[11px] text-muted-foreground mt-1">Nenhuma turma cadastrada ainda.</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onCancel} className="h-10 px-4 rounded-xl bg-muted border border-border text-sm font-semibold">Cancelar</button>
            <button
              type="submit"
              disabled={saving}
              className="h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-glow disabled:opacity-50 inline-flex items-center gap-2"
            >
              {saving && <Loader2 className="size-4 animate-spin" />} Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function exportarCsv(rows: AlunoRow[]) {
  const header = ["matricula", "nome", "turma", "media_geral", "progresso_spaece"];
  const csv = [
    header.join(","),
    ...rows.map((s) =>
      [s.matricula ?? "", `"${s.nome.replace(/"/g, '""')}"`, s.turma, Number(s.media_geral ?? 0).toFixed(2), Number(s.progresso_spaece ?? 0).toFixed(2)].join(","),
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `alunos-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`${rows.length} alunos exportados`);
}
