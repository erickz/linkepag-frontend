/**
 * Camada unificada de tracking para Meta (Facebook) e TikTok pixels.
 *
 * Centraliza o disparo de eventos para reduzir duplicação de código e
 * garantir que cada plataforma receba o formato esperado.
 *
 * Regras implementadas:
 *   - Meta Pixel: content_ids[], content_name, content_type, value, currency, num_items
 *   - TikTok Pixel: value, currency, contents[{content_id, content_type, content_name, quantity, price}]
 *   - Identify: email, telefone e external_id são hasheados com SHA-256 no client side
 */

import { trackOrQueue, identifyOrQueue } from './pixel-queue';

/** Parâmetros comuns para eventos de e-commerce (Purchase, InitiateCheckout, ViewContent) */
export interface EcommerceEventParams {
  contentId: string;
  contentName: string;
  value: number;
  contentType?: string;
  currency?: string;
  quantity?: number;
  /**
   * eventID para deduplicação browser/servidor (Meta Conversions API).
   * O backend envia o mesmo event_id ao confirmar o pagamento — o Meta
   * deduplica o par browser/servidor por (event_name, event_id).
   */
  eventId?: string;
}

/** Dados do usuário para identify/advanced matching */
export interface UserIdentifyData {
  email?: string | null;
  fullName?: string | null;
  id?: string | null;
  phone?: string | null;
}

const DEFAULT_CURRENCY = 'BRL';

/**
 * Dispara um evento de e-commerce em ambas as plataformas.
 *
 * Exemplos de eventName: 'Purchase', 'InitiateCheckout', 'ViewContent'
 */
export function trackEcommerceEvent(
  eventName: string,
  params: EcommerceEventParams
): void {
  const currency = params.currency || DEFAULT_CURRENCY;
  const quantity = params.quantity ?? 1;
  const contentType = params.contentType || 'product';
  const unitPrice = quantity > 0 ? params.value / quantity : params.value;

  // Meta Pixel (com eventID para dedup com o evento server-side da CAPI)
  trackOrQueue('meta', eventName, {
    content_ids: [params.contentId],
    content_name: params.contentName,
    content_type: contentType,
    value: params.value,
    currency,
    num_items: quantity,
  }, params.eventId);

  // TikTok Pixel — formato oficial contents[]
  trackOrQueue('tiktok', eventName, {
    value: params.value,
    currency,
    contents: [
      {
        content_id: params.contentId,
        content_name: params.contentName,
        content_type: contentType,
        quantity,
        price: unitPrice,
      },
    ],
  });
}

/**
 * Dispara um evento de conversão não-comercial em ambas as plataformas.
 *
 * Exemplos: 'CompleteRegistration', 'Login', 'Lead'
 */
export function trackConversion(
  eventName: string,
  options?: {
    contentName?: string;
    contentType?: string;
  }
): void {
  trackOrQueue('meta', eventName);

  if (options?.contentName || options?.contentType) {
    trackOrQueue('tiktok', eventName, {
      ...(options.contentName && { content_name: options.contentName }),
      ...(options.contentType && { content_type: options.contentType }),
    });
  } else {
    trackOrQueue('tiktok', eventName);
  }
}

/**
 * Identifica o usuário em ambas as plataformas para advanced matching.
 *
 * Dados sensíveis (email, telefone, external_id) são hasheados com SHA-256
 * antes de serem enviados.
 */
export function identifyUser(data: UserIdentifyData): void {
  const { email, fullName, id, phone } = data;

  const firstName = fullName?.trim().split(/\s+/)[0];
  const lastName = fullName?.trim().split(/\s+/).slice(1).join(' ') || undefined;

  // Meta Pixel AAM
  identifyOrQueue('meta', {
    ...(email && { em: email }),
    ...(firstName && { fn: firstName }),
    ...(lastName && { ln: lastName }),
    ...(phone && { ph: phone }),
    ...(id && { external_id: id }),
  }).catch(() => {
    // ignore — tracking não deve quebrar a UX
  });

  // TikTok Pixel identify
  identifyOrQueue('tiktok', {
    ...(email && { email }),
    ...(phone && { phone }),
    ...(id && { external_id: id }),
  }).catch(() => {
    // ignore
  });
}
