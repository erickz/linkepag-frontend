'use client';

import { useState, useEffect } from 'react';
import { extractSocialHandle, normalizeSocialUrl } from '@/lib/masks';
import { IconInstagram, IconTiktok } from './icons';

type SocialPlatform = 'instagram' | 'tiktok';

interface SocialHandleInputProps {
  platform: SocialPlatform;
  /** URL canônica armazenada no perfil (ou '') */
  value: string;
  /** Emite a URL canônica (normalizeSocialUrl) ou '' quando vazio */
  onChange: (canonicalUrl: string) => void;
  label?: string;
  id?: string;
}

const platformConfig: Record<
  SocialPlatform,
  { prefix: string; placeholder: string; domain: string; Icon: typeof IconInstagram }
> = {
  instagram: { prefix: 'instagram.com/', placeholder: 'seuusuario', domain: 'instagram.com', Icon: IconInstagram },
  tiktok: { prefix: 'tiktok.com/@', placeholder: 'seuusuario', domain: 'tiktok.com', Icon: IconTiktok },
};

/**
 * Input de handle de rede social: exibe só o handle (sem URL, sem @)
 * e emite para o pai a URL canônica pronta para salvar no perfil.
 * Colar uma URL completa normaliza automaticamente para o handle puro.
 */
export function SocialHandleInput({ platform, value, onChange, label, id }: SocialHandleInputProps) {
  const { prefix, placeholder, domain, Icon } = platformConfig[platform];
  const [handle, setHandle] = useState(() => extractSocialHandle(platform, value));

  // Sincroniza o handle exibido quando o valor externo muda (ex: perfil carregado)
  useEffect(() => {
    setHandle(extractSocialHandle(platform, value));
  }, [platform, value]);

  const emitChange = (nextHandle: string) => {
    setHandle(nextHandle);
    onChange(nextHandle ? normalizeSocialUrl(platform, nextHandle) : '');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const lowerRaw = raw.toLowerCase();

    // Valor com estrutura de URL (digitado, colado sem paste event ou
    // preenchido de uma vez por autofill/script): tenta extrair o handle
    // assim que houver algo extraível, em vez de sanitizar e destruir a URL
    const looksLikeUrl =
      lowerRaw.startsWith('http') ||
      lowerRaw.startsWith('www.') ||
      raw.includes('/') ||
      lowerRaw.includes(domain);

    if (looksLikeUrl) {
      const extracted = extractSocialHandle(platform, raw);
      if (extracted) {
        emitChange(extracted);
      } else {
        // URL ainda incompleta: mantém o texto bruto para continuar digitando
        setHandle(raw);
      }
      return;
    }

    // Handle puro: mantém apenas caracteres válidos (@ inicial vira handle)
    const typed = raw
      .replace(/^@+/, '')
      .replace(/[^a-zA-Z0-9_.]/g, '')
      .toLowerCase();
    emitChange(typed);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    const extracted = extractSocialHandle(platform, pasted);
    if (extracted) {
      // Colou URL ou @handle: substitui o campo pelo handle puro
      e.preventDefault();
      emitChange(extracted);
    }
    // Se nada foi extraído, deixa o onChange sanitizar normalmente
  };

  const handleBlur = () => {
    // Garante que qualquer sobra (ex: paste parcial) vire handle puro
    const extracted = extractSocialHandle(platform, handle);
    if (extracted !== handle) {
      emitChange(extracted);
    }
  };

  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-xs font-medium text-slate-600 mb-1">
          {label}
        </label>
      )}
      <div className="flex items-center w-full h-12 rounded-xl border border-slate-200 bg-white transition focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-200">
        <Icon size={18} className="ml-4 flex-shrink-0 text-slate-400" />
        <span className="ml-2 flex-shrink-0 text-sm font-medium text-slate-400 select-none">
          {prefix}
        </span>
        <input
          id={id}
          type="text"
          value={handle}
          onChange={handleChange}
          onPaste={handlePaste}
          onBlur={handleBlur}
          placeholder={placeholder}
          autoComplete="off"
          className="flex-1 min-w-0 h-full pr-4 bg-transparent text-sm focus:outline-none"
        />
      </div>
    </div>
  );
}
