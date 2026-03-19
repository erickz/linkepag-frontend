'use client';

import { initMercadoPago, Payment } from '@mercadopago/sdk-react';
import { useEffect, useState } from 'react';

interface PaymentBrickProps {
  amount: number;
  payerEmail: string;
  payerName?: string;
  onPaymentGenerated: (paymentData: {
    id: string;
    pixCode: string;
    qrCodeUrl: string;
    status: string;
  }) => void;
  onError: (error: string) => void;
  onReady?: () => void;
  isProcessing?: boolean;
}

const MERCADOPAGO_PUBLIC_KEY = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || '';

export function PaymentBrick({
  amount,
  payerEmail,
  payerName,
  onPaymentGenerated,
  onError,
  onReady,
  isProcessing = false,
}: PaymentBrickProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  // Inicializar o SDK do MercadoPago
  useEffect(() => {
    if (!MERCADOPAGO_PUBLIC_KEY) {
      setInitializationError('Chave pública do MercadoPago não configurada');
      return;
    }

    try {
      initMercadoPago(MERCADOPAGO_PUBLIC_KEY, {
        locale: 'pt-BR',
      });
      setIsInitialized(true);
    } catch (err) {
      console.error('[PaymentBrick] Error initializing SDK:', err);
      setInitializationError('Erro ao inicializar SDK do MercadoPago');
    }
  }, []);

  // Separar nome em firstName e lastName
  const [firstName, ...lastNameParts] = (payerName || 'Cliente').split(' ');
  const lastName = lastNameParts.join(' ') || '';

  // Configuração do Brick
  const initialization = {
    amount: amount,
    payer: {
      email: payerEmail,
      firstName: firstName,
      lastName: lastName,
    },
  };

  // Configuração do Brick - Apenas PIX
  // Usamos 'as any' porque o tipo do SDK é muito restritivo
  const customization = {
    paymentMethods: {
      types: {
        excluded: ['credit_card', 'debit_card', 'ticket', 'bank_transfer'],
      },
    },
    visual: {
      style: {
        theme: 'default' as const,
        customVariables: {
          formBackgroundColor: '#ffffff',
          baseColor: '#4f46e5', // indigo-600
          textColor: '#0f172a',
          errorColor: '#e11d48',
          successColor: '#059669',
          borderRadius: '0.5rem',
        },
      },
    },
  } as any;

  const onSubmit = async (
    formData: any,
    nativeResponse: any
  ) => {
    try {
      // O nativeResponse contém os dados do pagamento criado
      const { id, qr_code, qr_code_base64 } = nativeResponse;

      if (!id || !qr_code) {
        throw new Error('Dados do PIX não recebidos corretamente');
      }

      onPaymentGenerated({
        id,
        pixCode: qr_code,
        qrCodeUrl: qr_code_base64 ? `data:image/png;base64,${qr_code_base64}` : '',
        status: 'pending',
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao gerar PIX';
      onError(errorMsg);
      throw err; // Re-throw para o brick saber que falhou
    }
  };

  const onErrorCallback = (error: any) => {
    console.error('[PaymentBrick] Error:', error);
    onError(error?.message || 'Erro no formulário de pagamento');
  };

  const onReadyCallback = () => {
    onReady?.();
  };

  // Estado de loading
  if (!isInitialized) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex flex-col items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-sm text-slate-600">Inicializando formulário de pagamento...</p>
        </div>
      </div>
    );
  }

  // Estado de erro
  if (initializationError) {
    return (
      <div className="bg-white rounded-xl border border-rose-200 p-6">
        <div className="flex flex-col items-center justify-center py-6">
          <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-rose-700 font-medium text-center">{initializationError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <Payment
        initialization={initialization}
        customization={customization}
        onSubmit={onSubmit}
        onError={onErrorCallback}
        onReady={onReadyCallback}
      />

      {/* Indicador de processamento */}
      {isProcessing && (
        <div className="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-600"></div>
            <p className="text-sm text-indigo-700">Processando pagamento...</p>
          </div>
        </div>
      )}

      {/* Selo de segurança */}
      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span>Pagamento processado de forma segura pelo MercadoPago</span>
      </div>
    </div>
  );
}
