'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from './Logo';
// import { PlanBadge } from './PlanNotification';
import {
  IconDashboard,
  IconLink,
  IconUser,
  IconCoins,
  IconUsers,
  IconCrown,
  IconSettings,
  IconChevronDown,
  IconExternalLink,
  IconLogout,
  IconMenu,
  IconX,
  IconReceipt,
} from './icons';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

export function AdminSidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [profile, setProfile] = useState<{ username: string; displayName?: string } | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Ref para controle de montagem
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Load profile from localStorage or useAuth
  useEffect(() => {
    // Primeiro tenta usar o user do useAuth (mais atualizado)
    if (user) {
      const newProfile = {
        username: user.username,
        displayName: user.fullName?.split(' ')[0] || user.username,
      };
      
      // Só atualiza se os valores realmente mudaram
      const shouldUpdate = !profile || 
        profile.username !== newProfile.username || 
        profile.displayName !== newProfile.displayName;
      
      if (shouldUpdate) {
        if (isMountedRef.current) {
          setProfile(newProfile);
        }
      }
      return;
    }
    
    // Fallback para localStorage (apenas se não temos user do auth E não temos profile)
    if (!profile) {
      const userData = localStorage.getItem('lp_user');
      if (userData) {
        try {
          const parsed = JSON.parse(userData);
          const newProfile = {
            username: parsed.username,
            displayName: parsed.displayName || parsed.fullName?.split(' ')[0] || parsed.username,
          };
          
          if (isMountedRef.current) {
            setProfile(newProfile);
          }
        } catch (error) {
          console.error('[AdminSidebar] Erro ao parsear user do localStorage:', error);
        }
      }
    }
  }, [user]); // Atualiza quando o user mudar

  // Check if settings submenu should be open based on current path
  useEffect(() => {
    if (pathname?.startsWith('/admin/settings')) {
      setIsSettingsOpen(true);
    }
  }, [pathname]);

  const publicUrl = profile?.username ? `/p/${profile.username}` : '#';
  const publicUrlFull = typeof window !== 'undefined' && profile?.username
    ? `${window.location.origin}/p/${profile.username}`
    : '';

  const mainNavItems: NavItem[] = [
    {
      label: 'Dashboard',
      href: '/admin/dashboard',
      icon: <IconDashboard className="w-5 h-5" />,
    },
    {
      label: 'Editor da Página',
      href: '/admin/editor',
      icon: <IconLink className="w-5 h-5" />,
    },
    {
      label: 'Vendas',
      href: '/admin/payments',
      icon: <IconCoins className="w-5 h-5" />,
    },
    {
      label: 'Cobranças',
      href: '/admin/billing',
      icon: <IconReceipt className="w-5 h-5" />,
    },
    {
      label: 'Leads',
      href: '/admin/leads',
      icon: <IconUsers className="w-5 h-5" />,
    },
    {
      label: 'Seu plano',
      href: '/admin/plans',
      icon: <IconCrown className="w-5 h-5" />,
      // badge: <PlanBadge />,
    },
  ];

  const settingsNavItems: NavItem[] = [
    {
      label: 'Dados Pessoais',
      href: '/admin/settings/personal',
      icon: <IconSettings className="w-4 h-4" />,
    },
    {
      label: 'Pagamentos',
      href: '/admin/settings/payments',
      icon: <IconCoins className="w-4 h-4" />,
    },
  ];

  const isActive = (href: string) => {
    if (href === '/admin/dashboard') {
      return pathname === '/admin/dashboard' || pathname === '/admin';
    }
    return pathname?.startsWith(href);
  };

  const NavLink = ({ item, isSubmenu = false }: { item: NavItem; isSubmenu?: boolean }) => (
    <Link
      href={item.href}
      onClick={() => setIsMobileMenuOpen(false)}
      className={`
        flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
        ${isActive(item.href)
          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }
        ${isSubmenu ? 'pl-10' : ''}
      `}
    >
      <span className={isActive(item.href) ? 'text-white' : 'text-slate-400'}>
        {item.icon}
      </span>
      <span className="flex-1">{item.label}</span>
      {item.badge}
    </Link>
  );

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-4 border-b border-slate-200">
        <Link href="/admin/dashboard" className="flex items-center gap-2">
          <Logo size="sm" showText={true} />
        </Link>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {/* Public URL Card - NEW */}
        {profile?.username && (
          <div className="px-2">
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-3 border border-indigo-100">
              <p className="text-xs text-slate-500 mb-1.5">Sua página pública</p>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-indigo-700 truncate flex-1">
                  linkpagg.com/p/{profile.username}
                </span>
              </div>
              <Link
                href={publicUrl}
                target="_blank"
                className="flex items-center justify-center gap-1.5 w-full px-3 py-2 bg-white text-indigo-600 text-xs font-semibold rounded-lg border border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300 transition"
              >
                <IconExternalLink className="w-3.5 h-3.5" />
                Ver minha página
              </Link>
            </div>
          </div>
        )}

        {/* Main Navigation */}
        <div className="space-y-1">
          <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Menu Principal
          </p>
          {mainNavItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>

        {/* Settings Navigation with Submenu */}
        <div className="space-y-1">
          <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Configurações
          </p>
          
          {/* Settings Toggle */}
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
              ${pathname?.startsWith('/admin/settings')
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }
            `}
          >
            <span className={pathname?.startsWith('/admin/settings') ? 'text-white' : 'text-slate-400'}>
              <IconSettings className="w-5 h-5" />
            </span>
            <span className="flex-1 text-left">Configurações</span>
            <IconChevronDown 
              className={`w-4 h-4 transition-transform duration-200 ${isSettingsOpen ? 'rotate-180' : ''}`} 
            />
          </button>

          {/* Settings Submenu */}
          {isSettingsOpen && (
            <div className="mt-1 space-y-0.5 animate-in slide-in-from-top-2 duration-200">
              {settingsNavItems.map((item) => (
                <NavLink key={item.href} item={item} isSubmenu />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer - User Info & Logout */}
      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
            {profile?.displayName?.[0]?.toUpperCase() || profile?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">
              {profile?.displayName || profile?.username || 'Usuário'}
            </p>
            <p className="text-xs text-slate-500 truncate">@{profile?.username || 'username'}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
        >
          <IconLogout className="w-4 h-4" />
          Sair da conta
        </button>
      </div>
    </>
  );;

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md border border-slate-200 text-slate-600 hover:text-slate-900"
      >
        {isMobileMenuOpen ? <IconX className="w-5 h-5" /> : <IconMenu className="w-5 h-5" />}
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Desktop (fixed) & Mobile (slide-over) */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-40
          h-screen w-72 bg-white border-r border-slate-200
          flex flex-col
          transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <SidebarContent />
      </aside>
    </>
  );
}

export default AdminSidebar;
