import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ALT = z.enum(["A", "B", "C", "D", "E"]);

const itemSchema = z.object({
  ordem: z.number().int().min(1).max(200),
  alternativa_correta: ALT,
  descritor: z.string().max(60).nullable().optional(),
});

async function ensureAvaliacao(supabase: any, avaliacaoId: string) {
  const { data, error } = await supabase
    .from("avaliacoes")
    .select("id, escola_id, num_questoes, titulo, disciplina, data")
    .eq("id", avaliacaoId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Avaliação não encontrada ou sem acesso");
  return data as { id: string; escola_id: string; num_questoes: number; titulo: string; disciplina: string; data: string };
}

/** Lista o gabarito de uma avaliação. */
export const listarGabarito = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ avaliacaoId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const aval = await ensureAvaliacao(supabase, data.avaliacaoId);
    const { data: itens, error } = await supabase
      .from("gabaritos")
      .select("id, ordem, alternativa_correta, descritor")
      .eq("avaliacao_id", data.avaliacaoId)
      .order("ordem", { ascending: true });
    if (error) throw new Error(error.message);
    return { avaliacao: aval, itens: itens ?? [] };
  });

/** Substitui o gabarito inteiro pela lista informada (replace-all). */
export const salvarGabarito = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        avaliacaoId: z.string().uuid(),
        itens: z.array(itemSchema).max(200),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    await ensureAvaliacao(supabase, data.avaliacaoId);

    const seen = new Set<number>();
    for (const it of data.itens) {
      if (seen.has(it.ordem)) throw new Error(`Questão ${it.ordem} duplicada`);
      seen.add(it.ordem);
    }

    const { error: delErr } = await supabase.from("gabaritos").delete().eq("avaliacao_id", data.avaliacaoId);
    if (delErr) throw new Error(delErr.message);

    if (data.itens.length === 0) return { ok: true, count: 0 };

    const payload = data.itens.map((i) => ({
      avaliacao_id: data.avaliacaoId,
      ordem: i.ordem,
      alternativa_correta: i.alternativa_correta,
      descritor: i.descritor ?? null,
    }));
    const { error } = await supabase.from("gabaritos").insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true, count: payload.length };
  });

/**
 * Gera o XLSX (base64) com o gabarito atual. Colunas: Questão | Gabarito | Descritor.
 * O usuário pode editar e re-importar via importarGabaritoExcel.
 */
export const exportarGabaritoExcel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ avaliacaoId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const XLSX = await import("xlsx");
    const { supabase } = context;
    const aval = await ensureAvaliacao(supabase, data.avaliacaoId);
    const { data: itens } = await supabase
      .from("gabaritos")
      .select("ordem, alternativa_correta, descritor")
      .eq("avaliacao_id", data.avaliacaoId)
      .order("ordem", { ascending: true });

    const total = Math.max(aval.num_questoes, itens?.length ?? 0, 1);
    const map = new Map((itens ?? []).map((i) => [i.ordem, i]));
    const rows = Array.from({ length: total }, (_, idx) => {
      const ordem = idx + 1;
      const it = map.get(ordem);
      return {
        Questao: ordem,
        Gabarito: it?.alternativa_correta ?? "",
        Descritor: it?.descritor ?? "",
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 10 }, { wch: 12 }, { wch: 30 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Gabarito");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
    const base64 = Buffer.from(buf).toString("base64");
    const filename = `gabarito-${aval.titulo.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 60)}.xlsx`;
    return { base64, filename };
  });

const importRowSchema = z.object({
  Questao: z.coerce.number().int().min(1).max(200),
  Gabarito: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => ["A", "B", "C", "D", "E", ""].includes(v), "Gabarito inválido"),
  Descritor: z.string().max(60).optional().nullable(),
});

/** Recebe base64 de um XLSX, parseia e salva. */
export const importarGabaritoExcel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        avaliacaoId: z.string().uuid(),
        base64: z.string().min(10).max(5_000_000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const XLSX = await import("xlsx");
    const { supabase } = context;
    await ensureAvaliacao(supabase, data.avaliacaoId);

    const buf = Buffer.from(data.base64, "base64");
    const wb = XLSX.read(buf, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    if (!ws) throw new Error("Planilha vazia");
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

    const itens: Array<{ ordem: number; alternativa_correta: "A" | "B" | "C" | "D" | "E"; descritor: string | null }> = [];
    const erros: string[] = [];
    raw.forEach((r, idx) => {
      // Aceita Questao/Questão/questao
      const normalized = {
        Questao: r.Questao ?? r["Questão"] ?? r.questao ?? r.questão ?? "",
        Gabarito: String(r.Gabarito ?? r.gabarito ?? "").trim(),
        Descritor: String(r.Descritor ?? r.descritor ?? "").trim(),
      };
      const parsed = importRowSchema.safeParse(normalized);
      if (!parsed.success) {
        erros.push(`Linha ${idx + 2}: ${parsed.error.issues[0]?.message ?? "inválida"}`);
        return;
      }
      if (parsed.data.Gabarito === "") return; // pula linhas sem resposta
      itens.push({
        ordem: parsed.data.Questao,
        alternativa_correta: parsed.data.Gabarito as "A" | "B" | "C" | "D" | "E",
        descritor: parsed.data.Descritor ? parsed.data.Descritor.slice(0, 60) : null,
      });
    });
    if (erros.length) throw new Error(`Erros na planilha: ${erros.slice(0, 5).join("; ")}`);
    if (itens.length === 0) throw new Error("Nenhuma resposta válida encontrada");

    const seen = new Set<number>();
    for (const it of itens) {
      if (seen.has(it.ordem)) throw new Error(`Questão ${it.ordem} duplicada na planilha`);
      seen.add(it.ordem);
    }

    const { error: delErr } = await supabase.from("gabaritos").delete().eq("avaliacao_id", data.avaliacaoId);
    if (delErr) throw new Error(delErr.message);
    const payload = itens.map((i) => ({ avaliacao_id: data.avaliacaoId, ...i }));
    const { error } = await supabase.from("gabaritos").insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true, count: itens.length };
  });

/**
 * Gera PDF (base64) com 1 cartão-resposta por aluno da turma (ou de toda a escola).
 * Cada página contém: cabeçalho, nome/matrícula, QR assinado HMAC + grade de questões.
 */
export const gerarCartoesPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        avaliacaoId: z.string().uuid(),
        turmaId: z.string().uuid().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const [{ PDFDocument, StandardFonts, rgb }, QR, { buildQRPayload }] = await Promise.all([
      import("pdf-lib"),
      import("qrcode"),
      import("./qr.server"),
    ]);
    const { supabase } = context;
    const aval = await ensureAvaliacao(supabase, data.avaliacaoId);

    let q = supabase
      .from("alunos")
      .select("id, nome, matricula, turma")
      .eq("escola_id", aval.escola_id)
      .order("nome", { ascending: true })
      .limit(500);
    if (data.turmaId) q = q.eq("turma_id", data.turmaId);
    const { data: alunos, error } = await q;
    if (error) throw new Error(error.message);
    if (!alunos || alunos.length === 0) throw new Error("Nenhum aluno encontrado para esta seleção");

    const pdf = await PDFDocument.create();
    const fontReg = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const numQ = Math.max(aval.num_questoes, 1);
    const dataFmt = new Date(aval.data).toLocaleDateString("pt-BR");

    for (const aluno of alunos) {
      const page = pdf.addPage([595.28, 841.89]); // A4
      const { width, height } = page.getSize();

      // Cabeçalho
      page.drawText("EduLinguas AI · Cartão-resposta", {
        x: 40, y: height - 50, size: 14, font: fontBold, color: rgb(0.05, 0.1, 0.2),
      });
      page.drawText(aval.titulo, { x: 40, y: height - 72, size: 11, font: fontBold });
      page.drawText(`${aval.disciplina} · ${dataFmt} · ${numQ} questões`, {
        x: 40, y: height - 88, size: 9, font: fontReg, color: rgb(0.3, 0.3, 0.3),
      });

      // QR (PNG bytes)
      const qrPayload = buildQRPayload(aval.escola_id, aval.id, aluno.id);
      const qrDataUrl = await QR.toDataURL(qrPayload, { errorCorrectionLevel: "M", margin: 1, width: 220 });
      const qrPng = await pdf.embedPng(qrDataUrl);
      const qrSize = 110;
      page.drawImage(qrPng, { x: width - 40 - qrSize, y: height - 40 - qrSize, width: qrSize, height: qrSize });

      // Identificação aluno
      page.drawText("Aluno(a):", { x: 40, y: height - 130, size: 9, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
      page.drawText(aluno.nome, { x: 40, y: height - 145, size: 12, font: fontBold });
      page.drawText(`Matrícula: ${aluno.matricula ?? "—"}   ·   Turma: ${aluno.turma ?? "—"}`, {
        x: 40, y: height - 160, size: 9, font: fontReg, color: rgb(0.3, 0.3, 0.3),
      });
      page.drawText("Não dobre, rasure ou amasse este cartão. Preencha completamente a bolha da alternativa escolhida.", {
        x: 40, y: height - 178, size: 8, font: fontReg, color: rgb(0.45, 0.45, 0.45),
      });

      // Grade de respostas
      const startY = height - 220;
      const cols = numQ <= 30 ? 2 : numQ <= 60 ? 3 : 4;
      const perCol = Math.ceil(numQ / cols);
      const colWidth = (width - 80) / cols;
      const rowH = 18;
      const bubbleR = 5;
      const alts = ["A", "B", "C", "D", "E"];

      page.drawText("Marque a alternativa correta:", {
        x: 40, y: startY + 14, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.2),
      });

      for (let i = 0; i < numQ; i++) {
        const colIdx = Math.floor(i / perCol);
        const rowIdx = i % perCol;
        const x0 = 40 + colIdx * colWidth;
        const y = startY - rowIdx * rowH;
        page.drawText(`${String(i + 1).padStart(2, "0")}`, {
          x: x0, y: y - 3, size: 8, font: fontBold, color: rgb(0.2, 0.2, 0.2),
        });
        alts.forEach((a, ai) => {
          const cx = x0 + 22 + ai * 18;
          const cy = y;
          page.drawCircle({ x: cx, y: cy, size: bubbleR, borderWidth: 0.8, borderColor: rgb(0.2, 0.2, 0.2) });
          page.drawText(a, { x: cx - 2.5, y: cy - 3, size: 6, font: fontReg, color: rgb(0.35, 0.35, 0.35) });
        });
      }

      // Rodapé
      page.drawText(`Gerado por EduLinguas AI · ID ${aluno.id.slice(0, 8)}`, {
        x: 40, y: 28, size: 7, font: fontReg, color: rgb(0.5, 0.5, 0.5),
      });
    }

    const bytes = await pdf.save();
    const base64 = Buffer.from(bytes).toString("base64");
    const safe = aval.titulo.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 60);
    return { base64, filename: `cartoes-${safe}.pdf`, total: alunos.length };
  });

/**
 * Exporta planilha Excel com notas dos alunos para a avaliação.
 * Colunas: Aluno | Matrícula | Turma | Acertos | Total | Percentual | Status
 */
export const exportarNotasExcel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ avaliacaoId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const XLSX = await import("xlsx");
    const { supabase } = context;
    const aval = await ensureAvaliacao(supabase, data.avaliacaoId);

    const { data: alunos } = await supabase
      .from("alunos")
      .select("id, nome, matricula, turma")
      .eq("escola_id", aval.escola_id)
      .order("nome", { ascending: true })
      .limit(2000);

    const { data: cartoes } = await supabase
      .from("cartoes_ocr")
      .select("aluno_id, acertos, total, status, lotes_ocr!inner(avaliacao_id)")
      .eq("lotes_ocr.avaliacao_id", data.avaliacaoId);

    const byAluno = new Map<string, { acertos: number; total: number; status: string }>();
    for (const c of cartoes ?? []) {
      if (!c.aluno_id) continue;
      // Mantém o mais recente (último vence)
      byAluno.set(c.aluno_id, {
        acertos: c.acertos ?? 0,
        total: c.total ?? aval.num_questoes,
        status: c.status,
      });
    }

    const rows = (alunos ?? []).map((a) => {
      const r = byAluno.get(a.id);
      const total = r?.total ?? aval.num_questoes;
      const acertos = r?.acertos ?? 0;
      const pct = r && total > 0 ? Math.round((acertos / total) * 1000) / 10 : null;
      return {
        Aluno: a.nome,
        Matricula: a.matricula ?? "",
        Turma: a.turma ?? "",
        Acertos: r ? acertos : "",
        Total: total,
        "Percentual (%)": pct ?? "",
        Status: r?.status ?? "sem cartão",
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 30 }, { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Notas");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
    const base64 = Buffer.from(buf).toString("base64");
    const safe = aval.titulo.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 60);
    return { base64, filename: `notas-${safe}.xlsx` };
  });

/** Lista enxuta de avaliações da escola ativa (para a tela /gabaritos). */
export const listarAvaliacoesParaGabarito = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: prof } = await supabase
      .from("profiles")
      .select("escola_ativa_id")
      .eq("user_id", userId)
      .maybeSingle();
    const escolaId = prof?.escola_ativa_id;
    if (!escolaId) return { avaliacoes: [] as Array<{ id: string; titulo: string; disciplina: string; num_questoes: number; data: string; gabarito_count: number }> };

    const { data: avals, error } = await supabase
      .from("avaliacoes")
      .select("id, titulo, disciplina, num_questoes, data, gabaritos(id)")
      .eq("escola_id", escolaId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return {
      avaliacoes: (avals ?? []).map((a) => ({
        id: a.id,
        titulo: a.titulo,
        disciplina: a.disciplina,
        num_questoes: a.num_questoes,
        data: a.data,
        gabarito_count: Array.isArray(a.gabaritos) ? a.gabaritos.length : 0,
      })),
    };
  });
