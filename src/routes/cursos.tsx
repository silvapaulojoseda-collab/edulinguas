import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/lib/auth";
import { listarCursos, criarCurso, atualizarCurso, excluirCurso } from "@/lib/cursos.functions";
import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Loader2, BookOpen, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/cursos")({
  head: () => ({
    meta: [
      { title: "Cursos · EduLinguas AI" },
      { name: "description", content: "Cadastro de cursos técnicos e regulares da escola." },
    ],
  }),
  component: CursosPage,
});

type CursoRow = { id: string; nome: string; descricao: string | null; ativo: boolean; created_at: string };

function CursosPage() {
  const { user, loading } = useAuth();
  const escolaId = user?.escolaAtiva?.id ?? null;
  const qc = useQueryClient();
  const _listar = useServerFn(listarCursos);
  const _criar = useServerFn(criarCurso);
  const _atualizar = useServerFn(atualizarCurso);
  const _excluir = useServerFn(excluirCurso);

  const cursosQ = useQuery({
    queryKey: ["cursos", escolaId],
    queryFn: () => _listar({ data: { escolaId: escolaId! } }),
    enabled: !!escolaId,
  });
  const cursos: CursoRow[] = (cursosQ.data?.cursos ?? []) as CursoRow[];

  const [q, setQ] = useState("");
  const [open, setOpen] = useState<null | { mode: "criar" } | { mode: "editar"; curso: CursoRow }>(null);

  const filtrados = useMemo(
    () => cursos.filter((c) => q === "" || c.nome.toLowerCase().includes(q.toLowerCase())),
    [cursos, q],
  );

  const invalidate = () => qc.invalidateQueries({ queryKey: ["cursos", escolaId] });

  const mCriar = useMutation({
    mutationFn: (i: { nome: string; descricao: string | null; ativo: boolean }) => _criar({ data: { escolaId: escolaId!, ...i } }),
    onSuccess: () => { toast.success("Curso criado"); invalidate(); setOpen(null); },
    onError: (e: Error) => toast.error(e.message),
  });
  const mAtualizar = useMutation({
    mutationFn: (i: { id: string; nome: string; descricao: string | null; ativo: boolean }) =>
      _atualizar({ data: { escolaId: escolaId!, ...i } }),
    onSuccess: () => { toast.success("Curso atualizado"); invalidate(); setOpen(null); },
    onError: (e: Error) => toast.error(e.message),
  });
  const mExcluir = useMutation({
    mutationFn: (id: string) => _excluir({ data: { escolaId: escolaId!, id } }),
    onSuccess: () => { toast.success("Curso removido"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading) return <AppShell><div className="grid place-items-center h-64"><Loader2 className="size-5 animate-spin" /></div></AppShell>;
  if (!escolaId) return <AppShell><Empty /></AppShell>;

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Cursos</h1>
          <p className="text-muted-foreground text-sm mt-1">{cursos.length} cursos cadastrados</p>
        </div>
        <button onClick={() => setOpen({ mode: "criar" })} className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-glow">
          <Plus className="size-4" /> Novo curso
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 h-10 rounded-xl bg-muted/60 border border-border flex-1">
            <Search className="size-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar curso..." className="bg-transparent flex-1 text-sm outline-none" />
          </div>
        </div>
        {cursosQ.isLoading ? <div className="h-40 grid place-items-center"><Loader2 className="size-5 animate-spin" /></div>
          : filtrados.length === 0 ? <div className="p-10 text-center text-sm text-muted-foreground">Nenhum curso cadastrado.</div>
          : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="px-5 py-3">Curso</th><th className="px-3 py-3">Descrição</th><th className="px-3 py-3">Status</th><th className="px-3 py-3"></th>
              </tr></thead>
              <tbody>
                {filtrados.map((c) => (
                  <tr key={c.id} className="border-b border-border/60 hover:bg-muted/40">
                    <td className="px-5 py-3 flex items-center gap-3">
                      <div className="size-9 rounded-xl bg-primary/10 text-primary grid place-items-center"><BookOpen className="size-4" /></div>
                      <span className="font-medium">{c.nome}</span>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{c.descricao ?? "—"}</td>
                    <td className="px-3 py-3">
                      <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${c.ativo ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"}`}>{c.ativo ? "Ativo" : "Inativo"}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => setOpen({ mode: "editar", curso: c })} className="size-8 grid place-items-center rounded-lg hover:bg-muted"><Pencil className="size-4" /></button>
                        <button onClick={() => confirm(`Remover curso "${c.nome}"?`) && mExcluir.mutate(c.id)} className="size-8 grid place-items-center rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 className="size-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {open && (
        <CursoForm
          initial={open.mode === "editar" ? open.curso : undefined}
          saving={mCriar.isPending || mAtualizar.isPending}
          onCancel={() => setOpen(null)}
          onSubmit={(v) => open.mode === "editar" ? mAtualizar.mutate({ id: open.curso.id, ...v }) : mCriar.mutate(v)}
        />
      )}
    </AppShell>
  );
}

function Empty() {
  return (
    <div className="rounded-2xl border border-dashed border-border p-10 text-center">
      <BookOpen className="size-8 mx-auto text-muted-foreground" />
      <h2 className="font-display font-bold mt-3">Nenhuma escola ativa</h2>
    </div>
  );
}

function CursoForm({ initial, saving, onCancel, onSubmit }: {
  initial?: CursoRow; saving: boolean; onCancel: () => void;
  onSubmit: (v: { nome: string; descricao: string | null; ativo: boolean }) => void;
}) {
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [descricao, setDescricao] = useState(initial?.descricao ?? "");
  const [ativo, setAtivo] = useState(initial?.ativo ?? true);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm p-4" onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl border border-border bg-card p-6 space-y-4">
        <h3 className="font-display text-xl font-bold">{initial ? "Editar curso" : "Novo curso"}</h3>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (nome.trim().length < 2) return toast.error("Nome muito curto"); onSubmit({ nome: nome.trim(), descricao: descricao.trim() || null, ativo }); }}>
          <Field label="Nome"><input value={nome} onChange={(e) => setNome(e.target.value)} required className="mt-1 w-full h-10 px-3 rounded-xl bg-muted/60 border border-border text-sm outline-none" /></Field>
          <Field label="Descrição"><textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} className="mt-1 w-full px-3 py-2 rounded-xl bg-muted/60 border border-border text-sm outline-none" /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} /> Curso ativo</label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onCancel} className="h-10 px-4 rounded-xl bg-muted border border-border text-sm font-semibold">Cancelar</button>
            <button type="submit" disabled={saving} className="h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-2">{saving && <Loader2 className="size-4 animate-spin" />} Salvar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-xs font-semibold text-muted-foreground">{label}</label>{children}</div>;
}
