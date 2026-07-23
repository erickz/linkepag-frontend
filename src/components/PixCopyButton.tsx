'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { IconPix, IconCopy, IconCheck } from './icons';

// Copia texto com fallback para navegadores sem Clipboard API (ou contexto inseguro)
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Botão "Me mande um PIX" exibido na página pública (e nos previews).
 * Clique copia a chave e o botão transiciona para mostrar a chave + "Copiado!".
 * Usa a cor da marca PIX (#32BCAD) para se diferenciar dos botões de link.
 */
export default function PixCopyButton({ pixKey, compact = false }: { pixKey: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const handleCopy = useCallback(async () => {
    const ok = await copyToClipboard(pixKey);
    if (!ok) return;
    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), 3000);
  }, [pixKey]);

  // Versão mini usada dentro dos previews (mesmo padrão das linhas de link do preview)
  if (compact) {
    return (
      <button
        onClick={handleCopy}
        title="Copiar chave PIX"
        className="h-8 w-full rounded-lg flex items-center gap-2 px-3 text-xs bg-[#32BCAD] hover:bg-[#2BA99B] text-white transition-colors duration-200 cursor-pointer"
      >
        <IconPix className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="flex-1 min-w-0 grid text-left">
          <span className={`col-start-1 row-start-1 truncate transition-opacity duration-300 ${copied ? 'opacity-0' : 'opacity-100'}`}>
            Me mande um PIX
          </span>
          <span className={`col-start-1 row-start-1 truncate transition-opacity duration-300 ${copied ? 'opacity-100' : 'opacity-0'}`}>
            Copiado! {pixKey}
          </span>
        </span>
        {copied ? <IconCheck className="w-3.5 h-3.5 flex-shrink-0" /> : <IconCopy className="w-3.5 h-3.5 flex-shrink-0" />}
      </button>
    );
  }

  return (
    <button
      onClick={handleCopy}
      title="Copiar chave PIX"
      className="flex items-center gap-2 sm:gap-4 w-full px-3 sm:px-5 py-3 sm:py-4 rounded-2xl bg-[#32BCAD] text-white transition-all duration-200 hover:bg-[#2BA99B] hover:shadow-lg hover:shadow-[#32BCAD]/30 hover:scale-[1.01] active:scale-[0.98] cursor-pointer text-left"
    >
      {/* Icon Container - mesmo padrão dos botões de link */}
      <div className="flex items-center justify-center flex-shrink-0 w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-white/20 self-center">
        <IconPix className="w-4 h-4 sm:w-5 sm:h-5" />
      </div>

      {/* Content - cross-fade entre estado inicial e "Copiado!" */}
      <div className="flex-1 min-w-0 self-center grid">
        <span className={`col-start-1 row-start-1 transition-opacity duration-300 ${copied ? 'opacity-0' : 'opacity-100'}`}>
          <span className="font-semibold text-sm sm:text-base leading-snug block">Me mande um PIX</span>
          <span className="text-xs text-white/80 leading-relaxed block">Toque para copiar a chave</span>
        </span>
        <span className={`col-start-1 row-start-1 transition-opacity duration-300 ${copied ? 'opacity-100' : 'opacity-0'}`} aria-hidden={!copied}>
          <span className="font-semibold text-sm sm:text-base leading-snug block truncate">{pixKey}</span>
          <span className="text-xs text-white/80 leading-relaxed block">Copiado!</span>
        </span>
      </div>

      {/* Right Side */}
      <div className="flex items-center flex-shrink-0 self-center">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 flex items-center justify-center">
          {copied ? <IconCheck className="w-4 h-4 sm:w-5 sm:h-5" /> : <IconCopy className="w-4 h-4 sm:w-5 sm:h-5" />}
        </div>
      </div>
    </button>
  );
}
