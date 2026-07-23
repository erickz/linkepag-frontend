'use client';

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuth, useProtectedRoute } from '@/hooks/useAuth';
import { useApiParallel } from '@/hooks/useApi';
import { getProfile, getLinks, CACHE_KEYS } from '@/lib/api';
import { PagePreview, PagePreviewData, PagePreviewLink } from '@/components/PagePreview';
import { PageHeader } from '@/components/PageHeader';
import {
  IconCheck,
  IconCopy,
  IconExternalLink,
  IconWhatsApp,
  IconAlert,
  IconEye,
  IconArrowRight,
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

  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const publicUrl = profile?.username ? `/p/${profile.username}` : '#';
  const fullPublicUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${publicUrl}`
    : publicUrl;

  const handleCopyLink = useCallback(async () => {
    const ok = await copyToClipboard(fullPublicUrl);
    if (!ok) return;
    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), 3000);
  }, [fullPublicUrl]);

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

  const whatsAppShareUrl = `https://wa.me/?text=${encodeURIComponent(`Dá uma olhada na minha página: ${fullPublicUrl}`)}`;

  return (
    <div>
      <PageHeader
        title="Deu certo! Sua página está no ar 🎉"
        description="Agora é só espalhar seu link por aí e começar a monetizar"
        breadcrumbs={[{ label: 'Onboarding' }, { label: 'Conclusão' }]}
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

        {/* Instruções de divulgação */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-bold text-slate-900 text-lg mb-1">Bora divulgar?</h3>
            <p className="text-sm text-slate-500 mb-6">São 3 passos rápidos para o seu link chegar na sua audiência:</p>

            <ol className="space-y-5">
              {/* Passo 1 */}
              <li className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">
                  1
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900">Copie o link da sua página</p>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{fullPublicUrl}</p>
                  <button
                    onClick={handleCopyLink}
                    className={`mt-3 w-full h-11 px-4 rounded-xl font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                      copied
                        ? 'bg-emerald-500 text-white'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    {copied ? (
                      <>
                        <IconCheck className="w-4 h-4" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <IconCopy className="w-4 h-4" />
                        Copiar meu link
                      </>
                    )}
                  </button>
                </div>
              </li>

              {/* Passo 2 */}
              <li className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">
                  2
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900">Cole na bio do Instagram ou TikTok</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    É lá que seus seguidores procuram seus links. Trocou a bio, pronto!
                  </p>
                </div>
              </li>

              {/* Passo 3 */}
              <li className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">
                  3
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900">Compartilhe no WhatsApp</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Mande nos grupos e no status — quanto mais gente vê, mais você vende.
                  </p>
                  <div className="mt-3 flex flex-col sm:flex-row gap-2">
                    <a
                      href={whatsAppShareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 h-11 px-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-medium text-sm hover:bg-emerald-100 transition flex items-center justify-center gap-2"
                    >
                      <IconWhatsApp className="w-4 h-4" />
                      Compartilhar no WhatsApp
                    </a>
                    <Link
                      href={publicUrl}
                      target="_blank"
                      className="h-11 px-4 bg-slate-100 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-200 transition flex items-center justify-center gap-2"
                    >
                      <IconExternalLink className="w-4 h-4" />
                      Abrir minha página
                    </Link>
                  </div>
                </div>
              </li>
            </ol>
          </div>

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
