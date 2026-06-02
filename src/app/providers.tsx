'use client';

import { AuthProvider } from '@/hooks/useAuth';
import { PixelFlush } from '@/components/PixelFlush';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PixelFlush />
      {children}
    </AuthProvider>
  );
}
