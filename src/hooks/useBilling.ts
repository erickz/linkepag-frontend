'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type BillingCycle,
  type BillingStatus,
  type BillingAlert,
  type PayFeesResponse,
  type CycleSummary,
  getBillingStatus,
  getCurrentBillingCycle,
  getBillingHistory,
  getFeesReport,
  createBillingPayment,
  getPendingPayment,
  canReceivePayments as fetchCanReceivePayments,
  BILLING_CACHE_KEYS,
} from '@/lib/api-billing';
import { apiCache } from '@/lib/api-cache';

function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

export interface UseBillingReturn {
  // Dados
  status: BillingStatus | null;
  currentCycle: BillingCycle | null;

  // Estados de loading
  isLoading: boolean;
  isLoadingStatus: boolean;
  isLoadingCycle: boolean;

  // Erros
  error: Error | null;

  // Helpers
  hasAlerts: boolean;
  alerts: BillingAlert[];
  criticalAlerts: BillingAlert[];
  warningAlerts: BillingAlert[];
  infoAlerts: BillingAlert[];

  // Status helpers
  isGracePeriod: boolean;
  isLocked: boolean;
  daysUntilLock: number | null;
  canReceivePayments: boolean;
  currentBalance: number;
  currentBalanceFormatted: string;

  // Ações
  refreshBilling: () => void;
  payFees: (method: 'pix' | 'credit_card', cardToken?: string, cardBrand?: string | null) => Promise<PayFeesResponse>;
  isPayingFees: boolean;
}

/**
 * Hook para gerenciar dados de billing do usuário
 */
export function useBilling(): UseBillingReturn {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [cycleSummary, setCycleSummary] = useState<CycleSummary | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isLoadingCycle, setIsLoadingCycle] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isPayingFees, setIsPayingFees] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  const refreshBilling = useCallback(() => {
    apiCache.invalidate(BILLING_CACHE_KEYS.BILLING_STATUS);
    apiCache.invalidate(BILLING_CACHE_KEYS.CURRENT_CYCLE);
    setRefreshToken(prev => prev + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      setIsLoadingStatus(true);
      try {
        const response = await getBillingStatus();
        if (!cancelled) {
          setStatus(response.data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Erro ao carregar billing'));
        }
      } finally {
        if (!cancelled) {
          setIsLoadingStatus(false);
        }
      }
    }

    async function loadCycle() {
      setIsLoadingCycle(true);
      try {
        const response = await getCurrentBillingCycle();
        if (!cancelled) {
          setCycleSummary(response.data);
        }
      } catch {
        // Status já cobre erros críticos
      } finally {
        if (!cancelled) {
          setIsLoadingCycle(false);
        }
      }
    }

    loadStatus();
    loadCycle();

    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  const currentCycle = cycleSummary?.cycle || null;

  const alerts = useMemo<BillingAlert[]>(() => {
    const list: BillingAlert[] = [];

    if (!status) return list;

    if (status.isCheckoutBlocked) {
      list.push({
        type: 'danger',
        message: status.blockReason || 'Checkout bloqueado. Regularize sua fatura para voltar a vender.',
        actionRequired: true,
        action: {
          label: 'Regularizar',
          href: '/admin/plans',
        },
      });
    } else if (status.status === 'grace_period') {
      list.push({
        type: 'warning',
        message: status.daysRemaining
          ? `Seu ciclo venceu. O checkout será bloqueado em ${status.daysRemaining} dia(s) se não houver pagamento.`
          : 'Seu ciclo venceu. Efetue o pagamento para evitar o bloqueio do checkout.',
        actionRequired: true,
        action: {
          label: 'Pagar agora',
          href: '/admin/plans',
        },
      });
    } else if (status.daysRemaining !== null && status.daysRemaining <= 3 && status.currentBalance > 0) {
      list.push({
        type: 'warning',
        message: `Sua fatura vence em ${status.daysRemaining} dia(s). Valor em aberto: ${formatCurrency(status.currentBalance)}.`,
        actionRequired: true,
        action: {
          label: 'Pagar agora',
          href: '/admin/plans',
        },
      });
    } else if (status.currentBalance > 0) {
      list.push({
        type: 'info',
        message: `Há ${formatCurrency(status.currentBalance)} em aberto no ciclo atual.`,
        actionRequired: false,
      });
    }

    return list;
  }, [status]);

  const criticalAlerts = useMemo(() => alerts.filter(a => a.type === 'danger'), [alerts]);
  const warningAlerts = useMemo(() => alerts.filter(a => a.type === 'warning'), [alerts]);
  const infoAlerts = useMemo(() => alerts.filter(a => a.type === 'info'), [alerts]);

  const isGracePeriod = status?.status === 'grace_period';
  const isLocked = status?.isCheckoutBlocked ?? false;
  const daysUntilLock = status?.daysRemaining ?? null;
  const currentBalance = status?.currentBalance ?? 0;

  const payFees = useCallback(
    async (method: 'pix' | 'credit_card', cardToken?: string, cardBrand?: string | null) => {
      setIsPayingFees(true);
      try {
        const result = await createBillingPayment(method, cardToken, cardBrand);
        refreshBilling();
        return result;
      } finally {
        setIsPayingFees(false);
      }
    },
    [refreshBilling],
  );

  return {
    status,
    currentCycle,
    isLoading: isLoadingStatus || isLoadingCycle,
    isLoadingStatus,
    isLoadingCycle,
    error,
    hasAlerts: alerts.length > 0,
    alerts,
    criticalAlerts,
    warningAlerts,
    infoAlerts,
    isGracePeriod,
    isLocked,
    daysUntilLock,
    canReceivePayments: status?.canReceivePayments ?? true,
    currentBalance,
    currentBalanceFormatted: formatCurrency(currentBalance),
    refreshBilling,
    payFees,
    isPayingFees,
  };
}

/**
 * Hook para histórico de ciclos de billing
 */
export function useBillingHistory(limit = 12) {
  const [cycles, setCycles] = useState<BillingCycle[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getBillingHistory(limit);
      setCycles(response.data.cycles);
      setTotal(response.data.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erro ao carregar histórico'));
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { cycles, total, isLoading, error, refetch };
}

/**
 * Hook para relatório de taxas
 */
export function useFeesReport(startDate?: string, endDate?: string) {
  const [report, setReport] = useState<{
    totalFees: number;
    totalTransactions: number;
    byCycle: Array<{ cycleId: string; totalFees: number; transactionCount: number }>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getFeesReport(startDate, endDate);
      setReport(response.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erro ao carregar relatório'));
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { report, isLoading, error, refetch };
}

/**
 * Hook para verificar se o usuário pode receber pagamentos
 */
export function useCanReceivePayments() {
  const [canReceive, setCanReceive] = useState(true);
  const [reason, setReason] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const response = await fetchCanReceivePayments();
        if (!cancelled) {
          setCanReceive(response.canReceive);
          setReason(response.reason);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Erro ao verificar permissões'));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return { canReceive, reason, isLoading, error };
}

/**
 * Hook para pagamento pendente de billing
 */
export function usePendingPayment() {
  const [hasPendingPayment, setHasPendingPayment] = useState(false);
  const [payment, setPayment] = useState<{
    id: string;
    status: string;
    totalAmount: number;
    paymentMethod: string;
    pixCode?: string;
    pixQrCodeUrl?: string;
    pixExpirationDate?: string;
    createdAt: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getPendingPayment();
      setHasPendingPayment(response.payment ? true : false);
      setPayment(response.payment);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erro ao buscar pagamento pendente'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { hasPendingPayment, payment, isLoading, error, refetch };
}
