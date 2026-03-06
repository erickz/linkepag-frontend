'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  getSubscriptionHistory,
  exportSubscriptionHistory,
  SubscriptionHistoryFilters,
  SubscriptionHistoryItem,
  ExportFormat,
} from '@/lib/api';

interface UseSubscriptionHistoryReturn {
  subscriptions: SubscriptionHistoryItem[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  loading: boolean;
  error: string | null;
  filters: SubscriptionHistoryFilters;
  setFilters: (filters: SubscriptionHistoryFilters) => void;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  sortBy: string;
  setSortBy: (sortBy: string) => void;
  order: 'asc' | 'desc';
  setOrder: (order: 'asc' | 'desc') => void;
  refetch: () => Promise<void>;
  exportData: (format: 'csv' | 'json' | 'excel') => Promise<void>;
  summary: {
    totalSpent: number;
    totalSubscriptions: number;
    activeSubscriptions: number;
    cancelledSubscriptions: number;
    expiredSubscriptions: number;
    mostUsedPlan: {
      planId: number;
      planName: string;
      count: number;
    } | null;
    averageAmount: number;
  } | null;
}

export function useSubscriptionHistory(): UseSubscriptionHistoryReturn {
  const [subscriptions, setSubscriptions] = useState<SubscriptionHistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPageState] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimitState] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<SubscriptionHistoryFilters>({});
  const [sortBy, setSortByState] = useState('createdAt');
  const [order, setOrderState] = useState<'asc' | 'desc'>('desc');
  const [summary, setSummary] = useState<UseSubscriptionHistoryReturn['summary']>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getSubscriptionHistory(page, limit, filters, sortBy, order);
      setSubscriptions(response.subscriptions);
      setTotal(response.pagination.total);
      setTotalPages(response.pagination.totalPages);
      setSummary(response.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar histórico');
    } finally {
      setLoading(false);
    }
  }, [page, limit, filters, sortBy, order]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const setFilters = useCallback((newFilters: SubscriptionHistoryFilters) => {
    setFiltersState(newFilters);
    setPageState(1); // Reset to first page when filters change
  }, []);

  const setPage = useCallback((newPage: number) => {
    setPageState(newPage);
  }, []);

  const setLimit = useCallback((newLimit: number) => {
    setLimitState(newLimit);
    setPageState(1); // Reset to first page when limit changes
  }, []);

  const setSortBy = useCallback((newSortBy: string) => {
    setSortByState(newSortBy);
  }, []);

  const setOrder = useCallback((newOrder: 'asc' | 'desc') => {
    setOrderState(newOrder);
  }, []);

  const refetch = useCallback(async () => {
    await fetchHistory();
  }, [fetchHistory]);

  const exportData = useCallback(async (format: 'csv' | 'json' | 'excel') => {
    const exportConfig: ExportFormat = {
      format,
      filters,
    };

    const blob = await exportSubscriptionHistory(exportConfig);
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const date = new Date().toISOString().split('T')[0];
    const extensions: Record<string, string> = {
      csv: 'csv',
      json: 'json',
      excel: 'xlsx',
    };
    
    link.download = `assinaturas-${date}.${extensions[format]}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, [filters]);

  return {
    subscriptions,
    total,
    page,
    totalPages,
    limit,
    loading,
    error,
    filters,
    setFilters,
    setPage,
    setLimit,
    sortBy,
    setSortBy,
    order,
    setOrder,
    refetch,
    exportData,
    summary,
  };
}
