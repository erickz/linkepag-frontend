'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiCache } from '@/lib/api-cache';

interface UseApiOptions<T> {
  initialData?: T;
  ttl?: number;
  enabled?: boolean;
  onError?: (error: Error) => void;
  onSuccess?: (data: T) => void;
  retry?: number;
  retryDelay?: number;
}

interface UseApiResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function useApi<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: UseApiOptions<T> = {}
): UseApiResult<T> {
  const { 
    initialData, 
    ttl, 
    enabled = true, 
    onError, 
    onSuccess, 
    retry = 2, 
    retryDelay = 1000 
  } = options;

  const [state, setState] = useState({
    data: initialData,
    isLoading: enabled && !initialData,
    error: null as Error | null,
  });

  // Refetch function - manual trigger
  const refetch = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    apiCache.invalidate(key);
    
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= retry; attempt++) {
      try {
        const result = await fetchFn();

        if (ttl) {
          apiCache.set(key, result, ttl);
        }

        setState({ data: result, isLoading: false, error: null });
        onSuccess?.(result);
        return;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < retry) {
          await delay(retryDelay * (attempt + 1));
        }
      }
    }

    setState(prev => ({ ...prev, isLoading: false, error: lastError }));
    onError?.(lastError!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, fetchFn, ttl, retry, retryDelay]);

  // Main effect - fetch data when key or enabled changes
  useEffect(() => {
    if (!enabled) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    // Check cache first
    const cached = apiCache.get<T>(key);
    if (cached !== null) {
      setState({ data: cached, isLoading: false, error: null });
      onSuccess?.(cached);
      return;
    }

    // Set loading state
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    // Track if component is still mounted
    let isMounted = true;

    const fetchData = async () => {
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= retry; attempt++) {
        if (!isMounted) return;

        try {
          const pending = apiCache.getPendingRequest<T>(key);
          let result: T;

          if (pending) {
            result = await pending;
          } else {
            const promise = fetchFn();
            apiCache.setPendingRequest(key, promise);
            result = await promise;
          }

          if (!isMounted) return;

          if (ttl) {
            apiCache.set(key, result, ttl);
          }

          setState({ data: result, isLoading: false, error: null });
          onSuccess?.(result);
          return;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          if (attempt < retry && isMounted) {
            await delay(retryDelay * (attempt + 1));
          }
        }
      }

      if (isMounted) {
        setState(prev => ({ ...prev, isLoading: false, error: lastError }));
        onError?.(lastError!);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, fetchFn, ttl, retry, retryDelay]);

  return { 
    data: state.data, 
    isLoading: state.isLoading, 
    error: state.error, 
    refetch 
  };
}

export function useApiParallel<T extends Record<string, unknown>>(
  queries: Record<string, { key: string; fetchFn: () => Promise<T[keyof T]>; ttl?: number }>,
  options: { enabled?: boolean; onError?: (error: Error) => void; onSuccess?: (data: T) => void } = {}
): {
  data: Partial<T>;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const { enabled = true, onError, onSuccess } = options;

  const [data, setData] = useState<Partial<T>>({});
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);

  const queriesKey = Object.keys(queries).join(',');

  const refetch = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const results = await Promise.all(
        Object.entries(queries).map(async ([name, query]) => {
          const result = await query.fetchFn();
          return [name, result] as const;
        })
      );

      const newData = Object.fromEntries(results) as Partial<T>;
      setData(newData);
      setIsLoading(false);
      onSuccess?.(newData as T);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setIsLoading(false);
      onError?.(error);
    }
  }, [queries, onError, onSuccess]);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    let isMounted = true;

    const fetchAll = async () => {
      try {
        const results = await Promise.all(
          Object.entries(queries).map(async ([name, query]) => {
            const result = await query.fetchFn();
            return [name, result] as const;
          })
        );

        if (isMounted) {
          const newData = Object.fromEntries(results) as Partial<T>;
          setData(newData);
          setIsLoading(false);
          onSuccess?.(newData as T);
        }
      } catch (err) {
        if (isMounted) {
          const error = err instanceof Error ? err : new Error(String(err));
          setError(error);
          setIsLoading(false);
          onError?.(error);
        }
      }
    };

    fetchAll();

    return () => {
      isMounted = false;
    };
  }, [queriesKey, enabled, onError, onSuccess]);

  return { data, isLoading, error, refetch };
}

export function useApiMutation<T, P = unknown>(mutationFn: (params: P) => Promise<T>) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);

  const mutate = useCallback(
    async (
      params: P,
      options?: {
        onSuccess?: (data: T) => void;
        onError?: (error: Error) => void;
        invalidateKeys?: string[];
      }
    ): Promise<T | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await mutationFn(params);

        setData(result);

        options?.invalidateKeys?.forEach((key) => {
          apiCache.invalidate(key);
        });

        options?.onSuccess?.(result);
        
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        options?.onError?.(error);
        
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [mutationFn]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { mutate, isLoading, error, data, reset };
}
