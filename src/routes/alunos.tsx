import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { STUDENTS, TURMAS } from "@/lib/seed";
import { useMemo, useState } from "react";
import { Search, QrCode, Download, Filter, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/alunos")({
  head: () => ({
    meta: [
      { title: "Alunos · EduLinguas AI" },
      { name: "description", content: "Gestão de alunos com QR Code automático, situação escolar e desempenho por disciplina." },
    ],
  }),
  component: Alunos,
});

function Alunos() {
  const [q, setQ] = useState("");
  const [turma, setTurma] = useState<string>("");

  const filtered = useMemo(() => {
    return STUDENTS.filter(
      (s) =>
        (!turma || s.turma === turma) &&
        (q === "" || s.nome.toLowerCase().includes(q.toLowerCase()) || String(s.matricula).includes(q))
    );
  }, [q, turma]);

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Alunos</h1>
          <p className="text-muted-foreground text-sm mt-1">{STUDENTS.length} alunos cadastrados · {TURMAS.length} turmas</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-glow">
          <Download className="size-4" /> Exportar
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border flex flex-wrap gap-3">
          <div className="flex items-center gap-2 px-3 h-10 rounded-xl bg-muted/60 border border-border min-w-64 flex-1">
            <Search className="size-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome ou matrícula..." className="bg-transparent flex-1 text-sm outline-none" />
          </div>
          <select value={turma} onChange={(e) => setTurma(e.target.value)} className="h-10 px-3 rounded-xl bg-muted/60 border border-border text-sm outline-none">
            <option value="">Todas as turmas</option>
            {TURMAS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <button className="inline-flex items-center gap-2 px-3 h-10 rounded-xl bg-muted/60 border border-border text-sm">
            <Filter className="size-4" /> Filtros
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="px-5 py-3 font-medium">Aluno</th>
                <th className="px-3 py-3 font-medium">Matrícula</th>
                <th className="px-3 py-3 font-medium">Turma</th>
                <th className="px-3 py-3 font-medium">Português</th>
                <th className="px-3 py-3 font-medium">Inglês</th>
                <th className="px-3 py-3 font-medium">Espanhol</th>
                <th className="px-3 py-3 font-medium text-right">Média</th>
                <th className="px-3 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 50).map((s) => (
                <tr key={s.id} className="border-b border-border/60 hover:bg-muted/40 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-full bg-gradient-to-br from-primary to-ai grid place-items-center text-[10px] font-bold text-primary-foreground shrink-0">
                        {s.nome.split(" ").map(p => p[0]).slice(0, 2).join("")}
                      </div>
                      <span className="font-medium">{s.nome}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{s.matricula}</td>
                  <td className="px-3 py-3 text-xs"><span className="px-2 py-1 rounded-md bg-muted">{s.turma}</span></td>
                  <td className="px-3 py-3"><ScorePill v={s.portugues} /></td>
                  <td className="px-3 py-3"><ScorePill v={s.ingles} /></td>
                  <td className="px-3 py-3"><ScorePill v={s.espanhol} /></td>
                  <td className="px-3 py-3 text-right font-display font-bold">{s.nota.toFixed(1)}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button className="size-8 grid place-items-center rounded-lg hover:bg-muted" title="QR Code">
                        <QrCode className="size-4" />
                      </button>
                      <button className="size-8 grid place-items-center rounded-lg hover:bg-muted">
                        <ChevronRight className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 50 && (
          <div className="p-3 text-center text-xs text-muted-foreground border-t border-border">
            Mostrando 50 de {filtered.length} alunos
          </div>
        )}
      </div>
    </AppShell>
  );
}

function ScorePill({ v }: { v: number }) {
  const color = v < 50 ? "text-destructive bg-destructive/10" : v < 70 ? "text-warning bg-warning/10" : "text-success bg-success/10";
  return <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${color}`}>{v}</span>;
}
