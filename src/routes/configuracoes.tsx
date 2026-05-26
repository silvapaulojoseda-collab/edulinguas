import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Cloud, Sparkles, ScanLine, Database, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações · EduLinguas AI" },
    ],
  }),
  component: Config,
});

function Config() {
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground text-sm mt-1">Integrações, escola e segurança.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card icon={Database} title="Banco de dados" desc="Lovable Cloud conectado e persistindo alunos, gabaritos e respostas." status="ativo" />
        <Card icon={ScanLine} title="OCR · Gemini Vision" desc="Reconhecimento de cartões e QR Code em tempo real via Lovable AI." status="ativo" />
        <Card icon={Sparkles} title="IA Pedagógica · GPT-5.2" desc="Análise automática, parecer e plano de intervenção via Lovable AI." status="ativo" />
        <Card icon={ShieldCheck} title="Autenticação multi-perfil" desc="Professor, coordenador e gestor com JWT + RLS." status="ativo" />
        <Card icon={Cloud} title="Backup automático" desc="Snapshot diário em nuvem (Lovable Cloud)." status="ativo" />
      </div>
    </AppShell>
  );
}

function Card({ icon: Icon, title, desc, status }: { icon: typeof Cloud; title: string; desc: string; status: string }) {
  const isActive = status === "ativo";
  return (
    <div className="rounded-2xl border border-border bg-card p-5 flex items-start gap-4">
      <div className="size-11 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
        <Icon className="size-5" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{title}</h3>
          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-md ${isActive ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>{status}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{desc}</p>
        <button onClick={() => toast.info(`${title}: opções avançadas em breve`)} className="mt-3 text-xs font-semibold text-primary">Configurar →</button>
      </div>
    </div>
  );
}
