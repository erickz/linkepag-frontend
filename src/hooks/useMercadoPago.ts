'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

// Types for MercadoPago SDK
declare global {
  interface Window {
    MercadoPago: new (publicKey: string, options?: { locale?: string }) => MercadoPagoInstance;
  }
}

interface MercadoPagoInstance {
  getIdentificationTypes(): Promise<{ id: string; name: string }[]>;
  createCardToken(cardData: CardTokenData): Promise<{ id: string; [key: string]: unknown }>;
  getDeviceId?(): string | null;
}

interface CardTokenData {
  cardNumber: string;
  cardholderName: string;
  cardExpirationMonth: string;
  cardExpirationYear: string;
  securityCode: string;
  identificationType: string;
  identificationNumber: string;
}

interface UseMercadoPagoReturn {
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  createCardToken: (cardData: CardTokenData, abortSignal?: AbortSignal) => Promise<string | null>;
  getDeviceId: () => string | null;
}

const MP_PUBLIC_KEY = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || '';

export function useMercadoPago(): UseMercadoPagoReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mpInstanceRef = useRef<MercadoPagoInstance | null>(null);

  useEffect(() => {
    // Check if SDK is already loaded
    if (window.MercadoPago) {
      initializeMercadoPago();
      return;
    }

    // Load MercadoPago SDK
    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.async = true;
    script.onload = initializeMercadoPago;
    script.onerror = () => {
      setError('Falha ao carregar o SDK do MercadoPago');
      setIsLoading(false);
    };

    document.body.appendChild(script);

    return () => {
      // Cleanup: remove script if component unmounts during loading
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const initializeMercadoPago = () => {
    try {
      if (!window.MercadoPago) {
        throw new Error('SDK do MercadoPago não disponível');
      }

      const mp = new window.MercadoPago(MP_PUBLIC_KEY, {
        locale: 'pt-BR',
      });

      mpInstanceRef.current = mp;
      setIsReady(true);
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao inicializar MercadoPago');
      setIsLoading(false);
    }
  };

  const createCardToken = useCallback(async (cardData: CardTokenData, abortSignal?: AbortSignal): Promise<string | null> => {
    if (!mpInstanceRef.current) {
      setError('SDK do MercadoPago não inicializado');
      return null;
    }

    if (!mpInstanceRef.current.createCardToken) {
      setError('Método de tokenização não disponível');
      return null;
    }

    // Check if aborted before starting
    if (abortSignal?.aborted) {
      return null;
    }

    try {
      // MercadoPago expects year in 2-digit format
      const yearShort = cardData.cardExpirationYear.slice(-2);
      
      // Ensure month has leading zero
      const monthPadded = cardData.cardExpirationMonth.padStart(2, '0');
      
      const formattedData = {
        ...cardData,
        cardExpirationMonth: monthPadded,
        cardExpirationYear: yearShort,
      };
      
      const result = await mpInstanceRef.current.createCardToken(formattedData);
      
      // Check if aborted after creation
      if (abortSignal?.aborted) {
        return null;
      }
      
      return result.id;
    } catch (err: any) {
      if (abortSignal?.aborted) {
        return null;
      }
      
      // Build a more descriptive error message
      let errorMsg = 'Erro ao criar token do cartão';
      if (err?.message) {
        errorMsg = err.message;
      }
      if (err?.cause && Array.isArray(err.cause) && err.cause.length > 0) {
        const firstCause = err.cause[0];
        if (firstCause?.description) {
          errorMsg = firstCause.description;
        } else if (firstCause?.message) {
          errorMsg = firstCause.message;
        }
      }
      
      setError(errorMsg);
      return null;
    }
  }, []);

  const getDeviceId = useCallback((): string | null => {
    if (!mpInstanceRef.current) {
      return null;
    }
    // O MercadoPago SDK V2 armazena o device ID em window.MP_DEVICE_ID
    // ou pode ser obtido via mpInstanceRef.current
    if (typeof window !== 'undefined' && (window as any).MP_DEVICE_ID) {
      return (window as any).MP_DEVICE_ID;
    }
    return null;
  }, []);

  return {
    isLoading,
    isReady,
    error,
    createCardToken,
    getDeviceId,
  };
}

// Hook for card validation
export function useCardValidation() {
  const validateCardNumber = (cardNumber: string): boolean => {
    // Remove spaces and dashes
    const clean = cardNumber.replace(/[\s-]/g, '');
    
    // Check if it's all digits
    if (!/^\d+$/.test(clean)) return false;
    
    // Check length (13-19 digits)
    if (clean.length < 13 || clean.length > 19) return false;
    
    // Luhn algorithm
    let sum = 0;
    let isEven = false;
    
    for (let i = clean.length - 1; i >= 0; i--) {
      let digit = parseInt(clean.charAt(i), 10);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  };

  const validateExpiry = (month: string, year: string): boolean => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    const expMonth = parseInt(month, 10);
    const expYear = parseInt(year, 10);
    
    if (isNaN(expMonth) || isNaN(expYear)) return false;
    if (expMonth < 1 || expMonth > 12) return false;
    
    // Full year (2025) or short year (25)
    const fullYear = expYear < 100 ? 2000 + expYear : expYear;
    
    if (fullYear < currentYear) return false;
    if (fullYear === currentYear && expMonth < currentMonth) return false;
    
    return true;
  };

  const validateCVV = (cvv: string): boolean => {
    return /^\d{3,4}$/.test(cvv);
  };

  const validateCPF = (cpf: string): boolean => {
    const clean = cpf.replace(/[^\d]/g, '');
    
    if (clean.length !== 11) return false;
    if (/^(\d)\1+$/.test(clean)) return false;
    
    let sum = 0;
    let remainder;
    
    for (let i = 1; i <= 9; i++) {
      sum += parseInt(clean.substring(i - 1, i), 10) * (11 - i);
    }
    
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(clean.substring(9, 10), 10)) return false;
    
    sum = 0;
    for (let i = 1; i <= 10; i++) {
      sum += parseInt(clean.substring(i - 1, i), 10) * (12 - i);
    }
    
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(clean.substring(10, 11), 10)) return false;
    
    return true;
  };

  return {
    validateCardNumber,
    validateExpiry,
    validateCVV,
    validateCPF,
  };
}
