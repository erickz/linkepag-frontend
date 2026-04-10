/**
 * Teste simples para reproduzir o bug da máscara de preço
 * Execute com: node test-mask-bug.js
 */

// Copia das funções do masks.ts para teste
function formatPrice(value) {
  if (value === '' || value === null || value === undefined) return '';
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return '';
  
  return numValue.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parsePrice(value) {
  if (!value) return 0;
  
  const cleanValue = value
    .replace(/\./g, '')
    .replace(',', '.');
  
  const parsed = parseFloat(cleanValue);
  return isNaN(parsed) ? 0 : parsed;
}

function maskPriceInput(value) {
  // Remove non-numeric characters
  const numericValue = value.replace(/\D/g, '');
  
  if (!numericValue) return '';
  
  // Convert to number (treating input as cents)
  const cents = parseInt(numericValue, 10);
  
  // Format with 2 decimal places
  const formatted = (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return formatted;
}

console.log('=== TESTE DE BUG NA MÁSCARA DE PREÇO ===\n');

// Teste 1: Valores normais (devem funcionar)
console.log('Teste 1: Valores normais');
console.log('maskPriceInput("1"):', maskPriceInput('1'));
console.log('maskPriceInput("12"):', maskPriceInput('12'));
console.log('maskPriceInput("123"):', maskPriceInput('123'));
console.log('maskPriceInput("1234"):', maskPriceInput('1234'));
console.log('maskPriceInput("12345"):', maskPriceInput('12345'));
console.log('');

// Teste 2: O BUG - Erro de ponto flutuante
console.log('Teste 2: BUG - Erro de ponto flutuante');
console.log('');

const problematicValues = [
  { name: '0.01', value: 0.01 },
  { name: '0.07', value: 0.07 },
  { name: '0.14', value: 0.14 },
  { name: '0.29', value: 0.29 },
  { name: '1.23', value: 1.23 },
  { name: '10.99', value: 10.99 },
  { name: '999.99', value: 999.99 },
];

for (const { name, value } of problematicValues) {
  const multiplied = value * 100;
  const asString = multiplied.toString();
  const result = maskPriceInput(asString);
  
  console.log(`Valor: R$ ${name}`);
  console.log(`  ${name} * 100 = ${multiplied}`);
  console.log(`  (${name} * 100).toString() = "${asString}"`);
  console.log(`  maskPriceInput("${asString}") = "${result}"`);
  
  if (result.includes('00000000000000')) {
    console.log('  ❌ FALHA: Valor explodiu devido a erro de ponto flutuante!');
  } else if (result === formatPrice(value)) {
    console.log('  ✅ OK');
  } else {
    console.log(`  ⚠️  Esperado: "${formatPrice(value)}", Obtido: "${result}"`);
  }
  console.log('');
}

// Teste 3: Simulação do ciclo React completo
console.log('Teste 3: Simulação do ciclo React (fluxo completo)');
console.log('');

function simulateReactInput(userInputs) {
  let price = 0;
  console.log('Estado inicial: price = 0');
  
  for (let i = 0; i < userInputs.length; i++) {
    const input = userInputs[i];
    console.log(`\nPasso ${i + 1}: Usuário digita "${input}"`);
    
    // onChange
    const masked = maskPriceInput(input);
    price = parsePrice(masked);
    console.log(`  maskPriceInput("${input}") = "${masked}"`);
    console.log(`  parsePrice("${masked}") = ${price}`);
    
    // Re-render (value do input)
    const valueForInput = price > 0 ? maskPriceInput((price * 100).toString()) : '';
    console.log(`  Valor exibido no input: "${valueForInput}"`);
    
    if (valueForInput.includes('00000000000000')) {
      console.log('  ❌ FALHA: Bug reproduzido!');
      return false;
    }
  }
  
  console.log('\n✅ Ciclo completado sem bugs!');
  return true;
}

// Simula usuário digitando "1499" para R$ 14,99
console.log('Cenário: Usuário quer digitar R$ 14,99');
simulateReactInput(['1', '14', '149', '1499']);

console.log('\n' + '='.repeat(50));
console.log('CONCLUSÃO:');
console.log('');
console.log('O bug ocorre quando formData.price * 100 gera um número');
console.log('com erro de ponto flutuante (ex: 7.000000000000001).');
console.log('');
console.log('Quando maskPriceInput recebe "7.000000000000001":');
console.log('  1. remove \D -> "7000000000000001"');
console.log('  2. parseInt -> 7000000000000001 centavos');
console.log('  3. /100 -> 70.000.000.000.000,01 reais!');
console.log('');
console.log('Solução: Arredondar antes de converter para string');
console.log('ou usar Math.round() na conversão de centavos.');
