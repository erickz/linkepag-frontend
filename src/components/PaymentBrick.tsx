'use client';

import { useEffect, useRef, useState } from 'react';

export type PaymentMethodType = 'pix' | 'credit_card' | 'debit_card' | string;

export interface PaymentGeneratedData {
  id: string;
  type: PaymentMethodType;
  status: 'pending' | 'approved' | 'in_process' | string;
  pixCode?: string;
  qrCodeUrl?: string;
}

interface PaymentBrickProps {
  amount: number;
  payerEmail: string;
  payerName?: string;
  onPaymentGenerated: (paymentData: PaymentGeneratedData) => void;
  onError: (error: string) => void;
  onReady?: () => void;
}

const MERCADOPAGO_PUBLIC_KEY = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || '';

// Contador global para IDs únicos
let brickInstanceCount = 0;

export function PaymentBrick({
  amount,
  payerEmail,
  payerName,
  onPaymentGenerated,
  onError,
  onReady,
}: PaymentBrickProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const brickControllerRef = useRef<any>(null);
  const instanceId = useRef(++brickInstanceCount);
  const containerId = `mercadopago-brick-container-${instanceId.current}`;

  useEffect(() => {
    const initializeBrick = async () => {
      try {
        // Aguardar o SDK estar disponível
        let attempts = 0;
        const maxAttempts = 100;
        
        while (!(window as any).MercadoPago && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 50));
          attempts++;
        }

        if (!(window as any).MercadoPago) {
          throw new Error('SDK do MercadoPago não carregado');
        }

        if (!MERCADOPAGO_PUBLIC_KEY) {
          throw new Error('Chave pública não configurada');
        }

        // Inicializar MercadoPago
        const mp = new (window as any).MercadoPago(MERCADOPAGO_PUBLIC_KEY, {
          locale: 'pt-BR',
        });

        // Aguardar container estar no DOM
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const container = document.getElementById(containerId);
        if (!container) {
          throw new Error('Container não encontrado');
        }

        // Criar o Payment Brick
        const bricksBuilder = await mp.bricks();
        
        brickControllerRef.current = await bricksBuilder.create(
          'payment',
          containerId,
          {
            initialization: {
              amount: amount,
              payer: {
                email: payerEmail,
                firstName: payerName?.split(' ')[0] || 'Cliente',
                lastName: payerName?.split(' ').slice(1).join(' ') || '',
              },
            },
            customization: {
              visual: {
                style: {
                  theme: 'default',
                  customVariables: {
                    baseColor: '#4f46e5',
                    formBackgroundColor: '#ffffff',
                    borderRadius: '8px',
                  },
                },
              },
              paymentMethods: {
                // Todos os métodos disponíveis
                creditCard: 'all',
                debitCard: 'all',
                pix: 'all',
              },
            },
            callbacks: {
              onReady: () => {
                console.log('[PaymentBrick] Brick pronto');
                setIsLoading(false);
                onReady?.();
              },
              onSubmit: async (formData: any) => {
                console.log('[PaymentBrick] Pagamento submetido:', formData);
                
                // O formData contém os dados do pagamento
                const { paymentMethodId, ...rest } = formData;
                
                // Retornar os dados para o componente pai
                // O processamento real é feito pelo backend via webhook
                onPaymentGenerated({
                  id: formData.id || `pending-${Date.now()}`,
                  type: paymentMethodId || 'unknown',
                  status: 'pending',
                });

                // Retornar Promise para o brick
                return new Promise((resolve) => {
                  resolve({});
                });
              },
              onError: (errorData: any) => {
                console.error('[PaymentBrick] Erro:', errorData);
                const errorMsg = errorData?.message || 'Erro no processamento do pagamento';
                setError(errorMsg);
                onError(errorMsg);
              },
            },
          }
        );
      } catch (err: any) {
        console.error('[PaymentBrick] Erro de inicialização:', err);
        setError(err.message || 'Erro ao carregar formulário de pagamento');
        setIsLoading(false);
      }
    };

    initializeBrick();

    // Cleanup
    return () => {
      if (brickControllerRef.current && brickControllerRef.current.unmount) {
        try {
          brickControllerRef.current.unmount();
        } catch (e) {
          // Ignorar erro de cleanup
        }
      }
    };
  }, [amount, payerEmail, payerName, onPaymentGenerated, onError, onReady, containerId]);

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-rose-200 p-6">
        <div className="flex flex-col items-center justify-center py-6">
          <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-rose-700 font-medium text-center">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm hover:bg-rose-700 transition"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-sm text-slate-600">Carregando formulário de pagamento...</p>
        </div>
      )}
      
      {/* Container do Brick */}
      <div 
        id={containerId}
        ref={containerRef}
        className={isLoading ? 'hidden' : ''}
      />

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
