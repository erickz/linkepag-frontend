// Helpers para abrir o perfil do usuário nas redes sociais.
// Instagram e TikTok NÃO permitem deep link direto para a tela de editar bio —
// o máximo possível é abrir o perfil do usuário (no app, se instalado),
// e de lá ele toca em "Editar perfil" para colar o link da página.

type SocialPlatform = 'instagram' | 'tiktok';

/** URL web pública do perfil (fallback universal, funciona em qualquer device) */
export function getSocialWebUrl(platform: SocialPlatform, handle: string): string {
  const clean = handle.replace(/^@+/, '').trim();
  if (platform === 'instagram') {
    return `https://instagram.com/${clean}`;
  }
  return `https://www.tiktok.com/@${clean}`;
}

function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
}

/**
 * Abre o perfil do usuário na rede social.
 * Desktop: abre a URL web em nova aba.
 * Mobile: tenta abrir o app via deep link; se o app não abrir em ~1.5s
 * (a página não perdeu visibilidade), cai no fallback da URL web.
 */
export function openSocialProfile(platform: SocialPlatform, handle: string): void {
  const webUrl = getSocialWebUrl(platform, handle);

  if (!isMobileDevice()) {
    window.open(webUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  const clean = handle.replace(/^@+/, '').trim();
  const appUrl =
    platform === 'instagram'
      ? `instagram://user?username=${clean}`
      : `tiktok://user?username=${clean}`;

  // Se a página perder visibilidade, o app abriu — cancela o fallback web
  let fallbackTimer: ReturnType<typeof setTimeout>;
  const onVisibilityChange = () => {
    if (document.hidden) {
      clearTimeout(fallbackTimer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    }
  };

  fallbackTimer = setTimeout(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.open(webUrl, '_blank', 'noopener,noreferrer');
  }, 1500);

  document.addEventListener('visibilitychange', onVisibilityChange);
  window.location.href = appUrl;
}
