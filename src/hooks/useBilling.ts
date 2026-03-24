'use client';

import { useCallback, useMemo } from 'react';
import { useApi, useApiMutation } from './useApi';
import {
  getBillingStatus,
  getCurrentBillingCycle,
  getBillingHistory,
  getFeesReport,
  createBillingPayment,
  canReceivePayments,
  getPendingPayment,
  BILLING_CACHE_KEYS,
  type BillingCycle,
  type CycleSummary,
  type BillingStatus,
  type BillingAlert,
  type BillingPayment,
  type PayFeesResponse,
} from '@/lib/api-billing';

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
 * 
 * @example
 * ```tsx
 * const { status, alerts, isGracePeriod, currentBalance } = useBilling();
 * 
 * if (isGracePeriod) {
 *   return <Alert>Seus links serão bloqueados em {daysUntilLock} dias</Alert>
 * }
 * ```
 */
export function useBilling(): UseBillingReturn {
  // Fetch billing status (inclui alertas e resumo)
  const {
    data: statusData,
    isLoading: isLoadingStatus,
    error: statusError,
    refetch: refetchStatus,
  } = useApi<{ success: boolean; data: BillingStatus }>(
    BILLING_CACHE_KEYS.BILLING_STATUS,
    getBillingStatus,
    {
      ttl: 10 * 1000, // Cache de 10 segundos (dados podem mudar frequentemente)
    }
  );

  // Fetch current cycle separadamente para ter acesso direto
  const {
    data: cycleData,
    isLoading: isLoadingCycle,
    error: cycleError,
    refetch: refetchCycle,
  } = useApi<{ success: boolean; data: CycleSummary }>(
    BILLING_CACHE_KEYS.CURRENT_CYCLE,
    getCurrentBillingCycle,
    {
      ttl: 10 * 1000,
    }
  );

  const status = statusData?.data || null;
  const currentCycle = cycleData?.data?.cycle || null;

  // Memoize alertas processados
  const alerts = useMemo(() => {
    // Criar alertas baseados no status
    const alertList: BillingAlert[] = [];
    
    if (status?.alertLevel === 'critical') {
      alertList.push({
        type: 'danger',
        message: status?.actionRequired 
          ? 'Seus links monetizados estão bloqueados. Regularize seu pagamento para desbloquear.'
          : 'Atenção: seu ciclo de billing precisa de atenção.',
        actionRequired: true,
        action: {
          label: 'Regularizar',
          href: '/admin/plans',
        },
      });
    } else if (status?.alertLevel === 'warning') {
      alertList.push({
        type: 'warning',
        message: `Seu ciclo vence em ${status?.daysRemaining} dias. Renove para continuar vendendo sem interrupção.`,
        actionRequired: true,
        action: {
          label: 'Renovar',
          href: '/admin/plans',
        },
      });
    }
    
    return alertList;
  }, [status]);
  
  const hasAlerts = alerts.length > 0;
  
  const criticalAlerts = useMemo(
    () => alerts.filter(a => a.type === 'danger'),
    [alerts]
  );
  
  const warningAlerts = useMemo(
    () => alerts.filter(a => a.type === 'warning'),
    [alerts]
  );
  
  const infoAlerts = useMemo(
    () => alerts.filter(a => a.type === 'info'),
    [alerts]
  );

  // Status helpers memoizados
  const isGracePeriod = useMemo(
    () => status?.status === 'grace_period',
    [status]
  );
  
  const isLocked = useMemo(
    () => status?.status === 'suspended',
    [status]
  );

  // Calcula dias até o bloqueio
  const daysUntilLock = useMemo(() => {
    if (!status?.gracePeriodEndDate) return null;
    const graceEnd = new Date(status.gracePeriodEndDate);
    const now = new Date();
    const diff = graceEnd.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  }, [status]);

  // Balance helpers - usa totalFeesPending que inclui taxas do ciclo + dívidas anteriores
  const currentBalance = useMemo(
    () => status?.totalFeesPending || status?.totalFees || 0,
    [status]
  );
  
  const currentBalanceFormatted = useMemo(() => {
    return `R$ ${currentBalance.toFixed(2).replace('.', ',')}`;
  }, [currentBalance]);

  // Refresh function
  const refreshBilling = useCallback(() => {
    refetchStatus();
    refetchCycle();
  }, [refetchStatus, refetchCycle]);

  // Mutation para pagar taxas
  const payFeesMutation = useApiMutation(
    async (params: { method: 'pix' | 'credit_card'; cardToken?: string; cardBrand?: string | null }) => {
      return createBillingPayment(params.method, params.cardToken, params.cardBrand);
    }
  );

  return {
    // Dados
    status,
    currentCycle,
    
    // Loading states
    isLoading: isLoadingStatus || isLoadingCycle,
    isLoadingStatus,
    isLoadingCycle,
    
    // Erros
    error: statusError || cycleError,
    
    // Alertas
    hasAlerts,
    alerts,
    criticalAlerts,
    warningAlerts,
    infoAlerts,
    
    // Status helpers
    isGracePeriod,
    isLocked,
    daysUntilLock,
    canReceivePayments: !isLocked,
    currentBalance,
    currentBalanceFormatted,
    
    // Ações
    refreshBilling,
    payFees: async (method: 'pix' | 'credit_card', cardToken?: string, cardBrand?: string | null) => {
      const result = await payFeesMutation.mutate({ method, cardToken, cardBrand });
      if (!result) {
        throw new Error('Erro ao processar pagamento');
      }
      // Recarrega dados do billing após pagamento
      refreshBilling();
      return result;
    },
    isPayingFees: payFeesMutation.isLoading,
  };
}

/**
 * Hook para buscar histórico de billing cycles
 * 
 * @example
 * ```tsx
 * const { cycles, isLoading } = useBillingHistory(12);
 * ```
 */
export function useBillingHistory(limit = 12) {
  const fetchHistory = useCallback(
    () => getBillingHistory(limit),
    [limit]
  );

  const { data, isLoading, error, refetch } = useApi(
    `${BILLING_CACHE_KEYS.CYCLE_HISTORY}:${limit}`,
    fetchHistory,
    {
      ttl: 60 * 1000, // Cache de 1 minuto
    }
  );

  return {
    cycles: data?.data?.cycles || [],
    total: data?.data?.total || 0,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook para buscar relatório de taxas
 * 
 * @example
 * ```tsx
 * const { report, isLoading } = useFeesReport('2024-01-01', '2024-01-31');
 * ```
 */
export function useFeesReport(startDate?: string, endDate?: string) {
  const fetchReport = useCallback(
    () => getFeesReport(startDate, endDate),
    [startDate, endDate]
  );

  const { data, isLoading, error, refetch } = useApi(
    `billing:report:${startDate}:${endDate}`,
    fetchReport,
    {
      ttl: 60 * 1000,
      enabled: !!startDate && !!endDate,
    }
  );

  return {
    report: data?.data || null,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook para verificar se usuário pode receber pagamentos
 * Útil para validar antes de criar links monetizados
 * 
 * @example
 * ```tsx
 * const { canReceive, isLoading } = useCanReceivePayments();
 * 
 * if (!canReceive) {
 *   return <Alert>Você não pode receber pagamentos no momento</Alert>
 * }
 * ```
 */
export function useCanReceivePayments() {
  const { data, isLoading, error } = useApi(
    'billing:can-receive',
    canReceivePayments,
    {
      ttl: 60 * 1000, // Cache de 1 minuto
    }
  );

  return {
    canReceive: data?.canReceive ?? true,
    reason: data?.reason,
    isLoading,
    error,
  };
}

/**
 * Hook para buscar pagamento pendente
 * 
 * @example
 * ```tsx
 * const { payment, isLoading } = usePendingPayment();
 * ```
 */
export function usePendingPayment() {
  const { data, isLoading, error, refetch } = useApi(
    'billing:pending-payment',
    getPendingPayment,
    {
      ttl: 30 * 1000,
    }
  );

  return {
    hasPendingPayment: !!data?.payment,
    payment: data?.payment || null,
    isLoading,
    error,
    refetch,
  };
}
