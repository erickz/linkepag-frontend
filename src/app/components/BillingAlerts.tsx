'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface BillingAlert {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  dismissible?: boolean;
}

interface BillingAlertsProps {
  user?: {
    billingStatus?: 'active' | 'grace_period' | 'suspended' | 'blocked';
    planStatus?: 'active' | 'expired' | 'cancelled' | 'pending_payment';
  };
  invoice?: {
    status?: 'draft' | 'pending' | 'processing' | 'paid' | 'overdue' | 'failed' | 'cancelled';
    dueDate?: string;
    gracePeriodEnd?: string;
    autoChargeAttempts?: number;
    totalAmount?: number;
  } | null;
}

export function BillingAlerts({ user, invoice }: BillingAlertsProps) {
  const router = useRouter();
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Carrega alertas dispensados do localStorage
    const stored = localStorage.getItem('dismissedBillingAlerts');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Limpa alertas dispensados com mais de 24 horas
        const validDismissed = parsed.filter((item: { id: string; timestamp: number }) => {
          return Date.now() - item.timestamp < 24 * 60 * 60 * 1000;
        });
        setDismissedAlerts(validDismissed.map((item: { id: string }) => item.id));
      } catch {
        // Ignora erros de parsing
      }
    }
  }, []);

  const handleDismiss = (alertId: string) => {
    const newDismissed = [...dismissedAlerts, alertId];
    setDismissedAlerts(newDismissed);
    
    // Salva no localStorage com timestamp
    const stored = localStorage.getItem('dismissedBillingAlerts');
    let dismissedWithTimestamp: Array<{ id: string; timestamp: number }> = [];
    if (stored) {
      try {
        dismissedWithTimestamp = JSON.parse(stored);
      } catch {
        // Ignora erros
      }
    }
    dismissedWithTimestamp.push({ id: alertId, timestamp: Date.now() });
    localStorage.setItem('dismissedBillingAlerts', JSON.stringify(dismissedWithTimestamp));
  };

  // Lógica para determinar quais alertas mostrar
  const alerts: BillingAlert[] = [];

  // 0. Conta suspensa (mais grave - prioridade máxima)
  if (user?.billingStatus === 'suspended' || user?.billingStatus === 'blocked') {
    alerts.push({
      id: 'account-suspended',
      type: 'error',
      title: '⚠️ Pagamento Pendente - Links Monetizados Desativados',
      message: 'Sua conta está com pagamento pendente. Seus links monetizados estão temporariamente desativados. Finalize o pagamento abaixo para reativar suas vendas imediatamente.',
      action: {
        label: 'Reativar Agora',
        onClick: () => router.push('/admin/plans'),
      },
      dismissible: false,
    });
  }

  // 1. Pagamento falhou
  else if (invoice?.status === 'failed') {
    alerts.push({
      id: 'payment-failed',
      type: 'error',
      title: 'Pagamento Não Confirmado',
      message: 'Não conseguimos confirmar seu pagamento. Tente novamente ou use outro método de pagamento para manter seus links monetizados ativos.',
      action: {
        label: 'Tentar Novamente',
        onClick: () => router.push('/admin/plans'),
      },
      dismissible: false,
    });
  }

  // 2. Pagamento atrasado (overdue)
  if (invoice?.status === 'overdue') {
    const dueDate = invoice.dueDate ? formatDate(invoice.dueDate) : 'data anterior';
    const graceEnd = invoice.gracePeriodEnd ? formatDate(invoice.gracePeriodEnd) : 'breve';
    
    alerts.push({
      id: 'payment-overdue',
      type: 'error',
      title: 'Fatura Atrasada',
      message: `Sua fatura venceu em ${dueDate}. Pague até ${graceEnd} para manter seus links monetizados ativos e evitar a desativação temporária.`,
      action: {
        label: 'Regularizar Agora',
        onClick: () => router.push('/admin/plans'),
      },
      dismissible: false,
    });
  }

  // 3. Grace period - período de carência
  if (invoice?.status === 'pending' && isInGracePeriod(invoice) && user?.billingStatus === 'grace_period') {
    const graceEnd = invoice.gracePeriodEnd ? formatDate(invoice.gracePeriodEnd) : 'em breve';
    const daysRemaining = invoice.gracePeriodEnd ? daysUntil(invoice.gracePeriodEnd) : 0;
    
    alerts.push({
      id: 'grace-period',
      type: 'warning',
      title: 'Últimos Dias para Pagamento',
      message: `Você tem ${daysRemaining} dia${daysRemaining !== 1 ? 's' : ''} até ${graceEnd} para pagar sua fatura. Após isso, seus links monetizados serão temporariamente desativados até a regularização.`,
      action: {
        label: 'Pagar Agora',
        onClick: () => router.push('/admin/plans'),
      },
      dismissible: true,
    });
  }

  // 4. Próximo vencimento (vence em <= 3 dias)
  if (invoice?.status === 'pending' && invoice.dueDate && daysUntilDue(invoice.dueDate) <= 3 && daysUntilDue(invoice.dueDate) > 0) {
    const daysLeft = daysUntilDue(invoice.dueDate);
    const amount = invoice.totalAmount ? formatCurrency(invoice.totalAmount) : '';
    
    alerts.push({
      id: 'upcoming-due',
      type: 'info',
      title: 'Fatura Próxima do Vencimento',
      message: `Sua fatura ${amount ? `de ${amount} ` : ''}vence em ${daysLeft} dia${daysLeft !== 1 ? 's' : ''}.`,
      action: {
        label: 'Ver Fatura',
        onClick: () => router.push('/admin/plans'),
      },
      dismissible: true,
    });
  }

  // 5. Cobrança automática falhou
  if (invoice?.status === 'pending' && (invoice.autoChargeAttempts || 0) > 0) {
    alerts.push({
      id: 'auto-charge-failed',
      type: 'warning',
      title: 'Cobrança Automática Falhou',
      message: `Não foi possível cobrar no seu cartão (${invoice.autoChargeAttempts}x). Verifique os dados do cartão ou pague via PIX.`,
      action: {
        label: 'Atualizar Pagamento',
        onClick: () => router.push('/admin/plans'),
      },
      dismissible: true,
    });
  }

  // 6. Plano expirado
  if (user?.planStatus === 'expired' && user?.billingStatus !== 'suspended') {
    alerts.push({
      id: 'plan-expired',
      type: 'warning',
      title: 'Plano Expirado',
      message: 'Seu plano expirou. Renove agora para continuar com todos os benefícios.',
      action: {
        label: 'Renovar Plano',
        onClick: () => router.push('/admin/plans'),
      },
      dismissible: false,
    });
  }

  // Filtra alertas dispensados
  const visibleAlerts = alerts.filter(alert => !dismissedAlerts.includes(alert.id));

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="space-y-3 mb-6">
      {visibleAlerts.map((alert, index) => (
        <BillingAlertBanner
          key={alert.id}
          alert={alert}
          onDismiss={() => handleDismiss(alert.id)}
          mounted={mounted}
          index={index}
        />
      ))}
    </div>
  );
}

// Componente individual de alerta
function BillingAlertBanner({
  alert,
  onDismiss,
  mounted,
  index,
}: {
  alert: BillingAlert;
  onDismiss?: () => void;
  mounted: boolean;
  index: number;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (mounted) {
      // Delay para animação de entrada escalonada
      const timer = setTimeout(() => setIsVisible(true), index * 100);
      return () => clearTimeout(timer);
    }
  }, [mounted, index]);

  const handleDismiss = () => {
    setIsClosing(true);
    setTimeout(() => {
      onDismiss?.();
    }, 300);
  };

  const colors = {
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: 'text-red-500',
      button: 'text-red-700 hover:text-red-800 hover:bg-red-100',
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-800',
      icon: 'text-amber-500',
      button: 'text-amber-700 hover:text-amber-800 hover:bg-amber-100',
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: 'text-blue-500',
      button: 'text-blue-700 hover:text-blue-800 hover:bg-blue-100',
    },
  };

  const handleAction = () => {
    if (alert.action?.onClick) {
      alert.action.onClick();
    } else if (alert.action?.href) {
      window.location.href = alert.action.href;
    }
  };

  return (
    <div
      className={`
        rounded-xl border p-4 shadow-sm
        ${colors[alert.type].bg}
        ${colors[alert.type].border}
        ${colors[alert.type].text}
        transform transition-all duration-300 ease-out
        ${isVisible && !isClosing ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
      `}
      role="alert"
      aria-live={alert.type === 'error' ? 'assertive' : 'polite'}
    >
      <div className="flex items-start gap-3">
        {/* Ícone */}
        <div className={`mt-0.5 flex-shrink-0 ${colors[alert.type].icon}`}>
          <AlertIcon type={alert.type} />
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-base">{alert.title}</h4>
          <p className="text-sm mt-1 opacity-90 leading-relaxed">{alert.message}</p>

          {alert.action && (
            <button
              onClick={handleAction}
              className={`
                mt-3 text-sm font-medium px-3 py-1.5 rounded-lg
                transition-colors duration-200
                ${colors[alert.type].button}
              `}
            >
              {alert.action.label}
              <span className="ml-1">→</span>
            </button>
          )}
        </div>

        {/* Botão fechar */}
        {alert.dismissible && onDismiss && (
          <button
            onClick={handleDismiss}
            className={`
              flex-shrink-0 opacity-60 hover:opacity-100 
              transition-opacity duration-200 p-1 rounded-lg
              hover:bg-black/5
            `}
            aria-label="Fechar alerta"
            title="Fechar"
          >
            <XIcon />
          </button>
        )}
      </div>
    </div>
  );
}

// Ícones SVG inline
function AlertIcon({ type }: { type: 'error' | 'warning' | 'info' }) {
  const icons = {
    error: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  };

  return icons[type];
}

function XIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// Helpers
function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);
}

function isInGracePeriod(invoice: { gracePeriodEnd?: string }): boolean {
  if (!invoice.gracePeriodEnd) return false;
  return new Date(invoice.gracePeriodEnd) > new Date();
}

function daysUntilDue(dueDate: string): number {
  const diff = new Date(dueDate).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function daysUntil(date: string): number {
  const diff = new Date(date).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
