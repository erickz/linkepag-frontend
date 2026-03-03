'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { registerUser } from '@/lib/api';
import { useMask } from '@/hooks/useMask';
import { useLoginThrottle } from '@/hooks/useLoginThrottle';
import { IconUser, IconMail, IconLock, IconCheck, IconArrowRight, IconAlert } from '@/components/icons';
import { Logo } from '@/components/Logo';

export default function Signup() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { phoneMask } = useMask();
  const { 
    isBlocked, 
    remainingTime, 
    checkAndRecordAttempt, 
    recordSuccess, 
    recordFailure 
  } = useLoginThrottle();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [focused, setFocused] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isRegisterLoading, setIsRegisterLoading] = useState(false);
  const [apiError, setApiError] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    router.push('/admin/dashboard');
    return null;
  }

  const validateName = (name: string): string => {
    if (!name.trim()) {
      return 'Nome completo é obrigatório';
    }
    const nameParts = name.trim().split(/\s+/);
    if (nameParts.length < 2) {
      return 'Digite seu nome e sobrenome';
    }
    if (nameParts.some(part => part.length < 2)) {
      return 'Cada palavra do nome deve ter pelo menos 2 caracteres';
    }
    return '';
  };

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
    if (password.length < 8) {
      return 'Senha deve ter pelo menos 8 caracteres';
    }
    return '';
  };

  const validateAllFields = (): boolean => {
    const newErrors: Record<string, string> = {};

    const nameError = validateName(form.name);
    if (nameError) newErrors.name = nameError;

    const emailError = validateEmail(form.email);
    if (emailError) newErrors.email = emailError;


    const passwordError = validatePassword(form.password);
    if (passwordError) newErrors.password = passwordError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBlur = (field: string) => {
    setFocused(null);
    let error = '';

    if (field === 'name') {
      error = validateName(form.name);
    } else if (field === 'email') {
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
    // Aplicar máscaras
    let maskedValue = value;
    setForm(prev => ({ ...prev, [field]: maskedValue }));
    
    if (errors[field] || value.trim()) {
      let error = '';
      if (field === 'name') {
        error = validateName(value);
      } else if (field === 'email') {
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
      form.name.trim() !== '' &&
      form.email.trim() !== '' &&
      form.password.trim() !== '' &&
      validateName(form.name) === '' &&
      validateEmail(form.email) === '' &&
      validatePassword(form.password) === '' &&
      !isBlocked
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (validateAllFields()) {
      const throttleCheck = checkAndRecordAttempt();
      
      if (throttleCheck.blocked) {
        setApiError(`Muitas tentativas. Tente novamente em ${throttleCheck.remainingTime}s`);
        return;
      }

      setIsRegisterLoading(true);
      setApiError('');

      if (throttleCheck.delay) {
        await new Promise(resolve => setTimeout(resolve, throttleCheck.delay));
      }

      registerUser({
        name: form.name,
        email: form.email,
        password: form.password,
      })
        .then((result) => {
          setSubmitted(true);
          recordSuccess();
          // Pass isNewUser=true para redirecionar para onboarding
          login(result.token, result.user, true);
          // Não precisa redirecionar manualmente, o useAuth faz isso
        })
        .catch((error) => {
          recordFailure();
          setApiError(error.message);
        })
        .finally(() => {
          setIsRegisterLoading(false);
        });
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Logo + Heading */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex flex-col items-center gap-3 hover:opacity-90 transition-opacity mb-6">
            <Logo size="md" showText={false} />
            <span className="text-xl font-bold text-slate-900">
              Linke<span className="text-emerald-500">Pag</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Crie sua conta
          </h1>
          <p className="text-sm text-slate-500 mb-4">
            Leva menos de 1 minuto
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
              Nome completo
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <IconUser className="w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder="João Silva"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                onFocus={() => setFocused('name')}
                onBlur={() => handleBlur('name')}
                className={`w-full h-12 pl-11 pr-4 rounded-xl border transition text-sm text-slate-900 placeholder:text-slate-400 bg-white
                  ${errors.name
                    ? 'border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-200'
                    : focused === 'name'
                      ? 'border-indigo-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
                      : 'border-slate-200 hover:border-slate-300'
                  } focus:outline-none`}
                style={{ color: '#0f172a' }}
              />
            </div>
            {errors.name && <p className="text-rose-500 text-xs mt-1.5 ml-1">{errors.name}</p>}
          </div>

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
                placeholder="Mínimo 8 caracteres"
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
            {/* Password Strength Indicator */}
            {form.password && (
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex gap-1">
                    {[1, 2, 3].map((level) => {
                      const strength = form.password.length < 8 ? 0 : form.password.length < 10 ? 1 : form.password.match(/[A-Z]/) && form.password.match(/[0-9]/) ? 3 : 2;
                      const colors = ['bg-rose-400', 'bg-amber-400', 'bg-emerald-400', 'bg-emerald-500'];
                      return (
                        <div
                          key={level}
                          className={`h-1.5 flex-1 rounded-full transition-all ${
                            level <= strength ? colors[strength] : 'bg-slate-200'
                          }`}
                        />
                      );
                    })}
                  </div>
                  <span className={`text-xs ${
                    form.password.length < 8 ? 'text-rose-500' : 
                    form.password.length < 10 ? 'text-amber-500' : 
                    form.password.match(/[A-Z]/) && form.password.match(/[0-9]/) ? 'text-emerald-600' : 'text-amber-500'
                  }`}>
                    {form.password.length < 8 ? 'Fraca' : 
                     form.password.length < 10 ? 'Média' : 
                     form.password.match(/[A-Z]/) && form.password.match(/[0-9]/) ? 'Forte' : 'Média'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {form.password.length < 8 ? 'Mínimo 8 caracteres' : 
                   form.password.match(/[A-Z]/) && form.password.match(/[0-9]/) ? 'Excelente! Sua senha está segura.' : 
                   'Adicione letra maiúscula e número para mais segurança'}
                </p>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!isFormValid() || submitted || isRegisterLoading || isBlocked}
            className={`w-full h-12 rounded-xl text-white font-semibold text-sm shadow-sm transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 mt-6
              ${isBlocked
                ? 'bg-amber-500 cursor-not-allowed'
                : submitted
                  ? 'bg-emerald-500 hover:bg-emerald-600'
                  : isFormValid() && !isRegisterLoading
                    ? 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/25'
                    : 'bg-slate-300 cursor-not-allowed'
              }`}
          >
            {isBlocked 
              ? `Aguarde ${remainingTime}s` 
              : isRegisterLoading 
                ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Criando conta...
                  </>
                )
                : submitted 
                  ? (
                    <>
                      <IconCheck className="w-5 h-5" />
                      Conta criada!
                    </>
                  )
                  : (
                    <>
                      Criar minha conta
                      <IconArrowRight className="w-4 h-4" />
                    </>
                  )
            }
          </button>
        </form>

        <div className="text-center pt-4 border-t border-slate-200">
          <p className="text-sm text-slate-500">
            Já tem conta?{' '}
            <Link
              href="/login"
              className="font-semibold text-indigo-600 hover:text-indigo-700 transition"
            >
              Entrar
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
