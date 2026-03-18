# Sistema de Billing - Frontend

> Documentação do sistema de billing cycles no frontend do LinkePag

## 📁 Arquivos Criados

### 1. API Service (`src/lib/api-billing.ts`)
Funções de integração com a API de billing:
- `getCurrentBillingCycle()` - Busca ciclo atual
- `getBillingStatus()` - Busca status completo com alertas
- `getBillingHistory()` - Histórico de ciclos
- `getFeeTransactions()` - Transações de taxas
- `payFees()` - Pagamento de taxas acumuladas
- `canReceivePayments()` - Verifica permissões

### 2. React Hooks (`src/hooks/useBilling.ts`)
Hooks para gerenciar estado do billing:
- `useBilling()` - Hook principal com alertas e status
- `useBillingHistory()` - Histórico de ciclos
- `useFeeTransactions()` - Transações de um ciclo
- `useCanReceivePayments()` - Verificação de permissões

### 3. Componentes de Billing (`src/components/billing/`)
- `BillingAlert.tsx` - Alertas para dashboard
  - `BillingAlert` - Alerta completo
  - `BillingAlertCompact` - Versão compacta para headers
  - `BillingStatusBadge` - Badge de status

### 4. Página de Billing (`src/app/admin/billing/page.tsx`)
Página completa de gerenciamento de billing com:
- Resumo do ciclo atual
- Cards de estatísticas
- Pagamento de taxas (PIX/Cartão)
- Histórico de transações
- Explicação do sistema

### 5. Ícones Adicionados (`src/components/icons.tsx`)
- `IconPix` - Ícone do PIX
- `IconAlertTriangle` - Alerta de triângulo
- `IconShoppingCart` - Carrinho de compras
- `IconHistory` - Histórico

## 🔧 Integrações Realizadas

### AdminLayout (`src/components/AdminLayout.tsx`)
Adicionado `BillingAlert` globalmente em todas as páginas admin:
```tsx
<BillingAlert />  {/* Mostra alertas quando necessário */}
```

### Página de Planos (`src/app/admin/plans/page.tsx`)
Adicionada seção de "Taxas do Período" mostrando:
- Taxas pendentes
- Taxa do plano atual
- Status do billing
- Alertas de grace period/bloqueio

## 🎯 Funcionalidades

### Alertas Automáticos
O sistema mostra alertas quando:
1. **Links bloqueados** (`locked`) - Alerta crítico vermelho
2. **Grace period** - Alerta amarelo com contagem regressiva
3. **Taxas pendentes** - Alerta informativo

### Status do Ciclo
- `open` - Ciclo aberto, acumulando taxas
- `closed` - Ciclo fechado, aguardando pagamento
- `grace_period` - Período de carência (7 dias)
- `locked` - Links bloqueados por não pagamento

### Pagamento de Taxas
Suporta pagamento via:
- PIX (QR Code + código copia e cola)
- Cartão de crédito (com tokenização via MercadoPago)

## 📱 Fluxo do Usuário

```
1. Usuário faz vendas → Taxas acumulam no ciclo atual
2. Ciclo fecha após 30 dias → Status muda para grace_period
3. Usuário recebe alerta no dashboard → Clica em "Pagar taxas"
4. Usuário escolhe método (PIX/Cartão) → Completa pagamento
5. Se não pagar em 7 dias → Links são bloqueados
6. Se não pagar em 60 dias → Downgrade automático
```

## 🔄 Cache Strategy

- `BILLING_CACHE_KEYS.BILLING_STATUS` - 30 segundos
- `BILLING_CACHE_KEYS.CURRENT_CYCLE` - 30 segundos
- `BILLING_CACHE_KEYS.CYCLE_HISTORY` - 1 minuto

## 📝 Próximos Passos (Opcional)

- [ ] Adicionar gráfico de evolução de taxas
- [ ] Exportar relatório de billing (PDF/CSV)
- [ ] Notificações por email sobre ciclo fechando
- [ ] Página de histórico completo de ciclos
