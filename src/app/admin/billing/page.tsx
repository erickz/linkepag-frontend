'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BillingRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/admin/plans');
  }, [router]);
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-slate-500">Redirecionando...</p>
    </div>
  );
}
