'use client';

import { AdminSidebar } from './AdminSidebar';
import { PlanNotification } from './PlanNotification';
import { useProtectedRoute } from '@/hooks/useAuth';
import { IconInstagram, IconTiktok } from './icons';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { isAuthenticated, isLoading } = useProtectedRoute('/login');

  // Não renderiza NADA até confirmar autenticação
  // Isso previne que o conteúdo seja visível antes do redirecionamento
  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <AdminSidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Plan Notification Banner */}
        <PlanNotification />
        
        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pt-14 sm:pt-16 lg:pt-8 pl-14 sm:pl-16 lg:pl-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white py-4 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
            <span>© {new Date().getFullYear()} LinkePag</span>
            <div className="flex items-center gap-4">
              <a
                href="https://www.tiktok.com/@linkepag"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="text-slate-400 hover:text-indigo-600 transition"
              >
                <IconTiktok size={18} />
              </a>
              <a
                href="https://www.instagram.com/linkepag"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="text-slate-400 hover:text-indigo-600 transition"
              >
                <IconInstagram size={18} />
              </a>
              <a
                href="mailto:suporte@linkepag.com.br"
                className="text-slate-600 hover:text-indigo-600 transition"
              >
                suporte@linkepag.com.br
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default AdminLayout;
