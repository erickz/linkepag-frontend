/**
 * Utilitários para o Meta (Facebook) Pixel
 */

/** Dados de Advanced Matching (AAM) para o Meta Pixel */
export interface MetaAdvancedMatchingData {
  em?: string;
  fn?: string;
  ln?: string;
  ph?: string;
  external_id?: string;
  fbc?: string;
  fbp?: string;
  country?: string;
  client_user_agent?: string;
}

/** Verifica se o Meta Pixel (fbq) está carregado e disponível */
function isFbqAvailable(): boolean {
  return typeof window !== 'undefined' && typeof (window as unknown as Record<string, unknown>).fbq === 'function';
}

/** Log de debug apenas em development */
function pixelLog(message: string): void {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log(`[Meta Pixel] ${message}`);
  }
}

/** Lê cookie */
function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : undefined;
}

/** Lê fbc (cookie ou URL) */
function getFbc(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const cookieFbc = getCookie('_fbc');
  if (cookieFbc) return cookieFbc;
  const fbclid = new URLSearchParams(window.location.search).get('fbclid');
  if (fbclid) return `fb.1.${Math.floor(Date.now() / 1000)}.${fbclid}`;
  return undefined;
}

/** Lê fbp */
function getFbp(): string | undefined {
  return getCookie('_fbp');
}

/** Infere país */
function inferCountry(): string | undefined {
  if (typeof navigator === 'undefined') return undefined;
  const locale = navigator.language || (navigator as unknown as Record<string, string>).userLanguage;
  if (!locale) return undefined;
  const parts = locale.split('-');
  return parts.length > 1 ? parts[1].toUpperCase() : parts[0].toUpperCase();
}

/** Monta objeto de Advanced Matching */
export function buildMetaAdvancedMatchingData(user?: {
  email?: string | null;
  fullName?: string | null;
  id?: string | null;
  phone?: string | null;
}): MetaAdvancedMatchingData {
  const data: MetaAdvancedMatchingData = {};
  data.fbc = getFbc();
  data.fbp = getFbp();
  data.client_user_agent = typeof navigator !== 'undefined' ? navigator.userAgent : undefined;
  data.country = inferCountry();
  if (user?.email) data.em = user.email.toLowerCase().trim();
  if (user?.phone) data.ph = user.phone.replace(/\D/g, '');
  if (user?.id) data.external_id = user.id;
  if (user?.fullName) {
    const parts = user.fullName.trim().split(/\s+/);
    if (parts.length > 0) data.fn = parts[0];
    if (parts.length > 1) data.ln = parts.slice(1).join(' ');
  }
  return data;
}

/** Eventos padrão do Meta Pixel */
const STANDARD_EVENTS = new Set([
  'PageView', 'AddPaymentInfo', 'AddToCart', 'CompleteRegistration', 'Contact',
  'FindLocation', 'InitiateCheckout', 'Lead', 'Purchase', 'Schedule',
  'Search', 'StartTrial', 'SubmitApplication', 'Subscribe', 'ViewContent',
]);

/**
 * Dispara um evento no Meta Pixel.
 * Retorna true se disparou, false se pixel não estava pronto.
 */
export function fbqTrack(
  eventName: string,
  params?: Record<string, unknown>
): boolean {
  if (!isFbqAvailable()) {
    pixelLog(`⏸️ NÃO disparado "${eventName}" — pixel ainda carregando`);
    return false;
  }

  try {
    const fbq = (window as unknown as Record<string, unknown>).fbq as (
      cmd: string, event: string, params?: Record<string, unknown>
    ) => void;

    const isStandard = STANDARD_EVENTS.has(eventName);
    if (isStandard) {
      fbq('track', eventName, params);
    } else {
      fbq('trackCustom', eventName, params);
    }
    pixelLog(`✅ Disparado "${eventName}" (${isStandard ? 'standard' : 'custom'})`);
    return true;
  } catch (err) {
    pixelLog(`❌ Erro ao disparar "${eventName}": ${err}`);
    return false;
  }
}

/** PageView manual */
export function fbqPage(): boolean {
  return fbqTrack('PageView');
}

/** Advanced Matching */
export function fbqIdentify(data: MetaAdvancedMatchingData): boolean {
  if (!isFbqAvailable()) {
    pixelLog('⏸️ NÃO disparou identify — pixel ainda carregando');
    return false;
  }

  try {
    const fbq = (window as unknown as Record<string, unknown>).fbq as (
      cmd: string, pixelId: string, data?: Record<string, unknown>
    ) => void;
    const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
    if (!pixelId) return false;

    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined && v !== null && v !== '') clean[k] = v;
    }

    if (Object.keys(clean).length > 0) {
      fbq('init', pixelId, clean);
      pixelLog('✅ Disparou identify');
      return true;
    }
    return false;
  } catch (err) {
    pixelLog(`❌ Erro ao disparar identify: ${err}`);
    return false;
  }
}
