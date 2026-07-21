/**
 * Utilitários para o Meta (Facebook) Pixel
 *
 * Advanced Matching: email, telefone e external_id são normalizados e
 * hasheados com SHA-256 no client side, conforme recomendação oficial do Meta.
 */

import {
  sha256,
  normalizeEmail,
  normalizePhone,
  normalizeExternalId,
} from './pixel-hash';

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

/**
 * Dados de atribuição do Meta capturados no browser (fbc/fbp/userAgent).
 * Enviados ao backend na criação do pagamento para que o evento Purchase
 * server-side (Conversions API) tenha a mesma atribuição do pixel.
 */
export function getMetaTrackingParams(): {
  fbc?: string;
  fbp?: string;
  clientUserAgent?: string;
} {
  if (typeof window === 'undefined') return {};
  const fbc = getFbc();
  const fbp = getFbp();
  return {
    ...(fbc && { fbc }),
    ...(fbp && { fbp }),
    ...(navigator?.userAgent && { clientUserAgent: navigator.userAgent }),
  };
}

/** Infere país */
function inferCountry(): string | undefined {
  if (typeof navigator === 'undefined') return undefined;
  const locale = navigator.language || (navigator as unknown as Record<string, string>).userLanguage;
  if (!locale) return undefined;
  const parts = locale.split('-');
  return parts.length > 1 ? parts[1].toUpperCase() : parts[0].toUpperCase();
}

/**
 * Monta objeto de Advanced Matching.
 *
 * Normaliza (mas NÃO hasheia) email, telefone e external_id.
 * O hash é feito dentro de fbqIdentify para garantir que os dados só sejam
 * enviados para o pixel já ofuscados.
 */
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
  if (user?.email) data.em = normalizeEmail(user.email) || undefined;
  if (user?.phone) data.ph = normalizePhone(user.phone) || undefined;
  if (user?.id) data.external_id = normalizeExternalId(user.id) || undefined;
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
 *
 * eventID: identificador único para deduplicação com o evento equivalente
 * enviado pelo servidor via Conversions API (mesmo event_name + event_id).
 */
export function fbqTrack(
  eventName: string,
  params?: Record<string, unknown>,
  eventID?: string
): boolean {
  if (!isFbqAvailable()) {
    pixelLog(`⏸️ NÃO disparado "${eventName}" — pixel ainda carregando`);
    return false;
  }

  try {
    const fbq = (window as unknown as Record<string, unknown>).fbq as (
      cmd: string,
      event: string,
      params?: Record<string, unknown>,
      options?: { eventID?: string }
    ) => void;

    const options = eventID ? { eventID } : undefined;
    const isStandard = STANDARD_EVENTS.has(eventName);
    if (isStandard) {
      fbq('track', eventName, params, options);
    } else {
      fbq('trackCustom', eventName, params, options);
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

/**
 * Advanced Matching.
 *
 * Hasheia com SHA-256 os campos sensíveis (em, ph, external_id) antes de
 * enviar para o fbq('init'). Campos não sensíveis (fbc, fbp, country, etc.)
 * são enviados em texto puro.
 */
export async function fbqIdentify(data: MetaAdvancedMatchingData): Promise<boolean> {
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

    if (Object.keys(clean).length === 0) return false;

    // Hasheia campos sensíveis de forma assíncrona
    const [hashedEm, hashedPh, hashedExternalId] = await Promise.all([
      clean.em ? sha256(clean.em as string) : Promise.resolve(null),
      clean.ph ? sha256(clean.ph as string) : Promise.resolve(null),
      clean.external_id ? sha256(clean.external_id as string) : Promise.resolve(null),
    ]);

    if (hashedEm) clean.em = hashedEm;
    if (hashedPh) clean.ph = hashedPh;
    if (hashedExternalId) clean.external_id = hashedExternalId;

    fbq('init', pixelId, clean);
    pixelLog('✅ Disparou identify (hasheado)');
    return true;
  } catch (err) {
    pixelLog(`❌ Erro ao disparar identify: ${err}`);
    return false;
  }
}

/**
 * Versão síncrona de fbqIdentify para callers que não podem esperar.
 * Faz hash e envio de forma fire-and-forget.
 */
export function fbqIdentifySync(data: MetaAdvancedMatchingData): boolean {
  if (!isFbqAvailable()) {
    pixelLog('⏸️ NÃO disparou identify — pixel ainda carregando');
    return false;
  }

  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined && v !== null && v !== '') clean[k] = v;
  }

  if (Object.keys(clean).length === 0) return false;

  fbqIdentify(data).catch((err) => {
    pixelLog(`❌ Erro ao hashear identify: ${err}`);
  });

  return true;
}
