'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { loginUser } from '@/lib/api';
import { useLoginThrottle } from '@/hooks/useLoginThrottle';
import { IconMail, IconLock, IconCheck, IconArrowRight, IconAlert } from '@/components/icons';
import { Logo } from '@/components/Logo';

export default function Login() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { 
    isBlocked, 
    remainingTime, 
    checkAndRecordAttempt, 
    recordSuccess, 
    recordFailure 
  } = useLoginThrottle();
  const [form, setForm] = useState({
    email: '',
    password: ''
  });
  const [focused, setFocused] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [apiError, setApiError] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);

  const validateEmail = (email: string): string => {
    if (!email.trim()) {
      return 'Email é obrigatório';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Digite um email válido';
    }
    return '';
  };

  const validatePassword = (password: string): string => {
    if (!password.trim()) {
      return 'Senha é obrigatória';
    }
    return '';
  };

  const handleBlur = (field: string) => {
    setFocused(null);
    let error = '';

    if (field === 'email') {
      error = validateEmail(form.email);
    } else if (field === 'password') {
      error = validatePassword(form.password);
    }

    setErrors(prev => ({
      ...prev,
      [field]: error
    }));
  };

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    
    if (errors[field] || value.trim()) {
      let error = '';
      if (field === 'email') {
        error = validateEmail(value);
      } else if (field === 'password') {
        error = validatePassword(value);
      }

      setErrors(prev => ({
        ...prev,
        [field]: error
      }));
    }
  };

  const isFormValid = (): boolean => {
    return (
      form.email.trim() !== '' &&
      form.password.trim() !== '' &&
      validateEmail(form.email) === '' &&
      validatePassword(form.password) === '' &&
      !isBlocked
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isFormValid()) {
      const throttleCheck = checkAndRecordAttempt();
      
      if (throttleCheck.blocked) {
        setApiError(`Muitas tentativas. Tente novamente em ${throttleCheck.remainingTime}s`);
        return;
      }

      setIsLoginLoading(true);
      setApiError('');

      if (throttleCheck.delay) {
        await new Promise(resolve => setTimeout(resolve, throttleCheck.delay));
      }

      loginUser({
        email: form.email,
        password: form.password,
      })
        .then((result) => {
          setSubmitted(true);
          recordSuccess();
          // Pass isNewUser=false para redirecionar para dashboard
          login(result.token, result.user, false);
          // Não precisa redirecionar manualmente, o useAuth faz isso
        })
        .catch((error) => {
          recordFailure();
          setApiError(error.message);
        })
        .finally(() => {
          setIsLoginLoading(false);
        });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Redirecionamento é tratado pelo useAuth

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Logo + Heading */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-3 hover:opacity-90 transition-opacity mb-6">
            <Logo size="md" showText={false} />
            <span className="text-xl font-bold text-slate-900">
              Linke<span className="text-emerald-500">Pag</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Bem-vindo de volta
          </h1>
          <p className="text-sm text-slate-500">
            Entre com sua conta para continuar
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 mb-4">
          {isBlocked && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <IconAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-amber-700 font-medium text-sm">
                Muitas tentativas. Tente novamente em {remainingTime}s
              </p>
            </div>
          )}

          {apiError && !isBlocked && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
              <IconAlert className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <p className="text-rose-700 font-medium text-sm">{apiError}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <IconMail className="w-5 h-5" />
              </div>
              <input
                type="email"
                placeholder="seu@email.com"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                onFocus={() => setFocused('email')}
                onBlur={() => handleBlur('email')}
                className={`w-full h-12 pl-11 pr-4 rounded-xl border transition text-sm text-slate-900 placeholder:text-slate-400 bg-white
                  ${errors.email
                    ? 'border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-200'
                    : focused === 'email'
                      ? 'border-indigo-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
                      : 'border-slate-200 hover:border-slate-300'
                  } focus:outline-none`}
                style={{ color: '#0f172a' }}
              />
            </div>
            {errors.email && <p className="text-rose-500 text-xs mt-1.5 ml-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Senha
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <IconLock className="w-5 h-5" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Sua senha"
                value={form.password}
                onChange={(e) => handleChange('password', e.target.value)}
                onFocus={() => setFocused('password')}
                onBlur={() => handleBlur('password')}
                className={`w-full h-12 pl-11 pr-12 rounded-xl border transition text-sm text-slate-900 placeholder:text-slate-400 bg-white
                  ${errors.password
                    ? 'border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-200'
                    : focused === 'password'
                      ? 'border-indigo-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
                      : 'border-slate-200 hover:border-slate-300'
                  } focus:outline-none`}
                style={{ color: '#0f172a' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {errors.password && <p className="text-rose-500 text-xs mt-1.5 ml-1">{errors.password}</p>}
          </div>

          <div className="text-right">
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition"
            >
              Esqueceu a senha?
            </Link>
          </div>

          <button
            type="submit"
            disabled={!isFormValid() || submitted || isLoginLoading || isBlocked}
            className={`w-full h-12 rounded-xl text-white font-semibold text-sm shadow-sm transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2
              ${isBlocked
                ? 'bg-amber-500 cursor-not-allowed'
                : submitted
                  ? 'bg-emerald-500 hover:bg-emerald-600'
                  : isFormValid() && !isLoginLoading
                    ? 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/25'
                    : 'bg-slate-300 cursor-not-allowed'
              }`}
          >
            {isBlocked 
              ? `Aguarde ${remainingTime}s` 
              : isLoginLoading 
                ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Entrando...
                  </>
                )
                : submitted 
                  ? (
                    <>
                      <IconCheck className="w-5 h-5" />
                      Login realizado!
                    </>
                  )
                  : (
                    <>
                      Entrar
                      <IconArrowRight className="w-4 h-4" />
                    </>
                  )
            }
          </button>
        </form>

        <div className="text-center pt-4 border-t border-slate-200">
          <p className="text-sm text-slate-500">
            Não tem conta?{' '}
            <Link
              href="/register"
              className="font-semibold text-indigo-600 hover:text-indigo-700 transition"
            >
              Criar conta
            </Link>
          </p>
        </div>

        <div className="text-center mt-6">
          <div className="inline-flex items-center gap-2 text-xs text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">
            <IconLock className="w-3.5 h-3.5" />
            <span>Seus dados estão protegidos</span>
          </div>
        </div>
      </div>
    </main>
  );
}
