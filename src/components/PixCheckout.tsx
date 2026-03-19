'use client';

import { useState, useEffect, useRef } from 'react';
import { createPayment, createPixDirectPayment, uploadReceipt, checkPaymentStatus } from '@/lib/api';
import { useMercadoPago } from '@/hooks/useMercadoPago';
import { formatPrice } from '@/lib/masks';

interface PixCheckoutProps {
  linkId: string;
  title: string;
  price: number;
  onClose: () => void;
  onSuccess: (accessToken: string, linkUrl: string) => void;
  mercadoPagoPublicKey?: string;
  mercadoPagoConfigured?: boolean;
  // PIX direct payment options
  pixConfigured?: boolean;
  pixKey?: string;
  pixKeyType?: string;
  pixQRCodeImage?: string;
}

type PaymentStatus = 'idle' | 'creating' | 'pending' | 'awaiting_confirmation' | 'confirming' | 'confirmed' | 'expired' | 'error';

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

// Validações de segurança
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

export default function PixCheckout({ 
  linkId, 
  title, 
  price, 
  onClose, 
  onSuccess,
  mercadoPagoConfigured,
  pixConfigured,
  pixKey,
  pixKeyType,
  pixQRCodeImage,
}: PixCheckoutProps) {
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [pixCode, setPixCode] = useState<string>('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [lastCheckMessage, setLastCheckMessage] = useState<string | null>(null);
  const [email, setEmail] = useState<string>('');
  const [name, setName] = useState<string>('');
  
  // Upload de comprovante
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [receiptUrl, setReceiptUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const lastCheckRef = useRef<number>(0);
  const DEBOUNCE_MS = 2000; // 2 segundos entre cliques

  const { getDeviceId } = useMercadoPago();

  // Determina qual método de pagamento usar
  // Regra: MercadoPago tem prioridade se ambos estiverem configurados
  const isPixDirect = !mercadoPagoConfigured && pixConfigured;

  const handleCreatePayment = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!email) {
      setError('Por favor, informe seu email para receber a confirmação do pagamento');
      return;
    }

    if (!name.trim()) {
      setError('Por favor, informe seu nome');
      return;
    }

    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Por favor, informe um email válido');
      return;
    }

    setStatus('creating');
    setError(null);
    setLastCheckMessage(null);

    try {
      console.log('Creating payment for link:', linkId, 'isPixDirect:', isPixDirect);
      
      // Obter deviceId do MercadoPago para análise antifraude
      const deviceId = getDeviceId() || undefined;
      console.log('Device ID:', deviceId);
      
      const response = isPixDirect 
        ? await createPixDirectPayment(linkId, { email, name: name.trim(), deviceId })
        : await createPayment(linkId, { email, name: name.trim(), deviceId });
      
      console.log('Payment response:', response);
      
      if (!response.success) {
        throw new Error(response.error || 'Erro ao criar pagamento');
      }

      const payment = response.payment;

      if (!payment?.paymentId || !payment?.pixCode) {
        throw new Error('Dados de pagamento inválidos');
      }

      setPaymentId(payment.paymentId);
      setPixCode(payment.pixCode);
      setQrCodeUrl(payment.qrCodeUrl || '');

      if (payment.expiresAt) {
        setExpiresAt(new Date(payment.expiresAt));
      }

      // PIX Direto vai para status especial
      if (isPixDirect) {
        setStatus('awaiting_confirmation');
      } else {
        setStatus('pending');
      }
    } catch (err: any) {
      console.error('Payment creation error:', err);
      setError(err.message || 'Erro ao criar pagamento');
      setStatus('idle');
    }
  };

  // Timer para MercadoPago
  useEffect(() => {
    if (!expiresAt || isPixDirect) return;

    const updateTimer = () => {
      const now = new Date();
      const diff = expiresAt.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('00:00');
        if (status === 'pending' || status === 'confirming') {
          setStatus('expired');
        }
        return;
      }

      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      
      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes.toString().padStart(2, '0')}min`);
      } else {
        setTimeRemaining(`${minutes} min`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, status, isPixDirect]);

  const handleCheckPayment = async () => {
    const now = Date.now();
    if (now - lastCheckRef.current < DEBOUNCE_MS) {
      return;
    }

    if (!paymentId) return;

    lastCheckRef.current = now;
    setIsCheckingPayment(true);
    setError(null);
    setLastCheckMessage(null);

    // Delay de 2-4s para dar tempo do webhook processar no backend
    const delayMs = Math.floor(Math.random() * 2000) + 2000; // 2-4s aleatório
    await new Promise(resolve => setTimeout(resolve, delayMs));

    try {
      const response = await checkPaymentStatus(paymentId);

      if (response.status === 'confirmed') {
        setStatus('confirmed');
        
        // Aguarda 2 segundos para mostrar a mensagem de sucesso antes de redirecionar
        setTimeout(() => {
          if (response.linkUrl && response.accessToken) {
            onSuccess(response.accessToken, response.linkUrl);
          } else if (response.linkUrl) {
            onSuccess(paymentId, response.linkUrl);
          }
        }, 2000);
      } else if (response.status === 'expired') {
        setStatus('expired');
      } else {
        setLastCheckMessage('Pagamento ainda não confirmado. Aguarde alguns segundos e tente novamente.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao verificar status');
    } finally {
      setIsCheckingPayment(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('Erro ao copiar código');
    }
  };

  const handleGenerateNew = async () => {
    setStatus('idle');
    setPaymentId(null);
    setPixCode('');
    setQrCodeUrl('');
    setExpiresAt(null);
    setTimeRemaining('');
    setError(null);
    setLastCheckMessage(null);
    setName('');
    setUploadStatus('idle');
    setReceiptUrl('');
    lastCheckRef.current = 0;
  };

  // Função para comprimir imagem
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Erro ao processar imagem'));
            return;
          }

          // Dimensionamento proporcional (max 1200px de largura)
          let width = img.width;
          let height = img.height;
          const maxWidth = 1200;
          
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          // Compressão com qualidade 0.8
          const compressed = canvas.toDataURL('image/jpeg', 0.8);
          resolve(compressed);
        };
        img.onerror = () => reject(new Error('Erro ao carregar imagem'));
        img.src = event.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !paymentId) return;

    // Validação de tamanho
    if (file.size > MAX_FILE_SIZE) {
      setError('O arquivo é muito grande. Tamanho máximo: 5MB');
      setUploadStatus('error');
      return;
    }

    // Validação de tipo
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Tipo de arquivo não permitido. Use: JPG, PNG ou WebP');
      setUploadStatus('error');
      return;
    }

    setUploadStatus('uploading');
    setError(null);

    try {
      const compressedImage = await compressImage(file);
      setReceiptUrl(compressedImage);
      
      const response = await uploadReceipt(paymentId, compressedImage);
      
      if (response.success) {
        setUploadStatus('success');
      } else {
        throw new Error(response.error || 'Erro ao enviar comprovante');
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Erro ao enviar comprovante');
      setUploadStatus('error');
    }
  };

  // Renderiza o QR Code
  const renderQRCode = () => {
    if (!qrCodeUrl) {
      return (
        <div className="w-48 h-48 bg-slate-100 rounded-xl flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
      );
    }

    return (
      <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200">
        <img 
          src={qrCodeUrl} 
          alt="QR Code PIX" 
          className="w-48 h-48 object-contain"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>
    );
  };

  // Renderiza o estado de pagamento criado (pendente)
  const renderPendingPayment = () => {
    if (isPixDirect) {
      // Layout específico para PIX Direto
      return (
        <>
          {/* Status message */}
          {lastCheckMessage && (
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-700 text-xs">{lastCheckMessage}</p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-3 p-3 bg-rose-50 border border-rose-200 rounded-lg">
              <p className="text-rose-700 text-xs">{error}</p>
            </div>
          )}

          {/* Mensagem informativa */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-4 mb-4">
            <p className="text-sm text-amber-800">
              <span className="font-medium">⏳ Envie o pagamento no valor de <b>R$ {formatPrice(price)}</b>, {name || 'cliente'}:</span> você receberá o link de acesso no email <strong>{email}</strong> assim que o pagamento for confirmado.
            </p>
          </div>

          {/* QR Code - só mostra se tiver imagem configurada */}
          {pixQRCodeImage && (
            <div className="flex justify-center mb-4">
              <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200">
                <img 
                  src={pixQRCodeImage} 
                  alt="QR Code PIX" 
                  className="w-48 h-48 object-contain"
                />
              </div>
            </div>
          )}

          {/* Chave PIX */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Chave PIX ({pixKeyType})
            </label>
            <input
              type="text"
              value={pixKey}
              readOnly
              className="w-full h-11 px-4 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 text-sm mb-3"
            />
            <button
              onClick={handleCopy}
              className={`w-full h-12 rounded-lg font-semibold transition flex items-center justify-center gap-2 text-base ${
                copied
                  ? 'bg-emerald-500 text-white'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg'
              }`}
            >
              {copied ? (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Código copiado!
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copiar código PIX
                </>
              )}
            </button>
          </div>

          {/* Upload de Comprovante - Sucesso substitui o container inteiro */}
          {uploadStatus === 'success' ? (
            <div className="bg-emerald-100 border-2 border-emerald-300 rounded-xl p-5 text-center">
              <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-emerald-800 mb-2">
                Comprovante enviado!
              </h4>
              <p className="text-sm text-emerald-700">
                Obrigado, <strong>{name || 'cliente'}</strong>! Seu comprovante foi recebido e está sendo analisado. Você receberá o link de acesso no email <strong>{email}</strong> em breve.
              </p>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <p className="text-sm font-medium text-emerald-900 mb-2">
                📎 Envie o comprovante de pagamento
              </p>
              <p className="text-xs text-emerald-700 mb-3">
                Isso ajuda o vendedor a confirmar seu pagamento mais rápido. 
                Formatos aceitos: JPG, PNG (máx. 5MB)
              </p>
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/jpeg,image/png,image/jpg,image/webp"
                className="hidden"
              />
              
              {uploadStatus === 'idle' && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-10 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition flex items-center justify-center gap-2 text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Anexar comprovante
                </button>
              )}
              
              {uploadStatus === 'uploading' && (
                <div className="flex items-center justify-center gap-2 text-emerald-700 py-2">
                  <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-600 rounded-full animate-spin"></div>
                  <span className="text-sm">Enviando...</span>
                </div>
              )}
              
              {uploadStatus === 'error' && (
                <div className="space-y-2">
                  <p className="text-sm text-red-600">{error || 'Erro ao enviar. Tente novamente.'}</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-10 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition text-sm"
                  >
                    Tentar novamente
                  </button>
                </div>
              )}
              
              {receiptUrl && (
                <div className="mt-3 p-2 bg-white rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Preview:</p>
                  <img 
                    src={receiptUrl} 
                    alt="Comprovante" 
                    className="max-h-32 mx-auto rounded"
                  />
                </div>
              )}
            </div>
          )}
        </>
      );
    }

    // Layout para PIX via MercadoPago
    return (
      <>
        {/* Timer */}
        <div className="flex items-center justify-center gap-2 mb-4 px-4 py-2 bg-white rounded-lg border border-slate-200">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-mono font-semibold text-slate-700">{timeRemaining}</span>
          <span className="text-xs text-slate-400">restante</span>
        </div>

        {/* Status message */}
        {lastCheckMessage && (
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-700 text-xs">{lastCheckMessage}</p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-3 p-3 bg-rose-50 border border-rose-200 rounded-lg">
            <p className="text-rose-700 text-xs">{error}</p>
          </div>
        )}

        {/* QR Code */}
        <div className="flex justify-center mb-4">
          {renderQRCode()}
        </div>

        {/* Instructions */}
        <p className="text-center text-xs text-slate-500 mb-4">
          Escaneie o QR Code com seu banco ou copie o código PIX abaixo
        </p>

        {/* Copy Button */}
        <button
          onClick={handleCopy}
          className={`w-full h-10 rounded-lg font-medium transition flex items-center justify-center gap-2 mb-3 text-sm ${
            copied
              ? 'bg-emerald-500 text-white'
              : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.98]'
          }`}
        >
          {copied ? (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
              Código copiado!
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copiar código PIX
            </>
          )}
        </button>

        {/* Já paguei Button */}
        <button
          onClick={handleCheckPayment}
          disabled={isCheckingPayment}
          className="w-full h-10 rounded-lg font-semibold transition flex items-center justify-center gap-2 mb-2 bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {isCheckingPayment ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Verificando...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Já paguei
            </>
          )}
        </button>

        {/* Footer */}
        <p className="text-xs text-slate-400 text-center mt-3">
          Pagamento seguro via MercadoPago
        </p>
      </>
    );
  };

  return (
    <div className="mt-4 bg-slate-50 rounded-2xl border border-slate-200 p-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <div className="text-2xl font-bold text-indigo-600">R$ {formatPrice(price)}</div>
        </div>
        {(status === 'pending' || status === 'awaiting_confirmation') && (
          <div className="flex items-center gap-1 text-amber-600 text-sm font-medium">
            <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
            Aguardando
          </div>
        )}
      </div>

      {/* Error State */}
      {status === 'error' && (
        <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-xl">
          <div className="flex items-center gap-2 text-rose-600 mb-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="font-semibold">Erro</span>
          </div>
          <p className="text-rose-700 text-sm mb-3">{error}</p>
          <button
            onClick={() => setStatus('idle')}
            className="px-4 py-2 bg-rose-600 text-white rounded-lg font-medium hover:bg-rose-700 transition text-sm"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Neither MercadoPago nor PIX configured */}
      {!mercadoPagoConfigured && !pixConfigured && (
        <div className="py-8 text-center">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-slate-900 font-medium mb-1">Pagamento temporariamente indisponível</p>
        </div>
      )}

      {/* Formulário inicial + QR Code/PIX */}
      {(mercadoPagoConfigured || pixConfigured) && (
        <div className="animate-fade-in">
          {status === 'idle' && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nome
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu primeiro nome"
                  className="w-full h-11 px-4 rounded-lg border border-slate-300 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition text-sm placeholder:text-slate-400"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email para receber o acesso
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full h-11 px-4 rounded-lg border border-slate-300 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition text-sm placeholder:text-slate-400"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  Você receberá o link de acesso neste email após a confirmação do pagamento.
                </p>
              </div>

              {error && (
                <div className="mb-3 p-3 bg-rose-50 border border-rose-200 rounded-lg">
                  <p className="text-rose-700 text-xs">{error}</p>
                </div>
              )}

              {/* Botão Gerar PIX */}
              <button
                onClick={handleCreatePayment}
                disabled={!email || !name.trim()}
                className="w-full h-12 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-base shadow-md hover:shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                Gerar PIX
              </button>
            </>
          )}

          {/* Status: Criando pagamento */}
          {status === 'creating' && (
            <div className="py-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600 mx-auto mb-3"></div>
              <p className="text-slate-600 text-sm">Criando pagamento...</p>
            </div>
          )}

          {/* Status: Pagamento criado (pendente ou aguardando confirmação) */}
          {(status === 'pending' || status === 'awaiting_confirmation') && (
            renderPendingPayment()
          )}
        </div>
      )}

      {/* Expired Payment */}
      {status === 'expired' && (
        <div className="py-6 text-center">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h4 className="text-base font-semibold text-slate-900 mb-1">Pagamento expirado</h4>
          <p className="text-slate-500 text-sm mb-4">
            O tempo para completar o pagamento terminou.
          </p>
          <button
            onClick={handleGenerateNew}
            className="px-5 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition text-sm"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Confirming Payment */}
      {status === 'confirming' && (
        <div className="py-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500 mx-auto mb-3"></div>
          <p className="text-slate-600 text-sm">Confirmando pagamento...</p>
        </div>
      )}

      {/* Payment Confirmed - Success Screen */}
      {status === 'confirmed' && (
        <div className="py-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <h4 className="text-lg font-bold text-slate-900 mb-2">Pagamento confirmado!</h4>
          <p className="text-slate-600 text-sm mb-4">
            Seu pagamento foi recebido com sucesso.
          </p>
          <div className="flex items-center justify-center gap-2 text-emerald-600 text-sm font-medium">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            Redirecionando para o conteúdo...
          </div>
        </div>
      )}
    </div>
  );
}
