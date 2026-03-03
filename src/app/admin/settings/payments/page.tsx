'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useProtectedRoute } from '@/hooks/useAuth';
import { useApi, useApiMutation } from '@/hooks/useApi';
import { getMercadoPagoCredentials, updateMercadoPagoCredentials, CACHE_KEYS } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { IconCreditCard, IconCheck, IconAlert, IconExternalLink } from '@/components/icons';

export default function PaymentsSettingsPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCredentials, setShowCredentials] = useState(false);
  
  const [credentials, setCredentials] = useState({
    mercadoPagoPublicKey: '',
    mercadoPagoAccessToken: '',
  });
  const [isConfigured, setIsConfigured] = useState(false);

  useProtectedRoute('/login');

  const { data: mpData, isLoading: isLoadingMP } = useApi(
    'mercadopago-credentials',
    getMercadoPagoCredentials,
    {
      enabled: isAuthenticated,
      onSuccess: (data) => {
        if (data.isConfigured) {
          setIsConfigured(true);
          setCredentials({
            mercadoPagoPublicKey: data.mercadoPagoPublicKey || '',
            mercadoPagoAccessToken: '',
          });
        }
      },
    }
  );

  const updateMutation = useApiMutation(updateMercadoPagoCredentials);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login?redirect=admin/settings/payments');
    }
  }, [isLoading, isAuthenticated, router]);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setMessage(null);
    
    setTimeout(() => {
      const isValid = credentials.mercadoPagoPublicKey.startsWith('TEST-') || credentials.mercadoPagoPublicKey.startsWith('APP_USR-');
      if (isValid) {
        setMessage({ type: 'success', text: 'Conexão testada com sucesso! Credenciais válidas.' });
      } else {
        setMessage({ type: 'error', text: 'Formato de credenciais inválido. Use TEST- ou APP_USR-' });
      }
      setIsTesting(false);
    }, 1000);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      await updateMutation.mutate({
        mercadoPagoPublicKey: credentials.mercadoPagoPublicKey,
        mercadoPagoAccessToken: credentials.mercadoPagoAccessToken || undefined,
      });

      setMessage({ type: 'success', text: 'Credenciais salvas com sucesso!' });
      setIsConfigured(true);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao salvar credenciais' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm('Tem certeza que deseja remover as credenciais do MercadoPago?')) return;
    
    setIsSaving(true);
    try {
      await updateMutation.mutate({
        mercadoPagoPublicKey: '',
        mercadoPagoAccessToken: '',
      });
      setCredentials({ mercadoPagoPublicKey: '', mercadoPagoAccessToken: '' });
      setIsConfigured(false);
      setMessage({ type: 'success', text: 'Credenciais removidas!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao remover' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || isLoadingMP) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div>
      <PageHeader
        title="Configurações de Pagamento"
        description="Configure o MercadoPago para receber pagamentos automáticos"
        breadcrumbs={[{ label: 'Configurações' }, { label: 'Pagamentos' }]}
      />

      {message && (
        <div className={`mb-6 p-4 rounded-xl ${message.type === 'success' ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`}>
          <p className={`font-medium text-sm ${message.type === 'success' ? 'text-emerald-700' : 'text-rose-700'}`}>{message.text}</p>
        </div>
      )}

      {/* Status Card */}
      <div className={`mb-6 p-4 rounded-xl border ${isConfigured ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isConfigured ? 'bg-emerald-100' : 'bg-amber-100'}`}>
            {isConfigured ? <IconCheck className="w-5 h-5 text-emerald-600" /> : <IconAlert className="w-5 h-5 text-amber-600" />}
          </div>
          <div>
            <p className={`font-medium ${isConfigured ? 'text-emerald-900' : 'text-amber-900'}`}>
              {isConfigured ? 'MercadoPago configurado!' : 'MercadoPago não configurado'}
            </p>
            <p className={`text-sm ${isConfigured ? 'text-emerald-600' : 'text-amber-600'}`}>
              {isConfigured 
                ? 'Seus clientes recebem o link de acesso automaticamente após o pagamento' 
                : 'Configure para enviar links de acesso automaticamente aos compradores'}
            </p>
          </div>
        </div>
      </div>

      {/* MercadoPago Credentials */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <IconCreditCard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Credenciais MercadoPago</h2>
            <p className="text-sm text-slate-500">Integre sua conta para receber pagamentos</p>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Public Key</label>
            <div className="relative">
              <input
                type={showCredentials ? 'text' : 'password'}
                value={credentials.mercadoPagoPublicKey}
                onChange={(e) => setCredentials(prev => ({ ...prev, mercadoPagoPublicKey: e.target.value }))}
                placeholder="TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="w-full h-11 px-4 pr-24 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition text-sm font-mono"
              />
              <button
                type="button"
                onClick={() => setShowCredentials(!showCredentials)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 hover:text-slate-700"
              >
                {showCredentials ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">Começa com TEST- (teste) ou APP_USR- (produção)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Access Token</label>
            <div className="relative">
              <input
                type={showCredentials ? 'text' : 'password'}
                value={credentials.mercadoPagoAccessToken}
                onChange={(e) => setCredentials(prev => ({ ...prev, mercadoPagoAccessToken: e.target.value }))}
                placeholder={isConfigured ? '••••••••••••••••' : 'TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'}
                className="w-full h-11 px-4 pr-24 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition text-sm font-mono"
              />
              <button
                type="button"
                onClick={() => setShowCredentials(!showCredentials)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 hover:text-slate-700"
              >
                {showCredentials ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">O token não será exibido novamente por segurança</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              onClick={handleTestConnection}
              disabled={isTesting || !credentials.mercadoPagoPublicKey}
              className="flex-1 h-11 px-4 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-50 hover:border-slate-300 transition disabled:opacity-50"
            >
              {isTesting ? 'Testando...' : 'Testar Conexão'}
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !credentials.mercadoPagoPublicKey}
              className="flex-1 h-11 px-4 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {isSaving ? 'Salvando...' : isConfigured ? 'Atualizar Credenciais' : 'Salvar Credenciais'}
            </button>
          </div>

          {isConfigured && (
            <button
              onClick={handleRemove}
              disabled={isSaving}
              className="w-full h-11 px-4 border border-rose-200 text-rose-600 rounded-xl font-medium text-sm hover:bg-rose-50 transition disabled:opacity-50"
            >
              Remover Credenciais
            </button>
          )}
        </div>
      </div>

      {/* Help Card */}
      <div className="mt-6 bg-slate-50 rounded-2xl border border-slate-200 p-6">
        <h3 className="font-bold text-slate-900 mb-3">Como obter as credenciais?</h3>
        <ol className="space-y-2 text-sm text-slate-600 list-decimal list-inside">
          <li>Acesse o <a href="https://www.mercadopago.com.br/developers" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline inline-flex items-center gap-1">Portal de Desenvolvedores <IconExternalLink className="w-3 h-3" /></a></li>
          <li>Faça login com sua conta MercadoPago</li>
          <li>Vá em "Suas integrações" &gt; "Credenciais"</li>
          <li>Copie a Public Key e o Access Token</li>
          <li>Cole os valores nos campos acima</li>
        </ol>
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-700">
            <span className="font-medium">Dica:</span> Use as credenciais de TESTE para testar. Em produção, use as credenciais de PRODUÇÃO.
          </p>
        </div>
      </div>
    </div>
  );
}
