'use client';

import { useState, useEffect, useRef, createContext, useContext, memo, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useApi } from '@/hooks/useApi';
import { getPublicProfile, CACHE_KEYS } from '@/lib/api';
import LinkButton from '@/components/LinkButton';
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
  IconInbox
} from '@/components/icons';

// Configurações de gradientes (devem corresponder às da página de aparência)
const headerGradients: Record<string, string> = {
  'indigo-purple': 'from-indigo-500 via-purple-500 to-pink-500',
  'blue-cyan': 'from-blue-500 via-cyan-500 to-teal-400',
  'rose-orange': 'from-rose-500 via-orange-500 to-amber-400',
  'emerald-teal': 'from-emerald-500 via-teal-500 to-cyan-500',
  'violet-fuchsia': 'from-violet-600 via-fuchsia-500 to-pink-500',
  'slate-zinc': 'from-slate-700 via-zinc-600 to-neutral-500',
  'red-pink': 'from-red-500 via-rose-500 to-pink-500',
  'amber-yellow': 'from-amber-400 via-yellow-400 to-lime-400',
  'chocolate-brown': 'from-amber-800 via-amber-900 to-stone-800',
  'coffee-cream': 'from-amber-700 via-amber-600 to-orange-700',
  'caramel-toffee': 'from-amber-600 via-yellow-700 to-amber-800',
  'monochrome-gray': 'from-gray-400 via-gray-600 to-gray-800',
  'monochrome-dark': 'from-neutral-500 via-neutral-800 to-black',
  'copper-bronze': 'from-orange-700 via-amber-700 to-yellow-700',
  'taupe-beige': 'from-stone-500 via-stone-600 to-amber-800',
  'espresso-roast': 'from-stone-800 via-amber-950 to-neutral-900',
};

// Cores de fundo
const backgroundOptions: Record<string, { class: string; textColor: string; isGradient: boolean }> = {
  'white': { class: 'bg-white', textColor: 'text-slate-900', isGradient: false },
  'slate-50': { class: 'bg-slate-50', textColor: 'text-slate-900', isGradient: false },
  'zinc-100': { class: 'bg-zinc-100', textColor: 'text-slate-900', isGradient: false },
  'neutral-900': { class: 'bg-neutral-900', textColor: 'text-white', isGradient: false },
  'slate-900': { class: 'bg-slate-900', textColor: 'text-white', isGradient: false },
  'indigo-950': { class: 'bg-indigo-950', textColor: 'text-white', isGradient: false },
  'indigo-100': { class: 'bg-indigo-100', textColor: 'text-slate-900', isGradient: false },
  'purple-100': { class: 'bg-purple-100', textColor: 'text-slate-900', isGradient: false },
  'pink-50': { class: 'bg-pink-50', textColor: 'text-slate-900', isGradient: false },
  'rose-50': { class: 'bg-rose-50', textColor: 'text-slate-900', isGradient: false },
  'amber-50': { class: 'bg-amber-50', textColor: 'text-slate-900', isGradient: false },
  'emerald-50': { class: 'bg-emerald-50', textColor: 'text-slate-900', isGradient: false },
  'cyan-50': { class: 'bg-cyan-50', textColor: 'text-slate-900', isGradient: false },
  'blue-50': { class: 'bg-blue-50', textColor: 'text-slate-900', isGradient: false },
  'gradient-purple': { class: 'bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100', textColor: 'text-slate-900', isGradient: true },
  'gradient-blue': { class: 'bg-gradient-to-br from-blue-100 via-cyan-100 to-teal-100', textColor: 'text-slate-900', isGradient: true },
  'gradient-sunset': { class: 'bg-gradient-to-br from-rose-100 via-orange-100 to-amber-100', textColor: 'text-slate-900', isGradient: true },
  'gradient-nature': { class: 'bg-gradient-to-br from-emerald-100 via-teal-100 to-cyan-100', textColor: 'text-slate-900', isGradient: true },
  'gradient-lavender': { class: 'bg-gradient-to-br from-indigo-200 via-purple-200 to-indigo-300', textColor: 'text-slate-900', isGradient: true },
  'gradient-dark-purple': { class: 'bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900', textColor: 'text-white', isGradient: true },
  'gradient-dark-blue': { class: 'bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900', textColor: 'text-white', isGradient: true },
  'gradient-warm': { class: 'bg-gradient-to-br from-orange-100 via-amber-100 to-yellow-100', textColor: 'text-slate-900', isGradient: true },
};

// Cores de destaque para links monetizados
const paidLinkAccentColors: Record<string, { textClass: string; borderClass: string; bgClass: string }> = {
  'amber': { textClass: 'text-amber-400', borderClass: 'border-amber-500/30', bgClass: 'bg-amber-500/20' },
  'emerald': { textClass: 'text-emerald-400', borderClass: 'border-emerald-500/30', bgClass: 'bg-emerald-500/20' },
  'rose': { textClass: 'text-rose-400', borderClass: 'border-rose-500/30', bgClass: 'bg-rose-500/20' },
  'cyan': { textClass: 'text-cyan-400', borderClass: 'border-cyan-500/30', bgClass: 'bg-cyan-500/20' },
  'violet': { textClass: 'text-violet-400', borderClass: 'border-violet-500/30', bgClass: 'bg-violet-500/20' },
  'orange': { textClass: 'text-orange-400', borderClass: 'border-orange-500/30', bgClass: 'bg-orange-500/20' },
};

interface ApiLink {
  id: string;
  _id?: string;
  title: string;
  description?: string;
  url: string;
  icon?: string;
  order: number;
  isActive: boolean;
  openInNewTab?: boolean;
  type?: 'free' | 'paid';
  isPaid?: boolean;
  price?: number;
  buttonColor?: string;
  textColor?: string;
}

interface PublicProfile {
  username: string;
  displayName?: string;
  bio?: string;
  profilePhoto?: string;
  location?: string;
  socialLinks?: {
    instagram?: string;
    tiktok?: string;
    youtube?: string;
    twitter?: string;
    linkedin?: string;
    github?: string;
    website?: string;
  };
  links: ApiLink[];
  mercadoPagoPublicKey?: string;
  mercadoPagoConfigured?: boolean;
  pixConfigured?: boolean;
  pixKey?: string;
  pixKeyType?: string;
  pixQRCodeImage?: string;
  activePaymentMethod?: 'mercadopago' | 'pix_direct' | null;
  canReceivePayments?: boolean; // Indica se o vendedor pode receber pagamentos (billing em dia)
  appearanceSettings?: {
    headerGradient?: string;
    backgroundColor?: string;
    paidLinkAccent?: string;
  };
}

interface AppearanceSettings {
  headerGradient: string;
  backgroundColor: string;
  paidLinkAccent: string;
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

// Contexto para compartilhar as configurações de aparência
const AppearanceContext = createContext<AppearanceSettings>({
  headerGradient: 'indigo-purple',
  backgroundColor: 'white',
  paidLinkAccent: 'amber',
});

export const useAppearance = () => useContext(AppearanceContext);

// Memoized Profile Avatar component para evitar re-renderizações
const ProfileAvatar = memo(function ProfileAvatar({ 
  profilePhoto, 
  username,
  displayName 
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
        <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
          <IconUser className="w-12 h-12 sm:w-16 sm:h-16 text-indigo-300" />
        </div>
      )}
    </div>
  );
});

// Memoized Social Link component
const SocialLink = memo(function SocialLink({ 
  platform, 
  url 
}: { 
  platform: string; 
  url: string;
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
      className={`w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 transition-all duration-200 cursor-pointer ${getSocialColor(platform)}`}
      title={platform.charAt(0).toUpperCase() + platform.slice(1)}
    >
      {getSocialIcon(platform)}
    </a>
  );
});

// Memoized Links List component
const LinksList = memo(function LinksList({
  links,
  expandedId,
  onToggle,
  accentColor,
  mercadoPagoPublicKey,
  mercadoPagoConfigured,
  pixConfigured,
  pixKey,
  pixKeyType,
  pixQRCodeImage,
  canReceivePayments,
}: {
  links: ApiLink[];
  expandedId: string | null;
  onToggle: (id: string) => void;
  accentColor: { textClass: string; borderClass: string; bgClass: string };
  mercadoPagoPublicKey?: string;
  mercadoPagoConfigured?: boolean;
  pixConfigured?: boolean;
  pixKey?: string;
  pixKeyType?: string;
  pixQRCodeImage?: string;
  canReceivePayments?: boolean;
}) {
  if (links.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <IconInbox className="w-8 h-8 text-slate-400" />
        </div>
        <p className="text-slate-500 font-medium">Nenhum link disponível ainda</p>
        <p className="text-slate-400 text-sm mt-1">Volte mais tarde para novidades!</p>
      </div>
    );
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
          accentColor={accentColor}
          mercadoPagoPublicKey={mercadoPagoPublicKey}
          mercadoPagoConfigured={mercadoPagoConfigured}
          pixConfigured={pixConfigured}
          pixKey={pixKey}
          pixKeyType={pixKeyType}
          pixQRCodeImage={pixQRCodeImage}
          canReceivePayments={canReceivePayments}
        />
      ))}
    </>
  );
});

export default function PublicPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Tema neutro/pálido como default para evitar flash de cor durante carregamento
  // O tema real do usuário será aplicado assim que os dados carregarem
  const [appearance, setAppearance] = useState<AppearanceSettings>({
    headerGradient: 'slate-zinc',
    backgroundColor: 'white',
    paidLinkAccent: 'amber',
  });
  const [isMounted, setIsMounted] = useState(false);
  
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

  // Carregar configurações de aparência do perfil (do usuário dono da página)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (profile?.appearanceSettings) {
      setAppearance({
        headerGradient: profile.appearanceSettings.headerGradient || 'slate-zinc',
        backgroundColor: profile.appearanceSettings.backgroundColor || 'white',
        paidLinkAccent: profile.appearanceSettings.paidLinkAccent || 'amber',
      });
    }
  }, [profile]);

  const handleToggle = useCallback((id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  }, []);

  // Memoizar links ordenados para evitar re-computação
  const activeLinks = useMemo(() => {
    return profile?.links
      ?.filter(link => link.isActive)
      .sort((a, b) => a.order - b.order) || [];
  }, [profile?.links]);

  // Obter configurações atuais - memoizadas
  const currentGradient = useMemo(() => 
    headerGradients[appearance.headerGradient] || headerGradients['slate-zinc'],
    [appearance.headerGradient]
  );
  
  const currentBg = useMemo(() => 
    backgroundOptions[appearance.backgroundColor] || backgroundOptions['white'],
    [appearance.backgroundColor]
  );
  
  const currentAccent = useMemo(() => 
    paidLinkAccentColors[appearance.paidLinkAccent] || paidLinkAccentColors['amber'],
    [appearance.paidLinkAccent]
  );
  
  // Determinar se o fundo é escuro para ajustar o footer
  const isDarkBg = currentBg.textColor === 'text-white';

  // Memoizar dados do perfil
  // Determinar configuração de pagamento ativa
  // Regra: Usa o método que o usuário escolheu como ativo (activePaymentMethod)
  // Se não houver preferência definida, verifica qual está configurado
  const paymentConfig = useMemo(() => {
    const hasMP = !!(profile?.mercadoPagoConfigured && profile?.mercadoPagoPublicKey);
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

  const profileData = useMemo(() => ({
    displayName: profile?.displayName,
    bio: profile?.bio,
    location: profile?.location,
    profilePhoto: profile?.profilePhoto,
    socialLinks: profile?.socialLinks,
    ...paymentConfig,
  }), [profile, paymentConfig]);

  if (isLoading) {
    return (
      <main className={`min-h-screen flex items-center justify-center ${currentBg.class}`}>
        <div className="bg-white/20 backdrop-blur-lg rounded-3xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500/30 border-t-indigo-600"></div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className={`min-h-screen flex items-center justify-center p-4 ${currentBg.class}`}>
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
    <AppearanceContext.Provider value={appearance}>
      <main className={`min-h-screen ${currentBg.class} relative overflow-hidden`} suppressHydrationWarning>
        {/* Geometric Background Shapes */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div 
            className={`absolute -top-1/4 -right-1/4 w-[800px] h-[800px] rotate-45 rounded-[100px] ${isDarkBg ? 'bg-white/[0.02]' : 'bg-indigo-500/[0.03]'}`}
            style={{ transform: 'rotate(45deg)' }}
          />
          <div 
            className={`absolute top-1/3 -left-1/4 w-[600px] h-[600px] ${isDarkBg ? 'bg-white/[0.015]' : 'bg-purple-500/[0.02]'}`}
            style={{ transform: 'rotate(45deg)', borderRadius: '80px' }}
          />
          <div 
            className={`absolute bottom-0 right-1/4 w-[400px] h-[400px] ${isDarkBg ? 'bg-white/[0.02]' : 'bg-pink-500/[0.025]'}`}
            style={{ transform: 'rotate(45deg)', borderRadius: '60px' }}
          />
          <div 
            className={`absolute top-2/3 right-0 w-[300px] h-[300px] ${isDarkBg ? 'bg-white/[0.01]' : 'bg-blue-500/[0.02]'}`}
            style={{ transform: 'rotate(45deg)', borderRadius: '40px' }}
          />
        </div>
        
        {/* Subtle Grid Pattern Overlay */}
        {!currentBg.isGradient && (
          <div className={`fixed inset-0 pointer-events-none ${isDarkBg ? 'opacity-[0.02]' : 'opacity-[0.015]'}`}>
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23${isDarkBg ? 'ffffff' : '000000'}' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />
          </div>
        )}

        <div className="relative z-10 max-w-lg mx-auto px-4 py-4">
          {/* Profile Card */}
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden">
            {/* Header Banner - Usa o gradiente selecionado */}
            <div className={`h-24 sm:h-32 bg-gradient-to-r ${currentGradient}`} />
            
            {/* Profile Info */}
            <div className="px-6 pb-6">
              {/* Avatar - Componente memoizado com Next.js Image */}
              <div className="relative -mt-12 sm:-mt-16 mb-4">
                <ProfileAvatar 
                  profilePhoto={profileData.profilePhoto}
                  username={username}
                  displayName={profileData.displayName}
                />
              </div>

              {/* Name & Info */}
              <div className="text-center mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold mb-1 text-slate-900">
                  @{username}
                </h1>
                
                {profileData.displayName && (
                  <p className="text-lg text-indigo-600 font-medium mb-2">
                    {profileData.displayName}
                  </p>
                )}
                
                {profileData.bio && (
                  <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-md mx-auto">
                    {profileData.bio}
                  </p>
                )}
                
                {profileData.location && (
                  <div className="flex items-center justify-center gap-1.5 text-slate-400 text-sm mt-2">
                    <IconLocation className="w-4 h-4" />
                    <span>{profileData.location}</span>
                  </div>
                )}
              </div>

              {/* Social Links - Componentes memoizados */}
              {profileData.socialLinks && Object.values(profileData.socialLinks).some(url => url) && (
                <div className="flex items-center justify-center flex-wrap gap-2 mb-8">
                  {Object.entries(profileData.socialLinks)
                    .filter(([platform]) => ['instagram', 'tiktok', 'youtube', 'twitter', 'linkedin', 'github', 'website'].includes(platform))
                    .map(([platform, url]) => {
                      if (!url) return null;
                      return (
                        <SocialLink
                          key={platform}
                          platform={platform}
                          url={url}
                        />
                      );
                    })}
                </div>
              )}

              {/* Links Section - Lista memoizada */}
              <div className="space-y-3">
                <LinksList
                  links={activeLinks}
                  expandedId={expandedId}
                  onToggle={handleToggle}
                  accentColor={currentAccent}
                  mercadoPagoPublicKey={profileData.mercadoPagoPublicKey}
                  mercadoPagoConfigured={profileData.mercadoPagoConfigured}
                  pixConfigured={profileData.pixConfigured}
                  pixKey={profileData.pixKey}
                  pixKeyType={profileData.pixKeyType}
                  pixQRCodeImage={profileData.pixQRCodeImage}
                  canReceivePayments={profileData.canReceivePayments}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <Link 
              href="/" target="_blank" rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 text-sm transition group ${isDarkBg ? 'text-white/70 hover:text-white' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <span className="font-medium">LinkePag</span>
              <IconExternalLink className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </main>
    </AppearanceContext.Provider>
  );
}
