/**
 * Detecta a bandeira do cartão de crédito baseado no número
 * Suporta: Visa, Mastercard, American Express, Elo
 * 
 * Retorna os códigos esperados pelo MercadoPago:
 * - visa
 * - master  
 * - amex
 * - elo
 */

/**
 * Detecta a bandeira do cartão baseado no BIN (primeiros dígitos)
 * @param cardNumber - Número do cartão (pode conter espaços)
 * @returns Código da bandeira ou null se não reconhecida
 */
export function detectCardBrand(cardNumber: string): string | null {
  // Remove espaços e caracteres não numéricos
  const cleanNumber = cardNumber.replace(/\s+/g, '').replace(/\D/g, '');
  
  if (cleanNumber.length < 6) {
    return null;
  }
  
  const bin = cleanNumber.substring(0, 6);
  const firstDigit = cleanNumber.charAt(0);
  const firstTwo = cleanNumber.substring(0, 2);
  const firstFour = cleanNumber.substring(0, 4);
  
  // === AMEX (American Express) ===
  // Começa com 34 ou 37
  if (firstTwo === '34' || firstTwo === '37') {
    return 'amex';
  }
  
  // === VISA ===
  // Começa com 4
  if (firstDigit === '4') {
    return 'visa';
  }
  
  // === ELO ===
  // Ranges específicos do Elo
  const eloBins = [
    '401178', '401179', '431274', '438935', '451416', '457393', '457631', 
    '457632', '504175', '636297', '627780',
  ];
  
  // Check prefixos Elo de 4 dígitos
  const eloPrefixes4 = ['6362', '5041', '5067', '5090'];
  
  if (eloBins.includes(bin) || eloPrefixes4.includes(firstFour)) {
    return 'elo';
  }
  
  // === MASTERCARD ===
  // Range 51-55
  const firstTwoNum = parseInt(firstTwo, 10);
  if (firstTwoNum >= 51 && firstTwoNum <= 55) {
    return 'master';
  }
  
  // Range 2221-2720 (Mastercard novo)
  const firstFourNum = parseInt(firstFour, 10);
  if (firstFourNum >= 2221 && firstFourNum <= 2720) {
    return 'master';
  }
  
  // Não reconhecido
  return null;
}

/**
 * Retorna o nome amigável da bandeira para exibição
 */
export function getCardBrandName(brandCode: string | null): string {
  const names: Record<string, string> = {
    'visa': 'Visa',
    'master': 'Mastercard',
    'amex': 'American Express',
    'elo': 'Elo',
  };
  
  return brandCode ? names[brandCode] || 'Desconhecida' : 'Desconhecida';
}

/**
 * Verifica se a bandeira é suportada pelo sistema
 */
export function isSupportedCardBrand(brand: string | null): boolean {
  return brand !== null && ['visa', 'master', 'amex', 'elo'].includes(brand);
}
