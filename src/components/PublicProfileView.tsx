'use client';

import { memo, useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import LinkButton from '@/components/LinkButton';
import PixCopyButton from '@/components/PixCopyButton';
import {
  IconUser,
  IconLocation,
  IconInstagram,
  IconYoutube,
  IconTiktok,
  IconTwitter,
  IconLinkedin,
  IconGithub,
  IconGlobe,
  IconExternalLink,
} from '@/components/icons';
import {
  ResolvedTheme,
  ResolvedButton,
  ButtonStyleId,
  resolveButton,
  resolveButtonRadius,
} from '@/lib/themes';
import { normalizeSocialUrl } from '@/lib/masks';

/** Link público retornado pela API (shape consumido pela página e pelo preview). */
export interface ApiLink {
  id: string;
  _id?: string;
  title: string;
  description?: string;
  url: string;
  icon?: string;
  order: number;
  isActive: boolean;
  openInNewTab?: boolean;
  template?: 'direct' | 'paid_access' | 'digital_product' | 'scheduling';
  type?: 'free' | 'paid';
  isPaid?: boolean;
  price?: number;
}

/** Redes sociais exibidas na página pública. */
export interface SocialLinks {
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  twitter?: string;
  linkedin?: string;
  github?: string;
  website?: string;
}

/**
 * Visão APRESENTACIONAL da página pública do usuário.
 * Toda a aparência vem do sistema de temas (themes.ts) — nenhuma classe de cor
 * é decidida aqui. Usada pela rota /p/[username] e pelo preview do editor.
 */
export interface PublicProfileViewProps {
  username: string;
  displayName?: string;
  bio?: string;
  location?: string;
  profilePhoto?: string;
  socialLinks?: SocialLinks;
  /** Links já filtrados (isActive) e ordenados pelo caller */
  links: ApiLink[];
  theme: ResolvedTheme;
  buttonStyle: ButtonStyleId;
  // Pagamento (para o checkout inline dos links pagos)
  mercadoPagoPublicKey?: string;
  mercadoPagoConfigured?: boolean;
  pixConfigured?: boolean;
  pixKey?: string;
  pixKeyType?: string;
  pixQRCodeImage?: string;
  canReceivePayments?: boolean;
  isDemoUser?: boolean;
  // Botão "Me mande um PIX" na página (independente do método ativo dos links)
  showPixOnPage?: boolean;
  pixButtonText?: string;
  /** false = preview: links não navegam e checkout não expande */
  interactive?: boolean;
  /** Preview pode limitar a quantidade de links exibidos */
  maxLinks?: number;
}

const getSocialIcon = (platform: string) => {
  const iconClass = "w-5 h-5";
  switch (platform) {
    case 'instagram': return <IconInstagram className={iconClass} />;
    case 'youtube': return <IconYoutube className={iconClass} />;
    case 'tiktok': return <IconTiktok className={iconClass} />;
    case 'twitter': return <IconTwitter className={iconClass} />;
    case 'linkedin': return <IconLinkedin className={iconClass} />;
    case 'github': return <IconGithub className={iconClass} />;
    case 'website': return <IconGlobe className={iconClass} />;
    default: return null;
  }
};

// Hovers de marca das redes sociais (fixos, independentes do tema)
const getSocialColor = (platform: string): string => {
  switch (platform) {
    case 'instagram': return 'hover:bg-gradient-to-br hover:from-purple-500 hover:via-pink-500 hover:to-orange-400 hover:text-white hover:border-transparent';
    case 'youtube': return 'hover:bg-red-600 hover:text-white hover:border-transparent';
    case 'tiktok': return 'hover:bg-black hover:text-white hover:border-transparent';
    case 'twitter': return 'hover:bg-slate-900 hover:text-white hover:border-transparent';
    case 'linkedin': return 'hover:bg-blue-600 hover:text-white hover:border-transparent';
    case 'github': return 'hover:bg-slate-800 hover:text-white hover:border-transparent';
    case 'website': return 'hover:bg-emerald-500 hover:text-white hover:border-transparent';
    default: return 'hover:bg-slate-100';
  }
};

// Avatar memoizado para evitar re-renderizações
const ProfileAvatar = memo(function ProfileAvatar({
  profilePhoto,
  username,
  displayName,
}: {
  profilePhoto?: string;
  username: string;
  displayName?: string;
}) {
  return (
    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full shadow-xl border-4 border-white overflow-hidden bg-white mx-auto relative">
      {profilePhoto ? (
        <Image
          src={profilePhoto}
          alt={displayName || username}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 96px, 128px"
          priority // LCP element - carregar com prioridade
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center">
          <IconUser className="w-12 h-12 sm:w-16 sm:h-16 text-stone-300" />
        </div>
      )}
    </div>
  );
});

// Botão de rede social memoizado (base do tema + hover de marca fixo)
const SocialLink = memo(function SocialLink({
  platform,
  url,
  buttonClass,
}: {
  platform: string;
  url: string;
  buttonClass: string;
}) {
  const handleClick = useCallback(() => {
    // Preconnect para melhorar performance de navegação
  }, []);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all duration-200 cursor-pointer ${buttonClass} ${getSocialColor(platform)}`}
      title={platform.charAt(0).toUpperCase() + platform.slice(1)}
    >
      {getSocialIcon(platform)}
    </a>
  );
});

// Lista de links memoizada
const LinksList = memo(function LinksList({
  links,
  expandedId,
  onToggle,
  theme,
  button,
  buttonStyle,
  buttonRadiusClass,
  interactive,
  mercadoPagoPublicKey,
  mercadoPagoConfigured,
  pixConfigured,
  pixKey,
  pixKeyType,
  pixQRCodeImage,
  canReceivePayments,
  isDemoUser,
}: {
  links: ApiLink[];
  expandedId: string | null;
  onToggle: (id: string) => void;
  theme: ResolvedTheme;
  button: ResolvedButton;
  buttonStyle: ButtonStyleId;
  buttonRadiusClass: string;
  interactive: boolean;
  mercadoPagoPublicKey?: string;
  mercadoPagoConfigured?: boolean;
  pixConfigured?: boolean;
  pixKey?: string;
  pixKeyType?: string;
  pixQRCodeImage?: string;
  canReceivePayments?: boolean;
  isDemoUser?: boolean;
}) {
  if (links.length === 0) {
    return null;
  }

  return (
    <>
      {links.map((link) => (
        <LinkButton
          key={link._id || link.id}
          link={{
            ...link,
            id: link._id || link.id,
          }}
          isExpanded={expandedId === (link._id || link.id)}
          onToggle={() => onToggle(link._id || link.id)}
          accent={theme.accent}
          buttonContainerClass={button.containerClass}
          iconTileClass={button.iconTileClass}
          buttonRadiusClass={buttonRadiusClass}
          buttonStyle={buttonStyle}
          interactive={interactive}
          mercadoPagoPublicKey={mercadoPagoPublicKey}
          mercadoPagoConfigured={mercadoPagoConfigured}
          pixConfigured={pixConfigured}
          pixKey={pixKey}
          pixKeyType={pixKeyType}
          pixQRCodeImage={pixQRCodeImage}
          canReceivePayments={canReceivePayments}
          isDemoUser={isDemoUser}
        />
      ))}
    </>
  );
});

function PublicProfileViewComponent({
  username,
  displayName,
  bio,
  location,
  profilePhoto,
  socialLinks,
  links,
  theme,
  buttonStyle,
  mercadoPagoPublicKey,
  mercadoPagoConfigured,
  pixConfigured,
  pixKey,
  pixKeyType,
  pixQRCodeImage,
  canReceivePayments,
  isDemoUser,
  showPixOnPage,
  pixButtonText,
  interactive = true,
  maxLinks,
}: PublicProfileViewProps) {
  // Estado de expansão do checkout inline (um link aberto por vez)
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleToggle = useCallback((id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  }, []);

  // Botões de link: paleta do tema + estilo escolhido, resolvidos uma vez
  const button = useMemo(() => resolveButton(theme, buttonStyle), [theme, buttonStyle]);
  const buttonRadiusClass = useMemo(() => resolveButtonRadius(buttonStyle), [buttonStyle]);

  // Preview pode exibir só os N primeiros links
  const visibleLinks = useMemo(
    () => (maxLinks ? links.slice(0, maxLinks) : links),
    [links, maxLinks],
  );

  return (
    <main className={`min-h-screen ${theme.page.backgroundClass} relative overflow-hidden`} suppressHydrationWarning>
      {/* Blobs decorativos suaves do tema */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute -top-32 -right-32 w-[28rem] h-[28rem] rounded-full blur-3xl ${theme.page.blobClassA}`} />
        <div className={`absolute top-1/3 -left-40 w-[24rem] h-[24rem] rounded-full blur-3xl ${theme.page.blobClassB}`} />
        <div className={`absolute -bottom-32 right-1/4 w-[22rem] h-[22rem] rounded-full blur-3xl ${theme.page.blobClassA}`} />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-4 py-4">
        {/* Card do perfil */}
        <div className={`${theme.card.containerClass} overflow-hidden`}>
          {/* Banner do cabeçalho - gradiente do tema */}
          <div className={`h-24 sm:h-32 bg-gradient-to-r ${theme.header.gradientClass}`} />

          {/* Informações do perfil */}
          <div className="px-6 pb-6">
            {/* Avatar - componente memoizado com Next.js Image */}
            <div className="relative -mt-12 sm:-mt-16 mb-4">
              <ProfileAvatar
                profilePhoto={profilePhoto}
                username={username}
                displayName={displayName}
              />
            </div>

            {/* Nome & infos */}
            <div className="text-center mb-6 min-w-0">
              <h1 className={`text-2xl sm:text-3xl font-bold mb-1 break-words ${theme.text.primaryClass}`}>
                @{username}
              </h1>

              {displayName && (
                <p className={`text-lg font-medium mb-2 break-words ${theme.text.nameAccentClass}`}>
                  {displayName}
                </p>
              )}

              {bio && (
                <p className={`text-sm sm:text-base leading-relaxed max-w-md mx-auto break-words ${theme.text.secondaryClass}`}>
                  {bio}
                </p>
              )}

              {location && (
                <div className={`flex items-center justify-center gap-1.5 text-sm mt-2 ${theme.text.mutedClass}`}>
                  <IconLocation className="w-4 h-4 flex-shrink-0" />
                  <span className="break-words">{location}</span>
                </div>
              )}
            </div>

            {/* Redes sociais - componentes memoizados */}
            {socialLinks && Object.values(socialLinks).some(url => url) && (
              <div className="flex items-center justify-center flex-wrap gap-2 mb-8">
                {Object.entries(socialLinks)
                  .filter(([platform]) => ['instagram', 'tiktok', 'youtube', 'twitter', 'linkedin', 'github', 'website'].includes(platform))
                  .map(([platform, url]) => {
                    const normalizedUrl = normalizeSocialUrl(platform, url);
                    if (!normalizedUrl) return null;
                    return (
                      <SocialLink
                        key={platform}
                        platform={platform}
                        url={normalizedUrl}
                        buttonClass={theme.social.buttonClass}
                      />
                    );
                  })}
              </div>
            )}

            {/* Botão "Me mande um PIX" - independente do método de pagamento ativo
                dos links (pode coexistir com MP). */}
            {showPixOnPage && pixKey && (
              <div className="mb-8">
                <PixCopyButton pixKey={pixKey} username={username} buttonText={pixButtonText} buttonStyle={buttonStyle} />
              </div>
            )}

            {/* Links - lista memoizada */}
            <div className="space-y-3">
              <LinksList
                links={visibleLinks}
                expandedId={expandedId}
                onToggle={handleToggle}
                theme={theme}
                button={button}
                buttonStyle={buttonStyle}
                buttonRadiusClass={buttonRadiusClass}
                interactive={interactive}
                mercadoPagoPublicKey={mercadoPagoPublicKey}
                mercadoPagoConfigured={mercadoPagoConfigured}
                pixConfigured={pixConfigured}
                pixKey={pixKey}
                pixKeyType={pixKeyType}
                pixQRCodeImage={pixQRCodeImage}
                canReceivePayments={canReceivePayments}
                isDemoUser={isDemoUser}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <Link
            href="/" target="_blank" rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 text-sm transition group ${theme.text.secondaryClass} hover:text-stone-700`}
          >
            <span className="font-medium">LinkePag</span>
            <IconExternalLink className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </main>
  );
}

// Exportar versão memoizada do componente
const PublicProfileView = memo(PublicProfileViewComponent);

export default PublicProfileView;
