'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from '@/components/Logo';
import { getCurrentSubscription, createSubscription, apiCache } from '@/lib/api';

interface Plan {
  id: number;
  name: string;
  monthlyPrice: number;
  feePerTransaction: number;
  maxPaidLinks: number | null;
  features: string[];
  popular?: boolean;
}

const PLANS: Plan[] = [
  {
    id: 1,
    name: 'Grátis',
    monthlyPrice: 0,
    feePerTransaction: 0.70,
    maxPaidLinks: 3,
    features: [
      'Até 3 links monetizados',
      'Links gratuitos ilimitados',
      'Checkout PIX integrado',
      'Relatório básico de vendas',
      'Suporte por email',
    ],
  },
  {
    id: 2,
    name: 'Creator',
    monthlyPrice: 19.90,
    feePerTransaction: 0.50,
    maxPaidLinks: 10,
    popular: true,
    features: [
      'Até 10 links monetizados',
      'Links gratuitos ilimitados',
      'Checkout PIX integrado',
      'Relatório completo de vendas',
      'Exportação de leads (CSV)',
      'Suporte por email (24h)',
    ],
  },
  {
    id: 3,
    name: 'Pro',
    monthlyPrice: 49.90,
    feePerTransaction: 0.35,
    maxPaidLinks: null,
    features: [
      'Links monetizados ilimitados',
      'Links gratuitos ilimitados',
      'Checkout PIX integrado',
      'Relatório avançado de vendas',
      'Exportação de leads (CSV + Excel)',
      'Personalização total do checkout',
      'Suporte por chat (12h)',
    ],
  },
  {
    id: 4,
    name: 'Ilimitado',
    monthlyPrice: 99.90,
    feePerTransaction: 0.20,
    maxPaidLinks: null,
    features: [
      'Links monetizados ilimitados',
      'Links gratuitos ilimitados',
      'Checkout PIX integrado',
      'Relatório avançado de vendas',
      'Exportação de leads (todos formatos)',
      'Personalização white-label',
      'Múltiplos usuários (até 5)',
      'Webhooks',
      'Suporte prioritário (4h)',
    ],
  },
];

function PlansContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentPlanId, setCurrentPlanId] = useState<number>(1);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);
  const [isProcessing, setIsProcessing] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upgradeSuccess = searchParams.get('success') === 'true';

  // Carrega o plano atual do usuário (apenas para mostrar qual é o plano dele)
  useEffect(() => {
    if (isAuthenticated) {
      loadCurrentPlan();
    } else {
      setIsLoadingSubscription(false);
    }
  }, [isAuthenticated]);

  const loadCurrentPlan = async () => {
    try {
      const data = await getCurrentSubscription();
      // Apenas mostra o plano atual se a assinatura estiver ativa
      if (data.subscription?.status === 'active') {
        setCurrentPlanId(data.subscription.planId);
      } else {
        setCurrentPlanId(1); // Grátis como padrão
      }
    } catch (err) {
      console.error('Erro ao carregar plano:', err);
    } finally {
      setIsLoadingSubscription(false);
    }
  };

  const handleSubscribe = async (planId: number) => {
    // Se não está logado, redireciona para registro
    if (!isAuthenticated) {
      router.push(`/register?redirect=/plans&selected=${planId}`);
      return;
    }

    // Se for o plano Grátis, apenas redireciona
    if (planId === 1) {
      router.push('/admin/dashboard');
      return;
    }

    // Se já está neste plano atual ativo, vai para dashboard
    if (planId === currentPlanId) {
      router.push('/admin/dashboard');
      return;
    }

    setIsProcessing(planId);
    setError(null);

    try {
      const result = await createSubscription(planId, 'pix');
      
      if (result.pixData) {
        // Redireciona para página de checkout com dados do PIX
        const params = new URLSearchParams({
          plan: planId.toString(),
          pixCode: result.pixData.pixCode,
          qrCode: result.pixData.qrCodeUrl,
          expires: result.pixData.expirationDate,
        });
        router.push(`/plans/checkout?${params.toString()}`);
      } else {
        router.push('/admin/plans');
      }
    } catch (err: any) {
      console.error('Erro ao criar assinatura:', err);
      setError(err.message || 'Erro ao processar. Tente novamente.');
    } finally {
      setIsProcessing(null);
    }
  };

  if (isLoading || isLoadingSubscription) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <Logo className="w-8 h-8" />
              <span className="text-xl font-bold text-slate-900">LinkePag</span>
            </Link>
            {isAuthenticated ? (
              <Link 
                href="/admin/dashboard" 
                className="text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                Voltar ao dashboard
              </Link>
            ) : (
              <Link 
                href="/login" 
                className="text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                Já tenho conta
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Success Message */}
      {upgradeSuccess && (
        <div className="bg-emerald-50 border-b border-emerald-200">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-emerald-800 font-medium">
                Pagamento confirmado! Seu plano foi atualizado.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black text-slate-900 mb-4">
            Escolha seu plano
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Comece grátis e upgrade quando quiser. Todas as taxas são por transação bem-sucedida.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="max-w-md mx-auto mb-8 p-4 bg-rose-50 border border-rose-200 rounded-xl">
            <p className="text-rose-700 text-sm text-center">{error}</p>
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {PLANS.map((plan) => {
            const isCurrentPlan = plan.id === currentPlanId && isAuthenticated;
            const isProcessingThis = isProcessing === plan.id;

            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl border-2 p-6 flex flex-col ${
                  plan.popular
                    ? 'border-indigo-500 shadow-xl shadow-indigo-100'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Badge: Mais popular ou Plano Atual */}
                <div className="flex flex-col items-center gap-1 mb-2">
                  {isCurrentPlan ? (
                    <span className="bg-emerald-500 text-white text-xs font-semibold px-4 py-1 rounded-full shadow-sm">
                      Plano atual
                    </span>
                  ) : plan.popular ? (
                    <span className="bg-indigo-600 text-white text-xs font-semibold px-4 py-1 rounded-full shadow-sm">
                      Mais popular
                    </span>
                  ) : null}
                </div>

                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-black text-slate-900">
                      R$ {plan.monthlyPrice.toFixed(2)}
                    </span>
                    {plan.monthlyPrice > 0 && (
                      <span className="text-slate-500">/mês</span>
                    )}
                  </div>
                </div>

                {/* Fee per transaction */}
                <div className="bg-slate-50 rounded-xl p-3 mb-6 text-center">
                  <p className="text-sm text-slate-500 mb-1">Taxa por venda realizada:</p>
                  <p className="text-xl font-bold text-indigo-600">
                    R$ {plan.feePerTransaction.toFixed(2)}
                  </p>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-sm text-slate-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={isProcessingThis || isCurrentPlan}
                  className={`w-full py-3 rounded-xl font-semibold transition ${
                    isCurrentPlan
                      ? 'bg-emerald-100 text-emerald-700 cursor-default'
                      : plan.popular
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isProcessingThis ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Processando...
                    </span>
                  ) : isCurrentPlan ? (
                    'Plano atual'
                  ) : plan.id === 1 ? (
                    'Gratuito'
                  ) : (
                    'Assinar'
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">
            Perguntas frequentes
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-2">
                Posso trocar de plano a qualquer momento?
              </h3>
              <p className="text-slate-600 text-sm">
                Sim! Você pode fazer upgrade ou downgrade quando quiser. O valor é proporcional aos dias restantes.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-2">
                O que acontece se eu cancelar?
              </h3>
              <p className="text-slate-600 text-sm">
                Você volta automaticamente para o plano Grátis e seus links continuam funcionando dentro do limite de 3 links monetizados.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-2">
                Como funciona a taxa por transação?
              </h3>
              <p className="text-slate-600 text-sm">
                A taxa é descontada automaticamente de cada venda. Quanto maior o plano, menor a taxa.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-2">
                Preciso de cartão de crédito?
              </h3>
              <p className="text-slate-600 text-sm">
                Não! Aceitamos PIX para pagamento dos planos pagos. É rápido e seguro.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function PlansPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    }>
      <PlansContent />
    </Suspense>
  );
}
