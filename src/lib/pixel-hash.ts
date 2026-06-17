/**
 * Utilitário de hash SHA-256 para dados de Advanced Matching de pixels.
 *
 * Tanto o Meta Pixel quanto o TikTok Pixel recomendam/enviam dados
 * pessoais (email, telefone, external_id) hasheados com SHA-256 no
 * client side para melhorar privacy compliance (LGPD/GDPR) e match rate.
 *
 * Usa a Web Crypto API nativa do navegador (disponível em todos os
 * browsers modernos, incluindo Safari 11+).
 */

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Hasheia uma string com SHA-256.
 * Retorna null se o ambiente não suportar crypto.subtle (SSR/ambientes antigos).
 */
export async function sha256(input: string | null | undefined): Promise<string | null> {
  if (!input) return null;
  if (typeof window === 'undefined' || !window.crypto?.subtle) return null;

  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    return bufferToHex(hashBuffer);
  } catch {
    return null;
  }
}

/**
 * Normaliza um email para hashing:
 * - remove espaços
 * - converte para minúsculas
 */
export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  return normalized || null;
}

/**
 * Normaliza um telefone para hashing:
 * - remove tudo que não for dígito
 */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const normalized = phone.replace(/\D/g, '');
  return normalized || null;
}

/**
 * Normaliza um external_id para hashing:
 * - remove espaços
 */
export function normalizeExternalId(id: string | null | undefined): string | null {
  if (!id) return null;
  const normalized = id.trim();
  return normalized || null;
}

/**
 * Hasheia email, telefone e external_id de forma assíncrona.
 * Retorna um objeto com os campos hasheados (ou null quando não houver input).
 */
export async function hashIdentifyData(data: {
  email?: string | null;
  phone?: string | null;
  externalId?: string | null;
}): Promise<{
  email: string | null;
  phone: string | null;
  externalId: string | null;
}> {
  const [email, phone, externalId] = await Promise.all([
    sha256(normalizeEmail(data.email)),
    sha256(normalizePhone(data.phone)),
    sha256(normalizeExternalId(data.externalId)),
  ]);
  return { email, phone, externalId };
}
