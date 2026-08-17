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
 *
 * Exceção: QualifiedCreator usa marca PERMANENTE + guarda em memória. É um
 * evento one-shot por usuário (espelha `qualifiedCreatorTrackedAt` no banco)
 * e compartilha o event_id `qualified-<userId>` com o envio server-side
 * (CAPI) — o Meta deduplica o par browser/servidor por (event_name, event_id).
 */

import { trackOrQueue } from './pixel-queue';
import { getProfile, getLinks } from './api';

const STORAGE_PREFIX = 'lp_pixel_milestone_';
const MILESTONE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

const MilestoneKeys = {
  linkCreated: (userId: string) => `${STORAGE_PREFIX}link_${userId}`,
  linkPaidCreated: (userId: string) => `${STORAGE_PREFIX}linkpaid_${userId}`,
  paymentConfigured: (userId: string) => `${STORAGE_PREFIX}payment_${userId}`,
  qualifiedCreator: (userId: string) => `${STORAGE_PREFIX}qualified_${userId}`,
  hasMonetizableAsset: (userId: string) => `${STORAGE_PREFIX}asset_${userId}`,
  qualifiedLead: (userId: string) => `${STORAGE_PREFIX}qualifiedlead_${userId}`,
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

/**
 * Verifica se a marca existe, sem aplicar TTL.
 * Usada por QualifiedCreator, que é one-shot por usuário: qualquer valor
 * gravado (inclusive o legado '1') significa que o evento já foi disparado.
 */
function wasTrackedEver(key: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

/**
 * Guarda em memória para QualifiedCreator.
 * Elimina a race condition entre chamadas assíncronas paralelas (ex.:
 * trackLinkCreated + trackLinkPaidCreated disparados juntos na criação de um
 * link pago, ou gatilho do onboarding + useAuth): ambas liam localStorage
 * antes de qualquer uma marcar e disparavam o evento duplicado.
 */
const qualifiedCreatorInFlight = new Set<string>();
const qualifiedCreatorDone = new Set<string>();

/** Mesmo event_id usado pelo backend (CAPI) — ver qualified-creator.service.ts */
function qualifiedCreatorEventId(userId: string): string {
  return `qualified-${userId}`;
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

function hasAnyLink(links: LinkData[] | LinksResponse | unknown): boolean {
  const normalized = normalizeLinks(links);
  return normalized.length > 0;
}

/**
 * Dispara LinkCreated quando o usuário cria seu primeiro link (pago ou normal).
 * Em seguida, verifica se o usuário já se tornou qualificado.
 */
export async function trackLinkCreated(userId: string): Promise<void> {
  if (!userId) return;

  const key = MilestoneKeys.linkCreated(userId);
  if (!wasTracked(key)) {
    trackOrQueue('meta', 'LinkCreated', {
      content_name: 'First Link',
    });
    markTracked(key);
  }

  await checkAndTrackQualifiedCreator(userId);
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
 * (tem link criado + pagamento configurado) e dispara QualifiedCreator
 * caso ainda não tenha sido tracked. Usada no carregamento da app para
 * recuperar usuários que já atingiram ambos os marcos em sessões anteriores
 * ou em outros dispositivos.
 *
 * Idempotente: marca permanente no localStorage + guarda em memória. A guarda
 * é registrada ANTES do fetch para que chamadas paralelas não disparem juntas.
 */
export async function checkAndTrackQualifiedCreator(
  userId: string,
): Promise<void> {
  if (!userId) return;

  const key = MilestoneKeys.qualifiedCreator(userId);
  if (qualifiedCreatorDone.has(userId) || wasTrackedEver(key)) return;
  if (qualifiedCreatorInFlight.has(userId)) return;

  qualifiedCreatorInFlight.add(userId);
  try {
    const [profile, linksResponse] = await Promise.all([
      getProfile(),
      getLinks(),
    ]);

    if (hasPaymentConfigured(profile) && hasAnyLink(linksResponse)) {
      await trackQualifiedCreator(userId);
    }
  } catch {
    // ignore — tracking não deve quebrar fluxo
  } finally {
    qualifiedCreatorInFlight.delete(userId);
  }
}

/**
 * Dispara QualifiedCreator quando o usuário completou os 3 marcos:
 * cadastro + link criado + pagamento configurado.
 *
 * Envia com o mesmo event_id do CAPI server-side (`qualified-<userId>`), para
 * que o Meta deduplique o par browser/servidor. Marca permanente: o evento é
 * one-shot por usuário; se o pixel não estava pronto, o retry fica a cargo da
 * fila persistente (pixel-queue), não de um novo disparo.
 */
export async function trackQualifiedCreator(userId: string): Promise<void> {
  if (!userId) return;

  const key = MilestoneKeys.qualifiedCreator(userId);
  if (qualifiedCreatorDone.has(userId) || wasTrackedEver(key)) return;

  qualifiedCreatorDone.add(userId);
  trackOrQueue(
    'meta',
    'QualifiedCreator',
    {},
    qualifiedCreatorEventId(userId),
  );
  markTracked(key);
}

/**
 * Dispara HasMonetizableAsset quando o usuário responde "Sim, já tenho"
 * na pergunta-gate do onboarding (já tem produto pronto para vender).
 *
 * Marca permanente no localStorage: a resposta do usuário é um marco one-shot,
 * então nunca deve ser reenviado, mesmo que o pixel não tenha sido carregado
 * na primeira tentativa (o retry fica a cargo da fila persistente do pixel-queue).
 */
export function trackHasMonetizableAsset(userId: string): void {
  if (!userId) return;

  const key = MilestoneKeys.hasMonetizableAsset(userId);
  if (wasTrackedEver(key)) return;

  trackOrQueue('meta', 'HasMonetizableAsset', {}, `asset-${userId}`);
  markTracked(key);
}

/**
 * Dispara QualifiedLead quando o usuário tem produto pronto para vender
 * (hasMonetizableAsset) E uma forma de recebimento configurada
 * (PIX Direto ou MercadoPago). A guarda localStorage impede duplicata
 * entre o disparo no onboarding e o caminho tardio (configuração de
 * pagamento nas settings).
 */
export function trackQualifiedLead(userId: string): void {
  if (!userId) return;

  const key = MilestoneKeys.qualifiedLead(userId);
  if (wasTracked(key)) return;

  trackOrQueue('meta', 'QualifiedLead', {}, `qualifiedlead-${userId}`);
  markTracked(key);
}
