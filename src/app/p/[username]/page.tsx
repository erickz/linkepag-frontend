'use client';

import { useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useApi } from '@/hooks/useApi';
import { getPublicProfile, trackPageView, trackLinkView, CACHE_KEYS } from '@/lib/api';
import PublicProfileView, { ApiLink, SocialLinks } from '@/components/PublicProfileView';
import { IconInbox } from '@/components/icons';
import { trackOrQueue } from '@/lib/pixel-queue';
import { resolveTheme, resolveButtonStyleId, AppearanceInput } from '@/lib/themes';

interface PublicProfile {
  username: string;
  displayName?: string;
  bio?: string;
  profilePhoto?: string;
  location?: string;
  socialLinks?: SocialLinks;
  links: ApiLink[];
  mercadoPagoPublicKey?: string;
  mercadoPagoConfigured?: boolean;
  pixConfigured?: boolean;
  pixKey?: string;
  pixKeyType?: string;
  pixQRCodeImage?: string;
  showPixOnPage?: boolean;
  pixButtonText?: string;
  activePaymentMethod?: 'mercadopago' | 'pix_direct' | null;
  canReceivePayments?: boolean; // Indica se o vendedor pode receber pagamentos (billing em dia)
  isDemoUser?: boolean; // Página demo: não dispara eventos de conversão no Meta
  appearanceSettings?: AppearanceInput;
}

function sanitizeUsername(username: string | string[] | undefined): string {
  if (!username) return 'Creator';

  const usernameStr = Array.isArray(username) ? username[0] : username;

  try {
    const decoded = decodeURIComponent(usernameStr);
    const cleaned = decoded
      .replace(/[^a-zA-Z0-9\s\-_]/g, '')
      .trim()
      .replace(/\s+/g, ' ');

    return cleaned || 'Creator';
  } catch {
    return usernameStr
      .replace(/[^a-zA-Z0-9\s\-_]/g, '')
      .trim() || 'Creator';
  }
}

export default function PublicPage() {
  const params = useParams();
  const username = sanitizeUsername(params.username);

  // Hook otimizado com cache para carregar perfil público
  const {
    data: profile,
    isLoading,
    error
  } = useApi<PublicProfile>(
    CACHE_KEYS.PUBLIC_PROFILE(username),
    () => getPublicProfile(username),
    {
      enabled: !!username && username !== 'Creator',
    }
  );

  // Tracking: ViewContent quando perfil público carrega
  useEffect(() => {
    if (profile && !isLoading) {
      const contentIds = profile.links
        ?.filter((l: ApiLink) => l.isActive)
        .map((l: ApiLink) => l._id || l.id)
        .slice(0, 5);

      if (!profile.isDemoUser) {
        trackOrQueue('meta', 'ViewContent', {
          content_name: profile.displayName || profile.username,
          content_type: 'profile',
          content_ids: contentIds,
          value: 0,
          currency: 'BRL',
        });
      }
      trackOrQueue('tiktok', 'ViewContent', {
        content_name: profile.displayName || profile.username,
        content_type: 'product',
        content_id: profile.username,
      });
    }
  }, [profile, isLoading]);

  // Analytics: registra visita uma vez por sessão por username
  useEffect(() => {
    if (profile && !isLoading && typeof window !== 'undefined') {
      const key = `lp_view_${profile.username}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        trackPageView(profile.username).catch(() => {});
      }
    }
  }, [profile, isLoading]);

  // Analytics: registra impressão (link_view) de cada link pago visível,
  // uma vez por sessão por link
  useEffect(() => {
    if (profile && !isLoading && typeof window !== 'undefined') {
      profile.links
        ?.filter((l: ApiLink) => l.isActive && (l.template === 'paid_access' || l.template === 'digital_product'))
        .forEach((l: ApiLink) => {
          const id = l._id || l.id;
          const key = `lp_lview_${id}`;
          if (!sessionStorage.getItem(key)) {
            sessionStorage.setItem(key, '1');
            trackLinkView(id);
          }
        });
    }
  }, [profile, isLoading]);

  // Tema resolvido a partir do appearanceSettings do perfil.
  // Antes do load (ou sem tema salvo), cai no default (porcelain) — sem flash de cor.
  const theme = useMemo(
    () => resolveTheme(profile?.appearanceSettings),
    [profile?.appearanceSettings]
  );
  const buttonStyle = useMemo(
    () => resolveButtonStyleId(profile?.appearanceSettings),
    [profile?.appearanceSettings]
  );

  // Memoizar links ordenados para evitar re-computação
  const activeLinks = useMemo(() => {
    return profile?.links
      ?.filter(link => link.isActive)
      .sort((a, b) => a.order - b.order) || [];
  }, [profile?.links]);

  // Determinar configuração de pagamento ativa
  // Regra: Usa o método que o usuário escolheu como ativo (activePaymentMethod)
  // Se não houver preferência definida, verifica qual está configurado
  const paymentConfig = useMemo(() => {
    // mercadoPagoConfigured agora considera tanto OAuth quanto credenciais legadas
    const hasMP = !!profile?.mercadoPagoConfigured;
    const hasPix = !!(profile?.pixConfigured && profile?.pixKey);
    const activeMethod = profile?.activePaymentMethod;

    // Se o usuário tem uma preferência definida, use-a
    // Caso contrário, use o que estiver configurado (MP tem preferência se ambos)
    let useMP = false;
    let usePix = false;

    if (activeMethod === 'mercadopago' && hasMP) {
      useMP = true;
    } else if (activeMethod === 'pix_direct' && hasPix) {
      usePix = true;
    } else if (hasMP) {
      useMP = true;
    } else if (hasPix) {
      usePix = true;
    }

    return {
      mercadoPagoConfigured: useMP,
      pixConfigured: usePix,
      mercadoPagoPublicKey: useMP ? profile?.mercadoPagoPublicKey : undefined,
      pixKey: usePix ? profile?.pixKey : undefined,
      pixKeyType: usePix ? profile?.pixKeyType : undefined,
      pixQRCodeImage: usePix ? profile?.pixQRCodeImage : undefined,
      canReceivePayments: profile?.canReceivePayments ?? true,
    };
  }, [profile]);

  if (isLoading) {
    return (
      <main className={`min-h-screen flex items-center justify-center ${theme.page.backgroundClass}`}>
        <div className="bg-white/60 backdrop-blur-lg rounded-3xl p-8 shadow-xl shadow-stone-300/40">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-stone-300 border-t-stone-500"></div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className={`min-h-screen flex items-center justify-center p-4 ${theme.page.backgroundClass}`}>
        <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <IconInbox className="w-8 h-8 text-rose-500" />
          </div>
          <h1 className="text-slate-900 text-xl font-bold mb-2">Perfil não encontrado</h1>
          <p className="text-slate-500 mb-6">{error.message || 'Erro ao carregar perfil'}</p>
          <Link
            href="/"
            className="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition"
          >
            Voltar para o início
          </Link>
        </div>
      </main>
    );
  }

  return (
    <PublicProfileView
      username={profile?.username ?? username}
      displayName={profile?.displayName}
      bio={profile?.bio}
      location={profile?.location}
      profilePhoto={profile?.profilePhoto}
      socialLinks={profile?.socialLinks}
      links={activeLinks}
      theme={theme}
      buttonStyle={buttonStyle}
      mercadoPagoPublicKey={paymentConfig.mercadoPagoPublicKey}
      mercadoPagoConfigured={paymentConfig.mercadoPagoConfigured}
      pixConfigured={paymentConfig.pixConfigured}
      // pixKey/pixKeyType/pixQRCodeImage vão crus (não os de paymentConfig): o botão
      // "Me mande um PIX" da página é independente do método ativo dos links.
      // O checkout inline continua protegido pelo flag pixConfigured (paymentConfig).
      pixKey={profile?.pixKey}
      pixKeyType={profile?.pixKeyType}
      pixQRCodeImage={profile?.pixQRCodeImage}
      canReceivePayments={paymentConfig.canReceivePayments}
      isDemoUser={profile?.isDemoUser}
      showPixOnPage={profile?.showPixOnPage}
      pixButtonText={profile?.pixButtonText}
    />
  );
}
