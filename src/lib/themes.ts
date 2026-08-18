/**
 * themes.ts — Sistema de temas da página pública do LinkePag
 *
 * FONTE ÚNICA DE VERDADE para aparência: usado pela página pública
 * (/p/[username]), pelo preview do editor (PagePreview) e pelo editor.
 *
 * Modelo de dados persistido (user.appearanceSettings):
 *   - theme?: string        → id do tema (THEMES). Ausente = usuário legado,
 *                             resolve via LEGACY_GRADIENT_TO_THEME.
 *   - buttonStyle?: string  → id do estilo de botão (BUTTON_STYLES).
 *   - headerGradient / backgroundColor / paidLinkAccent → LEGADOS, mantidos
 *     no banco apenas para compatibilidade/rollback. Não usar em código novo.
 *
 * ⚠️ Tailwind: todas as classes abaixo são literais completas de propósito
 * (o scanner do Tailwind v4 precisa encontrá-las no source). Nunca interpolar
 * classes dinamicamente (ex.: `bg-${cor}-500`).
 */

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type ThemeId =
  | 'porcelain'
  | 'rose-pastel'
  | 'lavender-dream'
  | 'mint-fresh'
  | 'sky-breeze'
  | 'peach-cream'
  | 'cotton-candy'
  | 'sage-garden'
  | 'chocolate'
  | 'cherry';

export type ButtonStyleId = 'rounded' | 'outline' | 'shadow';

/** Paleta de cores dos botões de link (tokens = classes Tailwind literais). */
export interface ButtonPalette {
  /** Fundo do botão preenchido */
  bg: string;
  /** Borda sutil do botão preenchido */
  border: string;
  /** Borda forte (variante outline) */
  borderStrong: string;
  /** Texto do botão */
  text: string;
  /** Borda no hover (variante preenchida) */
  hoverBorder: string;
  /** Fundo suave (tile de ícone / hover do outline) */
  softBg: string;
  /** Fundo suave no hover (variante outline) — inclui prefixo hover: */
  softBgHover: string;
  /** Texto/ícone sobre fundo suave */
  softText: string;
}

/** Tokens de cor de destaque dos links monetizados (card escuro). */
export interface AccentTokens {
  /** Preço / textos de destaque sobre fundo escuro */
  text: string;
  /** Chip de fundo suave do preço */
  bg: string;
  /** Borda suave sobre fundo escuro */
  border: string;
  /** Borda forte (outline do botão Comprar) */
  borderStrong: string;
  /** Botão sólido ("Comprar") */
  solid: string;
  solidHover: string;
  solidText: string;
}

export interface ResolvedTheme {
  id: ThemeId;
  name: string;
  tagline: string;
  page: {
    /** Fundo da página (gradiente pastel) */
    backgroundClass: string;
    /** Blobs decorativos suaves (cor A e B, com opacidade no token) */
    blobClassA: string;
    blobClassB: string;
  };
  card: {
    /** Container do card de perfil (inclui sombra colorida do tema) */
    containerClass: string;
  };
  header: {
    /** Gradiente do banner do cabeçalho */
    gradientClass: string;
  };
  text: {
    primaryClass: string;
    secondaryClass: string;
    mutedClass: string;
    /** Cor do displayName (acento do tema sobre o card) */
    nameAccentClass: string;
  };
  social: {
    /** Botão de rede social (sem o hover de marca, que é fixo) */
    buttonClass: string;
  };
  buttonPalette: ButtonPalette;
  accent: AccentTokens;
}

export interface ButtonStyleSpec {
  id: ButtonStyleId;
  name: string;
  tagline: string;
}

export interface ResolvedButton {
  /** Classes do container do botão de link gratuito (sem layout/flex) */
  containerClass: string;
  /** Classes do tile do ícone (sem tamanho) */
  iconTileClass: string;
}

/** Shape mínimo de appearanceSettings para resolver o tema. */
export interface AppearanceInput {
  theme?: string | null;
  buttonStyle?: string | null;
  headerGradient?: string | null;
  backgroundColor?: string | null;
  paidLinkAccent?: string | null;
}

// ---------------------------------------------------------------------------
// Acentos dos links monetizados (card escuro fixo + acento por tema)
// ---------------------------------------------------------------------------

const ACCENTS: Record<string, AccentTokens> = {
  amber: {
    text: 'text-amber-400',
    bg: 'bg-amber-500/20',
    border: 'border-amber-500/30',
    borderStrong: 'border-amber-400',
    solid: 'bg-amber-400',
    solidHover: 'hover:bg-amber-300',
    solidText: 'text-slate-900',
  },
  rose: {
    text: 'text-rose-400',
    bg: 'bg-rose-500/20',
    border: 'border-rose-500/30',
    borderStrong: 'border-rose-400',
    solid: 'bg-rose-400',
    solidHover: 'hover:bg-rose-300',
    solidText: 'text-slate-900',
  },
  violet: {
    text: 'text-violet-400',
    bg: 'bg-violet-500/20',
    border: 'border-violet-500/30',
    borderStrong: 'border-violet-400',
    solid: 'bg-violet-400',
    solidHover: 'hover:bg-violet-300',
    solidText: 'text-slate-900',
  },
  emerald: {
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-500/30',
    borderStrong: 'border-emerald-400',
    solid: 'bg-emerald-400',
    solidHover: 'hover:bg-emerald-300',
    solidText: 'text-slate-900',
  },
  cyan: {
    text: 'text-cyan-400',
    bg: 'bg-cyan-500/20',
    border: 'border-cyan-500/30',
    borderStrong: 'border-cyan-400',
    solid: 'bg-cyan-400',
    solidHover: 'hover:bg-cyan-300',
    solidText: 'text-slate-900',
  },
  orange: {
    text: 'text-orange-400',
    bg: 'bg-orange-500/20',
    border: 'border-orange-500/30',
    borderStrong: 'border-orange-400',
    solid: 'bg-orange-400',
    solidHover: 'hover:bg-orange-300',
    solidText: 'text-slate-900',
  },
  red: {
    text: 'text-red-400',
    bg: 'bg-red-500/20',
    border: 'border-red-500/30',
    borderStrong: 'border-red-400',
    solid: 'bg-red-400',
    solidHover: 'hover:bg-red-300',
    solidText: 'text-slate-900',
  },
  yellow: {
    text: 'text-yellow-400',
    bg: 'bg-yellow-500/20',
    border: 'border-yellow-500/30',
    borderStrong: 'border-yellow-400',
    solid: 'bg-yellow-400',
    solidHover: 'hover:bg-yellow-300',
    solidText: 'text-slate-900',
  },
  fuchsia: {
    text: 'text-fuchsia-400',
    bg: 'bg-fuchsia-500/20',
    border: 'border-fuchsia-500/30',
    borderStrong: 'border-fuchsia-400',
    solid: 'bg-fuchsia-400',
    solidHover: 'hover:bg-fuchsia-300',
    solidText: 'text-slate-900',
  },
  lime: {
    text: 'text-lime-400',
    bg: 'bg-lime-500/20',
    border: 'border-lime-500/30',
    borderStrong: 'border-lime-400',
    solid: 'bg-lime-400',
    solidHover: 'hover:bg-lime-300',
    solidText: 'text-slate-900',
  },
  teal: {
    text: 'text-teal-400',
    bg: 'bg-teal-500/20',
    border: 'border-teal-500/30',
    borderStrong: 'border-teal-400',
    solid: 'bg-teal-400',
    solidHover: 'hover:bg-teal-300',
    solidText: 'text-slate-900',
  },
};

// ---------------------------------------------------------------------------
// Temas (galeria pastel/clean — 10 famílias distintas)
// ---------------------------------------------------------------------------

interface ThemeDefinition extends Omit<ResolvedTheme, 'accent'> {
  accentId: keyof typeof ACCENTS;
}

const THEME_DEFINITIONS: Record<ThemeId, ThemeDefinition> = {
  porcelain: {
    id: 'porcelain',
    name: 'Porcelana',
    tagline: 'Minimalista e atemporal',
    page: {
      backgroundClass: 'bg-gradient-to-br from-stone-50 via-neutral-50 to-stone-100',
      blobClassA: 'bg-stone-300/40',
      blobClassB: 'bg-neutral-200/50',
    },
    card: {
      containerClass:
        'bg-white/85 backdrop-blur-xl rounded-[2rem] shadow-xl shadow-stone-300/40 border border-white/70',
    },
    header: { gradientClass: 'from-stone-300 via-neutral-200 to-stone-400' },
    text: {
      primaryClass: 'text-stone-800',
      secondaryClass: 'text-stone-500',
      mutedClass: 'text-stone-400',
      nameAccentClass: 'text-stone-600',
    },
    social: { buttonClass: 'bg-white/80 border-stone-200 text-stone-500' },
    buttonPalette: {
      bg: 'bg-white',
      border: 'border-stone-200',
      borderStrong: 'border-stone-400',
      text: 'text-stone-700',
      hoverBorder: 'hover:border-stone-400',
      softBg: 'bg-stone-100',
      softBgHover: 'hover:bg-stone-100',
      softText: 'text-stone-600',
    },
    accentId: 'amber',
  },

  'rose-pastel': {
    id: 'rose-pastel',
    name: 'Rosé',
    tagline: 'Rosa suave e romântico',
    page: {
      backgroundClass: 'bg-gradient-to-br from-rose-50 via-pink-50 to-rose-100',
      blobClassA: 'bg-rose-200/60',
      blobClassB: 'bg-pink-200/50',
    },
    card: {
      containerClass:
        'bg-white/85 backdrop-blur-xl rounded-[2rem] shadow-xl shadow-rose-200/50 border border-white/70',
    },
    header: { gradientClass: 'from-rose-300 via-pink-300 to-rose-200' },
    text: {
      primaryClass: 'text-stone-800',
      secondaryClass: 'text-stone-500',
      mutedClass: 'text-stone-400',
      nameAccentClass: 'text-rose-500',
    },
    social: { buttonClass: 'bg-white/80 border-rose-100 text-rose-400' },
    buttonPalette: {
      bg: 'bg-white',
      border: 'border-rose-100',
      borderStrong: 'border-rose-300',
      text: 'text-stone-700',
      hoverBorder: 'hover:border-rose-300',
      softBg: 'bg-rose-50',
      softBgHover: 'hover:bg-rose-50',
      softText: 'text-rose-500',
    },
    accentId: 'rose',
  },

  cherry: {
    id: 'cherry',
    name: 'Cereja',
    tagline: 'Vermelho vibrante e alegre',
    page: {
      backgroundClass: 'bg-gradient-to-br from-red-50 via-rose-50 to-pink-100',
      blobClassA: 'bg-red-200/60',
      blobClassB: 'bg-rose-200/50',
    },
    card: {
      containerClass:
        'bg-white/85 backdrop-blur-xl rounded-[2rem] shadow-xl shadow-red-200/50 border border-white/70',
    },
    header: { gradientClass: 'from-red-300 via-rose-300 to-pink-300' },
    text: {
      primaryClass: 'text-stone-800',
      secondaryClass: 'text-stone-500',
      mutedClass: 'text-stone-400',
      nameAccentClass: 'text-red-500',
    },
    social: { buttonClass: 'bg-white/80 border-red-100 text-red-500' },
    buttonPalette: {
      bg: 'bg-white',
      border: 'border-red-100',
      borderStrong: 'border-red-300',
      text: 'text-stone-700',
      hoverBorder: 'hover:border-red-300',
      softBg: 'bg-red-50',
      softBgHover: 'hover:bg-red-50',
      softText: 'text-red-500',
    },
    accentId: 'red',
  },

  'peach-cream': {
    id: 'peach-cream',
    name: 'Pêssego',
    tagline: 'Quente, macio e acolhedor',
    page: {
      backgroundClass: 'bg-gradient-to-br from-orange-50 via-rose-50 to-amber-100',
      blobClassA: 'bg-orange-200/60',
      blobClassB: 'bg-rose-200/50',
    },
    card: {
      containerClass:
        'bg-white/85 backdrop-blur-xl rounded-[2rem] shadow-xl shadow-orange-200/50 border border-white/70',
    },
    header: { gradientClass: 'from-orange-300 via-rose-300 to-amber-300' },
    text: {
      primaryClass: 'text-stone-800',
      secondaryClass: 'text-stone-500',
      mutedClass: 'text-stone-400',
      nameAccentClass: 'text-orange-500',
    },
    social: { buttonClass: 'bg-white/80 border-orange-100 text-orange-500' },
    buttonPalette: {
      bg: 'bg-white',
      border: 'border-orange-100',
      borderStrong: 'border-orange-300',
      text: 'text-stone-700',
      hoverBorder: 'hover:border-orange-300',
      softBg: 'bg-orange-50',
      softBgHover: 'hover:bg-orange-50',
      softText: 'text-orange-500',
    },
    accentId: 'orange',
  },

  chocolate: {
    id: 'chocolate',
    name: 'Chocolate',
    tagline: 'Marrom rico e confortável',
    page: {
      backgroundClass: 'bg-gradient-to-br from-stone-100 via-amber-100 to-stone-200',
      blobClassA: 'bg-amber-800/15',
      blobClassB: 'bg-stone-400/25',
    },
    card: {
      containerClass:
        'bg-white/85 backdrop-blur-xl rounded-[2rem] shadow-xl shadow-amber-900/15 border border-white/70',
    },
    header: { gradientClass: 'from-amber-800 via-amber-700 to-amber-600' },
    text: {
      primaryClass: 'text-stone-800',
      secondaryClass: 'text-stone-500',
      mutedClass: 'text-stone-400',
      nameAccentClass: 'text-amber-900',
    },
    social: { buttonClass: 'bg-white/80 border-amber-900/15 text-amber-900' },
    buttonPalette: {
      bg: 'bg-white',
      border: 'border-amber-900/15',
      borderStrong: 'border-amber-800',
      text: 'text-stone-800',
      hoverBorder: 'hover:border-amber-800',
      softBg: 'bg-amber-50',
      softBgHover: 'hover:bg-amber-100',
      softText: 'text-amber-900',
    },
    accentId: 'yellow',
  },

  'lavender-dream': {
    id: 'lavender-dream',
    name: 'Lavanda',
    tagline: 'Lilás sonhador e calmo',
    page: {
      backgroundClass: 'bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-100',
      blobClassA: 'bg-violet-200/60',
      blobClassB: 'bg-purple-200/50',
    },
    card: {
      containerClass:
        'bg-white/85 backdrop-blur-xl rounded-[2rem] shadow-xl shadow-violet-200/50 border border-white/70',
    },
    header: { gradientClass: 'from-violet-300 via-purple-300 to-indigo-300' },
    text: {
      primaryClass: 'text-stone-800',
      secondaryClass: 'text-stone-500',
      mutedClass: 'text-stone-400',
      nameAccentClass: 'text-violet-500',
    },
    social: { buttonClass: 'bg-white/80 border-violet-100 text-violet-400' },
    buttonPalette: {
      bg: 'bg-white',
      border: 'border-violet-100',
      borderStrong: 'border-violet-300',
      text: 'text-stone-700',
      hoverBorder: 'hover:border-violet-300',
      softBg: 'bg-violet-50',
      softBgHover: 'hover:bg-violet-50',
      softText: 'text-violet-500',
    },
    accentId: 'violet',
  },

  'cotton-candy': {
    id: 'cotton-candy',
    name: 'Algodão-Doce',
    tagline: 'Rosa e azul de parque',
    page: {
      backgroundClass: 'bg-gradient-to-br from-pink-100 via-fuchsia-50 to-sky-100',
      blobClassA: 'bg-pink-200/60',
      blobClassB: 'bg-sky-200/50',
    },
    card: {
      containerClass:
        'bg-white/85 backdrop-blur-xl rounded-[2rem] shadow-xl shadow-pink-200/50 border border-white/70',
    },
    header: { gradientClass: 'from-pink-300 via-fuchsia-300 to-sky-300' },
    text: {
      primaryClass: 'text-stone-800',
      secondaryClass: 'text-stone-500',
      mutedClass: 'text-stone-400',
      nameAccentClass: 'text-fuchsia-500',
    },
    social: { buttonClass: 'bg-white/80 border-pink-100 text-fuchsia-400' },
    buttonPalette: {
      bg: 'bg-white',
      border: 'border-pink-100',
      borderStrong: 'border-fuchsia-300',
      text: 'text-stone-700',
      hoverBorder: 'hover:border-fuchsia-300',
      softBg: 'bg-pink-50',
      softBgHover: 'hover:bg-pink-50',
      softText: 'text-fuchsia-500',
    },
    accentId: 'fuchsia',
  },

  'sky-breeze': {
    id: 'sky-breeze',
    name: 'Céu',
    tagline: 'Azul sereno de dia claro',
    page: {
      backgroundClass: 'bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-100',
      blobClassA: 'bg-sky-200/60',
      blobClassB: 'bg-blue-200/50',
    },
    card: {
      containerClass:
        'bg-white/85 backdrop-blur-xl rounded-[2rem] shadow-xl shadow-sky-200/50 border border-white/70',
    },
    header: { gradientClass: 'from-sky-300 via-blue-300 to-cyan-300' },
    text: {
      primaryClass: 'text-stone-800',
      secondaryClass: 'text-stone-500',
      mutedClass: 'text-stone-400',
      nameAccentClass: 'text-sky-600',
    },
    social: { buttonClass: 'bg-white/80 border-sky-100 text-sky-500' },
    buttonPalette: {
      bg: 'bg-white',
      border: 'border-sky-100',
      borderStrong: 'border-sky-300',
      text: 'text-stone-700',
      hoverBorder: 'hover:border-sky-300',
      softBg: 'bg-sky-50',
      softBgHover: 'hover:bg-sky-50',
      softText: 'text-sky-600',
    },
    accentId: 'cyan',
  },

  'mint-fresh': {
    id: 'mint-fresh',
    name: 'Menta',
    tagline: 'Fresco e revigorante',
    page: {
      backgroundClass: 'bg-gradient-to-br from-teal-50 via-cyan-50 to-emerald-100',
      blobClassA: 'bg-teal-200/60',
      blobClassB: 'bg-cyan-200/50',
    },
    card: {
      containerClass:
        'bg-white/85 backdrop-blur-xl rounded-[2rem] shadow-xl shadow-teal-200/50 border border-white/70',
    },
    header: { gradientClass: 'from-teal-300 via-cyan-300 to-emerald-300' },
    text: {
      primaryClass: 'text-stone-800',
      secondaryClass: 'text-stone-500',
      mutedClass: 'text-stone-400',
      nameAccentClass: 'text-teal-600',
    },
    social: { buttonClass: 'bg-white/80 border-teal-100 text-teal-500' },
    buttonPalette: {
      bg: 'bg-white',
      border: 'border-teal-100',
      borderStrong: 'border-teal-300',
      text: 'text-stone-700',
      hoverBorder: 'hover:border-teal-300',
      softBg: 'bg-teal-50',
      softBgHover: 'hover:bg-teal-50',
      softText: 'text-teal-600',
    },
    accentId: 'teal',
  },

  'sage-garden': {
    id: 'sage-garden',
    name: 'Sálvia',
    tagline: 'Verde orgânico e terroso',
    page: {
      backgroundClass: 'bg-gradient-to-br from-stone-50 via-lime-50 to-green-100',
      blobClassA: 'bg-lime-200/60',
      blobClassB: 'bg-green-200/50',
    },
    card: {
      containerClass:
        'bg-white/85 backdrop-blur-xl rounded-[2rem] shadow-xl shadow-lime-200/50 border border-white/70',
    },
    header: { gradientClass: 'from-lime-300 via-green-300 to-emerald-200' },
    text: {
      primaryClass: 'text-stone-800',
      secondaryClass: 'text-stone-500',
      mutedClass: 'text-stone-400',
      nameAccentClass: 'text-green-700',
    },
    social: { buttonClass: 'bg-white/80 border-lime-100 text-green-600' },
    buttonPalette: {
      bg: 'bg-white',
      border: 'border-lime-100',
      borderStrong: 'border-lime-400',
      text: 'text-stone-700',
      hoverBorder: 'hover:border-lime-400',
      softBg: 'bg-lime-50',
      softBgHover: 'hover:bg-lime-50',
      softText: 'text-green-700',
    },
    accentId: 'lime',
  },
};

// ---------------------------------------------------------------------------
// Estilos de botão (forma + acabamento; as cores vêm do tema)
// ---------------------------------------------------------------------------

export const BUTTON_STYLES: ButtonStyleSpec[] = [
  { id: 'rounded', name: 'Preenchido', tagline: 'O clássico limpo' },
  { id: 'outline', name: 'Contorno', tagline: 'Leve e minimal' },
  { id: 'shadow', name: 'Sombra', tagline: 'Marcante e moderno' },
];

// ---------------------------------------------------------------------------
// Defaults e mapeamento legado
// ---------------------------------------------------------------------------

export const DEFAULT_THEME_ID: ThemeId = 'porcelain';
export const DEFAULT_BUTTON_STYLE_ID: ButtonStyleId = 'rounded';

/**
 * Mapeia o headerGradient legado para o tema novo mais próximo.
 * ⚠️ Duplicado propositalmente no script de migração
 * (scripts/migrate-themes.js) — manter em sincronia.
 */
const LEGACY_GRADIENT_TO_THEME: Record<string, ThemeId> = {
  'indigo-purple': 'lavender-dream',
  'violet-fuchsia': 'cotton-candy',
  'red-pink': 'cherry',
  'rose-orange': 'peach-cream',
  'amber-yellow': 'chocolate',
  'emerald-teal': 'mint-fresh',
  'blue-cyan': 'sky-breeze',
  'slate-zinc': 'porcelain',
  'monochrome-gray': 'porcelain',
  'monochrome-dark': 'porcelain',
  'chocolate-brown': 'chocolate',
  'coffee-cream': 'chocolate',
  'caramel-toffee': 'peach-cream',
  'copper-bronze': 'chocolate',
  'taupe-beige': 'chocolate',
  'espresso-roast': 'chocolate',
};

/**
 * Fundos legados escuros: migram para o tema mais neutro da galeria
 * (não há tema dark na galeria pastel).
 */
const LEGACY_DARK_BACKGROUNDS = new Set([
  'neutral-900',
  'slate-900',
  'indigo-950',
  'gradient-dark-purple',
  'gradient-dark-blue',
]);

/**
 * IDs de tema antigos (removidos da galeria) → tema novo equivalente.
 * Garante que usuários que já tinham salvo um tema antigo não caiam no default.
 */
const LEGACY_THEME_TO_THEME: Record<string, ThemeId> = {
  'mocha-cream': 'chocolate',
  'caramel-toffee': 'peach-cream',
};

// ---------------------------------------------------------------------------
// Resolução
// ---------------------------------------------------------------------------

/**
 * Resolve o tema efetivo a partir do appearanceSettings salvo.
 * Prioridade: theme explícito → mapeamento legado (gradiente/fundo) → default.
 */
export function resolveTheme(appearance?: AppearanceInput | null): ResolvedTheme {
  let id: ThemeId | undefined;

  if (appearance?.theme) {
    if (appearance.theme in THEME_DEFINITIONS) {
      id = appearance.theme as ThemeId;
    } else if (appearance.theme in LEGACY_THEME_TO_THEME) {
      id = LEGACY_THEME_TO_THEME[appearance.theme];
    }
  }

  if (!id && appearance?.backgroundColor && LEGACY_DARK_BACKGROUNDS.has(appearance.backgroundColor)) {
    id = 'porcelain';
  }

  if (!id && appearance?.headerGradient && appearance.headerGradient in LEGACY_GRADIENT_TO_THEME) {
    id = LEGACY_GRADIENT_TO_THEME[appearance.headerGradient];
  }

  const def = THEME_DEFINITIONS[id ?? DEFAULT_THEME_ID];
  return { ...def, accent: ACCENTS[def.accentId] };
}

/** Resolve o estilo de botão efetivo (com fallback para o default). */
export function resolveButtonStyleId(appearance?: AppearanceInput | null): ButtonStyleId {
  const id = appearance?.buttonStyle;
  return BUTTON_STYLES.some((s) => s.id === id) ? (id as ButtonStyleId) : DEFAULT_BUTTON_STYLE_ID;
}

/** Raio de borda do estilo (para outros componentes combinarem, ex.: botão PIX). */
export function resolveButtonRadius(styleId: ButtonStyleId): string {
  switch (styleId) {
    case 'rounded':
    case 'outline':
    case 'shadow':
    default:
      return 'rounded-2xl';
  }
}

/**
 * Monta as classes do botão de link gratuito combinando tema + estilo.
 * As classes de layout (flex, padding, largura) ficam no componente.
 */
export function resolveButton(theme: ResolvedTheme, styleId: ButtonStyleId): ResolvedButton {
  const p = theme.buttonPalette;

  switch (styleId) {
    case 'outline':
      return {
        containerClass: `bg-transparent ${p.softText} border-2 ${p.borderStrong} ${p.softBgHover} hover:-translate-y-0.5 rounded-2xl transition-all duration-200`,
        iconTileClass: `${p.softBg} ${p.softText} rounded-xl`,
      };
    case 'shadow':
      return {
        containerClass: `${p.bg} ${p.text} border-2 border-slate-900 rounded-2xl shadow-[4px_4px_0_0_#0f172a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#0f172a] transition-all duration-150`,
        iconTileClass: `${p.softBg} ${p.softText} rounded-xl border border-slate-900/10`,
      };
    case 'rounded':
    default:
      return {
        containerClass: `${p.bg} ${p.text} border ${p.border} ${p.hoverBorder} shadow-sm hover:shadow-md hover:-translate-y-0.5 rounded-2xl transition-all duration-200`,
        iconTileClass: `${p.softBg} ${p.softText} rounded-xl`,
      };
  }
}

/** Lista de temas para a galeria do editor (ordem de exibição). */
export const THEME_LIST: ResolvedTheme[] = (
  [
    'porcelain',
    'rose-pastel',
    'cherry',
    'peach-cream',
    'chocolate',
    'lavender-dream',
    'cotton-candy',
    'sky-breeze',
    'mint-fresh',
    'sage-garden',
  ] as ThemeId[]
).map((id) => ({ ...THEME_DEFINITIONS[id], accent: ACCENTS[THEME_DEFINITIONS[id].accentId] }));
