import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useMemo, useState } from "react";
import {
  Search, GraduationCap, Mail, ShieldCheck, UserCog, Users2, Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listarMembrosEscola, type MembroEscola } from "@/lib/professores.functions";
import { ProfessoresConvites } from "@/components/ProfessoresConvites";

export const Route = createFileRoute("/professores")({
  head: () => ({
    meta: [
      { title: "Professores · EduLinguas AI" },
      { name: "description", content: "Gestão do corpo docente, coordenadores e gestores da escola." },
    ],
  }),
  component: ProfessoresPage,
});

const badge: Record<MembroEscola["papeis"][number], string> = {
  gestor: "bg-primary/15 text-primary border-primary/30",
  coordenador: "bg-ai/15 text-ai border-ai/30",
  professor: "bg-muted text-foreground border-border",
};
const label: Record<MembroEscola["papeis"][number], string> = {
  gestor: "Gestor",
  coordenador: "Coordenador",
  professor: "Professor",
};

function ProfessoresPage() {
  const { user } = useAuth();
  const escolaId = user?.escolaAtiva?.id ?? null;
  const isGestor = !!user?.escolaAtiva &&
    (user.escolas.find((m) => m.escola.id === user.escolaAtiva!.id)?.papeis.includes("gestor") ?? false);

  const listar = useServerFn(listarMembrosEscola);
  const { data, isLoading, error } = useQuery({
    queryKey: ["membros-escola", escolaId],
    queryFn: () => listar({ data: { escolaId: escolaId! } }),
    enabled: !!escolaId,
  });

  const [q, setQ] = useState("");
  const [papelFiltro, setPapelFiltro] = useState<string>("todos");

  const filtrados = useMemo(() => {
    const list = data?.membros ?? [];
    return list.filter((m) => {
      if (q && !`${m.nome} ${m.email}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (papelFiltro !== "todos" && !m.papeis.includes(papelFiltro as MembroEscola["papeis"][number])) return false;
      return true;
    });
  }, [data, q, papelFiltro]);

  const kpis = useMemo(() => {
    const list = data?.membros ?? [];
    return {
      total: list.length,
      gestores: list.filter((m) => m.papeis.includes("gestor")).length,
      coordenadores: list.filter((m) => m.papeis.includes("coordenador")).length,
      professores: list.filter((m) => m.papeis.includes("professor")).length,
    };
  }, [data]);

  if (!escolaId) {
    return (
      <AppShell>
        <EmptyState title="Sem escola ativa" desc="Selecione ou crie uma escola em Configurações para gerenciar a equipe." />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <div className="text-xs font-semibold text-ai uppercase tracking-wider">Equipe da escola</div>
          <h1 className="font-display text-3xl font-bold tracking-tight mt-1">Gestores, coordenadores e professores</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Convide e gerencie a equipe pedagógica. Cada convite gera um link seguro.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="Total" value={kpis.total} icon={Users2} />
          <KpiCard label="Gestores" value={kpis.gestores} icon={ShieldCheck} accent />
          <KpiCard label="Coordenadores" value={kpis.coordenadores} icon={UserCog} />
          <KpiCard label="Professores" value={kpis.professores} icon={GraduationCap} />
        </div>

        <ProfessoresConvites escolaId={escolaId} isGestor={isGestor} />

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 px-3 h-10 rounded-xl bg-muted/50 border border-border flex-1 min-w-[240px] max-w-md">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome ou e-mail…"
              className="bg-transparent text-sm flex-1 outline-none placeholder:text-muted-foreground"
            />
          </div>
          <select
            value={papelFiltro}
            onChange={(e) => setPapelFiltro(e.target.value)}
            className="h-10 px-3 rounded-xl bg-muted/50 border border-border text-sm outline-none"
          >
            <option value="todos">Todos os papéis</option>
            <option value="gestor">Gestores</option>
            <option value="coordenador">Coordenadores</option>
            <option value="professor">Professores</option>
          </select>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground flex items-center gap-2 justify-center">
            <Loader2 className="size-4 animate-spin" /> Carregando equipe…
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {error instanceof Error ? error.message : "Erro ao carregar equipe."}
          </div>
        ) : filtrados.length === 0 ? (
          <EmptyState title="Nenhum membro encontrado" desc="Ajuste os filtros ou envie um novo convite acima." />
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtrados.map((m) => (
              <div key={m.user_id} className="glass rounded-2xl p-4 border border-border">
                <div className="flex items-start gap-3">
                  <Avatar nome={m.nome} url={m.avatar_url} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm leading-tight truncate">{m.nome}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 truncate flex items-center gap-1">
                      <Mail className="size-3" /> {m.email}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {m.papeis.length === 0 ? (
                    <span className="text-[11px] px-2 py-0.5 rounded-md border border-dashed border-border text-muted-foreground">Sem papel</span>
                  ) : (
                    m.papeis.map((p) => (
                      <span key={p} className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${badge[p]}`}>
                        {label[p]}
                      </span>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Avatar({ nome, url }: { nome: string; url: string | null }) {
  const ini = nome.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]).join("").toUpperCase() || "U";
  if (url) return <img src={url} alt={nome} className="size-11 rounded-xl object-cover shrink-0" />;
  return (
    <div className="size-11 rounded-xl bg-gradient-to-br from-primary to-ai grid place-items-center text-primary-foreground text-sm font-bold shrink-0">
      {ini}
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, accent }: { label: string; value: number; icon: typeof Users2; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 border ${accent ? "border-primary/40 bg-primary/5" : "border-border bg-card/60"}`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
        <Icon className={`size-4 ${accent ? "text-primary" : "text-muted-foreground"}`} />
      </div>
      <div className="text-2xl font-bold mt-2">{value}</div>
    </div>
  );
}

function EmptyState({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-10 text-center">
      <UserCog className="size-8 text-muted-foreground mx-auto mb-2" />
      <div className="font-semibold">{title}</div>
      <p className="text-sm text-muted-foreground mt-1">{desc}</p>
    </div>
  );
}
