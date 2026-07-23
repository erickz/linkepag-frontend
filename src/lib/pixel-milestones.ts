/**
 * Disparo de eventos de marco do Meta Pixel.
 *
 * Garante que cada evento seja enviado apenas uma vez por usuário,
 * usando localStorage como guarda. Quando um marco é atingido,
 * verifica se o outro marco já existe para disparar QualifiedCreator.
 * Também verifica no carregamento da app se o usuário já é qualificado.
 *
 * As marcas de localStorage expiram em 24h — se o evento não foi realmente
 * enviado (ex.: pixel bloqueado, falha de rede), a próxima sessão tenta
 * novamente em vez de bloquear o disparo para sempre.
 */

import { trackOrQueue } from './pixel-queue';
import { getProfile, getLinks } from './api';

const STORAGE_PREFIX = 'lp_pixel_milestone_';
const MILESTONE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

const MilestoneKeys = {
  linkPaidCreated: (userId: string) => `${STORAGE_PREFIX}linkpaid_${userId}`,
  paymentConfigured: (userId: string) => `${STORAGE_PREFIX}payment_${userId}`,
  qualifiedCreator: (userId: string) => `${STORAGE_PREFIX}qualified_${userId}`,
};

function wasTracked(key: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return false;

    // Legado: valor '1' (sem timestamp) é considerado expirado para permitir retry
    if (raw === '1') return false;

    const timestamp = Number(raw);
    if (!Number.isFinite(timestamp)) return false;

    return Date.now() - timestamp < MILESTONE_TTL_MS;
  } catch {
    return false;
  }
}

function markTracked(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, String(Date.now()));
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
 * Em seguida, verifica se o usuário já se tornou qualificado.
 */
export async function trackLinkPaidCreated(
  userId: string,
  price?: number,
): Promise<void> {
  if (!userId) return;

  const key = MilestoneKeys.linkPaidCreated(userId);
  if (!wasTracked(key)) {
    trackOrQueue('meta', 'LinkPaidCreated', {
      content_name: 'First Paid Link',
      value: price || 0,
      currency: 'BRL',
    });
    markTracked(key);
  }

  await checkAndTrackQualifiedCreator(userId);
}

/**
 * Dispara PaymentConfigured quando o usuário configura pagamento pela primeira vez.
 * Em seguida, verifica se o usuário já se tornou qualificado.
 */
export async function trackPaymentConfigured(
  userId: string,
  method: 'pix' | 'mercadopago',
): Promise<void> {
  if (!userId) return;

  const key = MilestoneKeys.paymentConfigured(userId);
  if (!wasTracked(key)) {
    trackOrQueue('meta', 'PaymentConfigured', {
      payment_method: method,
    });
    markTracked(key);
  }

  await checkAndTrackQualifiedCreator(userId);
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

  trackOrQueue('meta', 'QualifiedCreator', {});
  markTracked(key);
}
