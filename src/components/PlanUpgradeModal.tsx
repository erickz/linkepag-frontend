'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSubscription } from '@/hooks/useSubscription';

interface PlanUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPaidLinksCount: number;
}

export function PlanUpgradeModal({ isOpen, onClose, currentPaidLinksCount }: PlanUpgradeModalProps) {
  const { plans, currentPlan, calculateUpgradeSavings } = useSubscription();
  const [monthlySales, setMonthlySales] = useState(100);

  if (!isOpen) return null;

  const nextPlan = plans.find(p => p.id === (currentPlan?.id || 0) + 1);
  const savings = nextPlan ? calculateUpgradeSavings(nextPlan.id, monthlySales) : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">
            Faça Upgrade e Venda Mais!
          </h3>
          <p className="text-slate-600">
            Você atingiu o limite de <strong>{currentPlan?.maxPaidLinks} links monetizados</strong> do plano {currentPlan?.name}.
          </p>
        </div>

        {/* Current Usage */}
        <div className="bg-slate-50 rounded-xl p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-slate-600">Uso atual</span>
            <span className="text-sm font-semibold text-slate-900">
              {currentPaidLinksCount} / {currentPlan?.maxPaidLinks} links
            </span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-amber-500 rounded-full"
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {/* Next Plan */}
        {nextPlan && (
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-5 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-indigo-600 font-medium mb-1">Próximo nível</p>
                <h4 className="text-xl font-bold text-slate-900">Plano {nextPlan.name}</h4>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-slate-900">
                  {formatCurrency(nextPlan.monthlyPrice)}
                </p>
                <p className="text-xs text-slate-500">/mês</p>
              </div>
            </div>

            <ul className="space-y-2 mb-4">
              <li className="flex items-center gap-2 text-sm text-slate-700">
                <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {nextPlan.maxPaidLinks === null ? 'Links monetizados ilimitados' : `Até ${nextPlan.maxPaidLinks} links monetizados`}
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-700">
                <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Taxa por venda realizada: {formatCurrency(nextPlan.feePerTransaction)}
              </li>
              {nextPlan.features.slice(0, 2).map((feature, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm text-slate-700">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Savings Calculator */}
        <div className="bg-slate-50 rounded-xl p-4 mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-3">
            Você economizaria com {monthlySales} vendas/mês:
          </label>
          <input
            type="range"
            min="10"
            max="500"
            step="10"
            value={monthlySales}
            onChange={(e) => setMonthlySales(parseInt(e.target.value))}
            className="w-full mb-3"
          />
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">{monthlySales} vendas</span>
            <span className="text-lg font-bold text-emerald-600">
              Economia: {formatCurrency(savings)}/mês
            </span>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-3">
          <Link
            href="/admin/plans"
            onClick={onClose}
            className="block w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold text-center hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
          >
            Ver Todos os Planos
          </Link>
          <button
            onClick={onClose}
            className="block w-full py-3 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition"
          >
            Continuar no Plano Atual
          </button>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

interface PlanLimitWarningProps {
  currentCount: number;
  maxCount: number | null;
}

export function PlanLimitWarning({ currentCount, maxCount }: PlanLimitWarningProps) {
  if (maxCount === null) return null;
  
  const percentage = Math.round((currentCount / maxCount) * 100);
  const isNearLimit = percentage >= 80;

  if (!isNearLimit) return null;

  return (
    <div className="rounded-xl p-4 mb-6 bg-amber-50 border border-amber-200">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-amber-100 text-amber-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-amber-900">
            Limite de links atingido
          </h4>
          <p className="text-sm mt-1 text-amber-700">
            Você está usando {currentCount} de {maxCount} links monetizados disponíveis no seu plano.
          </p>
          <div className="mt-3">
            <div className="h-2 rounded-full bg-amber-200">
              <div 
                className="h-full rounded-full transition-all bg-amber-500"
                style={{ width: `${Math.min(100, percentage)}%` }}
              />
            </div>
          </div>
          <Link
            href="/admin/plans"
            className="inline-flex items-center gap-1 text-sm font-medium mt-3 text-amber-700 hover:text-amber-800"
          >
            Fazer upgrade do plano
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
