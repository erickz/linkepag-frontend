/**
 * Disparo de eventos de marco do Meta Pixel.
 *
 * Garante que cada evento seja enviado apenas uma vez por usuário,
 * usando localStorage como guarda. Quando um marco é atingido,
 * verifica se o outro marco já existe para disparar QualifiedCreator.
 * Também verifica no carregamento da app se o usuário já é qualificado.
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

interface ProfileData {
  pixKey?: string | null;
  pixQRCodeImage?: string | null;
  pixConfigured?: boolean;
  mercadoPagoPublicKey?: string | null;
  mercadoPagoConfigured?: boolean;
  mpOAuthConnected?: boolean;
  activePaymentMethod?: string | null;
}

interface LinkData {
  template?: string;
}

interface LinksResponse {
  links?: LinkData[];
}

function hasPaymentConfigured(profile: ProfileData | null | undefined): boolean {
  if (!profile) return false;
  return (
    !!profile.pixKey ||
    !!profile.pixQRCodeImage ||
    profile.pixConfigured === true ||
    !!profile.mercadoPagoPublicKey ||
    profile.mercadoPagoConfigured === true ||
    profile.mpOAuthConnected === true ||
    profile.activePaymentMethod === 'pix_direct' ||
    profile.activePaymentMethod === 'mercadopago'
  );
}

function normalizeLinks(response: LinkData[] | LinksResponse | unknown): LinkData[] {
  if (Array.isArray(response)) return response;
  if (response && typeof response === 'object' && 'links' in response) {
    const withLinks = response as LinksResponse;
    if (Array.isArray(withLinks.links)) return withLinks.links;
  }
  return [];
}

function hasPaidLink(links: LinkData[] | LinksResponse | unknown): boolean {
  const normalized = normalizeLinks(links);
  return normalized.some(
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
 * Verifica no backend se o usuário já é um creator qualificado
 * (tem link pago + pagamento configurado) e dispara QualifiedCreator
 * caso ainda não tenha sido tracked. Usada no carregamento da app para
 * recuperar usuários que já atingiram ambos os marcos em sessões anteriores
 * ou em outros dispositivos.
 */
export async function checkAndTrackQualifiedCreator(
  userId: string,
): Promise<void> {
  if (!userId) return;

  const key = MilestoneKeys.qualifiedCreator(userId);
  if (wasTracked(key)) return;

  try {
    const [profile, linksResponse] = await Promise.all([
      getProfile(),
      getLinks(),
    ]);

    if (hasPaymentConfigured(profile) && hasPaidLink(linksResponse)) {
      await trackQualifiedCreator(userId);
    }
  } catch {
    // ignore — tracking não deve quebrar fluxo
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
