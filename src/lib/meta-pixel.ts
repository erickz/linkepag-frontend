/**
 * Utilitários para o Meta (Facebook) Pixel
 * Segue o mesmo padrão do gtag (Google Analytics) e ttq (TikTok Pixel)
 *
 * Uso:
 *   import { fbqTrack, fbqPage, fbqIdentify, buildMetaAdvancedMatchingData } from '@/lib/meta-pixel';
 *   fbqTrack('Purchase', { value: 29.90, currency: 'BRL', content_ids: ['prod-123'] });
 *   fbqPage(); // PageView manual
 *   const am = buildMetaAdvancedMatchingData({ email: 'a@b.com', fullName: 'João Silva', id: '123' });
 *   fbqIdentify(am);
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

/** Dados de Advanced Matching (AAM) para o Meta Pixel */
export interface MetaAdvancedMatchingData {
  em?: string;              // Email (normalizado: lowercase, sem espaços)
  fn?: string;              // First name
  ln?: string;              // Last name
  ph?: string;              // Phone (apenas dígitos)
  external_id?: string;     // Identificador externo (user.id)
  fbc?: string;             // Cookie de ID de clique (_fbc)
  fbp?: string;             // Cookie de ID do navegador (_fbp)
  country?: string;         // País (código ISO, ex: 'BR')
  client_user_agent?: string; // User agent
  // Nota: client_ip_address é capturado automaticamente pelo Meta no lado do servidor
}

/** Verifica se o Meta Pixel (fbq) está carregado e disponível */
function isFbqAvailable(): boolean {
  return typeof window !== 'undefined' && !!(window as unknown as Record<string, unknown>).fbq;
}

/**
 * Lê o valor de um cookie pelo nome.
 */
function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : undefined;
}

/**
 * Lê o parâmetro _fbc da URL (click ID do Meta Ads) ou do cookie _fbc.
 */
function getFbc(): string | undefined {
  if (typeof window === 'undefined') return undefined;

  // 1. Tenta o cookie _fbc
  const cookieFbc = getCookie('_fbc');
  if (cookieFbc) return cookieFbc;

  // 2. Tenta o parâmetro URL _fbc
  const urlParams = new URLSearchParams(window.location.search);
  const urlFbc = urlParams.get('_fbc');
  if (urlFbc) return urlFbc;

  // 3. Tenta extrair fbclid da URL e construir _fbc
  const fbclid = urlParams.get('fbclid');
  if (fbclid) {
    const version = 'fb.1';
    const timestamp = String(Math.floor(Date.now() / 1000));
    return `${version}.${timestamp}.${fbclid}`;
  }

  return undefined;
}

/**
 * Lê o cookie _fbp (Facebook Browser ID).
 */
function getFbp(): string | undefined {
  return getCookie('_fbp');
}

/**
 * Infere o país a partir do locale do navegador.
 */
function inferCountry(): string | undefined {
  if (typeof navigator === 'undefined') return undefined;
  const locale = navigator.language || (navigator as unknown as Record<string, string>).userLanguage;
  if (!locale) return undefined;
  const parts = locale.split('-');
  return parts.length > 1 ? parts[1].toUpperCase() : parts[0].toUpperCase();
}

/**
 * Monta o objeto completo de Advanced Matching combinando dados do navegador
 * com dados do usuário.
 *
 * @param user - Dados do usuário logado
 * @returns Objeto pronto para passar no fbqIdentify()
 */
export function buildMetaAdvancedMatchingData(user?: {
  email?: string | null;
  fullName?: string | null;
  id?: string | null;
  phone?: string | null;
}): MetaAdvancedMatchingData {
  const data: MetaAdvancedMatchingData = {};

  // Dados do navegador (sempre disponíveis)
  data.fbc = getFbc();
  data.fbp = getFbp();
  data.client_user_agent = typeof navigator !== 'undefined' ? navigator.userAgent : undefined;
  data.country = inferCountry();

  // Dados do usuário
  if (user?.email) {
    data.em = user.email.toLowerCase().trim();
  }
  if (user?.phone) {
    data.ph = user.phone.replace(/\D/g, '');
  }
  if (user?.id) {
    data.external_id = user.id;
  }
  if (user?.fullName) {
    const parts = user.fullName.trim().split(/\s+/);
    if (parts.length > 0) data.fn = parts[0];
    if (parts.length > 1) data.ln = parts.slice(1).join(' ');
  }

  return data;
}

/**
 * Dispara um evento de tracking no Meta Pixel.
 * Silenciosamente falha se o pixel não estiver carregado.
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
    // Silenciosamente ignora erros de tracking
  }
}

/**
 * Dispara manualmente um PageView no Meta Pixel.
 */
export function fbqPage(): void {
  fbqTrack('PageView');
}

/**
 * Identifica um usuário no Meta Pixel via Advanced Matching (AAM).
 * Reexecuta fbq('init') com os dados enriquecidos para melhorar o match rate.
 *
 * Use apenas com consentimento do usuário (LGPD/GDPR).
 */
export function fbqIdentify(data: MetaAdvancedMatchingData): void {
  if (!isFbqAvailable()) return;

  try {
    const fbq = (window as unknown as Record<string, unknown>).fbq as (
      cmd: 'init',
      pixelId: string,
      data?: Record<string, unknown>
    ) => void;

    const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
    if (!pixelId) return;

    // Remove campos undefined para não poluir o payload
    const cleanData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null && value !== '') {
        cleanData[key] = value;
      }
    }

    if (Object.keys(cleanData).length > 0) {
      fbq('init', pixelId, cleanData);
    }
  } catch {
    // Silenciosamente ignora
  }
}

/** Eventos padrão (standard events) do Meta Pixel */
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
