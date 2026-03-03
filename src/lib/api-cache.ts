/**
 * Sistema de cache simples e eficiente para requisições API
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class ApiCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private pendingRequests = new Map<string, Promise<unknown>>();
  private version = 'v1.2'; // Bump version to invalidate all cache
  private initialized = false;

  constructor() {
    // Só limpa cache na primeira inicialização, não em hot reloads
    if (typeof window !== 'undefined') {
      const storedVersion = localStorage.getItem('apiCacheVersion');
      if (storedVersion !== this.version) {
        this.clearAll();
        localStorage.setItem('apiCacheVersion', this.version);
      }
      this.initialized = true;
    }
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs?: number): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + (ttlMs || 30 * 1000), // 30s padrão
    });
  }

  getPendingRequest<T>(key: string): Promise<T> | null {
    return this.pendingRequests.get(key) as Promise<T> | null;
  }

  setPendingRequest<T>(key: string, promise: Promise<T>): void {
    this.pendingRequests.set(key, promise);
    promise.finally(() => {
      this.pendingRequests.delete(key);
    });
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidatePrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  clearAll(): void {
    this.cache.clear();
    this.pendingRequests.clear();
    // Não logar em produção para evitar poluição do console
    if (process.env.NODE_ENV === 'development') {
      console.log('[ApiCache] All cache cleared');
    }
  }

  getStats(): { entries: number; pending: number } {
    return {
      entries: this.cache.size,
      pending: this.pendingRequests.size,
    };
  }
}

// Singleton
export const apiCache = new ApiCache();

// TTLs predefinidos (em ms)
export const CACHE_TTL = {
  PROFILE: 60 * 1000,      // 1 minuto
  LINKS: 30 * 1000,        // 30 segundos
  PUBLIC_PROFILE: 2 * 60 * 1000, // 2 minutos
};

/**
 * Função utilitária para fetch com cache e deduplicação
 * Usada pelas funções em api.ts
 */
export async function fetchWithCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: { ttl?: number; skipCache?: boolean } = {}
): Promise<T> {
  const { ttl, skipCache = false } = options;

  // 1. Verifica cache
  if (!skipCache) {
    const cached = apiCache.get<T>(key);
    if (cached !== null) {
      return cached;
    }
  }

  // 2. Verifica requisição pendente (deduplicação)
  const pending = apiCache.getPendingRequest<T>(key);
  if (pending) {
    return pending;
  }

  // 3. Faz requisição
  const promise = fetchFn().then((data) => {
    apiCache.set(key, data, ttl);
    return data;
  });

  apiCache.setPendingRequest(key, promise);
  return promise;
}
