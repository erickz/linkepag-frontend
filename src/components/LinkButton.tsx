'use client';

import { memo, useMemo, useCallback } from 'react';
import PixCheckout from './PixCheckout';
import { formatPrice } from '@/lib/masks';
import {
  IconExternalLink,
  IconGift,
  IconLink,
  IconFileText,
  IconBookOpen,
  IconVideo,
  IconDownload,
  IconStar,
  IconZap,
  IconTarget,
  IconLock,
  IconCalendar,
  IconTelegram,
  IconWhatsApp,
  IconGoogleCalendar
} from './icons';
import { detectPlatformFromUrl } from '@/lib/platform-detector';
import { trackEcommerceEvent } from '@/lib/pixel-tracker';
import { trackLinkClick, trackCheckoutStart } from '@/lib/api';
import { AccentTokens, ButtonStyleId } from '@/lib/themes';

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
  };
  isExpanded: boolean;
  onToggle: () => void;
  /** Acento do tema (card escuro dos links monetizados) */
  accent: AccentTokens;
  /** Classes do container do link gratuito (vêm de resolveButton) */
  buttonContainerClass: string;
  /** Classes do tile de ícone do link gratuito (vêm de resolveButton) */
  iconTileClass: string;
  /** Raio de borda do estilo de botão (aplicado ao card pago e ao botão Comprar) */
  buttonRadiusClass?: string;
  /** Estilo de botão escolhido no tema (aplicado ao botão Comprar) */
  buttonStyle?: ButtonStyleId;
  /** false = preview: sem navegação, tracking ou checkout */
  interactive?: boolean;
  mercadoPagoPublicKey?: string;
  mercadoPagoConfigured?: boolean;
  // Opções de pagamento PIX Direto
  pixConfigured?: boolean;
  pixKey?: string;
  pixKeyType?: string;
  pixQRCodeImage?: string;
  canReceivePayments?: boolean; // Indica se o vendedor pode receber pagamentos (billing em dia)
  isDemoUser?: boolean; // Página demo: não dispara eventos de conversão no Meta
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
  accent,
  buttonContainerClass,
  iconTileClass,
  buttonRadiusClass = 'rounded-2xl',
  buttonStyle = 'rounded',
  interactive = true,
  mercadoPagoPublicKey,
  mercadoPagoConfigured,
  pixConfigured,
  pixKey,
  pixKeyType,
  pixQRCodeImage,
  canReceivePayments,
  isDemoUser,
}: LinkButtonProps) {
  // Memoizar handlers para evitar recriação a cada render
  const isMonetized = link.template === 'paid_access' || link.template === 'digital_product';
  const isDirect = link.template === 'direct' || link.template === 'scheduling';

  const handleLinkClick = useCallback(() => {
    // Preview (interactive=false): sem tracking, navegação ou checkout
    if (!interactive) return;

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
      trackEcommerceEvent(
        'InitiateCheckout',
        {
          contentId: link.id,
          contentName: link.title,
          value: link.price,
        },
        isDemoUser ? { skipMeta: true } : undefined,
      );
    }

    // Sempre chama onToggle (para abrir/fechar checkout de links monetizados)
    onToggle();
  }, [interactive, isDirect, isMonetized, isExpanded, link.url, link.openInNewTab, link.price, link.title, link.id, onToggle, isDemoUser]);

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

  // Memoizar classes do container do botão
  const containerClasses = useMemo(() => {
    if (isMonetized) {
      // Card escuro fixo com borda suave no acento do tema
      return `bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 text-white border ${accent.border} shadow-lg hover:shadow-xl hover:-translate-y-0.5 ${buttonRadiusClass} transition-all duration-200`;
    }
    return buttonContainerClass;
  }, [isMonetized, accent, buttonRadiusClass, buttonContainerClass]);

  // Memoizar classes do tile do ícone
  const iconContainerClasses = useMemo(() => {
    if (isMonetized) {
      return `rounded-xl ${accent.bg} ${accent.text}`;
    }
    // Links de agendamento/contato mantêm o tile na cor da plataforma
    // (reconhecimento de marca: WhatsApp verde, Telegram azul, etc.)
    if (link.template === 'scheduling' && link.url) {
      const platform = detectPlatformFromUrl(link.url);
      if (platform === 'telegram') return 'rounded-xl bg-sky-100 text-sky-600';
      if (platform === 'whatsapp') return 'rounded-xl bg-emerald-100 text-emerald-600';
      if (platform === 'google-calendar') return 'rounded-xl bg-red-100 text-red-600';
      return 'rounded-xl bg-violet-100 text-violet-600';
    }
    return iconTileClass;
  }, [link.template, link.url, isMonetized, accent, iconTileClass]);

  // Memoizar conteúdo do lado direito
  const rightSideContent = useMemo(() => {
    if (isMonetized) {
      // Chip de preço + botão Comprar/Fechar no acento do tema
      const buyButtonClass = (() => {
        if (isExpanded) {
          return `${buttonRadiusClass} bg-white/10 text-white hover:bg-white/20`;
        }
        if (buttonStyle === 'outline') {
          return `${buttonRadiusClass} bg-transparent border-2 ${accent.borderStrong} ${accent.text} hover:bg-white/5`;
        }
        if (buttonStyle === 'shadow') {
          return `${buttonRadiusClass} ${accent.solid} ${accent.solidHover} ${accent.solidText} border-2 border-slate-900 shadow-[4px_4px_0_0_#0f172a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#0f172a]`;
        }
        return `${buttonRadiusClass} ${accent.solid} ${accent.solidHover} ${accent.solidText}`;
      })();

      return (
        <div className="flex flex-col sm:flex-row sm:items-center items-end gap-1.5 sm:gap-2 flex-shrink-0 min-w-0">
          <span className={`px-2.5 py-1 rounded-full border text-sm sm:text-base font-bold whitespace-nowrap ${accent.bg} ${accent.border} ${accent.text}`}>
            R$ {formatPrice(link.price || 0)}
          </span>
          <div className={`px-3 py-1.5 sm:py-2 font-bold text-xs shadow-sm transition whitespace-nowrap ${buyButtonClass}`}>
            {isExpanded ? 'Fechar' : 'Comprar'}
          </div>
        </div>
      );
    }

    return (
      <div className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center flex-shrink-0 ${iconTileClass}`}>
        <IconExternalLink className="w-4 h-4 sm:w-5 sm:h-5" />
      </div>
    );
  }, [isMonetized, link.price, isExpanded, accent, buttonRadiusClass, buttonStyle, iconTileClass]);

  return (
    <div className="relative">
      <button
        onClick={handleLinkClick}
        title={link.title}
        className={`
          group flex items-center gap-2 sm:gap-4 w-full px-3 sm:px-5 py-3 sm:py-4
          cursor-pointer text-left active:scale-[0.98]
          ${containerClasses}
        `}
      >
        {/* Tile do ícone */}
        <div className={`flex items-center justify-center flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 ${iconContainerClasses}`}>
          <IconComponent className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>

        {/* Content - texto limitado a 2 linhas para não explodir o layout */}
        <div className="flex-1 min-w-0 py-0.5">
          <div className="font-semibold text-sm sm:text-base leading-snug break-words line-clamp-2">
            {link.title}
          </div>
          {link.description && (
            <div className={`text-xs mt-1 leading-relaxed break-words line-clamp-2 ${isMonetized ? 'text-white/70' : 'opacity-60'}`}>
              {link.description}
            </div>
          )}
        </div>

        {/* Right Side */}
        <div className="flex items-center flex-shrink-0">
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
            isDemoUser={isDemoUser}
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
