/**
 * Disparo de eventos de marco do Meta Pixel.
 *
 * Garante que cada evento seja enviado apenas uma vez por usuário,
 * usando localStorage como guarda. Quando um marco é atingido,
 * verifica se o outro marco já existe para disparar QualifiedCreator.
 */

import { trackOrQueue } from './pixel-queue';
import { getProfile, getLinks } from './api';

const STORAGE_PREFIX = 'lp_pixel_milestone_';

const MilestoneKeys = {
  linkPaidCreated: (userId: string) => `${STORAGE_PREFIX}linkpaid_${userId}`,
  paymentConfigured: (userId: string) => `${STORAGE_PREFIX}payment_${userId}`,
  qualifiedCreator: (userId: string) => `${STORAGE_PREFIX}qualified_${userId}`,
};

function wasTracked(key: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function markTracked(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, '1');
  } catch {
    // ignore
  }
}

function hasPaymentConfigured(profile: any): boolean {
  if (!profile) return false;
  return (
    !!profile.pixKey ||
    !!profile.mercadoPagoConfigured ||
    profile.activePaymentMethod === 'pix_direct' ||
    profile.activePaymentMethod === 'mercadopago'
  );
}

function hasPaidLink(links: any[]): boolean {
  if (!Array.isArray(links)) return false;
  return links.some(
    (link) =>
      link.template === 'paid_access' || link.template === 'digital_product',
  );
}

/**
 * Dispara LinkPaidCreated quando o usuário cria seu primeiro Link Pago.
 * Se o pagamento já estiver configurado, dispara QualifiedCreator em sequência.
 */
export async function trackLinkPaidCreated(
  userId: string,
  price?: number,
): Promise<void> {
  if (!userId) return;

  const key = MilestoneKeys.linkPaidCreated(userId);
  if (wasTracked(key)) return;

  trackOrQueue('meta', 'LinkPaidCreated', {
    content_name: 'First Paid Link',
    value: price || 0,
    currency: 'BRL',
  });

  markTracked(key);

  try {
    const profile = await getProfile();
    if (hasPaymentConfigured(profile)) {
      await trackQualifiedCreator(userId);
    }
  } catch {
    // ignore — tracking não deve quebrar fluxo
  }
}

/**
 * Dispara PaymentConfigured quando o usuário configura pagamento pela primeira vez.
 * Se já existir um Link Pago, dispara QualifiedCreator em sequência.
 */
export async function trackPaymentConfigured(
  userId: string,
  method: 'pix' | 'mercadopago',
): Promise<void> {
  if (!userId) return;

  const key = MilestoneKeys.paymentConfigured(userId);
  if (wasTracked(key)) return;

  trackOrQueue('meta', 'PaymentConfigured', {
    payment_method: method,
  });

  markTracked(key);

  try {
    const links = await getLinks();
    if (hasPaidLink(links)) {
      await trackQualifiedCreator(userId);
    }
  } catch {
    // ignore
  }
}

/**
 * Dispara QualifiedCreator quando o usuário completou os 3 marcos:
 * cadastro + Link Pago + pagamento configurado.
 */
export async function trackQualifiedCreator(userId: string): Promise<void> {
  if (!userId) return;

  const key = MilestoneKeys.qualifiedCreator(userId);
  if (wasTracked(key)) return;

  trackOrQueue('meta', 'QualifiedCreator');
  markTracked(key);
}
