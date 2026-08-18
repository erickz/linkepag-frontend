'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { copyToClipboard } from '@/lib/clipboard';
import { extractSocialHandle } from '@/lib/masks';
import { openSocialProfile } from '@/lib/share';
import { IconCheck, IconCopy, IconInstagram, IconTiktok } from '@/components/icons';

type SharePlatform = 'instagram' | 'tiktok';

interface SharePageButtonsProps {
  username: string;
  socialLinks?: { instagram?: string; tiktok?: string; [k: string]: string | undefined };
  // gradient: sobre o card gradiente do dashboard | default: fundos claros
  variant?: 'gradient' | 'default';
}

// Rede preenchida no perfil, pronta para o deep link de compartilhamento
interface ShareTarget {
  platform: SharePlatform;
  handle: string;
  label: string;
}

// Feedback de cópia por botão: plataforma específica ou botão genérico
type CopiedTarget = SharePlatform | 'generic';

// CTAs de divulgação da página pública: copia o link e, opcionalmente,
// abre a rede social do usuário para ele colar o link na bio.
// NUNCA chamar markPageLinkCopied aqui — esse tracking é exclusivo do onboarding.
export function SharePageButtons({ username, socialLinks, variant = 'default' }: SharePageButtonsProps) {
  const [copiedTarget, setCopiedTarget] = useState<CopiedTarget | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const fullPublicUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/p/${username}`
    : `/p/${username}`;

  // Redes do perfil que ganham botão de compartilhamento com deep link
  const shareTargets: ShareTarget[] = useMemo(() => {
    const targets: ShareTarget[] = [];
    const instagram = extractSocialHandle('instagram', socialLinks?.instagram);
    const tiktok = extractSocialHandle('tiktok', socialLinks?.tiktok);
    if (instagram) targets.push({ platform: 'instagram', handle: instagram, label: 'Instagram' });
    if (tiktok) targets.push({ platform: 'tiktok', handle: tiktok, label: 'TikTok' });
    return targets;
  }, [socialLinks]);

  // Feedback "Copiado!" por ~3s no botão clicado
  const flashCopied = useCallback((target: CopiedTarget) => {
    setCopiedTarget(target);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopiedTarget(null), 3000);
  }, []);

  // Botão genérico: só copia o link
  const handleCopyLink = useCallback(async () => {
    const ok = await copyToClipboard(fullPublicUrl);
    if (ok) flashCopied('generic');
  }, [fullPublicUrl, flashCopied]);

  // Botão por rede: copia o link e abre o perfil no app/web
  const handleCopyAndOpen = useCallback(async (target: ShareTarget) => {
    const ok = await copyToClipboard(fullPublicUrl);
    if (!ok) return;
    flashCopied(target.platform);
    openSocialProfile(target.platform, target.handle);
  }, [fullPublicUrl, flashCopied]);

  const isGradient = variant === 'gradient';
  const genericCopied = copiedTarget === 'generic';

  return (
    <>
      <button
        onClick={handleCopyLink}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition ${
          genericCopied
            ? 'bg-emerald-500 text-white'
            : isGradient
              ? 'bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
        }`}
      >
        {genericCopied ? (
          <>
            <IconCheck className="w-4 h-4" />
            Copiado!
          </>
        ) : (
          <>
            <IconCopy className="w-4 h-4" />
            Copiar link
          </>
        )}
      </button>

      {/* Botões compactos por rede: copiam o link e abrem o perfil para colar na bio */}
      {shareTargets.map((target) => {
        const isCopied = copiedTarget === target.platform;
        const idleClass = isGradient
          ? 'bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm'
          : target.platform === 'instagram'
            ? 'bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white hover:opacity-90'
            : 'bg-slate-900 text-white hover:bg-slate-800';
        return (
          <button
            key={target.platform}
            onClick={() => handleCopyAndOpen(target)}
            title={`Copiar link e abrir ${target.label}`}
            aria-label={`Copiar link e abrir ${target.label}`}
            className={`flex items-center justify-center px-3 py-2.5 rounded-xl font-medium text-sm transition ${
              isCopied ? 'bg-emerald-500 text-white' : idleClass
            }`}
          >
            {isCopied ? (
              <IconCheck className="w-4 h-4" />
            ) : target.platform === 'instagram' ? (
              <IconInstagram className="w-4 h-4" />
            ) : (
              <IconTiktok className="w-4 h-4" />
            )}
          </button>
        );
      })}
    </>
  );
}

export default SharePageButtons;
