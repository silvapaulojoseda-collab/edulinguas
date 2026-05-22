import students from "@/data/students.json";

export type Student = {
  id: number;
  matricula: number;
  nome: string;
  turma: string;
  nota: number;
  portugues: number;
  edFisica: number;
  espanhol: number;
  ingles: number;
  arte: number;
};

export const STUDENTS = students as Student[];

export const TURMAS = Array.from(new Set(STUDENTS.map((s) => s.turma))).sort();

export const DISCIPLINAS = [
  { key: "portugues", label: "Português", color: "oklch(0.62 0.20 25)" },
  { key: "ingles", label: "Inglês", color: "oklch(0.60 0.18 250)" },
  { key: "espanhol", label: "Espanhol", color: "oklch(0.72 0.18 85)" },
  { key: "arte", label: "Arte", color: "oklch(0.65 0.20 320)" },
  { key: "edFisica", label: "Ed. Física", color: "oklch(0.72 0.18 155)" },
] as const;

export function turmaStats(turma?: string) {
  const list = turma ? STUDENTS.filter((s) => s.turma === turma) : STUDENTS;
  const avg = (k: keyof Student) =>
    list.length ? list.reduce((a, s) => a + (s[k] as number), 0) / list.length : 0;
  return {
    alunos: list.length,
    media: avg("nota"),
    portugues: avg("portugues"),
    ingles: avg("ingles"),
    espanhol: avg("espanhol"),
    arte: avg("arte"),
    edFisica: avg("edFisica"),
  };
}

export const DESCRITORES = [
  { code: "D5", desc: "Inferência textual", media: 42, critical: true },
  { code: "D12", desc: "Interpretação de gráficos", media: 38, critical: true },
  { code: "D8", desc: "Coesão e coerência", media: 61 },
  { code: "D3", desc: "Vocabulário em contexto (L2)", media: 54 },
  { code: "D15", desc: "Análise sintática", media: 68 },
  { code: "D21", desc: "Compreensão auditiva", media: 71 },
];
