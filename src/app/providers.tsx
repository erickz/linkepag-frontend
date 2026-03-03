'use client';

import { useEffect } from 'react';
import { AuthProvider } from '@/hooks/useAuth';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    console.log('[Providers] Mounted on client');
  }, []);
  
  return <AuthProvider>{children}</AuthProvider>;
}
