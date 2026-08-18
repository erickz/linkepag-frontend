'use client';

import type { ReactNode } from 'react';
import { IconCheck, IconUser, IconCreditCard, IconLink, IconShare } from './icons';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
}

// ORDEM CORRETA: Profile -> Payment -> Links -> Share
// ATENÇÃO: o passo 'share' não tem painel no wizard — ele vive na rota
// /admin/onboarding/conclusao. No step nav do wizard, clicar nele finaliza
// o onboarding (ver page.tsx do onboarding).
export const onboardingSteps: OnboardingStep[] = [
  {
    id: 'profile',
    title: 'Personalize seu perfil',
    description: 'Adicione suas informações para sua página pública',
    icon: <IconUser className="w-6 h-6" />,
  },
  {
    id: 'payment',
    title: 'Configure recebimento',
    description: 'Escolha como quer receber seus pagamentos',
    icon: <IconCreditCard className="w-6 h-6" />,
  },
  {
    id: 'link',
    title: 'Cadastre um link',
    description: 'Seu link na bio esta quase pronto! Crie um link, leva menos de 30 segundos',
    icon: <IconLink className="w-6 h-6" />,
  },
  {
    id: 'share',
    title: 'Divulgue sua página',
    description: 'Copie o link da sua página e cole na bio do Instagram ou TikTok',
    icon: <IconShare className="w-6 h-6" />,
  },
];

interface OnboardingProgressProps {
  steps: OnboardingStep[];
  completedStepIds: string[];
  currentStepId: string;
  /** Clique num passo do nav. Omitido (ou readOnly) = nav somente-exibição */
  onStepClick?: (index: number) => void;
  /** Modo somente-exibição (página de conclusão): nenhum passo é clicável */
  readOnly?: boolean;
  /** Overrides de copy do header (padrão: contagem de passos restantes) */
  title?: string;
  subtitle?: string;
}

export function OnboardingProgress({
  steps,
  completedStepIds,
  currentStepId,
  onStepClick,
  readOnly = false,
  title,
  subtitle,
}: OnboardingProgressProps) {
  const progress = (completedStepIds.length / steps.length) * 100;
  const remaining = steps.length - completedStepIds.length;
  const clickable = !readOnly && !!onStepClick;

  return (
    <>
      {/* Progress Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          {title ?? (remaining === 0
            ? '🎉 Tudo pronto!'
            : `Você está a ${remaining} passo${remaining !== 1 ? 's' : ''} da primeira venda!`)}
        </h1>
        <p className="text-slate-500 mb-6">
          {subtitle ?? 'Complete essas etapas para começar a monetizar sua audiência'}
        </p>

        {/* Progress Bar */}
        <div className="max-w-md mx-auto">
          <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-sm text-slate-500">
            <span>{completedStepIds.length} de {steps.length} completos</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>
      </div>

      {/* Steps Navigation */}
      <div className="flex justify-center mb-8">
        <div className="flex items-center gap-1 sm:gap-4">
          {steps.map((step, index) => {
            const isCompleted = completedStepIds.includes(step.id);
            const isCurrent = currentStepId === step.id;

            const itemClasses = `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              isCurrent
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                : isCompleted
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'
            }`;

            const itemContent = (
              <>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isCurrent ? 'bg-white/20' : isCompleted ? 'bg-emerald-200' : 'bg-slate-100'
                }`}>
                  {isCompleted ? (
                    <IconCheck className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-bold">{index + 1}</span>
                  )}
                </div>
                <span className="font-medium hidden sm:block">{step.title}</span>
              </>
            );

            return (
              <div key={step.id} className="flex items-center">
                {clickable ? (
                  <button onClick={() => onStepClick(index)} className={itemClasses}>
                    {itemContent}
                  </button>
                ) : (
                  <div className={itemClasses}>{itemContent}</div>
                )}
                {index < steps.length - 1 && (
                  <div className={`w-4 sm:w-8 h-0.5 mx-1 sm:mx-2 ${
                    isCompleted ? 'bg-emerald-300' : 'bg-slate-200'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
