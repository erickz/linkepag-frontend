'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, useProtectedRoute } from '@/hooks/useAuth';

import { useSubscription } from '@/hooks/useSubscription';
import { CreditCardForm } from '@/components/CreditCardForm';
import { apiCache } from '@/lib/api';

const PLAN_COLORS: Record<number, string> = {
  1: 'from-slate-500 to-slate-600',
  2: 'from-indigo-500 to-indigo-600',
  3: 'from-purple-500 to-purple-600',
  4: 'from-amber-500 to-amber-600',
};

const PLAN_BG_COLORS: Record<number, string> = {
  1: 'bg-slate-50 border-slate-200',
  2: 'bg-indigo-50 border-indigo-200',
  3: 'bg-purple-50 border-purple-200',
  4: 'bg-amber-50 border-amber-200',
};

// Configuração hardcoded do PIX da LinkePag
// TODO: Configure a URL da imagem do QR Code quando disponível
const LINKEPAG_PIX_CONFIG = {
  key: 'pix@linkepag.com',
  keyType: 'EMAIL',
  beneficiary: 'LinkePag Tecnologia',
  city: 'Sao Paulo',
  // qrCodeImageUrl: '/images/qr-code-pix-linkepag.png', // Descomente e configure quando tiver a imagem
  qrCodeImageUrl: null as string | null, // null = usa o QR Code dinâmico do backend ou mostra mensagem
};

export default function PlansPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'pix'>('pix');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [monthlySales, setMonthlySales] = useState(100);
  const [cardToken, setCardToken] = useState<string | null>(null);
  const [isCardTokenized, setIsCardTokenized] = useState(false);
  
  // Estados para PIX
  const [pixData, setPixData] = useState<{
    pixCode: string;
    qrCodeUrl: string;
    expirationDate: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useProtectedRoute('/login');

  const {
    plans,
    subscription,
    currentPlan,
    isLoading: isLoadingSubscription,
    isSubscriptionActive,
    isExpiringSoon,
    calculateUpgradeSavings,
    createSubscription,
    isCreatingSubscription,
    cancelSubscription,
    isCancellingSubscription,
    refetchSubscription,
  } = useSubscription();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login?redirect=admin/plans');
    }
  }, [isLoading, isAuthenticated, router]);

  // Force refetch when component mounts to get fresh data
  useEffect(() => {
    if (isAuthenticated) {
      // Clear cache and refetch
      apiCache.invalidate('subscription');
      apiCache.invalidate('plans');
      refetchSubscription();
    }
  }, [isAuthenticated]);

  const handleSelectPlan = (planId: number) => {
    // Se clicou no mesmo plano já selecionado, desseleciona
    if (planId === selectedPlan) {
      setSelectedPlan(null);
      setPixData(null);
      return;
    }
    
    // Se tem upgrade pendente e selecionou outro plano, mostrar aviso
    if (hasPendingSubscription && planId !== pendingPlanId) {
      setMessage({
        type: 'info',
        text: `Você tem um upgrade pendente para o plano ${subscription?.planName}. Selecionar outro plano cancelará o upgrade atual.`,
      });
    }
    
    setSelectedPlan(planId);
    setCardToken(null);
    setIsCardTokenized(false);
    setPixData(null); // Limpa dados do PIX anterior
  };

  const handlePaymentMethodChange = (method: 'credit_card' | 'pix') => {
    setPaymentMethod(method);
    setCardToken(null);
    setIsCardTokenized(false);
  };

  const handleCardTokenGenerated = (token: string) => {
    setCardToken(token);
    setIsCardTokenized(true);
  };

  const handleCardValidationChange = (isValid: boolean) => {
    // Validation state is managed internally by the form
    // We just need to reset the tokenized state if it becomes invalid
    if (!isValid && isCardTokenized) {
      setIsCardTokenized(false);
      setCardToken(null);
    }
  };

  // Timer para expiração do PIX
  useEffect(() => {
    if (!pixData?.expirationDate) return;

    const updateTimer = () => {
      const now = new Date();
      const target = new Date(pixData.expirationDate);
      const diff = target.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('Expirado');
        return;
      }

      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      
      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes.toString().padStart(2, '0')}min`);
      } else {
        setTimeRemaining(`${minutes} min`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [pixData?.expirationDate]);

  // Carregar pixData da subscription pendente quando a página inicia
  useEffect(() => {
    if (subscription?.status === 'pending_payment' && subscription?.pixCode && subscription?.pixExpirationDate) {
      setPixData({
        pixCode: subscription.pixCode,
        qrCodeUrl: subscription.pixQrCodeUrl || '',
        expirationDate: subscription.pixExpirationDate,
      });
      // Seleciona o plano pendente automaticamente
      if (subscription.planId) {
        setSelectedPlan(Number(subscription.planId));
      }
    }
  }, [subscription]);

  // Limpar selectedPlan quando a assinatura ativa for para o mesmo plano selecionado
  // (caso o pagamento tenha sido confirmado em outra aba/janela)
  useEffect(() => {
    if (selectedPlan && subscription?.status === 'active' && Number(subscription.planId) === selectedPlan) {
      setSelectedPlan(null);
      setPixData(null);
    }
  }, [subscription, selectedPlan]);

  const handleCopyPixCode = async () => {
    if (!pixData?.pixCode) return;
    try {
      await navigator.clipboard.writeText(pixData.pixCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao copiar código' });
    }
  };

  const handleCardError = (error: string) => {
    setMessage({ type: 'error', text: error });
  };

  const handleSubscribe = async () => {
    if (!selectedPlan) return;

    // Se for cartão de crédito, verificar se temos o token
    if (paymentMethod === 'credit_card' && !cardToken) {
      setMessage({
        type: 'error',
        text: 'Por favor, preencha os dados do cartão primeiro.',
      });
      return;
    }

    // Se tem assinatura pendente e selecionou outro plano, cancelar primeiro
    if (hasPendingSubscription && selectedPlan !== pendingPlanId) {
      try {
        await cancelSubscription('cancelado_para_selecionar_outro_plano');
      } catch (err) {
        setMessage({
          type: 'error',
          text: 'Erro ao cancelar assinatura pendente. Tente novamente.',
        });
        return;
      }
    }

    // Se selecionou o plano Grátis, apenas cancela a assinatura atual
    if (selectedPlan === 1) {
      if (hasPendingSubscription) {
        setMessage({
          type: 'success',
          text: 'Upgrade cancelado. Você está no plano Grátis.',
        });
      } else {
        setMessage({
          type: 'info',
          text: 'Você já está no plano Grátis.',
        });
      }
      apiCache.invalidate('subscription');
      refetchSubscription();
      setSelectedPlan(null);
      return;
    }

    const result = await createSubscription(
      { planId: selectedPlan, paymentMethod, cardToken: cardToken || undefined },
      {
        onSuccess: (data) => {
          if (paymentMethod === 'pix' && data.pixData) {
            setPixData(data.pixData);
            setMessage({
              type: 'info',
              text: 'Pagamento PIX gerado! Escaneie o QR code ou copie o código para completar a assinatura.',
            });
          } else {
            setMessage({
              type: 'success',
              text: 'Assinatura criada com sucesso!',
            });
            // Limpa estados apenas se não for PIX
            setSelectedPlan(null);
            setCardToken(null);
            setIsCardTokenized(false);
          }
          // Invalida cache de subscription
          apiCache.invalidate('subscription');
          refetchSubscription();
        },
        onError: (err) => {
          setMessage({
            type: 'error',
            text: err.message || 'Erro ao criar assinatura. Tente novamente.',
          });
        },
      }
    );
  };

  const handleCancel = async () => {
    const result = await cancelSubscription(cancelReason || undefined, {
      onSuccess: () => {
        setMessage({
          type: 'success',
          text: 'Assinatura cancelada com sucesso. Você foi movido para o plano Grátis.',
        });
        setShowCancelModal(false);
        setCancelReason('');
        setSelectedPlan(null); // Limpa plano selecionado ao cancelar
        setPixData(null); // Limpa dados do PIX
        apiCache.invalidate('subscription');
        refetchSubscription();
      },
      onError: (err) => {
        setMessage({
          type: 'error',
          text: err.message || 'Erro ao cancelar assinatura.',
        });
      },
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(dateString));
  };

  const formatDateTime = (dateString: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  const getTimeRemaining = (dateString: string): string => {
    const now = new Date();
    const target = new Date(dateString);
    const diffMs = target.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Expirado';
    
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    // Menos de 1 minuto
    if (diffSecs < 60) {
      return 'menos de 1 minuto';
    }
    
    // Menos de 1 hora: mostra minutos
    if (diffMins < 60) {
      return `${diffMins} minuto${diffMins !== 1 ? 's' : ''}`;
    }
    
    // Menos de 24 horas: mostra horas e minutos
    if (diffHours < 24) {
      const mins = diffMins % 60;
      if (mins === 0) {
        return `${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
      }
      return `${diffHours}h ${mins}min`;
    }
    
    // 24 horas ou mais: mostra dias e horas
    const hours = diffHours % 24;
    if (hours === 0) {
      return `${diffDays} dia${diffDays !== 1 ? 's' : ''}`;
    }
    return `${diffDays} dia${diffDays !== 1 ? 's' : ''} e ${hours}h`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const isCurrentPlan = (planId: number) => currentPlan?.id === planId;
  
  // Verifica se existe uma assinatura pendente (upgrade em andamento)
  const hasPendingSubscription = subscription?.status === 'pending_payment';
  const pendingPlanId = hasPendingSubscription ? Number(subscription?.planId) : null;
  
  const canUpgrade = (planId: number) => {
    if (!currentPlan) return true;
    return planId > currentPlan.id;
  };
  
  const canDowngrade = (planId: number) => {
    if (!currentPlan) return false;
    return planId < currentPlan.id;
  };
  
  // Verifica se pode selecionar um plano (para cancelar upgrade pendente)
  const canSelectPlan = (planId: number) => {
    // Se tem upgrade pendente, pode selecionar qualquer plano diferente para cancelar
    if (hasPendingSubscription && planId !== pendingPlanId) {
      return true;
    }
    return false;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      

      <main className="py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link href="/admin/dashboard" className="hover:text-indigo-600 transition">Dashboard</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-slate-900 font-medium">Planos</span>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Planos e Assinatura</h1>
          <p className="text-slate-500">Gerencie seu plano e escolha o melhor para o seu negócio</p>
        </div>

        {/* Current Plan Status */}
        {subscription && (
          <div className={`mb-8 p-6 rounded-2xl border-2 ${
            subscription.status === 'pending_payment' 
              ? 'bg-amber-50 border-amber-200' 
              : PLAN_BG_COLORS[subscription.planId]
          } ${isExpiringSoon() ? 'ring-2 ring-amber-400' : ''}`}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-bold text-slate-900">
                    {subscription.status === 'pending_payment' 
                      ? `Upgrade para ${subscription.planName} - Pendente` 
                      : `Plano ${subscription.planName}`
                    }
                  </h2>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    subscription.status === 'active'
                      ? 'bg-emerald-100 text-emerald-700'
                      : subscription.status === 'pending_payment'
                      ? 'bg-amber-100 text-amber-700'
                      : subscription.status === 'expired'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {subscription.status === 'active' && 'Ativo'}
                    {subscription.status === 'pending_payment' && 'Aguardando Pagamento'}
                    {subscription.status === 'expired' && 'Expirado'}
                    {subscription.status === 'cancelled' && 'Cancelado'}
                    {subscription.status === 'payment_failed' && 'Pagamento Falhou'}
                  </span>
                </div>
                <p className="text-slate-600">
                  {subscription.status === 'active' ? (
                    <>
                      Válido até <strong>{formatDate(subscription.expiresAt)}</strong>
                      {isExpiringSoon() && (
                        <span className="ml-2 text-amber-600 font-medium">
                          (Expira em breve!)
                        </span>
                      )}
                    </>
                  ) : subscription.status === 'pending_payment' ? (
                    subscription.pixExpirationDate ? (
                      <>
                        PIX gerado. Expira em <strong>{getTimeRemaining(subscription.pixExpirationDate)}</strong>
                        <span className="ml-2 text-slate-500">({formatDateTime(subscription.pixExpirationDate)})</span>
                      </>
                    ) : (
                      'Complete o pagamento para ativar seu plano'
                    )
                  ) : subscription.status === 'expired' ? (
                    'Seu plano expirou. Renove para continuar vendendo.'
                  ) : (
                    'Assinatura cancelada'
                  )}
                </p>
              </div>
              
              {subscription.planId !== 1 && subscription.status === 'active' && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="text-sm text-slate-500 hover:text-rose-600 underline transition"
                >
                  Cancelar assinatura
                </button>
              )}
            </div>
            
            {/* PIX Payment Info - Minimalista */}
            {subscription.status === 'pending_payment' && subscription.pixCode && (
              <div className="mt-4 pt-4 border-t border-amber-200">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={subscription.pixCode}
                    readOnly
                    className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                  />
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(subscription.pixCode!);
                        setMessage({ type: 'success', text: 'Código PIX copiado!' });
                      } catch (err) {
                        setMessage({ type: 'error', text: 'Erro ao copiar código' });
                      }
                    }}
                    className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition whitespace-nowrap"
                  >
                    Copiar PIX
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl ${
            message.type === 'success' ? 'bg-emerald-50 border border-emerald-200' :
            message.type === 'error' ? 'bg-rose-50 border border-rose-200' :
            'bg-blue-50 border border-blue-200'
          }`}>
            <p className={`font-medium text-sm ${
              message.type === 'success' ? 'text-emerald-700' :
              message.type === 'error' ? 'text-rose-700' :
              'text-blue-700'
            }`}>
              {message.text}
            </p>
          </div>
        )}

        {/* Savings Calculator */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8">
          <h3 className="text-lg font-bold text-slate-900 mb-4">💰 Calculadora de Economia</h3>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
            <label className="text-sm text-slate-600">
              Quantas vendas você faz por mês?
            </label>
            <input
              type="range"
              min="10"
              max="1000"
              step="10"
              value={monthlySales}
              onChange={(e) => setMonthlySales(parseInt(e.target.value))}
              className="flex-1 max-w-xs"
            />
            <span className="font-semibold text-indigo-600">{monthlySales} vendas</span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {plans.map((plan) => {
              const totalCost = plan.monthlyPrice + (plan.feePerTransaction * monthlySales);
              const savings = currentPlan ? calculateUpgradeSavings(plan.id, monthlySales) : 0;
              return (
                <div
                  key={plan.id}
                  className={`p-4 rounded-xl border ${
                    isCurrentPlan(plan.id) ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'
                  }`}
                >
                  <p className="font-medium text-slate-900">{plan.name}</p>
                  <p className="text-lg font-bold text-slate-900">
                    {formatCurrency(totalCost)}
                    <span className="text-xs font-normal text-slate-500">/mês</span>
                  </p>
                  {savings > 0 && (
                    <p className="text-xs text-emerald-600 font-medium">
                      Economia: {formatCurrency(savings)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {plans.map((plan) => {
            const current = isCurrentPlan(plan.id);
            const upgrade = canUpgrade(plan.id);
            const downgrade = canDowngrade(plan.id);
            const selected = selectedPlan === plan.id;

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-2xl border-2 p-6 flex flex-col relative transition-all ${
                  current
                    ? 'border-indigo-500 shadow-lg shadow-indigo-100'
                    : selected
                    ? 'border-emerald-500 shadow-lg shadow-emerald-100'
                    : 'border-slate-200 hover:border-indigo-300'
                }`}
              >
                {/* Badges - Com prioridade estrita: Plano Atual > Aguardando Pagamento > Mais Popular */}
                <div className="flex flex-col items-center gap-1 mb-3">
                  {(() => {
                    // Prioridade 1: Plano Atual (se assinatura ativa)
                    if (current && subscription?.status === 'active') {
                      return (
                        <span className="bg-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
                          Plano Atual
                        </span>
                      );
                    }
                    
                    // Prioridade 2: Aguardando Pagamento (se tem subscription pendente para este plano)
                    if (hasPendingSubscription && Number(plan.id) === pendingPlanId) {
                      return (
                        <span className="bg-amber-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
                          Aguardando Pagamento
                        </span>
                      );
                    }
                    
                    // Prioridade 3: Mais Popular (se for popular e não for atual nem pendente)
                    if (plan.popular) {
                      return (
                        <span className="bg-emerald-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
                          Mais Popular
                        </span>
                      );
                    }
                    
                    return null;
                  })()}
                </div>

                <div className="text-center mb-6">
                  <div className={`w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br ${PLAN_COLORS[plan.id]} flex items-center justify-center`}>
                    <span className="text-white font-bold text-lg">{plan.name[0]}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-black text-slate-900">
                      {formatCurrency(plan.monthlyPrice)}
                    </span>
                    {plan.monthlyPrice > 0 && <span className="text-slate-500 text-sm">/mês</span>}
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 mb-4 text-center">
                  <p className="text-xs text-slate-500">Taxa por venda:</p>
                  <p className="text-lg font-bold text-indigo-600">
                    {formatCurrency(plan.feePerTransaction)}
                  </p>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-medium text-slate-900 text-center">
                    {plan.maxPaidLinks === null ? 'Links ilimitados' : `Até ${plan.maxPaidLinks} links`}
                  </p>
                </div>

                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.slice(0, 4).map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-slate-600">
                      <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-2.5 h-2.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      {feature}
                    </li>
                  ))}
                </ul>

                {current && !hasPendingSubscription ? (
                  <button
                    disabled
                    className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-500 font-semibold cursor-default"
                  >
                    Plano Atual
                  </button>
                ) : hasPendingSubscription && plan.id === pendingPlanId ? (
                  <button
                    disabled
                    className="w-full py-2.5 rounded-xl bg-amber-100 text-amber-700 font-semibold cursor-default"
                  >
                    Pagamento Pendente
                  </button>
                ) : canUpgrade(plan.id) || canSelectPlan(plan.id) ? (
                  <button
                    onClick={() => handleSelectPlan(plan.id)}
                    className={`w-full py-2.5 rounded-xl font-semibold transition ${
                      selected
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200'
                    }`}
                  >
                    {selected ? 'Selecionado' : hasPendingSubscription ? 'Alterar para este plano' : 'Fazer Upgrade'}
                  </button>
                ) : canDowngrade(plan.id) || canSelectPlan(plan.id) ? (
                  <button
                    onClick={() => handleSelectPlan(plan.id)}
                    className={`w-full py-2.5 rounded-xl font-semibold transition ${
                      selected
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {selected ? 'Selecionado' : hasPendingSubscription ? 'Alterar para este plano' : 'Fazer Downgrade'}
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-400 font-semibold cursor-default"
                  >
                    Indisponível
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Payment Section - Show when plan selected and different from current active plan */}
        {selectedPlan && (
          // Só mostra se:
          // 1. Tem assinatura pendente para este plano, OU
          // 2. Plano selecionado é diferente do plano atual ativo
          (hasPendingSubscription && pendingPlanId === selectedPlan) ||
          (!hasPendingSubscription && currentPlan?.id !== selectedPlan)
        ) && (
          <div className="bg-white rounded-2xl border-2 border-emerald-200 p-6 mb-8">
            {/* Plano Grátis - Não requer pagamento */}
            {selectedPlan === 1 ? (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Plano Grátis Selecionado</h3>
                  <p className="text-slate-600 max-w-md mx-auto">
                    O plano Grátis não requer pagamento. Você pode criar até 3 links monetizados e paga apenas R$ 0,70 por venda realizada.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleSubscribe}
                    disabled={isCreatingSubscription}
                    className="flex-1 h-12 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition shadow-lg shadow-emerald-200 disabled:opacity-50"
                  >
                    {isCreatingSubscription ? 'Processando...' : 'Confirmar Plano Grátis'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-bold text-slate-900 mb-4">💳 Finalizar Assinatura</h3>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    Forma de Pagamento
                  </label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => handlePaymentMethodChange('pix')}
                      className={`flex-1 p-4 rounded-xl border-2 text-left transition ${
                        paymentMethod === 'pix'
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          paymentMethod === 'pix' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">PIX</p>
                          <p className="text-xs text-slate-500">Pagamento instantâneo</p>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePaymentMethodChange('credit_card')}
                      className={`flex-1 p-4 rounded-xl border-2 text-left transition ${
                        paymentMethod === 'credit_card'
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          paymentMethod === 'credit_card' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">Cartão de Crédito</p>
                          <p className="text-xs text-slate-500">Recorrência mensal</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Credit Card Form */}
                {paymentMethod === 'credit_card' && (
                  <div className="mb-6">
                    <CreditCardForm
                      onCardTokenGenerated={handleCardTokenGenerated}
                      onError={handleCardError}
                      onValidationChange={handleCardValidationChange}
                      isProcessing={isCreatingSubscription}
                    />
                  </div>
                )}

                {/* PIX Info / QR Code */}
                {paymentMethod === 'pix' && (
                  <>
                    {pixData ? (
                      /* PIX Gerado - Mostra QR Code, código e chave PIX */
                      <div className="mb-6 bg-slate-50 rounded-xl p-6">
                        {/* Header simples */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2 text-emerald-700">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                            <span className="text-sm font-medium">Aguardando pagamento</span>
                          </div>
                          {timeRemaining && timeRemaining !== 'Expirado' && (
                            <span className="text-sm text-slate-500">Expira em: <strong>{timeRemaining}</strong></span>
                          )}
                          {timeRemaining === 'Expirado' && (
                            <span className="text-sm text-rose-600 font-medium">PIX expirado</span>
                          )}
                        </div>

                        {/* QR Code */}
                        <div className="flex justify-center mb-4">
                          <div className="bg-white p-4 rounded-lg shadow-sm">
                            {LINKEPAG_PIX_CONFIG.qrCodeImageUrl ? (
                              <img 
                                src={LINKEPAG_PIX_CONFIG.qrCodeImageUrl} 
                                alt="QR Code PIX" 
                                className="w-44 h-44 object-contain"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : pixData.qrCodeUrl ? (
                              <img 
                                src={pixData.qrCodeUrl} 
                                alt="QR Code PIX" 
                                className="w-44 h-44 object-contain"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-44 h-44 flex items-center justify-center text-slate-400">
                                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Código Copia e Cola */}
                        <div className="flex gap-2">
                          <textarea
                            value={pixData.pixCode}
                            readOnly
                            rows={2}
                            className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg resize-none"
                          />
                          <button
                            onClick={handleCopyPixCode}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                              copied
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-800 text-white hover:bg-slate-700'
                            }`}
                          >
                            {copied ? 'Copiado' : 'Copiar'}
                          </button>
                        </div>

                        <p className="text-xs text-slate-500 text-center mt-4">
                          Após o pagamento, sua assinatura será ativada em alguns minutos.
                        </p>
                      </div>
                    ) : (
                      /* PIX ainda não gerado */
                      <div className="mb-6 p-4 bg-slate-50 rounded-xl">
                        <p className="text-sm text-slate-600">
                          Ao confirmar, você receberá as informações para pagamento via PIX. Use a chave <strong>{LINKEPAG_PIX_CONFIG.key}</strong> ou o código copia e cola.
                        </p>
                      </div>
                    )}
                  </>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleSubscribe}
                    disabled={isCreatingSubscription || (paymentMethod === 'credit_card' && !isCardTokenized) || (paymentMethod === 'pix' && !!pixData)}
                    className="flex-1 h-12 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreatingSubscription ? 'Processando...' : 
                     paymentMethod === 'pix' && pixData ? 'PIX Gerado' : 
                     paymentMethod === 'credit_card' && !isCardTokenized ? 'Preencha os dados do cartão' :
                     'Confirmar Assinatura'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* FAQ */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">❓ Dúvidas Frequentes</h3>
          <div className="space-y-4">
            {[
              {
                q: 'Posso trocar de plano quando quiser?',
                a: 'Sim! Você pode fazer upgrade ou downgrade a qualquer momento. O valor é proporcional aos dias restantes.',
              },
              {
                q: 'Como funciona o plano Grátis?',
                a: 'O plano Grátis é 100% gratuito. Você pode criar até 3 links monetizados e paga apenas R$ 0,70 por venda realizada.',
              },
              {
                q: 'O que acontece se meu plano expirar?',
                a: 'Seu plano será automaticamente movido para o Grátis. Seus links monetizados existentes continuarão funcionando, mas você não poderá criar novos links pagos até renovar.',
              },
              {
                q: 'Posso cancelar a qualquer momento?',
                a: 'Sim, você pode cancelar sua assinatura quando quiser. O plano continuará ativo até o final do período pago.',
              },
            ].map((faq, idx) => (
              <div key={idx} className="border-b border-slate-100 last:border-0 pb-4 last:pb-0">
                <p className="font-medium text-slate-900 mb-1">{faq.q}</p>
                <p className="text-sm text-slate-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Cancelar Assinatura</h3>
            <p className="text-slate-600 mb-4">
              Tem certeza que deseja cancelar? Você será movido para o plano Grátis.
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
