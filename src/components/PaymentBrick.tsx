'use client';

import { useEffect, useRef, useState } from 'react';

// Types para o MercadoPago Brick
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

// Estender o tipo do Window para incluir o paymentBrickController
declare global {
  interface Window {
    paymentBrickController?: {
      unmount: () => void;
    };
  }
}

// Estender a interface MercadoPagoInstance do useMercadoPago
interface ExtendedMercadoPagoInstance {
  bricks: () => Promise<BricksController>;
}

interface BricksController {
  create: (
    brick: string,
    containerId: string,
    settings: BrickSettings
  ) => Promise<{ unmount: () => void }>;
}

interface BrickSettings {
  initialization: {
    amount: number;
    preferenceId?: string;
    payer?: {
      email: string;
      firstName?: string;
      lastName?: string;
    };
  };
  callbacks: {
    onReady?: () => void;
    onError?: (error: BrickError) => void;
    onSubmit: (formData: BrickFormData) => Promise<void>;
  };
  locale?: string;
  customization?: {
    visual?: {
      style?: {
        theme?: 'default' | 'dark' | 'bootstrap' | 'flat';
        customStyles?: Record<string, string>;
      };
    };
    paymentMethods?: {
      // Lista explícita de métodos - apenas PIX
      types?: { id: 'pix' }[];
    };
  };
}

interface BrickError {
  type: string;
  message: string;
}

interface BrickFormData {
  // Dados para cartão
  token?: string;
  issuer_id?: string;
  payment_method_id?: string;
  installments?: number;
  // Dados para PIX
  id?: string;
  qr_code?: string;
  qr_code_base64?: string;
  // Dados comuns
  transaction_amount: number;
  payer: {
    email: string;
    first_name?: string;
    last_name?: string;
    identification?: {
      type: string;
      number: string;
    };
  };
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
  const [isLoading, setIsLoading] = useState(true);
  const [brickError, setBrickError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const brickControllerRef = useRef<{ unmount: () => void } | null>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    // Evitar inicialização dupla
    if (isInitializedRef.current) return;

    const initializeBrick = async () => {
      // Aguardar um pouco para garantir que o DOM está pronto
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verificar se o container existe no DOM
      const container = document.getElementById('payment-brick-container');
      if (!container) {
        console.error('[PaymentBrick] Container não encontrado, tentando novamente...');
        // Tentar novamente após mais um delay
        await new Promise(resolve => setTimeout(resolve, 200));
        const retryContainer = document.getElementById('payment-brick-container');
        if (!retryContainer) {
          setBrickError('Erro ao carregar formulário de pagamento. Tente novamente.');
          setIsLoading(false);
          return;
        }
      }
      
      // Marcar como inicializado
      isInitializedRef.current = true;
      try {
        // Aguardar o SDK do MercadoPago estar disponível
        if (!window.MercadoPago) {
          throw new Error('SDK do MercadoPago não carregado');
        }

        if (!MERCADOPAGO_PUBLIC_KEY) {
          throw new Error('Chave pública do MercadoPago não configurada');
        }

        // Inicializar instância do MercadoPago
        const mp = new window.MercadoPago(MERCADOPAGO_PUBLIC_KEY, {
          locale: 'pt-BR',
        });

        // Obter controller dos bricks (cast para o tipo estendido)
        const bricksController = await (mp as unknown as ExtendedMercadoPagoInstance).bricks();

        // Separar nome em firstName e lastName
        const [firstName, ...lastNameParts] = (payerName || 'Cliente').split(' ');
        const lastName = lastNameParts.join(' ') || '';

        // Criar o Payment Brick configurado apenas para PIX
        const settings: BrickSettings = {
          initialization: {
            amount: amount,
            payer: {
              email: payerEmail,
              firstName: firstName,
              lastName: lastName,
            },
          },
          callbacks: {
            onReady: () => {
              setIsLoading(false);
              onReady?.();
            },
            onError: (error) => {
              console.error('[PaymentBrick] Error:', error);
              setBrickError(error.message || 'Erro no formulário de pagamento');
              onError(error.message || 'Erro no formulário de pagamento');
            },
            onSubmit: async (formData) => {
              try {
                // Para PIX, o formData contém os dados do pagamento criado
                // Incluindo id, qr_code, qr_code_base64
                const { id, qr_code, qr_code_base64 } = formData;
                
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
            },
          },
          locale: 'pt-BR',
          customization: {
            visual: {
              style: {
                theme: 'default',
                customStyles: {
                  // Cores que combinam com o tema do LinkePag
                  '--payment-form-background-color': '#ffffff',
                  '--payment-form-text-color': '#0f172a',
                  '--payment-form-primary-color': '#4f46e5', // indigo-600
                  '--payment-form-secondary-color': '#6366f1', // indigo-500
                  '--payment-form-error-color': '#e11d48', // rose-600
                  '--payment-form-success-color': '#059669', // emerald-600
                  '--payment-form-border-radius': '0.5rem',
                  '--payment-form-font-family': 'inherit',
                },
              },
            },
            paymentMethods: {
              // Apenas PIX - conforme solicitado para aprovação do MP
              types: [{ id: 'pix' }],
            },
          },
        };

        brickControllerRef.current = await bricksController.create(
          'payment',
          'payment-brick-container',
          settings
        );
      } catch (err) {
        console.error('[PaymentBrick] Initialization error:', err);
        const errorMsg = err instanceof Error ? err.message : 'Erro ao inicializar formulário';
        setBrickError(errorMsg);
        setIsLoading(false);
        onError(errorMsg);
      }
    };

    // Aguardar um pouco para garantir que o SDK está carregado
    const timer = setTimeout(() => {
      initializeBrick();
    }, 500);

    return () => {
      clearTimeout(timer);
      // Cleanup: desmontar o brick quando o componente unmount
      if (brickControllerRef.current) {
        brickControllerRef.current.unmount();
        brickControllerRef.current = null;
      }
      isInitializedRef.current = false;
    };
  }, [amount, onPaymentGenerated, onError, onReady]);

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex flex-col items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-sm text-slate-600">Carregando formulário seguro...</p>
          <p className="text-xs text-slate-400 mt-1">MercadoPago Payment Brick</p>
        </div>
      </div>
    );
  }

  // Error state
  if (brickError) {
    return (
      <div className="bg-white rounded-xl border border-rose-200 p-6">
        <div className="flex flex-col items-center justify-center py-6">
          <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-rose-700 font-medium text-center">{brickError}</p>
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
      {/* Container do Brick - o MercadoPago vai renderizar aqui */}
      <div 
        id="payment-brick-container" 
        ref={containerRef}
        className="min-h-[400px]"
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
