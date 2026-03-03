'use client';

import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { resetPassword } from '@/lib/api';
import { IconLock, IconArrowLeft, IconCheck, IconAlert, IconLoader, IconKey } from '@/components/icons';
import { Logo } from '@/components/Logo';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [focused, setFocused] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Token inválido ou ausente. Solicite uma nova redefinição de senha.');
    }
  }, [token]);

  const validatePassword = (password: string): string => {
    if (!password.trim()) {
      return 'Senha é obrigatória';
    }
    if (password.length < 6) {
      return 'Senha deve ter pelo menos 6 caracteres';
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return 'Senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número';
    }
    return '';
  };

  const validateConfirmPassword = (confirm: string): string => {
    if (!confirm.trim()) {
      return 'Confirmação de senha é obrigatória';
    }
    if (confirm !== password) {
      return 'As senhas não coincidem';
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setError('Token inválido ou ausente');
      return;
    }

    const passwordError = validatePassword(password);
    const confirmError = validateConfirmPassword(confirmPassword);

    if (passwordError || confirmError) {
      setError(passwordError || confirmError);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await resetPassword({ token, password });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao redefinir senha. O token pode ter expirado.');
    } finally {
      setIsLoading(false);
    }
  };

  const isValid = 
    password.trim() !== '' && 
    confirmPassword.trim() !== '' && 
    validatePassword(password) === '' && 
    validateConfirmPassword(confirmPassword) === '' &&
    !!token;

  return (
    <>
      {/* Heading */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          {submitted ? 'Senha redefinida!' : 'Criar nova senha'}
        </h1>
        <p className="text-sm text-slate-500">
          {submitted
            ? 'Sua senha foi atualizada com sucesso'
            : 'Digite sua nova senha abaixo'}
        </p>
      </div>

      {/* Success State */}
      {submitted ? (
        <div className="space-y-6">
          <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <IconCheck className="w-8 h-8 text-emerald-600" />
            </div>
            <p className="text-emerald-800 font-medium mb-2">
              Senha alterada com sucesso!
            </p>
            <p className="text-emerald-600 text-sm">
              Agora você pode fazer login com sua nova senha.
            </p>
          </div>

          <Link
            href="/login"
            className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition shadow-sm hover:shadow-lg hover:shadow-indigo-600/25"
          >
            <IconArrowLeft className="w-4 h-4" />
            Ir para o login
          </Link>
        </div>
      ) : (
        <>
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 mb-4">
            {error && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
                <IconAlert className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                <p className="text-rose-700 font-medium text-sm">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nova senha
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <IconLock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  className={`w-full h-12 pl-11 pr-12 rounded-xl border transition text-sm text-slate-900 placeholder:text-slate-400 bg-white
                    ${error && error.includes('senha') && !focused
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
              <p className="text-slate-500 text-xs mt-1.5 ml-1">
                Mínimo 6 caracteres, com maiúscula, minúscula e número
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Confirmar nova senha
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <IconKey className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Digite a senha novamente"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError('');
                  }}
                  onFocus={() => setFocused('confirm')}
                  onBlur={() => setFocused(null)}
                  className={`w-full h-12 pl-11 pr-4 rounded-xl border transition text-sm text-slate-900 placeholder:text-slate-400 bg-white
                    ${error && error.includes('coincidem') && !focused
                      ? 'border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-200'
                      : focused === 'confirm'
                        ? 'border-indigo-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
                        : 'border-slate-200 hover:border-slate-300'
                    } focus:outline-none`}
                  style={{ color: '#0f172a' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!isValid || isLoading}
              className={`w-full h-12 rounded-xl text-white font-semibold text-sm shadow-sm transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2
                ${isLoading
                  ? 'bg-indigo-400 cursor-wait'
                  : isValid
                    ? 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/25'
                    : 'bg-slate-300 cursor-not-allowed'
                }`}
            >
              {isLoading ? (
                <>
                  <IconLoader className="w-5 h-5 animate-spin" />
                  Redefinindo...
                </>
              ) : (
                'Redefinir senha'
              )}
            </button>
          </form>

          <div className="text-center pt-4 border-t border-slate-200">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 transition"
            >
              <IconArrowLeft className="w-4 h-4" />
              Voltar para o login
            </Link>
          </div>
        </>
      )}
    </>
  );
}

export default function ResetPassword() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-3 hover:opacity-90 transition-opacity">
            <Logo size="md" showText={false} />
            <span className="text-xl font-bold text-slate-900">
              Linke<span className="text-emerald-500">Pag</span>
            </span>
          </Link>
        </div>

        <Suspense fallback={
          <div className="flex items-center justify-center py-12">
            <IconLoader className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
