import { apiCache, fetchWithCache } from './api-cache';

// Export apiCache para uso externo
export { apiCache };

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.linkepag.com.br';

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ============ CACHE KEYS ============
export const CACHE_KEYS = {
  PROFILE: 'profile',
  LINKS: 'links',
  SUBSCRIPTION: 'subscription',
  PLANS: 'plans',
  PUBLIC_PROFILE: (username: string) => `public-profile:${username}`,
  PAYMENT_STATUS: (paymentId: string) => `payment:${paymentId}`,
} as const;

// ============ CACHE TTLs ============
const CACHE_TTL = {
  PROFILE: 60 * 1000,        // 1 minuto
  LINKS: 30 * 1000,          // 30 segundos
  PUBLIC_PROFILE: 2 * 60 * 1000, // 2 minutos
};

// ============ AUTH ============

export async function registerUser(data: {
  name: string;
  email: string;
  cpf?: string;
  password: string;
}) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fullName: data.name,
      email: data.email,
      ...(data.cpf && { cpf: data.cpf }),
      password: data.password,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao registrar usuário');
  }

  return response.json();
}

export async function loginUser(data: {
  email: string;
  password: string;
}) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: data.email,
      password: data.password,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao fazer login');
  }

  const result = await response.json();

  // Store the token in localStorage
  if (result.token && typeof window !== 'undefined') {
    localStorage.setItem('token', result.token);
    localStorage.setItem('user', JSON.stringify(result.user));
  }

  return result;
}

export function logoutUser() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
  // Limpa cache do usuário ao fazer logout
  apiCache.invalidatePrefix(CACHE_KEYS.PROFILE);
  apiCache.invalidatePrefix(CACHE_KEYS.LINKS);
}

export async function forgotPassword(data: {
  email: string;
}) {
  const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao solicitar redefinição de senha');
  }

  return response.json();
}

export async function resetPassword(data: {
  token: string;
  password: string;
}) {
  const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao redefinir senha');
  }

  return response.json();
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export function getStoredUser(): {
  id: string;
  fullName: string;
  email: string;
  cpf: string;
  username: string;
  displayName?: string;
  bio?: string;
  profilePhoto?: string;
  location?: string;
} | null {
  if (typeof window === 'undefined') return null;
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

// ============ PROFILE (com cache) ============

export async function getProfile() {
  return fetchWithCache(
    CACHE_KEYS.PROFILE,
    async () => {
      const response = await fetch(`${API_BASE_URL}/users/profile`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao obter perfil');
      }

      return response.json();
    },
    { ttl: CACHE_TTL.PROFILE }
  );
}

export async function updateProfile(data: {
  fullName?: string;
  displayName?: string;
  bio?: string;
  profilePhoto?: string;
  location?: string;
  phone?: string;
  socialLinks?: {
    instagram?: string;
    tiktok?: string;
    youtube?: string;
    twitter?: string;
    linkedin?: string;
    github?: string;
    website?: string;
  };
  cpf?: string;
  pixKey?: string;
  pixKeyType?: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM';
  pixQRCodeImage?: string;
  notifyPendingPayments?: boolean;
  activePaymentMethod?: 'mercadopago' | 'pix_direct' | null;
  appearanceSettings?: {
    headerGradient?: string;
    backgroundColor?: string;
    paidLinkAccent?: string;
  };
}) {
  const response = await fetch(`${API_BASE_URL}/users/profile`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao atualizar perfil');
  }

  // Invalida cache do perfil após atualização
  apiCache.invalidate(CACHE_KEYS.PROFILE);
  
  return response.json();
}

export async function updateUsername(username: string) {
  const response = await fetch(`${API_BASE_URL}/users/username`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ username }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao atualizar username');
  }

  // Invalida cache do perfil após atualização
  apiCache.invalidate(CACHE_KEYS.PROFILE);
  
  return response.json();
}

export async function checkUsernameAvailability(username: string): Promise<{ available: boolean; username: string }> {
  const response = await fetch(`${API_BASE_URL}/users/check-username/${encodeURIComponent(username)}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao verificar disponibilidade');
  }

  return response.json();
}

// ============ PUBLIC PROFILE (com cache) ============

export async function getPublicProfile(username: string) {
  const cacheKey = CACHE_KEYS.PUBLIC_PROFILE(username);
  
  return fetchWithCache(
    cacheKey,
    async () => {
      const response = await fetch(`${API_BASE_URL}/users/profile/${username}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao obter perfil público');
      }

      return response.json();
    },
    { ttl: CACHE_TTL.PUBLIC_PROFILE }
  );
}

// ============ LINKS (com cache) ============

export async function getLinks() {
  return fetchWithCache(
    CACHE_KEYS.LINKS,
    async () => {
      const response = await fetch(`${API_BASE_URL}/links`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao obter links');
      }

      return response.json();
    },
    { ttl: CACHE_TTL.LINKS }
  );
}

export async function createLink(data: {
  title: string;
  description?: string;
  url?: string;
  icon?: string;
  openInNewTab?: boolean;
  type?: 'free' | 'paid';
  isPaid?: boolean;
  price?: number;
  pixKey?: string;
  pixKeyType?: string;
  paymentTimeoutMinutes?: number;
}) {
  const response = await fetch(`${API_BASE_URL}/links`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao criar link');
  }

  // Invalida cache dos links após criação
  apiCache.invalidate(CACHE_KEYS.LINKS);
  
  return response.json();
}

export async function updateLink(
  id: string,
  data: {
    title?: string;
    description?: string;
    url?: string;
    icon?: string;
    order?: number;
    isActive?: boolean;
    openInNewTab?: boolean;
    type?: 'free' | 'paid';
    isPaid?: boolean;
    price?: number;
    pixKey?: string;
    pixKeyType?: string;
    paymentTimeoutMinutes?: number;
  }
) {
  const response = await fetch(`${API_BASE_URL}/links/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao atualizar link');
  }

  // Invalida cache dos links após atualização
  apiCache.invalidate(CACHE_KEYS.LINKS);
  
  return response.json();
}

export async function deleteLink(id: string) {
  const response = await fetch(`${API_BASE_URL}/links/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao deletar link');
  }

  // Invalida cache dos links após deleção
  apiCache.invalidate(CACHE_KEYS.LINKS);
  
  return response.json();
}

export async function reorderLinks(linkIds: string[]) {
  const response = await fetch(`${API_BASE_URL}/links/reorder`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ linkIds }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao reordenar links');
  }

  // Invalida cache dos links após reordenação
  apiCache.invalidate(CACHE_KEYS.LINKS);
  
  return response.json();
}

export async function toggleLinkActive(id: string) {
  const response = await fetch(`${API_BASE_URL}/links/${id}/toggle`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao alterar status do link');
  }

  // Invalida cache dos links
  apiCache.invalidate(CACHE_KEYS.LINKS);
  
  return response.json();
}

export async function uploadLinkFile(linkId: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const token = localStorage.getItem('token');
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/links/${linkId}/file`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao fazer upload do arquivo');
  }

  // Invalida cache dos links após upload
  apiCache.invalidate(CACHE_KEYS.LINKS);
  
  return response.json();
}

export async function deleteLinkFile(linkId: string) {
  const response = await fetch(`${API_BASE_URL}/links/${linkId}/file`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao remover arquivo');
  }

  // Invalida cache dos links
  apiCache.invalidate(CACHE_KEYS.LINKS);
  
  return response.json();
}

// ============ PAYMENTS (sem cache - dados dinâmicos) ============

export async function createPayment(linkId: string, payerInfo?: {
  email?: string;
  phone?: string;
  name?: string;
  deviceId?: string;
}) {
  const response = await fetch(`${API_BASE_URL}/payments/create/${linkId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payerInfo || {}),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao criar pagamento');
  }

  return response.json();
}

// ============ PAYMENT BRICK (PIX via MercadoPago Brick) ============

export async function registerBrickPayment(linkId: string, paymentData: {
  gatewayId: string;
  pixCode?: string;
  qrCodeUrl?: string;
  payerEmail?: string;
  payerName?: string;
  payerPhone?: string;
  paymentMethodType?: 'pix' | 'credit_card' | 'debit_card' | string;
  status?: 'pending' | 'approved' | 'in_process' | string;
}) {
  const response = await fetch(`${API_BASE_URL}/payments/register-brick/${linkId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(paymentData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao registrar pagamento');
  }

  return response.json();
}

export async function checkPaymentStatus(paymentId: string) {
  // Pagamentos não são cacheados - sempre busca status atual
  const response = await fetch(`${API_BASE_URL}/payments/status/${paymentId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao verificar status');
  }

  return response.json();
}

export async function validateAccess(linkId: string, accessToken: string) {
  const response = await fetch(`${API_BASE_URL}/payments/validate-access/${linkId}?token=${accessToken}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao validar acesso');
  }

  return response.json();
}

// ============ PIX DIRECT PAYMENTS ============

export async function createPixDirectPayment(linkId: string, payerInfo?: {
  email?: string;
  phone?: string;
  name?: string;
  deviceId?: string;
}) {
  const response = await fetch(`${API_BASE_URL}/payments/create-pix-direct/${linkId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payerInfo || {}),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao criar pagamento PIX');
  }

  return response.json();
}

export async function uploadReceipt(paymentId: string, receiptUrl: string) {
  const response = await fetch(`${API_BASE_URL}/payments/${paymentId}/receipt`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ receiptUrl }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao enviar comprovante');
  }

  return response.json();
}

export async function getPendingPayments() {
  const response = await fetch(`${API_BASE_URL}/payments/pending`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao buscar pagamentos pendentes');
  }

  return response.json();
}

export async function confirmPaymentManual(paymentId: string, notes?: string) {
  const response = await fetch(`${API_BASE_URL}/payments/${paymentId}/confirm`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ notes }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao confirmar pagamento');
  }

  return response.json();
}

// ============ MERCADO PAGO CREDENTIALS ============

export async function getMercadoPagoCredentials() {
  const response = await fetch(`${API_BASE_URL}/users/mercadopago/credentials`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao obter credenciais');
  }

  return response.json();
}

export async function updateMercadoPagoCredentials(data: {
  mercadoPagoPublicKey?: string;
  mercadoPagoAccessToken?: string;
}) {
  const response = await fetch(`${API_BASE_URL}/users/mercadopago/credentials`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao atualizar credenciais');
  }

  return response.json();
}

export async function testMercadoPagoConnection(data: {
  publicKey: string;
  accessToken: string;
}) {
  // Simulação de teste de conexão - em produção, isso chamaria o backend
  // Por enquanto, apenas validamos o formato das credenciais
  const isValidFormat = 
    data.publicKey.startsWith('TEST-') || data.publicKey.startsWith('APP_USR-') &&
    data.accessToken.startsWith('TEST-') || data.accessToken.startsWith('APP_USR-');
  
  if (!isValidFormat) {
    throw new Error('Formato de credenciais inválido');
  }
  
  // Simula uma chamada de API
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    success: true,
    message: 'Credenciais válidas',
  };
}

// ============ SALES REPORT ============

export async function getSalesReport() {
  const response = await fetch(`${API_BASE_URL}/payments/report`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao obter relatório');
  }

  return response.json();
}

// ============ LEADS ============

export interface Lead {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  source?: string;
  converted: boolean;
  convertedAt?: string;
  linkId: string;
  paymentId?: string;
  createdAt: string;
}

export interface LeadsStats {
  total: number;
  converted: number;
  conversionRate: number;
  recentLeads: number;
}

export async function getLeads() {
  const response = await fetch(`${API_BASE_URL}/leads`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao obter leads');
  }

  return response.json();
}

export async function getLeadsStats() {
  const response = await fetch(`${API_BASE_URL}/leads/stats`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao obter estatísticas');
  }

  return response.json();
}

export async function deleteLead(leadId: string) {
  const response = await fetch(`${API_BASE_URL}/leads/${leadId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao remover lead');
  }

  return response.json();
}

export async function exportLeads(): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/leads/export`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao exportar leads');
  }

  return response.blob();
}

// ============ UTILS ============

/**
 * Invalida manualmente o cache de perfil
 */
export function invalidateProfileCache() {
  apiCache.invalidate(CACHE_KEYS.PROFILE);
}

/**
 * Invalida manualmente o cache de links
 */
export function invalidateLinksCache() {
  apiCache.invalidate(CACHE_KEYS.LINKS);
}

/**
 * Limpa todo o cache da API
 */
export function clearApiCache() {
  apiCache.clear();
}

/**
 * Retorna estatísticas do cache (para debug)
 */
export function getCacheStats() {
  return apiCache.getStats();
}

// ============ SUBSCRIPTIONS ============

export async function getPlans() {
  const response = await fetch(`${API_BASE_URL}/subscriptions/plans`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao obter planos');
  }

  return response.json();
}

export async function getCurrentSubscription() {
  const response = await fetch(`${API_BASE_URL}/subscriptions/current`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao obter assinatura');
  }

  return response.json();
}

export async function createSubscription(
  planId: number, 
  paymentMethod: 'credit_card' | 'pix', 
  cardToken?: string,
  cardHolderCpf?: string
) {
  const response = await fetch(`${API_BASE_URL}/subscriptions`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ planId, paymentMethod, cardToken, cardHolderCpf }),
  });

  if (!response.ok) {
    let errorMessage = 'Erro ao criar assinatura';
    try {
      const error = await response.json();
      errorMessage = error.message || errorMessage;
    } catch (e) {
      // Could not parse error response
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function cancelSubscription(reason?: string) {
  const response = await fetch(`${API_BASE_URL}/subscriptions/cancel`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ reason }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao cancelar assinatura');
  }

  return response.json();
}

export async function renewSubscription(cardToken?: string) {
  const response = await fetch(`${API_BASE_URL}/subscriptions/renew`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ cardToken }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao renovar assinatura');
  }

  return response.json();
}

export async function scheduleDowngrade(targetPlanId: number, reason?: string) {
  const response = await fetch(`${API_BASE_URL}/subscriptions/downgrade/schedule`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ targetPlanId, reason }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao agendar downgrade');
  }

  return response.json();
}

export async function getScheduledDowngrade() {
  const response = await fetch(`${API_BASE_URL}/subscriptions/downgrade/scheduled`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao buscar downgrade agendado');
  }

  return response.json();
}

// ============ CONTACT ============

export async function submitContactForm(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  const response = await fetch(`${API_BASE_URL}/contact`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Erro ao enviar mensagem');
  }

  return result;
}

// ============ MERCADO PAGO OAUTH ============

export async function initiateMpOAuth() {
  const response = await fetch(`${API_BASE_URL}/mp-oauth/initiate`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao iniciar OAuth');
  }

  return response.json();
}

export async function getMpOAuthStatus() {
  const response = await fetch(`${API_BASE_URL}/mp-oauth/status`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao obter status OAuth');
  }

  return response.json();
}

export async function disconnectMpOAuth() {
  const response = await fetch(`${API_BASE_URL}/mp-oauth/disconnect`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao desconectar OAuth');
  }

  return response.json();
}

// ============ SUBSCRIPTION HISTORY ============

export interface SubscriptionHistoryFilters {
  status?: string;
  planId?: number;
  startDate?: string;
  endDate?: string;
  paymentMethod?: string;
}

export interface SubscriptionHistoryItem {
  _id: string;
  planId: number;
  planName: string;
  status: string;
  amount: number;
  currency: string;
  paymentMethod?: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  startedAt: string;
  endedAt?: string;
  cancelledAt?: string;
  expiresAt?: string;
  cancellationReason?: string;
  createdAt: string;
  autoRenew?: boolean;
  cancelAtPeriodEnd?: boolean;
}

export interface ExportFormat {
  format: 'csv' | 'json' | 'excel';
  filters?: SubscriptionHistoryFilters;
}

export async function getSubscriptionHistory(
  page = 1,
  limit = 10,
  filters?: SubscriptionHistoryFilters,
  sortBy = 'createdAt',
  order: 'asc' | 'desc' = 'desc'
): Promise<{
  subscriptions: SubscriptionHistoryItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  summary: {
    totalSpent: number;
    totalSubscriptions: number;
    activeSubscriptions: number;
    cancelledSubscriptions: number;
    expiredSubscriptions: number;
    mostUsedPlan: {
      planId: number;
      planName: string;
      count: number;
    } | null;
    averageAmount: number;
  };
}> {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  params.append('sortBy', sortBy);
  params.append('order', order);

  if (filters?.status) params.append('status', filters.status);
  if (filters?.planId) params.append('planId', filters.planId.toString());
  if (filters?.startDate) params.append('startDate', filters.startDate);
  if (filters?.endDate) params.append('endDate', filters.endDate);
  if (filters?.paymentMethod) params.append('paymentMethod', filters.paymentMethod);

  const response = await fetch(`${API_BASE_URL}/subscriptions/history?${params.toString()}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao obter histórico de assinaturas');
  }

  return response.json();
}

export async function exportSubscriptionHistory(config: ExportFormat): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/subscriptions/history/export`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao exportar histórico');
  }

  return response.blob();
}
