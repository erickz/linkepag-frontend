'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useAuth, useProtectedRoute } from '@/hooks/useAuth';
import { useApiParallel } from '@/hooks/useApi';
import { getLinks, getProfile, getSalesReport, getPendingPayments, getAnalyticsSummary, trackActivity, CACHE_KEYS } from '@/lib/api';
import { getMpOAuthStatus } from '@/lib/api';
import type { AnalyticsSummary } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { BillingAlert } from '@/components/billing/BillingAlert';
import { 
  IconLink, 
  IconCoins, 
  IconCrown,
  IconArrowRight,
  IconExternalLink,
  IconCopy,
  IconClock,
  IconEye,
  IconTarget,
  IconTrendingUp
} from '@/components/icons';

interface LinkItem {
  id: string;
  title: string;
  isActive: boolean;
  template?: 'direct' | 'paid_access' | 'digital_product' | 'scheduling';
  isPaid?: boolean;
}

interface ProfileData {
  username: string;
  displayName?: string;
  profilePhoto?: string;
  bio?: string;
  planId?: number;
  planStatus?: 'active' | 'expired' | 'cancelled' | 'pending_payment';
  planExpiryDate?: string;
  pixKey?: string;
}

interface SalesReport {
  totalSales: number;
  confirmedOrders: number;
  pendingAmount: number;
}

export default function AdminDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [mercadoPagoConfigured, setMercadoPagoConfigured] = useState(false);
  const [isLoadingMP, setIsLoadingMP] = useState(true);
  const [planExpiringSoon, setPlanExpiringSoon] = useState(false);
  const [daysUntilExpiry, setDaysUntilExpiry] = useState<number | null>(null);
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [isLoadingSales, setIsLoadingSales] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [isLoadingPending, setIsLoadingPending] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);
  
  useProtectedRoute('/login');

  // Memoizar queries para evitar recriação a cada render
  const queries = useMemo(() => ({
    links: { key: CACHE_KEYS.LINKS, fetchFn: getLinks },
    profile: { key: CACHE_KEYS.PROFILE, fetchFn: getProfile },
  }), []);

  // Memoizar options para evitar recriação
  const options = useMemo(() => ({ enabled: isAuthenticated }), [isAuthenticated]);

  const { data, isLoading: isLoadingData } = useApiParallel<{
    links: { links: LinkItem[] };
    profile: ProfileData;
  }>(queries, options);
  const links = data?.links?.links || [];
  const profile = data?.profile;

  const activeLinks = links.filter((l: LinkItem) => l.isActive).length;
  const paidLinks = links.filter((l: LinkItem) => l.template === 'paid_access' || l.template === 'digital_product').length;

  useEffect(() => {
    if (isAuthenticated) {
      loadMercadoPagoStatus();
      loadSalesReport();
      loadPendingPaymentsCount();
      loadAnalyticsSummary();
    }
  }, [isAuthenticated]);

  // Registra atividade do usuário uma vez por sessão (throttle de 5 min no backend)
  useEffect(() => {
    if (
      isAuthenticated &&
      typeof window !== 'undefined' &&
      !sessionStorage.getItem('lp_activity_tracked')
    ) {
      sessionStorage.setItem('lp_activity_tracked', '1');
      trackActivity().catch(() => {});
    }
  }, [isAuthenticated]);

  // Carrega status do plano quando profile estiver disponível
  useEffect(() => {
    if (profile) {
      loadPlanStatus();
    }
  }, [profile]);

  const loadSalesReport = async () => {
    try {
      setIsLoadingSales(true);
      const data = await getSalesReport();
      if (data.success) {
        setSalesReport({
          totalSales: data.report.totalSales,
          confirmedOrders: data.report.confirmedOrders,
          pendingAmount: data.report.pendingAmount,
        });
      }
    } catch (err) {
      console.error('Erro ao carregar relatório:', err);
    } finally {
      setIsLoadingSales(false);
    }
  };

  const loadMercadoPagoStatus = async () => {
    try {
      setIsLoadingMP(true);
      // Usa OAuth ao invés de credenciais manuais
      const data = await getMpOAuthStatus();
      setMercadoPagoConfigured(data.connected);
    } catch (err) {
      setMercadoPagoConfigured(false);
    } finally {
      setIsLoadingMP(false);
    }
  };

  const loadPlanStatus = useCallback(async () => {
    try {
      // Verifica se o plano está prestes a expirar (menos de 7 dias)
      if (profile?.planExpiryDate) {
        const expiryDate = new Date(profile.planExpiryDate);
        const now = new Date();
        const diffTime = expiryDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 7 && diffDays > 0 && profile?.planStatus === 'active') {
          setPlanExpiringSoon(true);
          setDaysUntilExpiry(diffDays);
        } else {
          setPlanExpiringSoon(false);
          setDaysUntilExpiry(null);
        }
      }
    } catch (err) {
      console.error('Erro ao verificar status do plano:', err);
    }
  }, [profile]);

  const loadPendingPaymentsCount = async () => {
    try {
      setIsLoadingPending(true);
      const data = await getPendingPayments();
      if (data.success) {
        setPendingCount(data.payments?.length || 0);
        const total = data.payments?.reduce((sum: number, p: { amount: number }) => sum + (p.amount || 0), 0) || 0;
        setPendingAmount(total);
      }
    } catch (err) {
      console.error('Erro ao carregar pagamentos pendentes:', err);
    } finally {
      setIsLoadingPending(false);
    }
  };

  const loadAnalyticsSummary = async () => {
    try {
      setIsLoadingAnalytics(true);
      const data = await getAnalyticsSummary();
      setAnalytics(data);
    } catch (err) {
      console.error('Erro ao carregar estatísticas de visitas:', err);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  const publicUrl = profile?.username ? `/p/${profile.username}` : '#';
  const fullPublicUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/p/${profile?.username || ''}` 
    : '';

  const getPlanName = () => {
    if (profile?.planStatus === 'pending_payment') return 'Starter';
    if (profile?.planId === 1 || !profile?.planId) return 'Starter';
    if (profile?.planId === 2) return 'Creator';
    if (profile?.planId === 3) return 'Pro';
    if (profile?.planId === 4) return 'Ilimitado';
    return 'Starter';
  };

  const getPlanLimit = () => {
    if (profile?.planId === 1 || !profile?.planId) return 3;
    if (profile?.planId === 2) return 10;
    return Infinity;
  };

  const hasPendingPayments = !isLoadingPending && pendingCount > 0;

  // CTR (taxa de cliques) — derivado dos totais já carregados; "—" quando não há visitas
  const totalViews = analytics?.totalViews || 0;
  const totalClicks = analytics?.totalClicks || 0;
  const ctr = totalViews > 0 ? (totalClicks / totalViews) * 100 : null;
  const ctr7d = (analytics?.views7d || 0) > 0
    ? ((analytics?.clicks7d || 0) / (analytics?.views7d || 0)) * 100
    : null;

  const formatCtr = (value: number | null) =>
    value === null
      ? '—'
      : `${value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

  if (isLoading || isLoadingData) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Visão geral da sua conta e estatísticas"
        breadcrumbs={[{ label: 'Dashboard' }]}
      />

      {/* Public URL Card - Non clickable info card */}
      {profile?.username && (
        <div className="mb-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="min-w-0">
              <p className="text-indigo-100 text-sm font-medium mb-1">Sua página pública</p>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-xl font-bold truncate">linkpagg.com/p/{profile.username}</span>
                <span className="px-2 py-0.5 bg-white/20 rounded text-xs font-medium flex-shrink-0">Pública</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigator.clipboard.writeText(fullPublicUrl)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium text-sm transition backdrop-blur-sm"
              >
                <IconCopy className="w-4 h-4" />
                Copiar link
              </button>
              <Link
                href={publicUrl}
                target="_blank"
                className="flex items-center gap-2 px-4 py-2.5 bg-white text-indigo-600 rounded-xl font-medium text-sm hover:bg-indigo-50 transition"
              >
                <IconExternalLink className="w-4 h-4" />
                Ver página
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Alertas de Plano e Taxas Pendentes */}
      <div className="space-y-3 mb-6">
        <BillingAlert />

        {/* Alerta sutil de plano expirando */}
        {planExpiringSoon && daysUntilExpiry !== null && (
          <Link 
            href="/admin/plans"
            className="block bg-amber-50/70 border border-amber-200/70 rounded-xl p-4 hover:bg-amber-100/70 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-amber-900">
                  Seu plano expira em {daysUntilExpiry} {daysUntilExpiry === 1 ? 'dia' : 'dias'}
                </p>
                <p className="text-sm text-amber-700 mt-0.5">
                  Renove agora para não perder seus benefícios
                </p>
              </div>
              <div className="text-amber-400">
                <IconArrowRight className="w-5 h-5" />
              </div>
            </div>
          </Link>
        )}
      </div>

      {/* Hero: Vendas + Pagamentos à confirmar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card Principal - Total em Vendas */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 lg:p-8 flex flex-col justify-between transition-shadow duration-200 hover:shadow-md">
          <div className="flex items-start justify-between mb-6">
            <div className="p-2.5 bg-indigo-50 rounded-xl">
              <IconCoins className="w-6 h-6 text-indigo-600" />
            </div>
            {!isLoadingMP && !mercadoPagoConfigured && !profile?.pixKey && (
              <Link
                href="/admin/settings/payments"
                className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs font-medium text-amber-700 hover:bg-amber-100 hover:border-amber-300 transition-colors cursor-pointer"
              >
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                Configure pagamentos
              </Link>
            )}
          </div>
          
          <div>
            {isLoadingSales ? (
              <div className="space-y-3">
                <div className="h-10 w-48 bg-slate-100 rounded-lg animate-pulse" />
                <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
              </div>
            ) : (
              <>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(salesReport?.totalSales || 0)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">
                    {salesReport?.confirmedOrders || 0} vendas confirmadas
                  </span>
                </div>
              </>
            )}
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Período</span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-medium text-indigo-600">Todo o período</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card - Pagamentos à confirmar */}
        <Link 
          href="/admin/payments?tab=pending"
          className={`group rounded-2xl border shadow-sm p-6 flex flex-col justify-between transition-all duration-200 hover:shadow-md ${
            hasPendingPayments
              ? 'bg-amber-50/70 border-amber-200 hover:border-amber-300'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-start justify-between mb-6">
            <div className={`p-2.5 rounded-xl transition-colors duration-200 ${
              hasPendingPayments ? 'bg-amber-100' : 'bg-slate-50 group-hover:bg-amber-50'
            }`}>
              <IconClock className={`w-6 h-6 transition-colors duration-200 ${
                hasPendingPayments ? 'text-amber-600' : 'text-slate-500 group-hover:text-amber-600'
              }`} />
            </div>
            {hasPendingPayments && (
              <span className="px-2.5 py-1 bg-amber-500 text-white text-xs font-bold rounded-full">
                {pendingCount}
              </span>
            )}
          </div>

          <div>
            <p className={`text-sm font-medium mb-1 ${hasPendingPayments ? 'text-amber-800' : 'text-slate-500'}`}>
              Pagamentos à confirmar
            </p>
            {isLoadingPending ? (
              <div className="space-y-3 mt-2">
                <div className="h-9 w-32 bg-slate-100 rounded-lg animate-pulse" />
                <div className="h-4 w-28 bg-slate-100 rounded animate-pulse" />
              </div>
            ) : (
              <>
                <p className={`text-3xl font-bold tracking-tight mb-1 ${hasPendingPayments ? 'text-amber-900' : 'text-slate-900'}`}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pendingAmount || 0)}
                </p>
                <p className={`text-sm ${hasPendingPayments ? 'text-amber-700' : 'text-slate-400'}`}>
                  {pendingCount > 0
                    ? `${pendingCount === 1 ? '1 pagamento aguardando' : `${pendingCount} pagamentos aguardando`} confirmação`
                    : 'Nenhum pagamento à confirmar'}
                </p>
              </>
            )}
          </div>

          <div className={`mt-6 pt-4 border-t flex items-center justify-between text-sm font-medium transition-colors duration-200 ${
            hasPendingPayments
              ? 'border-amber-200/70 text-amber-700'
              : 'border-slate-100 text-slate-400 group-hover:text-amber-600'
          }`}>
            <span>{hasPendingPayments ? 'Confirmar pagamentos' : 'Ver pagamentos'}</span>
            <IconArrowRight className="w-4 h-4" />
          </div>
        </Link>
      </div>

      {/* Desempenho da página pública */}
      <div className="mt-8">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-slate-900">Desempenho da sua página</h2>
          <p className="text-sm text-slate-500 mt-0.5">Visitas e cliques na sua página pública</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card - Visitas */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 transition-shadow duration-200 hover:shadow-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-indigo-50 rounded-xl">
                <IconEye className="w-5 h-5 text-indigo-600" />
              </div>
              <p className="text-sm font-medium text-slate-500">Visitas</p>
            </div>
            {isLoadingAnalytics ? (
              <div className="space-y-2.5">
                <div className="h-9 w-24 bg-slate-100 rounded-lg animate-pulse" />
                <div className="h-5 w-36 bg-slate-100 rounded-full animate-pulse" />
              </div>
            ) : (
              <>
                <p className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
                  {(analytics?.totalViews || 0).toLocaleString('pt-BR')}
                </p>
                <span className="inline-flex items-center mt-2 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium">
                  +{(analytics?.views7d || 0).toLocaleString('pt-BR')} nos últimos 7 dias
                </span>
              </>
            )}
          </div>

          {/* Card - Cliques */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 transition-shadow duration-200 hover:shadow-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-emerald-50 rounded-xl">
                <IconTarget className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-sm font-medium text-slate-500">Cliques</p>
            </div>
            {isLoadingAnalytics ? (
              <div className="space-y-2.5">
                <div className="h-9 w-24 bg-slate-100 rounded-lg animate-pulse" />
                <div className="h-5 w-36 bg-slate-100 rounded-full animate-pulse" />
              </div>
            ) : (
              <>
                <p className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
                  {(analytics?.totalClicks || 0).toLocaleString('pt-BR')}
                </p>
                <span className="inline-flex items-center mt-2 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
                  +{(analytics?.clicks7d || 0).toLocaleString('pt-BR')} nos últimos 7 dias
                </span>
              </>
            )}
          </div>

          {/* Card - Taxa de cliques (CTR) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 transition-shadow duration-200 hover:shadow-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-emerald-50 rounded-xl">
                <IconTrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-sm font-medium text-slate-500">Taxa de cliques</p>
            </div>
            {isLoadingAnalytics ? (
              <div className="space-y-2.5">
                <div className="h-9 w-24 bg-slate-100 rounded-lg animate-pulse" />
                <div className="h-5 w-36 bg-slate-100 rounded-full animate-pulse" />
              </div>
            ) : (
              <>
                <p className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
                  {formatCtr(ctr)}
                </p>
                <span className="inline-flex items-center mt-2 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
                  {formatCtr(ctr7d)} nos últimos 7 dias
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Funil de micro-conversões dos links pagos */}
      <div className="mt-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 transition-shadow duration-200 hover:shadow-md">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-amber-50 rounded-xl">
            <IconCoins className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-sm font-medium text-slate-500">Funil de vendas</p>
        </div>
        {isLoadingAnalytics ? (
          <div className="h-16 w-full bg-slate-100 rounded-lg animate-pulse" />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Visitas na página', value: analytics?.totalViews || 0, value7d: analytics?.views7d || 0 },
              { label: 'Viram um link pago', value: analytics?.totalLinkViews || 0, value7d: analytics?.linkViews7d || 0 },
              { label: 'Iniciaram checkout', value: analytics?.totalCheckoutStarts || 0, value7d: analytics?.checkoutStarts7d || 0 },
              { label: 'Pagamentos confirmados', value: analytics?.totalPaymentsConfirmed || 0, value7d: analytics?.paymentsConfirmed7d || 0 },
            ].map((step) => (
              <div key={step.label} className="text-center">
                <p className="text-2xl font-bold text-slate-900 tracking-tight">
                  {step.value.toLocaleString('pt-BR')}
                </p>
                <p className="text-xs text-slate-500 mt-1">{step.label}</p>
                <span className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 text-[11px] font-medium">
                  +{step.value7d.toLocaleString('pt-BR')} em 7 dias
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Atalhos secundários */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
        {/* Card - Seus Links */}
        <Link 
          href="/admin/editor?tab=links"
          className="group bg-white rounded-2xl border border-slate-200 shadow-sm p-5 transition-all duration-200 hover:shadow-md hover:border-slate-300"
        >
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-slate-50 rounded-xl group-hover:bg-indigo-50 transition-colors duration-200">
              <IconLink className="w-5 h-5 text-slate-500 group-hover:text-indigo-600 transition-colors duration-200" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900">Seus Links</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeLinks} ativos • {paidLinks} monetizados
              </p>
            </div>
            <div className="text-right">
              {isLoadingData ? (
                <div className="h-7 w-8 bg-slate-100 rounded animate-pulse" />
              ) : (
                <p className="text-2xl font-bold text-slate-900">{links.length}</p>
              )}
            </div>
          </div>
        </Link>

        {/* Card - Seu Plano */}
        <Link 
          href="/admin/plans"
          className="group bg-white rounded-2xl border border-slate-200 shadow-sm p-5 transition-all duration-200 hover:shadow-md hover:border-slate-300"
        >
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-slate-50 rounded-xl group-hover:bg-purple-50 transition-colors duration-200">
              <IconCrown className="w-5 h-5 text-slate-500 group-hover:text-purple-600 transition-colors duration-200" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900">
                Plano {getPlanName()}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-500 rounded-full"
                    style={{ 
                      width: `${Math.min((paidLinks / (getPlanLimit() === Infinity ? 100 : (getPlanLimit() || 1))) * 100, 100)}%` 
                    }}
                  />
                </div>
                <span className="text-xs text-slate-400">
                  {paidLinks}/{getPlanLimit() === Infinity ? '∞' : getPlanLimit()}
                </span>
              </div>
            </div>
            <div className="text-slate-300 group-hover:text-purple-500 transition-colors duration-200">
              <IconArrowRight className="w-5 h-5" />
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
