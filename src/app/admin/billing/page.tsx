'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth, useProtectedRoute } from '@/hooks/useAuth';
import { AdminLayout } from '@/components/AdminLayout';
import { PageHeader } from '@/components/PageHeader';
import { 
  IconCoins, 
  IconTrendingUp, 
  IconReceipt, 
  IconAlertCircle,
  IconCalendar,
  IconCreditCard,
  IconRefresh,
  IconFileText,
  IconChevronLeft,
  IconChevronRight,
  IconInfoCircle
} from '@/components/icons';
import { 
  getBillingSummary, 
  getFeeReport, 
  generateInvoice, 
  getCurrentInvoice,
  getUserFees,
  type BillingSummary,
  type FeeReport,
  type CurrentInvoice
} from '@/lib/api';

interface Fee {
  _id: string;
  amount: number;
  status: string;
  description: string;
  createdAt: string;
  paidAt?: string;
  transactionAmount?: number;
  paymentId?: {
    paymentId: string;
    amount: number;
    payerEmail?: string;
    payerName?: string;
  };
}

export default function BillingPage() {
  const { isAuthenticated } = useAuth();
  useProtectedRoute('/login');

  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [report, setReport] = useState<FeeReport | null>(null);
  const [currentInvoice, setCurrentInvoice] = useState<CurrentInvoice | null>(null);
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return '-';
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(date));
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [summaryData, reportData, invoiceData, feesData] = await Promise.all([
        getBillingSummary(),
        getFeeReport(),
        getCurrentInvoice(),
        getUserFees(page, 10)
      ]);
      
      setSummary(summaryData);
      setReport(reportData);
      setCurrentInvoice(invoiceData);
      setFees(feesData.fees);
      setTotalPages(feesData.totalPages);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados de cobrança');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, loadData]);

  const handleGenerateInvoice = async () => {
    try {
      setGeneratingInvoice(true);
      await generateInvoice();
      alert('Fatura gerada com sucesso! Verifique seu email.');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao gerar fatura');
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      waived: 'bg-gray-100 text-gray-800',
      invoiced: 'bg-blue-100 text-blue-800',
    };
    const labels: Record<string, string> = {
      pending: 'Pendente',
      paid: 'Pago',
      waived: 'Isento',
      invoiced: 'Faturado',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <PageHeader 
            title="Cobranças e Taxas"
            subtitle="Gerencie suas taxas de transação e faturas"
          />
          <button 
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <IconRefresh className="w-4 h-4" />
            Atualizar
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 text-gray-600 text-sm font-medium mb-2">
              <IconAlertCircle className="w-4 h-4" />
              Saldo Devedor
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(summary?.feeBalance || 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Taxas a pagar</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 text-gray-600 text-sm font-medium mb-2">
              <IconCoins className="w-4 h-4" />
              Total Pago
            </div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary?.totalFeesPaid || 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Em taxas de transação</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 text-gray-600 text-sm font-medium mb-2">
              <IconTrendingUp className="w-4 h-4" />
              Taxas do Período
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(report?.totalTransactionFees || 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Total de taxas acumuladas</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 text-gray-600 text-sm font-medium mb-2">
              <IconReceipt className="w-4 h-4" />
              Fatura Atual
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(currentInvoice?.totalFees || 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {currentInvoice?.transactionCount || 0} transações
            </p>
          </div>
        </div>

        {/* Current Invoice Section */}
        {(currentInvoice && currentInvoice.totalFees > 0) || summary?.feeBalance ? (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-center gap-2 text-blue-900 font-semibold mb-4">
              <IconFileText className="w-5 h-5" />
              Fatura Pendente
            </div>
            
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-sm text-gray-700">
                  Você tem <strong>{formatCurrency(summary?.feeBalance || 0)}</strong> em taxas pendentes
                  {currentInvoice?.transactionCount ? ` (${currentInvoice.transactionCount} transações)` : ''}
                </p>
                {currentInvoice?.dueDate && (
                  <p className="text-sm text-gray-500 mt-1">
                    Vencimento: {formatDate(currentInvoice.dueDate)}
                  </p>
                )}
              </div>
              <button 
                onClick={handleGenerateInvoice}
                disabled={generatingInvoice}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generatingInvoice ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <IconCreditCard className="w-4 h-4" />
                    Gerar Fatura (PIX)
                  </>
                )}
              </button>
            </div>

            {/* QR Code da Fatura */}
            {currentInvoice?.qrCodeUrl && (
              <div className="mt-6 p-4 bg-white rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Escaneie o QR Code para pagar:
                </p>
                <div className="flex flex-col items-center gap-4">
                  <img 
                    src={currentInvoice.qrCodeUrl} 
                    alt="QR Code PIX"
                    className="w-48 h-48"
                  />
                  {currentInvoice.pixCode && (
                    <div className="w-full">
                      <p className="text-xs text-gray-500 mb-1">Ou copie o código PIX:</p>
                      <code className="block w-full p-2 bg-gray-100 rounded text-xs break-all">
                        {currentInvoice.pixCode}
                      </code>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Transactions Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Histórico de Taxas</h2>
          </div>
          
          <div className="overflow-x-auto">
            {fees.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <IconReceipt className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Nenhuma taxa registrada ainda.</p>
                <p className="text-sm">As taxas aparecerão aqui quando você receber pagamentos.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Data</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Transação</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Valor</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Taxa</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Líquido</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {fees.map((fee) => (
                    <tr key={fee._id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <IconCalendar className="w-4 h-4 text-gray-400" />
                          {formatDate(fee.createdAt)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900">
                            {fee.paymentId?.payerName || 'Cliente'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {fee.paymentId?.payerEmail || fee.description}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        {formatCurrency(fee.transactionAmount || 0)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-red-600">
                          -{formatCurrency(fee.amount)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-green-600">
                        {formatCurrency((fee.transactionAmount || 0) - fee.amount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {getStatusBadge(fee.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Página {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                >
                  <IconChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                >
                  <IconChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-2 text-gray-700 font-medium mb-3">
            <IconInfoCircle className="w-5 h-5" />
            Como funcionam as taxas?
          </div>
          <div className="text-sm text-gray-600 space-y-2">
            <p>
              <strong>MercadoPago:</strong> A taxa é retida automaticamente no momento do pagamento. 
              Você recebe o valor líquido diretamente na sua conta.
            </p>
            <p>
              <strong>PIX Direto:</strong> Você recebe o valor integral na sua conta. 
              As taxas acumulam no seu saldo devedor e são cobradas via fatura mensal (PIX da LinkePag).
            </p>
            <p>
              <strong>Taxas por plano:</strong> Starter R$ 0,70 | Creator R$ 0,50 | Pro R$ 0,35 | Ilimitado R$ 0,20
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
