'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useParams } from 'next/navigation';

// URL da API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.linkepag.com.br';

function DownloadContent() {
  const searchParams = useSearchParams();
  const params = useParams();
  const token = searchParams.get('token');
  const linkId = params?.linkId as string;
  
  const [status, setStatus] = useState<'checking' | 'downloading' | 'error'>('checking');
  const [message, setMessage] = useState('Verificando link de download...');
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');

  useEffect(() => {
    if (!linkId || linkId === 'undefined') {
      setStatus('error');
      setError('Link de download inválido. Tente novamente ou entre em contato com o vendedor.');
      return;
    }
    
    if (!token) {
      setStatus('error');
      setError('Token de acesso não fornecido. Verifique o link no seu email.');
      return;
    }

    // Verifica se o download é permitido primeiro
    checkDownload();
  }, [linkId, token]);

  const checkDownload = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/download/${linkId}/check?token=${token}`);
      const data = await response.json();

      if (!data.allowed) {
        setStatus('error');
        setError('Não foi possível processar seu download. Tente novamente ou entre em contato com o vendedor.');
        return;
      }

      // Download permitido, redireciona diretamente para a API
      setFileName(data.fileName || 'arquivo');
      setStatus('downloading');
      setMessage(`Iniciando download de ${data.fileName || 'arquivo'}...`);
      
      // Redireciona para a API direta para fazer o download do arquivo
      window.location.href = `${API_BASE_URL}/download/${linkId}?token=${token}`;
      
    } catch (err) {
      setStatus('error');
      setError('Erro ao verificar disponibilidade do download. Tente novamente.');
    }
  };

  const tryAgain = () => {
    if (token && fileName) {
      // Tentar download direto via API
      window.location.href = `${API_BASE_URL}/download/${linkId}?token=${token}`;
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 max-w-md w-full text-center">
        {/* Ícone de status */}
        <div className="mb-6">
          {status === 'checking' && (
            <div className="w-16 h-16 mx-auto rounded-full bg-indigo-100 flex items-center justify-center">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {status === 'downloading' && (
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 flex items-center justify-center text-3xl">
              📥
            </div>
          )}
          {status === 'error' && (
            <div className="w-16 h-16 mx-auto rounded-full bg-rose-100 flex items-center justify-center text-3xl">
              ❌
            </div>
          )}
        </div>

        {/* Título */}
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          {status === 'checking' && 'Verificando...'}
          {status === 'downloading' && 'Iniciando Download'}
          {status === 'error' && 'Ops! Algo deu errado'}
        </h1>

        {/* Mensagem */}
        <p className={`text-sm mb-6 ${status === 'error' ? 'text-rose-600' : 'text-slate-600'}`}>
          {error || message}
        </p>

        {/* Botões de ação */}
        <div className="space-y-3">
          {status === 'error' && (
            <>
              <button
                onClick={tryAgain}
                className="w-full py-3 px-4 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition"
              >
                Tentar Novamente
              </button>
              <p className="text-xs text-slate-500 mt-2">
                Se o problema persistir, entre em contato com o vendedor.
              </p>
            </>
          )}
          
          {status === 'downloading' && (
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div className="bg-indigo-600 h-full rounded-full animate-pulse w-full" />
            </div>
          )}
          
          {status === 'checking' && (
            <p className="text-xs text-slate-400">
              Aguarde enquanto verificamos seu acesso...
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <p className="text-xs text-slate-400">
            Powered by <span className="font-semibold text-indigo-600">LinkePag</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// Loading fallback
function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-indigo-100 flex items-center justify-center mb-6">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Carregando...</h1>
        <p className="text-sm text-slate-600">Aguarde um momento</p>
      </div>
    </div>
  );
}

export default function DownloadPage() {
  return (
    <Suspense fallback={<Loading />}>
      <DownloadContent />
    </Suspense>
  );
}
