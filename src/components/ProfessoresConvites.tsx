import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Plus, UserPlus, Copy, X, RotateCw, Mail } from "lucide-react";
import {
  convidarProfessor,
  listarConvites,
  cancelarConvite,
  reenviarConvite,
} from "@/lib/invites.functions";

type InviteRole = "gestor" | "coordenador" | "professor";
type Invite = {
  id: string;
  email: string;
  nome: string | null;
  role: InviteRole;
  status: string;
  token: string;
  expira_em: string;
  aceito_em: string | null;
  created_at: string;
};

export function ProfessoresConvites({ escolaId, isGestor }: { escolaId: string | null; isGestor: boolean }) {
  const listar = useServerFn(listarConvites);
  const convidar = useServerFn(convidarProfessor);
  const cancelar = useServerFn(cancelarConvite);
  const reenviar = useServerFn(reenviarConvite);

  const [items, setItems] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ email: "", nome: "", role: "professor" as InviteRole });
  const [novoLink, setNovoLink] = useState<string | null>(null);

  async function load() {
    if (!escolaId || !isGestor) return;
    setLoading(true);
    try {
      const r = await listar({ data: { escolaId } });
      setItems(r.invites as Invite[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar convites");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [escolaId, isGestor]);

  function linkFor(token: string) {
    return `${window.location.origin}/convite/${token}`;
  }
  async function copy(token: string) {
    await navigator.clipboard.writeText(linkFor(token));
    toast.success("Link copiado para a área de transferência");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!escolaId) return;
    setSaving(true);
    try {
      const r = await convidar({ data: { escolaId, email: form.email, nome: form.nome || undefined, role: form.role } });
      setNovoLink(linkFor(r.token));
      setForm({ email: "", nome: "", role: "professor" });
      await load();
      toast.success("Convite criado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao criar convite");
    } finally {
      setSaving(false);
    }
  }

  if (!escolaId) return null;
  if (!isGestor) {
    return (
      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
          <UserPlus className="size-4" /> Convites de professores
        </h2>
        <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          Apenas gestores da escola ativa podem convidar professores e coordenadores.
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <UserPlus className="size-4" /> Convites de professores
        </h2>
        <button
          onClick={() => { setOpen(true); setNovoLink(null); }}
          className="inline-flex items-center gap-2 h-9 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90"
        >
          <Plus className="size-3.5" /> Convidar
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" /> Carregando…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground text-center">
          Nenhum convite enviado ainda.
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="divide-y divide-border">
            {items.map((it) => (
              <div key={it.id} className="p-3 flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">{it.nome ?? it.email}</div>
                  <div className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
                    <Mail className="size-3" /> {it.email}
                    <span className="opacity-50">·</span>
                    <span className="capitalize">{it.role}</span>
                  </div>
                </div>
                <StatusBadge status={it.status} />
                {it.status === "pending" && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => copy(it.token)} title="Copiar link" className="size-8 grid place-items-center rounded-lg hover:bg-muted">
                      <Copy className="size-4" />
                    </button>
                    <button
                      onClick={async () => {
                        const r = await reenviar({ data: { inviteId: it.id } });
                        setNovoLink(linkFor(r.token));
                        await load();
                        toast.success("Convite renovado");
                      }}
                      title="Renovar token"
                      className="size-8 grid place-items-center rounded-lg hover:bg-muted"
                    >
                      <RotateCw className="size-4" />
                    </button>
                    <button
                      onClick={async () => {
                        await cancelar({ data: { inviteId: it.id } });
                        await load();
                        toast.success("Convite cancelado");
                      }}
                      title="Cancelar"
                      className="size-8 grid place-items-center rounded-lg hover:bg-destructive/10 text-destructive"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button aria-label="Fechar" onClick={() => setOpen(false)} className="absolute inset-0 bg-background/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <h3 className="text-lg font-display font-bold">Convidar professor</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Gere um link de convite para o e-mail informado. Compartilhe com o professor por e-mail ou mensagem.
            </p>
            {novoLink ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-border bg-muted/40 p-3">
                  <div className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Link do convite</div>
                  <div className="font-mono text-xs break-all">{novoLink}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { navigator.clipboard.writeText(novoLink); toast.success("Copiado!"); }}
                    className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center justify-center gap-2"
                  >
                    <Copy className="size-4" /> Copiar link
                  </button>
                  <button onClick={() => { setOpen(false); setNovoLink(null); }} className="h-10 px-4 rounded-xl text-sm font-semibold hover:bg-muted">
                    Fechar
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-4 space-y-3">
                <label className="block">
                  <span className="text-xs font-semibold text-muted-foreground">E-mail *</span>
                  <input
                    type="email" required maxLength={255}
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="professor@escola.edu.br"
                    className="mt-1 w-full h-11 px-3 rounded-xl bg-muted/40 border border-border text-sm outline-none focus:border-primary"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-muted-foreground">Nome (opcional)</span>
                  <input
                    value={form.nome} maxLength={120}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    placeholder="Prof. Maria Silva"
                    className="mt-1 w-full h-11 px-3 rounded-xl bg-muted/40 border border-border text-sm outline-none focus:border-primary"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-muted-foreground">Função</span>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as InviteRole })}
                    className="mt-1 w-full h-11 px-3 rounded-xl bg-muted/40 border border-border text-sm outline-none focus:border-primary"
                  >
                    <option value="professor">Professor</option>
                    <option value="coordenador">Coordenador</option>
                    <option value="gestor">Gestor</option>
                  </select>
                  <span className="text-[10px] text-muted-foreground mt-1 block">
                    Gestores podem criar avaliações, convidar equipe e gerenciar a escola.
                  </span>
                </label>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setOpen(false)} className="h-10 px-4 rounded-xl text-sm font-semibold hover:bg-muted">
                    Cancelar
                  </button>
                  <button
                    type="submit" disabled={saving}
                    className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60 inline-flex items-center gap-2"
                  >
                    {saving && <Loader2 className="size-4 animate-spin" />} Gerar convite
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-warning/15 text-warning",
    accepted: "bg-success/15 text-success",
    cancelled: "bg-muted text-muted-foreground",
    expired: "bg-destructive/15 text-destructive",
  };
  const labels: Record<string, string> = {
    pending: "Pendente",
    accepted: "Aceito",
    cancelled: "Cancelado",
    expired: "Expirado",
  };
  return (
    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${map[status] ?? "bg-muted"}`}>
      {labels[status] ?? status}
    </span>
  );
}
