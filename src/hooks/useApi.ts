'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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

  // Use ref to store fetchFn to avoid dependency changes
  const fetchFnRef = useRef(fetchFn);
  
  // Only update the ref when fetchFn actually changes (by reference)
  useEffect(() => {
    fetchFnRef.current = fetchFn;
  }, [fetchFn]);

  // Memoize retry config to prevent unnecessary re-renders
  const retryConfigRef = useRef({ retry, retryDelay });
  useEffect(() => {
    retryConfigRef.current = { retry, retryDelay };
  }, [retry, retryDelay]);

  // Refetch function - manual trigger
  const refetch = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    apiCache.invalidate(key);
    
    let lastError: Error | null = null;
    const { retry, retryDelay } = retryConfigRef.current;
    
    for (let attempt = 0; attempt <= retry; attempt++) {
      try {
        const result = await fetchFnRef.current();

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
  }, [key, ttl, onSuccess, onError]);

  // Main effect - fetch data when key or enabled changes
  useEffect(() => {
    if (!enabled) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    // Check cache first
    const cached = apiCache.get<T>(key);
    if (cached !== null) {
      // Only update state if data is different to prevent loops
      setState(prev => {
        if (JSON.stringify(prev.data) === JSON.stringify(cached)) {
          return { ...prev, isLoading: false, error: null };
        }
        return { data: cached, isLoading: false, error: null };
      });
      onSuccess?.(cached);
      return;
    }

    // Set loading state only if not already loading to prevent loops
    setState(prev => {
      if (prev.isLoading) return prev;
      return { ...prev, isLoading: true, error: null };
    });

    // Track if component is still mounted
    let isMounted = true;

    const fetchData = async () => {
      let lastError: Error | null = null;
      const { retry, retryDelay } = retryConfigRef.current;

      for (let attempt = 0; attempt <= retry; attempt++) {
        if (!isMounted) return;

        try {
          const pending = apiCache.getPendingRequest<T>(key);
          let result: T;

          if (pending) {
            result = await pending;
          } else {
            const promise = fetchFnRef.current();
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
  }, [key, enabled]);

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

  // Store callbacks in refs to avoid dependency issues
  const onErrorRef = useRef(onError);
  const onSuccessRef = useRef(onSuccess);
  
  useEffect(() => {
    onErrorRef.current = onError;
    onSuccessRef.current = onSuccess;
  }, [onError, onSuccess]);

  // Create a stable key from the queries object - only depends on keys and query keys
  const queriesKey = useMemo(() => {
    const keys = Object.keys(queries).sort();
    const keyString = keys.map(k => `${k}:${queries[k].key}`).join(',');
    return keyString;
  }, [queries]);

  // Store the latest queries in a ref
  const queriesRef = useRef(queries);
  useEffect(() => {
    queriesRef.current = queries;
  }, [queries]);

  const refetch = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const currentQueries = queriesRef.current;
      const results = await Promise.all(
        Object.entries(currentQueries).map(async ([name, query]) => {
          const result = await query.fetchFn();
          return [name, result] as const;
        })
      );

      const newData = Object.fromEntries(results) as Partial<T>;
      setData(newData);
      setIsLoading(false);
      onSuccessRef.current?.(newData as T);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setIsLoading(false);
      onErrorRef.current?.(error);
    }
  }, []);

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
        const currentQueries = queriesRef.current;
        const results = await Promise.all(
          Object.entries(currentQueries).map(async ([name, query]) => {
            const result = await query.fetchFn();
            return [name, result] as const;
          })
        );

        if (isMounted) {
          const newData = Object.fromEntries(results) as Partial<T>;
          setData(newData);
          setIsLoading(false);
          onSuccessRef.current?.(newData as T);
        }
      } catch (err) {
        if (isMounted) {
          const error = err instanceof Error ? err : new Error(String(err));
          setError(error);
          setIsLoading(false);
          onErrorRef.current?.(error);
        }
      }
    };

    fetchAll();

    return () => {
      isMounted = false;
    };
  }, [queriesKey, enabled]);

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
