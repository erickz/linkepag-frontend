'use client';

import { useState, useEffect } from 'react';
import { maskPriceInput as maskPriceInputOld, parsePrice, formatPrice } from '@/lib/masks';

// VERSÃO CORRIGIDA da maskPriceInput
function maskPriceInputFixed(value: string): string {
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

// Função utilitária para converter preço para input (VERSÃO CORRIGIDA)
function priceToInputValue(price: number): string {
  if (!price || price <= 0) return '';
  
  // CORREÇÃO: Usar Math.round para evitar erro de ponto flutuante
  // Ex: 0.14 * 100 = 14.000000000000002 -> Math.round = 14
  const centavos = Math.round(price * 100);
  
  return maskPriceInputFixed(centavos.toString());
}

export default function TestPriceMaskPage() {
  // Estado para a versão ANTIGA (bugada)
  const [priceOld, setPriceOld] = useState(0);
  const [inputValueOld, setInputValueOld] = useState('');
  
  // Estado para a versão NOVA (corrigida)
  const [priceNew, setPriceNew] = useState(0);
  const [inputValueNew, setInputValueNew] = useState('');
  
  // Testes automáticos de valores problemáticos
  const [testResults, setTestResults] = useState<{name: string, old: string, new: string, ok: boolean}[]>([]);
  
  useEffect(() => {
    const problematicValues = [0.01, 0.07, 0.14, 0.29, 0.1, 0.57, 1.23, 10.99, 999.99];
    const results = problematicValues.map(value => {
      const oldResult = maskPriceInputOld((value * 100).toString());
      const newResult = priceToInputValue(value);
      return {
        name: `R$ ${value.toFixed(2)}`,
        old: oldResult,
        new: newResult,
        ok: !oldResult.includes('00000000000000') && newResult === formatPrice(value)
      };
    });
    setTestResults(results);
  }, []);

  // Handler para versão antiga (bugada)
  const handleChangeOld = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    setInputValueOld(rawValue);
    
    const masked = maskPriceInputOld(rawValue);
    const parsed = parsePrice(masked);
    setPriceOld(parsed);
  };

  // Handler para versão nova (corrigida)
  const handleChangeNew = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    setInputValueNew(rawValue);
    
    const masked = maskPriceInputFixed(rawValue);
    const parsed = parsePrice(masked);
    setPriceNew(parsed);
  };

  // Re-sincroniza o input quando o preço muda (simula re-render do React)
  useEffect(() => {
    // Versão antiga (bugada) - exatamente como está no código
    const newInputValueOld = priceOld > 0 ? maskPriceInputOld((priceOld * 100).toString()) : '';
    if (newInputValueOld !== inputValueOld) {
      setInputValueOld(newInputValueOld);
    }
  }, [priceOld]);

  useEffect(() => {
    // Versão nova (corrigida)
    const newInputValueNew = priceToInputValue(priceNew);
    if (newInputValueNew !== inputValueNew) {
      setInputValueNew(newInputValueNew);
    }
  }, [priceNew]);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            🧪 Teste da Máscara de Preço
          </h1>
          <p className="text-slate-500">
            Comparando a versão antiga (bugada) com a nova (corrigida)
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Versão Antiga (Bugada) */}
          <div className="bg-white rounded-2xl shadow-sm border border-rose-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🐛</span>
              <h2 className="text-lg font-bold text-rose-900">Versão Antiga (Bugada)</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Digite o preço:
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={inputValueOld}
                    onChange={handleChangeOld}
                    className="w-full h-12 pl-10 pr-3 rounded-lg border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none"
                    placeholder="0,00"
                  />
                </div>
              </div>
              
              <div className="bg-rose-50 rounded-xl p-4 space-y-2">
                <p className="text-sm">
                  <span className="font-medium">Valor parseado:</span>{' '}
                  <span className="font-mono text-rose-700">{priceOld.toFixed(2)}</span>
                </p>
                <p className="text-sm">
                  <span className="font-medium">Input exibido:</span>{' '}
                  <span className="font-mono text-rose-700">{inputValueOld || '(vazio)'}</span>
                </p>
                {inputValueOld.includes('00000000000000') && (
                  <p className="text-sm text-rose-600 font-bold">
                    ⚠️ BUG! Valor explodiu devido a erro de ponto flutuante!
                  </p>
                )}
              </div>
              
              <div className="text-xs text-slate-400">
                Código: <code>maskPriceInput((price * 100).toString())</code>
              </div>
            </div>
          </div>

          {/* Versão Nova (Corrigida) */}
          <div className="bg-white rounded-2xl shadow-sm border border-emerald-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">✅</span>
              <h2 className="text-lg font-bold text-emerald-900">Versão Nova (Corrigida)</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Digite o preço:
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={inputValueNew}
                    onChange={handleChangeNew}
                    className="w-full h-12 pl-10 pr-3 rounded-lg border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                    placeholder="0,00"
                  />
                </div>
              </div>
              
              <div className="bg-emerald-50 rounded-xl p-4 space-y-2">
                <p className="text-sm">
                  <span className="font-medium">Valor parseado:</span>{' '}
                  <span className="font-mono text-emerald-700">{priceNew.toFixed(2)}</span>
                </p>
                <p className="text-sm">
                  <span className="font-medium">Input exibido:</span>{' '}
                  <span className="font-mono text-emerald-700">{inputValueNew || '(vazio)'}</span>
                </p>
              </div>
              
              <div className="text-xs text-slate-400">
                Código: <code>maskPriceInput(Math.round(price * 100).toString())</code>
              </div>
            </div>
          </div>
        </div>

        {/* Testes Automáticos */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">
            📊 Testes Automáticos de Valores Problemáticos
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-4 font-medium text-slate-700">Valor</th>
                  <th className="text-left py-2 px-4 font-medium text-slate-700">Versão Antiga</th>
                  <th className="text-left py-2 px-4 font-medium text-slate-700">Versão Nova</th>
                  <th className="text-left py-2 px-4 font-medium text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {testResults.map((result, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-2 px-4 font-mono">{result.name}</td>
                    <td className="py-2 px-4 font-mono text-rose-600">
                      {result.old.length > 20 ? (
                        <span title={result.old}>{result.old.slice(0, 20)}...</span>
                      ) : result.old}
                    </td>
                    <td className="py-2 px-4 font-mono text-emerald-600">{result.new}</td>
                    <td className="py-2 px-4">
                      {result.ok ? (
                        <span className="text-emerald-600 font-bold">✅ OK</span>
                      ) : (
                        <span className="text-rose-600 font-bold">❌ FALHA</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Explicação do Bug */}
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6">
          <h2 className="text-lg font-bold text-amber-900 mb-3">
            🐛 Explicação do Bug
          </h2>
          <div className="space-y-3 text-amber-800 text-sm">
            <p>
              <strong>O Problema:</strong> Em JavaScript, operações com decimais podem ter erros de ponto flutuante:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><code>0.14 * 100</code> = <code>14.000000000000002</code> (deveria ser 14)</li>
              <li><code>0.07 * 100</code> = <code>7.000000000000001</code> (deveria ser 7)</li>
            </ul>
            <p>
              <strong>A Consequência:</strong> Quando <code>maskPriceInput</code> recebe <code>&quot;14.000000000000002&quot;</code>:
            </p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Remove não-dígitos → <code>&quot;14000000000000002&quot;</code></li>
              <li>parseInt → <code>14000000000000002</code> centavos</li>
              <li>Divide por 100 → <code>R$ 140.000.000.000.000,02</code>!</li>
            </ol>
            <p>
              <strong>A Solução:</strong> Usar <code>Math.round()</code> antes de converter para string:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><code>Math.round(0.14 * 100)</code> = <code>14</code> ✅</li>
              <li>Limitar a 12 dígitos para evitar valores absurdos</li>
            </ul>
          </div>
        </div>

        {/* Checklist de Correção */}
        <div className="bg-indigo-50 rounded-2xl border border-indigo-200 p-6">
          <h2 className="text-lg font-bold text-indigo-900 mb-3">
            ✅ Checklist de Correção
          </h2>
          <ul className="space-y-2 text-indigo-800">
            <li className="flex items-center gap-2">
              <input type="checkbox" checked readOnly className="accent-indigo-600" />
              <span>Identificar o bug (ponto flutuante)</span>
            </li>
            <li className="flex items-center gap-2">
              <input type="checkbox" checked readOnly className="accent-indigo-600" />
              <span>Criar testes de reprodução</span>
            </li>
            <li className="flex items-center gap-2">
              <input type="checkbox" checked readOnly className="accent-indigo-600" />
              <span>Criar página de teste visual</span>
            </li>
            <li className="flex items-center gap-2">
              <input type="checkbox" className="accent-indigo-600" />
              <span className="font-bold">Atualizar maskPriceInput com limite de dígitos</span>
            </li>
            <li className="flex items-center gap-2">
              <input type="checkbox" className="accent-indigo-600" />
              <span className="font-bold">Atualizar componentes que usam (price * 100).toString()</span>
            </li>
            <li className="flex items-center gap-2">
              <input type="checkbox" className="accent-indigo-600" />
              <span className="font-bold">Criar função utilitária priceToInputValue()</span>
            </li>
            <li className="flex items-center gap-2">
              <input type="checkbox" className="accent-indigo-600" />
              <span className="font-bold">Testar em todos os inputs de preço</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
