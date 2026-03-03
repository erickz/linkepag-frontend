'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfileSettingsRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/admin/editor?tab=profile');
  }, [router]);

  return (
    <div className="flex items-center justify-center py-16">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
    </div>
  );
}
