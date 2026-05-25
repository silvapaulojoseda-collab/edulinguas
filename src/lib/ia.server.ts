import { supabaseAdmin } from "@/integrations/supabase/client.server";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

export async function agregarDesempenho(opts: {
  escolaId: string;
  turmaId: string | null;
  avaliacaoId: string | null;
}) {
  // Buscar respostas para a turma/avaliação via joins; quando o banco não tem ainda
  // dados reais de OCR, devolvemos um snapshot baseado em alunos + médias.
  const alunosQ = supabaseAdmin
    .from("alunos")
    .select("id,nome,matricula,turma,turma_id,media_geral,progresso_spaece")
    .eq("escola_id", opts.escolaId)
    .limit(500);
  if (opts.turmaId) alunosQ.eq("turma_id", opts.turmaId);
  const { data: alunos } = await alunosQ;

  const lista = alunos ?? [];
  const media =
    lista.length > 0 ? lista.reduce((a, s) => a + Number(s.media_geral ?? 0), 0) / lista.length : 0;
  const abaixo50 = lista.filter((s) => Number(s.media_geral ?? 0) < 50).length;
  const topo = lista
    .slice()
    .sort((a, b) => Number(b.media_geral ?? 0) - Number(a.media_geral ?? 0))
    .slice(0, 5)
    .map((s) => ({ nome: s.nome, media: Number(s.media_geral) }));
  const base = lista
    .slice()
    .sort((a, b) => Number(a.media_geral ?? 0) - Number(b.media_geral ?? 0))
    .slice(0, 5)
    .map((s) => ({ nome: s.nome, media: Number(s.media_geral) }));

  // Se houver respostas reais, agregamos por descritor
  const { data: respostas } = await supabaseAdmin
    .from("respostas")
    .select("descritor,correta,cartoes_ocr!inner(lote_id,lotes_ocr!inner(escola_id,turma_id,avaliacao_id))")
    .eq("cartoes_ocr.lotes_ocr.escola_id", opts.escolaId)
    .limit(5000);

  const porDescritor = new Map<string, { acertos: number; total: number }>();
  for (const r of (respostas ?? []) as unknown as Array<{ descritor: string | null; correta: boolean }>) {
    const code = r.descritor || "—";
    const cur = porDescritor.get(code) ?? { acertos: 0, total: 0 };
    cur.total++;
    if (r.correta) cur.acertos++;
    porDescritor.set(code, cur);
  }

  const descritores = Array.from(porDescritor.entries())
    .filter(([k]) => k !== "—")
    .map(([code, v]) => ({ code, media_pct: Math.round((v.acertos / v.total) * 100), total: v.total }))
    .sort((a, b) => a.media_pct - b.media_pct);

  return {
    total_alunos: lista.length,
    media_geral: Math.round(media * 10) / 10,
    alunos_abaixo_50: abaixo50,
    top5_alunos: topo,
    bottom5_alunos: base,
    descritores_avaliados: descritores,
  };
}

export async function callAIJson(opts: {
  model: string;
  system: string;
  user: string;
  schema: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY ausente");

  const resp = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: opts.model,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
      tools: [{ type: "function", function: opts.schema }],
      tool_choice: { type: "function", function: { name: opts.schema.name } },
    }),
  });
  if (resp.status === 429) throw new Error("Limite de requisições da IA atingido. Aguarde alguns minutos.");
  if (resp.status === 402) throw new Error("Créditos da IA esgotados. Adicione créditos em Configurações.");
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`IA Gateway ${resp.status}: ${t.slice(0, 200)}`);
  }
  const json = (await resp.json()) as {
    choices: Array<{ message: { tool_calls?: Array<{ function: { arguments: string } }> } }>;
  };
  const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("Resposta inválida da IA");
  return JSON.parse(args) as Record<string, unknown> & { diagnostico: string };
}

export async function callAIChat(opts: {
  model: string;
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY ausente");

  const resp = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: opts.model,
      messages: [{ role: "system", content: opts.system }, ...opts.messages],
    }),
  });
  if (resp.status === 429) throw new Error("Limite de requisições da IA atingido.");
  if (resp.status === 402) throw new Error("Créditos da IA esgotados.");
  if (!resp.ok) throw new Error(`IA Gateway ${resp.status}`);
  const json = (await resp.json()) as { choices: Array<{ message: { content: string } }> };
  return json.choices?.[0]?.message?.content ?? "";
}
