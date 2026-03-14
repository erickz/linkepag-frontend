'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: 'draft' | 'pending' | 'processing' | 'paid' | 'overdue' | 'failed' | 'cancelled';
  periodStart: string;
  periodEnd: string;
  subscriptionAmount: number;
  usageAmount: number;
  totalAmount: number;
  proratingCredit: number;
  transactionCount: number;
  feePerTransaction: number;
  dueDate: string;
  paidAt?: string;
  pixCode?: string;
  pixQrCodeUrl?: string;
  planName: string;
}

interface BillingData {
  currentInvoice: Invoice | null;
  invoiceHistory: Invoice[];
  currentCycle: {
    startDate: string;
    endDate: string;
    transactionCount: number;
    totalTransactionFees: number;
  } | null;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Em preparação', color: 'text-slate-600', bg: 'bg-slate-100' },
  pending: { label: 'Aguardando pagamento', color: 'text-amber-600', bg: 'bg-amber-100' },
  processing: { label: 'Processando', color: 'text-blue-600', bg: 'bg-blue-100' },
  paid: { label: 'Pago', color: 'text-emerald-600', bg: 'bg-emerald-100' },
  overdue: { label: 'Atrasado', color: 'text-red-600', bg: 'bg-red-100' },
  failed: { label: 'Falhou', color: 'text-red-600', bg: 'bg-red-100' },
  cancelled: { label: 'Cancelado', color: 'text-slate-600', bg: 'bg-slate-100' },
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function BillingPage() {
  const router = useRouter();
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/billing/current');
      if (!response.ok) throw new Error('Erro ao carregar dados');
      const data = await response.json();
      setBillingData(data);
    } catch (err) {
      setError('Não foi possível carregar seus dados de faturamento');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyPix = (pixCode: string) => {
    navigator.clipboard.writeText(pixCode);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  const handlePayInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/billing/invoices/${invoiceId}/retry`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Erro ao processar pagamento');
      fetchBillingData(); // Recarrega dados
    } catch (err) {
      setError('Erro ao processar pagamento. Tente novamente.');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/3 mb-6"></div>
        <div className="h-64 bg-slate-200 rounded-2xl"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <p className="text-red-700">{error}</p>
          <button
            onClick={fetchBillingData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const invoice = billingData?.currentInvoice;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Faturamento</h1>
          <p className="text-slate-500">Gerencie suas faturas e pagamentos</p>
        </div>
        <button
          onClick={() => router.push('/admin/plans')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          Ver Planos
        </button>
      </div>

      {/* Fatura Atual */}
      {invoice && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="font-semibold text-slate-900">Fatura Atual</h2>
                <p className="text-sm text-slate-500">{invoice.invoiceNumber}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig[invoice.status]?.bg} ${statusConfig[invoice.status]?.color}`}>
                {statusConfig[invoice.status]?.label}
              </span>
            </div>
          </div>

          <div className="p-6">
            {/* Período */}
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Período: {formatDate(invoice.periodStart)} até {formatDate(invoice.periodEnd)}
              {invoice.dueDate && (
                <>
                  <span className="mx-2">•</span>
                  <span className={invoice.status === 'overdue' ? 'text-red-600 font-medium' : ''}>
                    Vencimento: {formatDate(invoice.dueDate)}
                  </span>
                </>
              )}
            </div>

            {/* Breakdown da Fatura */}
            <div className="bg-slate-50 rounded-xl p-6 space-y-4">
              <h3 className="font-medium text-slate-900 mb-4">Detalhamento</h3>
              
              {/* Mensalidade */}
              <div className="flex justify-between items-center py-2 border-b border-slate-200">
                <div>
                  <p className="text-slate-700">Mensalidade {invoice.planName}</p>
                  <p className="text-sm text-slate-500">Plano mensal</p>
                </div>
                <p className="font-medium text-slate-900">{formatCurrency(invoice.subscriptionAmount / 100)}</p>
              </div>

              {/* Taxas de Transação */}
              <div className="flex justify-between items-center py-2 border-b border-slate-200">
                <div>
                  <p className="text-slate-700">Taxas de Transação</p>
                  <p className="text-sm text-slate-500">
                    {invoice.transactionCount} venda{invoice.transactionCount !== 1 ? 's' : ''} × {formatCurrency(invoice.feePerTransaction / 100)}
                  </p>
                </div>
                <p className="font-medium text-slate-900">{formatCurrency(invoice.usageAmount / 100)}</p>
              </div>

              {/* Crédito de Prorating (se houver) */}
              {invoice.proratingCredit > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-slate-200">
                  <div>
                    <p className="text-emerald-700">Crédito por Upgrade</p>
                    <p className="text-sm text-emerald-600">Crédito proporcional do plano anterior</p>
                  </div>
                  <p className="font-medium text-emerald-600">-{formatCurrency(invoice.proratingCredit / 100)}</p>
                </div>
              )}

              {/* Total */}
              <div className="flex justify-between items-center pt-4">
                <p className="text-lg font-semibold text-slate-900">Total</p>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(invoice.totalAmount / 100)}</p>
              </div>
            </div>

            {/* Ações */}
            {invoice.status === 'pending' && invoice.pixCode && (
              <div className="mt-6 space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <p className="text-sm font-medium text-emerald-800 mb-2">Pague via PIX</p>
                  <div className="flex gap-3">
                    <code className="flex-1 bg-white p-3 rounded-lg text-sm break-all font-mono">
                      {invoice.pixCode}
                    </code>
                    <button
                      onClick={() => handleCopyPix(invoice.pixCode!)}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition whitespace-nowrap"
                    >
                      {copiedPix ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                </div>

                {invoice.pixQrCodeUrl && (
                  <div className="flex justify-center">
                    <img
                      src={invoice.pixQrCodeUrl}
                      alt="QR Code PIX"
                      className="w-48 h-48 rounded-xl border border-slate-200"
                    />
                  </div>
                )}
              </div>
            )}

            {invoice.status === 'overdue' && (
              <div className="mt-6">
                <button
                  onClick={() => handlePayInvoice(invoice.id)}
                  className="w-full py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition"
                >
                  Regularizar Fatura Atrasada
                </button>
              </div>
            )}

            {invoice.status === 'paid' && invoice.paidAt && (
              <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-medium text-emerald-800">Pagamento confirmado</p>
                    <p className="text-sm text-emerald-600">Pago em {formatDate(invoice.paidAt)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Ciclo Atual */}
      {billingData?.currentCycle && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Ciclo Atual</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-sm text-slate-500">Período</p>
              <p className="font-medium text-slate-900">
                {formatDate(billingData.currentCycle.startDate)} - {formatDate(billingData.currentCycle.endDate)}
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-sm text-slate-500">Vendas no período</p>
              <p className="font-medium text-slate-900">{billingData.currentCycle.transactionCount}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-sm text-slate-500">Taxas acumuladas</p>
              <p className="font-medium text-indigo-600">{formatCurrency(billingData.currentCycle.totalTransactionFees / 100)}</p>
            </div>
          </div>
        </section>
      )}

      {/* Histórico */}
      {billingData?.invoiceHistory && billingData.invoiceHistory.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Histórico de Faturas</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Fatura</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Período</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Valor</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {billingData.invoiceHistory.map((inv) => (
                  <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 text-sm">{inv.invoiceNumber}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {formatDate(inv.periodStart)}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium">
                      {formatCurrency(inv.totalAmount / 100)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusConfig[inv.status]?.bg} ${statusConfig[inv.status]?.color}`}>
                        {statusConfig[inv.status]?.label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Mensagem quando não há fatura */}
      {!invoice && !isLoading && (
        <div className="bg-slate-50 rounded-2xl p-8 text-center">
          <svg className="w-12 h-12 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="font-medium text-slate-900 mb-2">Nenhuma fatura ativa</h3>
          <p className="text-slate-500 mb-4">Você não possui faturas pendentes no momento.</p>
          <button
            onClick={() => router.push('/admin/plans')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            Ver Planos
          </button>
        </div>
      )}
    </div>
  );
}
