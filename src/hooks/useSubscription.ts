'use client';

import { useMemo } from 'react';
import { useApi, useApiMutation } from './useApi';
import {
  getPlans,
  getCurrentSubscription,
  createSubscription,
  cancelSubscription,
  renewSubscription,
  CACHE_KEYS,
  getStoredToken,
} from '@/lib/api';

export interface Plan {
  id: number;
  name: string;
  monthlyPrice: number;
  feePerTransaction: number;
  maxPaidLinks: number | null;
  features: string[];
  popular?: boolean;
}

export interface Subscription {
  id: string;
  planId: number;
  planName: string;
  status: 'active' | 'expired' | 'cancelled' | 'pending_payment' | 'payment_failed';
  amount: number;
  startedAt: string;
  expiresAt: string;
  autoRenew?: boolean;
  paymentMethod?: 'credit_card' | 'pix';
  pixCode?: string; // Código PIX copia e cola (quando pendente)
  pixQrCodeUrl?: string; // URL do QR code PIX (quando pendente)
  pixExpirationDate?: string; // Data de expiração do PIX (quando pendente)
  pixData?: {
    pixCode: string;
    qrCodeUrl: string;
    expirationDate: string;
  };
}

export function useSubscription() {
  // Verifica se há token antes de fazer chamadas autenticadas
  const token = typeof window !== 'undefined' ? getStoredToken() : null;
  const isAuthenticated = !!token;

  // Busca planos disponíveis (público, não precisa de auth)
  const {
    data: plansData,
    isLoading: isLoadingPlans,
    error: plansError,
  } = useApi<{ success: boolean; plans: Plan[] }>(
    CACHE_KEYS.PLANS,
    getPlans,
    { ttl: 5 * 60 * 1000 } // Cache de 5 minutos
  );

  // Busca assinatura atual do usuário (só se autenticado)
  const {
    data: subscriptionData,
    isLoading: isLoadingSubscription,
    error: subscriptionError,
    refetch: refetchSubscription,
  } = useApi<{ success: boolean; subscription: Subscription | null }>(
    CACHE_KEYS.SUBSCRIPTION,
    getCurrentSubscription,
    {
      ttl: 30 * 1000, // Cache de 30 segundos
      enabled: isAuthenticated, // Só executa se estiver autenticado
    }
  );

  const subscription = subscriptionData?.subscription;
  const plans = plansData?.plans || [];

  // Encontra o plano atual
  const currentPlan = useMemo(() => {
    if (!subscription) return plans.find(p => p.id === 1); // Plano Grátis como padrão
    
    // Converte para número para garantir comparação correta
    const subPlanId = Number(subscription.planId);
    const subStatus = subscription.status;
    
    // Se expirou ou cancelou, volta para Grátis
    if (subStatus === 'expired' || subStatus === 'cancelled') {
      return plans.find(p => p.id === 1); // Grátis
    }
    
    // Se pendente ou ativo, mostra o plano da assinatura
    // Status 'pending_payment' = upgrade em andamento, usa limite do novo plano
    return plans.find(p => p.id === subPlanId);
  }, [subscription, plans]);

  // Calcula economia ao fazer upgrade
  const calculateUpgradeSavings = (targetPlanId: number, monthlySales: number = 100): number => {
    if (!currentPlan || targetPlanId <= currentPlan.id) return 0;
    
    const targetPlan = plans.find(p => p.id === targetPlanId);
    if (!targetPlan) return 0;

    const currentMonthlyCost = currentPlan.monthlyPrice + (currentPlan.feePerTransaction * monthlySales);
    const targetMonthlyCost = targetPlan.monthlyPrice + (targetPlan.feePerTransaction * monthlySales);
    
    return Math.max(0, currentMonthlyCost - targetMonthlyCost);
  };

  // Verifica se pode criar link pago
  const canCreatePaidLink = (currentPaidLinksCount: number = 0): { allowed: boolean; message?: string } => {
    if (!subscription) {
      return { allowed: false, message: 'Carregando informações do plano...' };
    }

    // Se expirou, bloqueia
    if (subscription.status === 'expired') {
      return { allowed: false, message: 'Seu plano expirou. Renove para criar links monetizados.' };
    }

    // Se cancelado, bloqueia
    if (subscription.status === 'cancelled') {
      return { allowed: false, message: 'Seu plano foi cancelado. Assine novamente para criar links monetizados.' };
    }

    // Se falhou pagamento, bloqueia
    if (subscription.status === 'payment_failed') {
      return { allowed: false, message: 'Pagamento falhou. Atualize suas informações de pagamento.' };
    }

    // Pendente ou ativo: usa o plano da assinatura
    const plan = currentPlan;
    if (!plan) {
      return { allowed: false, message: 'Plano não encontrado' };
    }

    // Verifica limite de links
    if (plan.maxPaidLinks !== null && currentPaidLinksCount >= plan.maxPaidLinks) {
      return {
        allowed: false,
        message: `Limite de ${plan.maxPaidLinks} links monetizados atingido. Faça upgrade para criar mais.`,
      };
    }

    return { allowed: true };
  };

  // Verifica se assinatura está ativa
  const isSubscriptionActive = (): boolean => {
    return subscription?.status === 'active';
  };

  // Verifica se plano está próximo de expirar (menos de 3 dias)
  const isExpiringSoon = (): boolean => {
    if (!subscription?.expiresAt) return false;
    const expiresAt = new Date(subscription.expiresAt);
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    return expiresAt <= threeDaysFromNow && subscription.status === 'active';
  };

  // Mutations
  const createSubscriptionMutation = useApiMutation(
    async ({ planId, paymentMethod, cardToken }: { planId: number; paymentMethod: 'credit_card' | 'pix'; cardToken?: string }) => {
      return createSubscription(planId, paymentMethod, cardToken);
    }
  );

  const cancelSubscriptionMutation = useApiMutation(
    async (reason?: string) => {
      return cancelSubscription(reason);
    }
  );

  const renewSubscriptionMutation = useApiMutation(
    async (cardToken?: string) => {
      return renewSubscription(cardToken);
    }
  );

  // Conta links pagos (para mostrar uso)
  const getPaidLinksUsage = (currentCount: number): { used: number; limit: number | null; percentage: number } => {
    const limit = currentPlan?.maxPaidLinks ?? null;
    if (limit === null) {
      return { used: currentCount, limit: null, percentage: 0 };
    }
    return {
      used: currentCount,
      limit,
      percentage: Math.min(100, Math.round((currentCount / limit) * 100)),
    };
  };

  return {
    // Dados
    plans,
    subscription,
    currentPlan,
    
    // Loading states
    isLoading: isLoadingPlans || isLoadingSubscription,
    isLoadingPlans,
    isLoadingSubscription,
    
    // Errors
    error: plansError || subscriptionError,
    
    // Helpers
    canCreatePaidLink,
    isSubscriptionActive,
    isExpiringSoon,
    calculateUpgradeSavings,
    getPaidLinksUsage,
    
    // Mutations
    createSubscription: createSubscriptionMutation.mutate,
    isCreatingSubscription: createSubscriptionMutation.isLoading,
    
    cancelSubscription: cancelSubscriptionMutation.mutate,
    isCancellingSubscription: cancelSubscriptionMutation.isLoading,
    
    renewSubscription: renewSubscriptionMutation.mutate,
    isRenewingSubscription: renewSubscriptionMutation.isLoading,
    
    // Refetch
    refetchSubscription,
  };
}
