'use client';

import Link from 'next/link';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'white' | 'compact';
  showText?: boolean;
  className?: string;
}

/**
 * Componente Logo LinkePag
 * 
 * @param size - Tamanho do logo: sm (32px), md (40px), lg (48px), xl (64px)
 * @param variant - Variante de cor: default (cores da marca), white (texto branco), compact (apenas ícone)
 * @param showText - Se deve mostrar o texto "LinkePag" junto ao ícone
 * @param className - Classes CSS adicionais
 */
export function Logo({ 
  size = 'md', 
  variant = 'default', 
  showText = true,
  className = '' 
}: LogoProps) {
  const sizeMap = {
    sm: { icon: 32, text: 'text-lg' },
    md: { icon: 40, text: 'text-xl' },
    lg: { icon: 48, text: 'text-2xl' },
    xl: { icon: 64, text: 'text-3xl' },
  };

  const { icon: iconSize, text: textSize } = sizeMap[size];
  
  const textColors = {
    default: 'text-slate-800',
    white: 'text-white',
    compact: '',
  };

  const IconComponent = () => (
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0"
    >
      {/* Elo inferior - verde escuro */}
      <rect
        x="38"
        y="38"
        width="42"
        height="54"
        rx="16"
        fill="#059669"
      />
      {/* Elo superior - verde primário */}
      <rect
        x="20"
        y="8"
        width="42"
        height="54"
        rx="16"
        fill="#10B981"
      />
      {/* Ponto de destaque âmbar */}
      <circle cx="62" cy="50" r="12" fill="#F59E0B" />
    </svg>
  );

  const content = (
    <div className={`flex items-center gap-2 ${className}`}>
      <IconComponent />
      {showText && variant !== 'compact' && (
        <span className={`font-bold ${textSize} tracking-tight ${textColors[variant]}`}>
          <span className={variant === 'white' ? 'text-white' : 'text-slate-800'}>Linke</span>
          <span className="text-emerald-500">Pag</span>
        </span>
      )}
    </div>
  );

  return content;
}

/**
 * Logo com link para a home
 */
export function LogoLink({ 
  size = 'md', 
  variant = 'default', 
  showText = true,
  className = '' 
}: LogoProps) {
  return (
    <Link href="/" className="hover:opacity-90 transition-opacity">
      <Logo size={size} variant={variant} showText={showText} className={className} />
    </Link>
  );
}

/**
 * Apenas o ícone (para favicon-style, mobile menu, etc)
 */
export function LogoIcon({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="38" y="38" width="42" height="54" rx="16" fill="#059669" />
      <rect x="20" y="8" width="42" height="54" rx="16" fill="#10B981" />
      <circle cx="62" cy="50" r="12" fill="#F59E0B" />
    </svg>
  );
}

export default Logo;
