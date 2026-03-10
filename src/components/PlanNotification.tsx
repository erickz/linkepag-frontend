'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { getProfile, apiCache, CACHE_KEYS } from '@/lib/api';

interface PlanInfo {
  planId: number;
  planStatus: 'active' | 'expired' | 'cancelled' | 'pending_payment';
  planExpiryDate?: string;
  planStartedAt?: string;
  planRenewsAt?: string;
  paidLinksCount: number;
}

interface PlanNotificationProps {
  planInfo?: PlanInfo;
}

interface PlanBadgeProps {
  planInfo?: PlanInfo;
}

const PLANS = {
  1: { name: 'Grátis', maxPaidLinks: 3 },
  2: { name: 'Creator', maxPaidLinks: 10 },
  3: { name: 'Pro', maxPaidLinks: Infinity },
  4: { name: 'Ilimitado', maxPaidLinks: Infinity },
};

// Variável global para controlar requisição pendente entre componentes
let globalProfilePromise: Promise<unknown> | null = null;
let globalRequestCount = 0;

// Helper para extrair PlanInfo da resposta da API
const extractPlanInfoFromResponse = (data: unknown): PlanInfo | null => {
  const response = data as { user?: unknown };
  if (!response.user) return null;
  const user = response.user as Record<string, unknown>;
  return {
    planId: (user.planId as number) || 1,
    planStatus: (user.planStatus as PlanInfo['planStatus']) || 'active',
    planExpiryDate: user.planExpiryDate as string | undefined,
    planStartedAt: user.planStartedAt as string | undefined,
    planRenewsAt: user.planRenewsAt as string | undefined,
    paidLinksCount: (user.paidLinksCount as number) || 0,
  };
};

export function PlanNotification({ planInfo: externalPlanInfo }: PlanNotificationProps = {}) {
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(externalPlanInfo || null);
  const [isLoading, setIsLoading] = useState(!externalPlanInfo);
  const [isVisible, setIsVisible] = useState(true);
  const isMounted = useRef(true);
  const requestId = useRef(++globalRequestCount);

  useEffect(() => {
    // Se recebeu dados via props, não faz chamada API
    if (externalPlanInfo) {
      setPlanInfo(externalPlanInfo);
      setIsLoading(false);
      return;
    }

    // Verifica se já existe no cache
    const cached = apiCache.get(CACHE_KEYS.PROFILE);
    if (cached) {
      const info = extractPlanInfoFromResponse(cached);
      if (info) {
        setPlanInfo(info);
        setIsLoading(false);
        return;
      }
    }

    // Função para carregar dados
    const loadPlanInfo = async () => {
      try {
        // Se já existe uma requisição global em andamento, reutiliza
        if (!globalProfilePromise) {
          globalProfilePromise = getProfile();
        }

        const data = await globalProfilePromise;
        
        // Só atualiza se o componente ainda está montado
        if (!isMounted.current) {
          return;
        }

        const info = extractPlanInfoFromResponse(data);
        if (info) {
          setPlanInfo(info);
        }
      } catch (err) {
        console.error(`[PlanNotification] #${requestId.current} Erro ao carregar informações do plano:`, err);
      } finally {
        // Limpa a requisição global após um pequeno delay para permitir que outros componentes reutilizem
        setTimeout(() => {
          globalProfilePromise = null;
        }, 100);
        
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    };

    loadPlanInfo();

    return () => {
      isMounted.current = false;
    };
  }, [externalPlanInfo]);

  if (isLoading || !planInfo || !isVisible) {
    return null;
  }

  const plan = PLANS[planInfo.planId as keyof typeof PLANS];

  // Check if has pending payment (upgrade em andamento)
  if (planInfo.planStatus === 'pending_payment') {
    return (
      <div className="bg-amber-50 border-b border-amber-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-amber-900 text-sm">
                  Upgrade pendente de pagamento
                </p>
                <p className="text-amber-700 text-xs">
                  Complete o pagamento para ativar seu novo plano
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/#pricing"
                className="inline-flex items-center px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition"
              >
                Ver pagamento
              </Link>
              <button
                onClick={() => setIsVisible(false)}
                className="text-amber-400 hover:text-amber-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check if plan is expired
  if (planInfo.planStatus === 'expired') {
    return (
      <div className="bg-rose-50 border-b border-rose-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-rose-900 text-sm">
                  Seu plano expirou
                </p>
                <p className="text-rose-700 text-xs">
                  Renove agora para continuar recebendo pagamentos
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/#pricing"
                className="inline-flex items-center px-4 py-2 bg-rose-600 text-white text-sm font-medium rounded-lg hover:bg-rose-700 transition"
              >
                Renovar plano
              </Link>
              <button
                onClick={() => setIsVisible(false)}
                className="text-rose-400 hover:text-rose-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check if plan is expiring soon
  if (planInfo.planExpiryDate && planInfo.planId !== 1) {
    const expiryDate = new Date(planInfo.planExpiryDate);
    const daysLeft = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    if (daysLeft <= 7 && daysLeft > 0) {
      return (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-amber-900 text-sm">
                    Seu plano {plan.name} expira em {daysLeft} dia{daysLeft > 1 ? 's' : ''}
                  </p>
                  <p className="text-amber-700 text-xs">
                    Renove para não perder acesso aos recursos
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/#pricing"
                  className="inline-flex items-center px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition"
                >
                  Renovar
                </Link>
                <button
                  onClick={() => setIsVisible(false)}
                  className="text-amber-400 hover:text-amber-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  // Check if approaching paid links limit
  if (plan && plan.maxPaidLinks !== Infinity) {
    const remaining = plan.maxPaidLinks - planInfo.paidLinksCount;
    
    if (remaining <= 1 && remaining > 0) {
      return (
        <div className="bg-blue-50 border-b border-blue-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-blue-900 text-sm">
                    Você tem {remaining} link monetizado disponível
                  </p>
                  <p className="text-blue-700 text-xs">
                    Faça upgrade para criar links ilimitados
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/#pricing"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
                >
                  Ver planos
                </Link>
                <button
                  onClick={() => setIsVisible(false)}
                  className="text-blue-400 hover:text-blue-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  return null;
}

// Simple version for compact display (used in dashboard)
export function PlanBadge({ planInfo: externalPlanInfo }: PlanBadgeProps = {}) {
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(externalPlanInfo || null);
  const isMounted = useRef(true);
  const requestId = useRef(++globalRequestCount);

  useEffect(() => {
    // Se recebeu dados via props, não faz chamada API
    if (externalPlanInfo) {
      setPlanInfo(externalPlanInfo);
      return;
    }

    // Verifica se já existe no cache
    const cached = apiCache.get(CACHE_KEYS.PROFILE);
    if (cached) {
      const info = extractPlanInfoFromResponse({ user: cached });
      if (info) {
        setPlanInfo(info);
        return;
      }
    }

    // Função para carregar dados
    const loadPlanInfo = async () => {
      try {
        // Se já existe uma requisição global em andamento, reutiliza
        if (!globalProfilePromise) {
          globalProfilePromise = getProfile();
        }

        const data = await globalProfilePromise;
        
        // Só atualiza se o componente ainda está montado
        if (!isMounted.current) {
          return;
        }

        const info = extractPlanInfoFromResponse(data);
        if (info) {
          setPlanInfo(info);
        }
      } catch (err) {
        console.error(`[PlanBadge] #${requestId.current} Erro ao carregar informações do plano:`, err);
      } finally {
        // Limpa a requisição global após um pequeno delay para permitir que outros componentes reutilizem
        setTimeout(() => {
          globalProfilePromise = null;
        }, 100);
      }
    };

    loadPlanInfo();

    return () => {
      isMounted.current = false;
    };
  }, [externalPlanInfo]);

  if (!planInfo) return null;

  const plan = PLANS[planInfo.planId as keyof typeof PLANS];
  const isExpired = planInfo.planStatus === 'expired';
  const isPending = planInfo.planStatus === 'pending_payment';

  // Se tem upgrade pendente, mostra badge especial
  if (isPending) {
    return (
      <Link
        href="/#pricing"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition bg-amber-100 text-amber-700 hover:bg-amber-200"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Upgrade Pendente
      </Link>
    );
  }

  return (
    <Link
      href="/#pricing"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition ${
        isExpired
          ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
          : planInfo.planId === 1
          ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
      }`}
    >
      {isExpired && (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )}
      Plano {plan?.name}
      {isExpired && ' (Expirado)'}
    </Link>
  );
}
