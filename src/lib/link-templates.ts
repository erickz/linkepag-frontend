import { IconLink, IconLock, IconDownload, IconCalendar } from '@/components/icons';

export type LinkTemplateId = 'direct' | 'paid_access' | 'digital_product' | 'scheduling';

export interface LinkTemplateConfig {
  id: LinkTemplateId;
  label: string;
  shortDesc: string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'emerald' | 'amber' | 'indigo' | 'violet';
}

// Ordem otimizada: monetizados primeiro, começando pelo mais simples (Acesso Pago)
export const linkTemplates: LinkTemplateConfig[] = [
  {
    id: 'paid_access',
    label: 'Cobrar pelo link',
    shortDesc: 'Libere após o pagamento',
    icon: IconLock,
    color: 'indigo',
  },
  {
    id: 'digital_product',
    label: 'Vender arquivo',
    shortDesc: 'PDF, vídeo, áudio etc.',
    icon: IconDownload,
    color: 'amber',
  },
  {
    id: 'direct',
    label: 'Link simples',
    shortDesc: 'Redireciona para um site',
    icon: IconLink,
    color: 'emerald',
  },
  {
    id: 'scheduling',
    label: 'Agendamento',
    shortDesc: 'WhatsApp, Telegram etc.',
    icon: IconCalendar,
    color: 'violet',
  },
];

export const linkTemplateOrder: LinkTemplateId[] = linkTemplates.map((t) => t.id);

export const getLinkTemplateById = (id: LinkTemplateId) =>
  linkTemplates.find((t) => t.id === id) || linkTemplates[0];

export const getDefaultLinkTemplate = (): LinkTemplateId => 'paid_access';

export const linkTemplateColors: Record<
  string,
  { border: string; bg: string; text: string; iconBg: string; iconText: string }
> = {
  emerald: {
    border: 'border-emerald-500',
    bg: 'bg-emerald-50',
    text: 'text-emerald-900',
    iconBg: 'bg-emerald-100',
    iconText: 'text-emerald-600',
  },
  violet: {
    border: 'border-violet-500',
    bg: 'bg-violet-50',
    text: 'text-violet-900',
    iconBg: 'bg-violet-100',
    iconText: 'text-violet-600',
  },
  indigo: {
    border: 'border-indigo-500',
    bg: 'bg-indigo-50',
    text: 'text-indigo-900',
    iconBg: 'bg-indigo-100',
    iconText: 'text-indigo-600',
  },
  amber: {
    border: 'border-amber-500',
    bg: 'bg-amber-50',
    text: 'text-amber-900',
    iconBg: 'bg-amber-100',
    iconText: 'text-amber-600',
  },
};

export const getUrlPlaceholder = (template: LinkTemplateId) => {
  switch (template) {
    case 'scheduling':
      return 'https://wa.me/5511999999999';
    case 'paid_access':
      return 'https://seusite.com';
    case 'digital_product':
      return 'https://seusite.com (opcional)';
    default:
      return 'https://seusite.com';
  }
};

export const getUrlLabel = (template: LinkTemplateId) => {
  switch (template) {
    case 'paid_access':
      return 'Link que o cliente vai acessar *';
    case 'scheduling':
      return 'Link *';
    case 'digital_product':
      return 'Link de redirecionamento (opcional)';
    default:
      return 'Link *';
  }
};

export const getUrlHelpText = (template: LinkTemplateId) => {
  switch (template) {
    case 'paid_access':
      return 'Após o pagamento, o comprador é redirecionado para cá.';
    case 'digital_product':
      return 'O comprador será redirecionado para cá após o pagamento (opcional)';
    case 'scheduling':
      return 'Cole o link do WhatsApp, Telegram ou Calendário';
    default:
      return 'Endereço para onde seus visitantes serão direcionados';
  }
};

export const getTitlePlaceholder = (template: LinkTemplateId) => {
  switch (template) {
    case 'paid_access':
      return 'Ex: Acesso ao grupo VIP de receitas';
    case 'digital_product':
      return 'Ex: Ebook 50 Receitas Saudáveis';
    case 'scheduling':
      return 'Ex: Fale comigo no WhatsApp';
    case 'direct':
      return 'Ex: Meu portfólio no Behance';
    default:
      return 'Ex: Meu site';
  }
};

export const getTitleLabel = (template: LinkTemplateId) => {
  switch (template) {
    case 'paid_access':
      return 'Nome da oferta *';
    case 'digital_product':
      return 'Nome do produto *';
    case 'direct':
    case 'scheduling':
      return 'Título do botão *';
    default:
      return 'Nome do link *';
  }
};

export const getTemplateContextDescription = (template: LinkTemplateId) => {
  switch (template) {
    case 'paid_access':
      return 'O cliente paga para acessar este link.';
    case 'digital_product':
      return 'O cliente paga e recebe o arquivo por email.';
    case 'direct':
      return 'Qualquer pessoa pode acessar este link.';
    case 'scheduling':
      return 'Leva o visitante para o seu canal de atendimento.';
  }
};

export const isMonetizedTemplate = (template: LinkTemplateId) =>
  template === 'paid_access' || template === 'digital_product';

export const isUrlRequired = (template: LinkTemplateId) =>
  template === 'direct' || template === 'scheduling';
