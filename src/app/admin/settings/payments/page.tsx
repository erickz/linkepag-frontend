'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth, useProtectedRoute } from '@/hooks/useAuth';
import { usePaymentSettings, PaymentMethod } from '@/hooks/usePaymentSettings';
import { useMpOAuth } from '@/hooks/useMpOAuth';
import { PageHeader } from '@/components/PageHeader';
import { 
  IconCreditCard, 
  IconCheck, 
  IconAlert, 
  IconExternalLink,
  IconSmartphone,
  IconRefresh,
  IconUnlink,
} from '@/components/icons';

// Taxas por plano
const PLAN_FEES: Record<number, string> = {
  1: 'R$ 0,70',  // Starter
  2: 'R$ 0,50',  // Creator
  3: 'R$ 0,35',  // Pro
  4: 'R$ 0,20',  // Ilimitado
};

// Componente para exibir a taxa baseada no plano do usuário
function FeeDisplay() {
  const { user } = useAuth();
  const fee = user?.planId ? PLAN_FEES[user.planId] : 'R$ 0,70';
  return <span>{fee}</span>;
}

// Componente do Card de Método de Pagamento
function PaymentMethodCard({
  method,
  title,
  badge,
  description,
  features,
  icon: Icon,
  isSelected,
  isActive,
  isSaving,
  onSelect,
}: {
  method: PaymentMethod;
  title: string;
  badge: string;
  description: string;
  features: string[];
  icon: React.ElementType;
  isSelected: boolean;
  isActive: boolean;
  isSaving?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`
        relative w-full text-left rounded-2xl border-2 p-5 transition-all duration-200
        ${isActive 
          ? 'border-emerald-500 bg-emerald-50/30 shadow-lg shadow-emerald-500/10' 
          : isSelected 
            ? 'border-indigo-500 bg-indigo-50/30 shadow-lg shadow-indigo-500/10' 
            : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
        }
      `}
    >
      {/* Badge de Ativo */}
      {isActive && (
        <div className="absolute -top-3 left-4 px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
          <IconCheck className="w-3 h-3" />
          ATIVO
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <div className={`
          w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0
          ${isActive 
            ? 'bg-emerald-500 text-white' 
            : isSelected 
              ? 'bg-indigo-500 text-white' 
              : 'bg-slate-100 text-slate-600'
          }
        `}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-slate-900">{title}</h3>
            <span className={`
              px-2 py-0.5 text-xs font-medium rounded-full
              ${isActive 
                ? 'bg-emerald-100 text-emerald-700' 
                : isSelected 
                  ? 'bg-indigo-100 text-indigo-700' 
                  : 'bg-slate-100 text-slate-600'
              }
            `}>
              {badge}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">{description}</p>
        </div>
      </div>

      {/* Features */}
      <ul className="space-y-2">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center gap-2 text-sm text-slate-600">
            <IconCheck className={`w-4 h-4 flex-shrink-0 ${isActive || isSelected ? 'text-emerald-500' : 'text-slate-400'}`} />
            {feature}
          </li>
        ))}
      </ul>

      {/* Selection Indicator */}
      <div className="mt-4 pt-4 border-t border-slate-200/60">
        <div className={`
          flex items-center justify-center gap-2 py-2 rounded-xl font-medium text-sm transition-all
          ${isActive
            ? 'text-white bg-emerald-500'
            : isSelected
              ? 'text-white bg-indigo-500'
              : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
          }
        `}>
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Salvando...
            </>
          ) : isActive ? (
            <>
              <IconCheck className="w-4 h-4" />
              Ativo
            </>
          ) : isSelected ? (
            <>
              <IconCheck className="w-4 h-4" />
              Selecionado
            </>
          ) : (
            'Selecionar'
          )}
        </div>
      </div>
    </button>
  );
}

// Card de status OAuth do MercadoPago
function MercadoPagoOAuthCard({
  status,
  connectionData,
  hasLegacyCredentials,
  isConnecting,
  isDisconnecting,
  onConnect,
  onDisconnect,
  onRefresh,
}: {
  status: 'loading' | 'connected' | 'disconnected' | 'error';
  connectionData?: { email: string; connectedAt: Date };
  hasLegacyCredentials: boolean;
  isConnecting: boolean;
  isDisconnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onRefresh: () => void;
}) {
  if (status === 'loading') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  // Estado: Conectado via OAuth
  if (status === 'connected' && connectionData) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
            <IconCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">MercadoPago Conectado</h2>
            <p className="text-sm text-slate-500">Sua conta está vinculada via OAuth</p>
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 mb-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-500">Conta</p>
                <p className="text-sm font-medium text-slate-900">{connectionData.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-500">Conectado em</p>
                <p className="text-sm font-medium text-slate-900">
                  {connectionData.connectedAt.toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onDisconnect}
            disabled={isDisconnecting}
            className="flex-1 h-11 px-4 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl font-medium text-sm hover:bg-rose-100 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isDisconnecting ? (
              <>
                <div className="w-4 h-4 border-2 border-rose-300 border-t-rose-600 rounded-full animate-spin"></div>
                Desconectando...
              </>
            ) : (
              <>
                <IconUnlink className="w-4 h-4" />
                Desconectar
              </>
            )}
          </button>
          <button
            onClick={onRefresh}
            className="h-11 px-4 bg-slate-100 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-200 transition flex items-center justify-center gap-2"
          >
            <IconRefresh className="w-4 h-4" />
            Atualizar
          </button>
        </div>
      </div>
    );
  }

  // Estado: Desconectado (pode ter credenciais legadas)
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
          <IconCreditCard className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {hasLegacyCredentials ? 'Credenciais Antigas Detectadas' : 'Receber com MercadoPago'}
          </h2>
          <p className="text-sm text-slate-500">
            {hasLegacyCredentials 
              ? 'Você está usando credenciais manuais. Recomendamos reconectar.' 
              : 'Conecte sua conta para receber pagamentos'}
          </p>
        </div>
      </div>

      {/* Alerta de credenciais legadas */}
      {hasLegacyCredentials && (
        <div className="mb-6 p-4 rounded-xl border bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-amber-100 flex-shrink-0">
              <IconAlert className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-amber-900 text-sm">Você está usando credenciais antigas</p>
              <p className="text-xs text-amber-700 mt-1">
                Recomendamos reconectar via OAuth para mais segurança e praticidade. Suas vendas continuarão funcionando normalmente.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Lista de benefícios */}
      <ul className="space-y-3 mb-6">
        <li className="flex items-center gap-3 text-sm text-slate-600">
          <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <IconCheck className="w-3 h-3 text-emerald-600" />
          </div>
          Dinheiro cai na sua conta MercadoPago
        </li>
        <li className="flex items-center gap-3 text-sm text-slate-600">
          <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <IconCheck className="w-3 h-3 text-emerald-600" />
          </div>
          Confirmação automática de pagamentos
        </li>
        <li className="flex items-center gap-3 text-sm text-slate-600">
          <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <IconCheck className="w-3 h-3 text-emerald-600" />
          </div>
          Sem necessidade de inserir credenciais manualmente
        </li>
      </ul>

      {/* Taxa - dinâmica baseada no plano */}
      <div className="bg-slate-50 rounded-xl p-3 mb-6">
        <p className="text-xs text-slate-500 text-center">
          Taxa da plataforma: <span className="font-medium text-slate-700"><FeeDisplay /></span> por transação
        </p>
        <p className="text-[10px] text-slate-400 text-center mt-1">* Varia conforme seu plano</p>
      </div>

      {/* Botão de conectar */}
      <button
        onClick={onConnect}
        disabled={isConnecting}
        className="w-full h-11 px-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-medium text-sm hover:from-blue-600 hover:to-cyan-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isConnecting ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            Conectando...
          </>
        ) : hasLegacyCredentials ? (
          <>
            <IconRefresh className="w-4 h-4" />
            Reconectar Agora
          </>
        ) : (
          <>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
            Conectar com MercadoPago
          </>
        )}
      </button>
    </div>
  );
}

// Formulário PIX Direto
function PixDirectForm({
  keyType,
  pixKey,
  notifyPendingPayments,
  onChange,
}: {
  keyType: string;
  pixKey: string;
  notifyPendingPayments: boolean;
  onChange: (field: 'keyType' | 'key' | 'notifyPendingPayments', value: string | boolean) => void;
}) {
  const keyTypeOptions = [
    { value: 'CPF', label: 'CPF', placeholder: 'XXX.XXX.XXX-XX' },
    { value: 'CNPJ', label: 'CNPJ', placeholder: 'XX.XXX.XXX/XXXX-XX' },
    { value: 'EMAIL', label: 'E-mail', placeholder: 'seu@email.com' },
    { value: 'PHONE', label: 'Celular', placeholder: '(XX) XXXXX-XXXX' },
    { value: 'RANDOM', label: 'Chave Aleatória', placeholder: 'Chave Pix' },
  ];

  const selectedOption = keyTypeOptions.find(opt => opt.value === keyType) || keyTypeOptions[0];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
          <IconSmartphone className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Configurar PIX Direto</h2>
          <p className="text-sm text-slate-500">Informe sua chave PIX para receber diretamente</p>
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Tipo da Chave PIX
          </label>
          <select
            value={keyType}
            onChange={(e) => onChange('keyType', e.target.value)}
            className="w-full h-11 px-4 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition text-sm bg-white"
          >
            {keyTypeOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Chave PIX
          </label>
          <input
            type="text"
            value={pixKey}
            onChange={(e) => onChange('key', e.target.value)}
            placeholder={selectedOption.placeholder}
            className="w-full h-11 px-4 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition text-sm"
          />
          <p className="text-xs text-slate-400 mt-1">
            Digite exatamente como aparece no seu app do banco
          </p>
        </div>

        {/* Checkbox para notificações de pagamentos pendentes */}
        <div className="pt-4 border-t border-slate-200">
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative flex items-center">
              <input
                type="checkbox"
                checked={notifyPendingPayments}
                onChange={(e) => onChange('notifyPendingPayments', e.target.checked)}
                className="peer sr-only"
              />
              <div className="w-5 h-5 border-2 border-slate-300 rounded peer-checked:bg-indigo-500 peer-checked:border-indigo-500 transition-colors"></div>
              <svg 
                className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity left-1 top-1"
                viewBox="0 0 14 14" 
                fill="none"
              >
                <path d="M2 7L5.5 10.5L12 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="flex-1">
              <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
                Receber notificações por email
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                Envie-me um email quando alguém fizer um pagamento pendente via PIX Direto
              </p>
            </div>
          </label>
        </div>

      </div>
    </div>
  );
}

// Main Page Component
export default function PaymentsSettingsPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const searchParams = useSearchParams();
  
  const {
    state,
    setPixDirectData,
    handleSave,
    clearMessage,
    selectAndSaveMethod,
  } = usePaymentSettings();

  const {
    status: oauthStatus,
    connectionData: oauthData,
    hasLegacyCredentials,
    isConnecting,
    isDisconnecting,
    initiateConnection,
    disconnect,
    refreshStatus,
    error: oauthError,
  } = useMpOAuth();

  useProtectedRoute('/login');

  // Lida com callback OAuth (sucesso/erro)
  useEffect(() => {
    const oauthResult = searchParams.get('oauth');
    if (oauthResult === 'success') {
      refreshStatus();
    }
  }, [searchParams, refreshStatus]);

  if (isAuthLoading || state.isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const isConfigured = state.activeMethod !== null;
  const isMercadoPagoSelected = state.selectedMethod === 'mercadopago';
  const isPixDirectSelected = state.selectedMethod === 'pix_direct';

  return (
    <div>
      <PageHeader
        title="Como você quer receber?"
        description="Escolha uma opção para receber pagamentos dos seus links monetizados"
        breadcrumbs={[{ label: 'Configurações' }, { label: 'Pagamentos' }]}
      />

      {/* Mensagem quando nenhum método configurado */}
      {!isConfigured && (
        <div className="mb-6 p-4 rounded-xl border bg-amber-50 border-amber-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-100">
              <IconAlert className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-amber-900">Nenhum método configurado</p>
              <p className="text-sm text-amber-600">Escolha uma opção abaixo para começar a receber pagamentos</p>
            </div>
          </div>
        </div>
      )}

      {/* Mensagem OAuth após callback */}
      {searchParams.get('oauth') === 'success' && (
        <div className="mb-6 p-4 rounded-xl border bg-emerald-50 border-emerald-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-100">
              <IconCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-medium text-emerald-900">MercadoPago conectado com sucesso!</p>
              <p className="text-sm text-emerald-600">Sua conta está vinculada e pronta para receber pagamentos</p>
            </div>
          </div>
        </div>
      )}

      {searchParams.get('oauth') === 'error' && (
        <div className="mb-6 p-4 rounded-xl border bg-rose-50 border-rose-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-rose-100">
              <IconAlert className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <p className="font-medium text-rose-900">Erro ao conectar</p>
              <p className="text-sm text-rose-600">{searchParams.get('message') || 'Tente novamente'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Mensagem de erro OAuth */}
      {oauthError && (
        <div className="mb-6 p-4 rounded-xl border bg-rose-50 border-rose-200">
          <p className="font-medium text-rose-700">{oauthError}</p>
        </div>
      )}

      {/* Cards de Seleção de Método */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <PaymentMethodCard
          method="mercadopago"
          title="MercadoPago"
          badge="Automático"
          description="Integração OAuth com confirmação automática"
          features={[
            'Dinheiro cai na sua conta MercadoPago',
            'Clientes recebem acesso automaticamente',
            'Confirmação de pagamento automatizada',
            'Segurança com OAuth (sem credenciais manuais)',
          ]}
          icon={IconCreditCard}
          isSelected={isMercadoPagoSelected}
          isActive={state.activeMethod === 'mercadopago'}
          isSaving={state.isSaving && state.selectedMethod === 'mercadopago'}
          onSelect={() => selectAndSaveMethod('mercadopago')}
        />

        <PaymentMethodCard
          method="pix_direct"
          title="PIX Direto"
          badge="Manual"
          description="Use sua chave PIX pessoal com confirmação manual"
          features={[
            'Dinheiro cai direto na sua conta bancária',
            'Sem taxa do MercadoPago',
            'Você confirma os pagamentos manualmente para enviar os links'
          ]}
          icon={IconSmartphone}
          isSelected={isPixDirectSelected}
          isActive={state.activeMethod === 'pix_direct'}
          isSaving={state.isSaving && state.selectedMethod === 'pix_direct'}
          onSelect={() => selectAndSaveMethod('pix_direct')}
        />
      </div>

      {/* Mensagem de Status - Entre cards e formulário */}
      {state.message && (
        <div className={`mb-6 p-4 rounded-xl ${state.message.type === 'success' ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`}>
          <p className={`font-medium text-sm ${state.message.type === 'success' ? 'text-emerald-700' : 'text-rose-700'}`}>
            {state.message.text}
          </p>
          <button 
            onClick={clearMessage}
            className="text-xs text-slate-400 hover:text-slate-600 mt-1"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Formulário do Método Selecionado */}
      {isMercadoPagoSelected && (
        <MercadoPagoOAuthCard
          status={oauthStatus}
          connectionData={oauthData}
          hasLegacyCredentials={hasLegacyCredentials}
          isConnecting={isConnecting}
          isDisconnecting={isDisconnecting}
          onConnect={initiateConnection}
          onDisconnect={disconnect}
          onRefresh={refreshStatus}
        />
      )}

      {isPixDirectSelected && (
        <PixDirectForm
          keyType={state.pixDirect.keyType}
          pixKey={state.pixDirect.key}
          notifyPendingPayments={state.pixDirect.notifyPendingPayments}
          onChange={(field, value) => setPixDirectData({ [field]: value })}
        />
      )}

      {/* Botões de Ação - Apenas para salvar dados do formulário */}
      {state.selectedMethod && (
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          {isPixDirectSelected && (
            <button
              onClick={handleSave}
              disabled={state.isSaving}
              className="flex-1 h-11 px-4 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {state.isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <IconCheck className="w-4 h-4" />
                  Salvar Chave PIX
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Help Section */}
      <div className="mt-8 bg-slate-50 rounded-2xl border border-slate-200 p-6">
        <h3 className="font-bold text-slate-900 mb-3">Precisa de ajuda?</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <a 
            href="https://www.mercadopago.com.br/developers" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <IconCreditCard className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">Sobre o MercadoPago</p>
              <p className="text-xs text-slate-500">Portal de Desenvolvedores</p>
            </div>
            <IconExternalLink className="w-4 h-4 text-slate-400 ml-auto" />
          </a>

          <div className="p-4 bg-white rounded-xl border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <IconSmartphone className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="font-medium text-slate-900">Encontrar minha chave PIX</p>
            </div>
            <p className="text-xs text-slate-500 ml-13">
              No app do seu banco, vá em PIX &gt; Minhas Chaves e copie a chave desejada.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
