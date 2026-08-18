'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import PublicProfileView, { ApiLink, SocialLinks } from '@/components/PublicProfileView';
import { resolveTheme, resolveButtonStyleId, type AppearanceInput } from '@/lib/themes';

export interface PagePreviewData {
  username?: string;
  displayName?: string;
  bio?: string;
  profilePhoto?: string;
  location?: string;
  socialLinks?: SocialLinks;
  pixKey?: string;
  showPixOnPage?: boolean;
  pixButtonText?: string;
  appearanceSettings?: AppearanceInput;
}

/** Link mínimo para o preview (url opcional: links de produto digital podem não ter). */
export type PagePreviewLink = Omit<ApiLink, 'url'> & { url?: string };

// Largura natural do PublicProfileView (max-w-lg = 32rem = 512px)
const FRAME_WIDTH = 512;
// Quantidade de links exibidos no preview (mesma regra do preview antigo)
const MAX_PREVIEW_LINKS = 3;

/**
 * Preview da página pública — usado no editor de links e na conclusão do onboarding.
 * Renderiza o MESMO PublicProfileView da rota /p/[username] (fim do drift de UI),
 * escalado para caber no frame do painel e com as interações desligadas.
 */
export function PagePreview({ data, links }: { data: PagePreviewData; links: PagePreviewLink[] }) {
  // Aparência resolvida pelo sistema de temas (cobra usuário legado também)
  const theme = useMemo(() => resolveTheme(data.appearanceSettings), [data.appearanceSettings]);
  const buttonStyle = useMemo(() => resolveButtonStyleId(data.appearanceSettings), [data.appearanceSettings]);

  // Links ativos e ordenados — o PublicProfileView corta em maxLinks
  const activeLinks = useMemo<ApiLink[]>(
    () =>
      links
        .filter((l) => l.isActive)
        .sort((a, b) => a.order - b.order)
        .map((l) => ({ ...l, id: l.id || l._id || '', url: l.url ?? '' })),
    [links],
  );
  const hiddenLinksCount = Math.max(0, activeLinks.length - MAX_PREVIEW_LINKS);

  // Escala o view (512px de largura natural) para a largura real do frame.
  // transform não afeta o layout, então a altura do container é ajustada na mão.
  const containerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const [frameHeight, setFrameHeight] = useState<number | undefined>(undefined);
  const updateRef = useRef<() => void>(() => {});

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const measure = (el: Element) => {
      // scrollHeight captura o conteúdo completo mesmo quando o elemento ainda
      // não ocupou espaço no layout (offsetHeight === 0 no primeiro paint).
      return (el as HTMLElement).scrollHeight || (el as HTMLElement).offsetHeight || 0;
    };

    updateRef.current = () => {
      const width = container.clientWidth;
      if (width === 0) return;
      const nextScale = Math.min(1, width / FRAME_WIDTH);
      // O <main> filho é a fonte de verdade da altura natural do conteúdo.
      const main = content.firstElementChild as HTMLElement | null;
      const naturalHeight = main ? measure(main) : content.scrollHeight;
      const nextHeight = naturalHeight * nextScale;
      setScale(nextScale);
      setFrameHeight(nextHeight > 0 ? nextHeight : undefined);
    };

    updateRef.current();

    const observer = new ResizeObserver(() => updateRef.current());
    observer.observe(container);
    observer.observe(content);
    // Observa o <main> interno quando ele aparecer (fallback no mutation observer abaixo).
    if (content.firstElementChild) {
      observer.observe(content.firstElementChild);
    }

    // Fallback: detecta quando o <main> filho é criado/destruído (hydration / troca de dados).
    let mutationObserver: MutationObserver | null = null;
    if (typeof MutationObserver !== 'undefined') {
      mutationObserver = new MutationObserver(() => {
        if (content.firstElementChild) {
          observer.observe(content.firstElementChild);
        }
        updateRef.current();
      });
      mutationObserver.observe(content, { childList: true });
    }

    // Fallback adicional: enquanto o conteúdo renderiza, verifica a altura em
    // frames subsequentes para desencavar altura 0.
    let rafId: number;
    let attempts = 0;
    const ensureHeight = () => {
      if (content.scrollHeight === 0 && attempts < 60) {
        attempts++;
        rafId = requestAnimationFrame(ensureHeight);
        return;
      }
      updateRef.current();
    };
    rafId = requestAnimationFrame(ensureHeight);

    return () => {
      observer.disconnect();
      mutationObserver?.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, []);

  // Sempre que os dados do preview mudarem (links, tema, etc.), força uma
  // remedição — o ResizeObserver sozinho nem sempre dispara quando o conteúdo
  // interno é trocado sem mudar o tamanho do container.
  useEffect(() => {
    // Pequeno delay para garantir que o React já aplicou o DOM.
    const id = setTimeout(() => {
      updateRef.current();
    }, 0);
    return () => clearTimeout(id);
  }, [activeLinks.length, data.appearanceSettings?.theme, data.appearanceSettings?.buttonStyle, data.displayName, data.bio, data.profilePhoto, data.showPixOnPage, data.pixKey, data.pixButtonText]);

  return (
    <div>
      {/* pointer-events-none: cinto de segurança — preview nunca é clicável */}
      <div
        ref={containerRef}
        className="relative flex justify-center overflow-hidden rounded-xl border border-slate-200 pointer-events-none select-none"
        style={{ height: frameHeight }}
      >
        {/* [&>main]:min-h-0 → dentro do frame o view não ocupa a viewport toda */}
        <div
          ref={contentRef}
          className="shrink-0 [&>main]:min-h-0"
          style={{
            width: FRAME_WIDTH,
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
          }}
        >
          <PublicProfileView
            username={data.username || 'username'}
            displayName={data.displayName}
            bio={data.bio}
            location={data.location}
            profilePhoto={data.profilePhoto}
            socialLinks={data.socialLinks}
            links={activeLinks}
            theme={theme}
            buttonStyle={buttonStyle}
            showPixOnPage={data.showPixOnPage}
            pixButtonText={data.pixButtonText}
            pixKey={data.pixKey}
            interactive={false}
            maxLinks={MAX_PREVIEW_LINKS}
          />
        </div>
      </div>

      {activeLinks.length === 0 && (
        <p className="text-center text-xs text-slate-400 mt-2">Nenhum link ativo ainda</p>
      )}
      {hiddenLinksCount > 0 && (
        <p className="text-center text-xs text-slate-400 mt-2">+ {hiddenLinksCount} links</p>
      )}
    </div>
  );
}

export default PagePreview;
