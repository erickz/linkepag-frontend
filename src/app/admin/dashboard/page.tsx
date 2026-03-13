'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth, useProtectedRoute } from '@/hooks/useAuth';
import { useApiParallel } from '@/hooks/useApi';
import { getLinks, getProfile, getMercadoPagoCredentials, getSalesReport, getPendingPayments, CACHE_KEYS } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { BillingAlerts } from '@/app/components/BillingAlerts';
import { 
  IconLink, 
  IconUser, 
  IconCoins, 
  IconUsers, 
  IconCrown,
  IconCheck,
  IconArrowRight,
  IconExternalLink,
  IconCopy,
  IconClock
} from '@/components/icons';

interface LinkItem {
  id: string;
  title: string;
  isActive: boolean;
  isPaid?: boolean;
}

interface ProfileData {
  username: string;
  displayName?: string;
  profilePhoto?: string;
  bio?: string;
  planId?: number;
  planStatus?: 'active' | 'expired' | 'cancelled' | 'pending_payment';
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
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [isLoadingSales, setIsLoadingSales] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [isLoadingPending, setIsLoadingPending] = useState(true);
  
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

  // Dados para alertas de billing
  const billingUserStatus = {
    billingStatus: (profile?.planStatus === 'expired' ? 'grace_period' : 
                   profile?.planStatus === 'pending_payment' ? 'grace_period' : 'active') as 'active' | 'grace_period' | 'suspended' | 'blocked',
    planStatus: profile?.planStatus,
  };
  
  // Aqui você pode integrar com dados reais da API de billing quando disponível
  const billingInvoice = null; // Substituir por dados reais quando disponível
  const activeLinks = links.filter((l: LinkItem) => l.isActive).length;
  const paidLinks = links.filter((l: LinkItem) => l.isPaid).length;

  useEffect(() => {
    if (isAuthenticated) {
      loadMercadoPagoStatus();
      loadSalesReport();
      loadPendingPaymentsCount();
    }
  }, [isAuthenticated]);

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
      const data = await getMercadoPagoCredentials();
      setMercadoPagoConfigured(data.isConfigured);
    } catch (err) {
      setMercadoPagoConfigured(false);
    } finally {
      setIsLoadingMP(false);
    }
  };

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
      {/* Alertas de Billing */}
      <BillingAlerts user={billingUserStatus} invoice={billingInvoice} />
      
      <PageHeader
        title="Dashboard"
        description="Visão geral da sua conta e estatísticas"
        breadcrumbs={[{ label: 'Dashboard' }]}
      />

      {/* Public URL Card - Non clickable info card */}
      {profile?.username && (
        <div className="mb-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-indigo-100 text-sm font-medium mb-1">Sua página pública</p>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold">linkpagg.com/p/{profile.username}</span>
                <span className="px-2 py-0.5 bg-white/20 rounded text-xs font-medium">Pública</span>
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

      {/* Dashboard Grid - Elegante */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card Principal - Total em Vendas */}
        <div className="lg:col-span-2 lg:row-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 lg:p-8 flex flex-col justify-between transition-shadow duration-200 hover:shadow-md">
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
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Total acumulado</span>
                <span className="text-lg font-bold text-slate-800">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(salesReport?.totalSales || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card - Seus Links */}
        <Link 
          href="/admin/links"
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

        {/* Card - Pagamentos Pendentes */}
        <Link 
          href="/admin/payments?tab=pending"
          className="group bg-white rounded-2xl border border-slate-200 shadow-sm p-5 transition-all duration-200 hover:shadow-md hover:border-slate-300"
        >
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-slate-50 rounded-xl group-hover:bg-amber-50 transition-colors duration-200">
              <IconClock className="w-5 h-5 text-slate-500 group-hover:text-amber-600 transition-colors duration-200" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900">Pendentes</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {pendingCount} aguardando
              </p>
            </div>
            <div className="text-right">
              {isLoadingPending ? (
                <div className="h-7 w-16 bg-slate-100 rounded animate-pulse" />
              ) : (
                <p className="text-2xl font-bold text-slate-900">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pendingAmount || 0)}
                </p>
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
                {getPlanName()}
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
