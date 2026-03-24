'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useMercadoPago, useCardValidation } from '@/hooks/useMercadoPago';
import { useMask } from '@/hooks/useMask';

interface CreditCardFormProps {
  onCardTokenGenerated: (token: string, cardData?: { cpf: string }) => void;
  onError: (error: string) => void;
  onValidationChange?: (isValid: boolean) => void;
  isProcessing: boolean;
  /** When true, triggers tokenization immediately */
  shouldTokenize?: boolean;
  /** Callback when tokenization is complete */
  onTokenizationComplete?: () => void;
}

export function CreditCardForm({ 
  onCardTokenGenerated, 
  onError, 
  onValidationChange,
  isProcessing,
  shouldTokenize,
  onTokenizationComplete,
}: CreditCardFormProps) {
  const { isLoading, isReady, createCardToken } = useMercadoPago();
  const { validateCardNumber, validateExpiry, validateCVV, validateCPF } = useCardValidation();
  const { maskCPF, maskCreditCard, maskExpiry } = useMask();

  const [formData, setFormData] = useState({
    cardNumber: '',
    cardholderName: '',
    expiry: '',
    cvv: '',
    cpf: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isTokenizing, setIsTokenizing] = useState(false);
  const [hasTokenized, setHasTokenized] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isTokenizingRef = useRef(false);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    // Reset tokenized state when form changes
    if (hasTokenized) {
      setHasTokenized(false);
    }
  };

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate card number
    const cleanCardNumber = formData.cardNumber.replace(/\s/g, '');
    if (!cleanCardNumber) {
      newErrors.cardNumber = 'Número do cartão é obrigatório';
    } else if (!validateCardNumber(cleanCardNumber)) {
      newErrors.cardNumber = 'Número do cartão inválido';
    }

    // Validate cardholder name
    if (!formData.cardholderName.trim()) {
      newErrors.cardholderName = 'Nome do titular é obrigatório';
    } else if (formData.cardholderName.trim().length < 3) {
      newErrors.cardholderName = 'Nome muito curto';
    }

    // Validate expiry
    if (!formData.expiry) {
      newErrors.expiry = 'Validade é obrigatória';
    } else {
      const [month, year] = formData.expiry.split('/');
      if (!month || !year || !validateExpiry(month, year)) {
        newErrors.expiry = 'Data de validade inválida';
      }
    }

    // Validate CVV
    if (!formData.cvv) {
      newErrors.cvv = 'CVV é obrigatório';
    } else if (!validateCVV(formData.cvv)) {
      newErrors.cvv = 'CVV inválido';
    }

    // Validate CPF
    const cleanCPF = formData.cpf.replace(/[^\d]/g, '');
    if (!cleanCPF) {
      newErrors.cpf = 'CPF é obrigatório';
    } else if (!validateCPF(cleanCPF)) {
      newErrors.cpf = 'CPF inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, validateCardNumber, validateExpiry, validateCVV, validateCPF]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Validate form in real-time (without tokenizing)
  const prevValidationResultRef = useRef<boolean | null>(null);
  
  useEffect(() => {
    const allFieldsFilled = 
      !!formData.cardNumber && 
      !!formData.cardholderName && 
      !!formData.expiry && 
      !!formData.cvv && 
      !!formData.cpf;

    const isValid = allFieldsFilled && Object.keys(errors).length === 0;
    
    // Only call onValidationChange if result changed
    if (prevValidationResultRef.current !== isValid) {
      prevValidationResultRef.current = isValid;
      onValidationChange?.(isValid);
    }
  }, [formData, errors]); // Re-run when form data or errors change

  // Tokenize when shouldTokenize is true (controlled by parent)
  useEffect(() => {
    const doTokenize = async () => {
      // Only tokenize when explicitly requested
      if (!shouldTokenize) {
        return;
      }

      // Triple check to prevent duplicate tokenization
      if (isTokenizingRef.current || isTokenizing || !isReady || hasTokenized || isProcessing) {
        return;
      }

      // Check if all fields are filled
      const allFieldsFilled = 
        formData.cardNumber && 
        formData.cardholderName && 
        formData.expiry && 
        formData.cvv && 
        formData.cpf;

      if (!allFieldsFilled) {
        onValidationChange?.(false);
        onTokenizationComplete?.();
        return;
      }

      // Validate form
      const isValid = validateForm();
      onValidationChange?.(isValid);

      if (!isValid) {
        onTokenizationComplete?.();
        return;
      }

      // Cancel any pending tokenization
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();
      isTokenizingRef.current = true;
      setIsTokenizing(true);

      try {
        const [month, year] = formData.expiry.split('/');
        const cleanCardNumber = formData.cardNumber.replace(/\s/g, '');
        const cleanCPF = formData.cpf.replace(/[^\d]/g, '');

        // Determine full year
        const fullYear = year.length === 2 ? `20${year}` : year;

        // Preparar dados para o MercadoPago
        // IMPORTANTE: Passamos o mês com zero à esquerda, o hook vai formatar corretamente
        const monthPadded = month.padStart(2, '0');

        const cardData = {
          cardNumber: cleanCardNumber,
          cardholderName: formData.cardholderName.trim(),
          cardExpirationMonth: monthPadded, // Hook will handle formatting
          cardExpirationYear: fullYear,     // Hook will convert to 2 digits
          securityCode: formData.cvv,
          identificationType: 'CPF',
          identificationNumber: cleanCPF,
        };

        const token = await createCardToken(cardData, abortControllerRef.current.signal);

        if (token) {
          setHasTokenized(true);
          // Pass token + CPF for customer creation in backend
          const cleanCPF = formData.cpf.replace(/[^\d]/g, '');
          onCardTokenGenerated(token, { cpf: cleanCPF });
        } else {
          onError('Não foi possível processar o cartão. Verifique os dados e tente novamente.');
          setHasTokenized(false);
          onValidationChange?.(false);
        }
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Erro ao processar cartão');
        setHasTokenized(false);
        onValidationChange?.(false);
      } finally {
        isTokenizingRef.current = false;
        setIsTokenizing(false);
        abortControllerRef.current = null;
        onTokenizationComplete?.();
      }
    };

    // Execute immediately when shouldTokenize becomes true
    doTokenize();
  }, [shouldTokenize]); // Only depend on shouldTokenize trigger

  if (isLoading) {
    return (
      <div className="p-6 bg-slate-50 rounded-xl text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600 mx-auto mb-3"></div>
        <p className="text-sm text-slate-600">Carregando formulário de pagamento...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Card Number */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Número do Cartão
        </label>
        <input
          type="text"
          inputMode="numeric"
          placeholder="0000 0000 0000 0000"
          value={formData.cardNumber}
          onChange={(e) => handleChange('cardNumber', maskCreditCard(e.target.value))}
          maxLength={19}
          disabled={isProcessing}
          className={`w-full h-11 px-4 rounded-lg border ${
            errors.cardNumber ? 'border-rose-300' : 'border-slate-300'
          } focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed`}
        />
        {errors.cardNumber && (
          <p className="mt-1 text-xs text-rose-600">{errors.cardNumber}</p>
        )}
      </div>

      {/* Cardholder Name */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Nome do Titular (como no cartão)
        </label>
        <input
          type="text"
          placeholder="JOSE SILVA"
          value={formData.cardholderName}
          onChange={(e) => handleChange('cardholderName', e.target.value.toUpperCase())}
          disabled={isProcessing}
          className={`w-full h-11 px-4 rounded-lg border ${
            errors.cardholderName ? 'border-rose-300' : 'border-slate-300'
          } focus:ring-2 focus:ring-indigo-500 focus:border-transparent uppercase disabled:bg-slate-100 disabled:cursor-not-allowed`}
        />
        {errors.cardholderName && (
          <p className="mt-1 text-xs text-rose-600">{errors.cardholderName}</p>
        )}
      </div>

      {/* Expiry and CVV */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Validade (MM/AA)
          </label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="12/25"
            value={formData.expiry}
            onChange={(e) => handleChange('expiry', maskExpiry(e.target.value))}
            maxLength={5}
            disabled={isProcessing}
            className={`w-full h-11 px-4 rounded-lg border ${
              errors.expiry ? 'border-rose-300' : 'border-slate-300'
            } focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed`}
          />
          {errors.expiry && (
            <p className="mt-1 text-xs text-rose-600">{errors.expiry}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            CVV
          </label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="123"
            value={formData.cvv}
            onChange={(e) => handleChange('cvv', e.target.value.replace(/\D/g, '').slice(0, 4))}
            maxLength={4}
            disabled={isProcessing}
            className={`w-full h-11 px-4 rounded-lg border ${
              errors.cvv ? 'border-rose-300' : 'border-slate-300'
            } focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed`}
          />
          {errors.cvv && (
            <p className="mt-1 text-xs text-rose-600">{errors.cvv}</p>
          )}
        </div>
      </div>

      {/* CPF */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          CPF do Titular
        </label>
        <input
          type="text"
          inputMode="numeric"
          placeholder="000.000.000-00"
          value={formData.cpf}
          onChange={(e) => handleChange('cpf', maskCPF(e.target.value))}
          maxLength={14}
          disabled={isProcessing}
          className={`w-full h-11 px-4 rounded-lg border ${
            errors.cpf ? 'border-rose-300' : 'border-slate-300'
          } focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed`}
        />
        {errors.cpf && (
          <p className="mt-1 text-xs text-rose-600">{errors.cpf}</p>
        )}
      </div>

      {/* Status Indicator */}
      <div className="pt-2">
        {isTokenizing ? (
          <div className="flex items-center gap-2 text-indigo-600 text-sm font-medium">
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-indigo-600"></div>
            Processando...
          </div>
        ) : hasTokenized ? (
          <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Cartão validado com sucesso!
          </div>
        ) : (
          <div className="flex items-center gap-2 text-amber-600 text-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Preencha todos os dados do cartão
          </div>
        )}
      </div>

      <p className="text-xs text-slate-500 text-center">
        Seus dados estão protegidos com criptografia SSL. Não armazenamos os dados do seu cartão.
      </p>
    </div>
  );
}
