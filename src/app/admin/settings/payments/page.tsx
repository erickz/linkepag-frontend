'use client';


import { useAuth, useProtectedRoute } from '@/hooks/useAuth';
import { usePaymentSettings, PaymentMethod } from '@/hooks/usePaymentSettings';
import { PageHeader } from '@/components/PageHeader';
import { 
  IconCreditCard, 
  IconCheck, 
  IconAlert, 
  IconExternalLink,
  IconSmartphone,
} from '@/components/icons';

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

// Formulário MercadoPago
function MercadoPagoForm({
  publicKey,
  accessToken,
  isConfigured,
  showCredentials,
  onChange,
  onToggleShow,
}: {
  publicKey: string;
  accessToken: string;
  isConfigured: boolean;
  showCredentials: boolean;
  onChange: (field: 'publicKey' | 'accessToken', value: string) => void;
  onToggleShow: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
          <IconCreditCard className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Configurar MercadoPago</h2>
          <p className="text-sm text-slate-500">Insira suas credenciais de integração</p>
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Public Key
          </label>
          <div className="relative">
            <input
              type={showCredentials ? 'text' : 'password'}
              value={publicKey}
              onChange={(e) => onChange('publicKey', e.target.value)}
              placeholder="TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="w-full h-11 px-4 pr-24 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition text-sm font-mono"
            />
            <button
              type="button"
              onClick={onToggleShow}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 hover:text-slate-700"
            >
              {showCredentials ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Começa com <code className="bg-slate-100 px-1 rounded">TEST-</code> (teste) ou{' '}
            <code className="bg-slate-100 px-1 rounded">APP_USR-</code> (produção)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Access Token
          </label>
          <div className="relative">
            <input
              type={showCredentials ? 'text' : 'password'}
              value={accessToken}
              onChange={(e) => onChange('accessToken', e.target.value)}
              placeholder={isConfigured ? '••••••••••••••••' : 'TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'}
              className="w-full h-11 px-4 pr-24 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition text-sm font-mono"
            />
            <button
              type="button"
              onClick={onToggleShow}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 hover:text-slate-700"
            >
              {showCredentials ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            O token não será exibido novamente por segurança
          </p>
        </div>

      </div>
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
  
  const {
    state,
    setMercadoPagoData,
    setPixDirectData,
    toggleShowCredentials,
    handleSave,
    clearMessage,
    selectAndSaveMethod,
  } = usePaymentSettings();

  useProtectedRoute('/login');

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

      {/* Mensagem quando ambos configurados */}
      {state.mercadoPago.publicKey && state.pixDirect.key && (
        <div className="mb-6 p-4 rounded-xl border bg-blue-50 border-blue-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-blue-900">Dois métodos configurados</p>
              <p className="text-sm text-blue-600">
                {state.activeMethod === 'mercadopago' 
                  ? 'MercadoPago está ativo. Clique em PIX Direto para alternar.'
                  : 'PIX Direto está ativo. Clique em MercadoPago para alternar.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Cards de Seleção de Método */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <PaymentMethodCard
          method="mercadopago"
          title="MercadoPago"
          badge="Automático"
          description="Integração completa com confirmação automática"
          features={[
            'Dinheiro cai na sua conta MercadoPago',
            'Clientes recebem acesso do links/arquivos automaticamente',
            'Confirmação de pagamento automatizada',
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
        <MercadoPagoForm
          publicKey={state.mercadoPago.publicKey}
          accessToken={state.mercadoPago.accessToken}
          isConfigured={state.activeMethod === 'mercadopago'}
          showCredentials={state.showCredentials}
          onChange={(field, value) => setMercadoPagoData({ [field]: value })}
          onToggleShow={toggleShowCredentials}
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
                Salvar {isMercadoPagoSelected ? 'Credenciais MercadoPago' : 'Chave PIX'}
              </>
            )}
          </button>
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
              <p className="font-medium text-slate-900">Obter credenciais MercadoPago</p>
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
