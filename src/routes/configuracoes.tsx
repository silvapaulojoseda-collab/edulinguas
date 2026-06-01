import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Cloud, Sparkles, ScanLine, Database, ShieldCheck, Building2, Plus, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { criarEscola, listarMinhasEscolas, ativarEscola } from "@/lib/escola.functions";
import { useAuth } from "@/lib/auth";
import { ProfessoresConvites } from "@/components/ProfessoresConvites";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações · EduLinguas AI" }] }),
  component: Config,
});

type EscolaItem = {
  role: "gestor" | "coordenador" | "professor";
  escola: { id: string; nome: string; cidade: string | null; uf: string | null; inep: string | null; created_at: string } | null;
};

function Config() {
  const { user, refresh } = useAuth();
  const listar = useServerFn(listarMinhasEscolas);
  const criar = useServerFn(criarEscola);
  const ativar = useServerFn(ativarEscola);

  const [escolas, setEscolas] = useState<EscolaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nome: "", cidade: "", uf: "", inep: "" });

  async function load() {
    setLoading(true);
    try {
      const r = await listar();
      setEscolas((r.escolas as EscolaItem[]) ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar escolas");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function submitCriar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) return toast.error("Informe o nome da escola");
    setSaving(true);
    try {
      await criar({ data: {
        nome: form.nome,
        cidade: form.cidade || null,
        uf: form.uf || null,
        inep: form.inep || null,
        ativarComoAtual: true,
      }});
      toast.success("Escola criada com sucesso");
      setForm({ nome: "", cidade: "", uf: "", inep: "" });
      setOpen(false);
      await load();
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao criar escola");
    } finally {
      setSaving(false);
    }
  }

  async function trocar(escolaId: string) {
    try {
      await ativar({ data: { escolaId } });
      toast.success("Escola ativa atualizada");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao trocar de escola");
    }
  }

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground text-sm mt-1">Escolas, integrações e segurança.</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"
        >
          <Plus className="size-4" /> Adicionar escola
        </button>
      </div>

      {/* Minhas escolas */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
          <Building2 className="size-4" /> Minhas escolas
        </h2>
        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" /> Carregando…
          </div>
        ) : escolas.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <Building2 className="size-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Você ainda não tem escolas. Crie sua primeira agora.</p>
            <button onClick={() => setOpen(true)} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
              <Plus className="size-4" /> Adicionar escola
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {escolas.map((m) => {
              if (!m.escola) return null;
              const ativa = user?.escolaAtiva?.id === m.escola.id;
              return (
                <div key={m.escola.id} className={`rounded-2xl border p-4 bg-card ${ativa ? "border-primary/60" : "border-border"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{m.escola.nome}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {[m.escola.cidade, m.escola.uf].filter(Boolean).join(" · ") || "Sem localização"}
                        {m.escola.inep ? ` · INEP ${m.escola.inep}` : ""}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-primary/10 text-primary shrink-0">
                      {m.role}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    {ativa ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                        <Check className="size-3.5" /> Escola ativa
                      </span>
                    ) : (
                      <button
                        onClick={() => trocar(m.escola!.id)}
                        className="text-xs font-semibold text-primary"
                      >
                        Ativar esta escola →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Convites de professores */}
      <ProfessoresConvites
        escolaId={user?.escolaAtiva?.id ?? null}
        isGestor={
          !!user?.escolaAtiva &&
          (user.escolas.find((m) => m.escola.id === user.escolaAtiva!.id)?.papeis.includes("gestor") ?? false)
        }
      />

      {/* Integrações */}
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Plataforma</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SystemCard icon={Database} title="Banco de dados" desc="Lovable Cloud conectado e persistindo alunos, gabaritos e respostas." />
        <SystemCard icon={ScanLine} title="OCR · Gemini Vision" desc="Reconhecimento de cartões e QR Code em tempo real via Lovable AI." />
        <SystemCard icon={Sparkles} title="IA Pedagógica · GPT-5.2" desc="Análise automática, parecer e plano de intervenção via Lovable AI." />
        <SystemCard icon={ShieldCheck} title="Autenticação multi-perfil" desc="Professor, coordenador e gestor com JWT + RLS." />
        <SystemCard icon={Cloud} title="Backup automático" desc="Snapshot diário em nuvem (Lovable Cloud)." />
      </div>

      {/* Modal criar escola */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button aria-label="Fechar" onClick={() => setOpen(false)} className="absolute inset-0 bg-background/70 backdrop-blur-sm" />
          <form onSubmit={submitCriar} className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <h3 className="text-lg font-display font-bold">Adicionar escola</h3>
            <p className="text-xs text-muted-foreground mt-1">Você será automaticamente o gestor da escola criada.</p>
            <div className="mt-4 space-y-3">
              <Field label="Nome da escola *">
                <input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="EEEP Profa. Maria Dolores"
                  className="w-full h-11 px-3 rounded-xl bg-muted/40 border border-border text-sm outline-none focus:border-primary"
                  required
                />
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Field label="Cidade">
                    <input
                      value={form.cidade}
                      onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                      placeholder="Fortaleza"
                      className="w-full h-11 px-3 rounded-xl bg-muted/40 border border-border text-sm outline-none focus:border-primary"
                    />
                  </Field>
                </div>
                <Field label="UF">
                  <input
                    value={form.uf}
                    onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase().slice(0, 2) })}
                    placeholder="CE"
                    maxLength={2}
                    className="w-full h-11 px-3 rounded-xl bg-muted/40 border border-border text-sm outline-none focus:border-primary uppercase"
                  />
                </Field>
              </div>
              <Field label="Código INEP (opcional)">
                <input
                  value={form.inep}
                  onChange={(e) => setForm({ ...form, inep: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                  placeholder="23234567"
                  inputMode="numeric"
                  className="w-full h-11 px-3 rounded-xl bg-muted/40 border border-border text-sm outline-none focus:border-primary"
                />
              </Field>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="h-10 px-4 rounded-xl text-sm font-semibold hover:bg-muted">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60 inline-flex items-center gap-2">
                {saving && <Loader2 className="size-4 animate-spin" />} Criar escola
              </button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function SystemCard({ icon: Icon, title, desc }: { icon: typeof Cloud; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 flex items-start gap-4">
      <div className="size-11 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
        <Icon className="size-5" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{title}</h3>
          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-success/15 text-success">ativo</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{desc}</p>
        <button onClick={() => toast.info(`${title}: opções avançadas em breve`)} className="mt-3 text-xs font-semibold text-primary">
          Configurar →
        </button>
      </div>
    </div>
  );
}
