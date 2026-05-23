import { supabase } from "@/integrations/supabase/client";

export type Aluno = {
  id: string;
  matricula: string | null;
  nome: string;
  turma: string;
  media_geral: number | null;
  progresso_spaece: number | null;
};

export type Notificacao = {
  id: string;
  tipo: "info" | "alerta" | "erro" | "sucesso";
  mensagem: string;
  lida: boolean;
  criada_em: string;
};

export type Parecer = {
  id: string;
  turma: string;
  disciplina: string;
  texto_parecer: string;
  data_criacao: string;
};

export async function fetchAlunos(): Promise<Aluno[]> {
  const { data, error } = await supabase
    .from("alunos")
    .select("*")
    .order("nome")
    .limit(1000);
  if (error) throw error;
  return (data ?? []) as Aluno[];
}

export async function fetchNotificacoes(): Promise<Notificacao[]> {
  const { data, error } = await supabase
    .from("notificacoes")
    .select("*")
    .order("criada_em", { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data ?? []) as Notificacao[];
}

export async function criarNotificacao(
  tipo: Notificacao["tipo"],
  mensagem: string,
) {
  const { error } = await supabase
    .from("notificacoes")
    .insert({ tipo, mensagem });
  if (error) throw error;
}

export async function marcarNotificacoesLidas() {
  const { error } = await supabase
    .from("notificacoes")
    .update({ lida: true })
    .eq("lida", false);
  if (error) throw error;
}

export async function registrarOCR(turma: string, totalCartoes: number) {
  const status = Math.random() < 0.7 ? "sucesso" : "alerta";
  const { data, error } = await supabase
    .from("gabaritos_ocr")
    .insert({ turma, total_cartoes: totalCartoes, status })
    .select()
    .single();
  if (error) throw error;
  await criarNotificacao(
    status === "sucesso" ? "sucesso" : "alerta",
    status === "sucesso"
      ? `OCR processou ${totalCartoes} cartões — ${turma}`
      : `OCR de ${turma}: ${Math.max(1, Math.round(totalCartoes * 0.1))} cartões com dupla marcação`,
  );
  return data;
}

export async function gerarParecerIA(turma: string, disciplina: string) {
  const texto = `Análise pedagógica — ${turma} / ${disciplina}

A turma apresenta desempenho heterogêneo, com média abaixo da meta SPAECE para a série. Os principais gargalos concentram-se em:

• D5 — Inferência textual (42% de acerto): dificuldade em estabelecer relações implícitas entre informações do texto.
• D12 — Interpretação de gráficos e tabelas (38% de acerto): leitura literal de eixos sem articulação com narrativa.

Pontos fortes detectados:
• D21 — Compreensão auditiva (71%)
• D15 — Análise sintática (68%)

Plano de intervenção sugerido (4 semanas):
1. Oficina de inferência com manchetes de jornal — 4 encontros de 50min.
2. Análise de infográficos (BBC/Nexo): dados, escalas e narrativa visual.
3. Reaplicação de itens-âncora SPAECE 2023 (D5, D12) para reavaliação diagnóstica.
4. Tutoria entre pares: alunos de alto desempenho em duplas heterogêneas.

Projeção SPAECE 2026: 258 pontos (faixa intermediário) com tendência de alta caso o plano seja executado integralmente.`;

  const { data, error } = await supabase
    .from("pareceres_ia")
    .insert({ turma, disciplina, texto_parecer: texto })
    .select()
    .single();
  if (error) throw error;
  await criarNotificacao(
    "info",
    `IA gerou parecer pedagógico de ${disciplina} — ${turma}`,
  );
  return data as Parecer;
}
