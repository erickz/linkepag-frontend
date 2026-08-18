'use client';

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuth, useProtectedRoute } from '@/hooks/useAuth';
import { useApiParallel } from '@/hooks/useApi';
import { getProfile, getLinks, markPageLinkCopied, CACHE_KEYS } from '@/lib/api';
import { extractSocialHandle } from '@/lib/masks';
import { openSocialProfile } from '@/lib/share';
import { PagePreview, PagePreviewData, PagePreviewLink } from '@/components/PagePreview';
import { OnboardingProgress, onboardingSteps } from '@/components/OnboardingProgress';
import {
  IconCheck,
  IconCopy,
  IconWhatsApp,
  IconAlert,
  IconEye,
  IconArrowRight,
  IconInstagram,
  IconTiktok,
} from '@/components/icons';

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

// Perfil retornado por getProfile (campos usados nesta tela)
interface ConclusaoProfile extends PagePreviewData {
  activePaymentMethod?: 'mercadopago' | 'pix_direct' | null;
  mercadoPagoConfigured?: boolean;
}

type LinksResponse = PagePreviewLink[] | { links?: PagePreviewLink[] };

type SharePlatform = 'instagram' | 'tiktok';

// Rede preenchida no perfil, pronta para o deep link de compartilhamento
interface ShareTarget {
  platform: SharePlatform;
  handle: string;
  label: string;
}

// Feedback de cópia por botão: plataforma específica, whatsapp ou botão genérico
type CopiedTarget = SharePlatform | 'whatsapp' | 'generic';

export default function OnboardingConclusaoPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  useProtectedRoute('/login');

  const queries = useMemo(() => ({
    profile: { key: CACHE_KEYS.PROFILE, fetchFn: getProfile },
    links: { key: CACHE_KEYS.LINKS, fetchFn: getLinks },
  }), []);

  const { data, isLoading } = useApiParallel<{ profile: ConclusaoProfile; links: LinksResponse }>(queries, {
    enabled: isAuthenticated,
  });

  const profile = data?.profile;
  const links: PagePreviewLink[] = useMemo(() => {
    const raw = data?.links;
    return Array.isArray(raw) ? raw : (raw?.links || []);
  }, [data?.links]);

  // Redes do perfil que ganham botão de compartilhamento com deep link
  const shareTargets: ShareTarget[] = useMemo(() => {
    const targets: ShareTarget[] = [];
    const instagram = extractSocialHandle('instagram', profile?.socialLinks?.instagram);
    const tiktok = extractSocialHandle('tiktok', profile?.socialLinks?.tiktok);
    if (instagram) targets.push({ platform: 'instagram', handle: instagram, label: 'Instagram' });
    if (tiktok) targets.push({ platform: 'tiktok', handle: tiktok, label: 'TikTok' });
    return targets;
  }, [profile?.socialLinks]);

  const [copiedTarget, setCopiedTarget] = useState<CopiedTarget | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const publicUrl = profile?.username ? `/p/${profile.username}` : '#';
  const fullPublicUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${publicUrl}`
    : publicUrl;
  const whatsAppShareUrl = `https://wa.me/?text=${encodeURIComponent(`Dá uma olhada na minha página: ${fullPublicUrl}`)}`;

  // Feedback "copiado" por ~3s no botão clicado
  const flashCopied = useCallback((target: CopiedTarget) => {
    setCopiedTarget(target);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopiedTarget(null), 3000);
  }, []);

  // Botão genérico: só copia o link (tracking fire-and-forget)
  const handleCopyLink = useCallback(async () => {
    const ok = await copyToClipboard(fullPublicUrl);
    if (!ok) return;
    flashCopied('generic');
    markPageLinkCopied().catch(() => {});
  }, [fullPublicUrl, flashCopied]);

  // Botão por rede: copia o link, abre o perfil no app/web e trackeia
  const handleCopyAndOpen = useCallback(async (target: ShareTarget) => {
    const ok = await copyToClipboard(fullPublicUrl);
    if (!ok) return;
    flashCopied(target.platform);
    openSocialProfile(target.platform, target.handle);
    markPageLinkCopied().catch(() => {});
  }, [fullPublicUrl, flashCopied]);

  // Botão WhatsApp: compartilha o link direto no app/web
  const handleShareWhatsApp = useCallback(async () => {
    const ok = await copyToClipboard(fullPublicUrl);
    if (!ok) return;
    flashCopied('whatsapp');
    window.open(whatsAppShareUrl, '_blank', 'noopener,noreferrer');
    markPageLinkCopied().catch(() => {});
  }, [fullPublicUrl, flashCopied, whatsAppShareUrl]);

  if (isAuthLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  // Verifica o que falta para a página estar 100% (usuário pode ter pulado etapas)
  const hasPayment = !!(profile?.pixKey || profile?.mercadoPagoConfigured || profile?.activePaymentMethod);
  const hasLinks = links.length > 0;
  const isComplete = hasPayment && hasLinks;

  return (
    <div>
      {/* Última etapa do onboarding: divulgação (somente exibição) */}
      <OnboardingProgress
        steps={onboardingSteps}
        completedStepIds={['profile', 'payment', 'link']}
        currentStepId="share"
        readOnly
        title="Sua página está no ar 🎉"
        subtitle="Agora o passo que separa você da primeira venda: cole seu link na bio."
      />

      {/* Aviso amigável quando o usuário pulou etapas */}
      {!isComplete && (
        <div className="mb-6 p-4 rounded-xl border bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-100 flex-shrink-0">
              <IconAlert className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-amber-900">Quase lá! Falta pouco para sua página ficar 100%</p>
              <ul className="text-sm text-amber-700 mt-1 space-y-1">
                {!hasPayment && (
                  <li>
                    • Você ainda não configurou como quer receber.{' '}
                    <Link href="/admin/settings/payments" className="font-medium underline hover:text-amber-900">
                      Configurar recebimento
                    </Link>
                  </li>
                )}
                {!hasLinks && (
                  <li>
                    • Você ainda não criou nenhum link.{' '}
                    <Link href="/admin/editor" className="font-medium underline hover:text-amber-900">
                      Criar meu primeiro link
                    </Link>
                  </li>
                )}
              </ul>
              <p className="text-xs text-amber-600 mt-2">
                Sem isso, seus visitantes não conseguem te pagar — resolva antes de divulgar.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Preview ao vivo da página pública */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 lg:sticky lg:top-6">
          <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <IconEye className="w-5 h-5 text-indigo-600" /> Sua página
          </h3>
          <PagePreview data={profile || {}} links={links} />
        </div>

        {/* Divulgação */}
        <div className="space-y-6">
          {/* Compartilhamento principal: copiar link + colar na bio */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-bold text-slate-900 text-lg mb-1">Compartilhe para começar a vender</h3>
            <p className="text-sm text-slate-500 mb-4">
              Um toque copia seu link e abre sua rede. Depois é só colar na bio.
            </p>

            <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 mb-4 truncate">
              {fullPublicUrl}
            </p>

            {/*
              Prioridade de compartilhamento:
              1) Instagram (se preenchido)
              2) TikTok (se preenchido)
              3) WhatsApp (fallback quando não há rede social)
            */}
            {(() => {
              const primaryTarget = shareTargets[0] ?? null;
              const secondaryTargets = shareTargets.slice(1);
              const isCopiedPrimary = primaryTarget
                ? copiedTarget === primaryTarget.platform
                : copiedTarget === 'whatsapp';

              return (
                <>
                  <div className="space-y-3">
                    {primaryTarget ? (
                      <button
                        onClick={() => handleCopyAndOpen(primaryTarget)}
                        className={`w-full h-12 px-4 rounded-xl font-semibold text-sm text-white transition-all duration-200 flex items-center justify-center gap-2 ${
                          isCopiedPrimary
                            ? 'bg-emerald-500'
                            : primaryTarget.platform === 'instagram'
                              ? 'bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:opacity-90'
                              : 'bg-slate-900 hover:bg-slate-800'
                        }`}
                      >
                        {isCopiedPrimary ? (
                          <>
                            <IconCheck className="w-4 h-4" />
                            Link copiado! Agora cole na bio ✂️
                          </>
                        ) : (
                          <>
                            {primaryTarget.platform === 'instagram' ? (
                              <IconInstagram className="w-4 h-4" />
                            ) : (
                              <IconTiktok className="w-4 h-4" />
                            )}
                            Copiar link e abrir {primaryTarget.label}
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={handleShareWhatsApp}
                        className={`w-full h-12 px-4 rounded-xl font-semibold text-sm text-white transition-all duration-200 flex items-center justify-center gap-2 ${
                          isCopiedPrimary
                            ? 'bg-emerald-500'
                            : 'bg-emerald-600 hover:bg-emerald-700'
                        }`}
                      >
                        {isCopiedPrimary ? (
                          <>
                            <IconCheck className="w-4 h-4" />
                            Link copiado! Agora cole na bio ✂️
                          </>
                        ) : (
                          <>
                            <IconWhatsApp className="w-4 h-4" />
                            Compartilhar no WhatsApp
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Outras formas de divulgar (secundário) */}
                  {(secondaryTargets.length > 0 || primaryTarget) && (
                    <div className="mt-4 space-y-3">
                      {secondaryTargets.map((target) => {
                        const isCopied = copiedTarget === target.platform;
                        return (
                          <button
                            key={target.platform}
                            onClick={() => handleCopyAndOpen(target)}
                            className={`w-full h-11 px-4 rounded-xl font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                              isCopied
                                ? 'bg-emerald-500 text-white'
                                : target.platform === 'instagram'
                                  ? 'bg-pink-50 text-pink-700 border border-pink-200 hover:bg-pink-100'
                                  : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {isCopied ? (
                              <>
                                <IconCheck className="w-4 h-4" />
                                Link copiado!
                              </>
                            ) : (
                              <>
                                {target.platform === 'instagram' ? (
                                  <IconInstagram className="w-4 h-4" />
                                ) : (
                                  <IconTiktok className="w-4 h-4" />
                                )}
                                Copiar link e abrir {target.label}
                              </>
                            )}
                          </button>
                        );
                      })}

                      {primaryTarget && (
                        <button
                          onClick={handleShareWhatsApp}
                          className={`w-full h-11 px-4 rounded-xl font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                            copiedTarget === 'whatsapp'
                              ? 'bg-emerald-500 text-white'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          {copiedTarget === 'whatsapp' ? (
                            <>
                              <IconCheck className="w-4 h-4" />
                              Link copiado!
                            </>
                          ) : (
                            <>
                              <IconWhatsApp className="w-4 h-4" />
                              Compartilhar no WhatsApp
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </>
              );
            })()}

            {/* Como colar na bio */}
            <ol className="mt-5 space-y-2.5">
              {[
                'Link copiado automaticamente',
                'No app, toque em Editar perfil',
                'Cole no campo Site/Link da bio',
              ].map((text, index) => (
                <li key={text} className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </span>
                  <p className="text-sm text-slate-600">{text}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* Fallback discreto: copiar link puro (quando há rede principal) */}
          {shareTargets.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-bold text-slate-900 mb-1">Ou copie o link puro</h3>
              <p className="text-xs text-slate-500 mb-4">
                Para colar onde você quiser.
              </p>
              <button
                onClick={handleCopyLink}
                className={`w-full h-11 px-4 rounded-xl font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                  copiedTarget === 'generic'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {copiedTarget === 'generic' ? (
                  <>
                    <IconCheck className="w-4 h-4" />
                    Link copiado!
                  </>
                ) : (
                  <>
                    <IconCopy className="w-4 h-4" />
                    Copiar meu link
                  </>
                )}
              </button>
            </div>
          )}

          {/* CTA discreto para o dashboard */}
          <div className="text-center">
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 transition font-medium"
            >
              Ir para o dashboard
              <IconArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
