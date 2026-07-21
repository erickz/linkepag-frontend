/**
 * Fila persistente de eventos de pixel (Meta + TikTok)
 *
 * Quando o usuário é redirecionado rapidamente, os scripts dos pixels
 * podem não ter carregado ainda. Esta fila salva os eventos no localStorage
 * e os dispara quando os pixels estiverem prontos.
 */

const QUEUE_KEY = 'lp_pixel_queue_v1';
const IDENTIFY_QUEUE_KEY = 'lp_pixel_identify_queue_v1';

/**
 * TTL dos eventos na fila: 48h.
 * Eventos mais antigos são descartados — evita re-disparo infinito de
 * payloads antigos (ex: formatos de versões anteriores do site) e garante
 * que eventos com valor/moeda obsoletos não poluam o pixel.
 */
const QUEUE_TTL_MS = 48 * 60 * 60 * 1000;

interface QueuedEvent {
  platform: 'meta' | 'tiktok';
  eventName: string;
  params?: Record<string, unknown>;
  /** eventID para deduplicação browser/servidor (Meta CAPI) */
  eventId?: string;
  timestamp: number;
}

interface QueuedIdentify {
  platform: 'meta' | 'tiktok';
  data: Record<string, unknown>;
  timestamp: number;
}

function getQueue(): QueuedEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const events: QueuedEvent[] = JSON.parse(raw);
    const now = Date.now();
    // Descarta eventos expirados (mais antigos que o TTL)
    return events.filter(
      (e) => typeof e.timestamp === 'number' && now - e.timestamp < QUEUE_TTL_MS
    );
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedEvent[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // ignora
  }
}

function clearQueue(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(QUEUE_KEY);
  } catch {
    // ignora
  }
}

function getIdentifyQueue(): QueuedIdentify[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(IDENTIFY_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveIdentifyQueue(queue: QueuedIdentify[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(IDENTIFY_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // ignora
  }
}

function clearIdentifyQueue(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(IDENTIFY_QUEUE_KEY);
  } catch {
    // ignora
  }
}

/** Adiciona evento à fila */
export function queuePixelEvent(
  platform: 'meta' | 'tiktok',
  eventName: string,
  params?: Record<string, unknown>,
  eventId?: string
): void {
  const queue = getQueue();
  queue.push({ platform, eventName, params, eventId, timestamp: Date.now() });
  saveQueue(queue);
}

/** Tenta disparar evento; se falhar, enfileira para depois */
export function trackOrQueue(
  platform: 'meta' | 'tiktok',
  eventName: string,
  params?: Record<string, unknown>,
  eventId?: string
): void {
  const { fbqTrack } = require('./meta-pixel') as typeof import('./meta-pixel');
  const { ttqTrack } = require('./tiktok-pixel') as typeof import('./tiktok-pixel');

  let success = false;
  try {
    if (platform === 'meta') {
      success = fbqTrack(eventName, params, eventId);
    } else {
      success = ttqTrack(eventName, params);
    }
  } catch {
    success = false;
  }

  if (!success) {
    queuePixelEvent(platform, eventName, params, eventId);
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log(`[PixelQueue] Evento "${eventName}" (${platform}) enfileirado — pixel não estava pronto`);
    }
  }
}

/** Tenta disparar identify/advanced matching; se falhar, enfileira para depois */
export async function identifyOrQueue(
  platform: 'meta' | 'tiktok',
  data: Record<string, unknown>
): Promise<void> {
  const { fbqIdentify } = require('./meta-pixel') as typeof import('./meta-pixel');
  const { ttqIdentify } = require('./tiktok-pixel') as typeof import('./tiktok-pixel');

  let success = false;
  try {
    if (platform === 'meta') {
      success = await fbqIdentify(data);
    } else {
      success = await ttqIdentify(
        data.email as string | null | undefined,
        data.phone as string | null | undefined,
        data.external_id as string | null | undefined
      );
    }
  } catch {
    success = false;
  }

  if (!success) {
    const queue = getIdentifyQueue();
    queue.push({ platform, data, timestamp: Date.now() });
    saveIdentifyQueue(queue);
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log(`[PixelQueue] Identify (${platform}) enfileirado — pixel não estava pronto`);
    }
  }
}

/** Dispara todos os eventos pendentes. Só limpa a fila se TODOS forem enviados com sucesso. */
export function flushPixelQueue(): void {
  const queue = getQueue();
  if (queue.length === 0) return;

  const { fbqTrack } = require('./meta-pixel') as typeof import('./meta-pixel');
  const { ttqTrack } = require('./tiktok-pixel') as typeof import('./tiktok-pixel');

  const remaining: QueuedEvent[] = [];

  for (const event of queue) {
    let success = false;
    try {
      if (event.platform === 'meta') {
        success = fbqTrack(event.eventName, event.params, event.eventId);
      } else {
        success = ttqTrack(event.eventName, event.params);
      }
    } catch {
      success = false;
    }

    if (!success) {
      remaining.push(event);
    }
  }

  if (remaining.length === 0) {
    clearQueue();
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log(`[PixelQueue] Flush OK — ${queue.length} eventos enviados`);
    }
  } else {
    saveQueue(remaining);
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log(`[PixelQueue] Flush parcial — ${queue.length - remaining.length}/${queue.length} enviados, ${remaining.length} permanecem na fila`);
    }
  }
}

/** Dispara todos os identifies pendentes. Só limpa a fila se TODOS forem enviados com sucesso. */
export async function flushPixelIdentifyQueue(): Promise<void> {
  const queue = getIdentifyQueue();
  if (queue.length === 0) return;

  const { fbqIdentify } = require('./meta-pixel') as typeof import('./meta-pixel');
  const { ttqIdentify } = require('./tiktok-pixel') as typeof import('./tiktok-pixel');

  const remaining: QueuedIdentify[] = [];

  for (const item of queue) {
    let success = false;
    try {
      if (item.platform === 'meta') {
        success = await fbqIdentify(item.data);
      } else {
        success = await ttqIdentify(
          item.data.email as string | null | undefined,
          item.data.phone as string | null | undefined,
          item.data.external_id as string | null | undefined
        );
      }
    } catch {
      success = false;
    }

    if (!success) {
      remaining.push(item);
    }
  }

  if (remaining.length === 0) {
    clearIdentifyQueue();
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log(`[PixelQueue] Identify flush OK — ${queue.length} enviados`);
    }
  } else {
    saveIdentifyQueue(remaining);
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log(`[PixelQueue] Identify flush parcial — ${queue.length - remaining.length}/${queue.length} enviados, ${remaining.length} permanecem na fila`);
    }
  }
}
