'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function OAuthCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Conectando com MercadoPago...');

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Verifica se é um callback pendente válido
    const isPending = sessionStorage.getItem('mp_oauth_pending') === 'true';
    const timestamp = sessionStorage.getItem('mp_oauth_timestamp');
    const isExpired = timestamp && (Date.now() - parseInt(timestamp)) > 10 * 60 * 1000; // 10 minutos

    // Limpa o sessionStorage
    sessionStorage.removeItem('mp_oauth_pending');
    sessionStorage.removeItem('mp_oauth_timestamp');

    if (error) {
      setStatus('error');
      setMessage(errorDescription || 'Erro ao conectar com MercadoPago');
      
      // Redireciona para settings com erro após 2 segundos
      setTimeout(() => {
        router.push('/admin/settings/payments?oauth=error&message=' + encodeURIComponent(errorDescription || 'Erro ao conectar'));
      }, 2000);
      return;
    }

    if (!code || !state) {
      setStatus('error');
      setMessage('Parâmetros de callback inválidos');
      
      setTimeout(() => {
        router.push('/admin/settings/payments?oauth=error&message=' + encodeURIComponent('Parâmetros inválidos'));
      }, 2000);
      return;
    }

    if (!isPending || isExpired) {
      setStatus('error');
      setMessage('Sessão expirada ou inválida');
      
      setTimeout(() => {
        router.push('/admin/settings/payments?oauth=error&message=' + encodeURIComponent('Sessão expirada'));
      }, 2000);
      return;
    }

    // Callback válido - o backend já processou via redirect
    // Aqui apenas redirecionamos para a página de pagamentos com sucesso
    setStatus('success');
    setMessage('Conectado com sucesso!');

    setTimeout(() => {
      router.push('/admin/settings/payments?oauth=success');
    }, 1500);
  }, [searchParams, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="text-center p-8">
        {status === 'processing' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-slate-600 font-medium">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-emerald-600 font-medium">{message}</p>
            <p className="text-sm text-slate-500 mt-2">Redirecionando...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-rose-600 font-medium">{message}</p>
            <p className="text-sm text-slate-500 mt-2">Redirecionando...</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Carregando...</p>
        </div>
      </div>
    }>
      <OAuthCallbackContent />
    </Suspense>
  );
}
