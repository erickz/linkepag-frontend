'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth, useProtectedRoute } from '@/hooks/useAuth';
import { getSalesReport, getPendingPayments, confirmPaymentManual } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { IconCoins, IconClock, IconCheck, IconSettings, IconRefresh, IconExternalLink, IconTrash } from '@/components/icons';

interface Payment {
  id: string;
  paymentId: string;
  amount: number;
  status: 'pending' | 'awaiting_confirmation' | 'confirmed' | 'expired' | 'failed';
  payerEmail?: string;
  payerName?: string;
  linkTitle: string;
  createdAt: string;
  confirmedAt?: string;
  receiptUrl?: string;
}

interface SalesReport {
  totalSales: number;
  totalAmount: number;
  confirmedAmount: number;
  pendingAmount: number;
  totalOrders: number;
  confirmedOrders: number;
  pendingOrders: number;
  recentPayments: Payment[];
}

type Tab = 'history' | 'pending';

export default function PaymentsPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>('history');
  const [isReady, setIsReady] = useState(false);

  // Initialize tab from URL on mount
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'pending' || tabParam === 'history') {
      setActiveTab(tabParam);
    }
    setIsReady(true);
  }, [searchParams]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    router.push(`/admin/payments?tab=${tab}`, { scroll: false });
  };
  
  // Report state
  const [report, setReport] = useState<SalesReport | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(true);
  
  // Pending state
  const [pendingPayments, setPendingPayments] = useState<Payment[]>([]);
  const [isLoadingPending, setIsLoadingPending] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedPayments, setSelectedPayments] = useState<Set<string>>(new Set());
  const [isConfirmingBulk, setIsConfirmingBulk] = useState(false);

  useProtectedRoute('/login');

  const loadReport = async () => {
    try {
      setIsLoadingReport(true);
      const data = await getSalesReport();
      if (data.success) setReport(data.report);
    } catch (err) {
      console.error('Erro ao carregar relatório:', err);
    } finally {
      setIsLoadingReport(false);
    }
  };

  const loadPending = useCallback(async () => {
    try {
      setIsLoadingPending(true);
      const data = await getPendingPayments();
      if (data.success) {
        setPendingPayments(data.payments || []);
        setSelectedPayments(new Set()); // Limpar seleção ao recarregar
      }
    } catch (err) {
      console.error('Erro ao carregar pendentes:', err);
    } finally {
      setIsLoadingPending(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadReport();
      loadPending();
    }
  }, [isAuthenticated, loadPending]);

  const handleConfirm = async (paymentId: string) => {
    if (!confirm('Confirmar este pagamento? O comprador receberá o acesso por email.')) return;
    
    try {
      setConfirmingId(paymentId);
      const response = await confirmPaymentManual(paymentId);
      if (response.success) {
        setPendingPayments(prev => prev.filter(p => p.paymentId !== paymentId));
        setSelectedPayments(prev => {
          const newSet = new Set(prev);
          newSet.delete(paymentId);
          return newSet;
        });
        loadReport();
      }
    } catch (err) {
      alert('Erro ao confirmar pagamento');
    } finally {
      setConfirmingId(null);
    }
  };

  // Toggle seleção de pagamento
  const togglePaymentSelection = (paymentId: string) => {
    setSelectedPayments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(paymentId)) {
        newSet.delete(paymentId);
      } else {
        newSet.add(paymentId);
      }
      return newSet;
    });
  };

  // Selecionar/deselecionar todos
  const toggleSelectAll = () => {
    if (selectedPayments.size === pendingPayments.length) {
      setSelectedPayments(new Set());
    } else {
      setSelectedPayments(new Set(pendingPayments.map(p => p.paymentId)));
    }
  };

  // Confirmar pagamentos em massa
  const handleBulkConfirm = async () => {
    if (selectedPayments.size === 0) return;
    
    if (!confirm(`Confirmar ${selectedPayments.size} pagamento(s)? Os compradores receberão o acesso por email.`)) return;
    
    setIsConfirmingBulk(true);
    let successCount = 0;
    let errorCount = 0;
    
    for (const paymentId of selectedPayments) {
      try {
        const response = await confirmPaymentManual(paymentId);
        if (response.success) {
          successCount++;
          setPendingPayments(prev => prev.filter(p => p.paymentId !== paymentId));
        } else {
          errorCount++;
        }
      } catch (err) {
        errorCount++;
      }
    }
    
    setSelectedPayments(new Set());
    setIsConfirmingBulk(false);
    loadReport();
    
    if (errorCount > 0) {
      alert(`${successCount} confirmado(s), ${errorCount} erro(s).`);
    } else {
      alert(`${successCount} pagamento(s) confirmado(s) com sucesso!`);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Confirmado</span>;
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>Pendente</span>;
      case 'awaiting_confirmation':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>Aguardando</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600"><span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>Expirado</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const tabs = [
    { id: 'history' as Tab, label: 'Histórico', count: report?.totalOrders || 0 },
    { id: 'pending' as Tab, label: 'Pendentes', count: pendingPayments.length },
  ];

  return (
    <div>
      <PageHeader
        title="Vendas"
        description="Gerencie seus pagamentos e confirme vendas PIX"
        breadcrumbs={[{ label: 'Vendas' }]}
        action={{
          label: 'Configurar pagamentos automatizados',
          href: '/admin/settings/payments',
          icon: <IconSettings className="w-4 h-4" />,
          variant: 'outline'
        }}
      />

      {/* Stats Cards */}
      {!isLoadingReport && report && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white">
            <p className="text-emerald-100 text-sm font-medium mb-1">Total em Vendas</p>
            <h3 className="text-2xl font-bold">{formatCurrency(report.totalSales)}</h3>
            <p className="text-emerald-100 text-xs mt-1">{report.confirmedOrders} confirmadas</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <p className="text-slate-500 text-sm font-medium mb-1">Pendente</p>
            <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(report.pendingAmount)}</h3>
            <p className="text-slate-400 text-xs mt-1">{report.pendingOrders} pagamentos</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <p className="text-slate-500 text-sm font-medium mb-1">Total de Pedidos</p>
            <h3 className="text-2xl font-bold text-slate-900">{report.totalOrders}</h3>
            <p className="text-slate-400 text-xs mt-1">Todos os pedidos</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <p className="text-slate-500 text-sm font-medium mb-1">Ticket Médio</p>
            <h3 className="text-2xl font-bold text-slate-900">
              {formatCurrency(report.confirmedOrders > 0 ? report.totalSales / report.confirmedOrders : 0)}
            </h3>
            <p className="text-slate-400 text-xs mt-1">Média por venda</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors relative ${
                  activeTab === tab.id 
                    ? 'text-indigo-600' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.id === 'history' && <IconCoins className="w-4 h-4" />}
                {tab.id === 'pending' && <IconClock className="w-4 h-4" />}
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                    activeTab === tab.id ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* History Tab */}
          {activeTab === 'history' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900">Histórico de Transações</h3>
                <button onClick={loadReport} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition">
                  <IconRefresh className="w-5 h-5" />
                </button>
              </div>
              
              {isLoadingReport ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
                </div>
              ) : report?.recentPayments?.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <IconCoins className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-1">Nenhuma transação ainda</h3>
                  <p className="text-slate-500">Suas vendas aparecerão aqui</p>
                  <Link href="/admin/links" className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 transition">
                    Criar Link
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Pedido</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Produto</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Cliente</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Valor</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {report?.recentPayments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-slate-50 transition">
                          <td className="px-4 py-3 text-sm font-medium text-slate-900">#{payment.paymentId.slice(-8)}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">{payment.linkTitle}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">{payment.payerName || 'Anônimo'}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-slate-900">{formatCurrency(payment.amount)}</td>
                          <td className="px-4 py-3">{getStatusBadge(payment.status)}</td>
                          <td className="px-4 py-3 text-sm text-slate-500">{formatDate(payment.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Pending Tab */}
          {activeTab === 'pending' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900">Pagamentos Pendentes de Confirmação</h3>
                <div className="flex items-center gap-2">
                  {selectedPayments.size > 0 && (
                    <button
                      onClick={handleBulkConfirm}
                      disabled={isConfirmingBulk}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium text-sm hover:bg-emerald-700 transition disabled:opacity-50"
                    >
                      {isConfirmingBulk ? (
                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Confirmando...</>
                      ) : (
                        <><IconCheck className="w-4 h-4" />Confirmar {selectedPayments.size} selecionado(s)</>
                      )}
                    </button>
                  )}
                  <button onClick={loadPending} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition">
                    <IconRefresh className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {isLoadingPending ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
                </div>
              ) : pendingPayments.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <IconCheck className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-1">Nenhum pagamento pendente</h3>
                  <p className="text-slate-500">Quando alguém pagar via PIX Direto, aparecerá aqui</p>
                </div>
              ) : (
                <div>
                  {/* Barra de seleção em massa */}
                  <div className="flex items-center gap-3 mb-4 p-3 bg-slate-50 rounded-lg">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={selectedPayments.size === pendingPayments.length && pendingPayments.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm font-medium text-slate-700">
                        {selectedPayments.size === 0 
                          ? 'Selecionar todos' 
                          : `${selectedPayments.size} selecionado(s)`}
                      </span>
                    </label>
                    {selectedPayments.size > 0 && (
                      <button
                        onClick={() => setSelectedPayments(new Set())}
                        className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
                      >
                        <IconTrash className="w-3 h-3" /> Limpar seleção
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pendingPayments.map((payment) => (
                      <div 
                        key={payment.paymentId} 
                        className={`bg-white rounded-xl border p-4 transition ${
                          selectedPayments.has(payment.paymentId) 
                            ? 'border-indigo-500 ring-1 ring-indigo-500' 
                            : 'border-slate-200 hover:border-indigo-300'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedPayments.has(payment.paymentId)}
                              onChange={() => togglePaymentSelection(payment.paymentId)}
                              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                              Aguardando
                            </span>
                          </div>
                          <span className="text-lg font-bold text-slate-900">{formatCurrency(payment.amount)}</span>
                        </div>
                        
                        <div className="space-y-2 mb-4">
                          <div>
                            <p className="text-xs text-slate-500">Comprador</p>
                            <p className="text-sm font-medium text-slate-900">{payment.payerName || 'Não informado'}</p>
                            <p className="text-xs text-slate-600">{payment.payerEmail}</p>
                          </div>
                          {payment.receiptUrl && (
                            <div>
                              <p className="text-xs text-slate-500">Comprovante</p>
                              <button
                                onClick={() => setPreviewImage(payment.receiptUrl || null)}
                                className="relative w-full h-20 rounded-lg overflow-hidden border border-slate-200 hover:border-indigo-500 transition"
                              >
                                <img src={payment.receiptUrl} alt="Comprovante" className="w-full h-full object-cover" />
                              </button>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => handleConfirm(payment.paymentId)}
                          disabled={confirmingId === payment.paymentId}
                          className="w-full px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-medium text-sm hover:bg-emerald-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {confirmingId === payment.paymentId ? (
                            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Confirmando...</>
                          ) : (
                            <><IconCheck className="w-4 h-4" />Confirmar pagamento</>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}


        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-4xl max-h-[90vh]">
            <button onClick={() => setPreviewImage(null)} className="absolute -top-12 right-0 text-white hover:text-slate-300 transition">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <img src={previewImage} alt="Comprovante" className="max-w-full max-h-[85vh] rounded-lg" onClick={(e) => e.stopPropagation()} />
          </div>
        </div>
      )}
    </div>
  );
}
