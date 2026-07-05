'use client';

import { useBilling } from '@/hooks/useBilling';
import Link from 'next/link';

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function BillingAlert() {
  const { alerts, isLoading } = useBilling();

  if (isLoading || alerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert, index) => {
        const isDanger = alert.type === 'danger';
        const isWarning = alert.type === 'warning';

        return (
          <div
            key={index}
            className={cn(
              'rounded-lg border p-4',
              isDanger && 'border-red-200 bg-red-50 text-red-800',
              isWarning && 'border-amber-200 bg-amber-50 text-amber-800',
              !isDanger && !isWarning && 'border-blue-200 bg-blue-50 text-blue-800',
            )}
            role="alert"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium">{alert.message}</p>
              </div>
              {alert.action && (
                <Link
                  href={alert.action.href}
                  className={cn(
                    'shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                    isDanger && 'bg-red-600 text-white hover:bg-red-700',
                    isWarning && 'bg-amber-600 text-white hover:bg-amber-700',
                    !isDanger && !isWarning && 'bg-blue-600 text-white hover:bg-blue-700',
                  )}
                >
                  {alert.action.label}
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function BillingAlertCompact() {
  const { hasAlerts, isLocked, isGracePeriod } = useBilling();

  if (!hasAlerts) {
    return null;
  }

  return (
    <Link
      href="/admin/plans"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        isLocked && 'bg-red-100 text-red-700',
        !isLocked && isGracePeriod && 'bg-amber-100 text-amber-700',
        !isLocked && !isGracePeriod && 'bg-blue-100 text-blue-700',
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          isLocked && 'bg-red-500',
          !isLocked && isGracePeriod && 'bg-amber-500',
          !isLocked && !isGracePeriod && 'bg-blue-500',
        )}
      />
      {isLocked ? 'Bloqueado' : isGracePeriod ? 'Vencendo' : 'Atenção'}
    </Link>
  );
}

export function BillingStatusBadge({ status }: { status?: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    grace_period: 'bg-amber-100 text-amber-700',
    expired: 'bg-red-100 text-red-700',
    suspended: 'bg-red-100 text-red-700',
    none: 'bg-gray-100 text-gray-700',
  };

  const labels: Record<string, string> = {
    active: 'Ativo',
    grace_period: 'Carência',
    expired: 'Expirado',
    suspended: 'Suspenso',
    none: '—',
  };

  const normalized = status || 'none';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        styles[normalized] || styles.none,
      )}
    >
      {labels[normalized] || labels.none}
    </span>
  );
}
