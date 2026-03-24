'use client';

import { useMemo, useCallback } from 'react';
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
  monthlyPriceFormatted: string;
  feePerTransaction: number;
  feePerTransactionFormatted: string;
  maxPaidLinks: number | null;
  links: string;
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

// Plano padrão (Starter) quando não há assinatura
const DEFAULT_PLAN_ID = 1;

// Plano de fallback quando os planos ainda não foram carregados
const FALLBACK_PLAN: Plan = {
  id: DEFAULT_PLAN_ID,
  name: 'Starter',
  monthlyPrice: 0,
  monthlyPriceFormatted: '0,00',
  feePerTransaction: 8,
  feePerTransactionFormatted: '8%',
  maxPaidLinks: 3,
  links: '3 links monetizados',
  features: ['3 links monetizados', 'Links gratuitos ilimitados', 'Relatório básico'],
};

export function useSubscription() {
  // Verifica se há token antes de fazer chamadas autenticadas
  const token = typeof window !== 'undefined' ? getStoredToken() : null;
  const isAuthenticated = !!token;

  // Memoize fetch functions to prevent unnecessary re-renders
  const fetchPlans = useCallback(() => getPlans(), []);
  const fetchSubscription = useCallback(() => getCurrentSubscription(), []);

  // Busca planos disponíveis (público, não precisa de auth)
  const {
    data: plansData,
    isLoading: isLoadingPlans,
    error: plansError,
  } = useApi<{ success: boolean; plans: Plan[] }>(
    CACHE_KEYS.PLANS,
    fetchPlans,
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
    fetchSubscription,
    {
      ttl: 30 * 1000, // Cache de 30 segundos
      enabled: isAuthenticated, // Só executa se estiver autenticado
    }
  );

  const subscription = subscriptionData?.subscription;
  const plans = plansData?.plans || [];

  // Encontra o plano atual - sempre retorna um plano válido
  const currentPlan = useMemo((): Plan => {
    // Se planos ainda não foi carregado, retorna o plano fallback
    if (plans.length === 0) {
      return FALLBACK_PLAN;
    }
    
    // Se não tem assinatura, usa o plano Starter como padrão
    if (!subscription) {
      return plans.find(p => p.id === DEFAULT_PLAN_ID) || FALLBACK_PLAN;
    }
    
    // Converte para número para garantir comparação correta
    const subPlanId = Number(subscription.planId);
    const subStatus = subscription.status;
    
    // Se expirou ou cancelou, volta para Starter
    if (subStatus === 'expired' || subStatus === 'cancelled') {
      return plans.find(p => p.id === DEFAULT_PLAN_ID) || FALLBACK_PLAN;
    }
    
    // Se pendente ou ativo, mostra o plano da assinatura
    // Status 'pending_payment' = upgrade em andamento, usa limite do novo plano
    return plans.find(p => p.id === subPlanId) || FALLBACK_PLAN;
  }, [subscription, plans]);

  // Calcula economia ao fazer upgrade
  const calculateUpgradeSavings = useCallback((targetPlanId: number, monthlySales: number = 100): number => {
    if (currentPlan.id >= targetPlanId) return 0;
    
    const targetPlan = plans.find(p => p.id === targetPlanId);
    if (!targetPlan) return 0;

    const currentMonthlyCost = currentPlan.monthlyPrice + (currentPlan.feePerTransaction * monthlySales);
    const targetMonthlyCost = targetPlan.monthlyPrice + (targetPlan.feePerTransaction * monthlySales);
    
    return Math.max(0, currentMonthlyCost - targetMonthlyCost);
  }, [currentPlan, plans]);

  // Verifica se pode criar link pago
  const canCreatePaidLink = useCallback((currentPaidLinksCount: number = 0): { allowed: boolean; message?: string } => {
    // Se planos ainda estão carregando, permite criar (usando plano fallback)
    // O plano fallback permite até 3 links
    const plan = currentPlan;

    // Se não tem assinatura, usa o plano atual (que será o Starter por padrão)
    if (!subscription) {
      // Plano Starter permite criar links até o limite
      if (plan.maxPaidLinks !== null && currentPaidLinksCount >= plan.maxPaidLinks) {
        return {
          allowed: false,
          message: `Limite de ${plan.maxPaidLinks} links monetizados atingido no plano Starter. Faça upgrade para criar mais.`,
        };
      }
      return { allowed: true };
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

    // Verifica limite de links
    if (plan.maxPaidLinks !== null && currentPaidLinksCount >= plan.maxPaidLinks) {
      return {
        allowed: false,
        message: `Limite de ${plan.maxPaidLinks} links monetizados atingido. Faça upgrade para criar mais.`,
      };
    }

    return { allowed: true };
  }, [subscription, currentPlan]);

  // Verifica se assinatura está ativa
  const isSubscriptionActive = useCallback((): boolean => {
    return subscription?.status === 'active';
  }, [subscription]);

  // Verifica se plano está próximo de expirar (menos de 3 dias)
  const isExpiringSoon = useCallback((): boolean => {
    if (!subscription?.expiresAt) return false;
    const expiresAt = new Date(subscription.expiresAt);
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    return expiresAt <= threeDaysFromNow && subscription.status === 'active';
  }, [subscription]);

  // Mutations
  const createSubscriptionMutation = useApiMutation(
    async ({ planId, paymentMethod, cardToken, cardHolderCpf, cardBrand }: 
      { planId: number; paymentMethod: 'credit_card' | 'pix'; cardToken?: string; cardHolderCpf?: string; cardBrand?: string }) => {
      const result = await createSubscription(planId, paymentMethod, cardToken, cardHolderCpf, cardBrand);
      // Retorna o resultado completo incluindo pixData
      return result;
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

  // Conta links monetizados (para mostrar uso)
  const getPaidLinksUsage = useCallback((currentCount: number): { used: number; limit: number | null; percentage: number } => {
    const limit = currentPlan?.maxPaidLinks ?? null;
    if (limit === null) {
      return { used: currentCount, limit: null, percentage: 0 };
    }
    return {
      used: currentCount,
      limit,
      percentage: Math.min(100, Math.round((currentCount / limit) * 100)),
    };
  }, [currentPlan]);

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
