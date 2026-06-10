import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/lib/auth";
import { listarAlunos, listarTurmas } from "@/lib/alunos.functions";
import { listarCursos } from "@/lib/cursos.functions";
import { useMemo } from "react";
import { Download, FileBarChart, Loader2, Users, GraduationCap, BookOpen } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios · EduLinguas AI" },
      { name: "description", content: "Relatórios consolidados de alunos, turmas e cursos. Exportação CSV/Excel." },
    ],
  }),
  component: Relatorios,
});

function Relatorios() {
  const { user, loading } = useAuth();
  const escolaId = user?.escolaAtiva?.id ?? null;

  const _alunos = useServerFn(listarAlunos);
  const _turmas = useServerFn(listarTurmas);
  const _cursos = useServerFn(listarCursos);

  const alunosQ = useQuery({ queryKey: ["alunos", escolaId], queryFn: () => _alunos({ data: { escolaId: escolaId! } }), enabled: !!escolaId });
  const turmasQ = useQuery({ queryKey: ["turmas", escolaId], queryFn: () => _turmas({ data: { escolaId: escolaId! } }), enabled: !!escolaId });
  const cursosQ = useQuery({ queryKey: ["cursos", escolaId], queryFn: () => _cursos({ data: { escolaId: escolaId! } }), enabled: !!escolaId });

  const alunos = (alunosQ.data?.alunos ?? []) as Array<{ id: string; turma: string; turma_id: string | null }>;
  const turmas = (turmasQ.data?.turmas ?? []) as Array<{ id: string; nome: string; curso: string | null; curso_id: string | null; ano_letivo: number }>;
  const cursos = (cursosQ.data?.cursos ?? []) as Array<{ id: string; nome: string }>;

  const grupos = useMemo(() => {
    const porTurma = new Map<string, number>();
    for (const a of alunos) if (a.turma_id) porTurma.set(a.turma_id, (porTurma.get(a.turma_id) ?? 0) + 1);

    const porCurso = new Map<string, number>();
    const turmasPorCurso = new Map<string, number>();
    const turmasPorAno = new Map<number, number>();
    for (const t of turmas) {
      const cid = t.curso_id ?? "_sem";
      turmasPorCurso.set(cid, (turmasPorCurso.get(cid) ?? 0) + 1);
      turmasPorAno.set(t.ano_letivo, (turmasPorAno.get(t.ano_letivo) ?? 0) + 1);
      const count = porTurma.get(t.id) ?? 0;
      porCurso.set(cid, (porCurso.get(cid) ?? 0) + count);
    }
    const porAno = new Map<number, number>();
    for (const t of turmas) porAno.set(t.ano_letivo, (porAno.get(t.ano_letivo) ?? 0) + (porTurma.get(t.id) ?? 0));

    return {
      alunosPorTurma: turmas.map((t) => ({ turma: t.nome, ano: t.ano_letivo, curso: t.curso ?? "—", total: porTurma.get(t.id) ?? 0 })).sort((a, b) => b.total - a.total),
      alunosPorCurso: Array.from(porCurso, ([cid, total]) => ({ curso: cursos.find((c) => c.id === cid)?.nome ?? "Sem curso", total })).sort((a, b) => b.total - a.total),
      alunosPorAno: Array.from(porAno, ([ano, total]) => ({ ano, total })).sort((a, b) => b.ano - a.ano),
      turmasPorCurso: Array.from(turmasPorCurso, ([cid, total]) => ({ curso: cursos.find((c) => c.id === cid)?.nome ?? "Sem curso", total })).sort((a, b) => b.total - a.total),
      turmasPorAno: Array.from(turmasPorAno, ([ano, total]) => ({ ano, total })).sort((a, b) => b.ano - a.ano),
    };
  }, [alunos, turmas, cursos]);

  if (loading) return <AppShell><div className="grid place-items-center h-64"><Loader2 className="size-5 animate-spin" /></div></AppShell>;
  if (!escolaId) return <AppShell><div className="rounded-2xl border border-dashed border-border p-10 text-center"><FileBarChart className="size-8 mx-auto text-muted-foreground" /><p className="font-semibold mt-3">Nenhuma escola ativa</p></div></AppShell>;

  const loadingData = alunosQ.isLoading || turmasQ.isLoading || cursosQ.isLoading;

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground text-sm mt-1">Visão consolidada da escola — alunos, turmas e cursos.</p>
      </div>

      {loadingData ? <div className="grid place-items-center h-40"><Loader2 className="size-5 animate-spin" /></div> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card title="Alunos por turma" icon={Users} rows={grupos.alunosPorTurma} cols={[{ k: "turma", l: "Turma" }, { k: "curso", l: "Curso" }, { k: "ano", l: "Ano" }, { k: "total", l: "Total", align: "right" }]} onExport={() => exportCsv("alunos-por-turma", grupos.alunosPorTurma)} />
          <Card title="Alunos por curso" icon={BookOpen} rows={grupos.alunosPorCurso} cols={[{ k: "curso", l: "Curso" }, { k: "total", l: "Total", align: "right" }]} onExport={() => exportCsv("alunos-por-curso", grupos.alunosPorCurso)} />
          <Card title="Alunos por ano letivo" icon={GraduationCap} rows={grupos.alunosPorAno} cols={[{ k: "ano", l: "Ano" }, { k: "total", l: "Total", align: "right" }]} onExport={() => exportCsv("alunos-por-ano", grupos.alunosPorAno)} />
          <Card title="Turmas por curso" icon={BookOpen} rows={grupos.turmasPorCurso} cols={[{ k: "curso", l: "Curso" }, { k: "total", l: "Turmas", align: "right" }]} onExport={() => exportCsv("turmas-por-curso", grupos.turmasPorCurso)} />
          <Card title="Turmas por ano" icon={GraduationCap} rows={grupos.turmasPorAno} cols={[{ k: "ano", l: "Ano" }, { k: "total", l: "Turmas", align: "right" }]} onExport={() => exportCsv("turmas-por-ano", grupos.turmasPorAno)} />
        </div>
      )}
    </AppShell>
  );
}

type Col<T> = { k: keyof T & string; l: string; align?: "right" };

function Card<T extends Record<string, string | number>>({ title, icon: Icon, rows, cols, onExport }: {
  title: string; icon: typeof Users; rows: T[]; cols: Col<T>[]; onExport: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <h3 className="font-display font-bold flex items-center gap-2"><Icon className="size-4 text-primary" /> {title}</h3>
        <button onClick={onExport} className="inline-flex items-center gap-1.5 text-xs px-3 h-8 rounded-lg bg-muted border border-border font-semibold"><Download className="size-3.5" /> CSV</button>
      </div>
      {rows.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">Sem dados</div> : (
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-muted-foreground border-b border-border sticky top-0 bg-card">{cols.map((c) => <th key={c.k} className={`px-4 py-2 font-medium ${c.align === "right" ? "text-right" : ""}`}>{c.l}</th>)}</tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-border/60">
                  {cols.map((c) => <td key={c.k} className={`px-4 py-2 ${c.align === "right" ? "text-right font-display font-bold" : ""}`}>{String(r[c.k])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function exportCsv(name: string, rows: Array<Record<string, string | number>>) {
  if (rows.length === 0) return toast.info("Sem dados");
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => `"${String(r[h]).replace(/"/g, '""')}"`).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url;
  a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  URL.revokeObjectURL(url); toast.success("Exportado");
}
