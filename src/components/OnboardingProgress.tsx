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
    <div className="max-w-3xl mx-auto">
      {/* Progress Header */}
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
          {title ?? (remaining === 0
            ? '🎉 Tudo pronto!'
            : `Você está a ${remaining} passo${remaining !== 1 ? 's' : ''} da primeira venda!`)}
        </h1>
        <p className="text-slate-500 text-sm sm:text-base mb-6">
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
      <div className="flex items-start justify-between gap-1 sm:gap-2 mb-6 sm:mb-8">
        {steps.map((step, index) => {
          const isCompleted = completedStepIds.includes(step.id);
          const isCurrent = currentStepId === step.id;

          const iconClasses = `w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold transition-all ${
            isCurrent
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
              : isCompleted
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-200 text-slate-500'
          }`;

          const titleClasses = `mt-2 text-center text-[10px] sm:text-xs font-medium leading-tight ${
            isCurrent ? 'text-indigo-700' : isCompleted ? 'text-emerald-700' : 'text-slate-500'
          }`;

          const stepContent = (
            <div className="flex flex-col items-center min-w-0 w-full">
              <div className={iconClasses}>
                {isCompleted ? (
                  <IconCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span className={titleClasses}>{step.title}</span>
            </div>
          );

          return (
            <div key={step.id} className="flex items-center flex-1 min-w-0">
              {clickable ? (
                <button
                  onClick={() => onStepClick(index)}
                  className="flex-1 min-w-0 px-1 py-1 rounded-xl hover:bg-slate-50 transition"
                >
                  {stepContent}
                </button>
              ) : (
                <div className="flex-1 min-w-0 px-1 py-1">{stepContent}</div>
              )}
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 self-start mt-[18px] sm:mt-5 ${
                    isCompleted ? 'bg-emerald-300' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
