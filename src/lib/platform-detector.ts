export type DetectedPlatform = 'telegram' | 'whatsapp' | 'google-calendar' | 'calendly' | 'generic';

export function detectPlatformFromUrl(url: string): DetectedPlatform {
  const lower = url.toLowerCase();
  if (lower.includes('t.me/') || lower.includes('telegram.me/') || lower.includes('telegram.org/')) return 'telegram';
  if (lower.includes('wa.me/') || lower.includes('api.whatsapp.com/') || lower.includes('whatsapp.com/') || lower.includes('chat.whatsapp.com/')) return 'whatsapp';
  if (lower.includes('calendar.google.com/')) return 'google-calendar';
  if (lower.includes('calendly.com/')) return 'calendly';
  return 'generic';
}

export function getPlatformLabel(platform: DetectedPlatform): string {
  const labels: Record<DetectedPlatform, string> = {
    telegram: 'Telegram',
    whatsapp: 'WhatsApp',
    'google-calendar': 'Google Calendar',
    calendly: 'Calendly',
    generic: 'Agendamento',
  };
  return labels[platform];
}
