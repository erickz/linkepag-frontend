/**
 * Testes para as funções de máscara
 * Execute com: npx jest src/lib/masks.test.ts
 */

import { formatPrice, parsePrice, maskPriceInput } from './masks';

describe('maskPriceInput', () => {
  it('deve formatar valor simples corretamente', () => {
    expect(maskPriceInput('1')).toBe('0,01');
    expect(maskPriceInput('12')).toBe('0,12');
    expect(maskPriceInput('123')).toBe('1,23');
    expect(maskPriceInput('1234')).toBe('12,34');
    expect(maskPriceInput('12345')).toBe('123,45');
    expect(maskPriceInput('123456')).toBe('1.234,56');
  });

  it('deve lidar com string vazia', () => {
    expect(maskPriceInput('')).toBe('');
  });

  it('deve remover caracteres não-numéricos', () => {
    expect(maskPriceInput('R$ 1.234,56')).toBe('12,35'); // 123456 centavos = 1.234,56
    expect(maskPriceInput('abc123def')).toBe('1,23');
  });

  it('deve lidar com valores que já têm formatação', () => {
    expect(maskPriceInput('0,05')).toBe('0,05'); // "005" -> 5 centavos
    expect(maskPriceInput('1.234,56')).toBe('12,35'); // "123456" -> 1.234,56
  });

  // TESTE CRÍTICO: Bug de ponto flutuante
  it('NAO deve explodir quando recebe numero com erro de ponto flutuante', () => {
    // Simula o que acontece no React: (0.07 * 100).toString() = "7.000000000000001"
    const problematicValue = (0.07 * 100).toString(); // "7.000000000000001"
    console.log('Valor problemático:', problematicValue);
    
    const result = maskPriceInput(problematicValue);
    console.log('Resultado:', result);
    
    // O resultado NÃO deve ser um número gigante!
    // Atualmente: "7.000000000000001" -> remove nao-digitos -> "7000000000000001" -> parseInt = 7000000000000001 centavos!
    expect(result).not.toContain('.');
    expect(result).not.toContain('00000000000000');
    
    // Deveria ser "0,07" (7 centavos)
    expect(result).toBe('0,07');
  });

  it('NAO deve explodir com varios valores de ponto flutuante', () => {
    const problematicValues = [
      { input: (0.01 * 100).toString(), expected: '0,01' },
      { input: (0.07 * 100).toString(), expected: '0,07' },
      { input: (0.1 * 100).toString(), expected: '0,10' },
      { input: (0.14 * 100).toString(), expected: '0,14' },
      { input: (0.29 * 100).toString(), expected: '0,29' },
      { input: (1.23 * 100).toString(), expected: '1,23' },
      { input: (10.99 * 100).toString(), expected: '10,99' },
    ];

    for (const { input, expected } of problematicValues) {
      console.log(`Input: "${input}" -> Esperado: "${expected}"`);
      const result = maskPriceInput(input);
      console.log(`Resultado: "${result}"`);
      expect(result).not.toContain('00000000000000');
    }
  });

  it('deve limitar valor máximo razoável', () => {
    // Valores muito altos devem ser limitados
    const hugeNumber = '99999999999999999999';
    const result = maskPriceInput(hugeNumber);
    
    // Não deve quebrar ou retornar valor absurdo
    expect(result.length).toBeLessThan(30);
  });
});

describe('parsePrice', () => {
  it('deve converter string formatada para numero', () => {
    expect(parsePrice('0,01')).toBe(0.01);
    expect(parsePrice('1,23')).toBe(1.23);
    expect(parsePrice('1.234,56')).toBe(1234.56);
    expect(parsePrice('R$ 1.234,56')).toBe(1234.56);
  });

  it('deve retornar 0 para string vazia', () => {
    expect(parsePrice('')).toBe(0);
  });
});

describe('formatPrice', () => {
  it('deve formatar numero para string BRL', () => {
    expect(formatPrice(0.01)).toBe('0,01');
    expect(formatPrice(1.23)).toBe('1,23');
    expect(formatPrice(1234.56)).toBe('1.234,56');
  });

  it('deve formatar string numerica', () => {
    expect(formatPrice('1.23')).toBe('1,23');
  });
});

// Teste de integração simulando o fluxo do React
describe('Fluxo React (integração)', () => {
  it('deve simular o fluxo completo de digitação', () => {
    // Simula o estado do React
    let price = 0;
    
    // Usuário digita "1"
    const input1 = '1';
    price = parsePrice(maskPriceInput(input1));
    expect(price).toBe(0.01);
    
    // Re-render: value = maskPriceInput((price * 100).toString())
    const displayed1 = maskPriceInput((price * 100).toString());
    expect(displayed1).toBe('0,01');
    
    // Usuário digita "2" (append ao valor mostrado)
    // Mas no input do React, o value é controlado, então o usuário digita em cima do "0,01"
    // Na prática, o onChange recebe o valor do input que pode ser "0,012" (usuário adicionou 2)
    const input2 = '0,012'; // Usuário digitou "2" depois do "0,01"
    price = parsePrice(maskPriceInput(input2));
    expect(price).toBe(0.12);
    
    const displayed2 = maskPriceInput((price * 100).toString());
    expect(displayed2).toBe('0,12');
    
    // Usuário digita "3"
    const input3 = '0,123';
    price = parsePrice(maskPriceInput(input3));
    expect(price).toBe(1.23);
    
    const displayed3 = maskPriceInput((price * 100).toString());
    expect(displayed3).toBe('1,23');
  });

  it('NAO deve explodir com erro de ponto flutuante no ciclo React', () => {
    // Simula o pior caso: preço que causa erro de ponto flutuante
    let price = 0.07; // Valor que causa problema
    
    // Re-render
    const multiplied = price * 100; // 7.000000000000001
    const asString = multiplied.toString(); // "7.000000000000001"
    
    console.log('Ciclo React - price:', price);
    console.log('Ciclo React - price * 100:', multiplied);
    console.log('Ciclo React - (price * 100).toString():', asString);
    
    const displayed = maskPriceInput(asString);
    console.log('Ciclo React - maskPriceInput result:', displayed);
    
    // NÃO deve conter sequencia de zeros
    expect(displayed).not.toContain('00000000000000');
    
    // Deveria ser algo razoável
    expect(displayed.length).toBeLessThan(20);
  });
});
