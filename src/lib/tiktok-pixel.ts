/**
 * Utilitários para o TikTok Pixel
 *
 * Uso:
 *   import { ttqTrack, ttqPage, ttqIdentify } from '@/lib/tiktok-pixel';
 *   ttqTrack('CompletePayment', { content_id: 'prod-123', value: 29.90, currency: 'BRL' });
 *
 * Regras implementadas (alinhadas à documentação oficial do TikTok Pixel):
 *   - ttq.identify() envia email, phone_number e external_id hasheados com SHA-256.
 *   - Eventos de e-commerce são normalizados para o formato contents: [...].
 */

import {
  hashIdentifyData,
  normalizeEmail,
  normalizePhone,
  normalizeExternalId,
  sha256,
} from './pixel-hash';

/** Verifica se o TikTok Pixel está carregado e disponível (com métodos prontos) */
function isTiktokAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  const ttq = (window as unknown as Record<string, unknown>).ttq;
  if (!ttq) return false;
  // O ttq começa como array vazio; só está "pronto" quando track é uma função
  return typeof (ttq as Record<string, unknown>).track === 'function';
}

/** Log de debug apenas em development */
function pixelLog(message: string): void {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log(`[TikTok Pixel] ${message}`);
  }
}

/** Tipos de parâmetros de e-commerce que o TikTok espera */
export interface TikTokEventParams {
  content_id?: string;
  content_type?: string;
  content_name?: string;
  value?: number;
  currency?: string;
  contents?: Array<{
    content_id?: string;
    content_type?: string;
    content_name?: string;
    quantity?: number;
    price?: number;
  }>;
  [key: string]: unknown;
}

/**
 * Normaliza eventos de e-commerce para o formato oficial do TikTok Pixel.
 *
 * Documentação oficial espera:
 *   contents: [{ content_id, content_type, content_name }]
 *   value
 *   currency
 *
 * A implementação anterior enviava flat:
 *   { content_id, content_type, content_name, value, currency }
 *
 * Esta função converte o formato legado automaticamente, mantendo compatibilidade
 * com todas as chamadas existentes no código.
 */
function normalizeTikTokParams(
  params?: Record<string, unknown>
): Record<string, unknown> {
  if (!params) return {};

  const normalized: TikTokEventParams = { ...params };

  // Se já tem contents array, assume que está no formato novo e retorna como está
  if (Array.isArray(normalized.contents)) {
    return normalized as Record<string, unknown>;
  }

  // Converte formato flat para contents array
  const hasEcommerceFields =
    normalized.content_id || normalized.content_type || normalized.content_name;

  if (hasEcommerceFields) {
    normalized.contents = [
      {
        content_id: normalized.content_id,
        content_type: normalized.content_type,
        content_name: normalized.content_name,
        quantity: 1,
      },
    ];
  }

  return normalized as Record<string, unknown>;
}

/**
 * Dispara um evento de tracking no TikTok Pixel.
 * Se o pixel não estiver carregado, falha silenciosamente (use pixel-queue.ts para garantia).
 */
export function ttqTrack(
  eventName: string,
  params?: Record<string, unknown>
): boolean {
  if (!isTiktokAvailable()) {
    pixelLog(`⏸️ NÃO disparado "${eventName}" — pixel ainda carregando`);
    return false;
  }

  try {
    const ttq = (window as unknown as Record<string, unknown>).ttq as {
      track: (event: string, params?: Record<string, unknown>) => void;
    };
    // TikTok exige objeto (mesmo vazio) — undefined envia evento vazio
    ttq.track(eventName, normalizeTikTokParams(params));
    pixelLog(`✅ Disparado "${eventName}"`);
    return true;
  } catch (err) {
    pixelLog(`❌ Erro ao disparar "${eventName}": ${err}`);
    return false;
  }
}

/** Dispara manualmente um PageView no TikTok Pixel. */
export function ttqPage(): boolean {
  if (!isTiktokAvailable()) {
    pixelLog('⏸️ NÃO disparou PageView — pixel ainda carregando');
    return false;
  }

  try {
    const ttq = (window as unknown as Record<string, unknown>).ttq as {
      page: () => void;
    };
    ttq.page();
    pixelLog('✅ Disparou PageView');
    return true;
  } catch (err) {
    pixelLog(`❌ Erro ao disparar PageView: ${err}`);
    return false;
  }
}

/** Identifica um usuário no TikTok Pixel (advanced matching) com dados hasheados. */
export async function ttqIdentify(
  email?: string | null,
  phone?: string | null,
  externalId?: string | null
): Promise<boolean> {
  if (!isTiktokAvailable()) {
    pixelLog('⏸️ NÃO disparou identify — pixel ainda carregando');
    return false;
  }

  try {
    const ttq = (window as unknown as Record<string, unknown>).ttq as {
      identify: (params: Record<string, unknown>) => void;
    };

    const normalized = {
      email: normalizeEmail(email),
      phone: normalizePhone(phone),
      externalId: normalizeExternalId(externalId),
    };

    // Só faz hash se houver dados; campos vazios permanecem null
    const hashed = await hashIdentifyData(normalized);

    const params: Record<string, unknown> = {};
    if (hashed.email) params.email = hashed.email;
    if (hashed.phone) params.phone_number = hashed.phone;
    if (hashed.externalId) params.external_id = hashed.externalId;

    if (Object.keys(params).length > 0) {
      ttq.identify(params);
      pixelLog('✅ Disparou identify (hasheado)');
      return true;
    }
    return false;
  } catch (err) {
    pixelLog(`❌ Erro ao disparar identify: ${err}`);
    return false;
  }
}

/**
 * Versão síncrona de identify que faz hash de forma fire-and-forget.
 * Útil para callers que não podem esperar uma Promise (ex: dentro de useEffect
 * ou callbacks que não são async).
 *
 * Retorna true imediatamente se houver dados para enviar, mas o envio real
 * acontece de forma assíncrona.
 */
export function ttqIdentifySync(
  email?: string | null,
  phone?: string | null,
  externalId?: string | null
): boolean {
  if (!isTiktokAvailable()) {
    pixelLog('⏸️ NÃO disparou identify — pixel ainda carregando');
    return false;
  }

  const normalized = {
    email: normalizeEmail(email),
    phone: normalizePhone(phone),
    externalId: normalizeExternalId(externalId),
  };

  if (!normalized.email && !normalized.phone && !normalized.externalId) {
    return false;
  }

  // Fire-and-forget: faz o hash e envia em background
  hashIdentifyData(normalized)
    .then((hashed) => {
      const ttq = (window as unknown as Record<string, unknown>).ttq as {
        identify: (params: Record<string, unknown>) => void;
      };
      const params: Record<string, unknown> = {};
      if (hashed.email) params.email = hashed.email;
      if (hashed.phone) params.phone_number = hashed.phone;
      if (hashed.externalId) params.external_id = hashed.externalId;

      if (Object.keys(params).length > 0) {
        ttq.identify(params);
        pixelLog('✅ Disparou identify (hasheado, async)');
      }
    })
    .catch((err) => {
      pixelLog(`❌ Erro ao hashear identify: ${err}`);
    });

  return true;
}

// Re-exporta sha256 para conveniência de callers que precisam de hash manual
export { sha256 };
