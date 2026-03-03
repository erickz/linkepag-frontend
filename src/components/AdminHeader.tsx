'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from './Logo';
import { PlanBadge } from './PlanNotification';

interface AdminHeaderProps {
  showWelcome?: boolean;
}

export function AdminHeader({ showWelcome = true }: AdminHeaderProps) {
  const { logout } = useAuth();
  const firstName = typeof window !== 'undefined' 
    ? JSON.parse(localStorage.getItem('lp_user') || '{}')?.fullName?.split(' ')[0] || 'Creator'
    : 'Creator';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
        <Link href="/admin/dashboard" className="hover:opacity-90 transition-opacity">
          <Logo size="md" showText={true} />
        </Link>
        
        <div className="flex items-center gap-4">
          <PlanBadge />
          {showWelcome && (
            <span className="text-slate-600 text-sm hidden sm:block">
              Olá, <span className="font-semibold text-slate-900">{firstName}</span>
            </span>
          )}
          <button
            onClick={logout}
            className="text-sm text-slate-500 hover:text-rose-600 font-medium transition flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}

export default AdminHeader;
