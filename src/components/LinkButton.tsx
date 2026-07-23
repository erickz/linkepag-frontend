'use client';

import { memo, useMemo, useCallback } from 'react';
import PixCheckout from './PixCheckout';
import { formatPrice } from '@/lib/masks';
import { 
  IconExternalLink, 
  IconCheck, 
  IconGift,
  IconLink,
  IconFileText,
  IconBookOpen,
  IconVideo,
  IconDownload,
  IconStar,
  IconZap,
  IconTarget,
  IconCrown,
  IconLock,
  IconCalendar,
  IconTelegram,
  IconWhatsApp,
  IconGoogleCalendar
} from './icons';
import { detectPlatformFromUrl } from '@/lib/platform-detector';
import { trackEcommerceEvent } from '@/lib/pixel-tracker';
import { trackLinkClick, trackCheckoutStart } from '@/lib/api';

interface AccentColor {
  textClass: string;
  borderClass: string;
  bgClass: string;
}

interface LinkButtonProps {
  link: {
    id: string;
    _id?: string;
    title: string;
    description?: string;
    url: string;
    icon?: string;
    template?: 'direct' | 'paid_access' | 'digital_product' | 'scheduling';
    isPaid?: boolean;
    price?: number;
    openInNewTab?: boolean;
    buttonColor?: string;
    textColor?: string;
  };
  isExpanded: boolean;
  onToggle: () => void;
  accentColor?: AccentColor;
  mercadoPagoPublicKey?: string;
  mercadoPagoConfigured?: boolean;
  // PIX direct payment options
  pixConfigured?: boolean;
  pixKey?: string;
  pixKeyType?: string;
  pixQRCodeImage?: string;
  canReceivePayments?: boolean; // Indica se o vendedor pode receber pagamentos (billing em dia)
}

// Mapeamento de emojis para ícones - memoizado fora do componente
const emojiIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  // Livros e documentos
  '📚': IconBookOpen, '📖': IconBookOpen, '📕': IconBookOpen, '📗': IconBookOpen,
  '📘': IconBookOpen, '📙': IconBookOpen, '📔': IconBookOpen, '📒': IconBookOpen,
  '📓': IconBookOpen, '📃': IconBookOpen, '📄': IconBookOpen,
  // Educação
  '🎓': IconFileText, '✏️': IconFileText, '📝': IconFileText, '🎒': IconFileText,
  '🏫': IconFileText,
  // Vídeos
  '🎥': IconVideo, '📹': IconVideo, '📺': IconVideo, '🎬': IconVideo,
  '🎞️': IconVideo, '📽️': IconVideo,
  // Downloads
  '⬇️': IconDownload, '💾': IconDownload, '📥': IconDownload, '💿': IconDownload,
  '📀': IconDownload, '💽': IconDownload,
  // Presentes
  '🎁': IconGift, '🎀': IconGift, '🎊': IconGift, '🎉': IconGift, '🎂': IconGift,
  // Estrelas
  '⭐': IconStar, '🌟': IconStar, '✨': IconStar, '💫': IconStar, '🏆': IconStar,
  '🥇': IconStar,
  // Energia
  '⚡': IconZap, '🔥': IconZap, '💥': IconZap, '✅': IconZap, '🚀': IconZap,
  // Alvos
  '🎯': IconTarget, '🎪': IconTarget, '🎨': IconTarget, '🎭': IconTarget,
};

// Função memoizada para obter ícone por emoji
const getIconForEmoji = (emoji: string): React.ComponentType<{ className?: string }> | null => {
  return emojiIconMap[emoji] || null;
};

// Componente LinkButton memoizado para evitar re-renderizações desnecessárias
function LinkButtonComponent({ 
  link, 
  isExpanded, 
  onToggle, 
  accentColor,
  mercadoPagoPublicKey,
  mercadoPagoConfigured,
  pixConfigured,
  pixKey,
  pixKeyType,
  pixQRCodeImage,
  canReceivePayments,
}: LinkButtonProps) {
  // Memoizar handlers para evitar recriação a cada render
  const isMonetized = link.template === 'paid_access' || link.template === 'digital_product';
  const isDirect = link.template === 'direct' || link.template === 'scheduling';

  const handleLinkClick = useCallback(() => {
    // Analytics: conta o clique ao navegar (links diretos) ou ao abrir o
    // checkout (links pagos). Não conta ao fechar o checkout (isExpanded).
    if (isDirect || !isExpanded) {
      trackLinkClick(link.id);
    }

    // Links diretos e agendamento com URL abrem direto
    if (isDirect && link.url) {
      window.open(link.url, link.openInNewTab ? '_blank' : '_self');
    }
    
    // Tracking: InitiateCheckout quando usuário clica em link pago pela primeira vez
    if (isMonetized && !isExpanded && link.price) {
      // Analytics (pagestats): checkout_start — comprador abriu o checkout
      trackCheckoutStart(link.id);
      trackEcommerceEvent('InitiateCheckout', {
        contentId: link.id,
        contentName: link.title,
        value: link.price,
      });
    }
    
    // Sempre chama onToggle (para abrir/fechar checkout de links monetizados)
    onToggle();
  }, [isDirect, isMonetized, isExpanded, link.url, link.openInNewTab, link.price, link.title, link.id, onToggle]);

  // Memoizar ícone para evitar re-computação
  const IconComponent = useMemo(() => {
    // Para links de agendamento, detecta plataforma pela URL
    if (link.template === 'scheduling' && link.url) {
      const platform = detectPlatformFromUrl(link.url);
      if (platform === 'telegram') return IconTelegram;
      if (platform === 'whatsapp') return IconWhatsApp;
      if (platform === 'google-calendar') return IconGoogleCalendar;
      return IconCalendar;
    }

    // Para links monetizados, sempre mostra ícone de cadeado
    if (isMonetized) {
      return IconLock;
    }
    
    if (link.icon) {
      // Se for emoji, converte para ícone
      if (/^[\u{1F300}-\u{1F9FF}]$/u.test(link.icon) || link.icon.length <= 2) {
        return getIconForEmoji(link.icon) || IconLink;
      }
      // Se for texto curto (possivelmente emoji), tenta mapear
      if (link.icon.length <= 3) {
        return getIconForEmoji(link.icon) || IconLink;
      }
    }
    
    // Ícone padrão para links diretos
    return IconLink;
  }, [link.template, link.url, isMonetized, link.icon]);

  // Memoizar classes do botão
  const buttonClasses = useMemo(() => {
    if (isMonetized) {
      const accentBorder = accentColor?.borderClass.replace('/30', '/50') || 'border-amber-400/50';
      const accentShadow = accentColor?.textClass.replace('text-', '') || 'amber-500';
      return `bg-gradient-to-br from-slate-800 via-slate-900 to-black text-white border border-slate-700 hover:${accentBorder} hover:shadow-xl hover:shadow-${accentShadow}/20 hover:scale-[1.02]`;
    }
    
    if (link.buttonColor || link.textColor) {
      return '';
    }
    
    return 'bg-white text-slate-700 border border-slate-200 hover:border-indigo-300 hover:shadow-md hover:scale-[1.01]';
  }, [isMonetized, link.buttonColor, link.textColor, accentColor]);

  // Memoizar estilos inline
  const buttonStyle = useMemo(() => {
    if (link.buttonColor || link.textColor) {
      return {
        backgroundColor: link.buttonColor || '#ffffff',
        color: link.textColor || '#0f172a',
        border: '1px solid #e2e8f0',
      };
    }
    return undefined;
  }, [link.buttonColor, link.textColor]);

  // Memoizar classes do container do ícone
  const iconContainerClasses = useMemo(() => {
    if (link.template === 'scheduling' && link.url) {
      const platform = detectPlatformFromUrl(link.url);
      if (platform === 'telegram') return 'bg-sky-100 text-sky-600';
      if (platform === 'whatsapp') return 'bg-emerald-100 text-emerald-600';
      if (platform === 'google-calendar') return 'bg-red-100 text-red-600';
      return 'bg-violet-100 text-violet-600';
    }
    if (isMonetized) {
      return `${accentColor?.bgClass || 'bg-amber-500/20'} ${accentColor?.textClass || 'text-amber-400'}`;
    }
    return 'bg-gradient-to-br from-indigo-50 to-purple-50 text-indigo-600';
  }, [link.template, link.url, isMonetized, accentColor]);

  // Memoizar conteúdo do lado direito
  const rightSideContent = useMemo(() => {
    if (isMonetized) {
      // Sempre mostra o preço e botão Comprar/Fechar
      return (
        <div className="flex flex-col sm:flex-row sm:items-center items-end gap-1 sm:gap-2 flex-shrink-0 min-w-0">
          <span className={`text-sm sm:text-xl font-bold ${accentColor?.textClass || 'text-amber-400'} whitespace-nowrap`}>
            R$ {formatPrice(link.price || 0)}
          </span>
          <div className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-bold text-xs shadow-sm transition whitespace-nowrap ${
            isExpanded
              ? 'bg-slate-600 text-white hover:bg-slate-500'
              : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}>
            {isExpanded ? 'Fechar' : 'Comprar'}
          </div>
        </div>
      );
    }

    return (
      <div className={`
        w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0
        ${link.buttonColor || link.textColor ? 'bg-black/5' : 'bg-slate-100 text-slate-400'}
      `}>
        <IconExternalLink className="w-4 h-4 sm:w-5 sm:h-5" />
      </div>
    );
  }, [isMonetized, link.price, isExpanded, accentColor, link.buttonColor, link.textColor]);

  return (
    <div className="relative">
      <button
        onClick={handleLinkClick}
        title={link.title}
        className={`
          flex items-stretch gap-2 sm:gap-4 w-full px-3 sm:px-5 py-3 sm:py-4 rounded-2xl
          transition-all duration-200 active:scale-[0.98] cursor-pointer text-left
          ${buttonClasses}
        `}
        style={buttonStyle}
      >
        {/* Icon Container - centralizado verticalmente */}
        <div className={`
          flex items-center justify-center flex-shrink-0 w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl self-center
          ${iconContainerClasses}
        `}>
          <IconComponent className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>

        {/* Content - texto limitado a 2 linhas para não explodir o layout */}
        <div className="flex-1 min-w-0 self-center py-0.5">
          <div className="font-semibold text-sm sm:text-base leading-snug break-words line-clamp-2">
            {link.title}
          </div>
          {link.description && (
            <div className={`text-xs mt-1 leading-relaxed break-words line-clamp-2 ${isMonetized ? 'text-white/70' : 'text-slate-500'}`}>
              {link.description}
            </div>
          )}
        </div>

        {/* Right Side - centralizado verticalmente */}
        <div className="flex items-center flex-shrink-0 self-center">
          {rightSideContent}
        </div>
      </button>

      {/* Inline Checkout */}
      {isExpanded && isMonetized && (
        <div className="mt-3">
          <PixCheckout
            linkId={link.id}
            title={link.title}
            price={link.price || 0}
            onClose={onToggle}
            onSuccess={(token, url) => {
              // Handle success - redirecionar ou mostrar mensagem
              if (url) {
                window.open(`${url}?token=${token}`, link.openInNewTab ? '_blank' : '_self');
              }
            }}
            mercadoPagoPublicKey={mercadoPagoPublicKey}
            mercadoPagoConfigured={mercadoPagoConfigured}
            pixConfigured={pixConfigured}
            pixKey={pixKey}
            pixKeyType={pixKeyType}
            pixQRCodeImage={pixQRCodeImage}
            canReceivePayments={canReceivePayments}
          />
        </div>
      )}
    </div>
  );
}

// Exportar versão memoizada do componente
const LinkButton = memo(LinkButtonComponent);

// Exportar como default para manter compatibilidade
export default LinkButton;
