import { createHmac, timingSafeEqual } from "crypto";

/**
 * QR payload assinado por aluno/avaliação. Formato JSON compacto:
 *   { v:1, e:escolaId, a:avaliacaoId, l:alunoId, s:signatureBase64Url }
 *
 * A assinatura é HMAC-SHA256 dos campos `e.a.l` usando uma chave derivada do
 * SUPABASE_SERVICE_ROLE_KEY (server-only). Isso garante que QRs falsificados ou
 * de outra escola sejam rejeitados pelo pipeline OCR.
 */

const NAMESPACE = "edulinguas-qr-v1";

function getKey(): string {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!k) throw new Error("SUPABASE_SERVICE_ROLE_KEY ausente — chave HMAC indisponível");
  return `${NAMESPACE}:${k}`;
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function signQR(escolaId: string, avaliacaoId: string, alunoId: string): string {
  const msg = `${escolaId}.${avaliacaoId}.${alunoId}`;
  const sig = createHmac("sha256", getKey()).update(msg).digest();
  // 16 bytes (24 chars base64url) — pequeno o suficiente pra cabter em QR de baixa densidade
  return b64url(sig.subarray(0, 16));
}

export function buildQRPayload(escolaId: string, avaliacaoId: string, alunoId: string): string {
  return JSON.stringify({
    v: 1,
    e: escolaId,
    a: avaliacaoId,
    l: alunoId,
    s: signQR(escolaId, avaliacaoId, alunoId),
  });
}

export type ParsedQR = {
  escolaId: string;
  avaliacaoId: string;
  alunoId: string;
};

/**
 * Recebe o conteúdo bruto lido do QR e retorna os IDs se a assinatura bater.
 * Retorna null se: payload inválido, schema errado, ou HMAC não confere.
 */
export function verifyQR(raw: string | null | undefined): ParsedQR | null {
  if (!raw) return null;
  let obj: { v?: number; e?: string; a?: string; l?: string; s?: string };
  try {
    obj = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!obj || obj.v !== 1 || !obj.e || !obj.a || !obj.l || !obj.s) return null;
  const expected = signQR(obj.e, obj.a, obj.l);
  try {
    const a = Buffer.from(obj.s);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return null;
    if (!timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return { escolaId: obj.e, avaliacaoId: obj.a, alunoId: obj.l };
}
