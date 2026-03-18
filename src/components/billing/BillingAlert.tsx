'use client';

import Link from 'next/link';
import { useBilling } from '@/hooks/useBilling';

/**
 * Componente de alerta de billing para o dashboard
 * 
 * Mostra alertas quando:
 * - Usuário está em grace period
 * - Links estão bloqueados por não pagamento
 * - Existem taxas pendentes
 * 
 * @example
 * ```tsx
 * <BillingAlert />
 * ```
 */
export function BillingAlert() {
  const { 
    hasAlerts, 
    criticalAlerts, 
    warningAlerts, 
    infoAlerts,
    isGracePeriod, 
    isLocked, 
    daysUntilLock,
    currentBalanceFormatted,
    isLoading,
  } = useBilling();

  if (isLoading) {
    return (
      <div className="animate-pulse bg-slate-100 rounded-xl h-20 mb-6" />
    );
  }

  // Se não há alertas, não renderiza nada
  if (!hasAlerts && !isGracePeriod && !isLocked) {
    return null;
  }

  // Prioridade 1: Links bloqueados (locked)
  if (isLocked) {
    return (
      <div className="mb-6 bg-rose-50 border-2 border-rose-200 rounded-2xl p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-rose-900 text-lg">
              Links bloqueados
            </h3>
            <p className="text-rose-700 mt-1">
              Seus links monetizados estão bloqueados porque você tem{' '}
              <strong>{currentBalanceFormatted}</strong> em taxas pendentes.
              Regularize seu pagamento para desbloquear.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <Link
                href="/admin/plans"
                className="inline-flex items-center px-4 py-2 bg-rose-600 text-white text-sm font-medium rounded-lg hover:bg-rose-700 transition"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Pagar agora
              </Link>
              <Link
                href="/admin/plans"
                className="text-rose-700 text-sm font-medium hover:text-rose-800 transition"
              >
                Ver detalhes →
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Prioridade 2: Grace period (urgente)
  if (isGracePeriod && daysUntilLock !== null) {
    const isUrgent = daysUntilLock <= 1;
    
    return (
      <div className={`mb-6 border-2 rounded-2xl p-5 ${
        isUrgent 
          ? 'bg-rose-50 border-rose-200' 
          : 'bg-amber-50 border-amber-200'
      }`}>
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isUrgent ? 'bg-rose-100' : 'bg-amber-100'
          }`}>
            <svg className={`w-6 h-6 ${isUrgent ? 'text-rose-600' : 'text-amber-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={`font-semibold text-lg ${
                isUrgent ? 'text-rose-900' : 'text-amber-900'
              }`}>
                {isUrgent ? 'Atenção! Seus links serão bloqueados em breve' : 'Período de carência ativo'}
              </h3>
              {isUrgent && (
                <span className="px-2 py-0.5 bg-rose-200 text-rose-800 text-xs font-semibold rounded-full">
                  Urgente
                </span>
              )}
            </div>
            <p className={`mt-1 ${isUrgent ? 'text-rose-700' : 'text-amber-700'}`}>
              Você tem{' '}
              <strong>{currentBalanceFormatted}</strong> em taxas pendentes. 
              Seus links monetizados serão bloqueados em{' '}
              <strong>{daysUntilLock} {daysUntilLock === 1 ? 'dia' : 'dias'}</strong>.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <Link
                href="/admin/plans"
                className={`inline-flex items-center px-4 py-2 text-white text-sm font-medium rounded-lg transition ${
                  isUrgent 
                    ? 'bg-rose-600 hover:bg-rose-700' 
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Pagar taxas
              </Link>
              <Link
                href="/admin/plans"
                className={`text-sm font-medium transition ${
                  isUrgent 
                    ? 'text-rose-700 hover:text-rose-800' 
                    : 'text-amber-700 hover:text-amber-800'
                }`}
              >
                Ver detalhes →
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Prioridade 3: Alertas críticos genéricos
  if (criticalAlerts.length > 0) {
    const alert = criticalAlerts[0];
    return (
      <div className="mb-6 bg-rose-50 border-2 border-rose-200 rounded-2xl p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-rose-900 text-lg">
              Ação necessária
            </h3>
            <p className="text-rose-700 mt-1">{alert.message}</p>
            {alert.action && (
              <div className="mt-4">
                <Link
                  href={alert.action.href}
                  className="inline-flex items-center px-4 py-2 bg-rose-600 text-white text-sm font-medium rounded-lg hover:bg-rose-700 transition"
                >
                  {alert.action.label}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Prioridade 4: Alertas de warning
  if (warningAlerts.length > 0) {
    const alert = warningAlerts[0];
    return (
      <div className="mb-6 bg-amber-50 border-2 border-amber-200 rounded-2xl p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-amber-900 text-lg">
              Atenção
            </h3>
            <p className="text-amber-700 mt-1">{alert.message}</p>
            {alert.action && (
              <div className="mt-4">
                <Link
                  href={alert.action.href}
                  className="inline-flex items-center px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition"
                >
                  {alert.action.label}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Prioridade 5: Alertas informativos
  if (infoAlerts.length > 0) {
    const alert = infoAlerts[0];
    return (
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-2xl p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-blue-900 text-lg">
              Informação
            </h3>
            <p className="text-blue-700 mt-1">{alert.message}</p>
            {alert.action && (
              <div className="mt-4">
                <Link
                  href={alert.action.href}
                  className="text-blue-700 text-sm font-medium hover:text-blue-800 transition"
                >
                  {alert.action.label} →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

/**
 * Versão compacta do alerta para usar em sidebars ou headers
 */
export function BillingAlertCompact() {
  const { 
    hasAlerts, 
    isGracePeriod, 
    isLocked, 
    daysUntilLock,
    currentBalanceFormatted,
    isLoading 
  } = useBilling();

  if (isLoading) {
    return (
      <div className="animate-pulse w-8 h-8 bg-slate-100 rounded-lg" />
    );
  }

  if (!hasAlerts && !isGracePeriod && !isLocked) {
    return null;
  }

  if (isLocked) {
    return (
      <Link
        href="/admin/plans"
        className="flex items-center gap-2 px-3 py-2 bg-rose-100 text-rose-700 rounded-lg text-sm font-medium hover:bg-rose-200 transition"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span className="hidden sm:inline">Bloqueado: {currentBalanceFormatted}</span>
        <span className="sm:hidden">Bloqueado</span>
      </Link>
    );
  }

  if (isGracePeriod && daysUntilLock !== null) {
    const isUrgent = daysUntilLock <= 1;
    return (
      <Link
        href="/admin/plans"
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
          isUrgent 
            ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' 
            : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="hidden sm:inline">
          {daysUntilLock} {daysUntilLock === 1 ? 'dia' : 'dias'} para bloqueio
        </span>
        <span className="sm:hidden">{daysUntilLock}d</span>
      </Link>
    );
  }

  return null;
}

/**
 * Badge para mostrar status de billing em cards
 */
export function BillingStatusBadge() {
  const { isGracePeriod, isLocked, currentBalanceFormatted, isLoading } = useBilling();

  if (isLoading) {
    return (
      <span className="inline-flex items-center px-2 py-1 bg-slate-100 text-slate-500 text-xs rounded-full">
        Carregando...
      </span>
    );
  }

  if (isLocked) {
    return (
      <span className="inline-flex items-center px-2 py-1 bg-rose-100 text-rose-700 text-xs font-medium rounded-full">
        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Bloqueado
      </span>
    );
  }

  if (isGracePeriod) {
    return (
      <span className="inline-flex items-center px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {currentBalanceFormatted} pendentes
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      Regular
    </span>
  );
}
