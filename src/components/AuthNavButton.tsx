'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface AuthNavButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function AuthNavButton({ children, className, onClick }: AuthNavButtonProps) {
  const [mounted, setMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    setIsAuthenticated(!!token);
  }, []);

  // Always render the same initially to avoid hydration mismatch
  // The href and text will update after mount based on auth state
  const href = mounted && isAuthenticated ? '/admin/dashboard' : '/register';
  
  return (
    <Link href={href} onClick={onClick} className={className}>
      {mounted && isAuthenticated ? 'Acessar conta' : children}
    </Link>
  );
}
