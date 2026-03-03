'use client';

import Link from 'next/link';
import { useState } from 'react';
import { forgotPassword } from '@/lib/api';
import { IconMail, IconArrowLeft, IconCheck, IconAlert, IconLoader } from '@/components/icons';
import { Logo } from '@/components/Logo';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [focused, setFocused] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateEmail(email);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await forgotPassword({ email });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar email. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const isValid = email.trim() !== '' && validateEmail(email) === '';

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

        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            {submitted ? 'Email enviado!' : 'Esqueceu a senha?'}
          </h1>
          <p className="text-sm text-slate-500">
            {submitted
              ? 'Verifique sua caixa de entrada para redefinir sua senha'
              : 'Digite seu email para receber instruções de redefinição'}
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
                Verifique seu email
              </p>
              <p className="text-emerald-600 text-sm">
                Enviamos instruções para <strong>{email}</strong>. O link expira em 1 hora.
              </p>
            </div>

            <div className="space-y-3">
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition shadow-sm hover:shadow-lg hover:shadow-indigo-600/25"
              >
                <IconArrowLeft className="w-4 h-4" />
                Voltar para o login
              </Link>
            </div>

            <p className="text-center text-sm text-slate-500">
              Não recebeu o email?{' '}
              <button
                onClick={() => {
                  setSubmitted(false);
                  setEmail('');
                }}
                className="font-medium text-indigo-600 hover:text-indigo-700 transition"
              >
                Tentar novamente
              </button>
            </p>
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
                  Email
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <IconMail className="w-5 h-5" />
                  </div>
                  <input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError('');
                    }}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    className={`w-full h-12 pl-11 pr-4 rounded-xl border transition text-sm text-slate-900 placeholder:text-slate-400 bg-white
                      ${error && !focused
                        ? 'border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-200'
                        : focused
                          ? 'border-indigo-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
                          : 'border-slate-200 hover:border-slate-300'
                      } focus:outline-none`}
                    style={{ color: '#0f172a' }}
                  />
                </div>
                {error && <p className="text-rose-500 text-xs mt-1.5 ml-1">{error}</p>}
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
                    Enviando...
                  </>
                ) : (
                  'Enviar instruções'
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
      </div>
    </main>
  );
}
