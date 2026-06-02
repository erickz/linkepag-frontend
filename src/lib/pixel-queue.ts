/**
 * Fila persistente de eventos de pixel (Meta + TikTok)
 *
 * Problema: quando o usuário completa uma ação (cadastro, compra) e é
 * redirecionado imediatamente, os scripts dos pixels podem não ter
 * carregado ainda, e o navegador cancela as requisições pendentes.
 *
 * Solução: enfileirar os eventos no localStorage e fazer flush
 * na próxima página carregada, quando os pixels já estarão disponíveis.
 *
 * Uso:
 *   import { queuePixelEvent, flushPixelQueue } from '@/lib/pixel-queue';
 *   queuePixelEvent('meta', 'CompleteRegistration');
 *   queuePixelEvent('tiktok', 'CompleteRegistration');
 *   // Depois do redirecionamento, em qualquer página:
 *   flushPixelQueue();
 */

const QUEUE_KEY = 'lp_pixel_queue_v1';

export interface QueuedPixelEvent {
  platform: 'meta' | 'tiktok';
  eventName: string;
  params?: Record<string, unknown>;
  timestamp: number;
}

/** Adiciona um evento à fila persistente */
export function queuePixelEvent(
  platform: 'meta' | 'tiktok',
  eventName: string,
  params?: Record<string, unknown>
): void {
  if (typeof window === 'undefined') return;

  try {
    const queue = getQueue();
    queue.push({ platform, eventName, params, timestamp: Date.now() });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Silenciosamente ignora erros de localStorage
  }
}

/** Recupera a fila do localStorage */
function getQueue(): QueuedPixelEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Limpa a fila do localStorage */
function clearQueue(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(QUEUE_KEY);
  } catch {
    // ignora
  }
}

/** Dispara todos os eventos pendentes e limpa a fila */
export function flushPixelQueue(): void {
  if (typeof window === 'undefined') return;

  const queue = getQueue();
  if (queue.length === 0) return;

  // Importa dinamicamente para evitar circular dependency
  const { fbqTrack } = require('./meta-pixel') as typeof import('./meta-pixel');
  const { ttqTrack } = require('./tiktok-pixel') as typeof import('./tiktok-pixel');

  for (const event of queue) {
    try {
      if (event.platform === 'meta') {
        fbqTrack(event.eventName, event.params);
      } else if (event.platform === 'tiktok') {
        ttqTrack(event.eventName, event.params);
      }
    } catch {
      // Se um evento falhar, continua com os outros
    }
  }

  clearQueue();
}

/**
 * Versão híbrida: tenta disparar imediatamente, mas se falhar
 * (pixel não carregado), enfileira para flush posterior.
 */
export function trackOrQueue(
  platform: 'meta' | 'tiktok',
  eventName: string,
  params?: Record<string, unknown>
): void {
  const isAvailable =
    platform === 'meta'
      ? typeof window !== 'undefined' && !!(window as unknown as Record<string, unknown>).fbq
      : typeof window !== 'undefined' && !!(window as unknown as Record<string, unknown>).ttq;

  if (isAvailable) {
    // Pixel já carregou — dispara direto
    const { fbqTrack } = require('./meta-pixel') as typeof import('./meta-pixel');
    const { ttqTrack } = require('./tiktok-pixel') as typeof import('./tiktok-pixel');

    try {
      if (platform === 'meta') fbqTrack(eventName, params);
      else ttqTrack(eventName, params);
      return;
    } catch {
      // Se disparar falhar, cai no fallback de enfileirar
    }
  }

  // Pixel não carregou ainda — enfileira para flush na próxima página
  queuePixelEvent(platform, eventName, params);
}
