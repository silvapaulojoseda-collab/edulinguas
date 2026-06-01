import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Mail, ShieldCheck, Building2 } from "lucide-react";
import { aceitarConvite, buscarConvitePorToken } from "@/lib/invites.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/convite/$token")({
  head: () => ({ meta: [{ title: "Aceitar convite · EduLinguas AI" }] }),
  component: ConvitePage,
});

type Invite = {
  id: string;
  email: string;
  nome: string | null;
  role: "professor" | "coordenador";
  status: string;
  expira_em: string;
  escola_id: string;
  escolas: { nome: string; cidade: string | null; uf: string | null } | null;
};

function ConvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const buscar = useServerFn(buscarConvitePorToken);
  const aceitar = useServerFn(aceitarConvite);

  const [invite, setInvite] = useState<Invite | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [contaExistente, setContaExistente] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await buscar({ data: { token } });
        const inv = (r.invite as Invite | null) ?? null;
        setInvite(inv);
        if (inv?.nome) setNome(inv.nome);
        // Detecta se já existe sessão com o mesmo email
        const { data } = await supabase.auth.getUser();
        if (data.user?.email?.toLowerCase() === inv?.email) setContaExistente(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [token, buscar]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!invite) return;
    setSubmitting(true);
    try {
      await aceitar({ data: { token, nome: nome || undefined, senha: senha || undefined } });
      toast.success("Convite aceito! Faça login para continuar.");
      // Se já estava autenticado com o mesmo email, redireciona direto
      const { data } = await supabase.auth.getUser();
      if (data.user?.email?.toLowerCase() === invite.email) {
        await supabase.auth.refreshSession();
        navigate({ to: "/" });
      } else if (senha) {
        // Faz login automático
        const { error } = await supabase.auth.signInWithPassword({ email: invite.email, password: senha });
        if (!error) navigate({ to: "/" });
        else navigate({ to: "/login" });
      } else {
        navigate({ to: "/login" });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao aceitar convite");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="min-h-screen grid place-items-center px-4">
        <div className="max-w-md w-full text-center rounded-2xl border border-border bg-card p-8">
          <h1 className="text-xl font-display font-bold">Convite inválido</h1>
          <p className="text-sm text-muted-foreground mt-2">Este link não existe ou já foi utilizado.</p>
        </div>
      </div>
    );
  }

  const naoEhPendente = invite.status !== "pending";

  return (
    <div className="min-h-screen grid place-items-center px-4 py-10 bg-gradient-to-br from-background to-muted/30">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xl">
        <div className="flex items-center gap-2 text-primary mb-2">
          <ShieldCheck className="size-5" />
          <span className="text-xs font-bold uppercase tracking-wider">Convite EduLinguas AI</span>
        </div>
        <h1 className="text-2xl font-display font-bold">Você foi convidado!</h1>
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Building2 className="size-4" />
            <span className="font-semibold text-foreground">{invite.escolas?.nome ?? "Escola"}</span>
            {invite.escolas?.cidade && <span>· {invite.escolas.cidade}/{invite.escolas.uf}</span>}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="size-4" />
            <span className="font-mono text-foreground">{invite.email}</span>
          </div>
          <div className="text-xs">
            Função: <span className="font-semibold capitalize">{invite.role}</span>
          </div>
        </div>

        {naoEhPendente ? (
          <div className="mt-6 p-4 rounded-xl bg-muted text-sm">
            Este convite está com status <strong>{invite.status}</strong> e não pode mais ser usado.
          </div>
        ) : contaExistente ? (
          <form onSubmit={submit} className="mt-6 space-y-3">
            <p className="text-sm text-muted-foreground">
              Você já tem uma conta com este e-mail. Clique para vincular à escola.
            </p>
            <button
              disabled={submitting}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting && <Loader2 className="size-4 animate-spin" />} Aceitar convite
            </button>
          </form>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-3">
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">Seu nome</span>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                maxLength={120}
                className="mt-1 w-full h-11 px-3 rounded-xl bg-muted/40 border border-border text-sm outline-none focus:border-primary"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">Defina uma senha (mín. 8 caracteres)</span>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                minLength={8}
                maxLength={128}
                className="mt-1 w-full h-11 px-3 rounded-xl bg-muted/40 border border-border text-sm outline-none focus:border-primary"
              />
            </label>
            <button
              disabled={submitting}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting && <Loader2 className="size-4 animate-spin" />} Criar conta e aceitar
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
