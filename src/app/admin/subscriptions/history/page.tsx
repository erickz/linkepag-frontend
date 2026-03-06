'use client';

import { useState, useCallback, useMemo } from 'react';
import { useAuth, useProtectedRoute } from '@/hooks/useAuth';
import { useSubscriptionHistory } from '@/hooks/useSubscriptionHistory';
import { PageHeader } from '@/components/PageHeader';
import {
  IconFilter,
  IconDownload,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconCalendar,
  IconRefresh,
  IconTrendingUp,
  IconReceipt,
  IconCreditCard,
  IconWallet,
  IconChevronUp,
  IconX,
} from '@/components/icons';

interface FilterState {
  status: string[];
  planId: number[];
  paymentMethod: string[];
  startDate: string;
  endDate: string;
}

const statusOptions = [
  { value: 'active', label: 'Ativa', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'expired', label: 'Expirada', color: 'bg-slate-100 text-slate-600' },
  { value: 'cancelled', label: 'Cancelada', color: 'bg-red-100 text-red-700' },
  { value: 'pending_payment', label: 'Pagamento Pendente', color: 'bg-amber-100 text-amber-700' },
  { value: 'payment_failed', label: 'Pagamento Falhou', color: 'bg-rose-100 text-rose-700' },
];

const planOptions = [
  { value: 1, label: 'Grátis' },
  { value: 2, label: 'Creator' },
  { value: 3, label: 'Pro' },
  { value: 4, label: 'Ilimitado' },
];

const paymentMethodOptions = [
  { value: 'credit_card', label: 'Cartão de Crédito' },
  { value: 'pix', label: 'PIX' },
];

export default function SubscriptionHistoryPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  useProtectedRoute('/login');

  const {
    subscriptions,
    total,
    page,
    totalPages,
    limit,
    loading,
    error,
    filters,
    setFilters,
    setPage,
    setLimit,
    sortBy,
    setSortBy,
    order,
    setOrder,
    refetch,
    exportData,
    summary,
  } = useSubscriptionHistory();

  const [showFilters, setShowFilters] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [localFilters, setLocalFilters] = useState<FilterState>({
    status: [],
    planId: [],
    paymentMethod: [],
    startDate: '',
    endDate: '',
  });

  // Update local filters when external filters change
  const applyFilters = useCallback(() => {
    setFilters({
      status: localFilters.status.length > 0 ? localFilters.status[0] : undefined,
      planId: localFilters.planId.length > 0 ? localFilters.planId[0] : undefined,
      paymentMethod: localFilters.paymentMethod.length > 0 ? localFilters.paymentMethod[0] : undefined,
      startDate: localFilters.startDate || undefined,
      endDate: localFilters.endDate || undefined,
    });
  }, [localFilters, setFilters]);

  const clearFilters = useCallback(() => {
    setLocalFilters({
      status: [],
      planId: [],
      paymentMethod: [],
      startDate: '',
      endDate: '',
    });
    setFilters({});
  }, [setFilters]);

  const handleSort = useCallback((field: string) => {
    if (sortBy === field) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setOrder('desc');
    }
  }, [sortBy, order, setSortBy, setOrder]);

  const handleExport = useCallback(async (format: 'csv' | 'json' | 'excel') => {
    setShowExportMenu(false);
    await exportData(format);
  }, [exportData]);

  const toggleFilter = useCallback((type: keyof FilterState, value: string | number) => {
    setLocalFilters(prev => {
      const current = prev[type] as (string | number)[];
      const exists = current.includes(value);
      return {
        ...prev,
        [type]: exists
          ? current.filter(v => v !== value)
          : [...current, value],
      };
    });
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const option = statusOptions.find(o => o.value === status);
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${option?.color || 'bg-slate-100 text-slate-600'}`}>
        {option?.label || status}
      </span>
    );
  };

  const hasActiveFilters = useMemo(() => {
    return (
      localFilters.status.length > 0 ||
      localFilters.planId.length > 0 ||
      localFilters.paymentMethod.length > 0 ||
      localFilters.startDate !== '' ||
      localFilters.endDate !== ''
    );
  }, [localFilters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (localFilters.status.length > 0) count++;
    if (localFilters.planId.length > 0) count++;
    if (localFilters.paymentMethod.length > 0) count++;
    if (localFilters.startDate || localFilters.endDate) count++;
    return count;
  }, [localFilters]);

  if (isAuthLoading) {
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
        title="Histórico de Assinaturas"
        description="Visualize e gerencie seu histórico de planos"
        breadcrumbs={[
          { label: 'Assinaturas', href: '/admin/plans' },
          { label: 'Histórico' },
        ]}
      />

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                <IconWallet className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-slate-500 text-xs font-medium">Total Gasto</p>
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-slate-900">{formatCurrency(summary.totalSpent)}</h3>
            <p className="text-slate-400 text-xs mt-1">Em todas as assinaturas</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <IconReceipt className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-slate-500 text-xs font-medium">Assinaturas</p>
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-slate-900">{summary.totalSubscriptions}</h3>
            <p className="text-slate-400 text-xs mt-1">
              {summary.activeSubscriptions} ativas
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <IconTrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-slate-500 text-xs font-medium">Plano Mais Usado</p>
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-slate-900">
              {summary.mostUsedPlan?.planName || '-'}
            </h3>
            <p className="text-slate-400 text-xs mt-1">
              {summary.mostUsedPlan ? `${summary.mostUsedPlan.count}x` : 'Nenhum'}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <IconCreditCard className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-slate-500 text-xs font-medium">Média por Plano</p>
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-slate-900">{formatCurrency(summary.averageAmount)}</h3>
            <p className="text-slate-400 text-xs mt-1">Valor médio</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Toolbar */}
        <div className="border-b border-slate-200 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition ${
                  showFilters || hasActiveFilters
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <IconFilter className="w-4 h-4" />
                Filtros
                {activeFilterCount > 0 && (
                  <span className="bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
                {showFilters ? <IconChevronUp className="w-4 h-4" /> : <IconChevronDown className="w-4 h-4" />}
              </button>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 px-3 py-2 text-sm text-slate-500 hover:text-slate-700 transition"
                >
                  <IconX className="w-4 h-4" />
                  Limpar
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={refetch}
                disabled={loading}
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition disabled:opacity-50"
              >
                <IconRefresh className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 transition"
                >
                  <IconDownload className="w-4 h-4" />
                  Exportar
                  <IconChevronDown className="w-4 h-4" />
                </button>

                {showExportMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowExportMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-20">
                      <button
                        onClick={() => handleExport('csv')}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
                      >
                        Exportar como CSV
                      </button>
                      <button
                        onClick={() => handleExport('excel')}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
                      >
                        Exportar como Excel
                      </button>
                      <button
                        onClick={() => handleExport('json')}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
                      >
                        Exportar como JSON
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                  <div className="flex flex-wrap gap-2">
                    {statusOptions.map(option => (
                      <button
                        key={option.value}
                        onClick={() => toggleFilter('status', option.value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                          localFilters.status.includes(option.value)
                            ? option.color
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Plan Filter */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Plano</label>
                  <div className="flex flex-wrap gap-2">
                    {planOptions.map(option => (
                      <button
                        key={option.value}
                        onClick={() => toggleFilter('planId', option.value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                          localFilters.planId.includes(option.value)
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment Method Filter */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Método de Pagamento</label>
                  <div className="flex flex-wrap gap-2">
                    {paymentMethodOptions.map(option => (
                      <button
                        key={option.value}
                        onClick={() => toggleFilter('paymentMethod', option.value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                          localFilters.paymentMethod.includes(option.value)
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date Range Filter */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Período</label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <IconCalendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="date"
                        value={localFilters.startDate}
                        onChange={(e) => setLocalFilters(prev => ({ ...prev, startDate: e.target.value }))}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="De"
                      />
                    </div>
                    <span className="text-slate-400">-</span>
                    <div className="relative flex-1">
                      <IconCalendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="date"
                        value={localFilters.endDate}
                        onChange={(e) => setLocalFilters(prev => ({ ...prev, endDate: e.target.value }))}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Até"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={applyFilters}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 transition"
                >
                  Aplicar Filtros
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {error ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <IconX className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-1">Erro ao carregar</h3>
              <p className="text-slate-500">{error}</p>
              <button
                onClick={refetch}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 transition"
              >
                <IconRefresh className="w-4 h-4" />
                Tentar novamente
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th
                    onClick={() => handleSort('planId')}
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase cursor-pointer hover:bg-slate-100 transition select-none"
                  >
                    <div className="flex items-center gap-1">
                      Plano
                      {sortBy === 'planId' && (
                        order === 'asc' ? <IconChevronUp className="w-3 h-3" /> : <IconChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('amount')}
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase cursor-pointer hover:bg-slate-100 transition select-none"
                  >
                    <div className="flex items-center gap-1">
                      Valor
                      {sortBy === 'amount' && (
                        order === 'asc' ? <IconChevronUp className="w-3 h-3" /> : <IconChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                    Pagamento
                  </th>
                  <th
                    onClick={() => handleSort('startedAt')}
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase cursor-pointer hover:bg-slate-100 transition select-none"
                  >
                    <div className="flex items-center gap-1">
                      Início
                      {sortBy === 'startedAt' && (
                        order === 'asc' ? <IconChevronUp className="w-3 h-3" /> : <IconChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('expiresAt')}
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase cursor-pointer hover:bg-slate-100 transition select-none"
                  >
                    <div className="flex items-center gap-1">
                      Término
                      {sortBy === 'expiresAt' && (
                        order === 'asc' ? <IconChevronUp className="w-3 h-3" /> : <IconChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                    Cancelado em
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
                      </div>
                    </td>
                  </tr>
                ) : subscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <IconReceipt className="w-8 h-8 text-slate-400" />
                      </div>
                      <h3 className="text-lg font-medium text-slate-900 mb-1">
                        Nenhuma assinatura encontrada
                      </h3>
                      <p className="text-slate-500">
                        {hasActiveFilters
                          ? 'Tente ajustar os filtros para ver mais resultados'
                          : 'Suas assinaturas aparecerão aqui'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  subscriptions.map((subscription) => (
                    <tr key={subscription._id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">{subscription.planName}</span>
                          {subscription.autoRenew && subscription.status === 'active' && (
                            <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                              Renovação automática
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-900">
                          {formatCurrency(subscription.amount)}
                        </span>
                        <span className="text-slate-400 text-xs">/mês</span>
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(subscription.status)}</td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600">
                          {subscription.paymentMethod === 'credit_card' ? 'Cartão' : 'PIX'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {formatDate(subscription.startedAt)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {formatDate(subscription.expiresAt)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {subscription.cancelledAt ? (
                          <div>
                            <span>{formatDate(subscription.cancelledAt)}</span>
                            {subscription.cancellationReason && (
                              <span className="block text-xs text-slate-400 mt-0.5">
                                {subscription.cancellationReason}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!loading && !error && subscriptions.length > 0 && (
          <div className="border-t border-slate-200 px-4 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-500">
                  Mostrando <span className="font-medium text-slate-900">{subscriptions.length}</span> de{' '}
                  <span className="font-medium text-slate-900">{total}</span> assinaturas
                </span>
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={5}>5 por página</option>
                  <option value={10}>10 por página</option>
                  <option value={25}>25 por página</option>
                  <option value={50}>50 por página</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                  className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <IconChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-9 h-9 rounded-lg text-sm font-medium transition ${
                          page === pageNum
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages}
                  className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <IconChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
