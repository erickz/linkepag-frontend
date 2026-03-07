/**
 * Exemplo de uso do componente BillingAlerts e hook useBillingAlerts
 * 
 * Este arquivo demonstra diferentes formas de integrar os alertas de billing
 * no dashboard e outras páginas.
 */

// ==========================================
// EXEMPLO 1: Uso Simples (dados estáticos/props)
// ==========================================

/*
import { BillingAlerts } from '@/app/components/BillingAlerts';

// No seu componente:
function MeuComponente() {
  const user = {
    billingStatus: 'grace_period' as const,
    planStatus: 'pending_payment' as const,
  };

  const invoice = {
    status: 'pending' as const,
    dueDate: '2026-03-10',
    gracePeriodEnd: '2026-03-15',
    autoChargeAttempts: 1,
    totalAmount: 49.90,
  };

  return (
    <div>
      <BillingAlerts user={user} invoice={invoice} />
      // ... resto do conteúdo
    </div>
  );
}
*/

// ==========================================
// EXEMPLO 2: Uso com Hook useBillingAlerts
// ==========================================

/*
import { BillingAlerts } from '@/app/components/BillingAlerts';
import { useBillingAlerts } from '@/hooks/useBillingAlerts';

function DashboardComHook() {
  const { alerts, hasAlerts, isLoading, error, userStatus, invoice, refetch } = useBillingAlerts();

  if (isLoading) {
    return <div>Carregando alertas...</div>;
  }

  return (
    <div>
      // Opção A: Usar o hook para pegar dados e passar para o componente
      <BillingAlerts user={userStatus} invoice={invoice} />
      
      // Opção B: Renderizar alertas manualmente (mais controle)
      {hasAlerts && (
        <div className="space-y-3 mb-6">
          {alerts.map((alert) => (
            <div key={alert.id} className={`alert alert-${alert.type}`}>
              <h4>{alert.title}</h4>
              <p>{alert.message}</p>
              {alert.action && (
                <a href={alert.action.href}>{alert.action.label}</a>
              )}
            </div>
          ))}
        </div>
      )}
      
      // Botão para recarregar alertas
      <button onClick={refetch}>Atualizar Alertas</button>
    </div>
  );
}
*/

// ==========================================
// EXEMPLO 3: Integração com Dashboard Existente
// ==========================================

/*
// Em /app/admin/dashboard/page.tsx

'use client';

import { BillingAlerts } from '@/app/components/BillingAlerts';
import { useBillingAlerts } from '@/hooks/useBillingAlerts';

export default function AdminDashboard() {
  // ... outras lógicas do dashboard ...
  
  // Usar hook para buscar dados de billing
  const { userStatus, invoice, hasAlerts } = useBillingAlerts();

  return (
    <div>
      // Alertas aparecem automaticamente quando necessário
      <BillingAlerts user={userStatus} invoice={invoice} />
      
      // Resto do dashboard...
    </div>
  );
}
*/

// ==========================================
// EXEMPLO 4: Customização de Estilos
// ==========================================

/*
// Você pode envolver o componente em um container customizado:

function CustomBillingAlerts() {
  const { userStatus, invoice } = useBillingAlerts();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="sticky top-4 z-50">
        <BillingAlerts user={userStatus} invoice={invoice} />
      </div>
    </div>
  );
}
*/

// ==========================================
// EXEMPLO 5: Alertas em Múltiplas Páginas
// ==========================================

/*
// Crie um wrapper para reutilizar em várias páginas:

// /app/components/BillingAlertWrapper.tsx
'use client';

import { BillingAlerts } from './BillingAlerts';
import { useBillingAlerts } from '@/hooks/useBillingAlerts';

export function BillingAlertWrapper() {
  const { userStatus, invoice } = useBillingAlerts();
  return <BillingAlerts user={userStatus} invoice={invoice} />;
}

// Use em qualquer página admin:
// /app/admin/links/page.tsx
// /app/admin/payments/page.tsx
// /app/admin/settings/page.tsx

import { BillingAlertWrapper } from '@/app/components/BillingAlertWrapper';

export default function AdminPage() {
  return (
    <div>
      <BillingAlertWrapper />
      // ... conteúdo da página
    </div>
  );
}
*/

// ==========================================
// TIPOS DE ALERTA SUPORTADOS
// ==========================================

/*
1. ERROR (Vermelho)
   - Pagamento falhou (status = 'failed')
   - Fatura atrasada (status = 'overdue')
   - Conta suspensa (billingStatus = 'suspended')

2. WARNING (Amarelo/Laranja)
   - Período de carência (grace_period)
   - Cobrança automática falhou (autoChargeAttempts > 0)
   - Plano expirado (planStatus = 'expired')

3. INFO (Azul)
   - Fatura próxima do vencimento (<= 3 dias)
   - Lembrete de pagamento
*/

// ==========================================
// PROPRIEDADES DO COMPONENTE
// ==========================================

/*
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
*/

// ==========================================
// RETORNO DO HOOK useBillingAlerts
// ==========================================

/*
interface UseBillingAlertsResult {
  alerts: BillingAlert[];        // Lista de alertas gerados
  hasAlerts: boolean;            // Se há alertas para exibir
  isLoading: boolean;            // Estado de carregamento
  error: Error | null;           // Erro, se houver
  userStatus: {                  // Status processado do usuário
    billingStatus?: 'active' | 'grace_period' | 'suspended' | 'blocked';
    planStatus?: 'active' | 'expired' | 'cancelled' | 'pending_payment';
  };
  invoice: {                     // Dados da fatura processados
    status?: string;
    dueDate?: string;
    gracePeriodEnd?: string;
    autoChargeAttempts?: number;
    totalAmount?: number;
  } | null;
  refetch: () => Promise<void>;  // Função para recarregar dados
}
*/

// Exportação vazia apenas para TypeScript não reclamar
export {};
