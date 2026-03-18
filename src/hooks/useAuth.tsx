'use client';

import { useState, useEffect, createContext, useContext, ReactNode, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.linkepag.com.br';

export interface User {
  id: string;
  fullName: string;
  email: string;
  cpf: string;
  username: string;
  planId?: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isLoggingOut: boolean;
  login: (token: string, user: User, isNewUser?: boolean) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Verifica se o token JWT é válido (não expirado)
 * @returns objeto com isValid e decoded data (se válido)
 */
function verifyToken(storedToken: string | null): { isValid: boolean; decoded: { exp?: number } | null } {
  if (!storedToken) {
    return { isValid: false, decoded: null };
  }

  try {
    const tokenData = JSON.parse(atob(storedToken.split('.')[1]));
    const expirationTime = tokenData.exp * 1000; // Converte para ms
    
    if (Date.now() >= expirationTime) {
      return { isValid: false, decoded: tokenData };
    }
    
    return { isValid: true, decoded: tokenData };
  } catch {
    return { isValid: false, decoded: null };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Função para limpar auth (centralizada)
  const clearAuth = useCallback(() => {
    setToken(null);
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }, []);

  useEffect(() => {
    // Só executa no cliente e apenas uma vez
    if (typeof window === 'undefined' || isInitialized) {
      return;
    }

    const checkAuth = () => {
      try {
        // Check for existing auth on mount
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
          const { isValid } = verifyToken(storedToken);
          
          if (isValid) {
            try {
              const parsedUser = JSON.parse(storedUser);
              setToken(storedToken);
              setUser(parsedUser);
            } catch {
              // Erro ao fazer parse do usuário, limpa tudo
              clearAuth();
            }
          } else {
            // Token expirado ou inválido, limpa localStorage e estado
            clearAuth();
          }
        }
      } catch (e) {
        console.error('[useAuth] Error in auth check:', e);
        clearAuth();
      } finally {
        // SEMPRE marca isLoading como false, independente do resultado
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Redirect authenticated users away from auth pages
    // Only redirect after initial auth check is complete to avoid loops
    if (!isLoading && user && (pathname === '/login' || pathname === '/register')) {
      // Check if this is a new user registration
      const isNewUser = typeof window !== 'undefined' ? localStorage.getItem('lp_new_user') === 'true' : false;
      if (isNewUser) {
        router.push('/admin/onboarding');
      } else {
        router.push('/admin/dashboard');
      }
    }
  }, [isLoading, user, pathname, router]);

  const login = useCallback((newToken: string, newUser: User, isNewUser: boolean = false) => {
    setToken(newToken);
    setUser(newUser);
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));
      if (isNewUser) {
        localStorage.setItem('lp_new_user', 'true');
      } else {
        localStorage.removeItem('lp_new_user');
      }
    }
  }, []);

  const logout = useCallback(() => {
    setIsLoggingOut(true);
    clearAuth();
    router.push('/');
  }, [clearAuth, router]);

  // Função para buscar perfil atualizado da API
  const refreshUser = useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/users/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Atualiza apenas se houve mudança no planId ou outros dados
        const updatedUser: User = {
          id: data.id,
          fullName: data.fullName,
          email: data.email,
          cpf: data.cpf,
          username: data.username,
          planId: data.planId,
        };
        
        setUser(updatedUser);
        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
      }
    } catch (error) {
      console.error('[useAuth] Error refreshing user:', error);
    }
  }, [token]);

  // Valor memoizado para evitar re-renders desnecessários
  const value = useMemo(() => {
    console.log('[useAuth] Creating value object, refreshUser type:', typeof refreshUser);
    return {
      user,
      token,
      isLoading,
      isAuthenticated: !!token && !!user,
      isLoggingOut,
      login,
      logout,
      refreshUser,
    };
  }, [user, token, isLoading, isLoggingOut, login, logout, refreshUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Custom hook to protect routes
export function useProtectedRoute(redirectTo: string = '/login') {
  const { isAuthenticated, isLoading, token, isLoggingOut } = useAuth();
  const router = useRouter();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    // Só redireciona após:
    // 1. Componente ter montado (evita hydration mismatch)
    // 2. Auth check ter completado (isLoading = false)
    // 3. Não estar autenticado
    // 4. NÃO está em processo de logout manual (isLoggingOut = false)
    if (hasMounted && !isLoading && !isAuthenticated && !isLoggingOut && typeof window !== 'undefined') {
      router.push(redirectTo);
    }
  }, [hasMounted, isAuthenticated, isLoading, isLoggingOut, router, redirectTo]);

  // Verificação adicional: se tem token mas está expirado, força logout
  useEffect(() => {
    if (token && typeof window !== 'undefined') {
      const { isValid } = verifyToken(token);
      if (!isValid) {
        router.push(redirectTo);
      }
    }
  }, [token, router, redirectTo]);

  return { isAuthenticated, isLoading };
}
