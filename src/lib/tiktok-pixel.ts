/**
 * Utilitários para o TikTok Pixel
 * Segue o mesmo padrão do gtag para Google Analytics
 *
 * Uso:
 *   import { ttqTrack, ttqPage } from '@/lib/tiktok-pixel';
 *   ttqTrack('CompletePayment', { content_id: 'prod-123', value: 29.90, currency: 'BRL' });
 *   ttqPage(); // dispara PageView manualmente (o layout.tsx já dispara automaticamente no carregamento)
 */

/** Tipos de eventos padrão suportados pelo TikTok Pixel */
export type TiktokEventName =
  | 'PageView'
  | 'CompleteRegistration'
  | 'CompletePayment'
  | 'AddToCart'
  | 'InitiateCheckout'
  | 'Purchase'
  | 'ViewContent'
  | 'Search'
  | 'AddPaymentInfo'
  | 'Contact'
  | 'SubmitForm'
  | 'Subscribe'
  | string;

/** Propriedades comuns de eventos do TikTok Pixel */
export interface TiktokEventParams {
  content_id?: string;
  content_type?: string;
  content_name?: string;
  content_category?: string;
  value?: number;
  currency?: string;
  num_items?: number;
  search_string?: string;
  [key: string]: unknown;
}

/** Verifica se o TikTok Pixel está carregado e disponível */
function isTiktokAvailable(): boolean {
  return typeof window !== 'undefined' && !!(window as unknown as Record<string, unknown>).ttq;
}

/**
 * Dispara um evento de tracking no TikTok Pixel.
 * Silenciosamente falha se o pixel não estiver carregado (ex: sem NEXT_PUBLIC_TIKTOK_PIXEL_ID).
 */
export function ttqTrack(
  eventName: TiktokEventName,
  params?: TiktokEventParams
): void {
  if (!isTiktokAvailable()) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.warn(`[TikTok Pixel] Tentativa de track("${eventName}") mas o pixel não está carregado.`);
    }
    return;
  }

  try {
    const ttq = (window as unknown as Record<string, unknown>).ttq as {
      track: (event: string, params?: TiktokEventParams) => void;
    };
    ttq.track(eventName, params);
  } catch {
    // Silenciosamente ignora erros de tracking para não quebrar a aplicação
  }
}

/**
 * Dispara manualmente um PageView no TikTok Pixel.
 * O layout.tsx já dispara PageView automaticamente no carregamento inicial,
 * mas pode ser útil em navegações client-side (SPA-like).
 */
export function ttqPage(): void {
  if (!isTiktokAvailable()) return;

  try {
    const ttq = (window as unknown as Record<string, unknown>).ttq as {
      page: () => void;
    };
    ttq.page();
  } catch {
    // Silenciosamente ignora
  }
}

/**
 * Identifica um usuário no TikTok Pixel (advanced matching).
 * Use com cuidado e apenas com consentimento do usuário (LGPD/GDPR).
 */
export function ttqIdentify(
  email?: string | null,
  phone?: string | null,
  externalId?: string | null
): void {
  if (!isTiktokAvailable()) return;

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
    }
  } catch {
    // Silenciosamente ignora
  }
}
