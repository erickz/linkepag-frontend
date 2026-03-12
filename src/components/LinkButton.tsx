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
  IconLock
} from './icons';

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
}: LinkButtonProps) {
  // Memoizar handlers para evitar recriação a cada render
  const handleLinkClick = useCallback(() => {
    // Links gratuitos com URL abrem direto
    if (!link.isPaid && link.url) {
      window.open(link.url, link.openInNewTab ? '_blank' : '_self');
    }
    
    // Sempre chama onToggle (para abrir/fechar checkout de links pagos)
    onToggle();
  }, [link.isPaid, link.url, link.openInNewTab, onToggle]);

  // Memoizar ícone para evitar re-computação
  const IconComponent = useMemo(() => {
    // Para links monetizados, sempre mostra ícone de cadeado (independente de expandido ou não)
    if (link.isPaid) {
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
    
    // Ícone padrão para links gratuitos
    return IconLink;
  }, [link.isPaid, link.icon]);

  // Memoizar classes do botão
  const buttonClasses = useMemo(() => {
    if (link.isPaid) {
      const accentBorder = accentColor?.borderClass.replace('/30', '/50') || 'border-amber-400/50';
      const accentShadow = accentColor?.textClass.replace('text-', '') || 'amber-500';
      return `bg-gradient-to-br from-slate-800 via-slate-900 to-black text-white border border-slate-700 hover:${accentBorder} hover:shadow-xl hover:shadow-${accentShadow}/20 hover:scale-[1.02]`;
    }
    
    if (link.buttonColor || link.textColor) {
      return '';
    }
    
    return 'bg-white text-slate-700 border border-slate-200 hover:border-indigo-300 hover:shadow-md hover:scale-[1.01]';
  }, [link.isPaid, link.buttonColor, link.textColor, accentColor]);

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
    if (link.isPaid) {
      return `${accentColor?.bgClass || 'bg-amber-500/20'} ${accentColor?.textClass || 'text-amber-400'}`;
    }
    return 'bg-gradient-to-br from-indigo-50 to-purple-50 text-indigo-600';
  }, [link.isPaid, accentColor]);

  // Memoizar conteúdo do lado direito
  const rightSideContent = useMemo(() => {
    if (link.isPaid) {
      // Sempre mostra o preço e botão Comprar/Fechar
      return (
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <span className={`text-sm sm:text-xl font-bold ${accentColor?.textClass || 'text-amber-400'}`}>
            R$ {formatPrice(link.price ?? 0)}
          </span>
          <div className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-bold text-xs shadow-sm transition whitespace-nowrap ${
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
  }, [link.isPaid, link.price, isExpanded, accentColor, link.buttonColor, link.textColor]);

  return (
    <div className="relative">
      <button
        onClick={handleLinkClick}
        className={`
          flex items-center gap-2 sm:gap-4 w-full px-3 sm:px-5 py-3 sm:py-4 rounded-2xl 
          transition-all duration-200 active:scale-[0.98] cursor-pointer
          ${buttonClasses}
        `}
        style={buttonStyle}
      >
        {/* Icon Container */}
        <div className={`
          flex items-center justify-center flex-shrink-0 w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl
          ${iconContainerClasses}
        `}>
          <IconComponent className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        
        {/* Content */}
        <div className="flex-1 text-left min-w-0 overflow-hidden">
          <div className="font-semibold text-sm sm:text-base truncate leading-tight">
            {link.title}
          </div>
          {link.description && (
            <div className={`text-xs mt-0.5 truncate ${link.isPaid ? 'text-white/70' : 'text-slate-500'}`}>
              {link.description}
            </div>
          )}
        </div>
        
        {/* Right Side */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {rightSideContent}
        </div>
      </button>

      {/* Inline Checkout */}
      {isExpanded && link.isPaid && (
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
