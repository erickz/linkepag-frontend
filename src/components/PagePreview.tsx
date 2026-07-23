'use client';

import { headerGradients, backgroundOptions, paidLinkAccentColors } from '@/hooks/usePageEditor';
import { formatPrice } from '@/lib/masks';
import { IconUser, IconLocation } from './icons';
import PixCopyButton from './PixCopyButton';

// Social icon components for preview (paths fill-based, mesmos do editor)
const SocialIcons: Record<string, string> = {
  instagram: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z",
  youtube: "M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z",
  twitter: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  linkedin: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.064 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  github: "M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z",
  tiktok: "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z",
  website: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z",
};

export interface PagePreviewData {
  username?: string;
  displayName?: string;
  bio?: string;
  profilePhoto?: string;
  location?: string;
  socialLinks?: Record<string, string | undefined>;
  pixKey?: string;
  showPixOnPage?: boolean;
  appearanceSettings?: {
    headerGradient?: string;
    backgroundColor?: string;
    paidLinkAccent?: string;
  };
}

export interface PagePreviewLink {
  id: string;
  _id?: string;
  title: string;
  isActive: boolean;
  order: number;
  template?: string;
  price?: number;
}

// Preview da página pública - usado no editor de links e na conclusão do onboarding
export function PagePreview({ data, links }: { data: PagePreviewData; links: PagePreviewLink[] }) {
  const gradient = headerGradients.find(g => g.id === data.appearanceSettings?.headerGradient)?.preview || headerGradients[0].preview;
  const bgOption = backgroundOptions.find(b => b.id === data.appearanceSettings?.backgroundColor) || backgroundOptions[0];
  const accent = paidLinkAccentColors.find(a => a.id === data.appearanceSettings?.paidLinkAccent) || paidLinkAccentColors[0];
  const activeLinks = links.filter(l => l.isActive).sort((a, b) => a.order - b.order).slice(0, 3);

  // Get active social links
  const socialPlatforms = ['instagram', 'youtube', 'twitter', 'linkedin', 'github', 'tiktok', 'website'] as const;
  const activeSocialLinks = socialPlatforms.filter(
    platform => data.socialLinks?.[platform]
  );

  const showPixButton = !!(data.showPixOnPage && data.pixKey);

  return (
    <div className={`p-3 ${bgOption.class}`}>
      <div className="rounded-2xl overflow-hidden shadow-lg border border-slate-200 bg-white/95">
        <div className={`h-16 ${gradient}`} />
        <div className="px-4 pb-4 -mt-8">
          <div className="flex justify-center mb-2">
            <div className="w-16 h-16 rounded-full border-4 border-white shadow-md overflow-hidden bg-white">
              {data.profilePhoto ? (
                <img src={data.profilePhoto} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                  <IconUser className="w-8 h-8 text-indigo-300" />
                </div>
              )}
            </div>
          </div>
          <div className="text-center">
            <p className="font-bold text-slate-900 text-sm">@{data.username || 'username'}</p>
            {data.displayName && <p className="text-xs text-indigo-600">{data.displayName}</p>}
            {data.bio && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{data.bio}</p>}

            {/* Location */}
            {data.location && (
              <div className="flex items-center justify-center gap-1 text-slate-400 text-xs mt-1.5">
                <IconLocation className="w-3 h-3" />
                <span className="truncate max-w-[150px]">{data.location}</span>
              </div>
            )}

            {/* Social Links */}
            {activeSocialLinks.length > 0 && (
              <div className="flex items-center justify-center flex-wrap gap-1.5 mt-2">
                {activeSocialLinks.map(platform => (
                  <div 
                    key={platform}
                    className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-500"
                    title={platform.charAt(0).toUpperCase() + platform.slice(1)}
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d={SocialIcons[platform]} />
                    </svg>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botão PIX - mesmo componente da página pública, em versão compacta */}
          {showPixButton && (
            <div className="mt-3">
              <PixCopyButton pixKey={data.pixKey!} compact />
            </div>
          )}

          <div className="mt-3 space-y-2">
            {activeLinks.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-400">Nenhum link ativo</div>
            ) : (
              activeLinks.map(link => (
                <div key={link.id || link._id} className={`h-8 rounded-lg flex items-center px-3 text-xs ${link.template === 'paid_access' || link.template === 'digital_product' ? `bg-gradient-to-r from-slate-800 to-slate-900 text-white ${accent.borderClass}` : 'bg-white text-slate-700 border border-slate-200'}`}>
                  <span className="flex-1 truncate">{link.title}</span>
                  {(link.template === 'paid_access' || link.template === 'digital_product') && <span className={`font-bold ${accent.textClass}`}>R$ {formatPrice(link.price ?? 0)}</span>}
                </div>
              ))
            )}
            {links.filter(l => l.isActive).length > 3 && (
              <div className="text-center text-xs text-slate-400">+ {links.filter(l => l.isActive).length - 3} links</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PagePreview;
