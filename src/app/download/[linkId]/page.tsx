'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function DownloadContent({ linkId }: { linkId: string }) {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'checking' | 'downloading' | 'success' | 'error'>('checking');
  const [message, setMessage] = useState('Verificando link de download...');
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');

  useEffect(() => {
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
        switch (data.reason) {
          case 'token_expired':
            setError('Este link de download expirou. Entre em contato com o vendedor.');
            break;
          case 'download_limit_exceeded':
            setError(`Limite de downloads atingido (${data.downloadsUsed}/${data.downloadsLimit}). Entre em contato com o vendedor.`);
            break;
          case 'invalid_token':
            setError('Link de download inválido. Verifique o link no seu email.');
            break;
          case 'file_not_found':
            setError('Arquivo não encontrado. Entre em contato com o vendedor.');
            break;
          default:
            setError(data.message || 'Não foi possível realizar o download.');
        }
        return;
      }

      // Download permitido, inicia o download
      setFileName(data.fileName || 'arquivo');
      setStatus('downloading');
      setMessage(`Preparando download de ${data.fileName || 'arquivo'}...`);
      
      // Aguarda um momento para mostrar a mensagem
      setTimeout(() => {
        startDownload();
      }, 1000);
      
    } catch (err) {
      setStatus('error');
      setError('Erro ao verificar disponibilidade do download. Tente novamente.');
    }
  };

  const startDownload = async () => {
    try {
      // Faz o download via fetch
      const response = await fetch(`${API_BASE_URL}/download/${linkId}?token=${token}`);
      
      if (!response.ok) {
        throw new Error('Erro ao baixar arquivo');
      }

      // Pega o nome do arquivo do header Content-Disposition se disponível
      const contentDisposition = response.headers.get('content-disposition');
      let downloadFileName = fileName;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) {
          downloadFileName = decodeURIComponent(match[1]);
        }
      }

      // Converte a resposta para blob
      const blob = await response.blob();
      
      // Cria o link de download temporário
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = downloadFileName;
      document.body.appendChild(a);
      a.click();
      
      // Limpa
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setStatus('success');
      setMessage('Download iniciado com sucesso!');
      
    } catch (err) {
      setStatus('error');
      setError('Erro ao baixar o arquivo. Tente novamente ou entre em contato com o vendedor.');
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
          {status === 'success' && (
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center text-3xl">
              ✅
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
          {status === 'downloading' && 'Preparando Download'}
          {status === 'success' && 'Download Concluído!'}
          {status === 'error' && 'Ops! Algo deu errado'}
        </h1>

        {/* Mensagem */}
        <p className={`text-sm mb-6 ${status === 'error' ? 'text-rose-600' : 'text-slate-600'}`}>
          {error || message}
        </p>

        {/* Botões de ação */}
        <div className="space-y-3">
          {status === 'error' && (
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 px-4 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition"
            >
              Tentar Novamente
            </button>
          )}
          
          {status === 'success' && (
            <>
              <p className="text-xs text-slate-500 mb-3">
                O download deve ter iniciado automaticamente. Se não iniciou, verifique sua pasta de downloads.
              </p>
              <button
                onClick={() => window.close()}
                className="w-full py-3 px-4 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition"
              >
                Fechar
              </button>
            </>
          )}
          
          {status === 'downloading' && (
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div className="bg-indigo-600 h-full rounded-full animate-pulse w-full" />
            </div>
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

export default function DownloadPage({ params }: { params: { linkId: string } }) {
  return (
    <Suspense fallback={<Loading />}>
      <DownloadContent linkId={params.linkId} />
    </Suspense>
  );
}
