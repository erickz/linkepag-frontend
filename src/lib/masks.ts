// Utility functions for input masking

/**
 * Formats a price value to Brazilian Real (BRL) currency format
 * Returns formatted string like "1.234,56" or "123,45"
 */
export function formatPrice(value: number | string): string {
  if (value === '' || value === null || value === undefined) return '';
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return '';
  
  return numValue.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Parses a formatted price string back to a number
 * Handles inputs like "1.234,56", "123,45", "1234.56"
 */
export function parsePrice(value: string): number {
  if (!value) return 0;
  
  // Remove thousand separators and replace decimal comma with dot
  const cleanValue = value
    .replace(/\./g, '') // Remove thousand separators (dots)
    .replace(',', '.'); // Replace decimal comma with dot
  
  const parsed = parseFloat(cleanValue);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Masks price input in real-time
 * Formats as user types: 1234 -> 12,34 -> 123,45 -> 1.234,56
 * 
 * ⚠️ IMPORTANTE: Esta função espera receber apenas dígitos (centavos).
 * Se estiver convertendo de um número, use priceToInputValue() ou
 * Math.round(price * 100).toString() para evitar erros de ponto flutuante.
 */
export function maskPriceInput(value: string): string {
  // Remove non-numeric characters
  const numericValue = value.replace(/\D/g, '');
  
  if (!numericValue) return '';
  
  // Limita a 12 dígitos (centavos) para evitar overflow
  // 12 dígitos = 999.999.999.999,99 (centenas de bilhões)
  const limitedValue = numericValue.slice(0, 12);
  
  // Convert to number (treating input as cents)
  const cents = parseInt(limitedValue, 10);
  
  if (isNaN(cents)) return '';
  
  // Format with 2 decimal places
  const formatted = (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return formatted;
}

/**
 * Converte um valor numérico de preço para o formato de input.
 * Usa Math.round() para evitar erros de ponto flutuante.
 * 
 * Exemplo de uso no React:
 *   value={priceToInputValue(formData.price)}
 * 
 * ⚠️ NUNCA use: maskPriceInput((price * 100).toString())
 *    Isso causa bugs com valores como 0.14 -> 140.000.000.000.000,02
 */
export function priceToInputValue(price: number | string | undefined): string {
  if (price === undefined || price === null || price === '') return '';
  
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(numPrice) || numPrice <= 0) return '';
  
  // CORREÇÃO CRÍTICA: Usar Math.round para evitar erro de ponto flutuante
  // Ex: 0.14 * 100 = 14.000000000000002 -> Math.round = 14
  const centavos = Math.round(numPrice * 100);
  
  return maskPriceInput(centavos.toString());
}

/**
 * Formats URL input by ensuring https:// prefix
 */
export function formatUrl(value: string): string {
  if (!value) return '';
  
  const trimmed = value.trim();
  
  // If already has a protocol, return as-is
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  
  // If starts with www., add https://
  if (trimmed.startsWith('www.')) {
    return `https://${trimmed}`;
  }
  
  // Otherwise, assume it's a domain and add https://
  return `https://${trimmed}`;
}

/**
 * Validates if a string is a valid URL
 */
export function isValidUrl(value: string): boolean {
  if (!value) return false;
  
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Displays URL in a friendly format (removes protocol)
 */
export function displayUrl(value: string): string {
  if (!value) return '';
  
  return value
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '');
}

/**
 * Masks URL input in real-time
 * Automatically adds https:// when user starts typing
 */
export function maskUrlInput(value: string): string {
  if (!value) return '';
  
  const trimmed = value.trim();
  
  // If user is typing and doesn't have protocol, suggest https://
  if (!trimmed.match(/^https?:\/\//i) && trimmed.length > 0) {
    // Don't auto-add if user is still typing the beginning
    if (trimmed.length >= 3 && !trimmed.match(/^(www|htt|ht|h)/i)) {
      return `https://${trimmed}`;
    }
  }
  
  return trimmed;
}
