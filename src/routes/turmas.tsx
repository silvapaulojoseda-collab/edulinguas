import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/lib/auth";
import { listarTurmasCompleto, criarTurma, atualizarTurma, excluirTurma } from "@/lib/turmas.functions";
import { listarCursos } from "@/lib/cursos.functions";
import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Loader2, Users, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/turmas")({
  head: () => ({
    meta: [
      { title: "Turmas · EduLinguas AI" },
      { name: "description", content: "Gerencie turmas, cursos vinculados, ano letivo, turno e capacidade." },
    ],
  }),
  component: TurmasPage,
});

type TurmaRow = {
  id: string; nome: string; serie: string | null; curso: string | null; curso_id: string | null;
  curso_nome: string | null; turno: string | null; capacidade: number | null; ano_letivo: number;
  ativo: boolean; total_alunos: number;
};
type CursoOpt = { id: string; nome: string };

const TURNOS = [
  { v: "manha", label: "Manhã" }, { v: "tarde", label: "Tarde" },
  { v: "noite", label: "Noite" }, { v: "integral", label: "Integral" },
] as const;

function TurmasPage() {
  const { user, loading } = useAuth();
  const escolaId = user?.escolaAtiva?.id ?? null;
  const qc = useQueryClient();

  const _listar = useServerFn(listarTurmasCompleto);
  const _listarCursos = useServerFn(listarCursos);
  const _criar = useServerFn(criarTurma);
  const _atualizar = useServerFn(atualizarTurma);
  const _excluir = useServerFn(excluirTurma);

  const turmasQ = useQuery({ queryKey: ["turmas-full", escolaId], queryFn: () => _listar({ data: { escolaId: escolaId! } }), enabled: !!escolaId });
  const cursosQ = useQuery({ queryKey: ["cursos", escolaId], queryFn: () => _listarCursos({ data: { escolaId: escolaId! } }), enabled: !!escolaId });

  const turmas: TurmaRow[] = (turmasQ.data?.turmas ?? []) as TurmaRow[];
  const cursos: CursoOpt[] = (cursosQ.data?.cursos ?? []) as CursoOpt[];

  const [q, setQ] = useState("");
  const [cursoFiltro, setCursoFiltro] = useState("");
  const [anoFiltro, setAnoFiltro] = useState<string>("");
  const [open, setOpen] = useState<null | { mode: "criar" } | { mode: "editar"; turma: TurmaRow }>(null);

  const anos = useMemo(() => Array.from(new Set(turmas.map((t) => t.ano_letivo))).sort((a, b) => b - a), [turmas]);
  const filtrados = useMemo(() => turmas.filter((t) =>
    (q === "" || t.nome.toLowerCase().includes(q.toLowerCase()))
    && (!cursoFiltro || t.curso_id === cursoFiltro)
    && (!anoFiltro || String(t.ano_letivo) === anoFiltro)
  ), [turmas, q, cursoFiltro, anoFiltro]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["turmas-full", escolaId] });

  const mCriar = useMutation({
    mutationFn: (i: TurmaFormVals) => _criar({ data: { escolaId: escolaId!, ...i } }),
    onSuccess: () => { toast.success("Turma criada"); invalidate(); setOpen(null); },
    onError: (e: Error) => toast.error(e.message),
  });
  const mAtualizar = useMutation({
    mutationFn: (i: TurmaFormVals & { id: string }) => _atualizar({ data: { escolaId: escolaId!, ...i } }),
    onSuccess: () => { toast.success("Turma atualizada"); invalidate(); setOpen(null); },
    onError: (e: Error) => toast.error(e.message),
  });
  const mExcluir = useMutation({
    mutationFn: (id: string) => _excluir({ data: { escolaId: escolaId!, id } }),
    onSuccess: () => { toast.success("Turma removida"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading) return <AppShell><div className="grid place-items-center h-64"><Loader2 className="size-5 animate-spin" /></div></AppShell>;
  if (!escolaId) return <AppShell><div className="rounded-2xl border border-dashed border-border p-10 text-center"><Users className="size-8 mx-auto text-muted-foreground" /><p className="font-semibold mt-3">Nenhuma escola ativa</p></div></AppShell>;

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Turmas</h1>
          <p className="text-muted-foreground text-sm mt-1">{turmas.length} turmas · {anos.length} anos letivos</p>
        </div>
        <button onClick={() => setOpen({ mode: "criar" })} className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-glow">
          <Plus className="size-4" /> Nova turma
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border flex flex-wrap gap-3">
          <div className="flex items-center gap-2 px-3 h-10 rounded-xl bg-muted/60 border border-border min-w-64 flex-1">
            <Search className="size-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar turma..." className="bg-transparent flex-1 text-sm outline-none" />
          </div>
          <select value={cursoFiltro} onChange={(e) => setCursoFiltro(e.target.value)} className="h-10 px-3 rounded-xl bg-muted/60 border border-border text-sm outline-none">
            <option value="">Todos os cursos</option>
            {cursos.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <select value={anoFiltro} onChange={(e) => setAnoFiltro(e.target.value)} className="h-10 px-3 rounded-xl bg-muted/60 border border-border text-sm outline-none">
            <option value="">Todos os anos</option>
            {anos.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {turmasQ.isLoading ? <div className="h-40 grid place-items-center"><Loader2 className="size-5 animate-spin" /></div>
          : filtrados.length === 0 ? <div className="p-10 text-center text-sm text-muted-foreground">Nenhuma turma encontrada.</div>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="px-5 py-3">Turma</th><th className="px-3 py-3">Curso</th><th className="px-3 py-3">Série</th>
                  <th className="px-3 py-3">Turno</th><th className="px-3 py-3 text-right">Alunos</th>
                  <th className="px-3 py-3">Ano</th><th className="px-3 py-3">Status</th><th className="px-3 py-3"></th>
                </tr></thead>
                <tbody>
                  {filtrados.map((t) => (
                    <tr key={t.id} className="border-b border-border/60 hover:bg-muted/40">
                      <td className="px-5 py-3 font-medium">{t.nome}</td>
                      <td className="px-3 py-3 text-muted-foreground">{t.curso_nome ?? "—"}</td>
                      <td className="px-3 py-3">{t.serie ?? "—"}</td>
                      <td className="px-3 py-3 capitalize">{t.turno ?? "—"}</td>
                      <td className="px-3 py-3 text-right font-display font-bold">{t.total_alunos}{t.capacidade ? <span className="text-muted-foreground font-normal text-xs"> / {t.capacidade}</span> : null}</td>
                      <td className="px-3 py-3">{t.ano_letivo}</td>
                      <td className="px-3 py-3"><span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${t.ativo ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"}`}>{t.ativo ? "Ativa" : "Inativa"}</span></td>
                      <td className="px-3 py-3">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => setOpen({ mode: "editar", turma: t })} className="size-8 grid place-items-center rounded-lg hover:bg-muted"><Pencil className="size-4" /></button>
                          <button onClick={() => confirm(`Remover turma "${t.nome}"?`) && mExcluir.mutate(t.id)} className="size-8 grid place-items-center rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 className="size-4" /></button>
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
        <TurmaForm
          cursos={cursos}
          initial={open.mode === "editar" ? open.turma : undefined}
          saving={mCriar.isPending || mAtualizar.isPending}
          onCancel={() => setOpen(null)}
          onSubmit={(v) => open.mode === "editar" ? mAtualizar.mutate({ id: open.turma.id, ...v }) : mCriar.mutate(v)}
        />
      )}
    </AppShell>
  );
}

type TurmaFormVals = {
  nome: string; serie: string | null; cursoId: string | null;
  turno: "manha" | "tarde" | "noite" | "integral" | null;
  capacidade: number | null; anoLetivo: number; ativo: boolean;
};

function TurmaForm({ cursos, initial, saving, onCancel, onSubmit }: {
  cursos: CursoOpt[]; initial?: TurmaRow; saving: boolean;
  onCancel: () => void; onSubmit: (v: TurmaFormVals) => void;
}) {
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [serie, setSerie] = useState(initial?.serie ?? "");
  const [cursoId, setCursoId] = useState(initial?.curso_id ?? "");
  const [turno, setTurno] = useState<string>(initial?.turno ?? "");
  const [capacidade, setCapacidade] = useState<string>(initial?.capacidade?.toString() ?? "");
  const [anoLetivo, setAnoLetivo] = useState<number>(initial?.ano_letivo ?? new Date().getFullYear());
  const [ativo, setAtivo] = useState(initial?.ativo ?? true);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm p-4" onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <h3 className="font-display text-xl font-bold">{initial ? "Editar turma" : "Nova turma"}</h3>
        <form className="space-y-3" onSubmit={(e) => {
          e.preventDefault();
          if (nome.trim().length < 1) return toast.error("Nome obrigatório");
          onSubmit({
            nome: nome.trim(),
            serie: serie.trim() || null,
            cursoId: cursoId || null,
            turno: (turno || null) as TurmaFormVals["turno"],
            capacidade: capacidade ? Number(capacidade) : null,
            anoLetivo, ativo,
          });
        }}>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Nome</label>
              <input value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={80} className="mt-1 w-full h-10 px-3 rounded-xl bg-muted/60 border border-border text-sm outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Série</label>
              <input value={serie} onChange={(e) => setSerie(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-xl bg-muted/60 border border-border text-sm outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Ano letivo</label>
              <input type="number" min={2020} max={2100} value={anoLetivo} onChange={(e) => setAnoLetivo(Number(e.target.value))} className="mt-1 w-full h-10 px-3 rounded-xl bg-muted/60 border border-border text-sm outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Curso</label>
              <select value={cursoId} onChange={(e) => setCursoId(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-xl bg-muted/60 border border-border text-sm outline-none">
                <option value="">Sem curso</option>
                {cursos.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Turno</label>
              <select value={turno} onChange={(e) => setTurno(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-xl bg-muted/60 border border-border text-sm outline-none">
                <option value="">—</option>
                {TURNOS.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Capacidade</label>
              <input type="number" min={0} max={500} value={capacidade} onChange={(e) => setCapacidade(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-xl bg-muted/60 border border-border text-sm outline-none" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} /> Turma ativa</label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onCancel} className="h-10 px-4 rounded-xl bg-muted border border-border text-sm font-semibold">Cancelar</button>
            <button type="submit" disabled={saving} className="h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-2">{saving && <Loader2 className="size-4 animate-spin" />} Salvar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
