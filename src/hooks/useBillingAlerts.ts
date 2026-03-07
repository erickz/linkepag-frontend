'use client';

import { useMemo } from 'react';
import { useApi } from './useApi';
import { getCurrentSubscription, getBillingSummary, CACHE_KEYS } from '@/lib/api';

interface BillingAlert {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  dismissible?: boolean;
}

interface UseBillingAlertsResult {
  alerts: BillingAlert[];
  hasAlerts: boolean;
  isLoading: boolean;
  error: Error | null;
  userStatus: {
    billingStatus?: 'active' | 'grace_period' | 'suspended' | 'blocked';
    planStatus?: 'active' | 'expired' | 'cancelled' | 'pending_payment';
  };
  invoice: {
    status?: 'draft' | 'pending' | 'processing' | 'paid' | 'overdue' | 'failed' | 'cancelled';
    dueDate?: string;
    gracePeriodEnd?: string;
    autoChargeAttempts?: number;
    totalAmount?: number;
  } | null;
  refetch: () => Promise<void>;
}

/**
 * Hook para gerenciar alertas de billing do usuário
 * 
 * Combina dados da assinatura atual e resumo de cobranças
 * para determinar quais alertas devem ser exibidos.
 * 
 * @example
 * ```tsx
 * const { alerts, hasAlerts, isLoading } = useBillingAlerts();
 * 
 * if (hasAlerts) {
 *   return <BillingAlerts alerts={alerts} />;
 * }
 * ```
 */
export function useBillingAlerts(): UseBillingAlertsResult {
  // Busca assinatura atual
  const {
    data: subscriptionData,
    isLoading: isLoadingSubscription,
    error: subscriptionError,
    refetch: refetchSubscription,
  } = useApi(
    CACHE_KEYS.SUBSCRIPTION,
    getCurrentSubscription,
    { enabled: true }
  );

  // Busca resumo de billing
  const {
    data: billingData,
    isLoading: isLoadingBilling,
    error: billingError,
    refetch: refetchBilling,
  } = useApi(
    'billing-summary',
    getBillingSummary,
    { enabled: true }
  );

  // Extrai dados relevantes
  const subscription = subscriptionData?.subscription;
  const currentInvoice = billingData?.currentInvoice;
  const feeBalance = billingData?.feeBalance || 0;

  // Determina o status de billing do usuário
  const userStatus = useMemo(() => {
    const planStatus = subscription?.status;
    
    // Determina billingStatus baseado na fatura e plano
    let billingStatus: 'active' | 'grace_period' | 'suspended' | 'blocked' = 'active';
    
    if (currentInvoice?.status === 'failed' || currentInvoice?.status === 'overdue') {
      billingStatus = 'suspended';
    } else if (currentInvoice?.status === 'pending' && currentInvoice?.gracePeriodEnd) {
      const graceEnd = new Date(currentInvoice.gracePeriodEnd);
      if (graceEnd > new Date()) {
        billingStatus = 'grace_period';
      } else {
        billingStatus = 'suspended';
      }
    } else if (planStatus === 'expired') {
      billingStatus = 'grace_period';
    }

    return {
      billingStatus,
      planStatus,
    };
  }, [subscription, currentInvoice]);

  // Constrói o objeto de invoice
  const invoice = useMemo(() => {
    if (!currentInvoice) return null;
    
    return {
      status: currentInvoice.status || undefined,
      dueDate: currentInvoice.dueDate || undefined,
      gracePeriodEnd: currentInvoice.gracePeriodEnd || undefined,
      autoChargeAttempts: currentInvoice.autoChargeAttempts,
      totalAmount: currentInvoice.totalAmount || feeBalance,
    };
  }, [currentInvoice, feeBalance]);

  // Gera alertas baseado nos dados
  const alerts = useMemo(() => {
    const alertList: BillingAlert[] = [];

    if (!currentInvoice && !subscription) return alertList;

    // 1. Pagamento falhou ou conta suspensa
    if (currentInvoice?.status === 'failed' || userStatus.billingStatus === 'suspended') {
      alertList.push({
        id: 'payment-failed',
        type: 'error',
        title: 'Pagamento Falhou',
        message: 'Sua fatura não foi paga. Regularize agora para evitar a suspensão da sua conta.',
        action: {
          label: 'Pagar Agora',
          href: '/admin/plans',
        },
        dismissible: false,
      });
    }

    // 2. Pagamento atrasado (overdue)
    if (currentInvoice?.status === 'overdue') {
      const dueDate = currentInvoice.dueDate 
        ? new Date(currentInvoice.dueDate).toLocaleDateString('pt-BR')
        : 'data anterior';
      const graceEnd = currentInvoice.gracePeriodEnd 
        ? new Date(currentInvoice.gracePeriodEnd).toLocaleDateString('pt-BR')
        : 'breve';

      alertList.push({
        id: 'payment-overdue',
        type: 'error',
        title: 'Fatura Atrasada',
        message: `Sua fatura venceu em ${dueDate}. Pague até ${graceEnd} para evitar a suspensão da conta.`,
        action: {
          label: 'Regularizar',
          href: '/admin/plans',
        },
        dismissible: false,
      });
    }

    // 3. Grace period
    if (
      currentInvoice?.status === 'pending' &&
      currentInvoice?.gracePeriodEnd &&
      userStatus.billingStatus === 'grace_period'
    ) {
      const graceEnd = new Date(currentInvoice.gracePeriodEnd);
      const daysRemaining = Math.ceil(
        (graceEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      alertList.push({
        id: 'grace-period',
        type: 'warning',
        title: 'Período de Carência',
        message: `Você está no período de carência. Pague até ${graceEnd.toLocaleDateString('pt-BR')} (${daysRemaining} dias) para manter sua conta ativa.`,
        action: {
          label: 'Pagar Agora',
          href: '/admin/plans',
        },
        dismissible: true,
      });
    }

    // 4. Próximo vencimento (vence em <= 3 dias)
    if (
      currentInvoice?.status === 'pending' &&
      currentInvoice?.dueDate
    ) {
      const dueDate = new Date(currentInvoice.dueDate);
      const daysLeft = Math.ceil(
        (dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      if (daysLeft <= 3 && daysLeft > 0) {
        const amount = currentInvoice.totalAmount
          ? new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(currentInvoice.totalAmount)
          : '';

        alertList.push({
          id: 'upcoming-due',
          type: 'info',
          title: 'Fatura Próxima do Vencimento',
          message: `Sua fatura ${amount ? `de ${amount} ` : ''}vence em ${daysLeft} dia${daysLeft !== 1 ? 's' : ''}.`,
          action: {
            label: 'Ver Fatura',
            href: '/admin/plans',
          },
          dismissible: true,
        });
      }
    }

    // 5. Cobrança automática falhou
    if (
      currentInvoice?.status === 'pending' &&
      (currentInvoice?.autoChargeAttempts || 0) > 0
    ) {
      alertList.push({
        id: 'auto-charge-failed',
        type: 'warning',
        title: 'Cobrança Automática Falhou',
        message: `Não foi possível cobrar no seu cartão (${currentInvoice.autoChargeAttempts}x). Verifique os dados do cartão ou pague via PIX.`,
        action: {
          label: 'Atualizar Pagamento',
          href: '/admin/plans',
        },
        dismissible: true,
      });
    }

    // 6. Plano expirado
    if (
      userStatus.planStatus === 'expired' &&
      userStatus.billingStatus !== 'suspended'
    ) {
      alertList.push({
        id: 'plan-expired',
        type: 'warning',
        title: 'Plano Expirado',
        message: 'Seu plano expirou. Renove agora para continuar com todos os benefícios.',
        action: {
          label: 'Renovar Plano',
          href: '/admin/plans',
        },
        dismissible: false,
      });
    }

    return alertList;
  }, [currentInvoice, subscription, userStatus]);

  // Função para recarregar todos os dados
  const refetch = async () => {
    await Promise.all([refetchSubscription(), refetchBilling()]);
  };

  return {
    alerts,
    hasAlerts: alerts.length > 0,
    isLoading: isLoadingSubscription || isLoadingBilling,
    error: subscriptionError || billingError,
    userStatus,
    invoice,
    refetch,
  };
}

export default useBillingAlerts;
