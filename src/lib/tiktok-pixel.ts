/**
 * Utilitários para o TikTok Pixel
 *
 * Uso:
 *   import { ttqTrack, ttqPage, ttqIdentify } from '@/lib/tiktok-pixel';
 *   ttqTrack('CompletePayment', { content_id: 'prod-123', value: 29.90, currency: 'BRL' });
 */

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
    ttq.track(eventName, params);
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

/** Identifica um usuário no TikTok Pixel (advanced matching). */
export function ttqIdentify(
  email?: string | null,
  phone?: string | null,
  externalId?: string | null
): boolean {
  if (!isTiktokAvailable()) {
    pixelLog('⏸️ NÃO disparou identify — pixel ainda carregando');
    return false;
  }

  try {
    const ttq = (window as unknown as Record<string, unknown>).ttq as {
      identify: (params: Record<string, unknown>) => void;
    };
    const params: Record<string, unknown> = {};
    if (email) params.email = email;
    if (phone) params.phone_number = phone;
    if (externalId) params.external_id = externalId;

    if (Object.keys(params).length > 0) {
      ttq.identify(params);
      pixelLog('✅ Disparou identify');
      return true;
    }
    return false;
  } catch (err) {
    pixelLog(`❌ Erro ao disparar identify: ${err}`);
    return false;
  }
}
