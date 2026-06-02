/**
 * Utilitários para o Meta (Facebook) Pixel
 * Segue o mesmo padrão do gtag (Google Analytics) e ttq (TikTok Pixel)
 *
 * Uso:
 *   import { fbqTrack, fbqPage } from '@/lib/meta-pixel';
 *   fbqTrack('Purchase', { value: 29.90, currency: 'BRL', content_ids: ['prod-123'] });
 *   fbqPage(); // dispara PageView manualmente (o layout.tsx já dispara automaticamente no carregamento)
 */

/** Tipos de eventos padrão suportados pelo Meta Pixel */
export type MetaPixelEventName =
  | 'PageView'
  | 'AddPaymentInfo'
  | 'AddToCart'
  | 'CompleteRegistration'
  | 'Contact'
  | 'FindLocation'
  | 'InitiateCheckout'
  | 'Lead'
  | 'Purchase'
  | 'Schedule'
  | 'Search'
  | 'StartTrial'
  | 'SubmitApplication'
  | 'Subscribe'
  | 'ViewContent'
  | string;

/** Propriedades comuns de eventos do Meta Pixel (standard events) */
export interface MetaPixelEventParams {
  content_ids?: string[];
  content_name?: string;
  content_type?: string;
  contents?: Array<{
    id: string;
    quantity: number;
    item_price?: number;
  }>;
  currency?: string;
  value?: number;
  num_items?: number;
  status?: boolean;
  search_string?: string;
  [key: string]: unknown;
}

/** Verifica se o Meta Pixel (fbq) está carregado e disponível */
function isFbqAvailable(): boolean {
  return typeof window !== 'undefined' && !!(window as unknown as Record<string, unknown>).fbq;
}

/**
 * Dispara um evento de tracking no Meta Pixel.
 * Silenciosamente falha se o pixel não estiver carregado (ex: sem NEXT_PUBLIC_META_PIXEL_ID).
 */
export function fbqTrack(
  eventName: MetaPixelEventName,
  params?: MetaPixelEventParams
): void {
  if (!isFbqAvailable()) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.warn(`[Meta Pixel] Tentativa de track("${eventName}") mas o pixel não está carregado.`);
    }
    return;
  }

  try {
    const fbq = (window as unknown as Record<string, unknown>).fbq as (
      cmd: 'track' | 'trackCustom',
      event: string,
      params?: MetaPixelEventParams
    ) => void;

    if (eventName === 'PageView' || isStandardEvent(eventName)) {
      fbq('track', eventName, params);
    } else {
      fbq('trackCustom', eventName, params);
    }
  } catch {
    // Silenciosamente ignora erros de tracking para não quebrar a aplicação
  }
}

/**
 * Dispara manualmente um PageView no Meta Pixel.
 * O layout.tsx já dispara PageView automaticamente no carregamento inicial,
 * mas pode ser útil em navegações client-side (SPA-like) ou quando
 * o conteúdo da página muda significativamente sem reload.
 */
export function fbqPage(): void {
  fbqTrack('PageView');
}

/**
 * Identifica um usuário no Meta Pixel para advanced matching.
 * Use com cuidado e apenas com consentimento do usuário (LGPD/GDPR).
 */
export function fbqIdentify(
  email?: string | null,
  phone?: string | null,
  externalId?: string | null,
  firstName?: string | null,
  lastName?: string | null
): void {
  if (!isFbqAvailable()) return;

  try {
    const fbq = (window as unknown as Record<string, unknown>).fbq as (
      cmd: 'init',
      pixelId: string,
      data?: Record<string, unknown>
    ) => void;

    const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
    if (!pixelId) return;

    const data: Record<string, unknown> = {};
    if (email) data.em = email;
    if (phone) data.ph = phone;
    if (firstName) data.fn = firstName;
    if (lastName) data.ln = lastName;
    if (externalId) data.external_id = externalId;

    if (Object.keys(data).length > 0) {
      fbq('init', pixelId, data);
    }
  } catch {
    // Silenciosamente ignora
  }
}

/** Eventos padrão (standard events) do Meta Pixel — usam fbq('track', ...) */
const STANDARD_EVENTS = new Set<string>([
  'PageView',
  'AddPaymentInfo',
  'AddToCart',
  'CompleteRegistration',
  'Contact',
  'FindLocation',
  'InitiateCheckout',
  'Lead',
  'Purchase',
  'Schedule',
  'Search',
  'StartTrial',
  'SubmitApplication',
  'Subscribe',
  'ViewContent',
]);

function isStandardEvent(event: string): boolean {
  return STANDARD_EVENTS.has(event);
}
