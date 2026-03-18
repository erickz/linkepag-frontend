'use client';

import { useState, useEffect } from 'react';
import { IconCheck } from './FeatureIcons';
import { AuthNavButton } from '@/components/AuthNavButton';
import { getPlans } from '@/lib/api';

interface Plan {
  id: number;
  name: string;
  monthlyPrice: number;
  monthlyPriceFormatted: string;
  feePerTransaction: number;
  feePerTransactionFormatted: string;
  maxPaidLinks: number | null;
  links: string;
  features: string[];
  popular: boolean;
}

export function PricingSection() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPlans() {
      try {
        setIsLoading(true);
        const response = await getPlans();
        if (response.success && response.plans) {
          setPlans(response.plans);
        } else {
          setError('Erro ao carregar planos');
        }
      } catch (err) {
        setError('Erro ao carregar planos');
        console.error('Erro ao buscar planos:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPlans();
  }, []);

  if (isLoading) {
    return (
      <section id="pricing" className="py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="h-8 bg-slate-200 rounded w-1/3 mx-auto mb-4 animate-pulse" />
            <div className="h-6 bg-slate-200 rounded w-1/2 mx-auto animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-3xl border-2 border-slate-200 p-6 h-96 animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-1/2 mx-auto mb-4" />
                <div className="h-10 bg-slate-200 rounded w-2/3 mx-auto mb-6" />
                <div className="space-y-3">
                  {[...Array(5)].map((_, j) => (
                    <div key={j} className="h-4 bg-slate-200 rounded w-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error || plans.length === 0) {
    // Fallback silencioso - não mostra erro, apenas não renderiza a seção
    // ou poderia mostrar um estado de erro amigável
    return null;
  }

  return (
    <section id="pricing" className="py-24 bg-slate-50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 5a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1V8a1 1 0 011-1zm5-5a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0V6h-1a1 1 0 110-2h1V3a1 1 0 011-1zm0 5a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1V8a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Preço justo
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            Escolha seu plano
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Comece grátis e faça upgrade quando quiser. Quanto maior o plano, menor a taxa por venda.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-3xl border-2 p-6 flex flex-col relative ${
                plan.popular
                  ? 'border-indigo-500 shadow-xl shadow-indigo-100'
                  : 'border-slate-200'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-indigo-600 text-white text-xs font-semibold px-4 py-1 rounded-full">
                    Mais popular
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-lg font-bold text-slate-900 mb-2">{plan.name}</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-3xl font-black text-slate-900">
                    R$ {plan.monthlyPriceFormatted}
                  </span>
                  {plan.monthlyPrice > 0 && <span className="text-slate-500 text-sm">/mês</span>}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-slate-900 text-center">{plan.links}</p>
              </div>

              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-slate-600">
                    <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <IconCheck className="w-2.5 h-2.5 text-emerald-600" />
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>

              <AuthNavButton
                className={`block w-full py-2.5 rounded-xl text-center font-semibold text-sm transition ${
                  plan.popular
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {plan.monthlyPrice === 0 ? 'Começar grátis' : 'Assinar'}
              </AuthNavButton>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
