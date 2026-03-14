'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, useProtectedRoute, User } from '@/hooks/useAuth';
import { useApi } from '@/hooks/useApi';
import { useSubscription } from '@/hooks/useSubscription';
import { CreditCardForm } from '@/components/CreditCardForm';

import { getBillingSummary, BillingSummary, getLinks } from '@/lib/api';

// Types para Links
interface LinkItem {
  _id: string;
  title: string;
  isPaid?: boolean;
  isActive?: boolean;
}

// Type para Plan (usado no helper)
interface PlanType {
  id: number;
  name: string;
  popular?: boolean;
  features: string[];
}

// Types para Billing Híbrido
interface BillingCycle {
  id: string;
  planId: number;
  planName: string;
  startDate: string;
  endDate: string;
  daysRemaining: number;
  transactionCount: number;
  totalTransactionFees: number;
  monthlyFee: number;
  totalAmount: number;
  status: 'open' | 'closing' | 'closed' | 'invoiced';
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: 'draft' | 'pending' | 'processing' | 'paid' | 'overdue' | 'failed' | 'cancelled';
  subscriptionAmount: number;
  usageAmount: number;
  totalAmount: number;
  dueDate: string;
  gracePeriodEnd?: string;
  paymentMethod?: 'credit_card_auto' | 'credit_card_manual' | 'pix' | 'boleto';
  pixCode?: string;
  pixQrCodeUrl?: string;
  pixExpirationDate?: string;
}

interface BillingData {
  cycle: BillingCycle | null;
  invoice: Invoice | null;
  usage: {
    transactions: number;
    totalFees: number;
    feePerTransaction: number;
    projectedTotal: number;
  };
}

// Configuração de cores por plano
const PLAN_COLORS: Record<number, { bg: string; border: string; gradient: string; badge: string; text: string }> = {
  1: { 
    bg: 'bg-slate-50', 
    border: 'border-slate-200', 
    gradient: 'from-slate-400 to-slate-600',
    badge: 'bg-slate-100 text-slate-700',
    text: 'text-slate-700'
  },
  2: { 
    bg: 'bg-indigo-50', 
    border: 'border-indigo-200', 
    gradient: 'from-indigo-500 to-indigo-700',
    badge: 'bg-indigo-100 text-indigo-700',
    text: 'text-indigo-700'
  },
  3: { 
    bg: 'bg-purple-50', 
    border: 'border-purple-200', 
    gradient: 'from-purple-500 to-purple-700',
    badge: 'bg-purple-100 text-purple-700',
    text: 'text-purple-700'
  },
  4: { 
    bg: 'bg-amber-50', 
    border: 'border-amber-200', 
    gradient: 'from-amber-500 to-amber-700',
    badge: 'bg-amber-100 text-amber-700',
    text: 'text-amber-700'
  },
};

// Helper para obter badge baseado no plano
const getPlanBadge = (plan: PlanType): string => {
  if (plan.popular) return 'Mais popular';
  switch (plan.id) {
    case 1: return 'Starter';
    case 3: return 'Recomendado';
    case 4: return 'Top';
    default: return '';
  }
};

// Formatters
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
  });
};

const formatPeriod = (start: string, end: string) => {
  return `${formatDate(start)} até ${formatDate(end)}`;
};

// Componente de Loading Skeleton
function PlansSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-slate-200 rounded w-1/4"></div>
      <div className="h-64 bg-slate-200 rounded-2xl"></div>
      <div className="h-48 bg-slate-200 rounded-2xl"></div>
    </div>
  );
}

// Badge de Status
function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { bg: string; text: string; label: string }> = {
    active: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Ativo' },
    pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Aguardando pagamento' },
    expired: { bg: 'bg-rose-100', text: 'text-rose-700', label: 'Expirado' },
    cancelled: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Cancelado' },
    open: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Aberto' },
    closed: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Fechado' },
  };

  const variant = variants[status] || variants.active;

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${variant.bg} ${variant.text}`}>
      {variant.label}
    </span>
  );
}

// Alert Component
function Alert({ 
  variant, 
  title, 
  children, 
  action 
}: { 
  variant: 'success' | 'error' | 'warning' | 'info';
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const colors = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    error: 'bg-rose-50 border-rose-200 text-rose-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  return (
    <div className={`rounded-xl border p-4 ${colors[variant]}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="font-semibold">{title}</h4>
          <div className="text-sm mt-1 opacity-90">{children}</div>
        </div>
        {action && <div>{action}</div>}
      </div>
    </div>
  );
}

// Main Page Component
export default function PlansPage() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  
  // Estados locais
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'pix'>('pix');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [cardToken, setCardToken] = useState<string | null>(null);
  const [cardHolderCpf, setCardHolderCpf] = useState<string | null>(null);
  /**
   * Ref para armazenar o token do cartão de forma síncrona.
   * O estado React é assíncrono, então quando o callback onCardTokenGenerated é chamado
   * e em seguida onTokenizationComplete é disparado, o estado ainda não foi atualizado.
   * A ref garante acesso imediato ao token sem esperar re-renderização.
   */
  const cardTokenRef = useRef<string | null>(null);
  const cardHolderCpfRef = useRef<string | null>(null);
  const [isCardTokenized, setIsCardTokenized] = useState(false);
  const [shouldTokenize, setShouldTokenize] = useState(false);
  const [pixData, setPixData] = useState<{
    pixCode: string;
    qrCodeUrl: string;
    expirationDate: string;
  } | null>(null);

  useProtectedRoute('/login');

  // Hooks de dados
  const {
    plans,
    subscription,
    currentPlan,
    isLoading: isLoadingSubscription,
    isExpiringSoon,
    createSubscription,
    isCreatingSubscription,
    cancelSubscription,
    isCancellingSubscription,
    refetchSubscription,
  } = useSubscription();

  // Fetch billing data
  const fetchBillingData = useCallback(async (): Promise<BillingData> => {
    let billingSummary: BillingSummary | null = null;
    try {
      billingSummary = await getBillingSummary();
    } catch (error) {
      console.error('Erro ao buscar billing summary:', error);
    }

    const hybridData = billingSummary?.hybrid;
    
    const transactionCount = hybridData?.transactionCount ?? billingSummary?.currentInvoice?.transactionCount ?? 0;
    const totalTransactionFees = hybridData?.totalTransactionFees ?? billingSummary?.currentInvoice?.totalFees ?? 0;
    
    const cycle: BillingCycle | null = subscription ? {
      id: subscription.id || 'current',
      planId: subscription.planId,
      planName: subscription.planName,
      startDate: subscription.startedAt || new Date().toISOString(),
      endDate: subscription.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      daysRemaining: subscription.expiresAt 
        ? Math.max(0, Math.ceil((new Date(subscription.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : 30,
      transactionCount,
      totalTransactionFees,
      monthlyFee: currentPlan?.monthlyPrice || 0,
      totalAmount: (currentPlan?.monthlyPrice || 0) + totalTransactionFees,
      status: subscription.status === 'active' ? 'open' : 'closed',
    } : null;

    return {
      cycle,
      invoice: null,
      usage: {
        transactions: transactionCount,
        totalFees: totalTransactionFees,
        feePerTransaction: currentPlan?.feePerTransaction || 0.70,
        projectedTotal: (currentPlan?.monthlyPrice || 0) + totalTransactionFees,
      },
    };
  }, [subscription, currentPlan]);

  const { 
    data: billingData, 
    isLoading: isLoadingBilling,
    refetch: refetchBilling 
  } = useApi<BillingData>('billing-current', fetchBillingData, {
    ttl: 30 * 1000, // 30 segundos
    enabled: isAuthenticated,
  });

  // Fetch links para contar links monetizados
  const fetchLinksData = useCallback(async () => {
    const response = await getLinks();
    return response.links || [];
  }, []);

  const { 
    data: linksData, 
    isLoading: isLoadingLinks 
  } = useApi<LinkItem[]>('user-links', fetchLinksData, {
    ttl: 30 * 1000,
    enabled: isAuthenticated,
  });

  // Contar links monetizados (isPaid = true)
  const paidLinksCount = useMemo(() => {
    if (!linksData) return 0;
    return linksData.filter(link => link.isPaid === true).length;
  }, [linksData]);

  // Carregar pixData da subscription pendente ou do estado
  useEffect(() => {
    if (subscription?.status === 'pending_payment' && subscription?.pixCode && subscription?.pixExpirationDate) {
      setPixData({
        pixCode: subscription.pixCode,
        qrCodeUrl: subscription.pixQrCodeUrl || '',
        expirationDate: subscription.pixExpirationDate,
      });
    }
  }, [subscription]);

  const handleSelectPlan = (planId: number) => {
    if (planId === selectedPlan) {
      setSelectedPlan(null);
      setPixData(null);
      // Limpa token ao cancelar seleção
      setCardToken(null);
      cardTokenRef.current = null;
      return;
    }
    setSelectedPlan(planId);
    // Limpa tokens ao selecionar novo plano para evitar uso de token antigo
    setCardToken(null);
    cardTokenRef.current = null;
    setCardHolderCpf(null);
    cardHolderCpfRef.current = null;
    setIsCardTokenized(false);
    setShouldTokenize(false);
    setPixData(null);
    
    // Scroll para o formulário de checkout após selecionar plano
    setTimeout(() => {
      document.getElementById('finalizar-assinatura')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handlePaymentMethodChange = (method: 'credit_card' | 'pix') => {
    // Se já gerou PIX, não permite trocar de método de pagamento
    if (pixData) {
      return;
    }
    
    setPaymentMethod(method);
    // Limpa tokens ao trocar método de pagamento para evitar conflito
    setCardToken(null);
    cardTokenRef.current = null;
    setCardHolderCpf(null);
    cardHolderCpfRef.current = null;
    setIsCardTokenized(false);
    setShouldTokenize(false);
    setCheckoutError(null);
    // Limpa pixData ao trocar para cartão (se estava em PIX)
    if (method === 'credit_card') {
      setPixData(null);
    }
  };

  const handleCardTokenGenerated = (token: string) => {
    // Atualiza o estado para trigger de re-renderização (UI feedback)
    setCardToken(token);
    // Atualiza a ref de forma síncrona para acesso imediato no callback seguinte
    cardTokenRef.current = token;
    setIsCardTokenized(true);
    setCheckoutError(null);
  };

  // Create subscription after token is ready
  const createSubscriptionWithToken = async () => {
    if (!selectedPlan) return;

    try {
      // Usa a ref como fonte primária (acesso síncrono) e o estado como fallback
      // A ref é atualizada imediatamente no callback, enquanto o estado pode atrasar
      const tokenToSend = paymentMethod === 'credit_card' ? cardTokenRef.current || cardToken || undefined : undefined;

      // Get CPF from ref (synchronous) or state
      const cpfToSend = paymentMethod === 'credit_card' ? cardHolderCpfRef.current || cardHolderCpf || undefined : undefined;

      const result = await createSubscription({
        planId: selectedPlan,
        paymentMethod,
        cardToken: tokenToSend,
        cardHolderCpf: cpfToSend,
      });

      // Se result for null, houve erro (já tratado no catch do useApiMutation)
      if (!result) {
        return;
      }

      if (result.pixData) {
        // Pagamento PIX: mostra QR code
        setPixData(result.pixData);
      } else {
        // Pagamento com cartão: aprovado ou pendente
        setMessage({ type: 'success', text: 'Pagamento crado com sucesso, aguarde a confirmação para ativar seu plano!' });
        setSelectedPlan(null);
      }
    } catch (error: any) {
      let errorMessage = error.response?.data?.message || error.message || 'Erro ao criar assinatura';
      
      // Melhorar mensagens de erro específicas
      if (errorMessage.includes('token') || errorMessage.includes('Token') || errorMessage.includes('card')) {
        errorMessage = 'Erro ao processar o cartão. Por favor, preencha os dados novamente.';
      } else if (errorMessage.includes('Card token service not found')) {
        errorMessage = 'O token do cartão expirou. Por favor, preencha os dados do cartão novamente.';
      }
      
      // Limpa o estado do cartão para permitir tentar novamente
      if (paymentMethod === 'credit_card') {
        setCardToken(null);
        cardTokenRef.current = null;
        setIsCardTokenized(false);
        setShouldTokenize(false);
      }
      
      setCheckoutError(errorMessage);
      setMessage({ 
        type: 'error', 
        text: errorMessage 
      });
    }
  };

  const handleSubscribe = async () => {
    if (!selectedPlan) return;

    setCheckoutError(null);

    // Se for cartão de crédito e não tiver token ainda, dispara tokenização primeiro
    if (paymentMethod === 'credit_card' && !cardTokenRef.current && !cardToken) {
      setShouldTokenize(true);
      return;
    }

    // Já tem token ou é PIX, cria assinatura direto
    await createSubscriptionWithToken();
  };

  // Callback quando tokenização completa
  const handleTokenizationComplete = () => {
    setShouldTokenize(false);
    // Usa setTimeout com 0ms para garantir que a ref foi atualizada
    // A ref é atualizada de forma síncrona, mas o estado React é async
    setTimeout(() => {
      createSubscriptionWithToken();
    }, 0);
  };

  const handleCancel = async () => {
    try {
      await cancelSubscription(cancelReason);
      setShowCancelModal(false);
      setCancelReason('');
      setMessage({ type: 'success', text: 'Assinatura cancelada. Você foi movido para o plano Starter.' });
      apiCache.clear();
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Erro ao cancelar assinatura' 
      });
    }
  };

  // Plano atual baseado em user.planId
  const isCurrentPlan = (planId: number) => {
    return planId === user?.planId;
  };

  const canUpgrade = (planId: number) => {
    if (hasPendingSubscription) return false;
    return planId > (user?.planId || 1);
  };

  const canDowngrade = (planId: number) => {
    if (hasPendingSubscription) return false;
    return planId < (user?.planId || 1);
  };

  const hasPendingSubscription = subscription?.status === 'pending_payment';
  const pendingPlanId = hasPendingSubscription ? Number(subscription?.planId) : null;

  // Plano atual do usuário baseado em user.planId (plano efetivo já pago)
  const currentUserPlanId = user?.planId || 1;
  const currentUserPlan = plans.find(p => p.id === currentUserPlanId);
  const planColors = PLAN_COLORS[currentUserPlanId];

  const scrollToPlans = () => {
    document.getElementById('comparar-planos')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Loading state
  if (isAuthLoading || isLoadingSubscription) {
    return <PlansSkeleton />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/admin/dashboard" className="hover:text-indigo-600 transition">
          Dashboard
        </Link>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-slate-900 font-medium">Seu Plano</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Seu Plano</h1>
        <p className="text-slate-500 mt-1">Acompanhe seus custos e escolha o melhor plano para suas vendas</p>
      </div>

      {/* SEÇÃO 1: Seu Plano Atual */}
      <section className={`bg-white rounded-2xl border-2 ${planColors.border} shadow-sm overflow-hidden`}>
        <div className={`${planColors.bg} px-6 py-5 border-b ${planColors.border}`}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="font-semibold text-slate-900 text-lg">Plano Atual</h2>
            <StatusBadge status={subscription?.status || 'active'} />
          </div>
        </div>
        
        <div className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6">
            {/* Logo do plano */}
            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${planColors.gradient} flex items-center justify-center shadow-lg flex-shrink-0`}>
              <span className="text-white font-bold text-3xl">
                {currentUserPlan?.name?.[0] || 'S'}
              </span>
            </div>

            {/* Info principal */}
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-2xl font-bold text-slate-900">{currentUserPlan?.name || 'Starter'}</h3>
                {currentUserPlan && (
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${PLAN_COLORS[currentUserPlan.id].badge}`}>
                    {getPlanBadge(currentUserPlan)}
                  </span>
                )}
              </div>
              
              {/* Grid de informações */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                <div>
                  <p className="text-xs text-slate-500">Mensalidade</p>
                  <p className="font-semibold text-slate-900">{formatCurrency(currentUserPlan?.monthlyPrice || 0)}/mês</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Taxa por vendas realizadas</p>
                  <p className="font-semibold text-indigo-600">
                    {(billingData?.usage?.totalFees ?? 0) > 0 
                      ? formatCurrency(billingData!.usage!.totalFees) 
                      : 'R$ 0,00'}
                  </p>
                  {(billingData?.usage?.totalFees ?? 0) > 0 && (
                    <p className="text-xs text-slate-400">
                      {billingData?.usage?.transactions || 0} venda{billingData?.usage?.transactions !== 1 ? 's' : ''} × {formatCurrency(currentUserPlan?.feePerTransaction || 0)}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-slate-500">Links monetizados</p>
                  <p className="font-semibold text-slate-900">
                    {isLoadingLinks ? '...' : `${paidLinksCount} ${currentUserPlan?.maxPaidLinks === Infinity ? '' : `/ ${currentUserPlan?.maxPaidLinks || 3}`}`}
                  </p>
                </div>
                {currentUserPlan?.id !== 1 && (
                  <div>
                    <p className="text-xs text-slate-500">Período atual</p>
                    <p className="font-semibold text-slate-900">
                      {billingData?.cycle ? formatPeriod(billingData.cycle.startDate, billingData.cycle.endDate) : '-'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* CTA */}
            <div className="lg:text-right space-y-2">
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => refetchBilling()}
                  disabled={isLoadingBilling}
                  className="inline-flex items-center px-3 py-2.5 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition"
                  title="Atualizar dados de vendas"
                >
                  <svg className={`w-4 h-4 ${isLoadingBilling ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                {!hasPendingSubscription && (
                  <button
                    onClick={scrollToPlans}
                    className="inline-flex items-center px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition shadow-sm"
                  >
                    Ver planos
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                )}
              </div>
              
              {subscription?.status === 'active' && subscription?.expiresAt && !hasPendingSubscription && (
                <p className="text-xs text-slate-500 mt-2">
                  Renova em {formatDate(subscription.expiresAt)}
                  {isExpiringSoon() && <span className="text-amber-600 font-medium ml-1">(em breve!)</span>}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO 2: Pagamento Pendente - Formulário de Pagamento */}
      {hasPendingSubscription && pendingPlanId && (
        <section className="bg-amber-50 rounded-2xl border-2 border-amber-200 overflow-hidden">
          <div className="bg-amber-100 px-6 py-5 border-b border-amber-200">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              <h2 className="font-semibold text-amber-900 text-lg">
                Pagamento Pendente - {plans.find(p => p.id === pendingPlanId)?.name || 'Plano'}
              </h2>
            </div>
          </div>
          
          <div className="p-6">
            {/* Pagamento via PIX */}
            {(subscription?.paymentMethod === 'pix' || !subscription?.paymentMethod) && (
              <>
                <p className="text-amber-800 mb-6">
                  Complete o pagamento para ativar seu {plans.find(p => p.id === pendingPlanId)?.name || 'Plano'}. 
                  Escaneie o QR Code ou copie o código PIX abaixo:
                </p>

                {/* PIX Display */}
                {pixData || (subscription?.pixCode && subscription?.pixQrCodeUrl) ? (
              <div className="bg-white rounded-xl p-6 border border-slate-200">
                <div className="text-center mb-4">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-emerald-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-slate-900">Pagamento via PIX</h3>
                  <p className="text-sm text-slate-500 mt-1">Escaneie o QR Code ou copie o código PIX</p>
                </div>

                {/* QR Code */}
                {(pixData?.qrCodeUrl || subscription?.pixQrCodeUrl) && (
                  <div className="flex justify-center mb-4">
                    <img 
                      src={pixData?.qrCodeUrl || subscription?.pixQrCodeUrl} 
                      alt="QR Code PIX" 
                      className="w-48 h-48 rounded-lg border border-slate-200"
                    />
                  </div>
                )}

                {/* Código PIX */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={pixData?.pixCode || subscription?.pixCode || ''}
                      readOnly
                      className="flex-1 px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-lg font-mono"
                    />
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(pixData?.pixCode || subscription?.pixCode || '');
                          setMessage({ type: 'success', text: 'Código PIX copiado!' });
                        } catch {
                          setMessage({ type: 'error', text: 'Erro ao copiar código' });
                        }
                      }}
                      className="px-4 py-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
                    >
                      Copiar
                    </button>
                  </div>
                  {(pixData?.expirationDate || subscription?.pixExpirationDate) && (
                    <p className="text-xs text-slate-500 text-center">
                      Expira em: {new Date(pixData?.expirationDate || subscription?.pixExpirationDate || '').toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl p-6 border border-slate-200 text-center">
                <p className="text-slate-500">Carregando dados do pagamento...</p>
              </div>
            )}
              </>
            )}

            {/* Pagamento via Cartão de Crédito */}
            {subscription?.paymentMethod === 'credit_card' && (
              <div className="bg-white rounded-xl p-6 border border-slate-200">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-indigo-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-slate-900">Pagamento com Cartão</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Sua assinatura está aguardando autorização do pagamento.
                  </p>
                </div>

                <div className="space-y-4">
                  <p className="text-sm text-slate-600 text-center">
                    O pagamento com cartão pode levar alguns minutos para ser processado.
                  </p>

                  <button
                    onClick={() => {
                      // Cancela a assinatura pendente e permite criar uma nova
                      cancelSubscription('retry_with_new_card').then(() => {
                        refetchSubscription();
                        setMessage({ 
                          type: 'info', 
                          text: 'Assinatura anterior cancelada. Você pode tentar novamente com outro cartão.' 
                        });
                      }).catch(() => {
                        setMessage({ 
                          type: 'error', 
                          text: 'Erro ao cancelar assinatura anterior. Tente novamente.' 
                        });
                      });
                    }}
                    className="w-full py-3 px-4 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
                  >
                    Tentar outra vez
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6 p-4 bg-amber-100 rounded-xl">
              <p className="text-sm text-amber-800 text-center">
                <strong>Importante:</strong> Se já realizou o pagamento aguarde que o seu plano será atualizado em instantes.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* SEÇÃO 3: Checkout Condicional (quando seleciona novo plano) */}
      {selectedPlan && !hasPendingSubscription && (
        <section id="finalizar-assinatura" className="bg-emerald-50 rounded-2xl border-2 border-emerald-200 overflow-hidden scroll-mt-6">
          <div className="bg-emerald-100 px-6 py-5 border-b border-emerald-200">
            <h2 className="font-semibold text-emerald-900 text-lg">
              Finalizar {canUpgrade(selectedPlan) ? 'Upgrade' : 'Downgrade'}
            </h2>
          </div>
          
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-6 mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${PLAN_COLORS[selectedPlan].gradient} flex items-center justify-center`}>
                  <span className="text-white font-bold text-lg">
                    {plans.find(p => p.id === selectedPlan)?.name || 'Plano'[0]}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{plans.find(p => p.id === selectedPlan)?.name || 'Plano'}</p>
                  <p className="text-sm text-slate-500">
                    {formatCurrency(plans.find(p => p.id === selectedPlan)?.monthlyPrice || 0)}/mês
                  </p>
                </div>
              </div>
            </div>

            {/* Formas de pagamento */}
            <div className="space-y-4 mb-6">
              <p className="text-sm font-medium text-slate-700">Escolha como pagar:</p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => handlePaymentMethodChange('pix')}
                  disabled={!!pixData}
                  className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-medium transition ${
                    paymentMethod === 'pix'
                      ? 'border-emerald-500 bg-emerald-100 text-emerald-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  } ${!!pixData ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    Pagar com PIX
                  </div>
                </button>

                <button
                  onClick={() => handlePaymentMethodChange('credit_card')}
                  disabled={!!pixData}
                  className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-medium transition ${
                    paymentMethod === 'credit_card'
                      ? 'border-emerald-500 bg-emerald-100 text-emerald-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  } ${!!pixData ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    Cartão de crédito
                  </div>
                </button>
              </div>

              {/* Instrução quando PIX está selecionado mas ainda não gerado */}
              {paymentMethod === 'pix' && !pixData && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm text-blue-800 font-medium">Como pagar com PIX</p>
                      <p className="text-sm text-blue-600 mt-1">
                        Confirme para gerar o QR Code e código PIX da fatura
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Aviso quando PIX já foi gerado - método de pagamento travado */}
              {pixData && (
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <div>
                      <p className="text-sm text-amber-800 font-medium">Pagamento em andamento</p>
                      <p className="text-sm text-amber-600 mt-1">
                        O PIX já foi gerado. Complete o pagamento ou cancele para escolher outro método.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === 'credit_card' && (
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                  <CreditCardForm 
                    onCardTokenGenerated={handleCardTokenGenerated}
                    onError={(error) => setMessage({ type: 'error', text: error })}
                    onValidationChange={setIsCardTokenized}
                    isProcessing={isCreatingSubscription}
                    shouldTokenize={shouldTokenize}
                    onTokenizationComplete={handleTokenizationComplete}
                  />
                </div>
              )}
            </div>

            {/* PIX Code Display */}
            {pixData && (
              <div className="bg-white rounded-xl p-6 border border-slate-200 mb-6">
                <div className="text-center mb-4">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-emerald-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-slate-900">Pagamento via PIX</h3>
                  <p className="text-sm text-slate-500 mt-1">Escaneie o QR Code ou copie o código PIX</p>
                </div>

                {pixData.qrCodeUrl && (
                  <div className="flex justify-center mb-4">
                    <img 
                      src={pixData.qrCodeUrl} 
                      alt="QR Code PIX" 
                      className="w-48 h-48 rounded-lg border border-slate-200"
                    />
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={pixData.pixCode}
                      readOnly
                      className="flex-1 px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-lg font-mono"
                    />
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(pixData.pixCode);
                          setMessage({ type: 'success', text: 'Código PIX copiado!' });
                        } catch {
                          setMessage({ type: 'error', text: 'Erro ao copiar código' });
                        }
                      }}
                      className="px-4 py-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
                    >
                      Copiar
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 text-center">
                    Expira em: {new Date(pixData.expirationDate).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            )}

            {/* Mensagem de erro específica do checkout */}
            {checkoutError && (
              <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-rose-800">Erro no pagamento</p>
                    <p className="text-sm text-rose-600 mt-1">{checkoutError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Botão de confirmação */}
            <button
              onClick={() => {
                if (paymentMethod === 'pix' && pixData) {
                  // PIX já gerado: apenas refresh da página
                  window.location.reload();
                } else {
                  handleSubscribe();
                }
              }}
              disabled={isCreatingSubscription || shouldTokenize || (paymentMethod === 'credit_card' && !isCardTokenized && !shouldTokenize)}
              className="w-full py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreatingSubscription 
                ? 'Processando...' 
                : shouldTokenize
                ? 'Validando cartão...'
                : paymentMethod === 'pix' && !pixData
                ? 'Gerar Pagamento'
                : 'Confirmar assinatura'
              }
            </button>

            {paymentMethod === 'credit_card' && !isCardTokenized && !checkoutError && (
              <p className="text-xs text-amber-600 mt-2 text-center">
                Preencha os dados do cartão para continuar
              </p>
            )}
          </div>
        </section>
      )}

      {/* Messages - Entre Plano Atual e Comparar Planos */}
      {message && (
        <Alert 
          variant={message.type === 'error' ? 'error' : message.type === 'success' ? 'success' : 'info'}
          title={message.type === 'error' ? 'Erro' : message.type === 'success' ? 'Sucesso' : 'Informação'}
        >
          {message.text}
        </Alert>
      )}

      {/* SEÇÃO 4: Comparar Planos */}
      <section id="comparar-planos" className="scroll-mt-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900">Comparar Planos</h2>
          <p className="text-slate-500 mt-1">Escolha o plano que faz mais sentido para seu volume de vendas</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => {
            const current = isCurrentPlan(plan.id);
            const upgrade = canUpgrade(plan.id);
            const downgrade = canDowngrade(plan.id);
            const selected = selectedPlan === plan.id;
            const colors = PLAN_COLORS[plan.id];
            const features = plan.features;

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-2xl border-2 transition-all flex flex-col ${
                  current
                    ? 'border-indigo-500 shadow-lg'
                    : selected
                    ? 'border-emerald-500 shadow-md'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Header */}
                <div className={`${colors.bg} px-5 py-4 rounded-t-2xl border-b ${colors.border}`}>
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${colors.badge} truncate max-w-[80px]`}>
                      {getPlanBadge(plan)}
                    </span>
                    {current && subscription?.status === 'active' && (
                      <span className="text-xs bg-indigo-600 text-white px-2 py-1 rounded-full">
                        Seu plano
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-900 text-lg">{plan.name}</h3>
                  <div className="mt-1">
                    <span className="text-3xl font-bold text-slate-900">{formatCurrency(plan.monthlyPrice)}</span>
                    <span className="text-sm text-slate-500">/mês</span>
                  </div>
                </div>

                {/* Features */}
                <div className="p-5 flex-1">
                  <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500">Taxa por venda realizada</p>
                    <p className="font-bold text-indigo-600">{formatCurrency(plan.feePerTransaction)}</p>
                  </div>

                  <ul className="space-y-2">
                    {features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                        <svg className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA */}
                <div className="p-5 pt-0">
                  {current && !hasPendingSubscription ? (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-xl bg-indigo-100 text-indigo-700 text-sm font-semibold cursor-default"
                    >
                      Seu plano atual
                    </button>
                  ) : hasPendingSubscription ? (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-xl bg-amber-100 text-amber-700 text-sm font-semibold cursor-default"
                    >
                      Pagamento pendente
                    </button>
                  ) : upgrade ? (
                    <button
                      onClick={() => handleSelectPlan(plan.id)}
                      className={`w-full py-2.5 rounded-xl text-sm font-semibold transition ${
                        selected
                          ? 'bg-emerald-600 text-white'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      }`}
                    >
                      {selected ? 'Selecionado' : 'Fazer upgrade'}
                    </button>
                  ) : downgrade ? (
                    <button
                      onClick={() => handleSelectPlan(plan.id)}
                      className={`w-full py-2.5 rounded-xl text-sm font-semibold transition ${
                        selected
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {selected ? 'Selecionado' : 'Fazer downgrade'}
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-400 text-sm font-semibold cursor-default"
                    >
                      Indisponível
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>


      {/* Modal de Cancelamento */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Cancelar Assinatura</h3>
            <p className="text-slate-600 mb-4">
              Tem certeza que deseja cancelar? Você será movido para o plano Starter.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Motivo do cancelamento (opcional)
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full h-24 px-4 py-3 rounded-lg border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 focus:outline-none transition text-sm"
                placeholder="Nos ajude a melhorar..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                disabled={isCancellingSubscription}
                className="flex-1 h-11 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 transition disabled:opacity-50"
              >
                {isCancellingSubscription ? 'Cancelando...' : 'Confirmar Cancelamento'}
              </button>
              <button
                onClick={() => setShowCancelModal(false)}
                className="h-11 px-6 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
