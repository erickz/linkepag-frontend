'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Logo } from '@/components/Logo';
import { AuthNavButton } from '@/components/AuthNavButton';
import { MobileMenu } from '../components/MobileMenu';
import { IconMail, IconUser, IconMessageSquare, IconSend, IconCheck, IconAlert } from '@/components/icons';
import { submitContactForm } from '@/lib/api';

export default function ContatoPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [focused, setFocused] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const validateField = (field: string, value: string): string => {
    switch (field) {
      case 'name':
        if (!value.trim()) return 'Nome é obrigatório';
        if (value.trim().length < 2) return 'Nome deve ter pelo menos 2 caracteres';
        return '';
      case 'email':
        if (!value.trim()) return 'Email é obrigatório';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return 'Digite um email válido';
        return '';
      case 'subject':
        if (!value.trim()) return 'Assunto é obrigatório';
        return '';
      case 'message':
        if (!value.trim()) return 'Mensagem é obrigatória';
        if (value.trim().length < 10) return 'Mensagem deve ter pelo menos 10 caracteres';
        return '';
      default:
        return '';
    }
  };

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    
    if (errors[field]) {
      const error = validateField(field, value);
      setErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  const handleBlur = (field: string) => {
    setFocused(null);
    const error = validateField(field, form[field as keyof typeof form]);
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const isFormValid = (): boolean => {
    return (
      form.name.trim() !== '' &&
      form.email.trim() !== '' &&
      form.subject.trim() !== '' &&
      form.message.trim() !== '' &&
      !Object.values(errors).some(error => error !== '')
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar todos os campos
    const newErrors: Record<string, string> = {};
    Object.keys(form).forEach(key => {
      const error = validateField(key, form[key as keyof typeof form]);
      if (error) newErrors[key] = error;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      await submitContactForm(form);
      setIsSubmitted(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Ocorreu um erro ao enviar sua mensagem. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Navbar Fixa e Centralizada - Desktop */}
      <nav className="hidden lg:block fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-white/95 backdrop-blur-sm rounded-full shadow-lg px-6 py-2 border border-slate-200">
        <div className="flex items-center gap-6">
          <Link href="/" className="mr-2 hover:opacity-90 transition-opacity">
            <Logo size="sm" showText={true} />
          </Link>
          <div className="w-px h-6 bg-slate-200" />
          <Link href="/" className="text-sm font-medium text-slate-600 hover:text-emerald-600 transition">
            Início
          </Link>
          <Link href="/#how-it-works" className="text-sm font-medium text-slate-600 hover:text-emerald-600 transition">
            Como funciona
          </Link>
          <Link href="/#pricing" className="text-sm font-medium text-slate-600 hover:text-emerald-600 transition">
            Planos
          </Link>
          <Link href="/contato" className="text-sm font-medium text-emerald-600">
            Contato
          </Link>
          <AuthNavButton className="inline-flex items-center justify-center h-9 px-5 rounded-full bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition shadow-md shadow-emerald-200">
            Começar grátis
          </AuthNavButton>
        </div>
      </nav>

      {/* Navbar Mobile */}
      <MobileMenu />

      <div className="lg:hidden h-16" />

      {/* Header da Página */}
      <section className="pt-32 pb-12 lg:pt-40 lg:pb-16">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <span className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
            <IconMessageSquare className="w-4 h-4" />
            Fale conosco
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Entre em <span className="text-indigo-600">contato</span>
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Tem dúvidas, sugestões ou precisa de ajuda? Nossa equipe está pronta para atender você.
          </p>
        </div>
      </section>

      {/* Formulário de Contato */}
      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            
            {/* Formulário */}
            <div className="bg-white rounded-3xl p-8 md:p-10 shadow-xl shadow-slate-200/50 border border-slate-100">
              {isSubmitted ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <IconCheck className="w-10 h-10 text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-3">
                    Mensagem enviada!
                  </h2>
                  <p className="text-slate-600 mb-8">
                    Obrigado por entrar em contato. Responderemos em breve no email {form.email}.
                  </p>
                  <button
                    onClick={() => {
                      setIsSubmitted(false);
                      setForm({ name: '', email: '', subject: '', message: '' });
                    }}
                    className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition"
                  >
                    Enviar outra mensagem
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {submitError && (
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
                      <IconAlert className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                      <p className="text-rose-700 font-medium text-sm">{submitError}</p>
                    </div>
                  )}

                  {/* Nome */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Nome
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <IconUser className="w-5 h-5" />
                      </div>
                      <input
                        type="text"
                        placeholder="Seu nome completo"
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
                      />
                    </div>
                    {errors.name && <p className="text-rose-500 text-xs mt-1.5 ml-1">{errors.name}</p>}
                  </div>

                  {/* Email */}
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
                      />
                    </div>
                    {errors.email && <p className="text-rose-500 text-xs mt-1.5 ml-1">{errors.email}</p>}
                  </div>

                  {/* Assunto */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Assunto
                    </label>
                    <select
                      value={form.subject}
                      onChange={(e) => handleChange('subject', e.target.value)}
                      onFocus={() => setFocused('subject')}
                      onBlur={() => handleBlur('subject')}
                      className={`w-full h-12 px-4 rounded-xl border transition text-sm text-slate-900 bg-white appearance-none cursor-pointer
                        ${errors.subject
                          ? 'border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-200'
                          : focused === 'subject'
                            ? 'border-indigo-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
                            : 'border-slate-200 hover:border-slate-300'
                        } focus:outline-none`}
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                        backgroundPosition: 'right 12px center',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: '20px'
                      }}
                    >
                      <option value="">Selecione um assunto</option>
                      <option value="suporte">Suporte técnico</option>
                      <option value="vendas">Dúvidas sobre planos</option>
                      <option value="parceria">Parcerias</option>
                      <option value="sugestao">Sugestões</option>
                      <option value="outro">Outro</option>
                    </select>
                    {errors.subject && <p className="text-rose-500 text-xs mt-1.5 ml-1">{errors.subject}</p>}
                  </div>

                  {/* Mensagem */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Mensagem
                    </label>
                    <textarea
                      placeholder="Digite sua mensagem aqui..."
                      rows={5}
                      value={form.message}
                      onChange={(e) => handleChange('message', e.target.value)}
                      onFocus={() => setFocused('message')}
                      onBlur={() => handleBlur('message')}
                      className={`w-full px-4 py-3 rounded-xl border transition text-sm text-slate-900 placeholder:text-slate-400 bg-white resize-none
                        ${errors.message
                          ? 'border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-200'
                          : focused === 'message'
                            ? 'border-indigo-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
                            : 'border-slate-200 hover:border-slate-300'
                        } focus:outline-none`}
                    />
                    {errors.message && <p className="text-rose-500 text-xs mt-1.5 ml-1">{errors.message}</p>}
                  </div>

                  {/* Botão Enviar */}
                  <button
                    type="submit"
                    disabled={!isFormValid() || isSubmitting}
                    className={`w-full h-12 rounded-xl text-white font-semibold text-sm shadow-sm transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2
                      ${isFormValid() && !isSubmitting
                        ? 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/25'
                        : 'bg-slate-300 cursor-not-allowed'
                      }`}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Enviando...
                      </>
                    ) : (
                      <>
                        <IconSend className="w-4 h-4" />
                        Enviar mensagem
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Informações de Contato */}
            <div className="lg:pl-8">
              <div className="space-y-8">
                {/* Cards de Informação */}
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                    <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
                      <IconMail className="w-6 h-6 text-indigo-600" />
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-1">Email</h3>
                    <p className="text-slate-600 text-sm mb-2">Respondemos em até 24 horas</p>
                    <a href="mailto:suporte@linkepag.com" className="text-indigo-600 font-medium hover:text-indigo-700 transition">
                      suporte@linkepag.com
                    </a>
                  </div>

                  <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                      <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-1">Horário de Atendimento</h3>
                    <p className="text-slate-600 text-sm">
                      Segunda a Sexta<br />
                      9h às 18h (horário de Brasília)
                    </p>
                  </div>
                </div>

                {/* FAQ Rápido */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
                  <h3 className="font-semibold mb-4">Perguntas frequentes</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="font-medium text-indigo-300 text-sm mb-1">Quanto tempo leva para receber resposta?</p>
                      <p className="text-slate-300 text-sm">Geralmente respondemos em até 48 horas úteis.</p>
                    </div>
                    <div>
                      <p className="font-medium text-indigo-300 text-sm mb-1">Posso alterar meu plano depois?</p>
                      <p className="text-slate-300 text-sm">Sim! Você pode fazer upgrade ou downgrade a qualquer momento.</p>
                    </div>
                    <div>
                      <p className="font-medium text-indigo-300 text-sm mb-1">Como funciona o período de teste?</p>
                      <p className="text-slate-300 text-sm">O plano Starter é ilimitado no tempo, com 3 links monetizados.</p>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <div className="text-center lg:text-left">
                  <p className="text-slate-600 mb-4">Ainda não tem uma conta?</p>
                  <AuthNavButton className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition shadow-lg shadow-emerald-200">
                    Criar conta grátis
                  </AuthNavButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-900 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Logo e descrição */}
            <div>
              <Link href="/" className="inline-flex items-center gap-2 mb-4">
                <Logo size="sm" showText={false} />
                <span className="text-white font-bold text-lg">LinkePag</span>
              </Link>
              <p className="text-slate-400 text-sm max-w-xs">
                Crie uma página única para seus links e receba pagamentos via PIX. 
                A link-in-bio que vende mais.
              </p>
            </div>
            
            {/* Navegação */}
            <div className="md:text-right">
              <h4 className="text-white font-semibold mb-4 md:justify-end">Navegação</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/" className="text-slate-400 hover:text-white transition">Início</Link>
                </li>
                <li>
                  <a href="/#how-it-works" className="text-slate-400 hover:text-white transition">Como funciona</a>
                </li>
                <li>
                  <a href="/#pricing" className="text-slate-400 hover:text-white transition">Planos</a>
                </li>
                <li>
                  <Link href="/contato" className="text-slate-400 hover:text-white transition">Contato</Link>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-500 text-sm">
              © 2026 LinkePag - Monetize sua audiência.
            </p>
            <div className="flex items-center gap-6 text-xs text-slate-500">
              <Link href="/termos" className="hover:text-slate-300 transition">Termos de uso</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
