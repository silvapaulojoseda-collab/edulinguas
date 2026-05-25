import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Redefinir senha · EduLinguas AI" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (senha.length < 8) return setErro("Mínimo 8 caracteres.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setLoading(false);
    if (error) return setErro(error.message);
    setOk(true);
    setTimeout(() => navigate({ to: "/" }), 1500);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-background">
      <div className="w-full max-w-md">
        <h2 className="font-display text-2xl font-bold">Redefinir senha</h2>
        <p className="text-sm text-muted-foreground mt-2">Defina uma nova senha para sua conta.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">Nova senha</span>
            <div className="mt-1.5 flex items-center gap-2 px-3 h-11 rounded-xl bg-muted/40 border border-border focus-within:border-primary">
              <Lock className="size-4 text-muted-foreground" />
              <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} className="flex-1 bg-transparent text-sm outline-none" required />
            </div>
          </label>
          {erro && <div className="text-xs text-destructive">{erro}</div>}
          {ok && <div className="text-xs text-success">Senha alterada. Redirecionando…</div>}
          <button type="submit" disabled={loading} className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-60">
            {loading ? "Salvando..." : "Salvar nova senha"}
          </button>
        </form>
      </div>
    </div>
  );
}
