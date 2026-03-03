'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from '@/components/Logo';
import { getCurrentSubscription, apiCache } from '@/lib/api';

const PLANS = {
  1: { name: 'Grátis', monthlyPrice: 0, feePerTransaction: 0.70 },
  2: { name: 'Creator', monthlyPrice: 19.90, feePerTransaction: 0.50 },
  3: { name: 'Pro', monthlyPrice: 49.90, feePerTransaction: 0.35 },
  4: { name: 'Ilimitado', monthlyPrice: 99.90, feePerTransaction: 0.20 },
};

function CheckoutContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const planId = parseInt(searchParams.get('plan') || '2');
  const pixCode = searchParams.get('pixCode') || '';
  const qrCode = searchParams.get('qrCode') || '';
  const expiresAt = searchParams.get('expires') || '';
  
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');

  const plan = PLANS[planId as keyof typeof PLANS];

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login?redirect=/plans');
      return;
    }

    if (!pixCode) {
      router.push('/plans');
      return;
    }
  }, [isLoading, isAuthenticated, router, pixCode]);

  useEffect(() => {
    if (!expiresAt) return;

    const expirationDate = new Date(expiresAt);
    
    const updateTimer = () => {
      const now = new Date();
      const diff = expirationDate.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeLeft('Expirado');
        return;
      }

      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      
      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes.toString().padStart(2, '0')}min`);
      } else {
        setTimeLeft(`${minutes} minutos`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleCopyPixCode = () => {
    navigator.clipboard.writeText(pixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePaymentComplete = () => {
    // Invalidate profile cache to refresh plan status
    apiCache.invalidate('profile');
    router.push('/admin/dashboard?success=subscription');
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Plano não encontrado</p>
          <Link href="/plans" className="text-indigo-600 hover:underline">
            Voltar para planos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/plans" className="inline-flex items-center gap-2 text-slate-600 hover:text-indigo-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar
          </Link>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Pagamento via PIX
          </h1>
          <p className="text-slate-600">
            Assinatura do plano <strong>{plan.name}</strong>
          </p>
        </div>

        {/* Payment Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          {/* Amount */}
          <div className="bg-indigo-600 text-white p-6 text-center">
            <p className="text-indigo-200 text-sm mb-1">Valor da assinatura</p>
            <p className="text-3xl font-bold">
              R$ {plan.monthlyPrice.toFixed(2)}
            </p>
            <p className="text-indigo-200 text-sm mt-1">
              + R$ {plan.feePerTransaction.toFixed(2)} por venda
            </p>
          </div>

          {/* QR Code */}
          <div className="p-6">
            <div className="bg-slate-50 rounded-xl p-6 mb-6">
              {qrCode ? (
                <img
                  src={qrCode}
                  alt="QR Code PIX"
                  className="w-48 h-48 mx-auto"
                />
              ) : (
                <div className="w-48 h-48 mx-auto bg-slate-200 rounded-lg flex items-center justify-center">
                  <span className="text-slate-400">QR Code</span>
                </div>
              )}
            </div>

            {/* Timer */}
            <div className="text-center mb-6">
              <p className="text-sm text-slate-500 mb-1">Expira em:</p>
              <p className={`text-2xl font-mono font-bold ${timeLeft === 'Expirado' ? 'text-rose-500' : 'text-slate-900'}`}>
                {timeLeft}
              </p>
            </div>

            {/* PIX Code */}
            <div className="mb-6">
              <p className="text-sm text-slate-500 mb-2 text-center">
                Ou copie o código PIX:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={pixCode}
                  readOnly
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600"
                />
                <button
                  onClick={handleCopyPixCode}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition flex items-center gap-2"
                >
                  {copied ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copiado
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                      Copiar
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-slate-50 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-slate-900 mb-3">Como pagar:</h3>
              <ol className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-indigo-600">1.</span>
                  Abra o app do seu banco
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-indigo-600">2.</span>
                  Escaneie o QR code ou cole o código PIX
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-indigo-600">3.</span>
                  Confirme o pagamento
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-indigo-600">4.</span>
                  Seu plano será ativado automaticamente
                </li>
              </ol>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={handlePaymentComplete}
                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition"
              >
                Já fiz o pagamento
              </button>
            </div>
          </div>
        </div>

        {/* Security Note */}
        <p className="text-center text-xs text-slate-400 mt-6">
          Pagamento processado com segurança pelo MercadoPago
        </p>
      </main>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
