'use client';

import { useCallback } from 'react';

export function useMask() {
  const applyMask = useCallback((value: string, mask: string): string => {
    let result = '';
    let valueIndex = 0;

    for (let i = 0; i < mask.length && valueIndex < value.length; i++) {
      const maskChar = mask[i];
      const valueChar = value[valueIndex];

      if (maskChar === '9') {
        if (/\d/.test(valueChar)) {
          result += valueChar;
          valueIndex++;
        } else {
          break;
        }
      } else if (maskChar === 'A') {
        if (/[a-zA-Z]/.test(valueChar)) {
          result += valueChar;
          valueIndex++;
        } else {
          break;
        }
      } else if (maskChar === '*') {
        result += valueChar;
        valueIndex++;
      } else {
        result += maskChar;
        if (valueChar === maskChar) {
          valueIndex++;
        }
      }
    }

    return result;
  }, []);

  const removeMask = useCallback((value: string): string => {
    return value.replace(/[^a-zA-Z0-9]/g, '');
  }, []);

  const cpfMask = useCallback((value: string): string => {
    const clean = value.replace(/\D/g, '').slice(0, 11);
    return applyMask(clean, '999.999.999-99');
  }, [applyMask]);

  const cnpjMask = useCallback((value: string): string => {
    const clean = value.replace(/\D/g, '').slice(0, 14);
    return applyMask(clean, '99.999.999/9999-99');
  }, [applyMask]);

  const phoneMask = useCallback((value: string): string => {
    const clean = value.replace(/\D/g, '').slice(0, 11);
    if (clean.length <= 10) {
      return applyMask(clean, '(99) 9999-9999');
    }
    return applyMask(clean, '(99) 99999-9999');
  }, [applyMask]);

  const cepMask = useCallback((value: string): string => {
    const clean = value.replace(/\D/g, '').slice(0, 8);
    return applyMask(clean, '99999-999');
  }, [applyMask]);

  const currencyMask = useCallback((value: string): string => {
    const clean = value.replace(/\D/g, '');
    const number = parseInt(clean, 10);
    
    if (isNaN(number)) return '';
    
    const formatted = (number / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    
    return formatted;
  }, []);

  const numberMask = useCallback((value: string, maxLength?: number): string => {
    let clean = value.replace(/\D/g, '');
    if (maxLength && clean.length > maxLength) {
      clean = clean.slice(0, maxLength);
    }
    return clean;
  }, []);

  const alphaMask = useCallback((value: string, maxLength?: number): string => {
    let clean = value.replace(/[^a-zA-ZÀ-ÿ\s]/g, '');
    if (maxLength && clean.length > maxLength) {
      clean = clean.slice(0, maxLength);
    }
    return clean;
  }, []);

  const alphanumericMask = useCallback((value: string, maxLength?: number): string => {
    let clean = value.replace(/[^a-zA-Z0-9À-ÿ\s]/g, '');
    if (maxLength && clean.length > maxLength) {
      clean = clean.slice(0, maxLength);
    }
    return clean;
  }, []);

  // Credit card mask: 0000 0000 0000 0000
  const creditCardMask = useCallback((value: string): string => {
    const clean = value.replace(/\D/g, '').slice(0, 16);
    return applyMask(clean, '9999 9999 9999 9999');
  }, [applyMask]);

  // Expiry date mask: MM/YY
  const expiryMask = useCallback((value: string): string => {
    const clean = value.replace(/\D/g, '').slice(0, 4);
    return applyMask(clean, '99/99');
  }, [applyMask]);

  // Alias for compatibility with CreditCardForm
  const maskCPF = cpfMask;
  const maskCreditCard = creditCardMask;
  const maskExpiry = expiryMask;

  return {
    applyMask,
    removeMask,
    cpfMask,
    cnpjMask,
    phoneMask,
    cepMask,
    currencyMask,
    numberMask,
    alphaMask,
    alphanumericMask,
    creditCardMask,
    expiryMask,
    // Aliases
    maskCPF,
    maskCreditCard,
    maskExpiry,
  };
}

export default useMask;
