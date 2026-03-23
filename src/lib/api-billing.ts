/**
 * API Billing Service
 * 
 * Funções para integração com o sistema de billing cycles
 * do backend LinkePag.
 */

import { apiCache } from './api-cache';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.linkepag.com.br';

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ============ CACHE KEYS ============
export const BILLING_CACHE_KEYS = {
  CURRENT_CYCLE: 'billing:current-cycle',
  BILLING_STATUS: 'billing:status',
  CYCLE_HISTORY: 'billing:history',
} as const;

// ============ TYPES ============

export interface BillingCycle {
  id: string;
  userId: string;
  planId: number;
  cycleNumber: number;
  status: 'active' | 'expired' | 'grace_period' | 'closed';
  startDate: string;
  endDate: string;
  gracePeriodEndDate?: string;
  totalFeesAccrued: number;
  totalTransactions: number;
  feesPaid: number;
  feesForgiven: number;
  createdAt: string;
  updatedAt: string;
}

export interface CycleSummary {
  cycle: BillingCycle;
  totalFees: number;
  transactionCount: number;
  daysRemaining: number;
  graceDaysRemaining?: number;
  isInGracePeriod: boolean;
}

export interface BillingStatus {
  status: 'active' | 'grace_period' | 'suspended';
  cycleEndDate: string;
  gracePeriodEndDate?: string;
  daysRemaining: number;
  totalFees: number;
  totalFeesAccrued: number;
  totalFeesDebt: number;
  totalFeesPending: number;
  alertLevel: 'none' | 'warning' | 'critical';
  actionRequired: boolean;
}

export interface BillingAlert {
  type: 'warning' | 'danger' | 'info';
  message: string;
  actionRequired: boolean;
  action?: {
    label: string;
    href: string;
  };
}

export interface FeeTransaction {
  id: string;
  billingCycleId: string;
  paymentId: string;
  transactionAmount: number;
  feeAmount: number;
  feePercentage: number;
  planId: number;
  createdAt: string;
}

export interface BillingPayment {
  id: string;
  billingCycleId: string;
  planId: number;
  planAmount: number;
  feesAmount: number;
  totalAmount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod: 'pix' | 'credit_card';
  pixCode?: string;
  pixQrCodeUrl?: string;
  paidAt?: string;
  createdAt: string;
}

export interface PayFeesResponse {
  paymentId: string;
  status: string;
  totalAmount: number;
  pixData?: {
    pixCode: string;
    qrCodeUrl: string;
    expirationDate: string;
  };
  paymentUrl?: string;
}

export interface OutstandingDebt {
  hasDebt: boolean;
  amount: number;
  canUpgrade: boolean;
}

// ============ API FUNCTIONS ============

/**
 * Busca o ciclo de billing atual do usuário
 * GET /billing/cycle/current
 */
export async function getCurrentBillingCycle(): Promise<{
  success: boolean;
  data: CycleSummary;
}> {
  const response = await fetch(`${API_BASE_URL}/billing/cycle/current`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao obter ciclo de billing');
  }

  return response.json();
}

/**
 * Busca o status completo do billing do usuário
 * GET /billing/summary
 */
export async function getBillingStatus(): Promise<{
  success: boolean;
  data: BillingStatus;
}> {
  const response = await fetch(`${API_BASE_URL}/billing/summary`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao obter status do billing');
  }

  return response.json();
}

/**
 * Busca histórico de ciclos de billing
 * GET /billing/cycle/history
 */
export async function getBillingHistory(
  limit = 12
): Promise<{
  success: boolean;
  data: {
    cycles: BillingCycle[];
    total: number;
  };
}> {
  const response = await fetch(`${API_BASE_URL}/billing/cycle/history?limit=${limit}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao obter histórico de billing');
  }

  return response.json();
}

/**
 * Busca relatório de taxas
 * GET /billing/fees/report
 */
export async function getFeesReport(
  startDate?: string,
  endDate?: string
): Promise<{
  success: boolean;
  data: {
    totalFees: number;
    totalTransactions: number;
    byCycle: Array<{
      cycleId: string;
      totalFees: number;
      transactionCount: number;
    }>;
  };
}> {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const response = await fetch(`${API_BASE_URL}/billing/fees/report?${params.toString()}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao obter relatório de taxas');
  }

  return response.json();
}

/**
 * Inicia pagamento das taxas acumuladas (apenas taxas, sem plano)
 * POST /billing/payment
 */
export async function createBillingPayment(
  paymentMethod: 'pix' | 'credit_card',
  cardToken?: string
): Promise<PayFeesResponse> {
  const response = await fetch(`${API_BASE_URL}/billing/payment`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ paymentMethod, cardToken, planAmount: 0 }), // planAmount: 0 = paga apenas taxas
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao processar pagamento');
  }

  const result = await response.json();

  // Limpa cache após pagamento
  apiCache.invalidate(BILLING_CACHE_KEYS.BILLING_STATUS);
  apiCache.invalidate(BILLING_CACHE_KEYS.CURRENT_CYCLE);

  // O backend retorna { success: true, data: {...} }
  return result.data;
}

/**
 * Verifica se o usuário pode receber pagamentos
 * GET /billing/status
 */
export async function canReceivePayments(): Promise<{
  success: boolean;
  canReceive: boolean;
  reason?: string;
}> {
  const response = await fetch(`${API_BASE_URL}/billing/status`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao verificar permissões');
  }

  const data = await response.json();
  return {
    success: true,
    canReceive: data.canReceive,
    reason: data.reason,
  };
}

/**
 * Busca pagamento pendente (se houver)
 * GET /billing/payment/pending
 */
export async function getPendingPayment(): Promise<{
  success: boolean;
  payment: BillingPayment | null;
}> {
  const response = await fetch(`${API_BASE_URL}/billing/payment/pending`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao obter pagamento pendente');
  }

  return response.json();
}

// ============ CACHE UTILITIES ============

/**
 * Invalida cache de billing
 */
export function invalidateBillingCache() {
  apiCache.invalidate(BILLING_CACHE_KEYS.BILLING_STATUS);
  apiCache.invalidate(BILLING_CACHE_KEYS.CURRENT_CYCLE);
  apiCache.invalidate(BILLING_CACHE_KEYS.CYCLE_HISTORY);
}

/**
 * Limpa todo cache relacionado a billing
 */
export function clearBillingCache() {
  apiCache.invalidatePrefix('billing:');
}
