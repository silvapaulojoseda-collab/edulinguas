import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Plus, Calendar, Layers, Target, MoreHorizontal, Sparkles, X, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/avaliacoes")({
  head: () => ({
    meta: [
      { title: "Avaliações · EduLinguas AI" },
      { name: "description", content: "Crie avaliações com gabaritos, descritores BNCC, habilidades SPAECE e correção automática por OCR." },
    ],
  }),
  component: Avaliacoes,
});

type Aval = {
  id: string;
  titulo: string;
  disciplina: string;
  num_questoes: number;
  data: string;
  tipo: string;
  descritores: string[];
};

const statusColor: Record<string, string> = {
  diagnostica: "bg-primary/15 text-primary",
  simulado: "bg-ai/15 text-ai",
  bimestral: "bg-warning/15 text-warning",
  outro: "bg-muted text-muted-foreground",
};

function Avaliacoes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [list, setList] = useState<Aval[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ titulo: "", disciplina: "Português", num_questoes: 20, tipo: "diagnostica", descritores: "" });

  async function load() {
    if (!user?.escolaAtiva?.id) return;
    const { data } = await supabase
      .from("avaliacoes")
      .select("id,titulo,disciplina,num_questoes,data,tipo,descritores")
      .eq("escola_id", user.escolaAtiva.id)
      .order("created_at", { ascending: false });
    setList(data ?? []);
  }
  useEffect(() => { load(); }, [user?.escolaAtiva?.id]);

  async function salvar() {
    if (!user?.escolaAtiva?.id) return toast.error("Sem escola ativa");
    if (!form.titulo.trim()) return toast.error("Informe o título");
    setLoading(true);
    const { error } = await supabase.from("avaliacoes").insert({
      escola_id: user.escolaAtiva.id,
      titulo: form.titulo,
      disciplina: form.disciplina,
      num_questoes: form.num_questoes,
      tipo: form.tipo,
      descritores: form.descritores.split(",").map((s) => s.trim()).filter(Boolean),
      created_by: user.id,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Avaliação criada!");
    setOpen(false);
    setForm({ titulo: "", disciplina: "Português", num_questoes: 20, tipo: "diagnostica", descritores: "" });
    load();
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Avaliações</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie gabaritos, descritores e correção automatizada.</p>
        </div>
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-glow">
          <Plus className="size-4" /> Nova avaliação
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {list.map((a) => (
          <article key={a.id} className="rounded-2xl border border-border bg-card p-5 hover:border-primary/50 transition-colors group">
            <div className="flex items-start justify-between">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${statusColor[a.tipo] ?? statusColor.outro}`}>
                {a.tipo}
              </span>
              <button onClick={() => toast.info("Em breve: editar avaliação")} className="size-7 grid place-items-center rounded-lg hover:bg-muted opacity-0 group-hover:opacity-100 transition">
                <MoreHorizontal className="size-4" />
              </button>
            </div>
            <h3 className="mt-3 font-display font-bold text-lg leading-tight">{a.titulo}</h3>
            <p className="text-xs text-muted-foreground mt-1">{a.disciplina}</p>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-muted/60 py-2">
                <Layers className="size-3.5 mx-auto text-muted-foreground" />
                <div className="text-sm font-bold mt-1">{a.num_questoes}</div>
                <div className="text-[10px] text-muted-foreground">questões</div>
              </div>
              <div className="rounded-lg bg-muted/60 py-2">
                <Target className="size-3.5 mx-auto text-muted-foreground" />
                <div className="text-sm font-bold mt-1">{a.descritores?.length ?? 0}</div>
                <div className="text-[10px] text-muted-foreground">descritores</div>
              </div>
              <div className="rounded-lg bg-muted/60 py-2">
                <Calendar className="size-3.5 mx-auto text-muted-foreground" />
                <div className="text-sm font-bold mt-1">{new Date(a.data).getDate().toString().padStart(2, "0")}</div>
                <div className="text-[10px] text-muted-foreground">{new Date(a.data).toLocaleDateString("pt-BR", { month: "short" })}</div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {(a.descritores ?? []).slice(0, 6).map((d) => (
                <span key={d} className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-ai/10 text-ai">{d}</span>
              ))}
            </div>

            <button
              onClick={() => navigate({ to: "/ocr" })}
              className="mt-4 w-full text-xs font-semibold text-primary border border-border rounded-lg py-2 hover:bg-muted"
            >
              Corrigir cartões →
            </button>
          </article>
        ))}

        <button
          onClick={() => setOpen(true)}
          className="rounded-2xl border-2 border-dashed border-border bg-card/30 p-5 grid place-items-center text-center min-h-[280px] hover:border-ai/60 transition-colors group"
        >
          <div>
            <div className="size-12 rounded-2xl bg-ai/10 grid place-items-center mx-auto group-hover:scale-110 transition-transform">
              <Sparkles className="size-6 text-ai" />
            </div>
            <h3 className="mt-3 font-display font-semibold">Nova avaliação</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
              Crie um gabarito alinhado à BNCC com descritores SPAECE.
            </p>
          </div>
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm grid place-items-center p-4" onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-lg">Nova avaliação</h2>
              <button onClick={() => setOpen(false)} className="size-8 grid place-items-center rounded-lg hover:bg-muted"><X className="size-4" /></button>
            </div>
            <div className="space-y-3 text-sm">
              <label className="block">
                <span className="text-xs text-muted-foreground">Título</span>
                <input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} className="mt-1 w-full h-10 px-3 rounded-xl bg-muted border border-border outline-none" placeholder="Ex: Diagnóstica 2026.1" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-muted-foreground">Disciplina</span>
                  <select value={form.disciplina} onChange={(e) => setForm({ ...form, disciplina: e.target.value })} className="mt-1 w-full h-10 px-3 rounded-xl bg-muted border border-border outline-none">
                    {["Português", "Inglês", "Espanhol", "Arte", "Ed. Física"].map((d) => <option key={d}>{d}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs text-muted-foreground">Tipo</span>
                  <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="mt-1 w-full h-10 px-3 rounded-xl bg-muted border border-border outline-none">
                    <option value="diagnostica">Diagnóstica</option>
                    <option value="simulado">Simulado</option>
                    <option value="bimestral">Bimestral</option>
                    <option value="outro">Outro</option>
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="text-xs text-muted-foreground">Número de questões</span>
                <input type="number" min={1} max={100} value={form.num_questoes} onChange={(e) => setForm({ ...form, num_questoes: Number(e.target.value) })} className="mt-1 w-full h-10 px-3 rounded-xl bg-muted border border-border outline-none" />
              </label>
              <label className="block">
                <span className="text-xs text-muted-foreground">Descritores (separados por vírgula)</span>
                <input value={form.descritores} onChange={(e) => setForm({ ...form, descritores: e.target.value })} className="mt-1 w-full h-10 px-3 rounded-xl bg-muted border border-border outline-none" placeholder="D5, D8, D12" />
              </label>
            </div>
            <div className="mt-5 flex gap-2 justify-end">
              <button onClick={() => setOpen(false)} className="px-4 h-10 rounded-xl bg-muted text-sm font-semibold">Cancelar</button>
              <button onClick={salvar} disabled={loading} className="px-4 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-glow disabled:opacity-50 inline-flex items-center gap-2">
                {loading && <Loader2 className="size-4 animate-spin" />} Criar
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
