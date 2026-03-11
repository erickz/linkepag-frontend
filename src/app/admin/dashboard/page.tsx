'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth, useProtectedRoute } from '@/hooks/useAuth';
import { useApiParallel } from '@/hooks/useApi';
import { getLinks, getProfile, getMercadoPagoCredentials, getSalesReport, CACHE_KEYS } from '@/lib/api';
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
  IconCopy
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {/* Sales Card */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg shadow-emerald-200">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-emerald-100 text-sm font-medium mb-1">Total em Vendas</p>
              <h3 className="text-2xl sm:text-3xl font-bold">
                {isLoadingSales ? '-' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(salesReport?.totalSales || 0)}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <IconCoins className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-4 mt-4 border-t border-white/20">
            <span className="text-xl font-bold">{isLoadingSales ? '-' : salesReport?.confirmedOrders || 0}</span>
            <span className="text-emerald-100 text-sm">vendas confirmadas</span>
          </div>
          { (!isLoadingMP && !mercadoPagoConfigured) || !profile?.pixKey && (
            <div className="mt-4 p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
              <p className="text-sm text-white">Configure uma forma de pagamento</p>
              <Link href="/admin/settings/payments" className="text-sm text-white/80 hover:text-white underline mt-1 inline-block">
                Configurar Pagamento →
              </Link>
            </div>
          )}
        </div>

        {/* Links Card - Info style (not clickable) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                <IconLink className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-slate-500 text-sm font-medium">Seus Links</p>
                <h3 className="text-2xl font-bold text-slate-900">{links.length}</h3>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Ativos</span>
              <span className="font-semibold text-slate-900">{activeLinks}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div 
                className="bg-indigo-500 h-2 rounded-full transition-all"
                style={{ width: `${links.length > 0 ? (activeLinks / links.length) * 100 : 0}%` }}
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-purple-100 text-purple-700">
                <IconCoins className="w-3 h-3" />
                {paidLinks} link{paidLinks !== 1 ? 's' : ''} pago{paidLinks !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Plan Card - Info style */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <IconCrown className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-slate-500 text-sm font-medium">Seu Plano</p>
                <h3 className="text-xl font-bold text-slate-900">{getPlanName()}</h3>
              </div>
            </div>
            <Link href="/admin/plans" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              Gerenciar
            </Link>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Links monetizados</span>
              <span className="font-semibold text-slate-900">
                {paidLinks} / {getPlanLimit() === Infinity ? '∞' : getPlanLimit()}
              </span>
            </div>
            {getPlanLimit() !== Infinity && (
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all ${
                    paidLinks >= getPlanLimit() ? 'bg-rose-500' : 
                    paidLinks >= getPlanLimit() * 0.8 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, (paidLinks / getPlanLimit()) * 100)}%` }}
                />
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
