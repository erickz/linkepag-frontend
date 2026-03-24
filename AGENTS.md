# AGENTS.md - LinkePag

> Documentação essencial para agentes de IA trabalhando neste projeto.  
> **Última atualização:** 2026-03-24 | **Status:** MVP em Produção | **Fase:** Pós-remoção do Billing (simplificação)

---

## 🗑️ SISTEMA DE BILLING REMOVIDO (2026-03-14)

> ⚠️ **IMPORTANTE:** O sistema complexo de billing foi completamente removido.
> 
> ### O que foi removido:
> - ❌ Billing cycles (ciclos de faturamento mensal)
> - ❌ Invoices (faturas mensais consolidadas)
> - ❌ Platform fees acumulativos (taxas pendentes)
> - ❌ Usage snapshots (auditoria de usage)
> - ❌ Prorating (cálculos de crédito proporcional)
> - ❌ Cobrança automática de cartão
> - ❌ Página de billing no frontend
> 
> ### O que foi mantido:
> - ✅ **Taxas por transação** (`feePerTransaction` nos planos) - serão cobradas na hora
> - ✅ **Subscriptions** - planos mensuais/anuais funcionam normalmente
> - ✅ **Pagamentos** - PIX Direto e MercadoPago para links
> - ✅ **Limites de planos** - quantidade de links monetizados
> 
> ### Webhook consolidado:
> Agora existe **APENAS UM** webhook para o MercadoPago:
> ```
> POST /payments/webhooks/mercadopago
> ```
> Ele processa tanto pagamentos de links quanto assinaturas.

---

## 📋 ÍNDICE RÁPIDO

| Seção | Para quem | Prioridade |
|-------|-----------|------------|
| [🚨 ZONA CRÍTICA](#-zona-crítica) | Todos | **OBRIGATÓRIO** |
| [⚡ QUICK REFERENCE](#-quick-reference) | Debug rápido | Alta |
| [🔗 CORE DOMAIN: Links](#-core-domain-links) | Trabalhando com links | Alta |
| [💳 PAYMENTS & SUBSCRIPTIONS](#-payments--subscriptions) | Billing/gateway | **🔴 CRÍTICA** |
| [👤 USERS & AUTH](#-users--auth) | Autenticação/perfis | Média |
| [🔧 CONFIGURAÇÃO](#-configuração) | Setup/deploy | Média |
| [📊 REFERÊNCIA TÉCNICA](#-referência-técnica) | Consulta | Baixa |
| [🎨 COMUNICAÇÃO](#-comunicação-e-tom-de-voz) | Copy/UI | Média |

---

## 🚨 ZONA CRÍTICA

> ⚠️ **LEIA ANTES DE CODING** — Erros aqui quebram produção

### Regras de Ouro (Nunca Violadas)

```
┌─────────────────────────────────────────────────────────────────────┐
│  🔴 REGRA #1: Pagamento confirmado NUNCA muda de status             │
│     Status 'confirmed' é TERMINAL. Para reembolso, crie novo registro│
├─────────────────────────────────────────────────────────────────────┤
│  🔴 REGRA #2: NUNCA renomeie variáveis de ambiente                  │
│     Se precisar mudar, PEÇA PERMISSÃO explicitamente                │
├─────────────────────────────────────────────────────────────────────┤
│  🔴 REGRA #3: SEMPRE use atomicidade em operações financeiras       │
│     Use findOneAndUpdate, NUNCA find + save separados               │
├─────────────────────────────────────────────────────────────────────┤
│  🔴 REGRA #4: Valide HMAC em TODOS os webhooks                      │
│     MP usa x-signature, verifique antes de processar                │
├─────────────────────────────────────────────────────────────────────┤
│  🔴 REGRA #5: Idempotência é obrigatória                            │
│     x-request-id deve ser único por webhook                         │
├─────────────────────────────────────────────────────────────────────┤
│  🔴 REGRA #6: 2 repositórios Git separados                          │
│     Backend e Frontend NÃO comitem juntos                           │
├─────────────────────────────────────────────────────────────────────┤
│  🔴 REGRA #7: DEPLOY APENAS VIA GIT PUSH                            │
│     NUNCA use ferramentas de deploy (Railway CLI, Vercel CLI, etc)  │
│     SEMPRE faça push para o Git e deixe o CI/CD fazer o deploy      │
│     ⚠️ Deploy manual quebra configurações e variáveis de ambiente   │
└─────────────────────────────────────────────────────────────────────┘
```

### Checklist Pré-Deploy (Billing/Subscriptions)

Antes de qualquer deploy em produção, verifique:

- [ ] Testes de pagamento passam (PIX Direto + MP)
- [ ] Webhooks respondem 200 em ambiente de staging
- [ ] Nenhuma variável de ambiente foi renomeada
- [ ] Migrações de banco são reversíveis
- [ ] Rollback plan está documentado

---

## ⚡ QUICK REFERENCE

### "Estou trabalhando em..." → Vá para:

| Situação | Seção | Arquivos Principais |
|----------|-------|---------------------|
| Links monetizados mostram valor errado | [Core Domain: Links](#-core-domain-links) | `links.service.ts`, `Link.schema` |
| Webhook não processa | [Webhooks](#-webhooks) | `payments.controller.ts`, `subscriptions.controller.ts` |
| Plano não atualiza após pagamento | [Cron Jobs](#-cron-jobs) | `subscriptions.cron.ts` |
| Taxa cobrada errada | [Cálculo de Taxas](#-cálculo-de-taxas) | `payments.service.ts` |
| Usuário não consegue criar link pago | [Validações de Limite](#-validações-de-limite) | `subscriptions.service.ts` |
| PIX Direto não confirma | [Fluxo PIX Direto](#-fluxo-pix-direto) | `payments.service.ts` |
| Checkout MP falha | [Fluxo MercadoPago](#-fluxo-mercadopago) | `mercadopago.service.ts` |

### Comandos de Emergência

```bash
# Verificar status de assinaturas expirando
docker exec -it mongo mongosh -u admin -p test123 --authenticationDatabase admin -eval "db.subscriptions.find({status: 'active', currentPeriodEnd: {\$lt: new Date(Date.now() + 3*24*60*60*1000)}}).count()"

# Listar webhooks processados nas últimas 24h
docker exec -it mongo mongosh -u admin -p test123 --authenticationDatabase admin -eval "db.payments.find({webhookProcessedAt: {\$gt: new Date(Date.now() - 24*60*60*1000)}}).limit(10)"

# Rollback rápido no Railway
railway down && railway up --environment production
```

### URLs Importantes

| Ambiente | URL |
|----------|-----|
| Frontend Local | http://localhost:3000 |
| Backend Local | http://localhost:3001 |
| Perfil Público | `/p/:username` |
| Admin Planos | `/admin/plans` |
| Admin Payments | `/admin/payments` |
| Pending Payments | `/admin/payments/pending` |

---

## 🔗 CORE DOMAIN: Links

> 🎯 **O coração do LinkePag** | 70% link-in-bio + 30% checkout

### Modelo Link (TL;DR)

```typescript
interface Link {
  userId: ObjectId;           // Dono do link
  title: string;              // Título exibido
  url: string;                // URL de destino
  type: 'free' | 'paid';      // Tipo do link
  isPaid: boolean;            // true = requer pagamento
  price?: number;             // Preço em reais (se pago)
  order: number;              // Ordem de exibição
  isActive: boolean;          // Visível ou não
  paymentTimeoutMinutes: 30;  // Timeout padrão
}
```

### Limites por Plano

| Plano | Links Gratuitos | Links Monetizados |
|-------|-----------------|-------------|
| Starter (1) | ∞ | 3 |
| Creator (2) | ∞ | 10 |
| Pro (3) | ∞ | ∞ |
| Ilimitado (4) | ∞ | ∞ |

**Importante:** `paidLinksCount` no User deve ser incrementado/decrementado ao criar/deletar links monetizados.

### Fluxo de Criação

```
Usuário cria link
       ↓
Validar plano (canCreatePaidLink?)
       ↓
[Se pago] Verificar limite: paidLinksCount < maxLinksPagos
       ↓
Criar Link
       ↓
[Se pago] Incrementar paidLinksCount
```

---

## 💳 PAYMENTS & SUBSCRIPTIONS

> 🔴 **MODO DEFENSIVO** — Erros aqui = perda de receita

### Matriz de Decisão: Qual Gateway?

| Situação | Gateway | Endpoint | Credencial Usada |
|----------|---------|----------|------------------|
| Comprador paga link | MP do Vendedor | `POST /payments/create/:linkId` | `user.mercadoPagoAccessToken` |
| Comprador paga link | PIX Direto | `POST /payments/create-pix-direct/:linkId` | `user.pixKey` |
| Plataforma cobra creator | MP LinkePag | `POST /subscriptions` | `MERCADOPAGO_ACCESS_TOKEN` (env) |

---

### 🔄 Os 3 Fluxos de Pagamento

O LinkePag possui **3 fluxos de pagamento distintos**, cada um com comportamentos e nuances únicas. NUNCA confunda um com o outro.

#### 1️⃣ CHECKOUT DO VENDEDOR (Comprador → Vendedor)
> **O que é:** Pagamento de links monetizados. O comprador paga e o dinheiro vai para o vendedor.

| Aspecto | Detalhe |
|---------|---------|
| **Quem paga** | Comprador (usuário externo) |
| **Quem recebe** | Vendedor (dono do link) |
| **Credencial MP** | `user.mercadoPagoAccessToken` (do vendedor) |
| **Endpoint** | `POST /payments/create/:linkId` |
| **Service** | `payments.service.ts` |
| **Status inicial** | `pending` (MP) ou `awaiting_confirmation` (PIX Direto) |
| **Confirmação** | Automática (webhook MP) ou manual (vendedor) |
| **Principais features** | Idempotência, token de acesso, timeout configurável |

**Fluxo completo:**
```
Comprador clica no link pago
    ↓
Sistema cria Payment no MongoDB
    ↓
Chama MercadoPago API (credencial do VENDEDOR)
    ↓
Gera PIX QR Code ou aguarda confirmação
    ↓
[MP] Webhook confirma → Status: confirmed
    ↓
Comprador recebe accessToken por email
```

**NUANÇAS CRÍTICAS:**
- Usa o `accessToken` do **vendedor** (não da plataforma)
- O dinheiro vai direto para a conta do vendedor no MP
- Gera `accessToken` único para o comprador acessar o conteúdo
- Suporta PIX Direto (confirmação manual) e MercadoPago (automático)

---

#### 2️⃣ SUBSCRIPTION (Creator → Plataforma)
> **O que é:** Pagamento mensal/anual do plano. O creator paga para usar a plataforma.

| Aspecto | Detalhe |
|---------|---------|
| **Quem paga** | Creator (usuário logado) |
| **Quem recebe** | LinkePag (plataforma) |
| **Credencial MP** | `MERCADOPAGO_ACCESS_TOKEN` (env da plataforma) |
| **Endpoint** | `POST /subscriptions` |
| **Service** | `subscriptions.service.ts` |
| **Status inicial** | `pending_payment` (aguardando) |
| **Confirmação** | Webhook MP → `activateSubscription()` |
| **Principais features** | Renovação automática, downgrade agendado, grace period |

**Fluxo completo:**
```
Creator seleciona plano no /admin/plans
    ↓
Sistema cria Subscription no MongoDB
    ↓
Chama MercadoPago API (credencial da PLATAFORMA)
    ↓
Gera PIX ou processa cartão
    ↓
[MP] Webhook confirma → activateSubscription()
    ↓
Atualiza user.planId, planStatus, planExpiryDate
```

**NUANÇAS CRÍTICAS:**
- Usa o `accessToken` da **plataforma** (env `MERCADOPAGO_ACCESS_TOKEN`)
- O dinheiro vai para a conta do LinkePag
- Atualiza o `planId` do usuário apenas após confirmação do pagamento
- Suporta downgrade agendado (só efetiva no fim do ciclo)
- Tem cron job para expiração automática

---

#### 3️⃣ BILLING PAYMENT (Taxas de Uso → Plataforma)
> **O que é:** Cobrança de taxas acumuladas por uso (ex: 8% das vendas no plano Starter).

| Aspecto | Detalhe |
|---------|---------|
| **Quem paga** | Creator (usuário com dívidas) |
| **Quem recebe** | LinkePag (plataforma) |
| **Credencial MP** | `MERCADOPAGO_ACCESS_TOKEN` (env da plataforma) |
| **Endpoint** | `POST /billing/pay-fees` |
| **Service** | `billing-payment.service.ts` |
| **Status inicial** | `pending` |
| **Confirmação** | Webhook MP → `markPaymentAsCompleted()` |
| **Principais features** | Pagamento de dívida, checkout unificado (plano + taxas) |

**Fluxo completo:**
```
Sistema detecta dívidas (cron ou acesso)
    ↓
Creator clica "Pagar Pendências" no /admin/plans
    ↓
Sistema cria BillingPayment no MongoDB
    ↓
Chama MercadoPago API (credencial da PLATAFORMA)
    ↓
[MP] Webhook confirma → markPaymentAsCompleted()
    ↓
Limpa user.feesDebt, atualiza ciclo de billing
```

**NUANÇAS CRÍTICAS:**
- Usa o `accessToken` da **plataforma** (env `MERCADOPAGO_ACCESS_TOKEN`)
- Pode ser pagamento **apenas de taxas** ou **unificado** (plano + taxas)
- Se `planAmount === 0`, é pagamento de dívida pura (`isDebtPayment: true`)
- Limpa `user.feesDebt` e `user.outstandingDebt` ao confirmar
- Bloqueia criação de links monetizados se houver dívida (`BillingGuardService`)

---

### 🎯 Tabela Comparativa dos 3 Fluxos

| Característica | Checkout Vendedor | Subscription | Billing Payment |
|----------------|-------------------|--------------|-----------------|
| **Direção do dinheiro** | Comprador → Vendedor | Creator → Plataforma | Creator → Plataforma |
| **Credencial MP** | Do vendedor | Da plataforma | Da plataforma |
| **Quem paga** | Externo (comprador) | Usuário logado | Usuário logado |
| **Schema MongoDB** | `Payment` | `Subscription` | `BillingPayment` |
| **Service** | `payments.service.ts` | `subscriptions.service.ts` | `billing-payment.service.ts` |
| **Frontend** | `PixCheckout.tsx` | `plans/page.tsx` | `plans/page.tsx` (seção pendências) |
| **External Reference** | `PAY-*` / `CARD-*` / `BRICK-*` | `SUB-*` | `BILL-*` |
| **Webhook handler** | `payments.controller.ts` | `subscriptions.service.ts` | `billing-payment.service.ts` |

### ⚠️ Erros Comuns (NUNCA FAÇA)

```typescript
// ❌ ERRO: Usar credencial da plataforma no checkout do vendedor
const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN; // ERRADO!

// ✅ CERTO: Usar credencial do vendedor
const accessToken = await this.mpOAuthService.getValidAccessToken(link.userId.toString());
```

```typescript
// ❌ ERRO: Atualizar plano do usuário antes do pagamento confirmar (subscription)
await this.userModel.findByIdAndUpdate(userId, { planId: newPlanId }); // ERRADO!

// ✅ CERTO: Só atualizar em activateSubscription() quando o webhook confirmar
```

```typescript
// ❌ ERRO: Não limpar dívida ao confirmar pagamento de billing
// Esquecer de zerar user.feesDebt

// ✅ CERTO: Limpar todos os campos de dívida
await this.userModel.findByIdAndUpdate(payment.userId, {
  $set: { feesDebt: 0, outstandingDebt: 0, hasFeesDebt: false }
});
```

---

### Status de Pagamento (Máquina de Estados)

```
                         ┌─────────────────┐
    ┌───────────────────►│    PENDING      │◄────────────────────┐
    │  (MP: QR gerado)   │   (inicial)     │  (novo pagamento)   │
    │                    └────────┬────────┘                     │
    │                             │                             │
    │         ┌───────────────────┼───────────────────┐         │
    │         │                   │                   │         │
    │         ▼                   ▼                   ▼         │
    │    ┌─────────┐      ┌───────────────┐      ┌─────────┐   │
    │    │EXPIRED  │      │AWAITING_CONF  │      │ FAILED  │   │
    │    │(timeout)│      │ (PIX Direto)  │      │ (erro)  │   │
    │    │ 30 min  │      │               │      │         │   │
    │    └────┬────┘      └───────┬───────┘      └────┬────┘   │
    │         │                   │                   │         │
    │         │                   │ (confirmação      │         │
    │         │                   │  manual)          │         │
    │         │                   ▼                   │         │
    │         │            ┌─────────────┐            │         │
    │         └───────────►│  CONFIRMED  │◄───────────┘         │
    │           (timeout)  │  (terminal) │   (webhook MP)       │
    │                      └─────────────┘                      │
    │                                                           │
    └───────────────────────────────────────────────────────────┘
                              (novo pagamento = novo registro)
```

**⚠️ CRITICAL:** `confirmed` é estado TERMINAL. Nunca reverta para outro status.

### 🔴 Regras Invioláveis de Pagamento

```typescript
// ❌ PROIBIDO: Reverter status confirmed
if (payment.status === 'confirmed') {
  payment.status = 'pending'; // NUNCA FAÇA ISSO
  await payment.save();
}

// ✅ CORRETO: confirmed é imutável
if (payment.status !== 'confirmed') {
  await this.paymentModel.findOneAndUpdate(
    { _id: paymentId, status: { $ne: 'confirmed' } }, // Proteção extra
    { $set: { status: newStatus } }
  );
}
```

### Tabela de Transições Permitidas

| De | Para | Quando |
|----|------|--------|
| `pending` | `confirmed` | Webhook MP confirmou |
| `pending` | `awaiting_confirmation` | PIX Direto criado |
| `pending` | `expired` | Timeout (30 min) |
| `pending` | `failed` | Erro técnico |
| `awaiting_confirmation` | `confirmed` | Confirmação manual vendedor |
| `awaiting_confirmation` | `failed` | Erro técnico |

**Transições PROIBIDAS:**
- ❌ `confirmed` → qualquer outro
- ❌ `expired` → qualquer outro (crie novo pagamento)
- ❌ `failed` → qualquer outro (crie novo pagamento)

### Webhook Consolidado

> 🎯 **AGORA APENAS UM WEBHOOK** - Anteriormente existiam 3, agora consolidado em um só.

#### Endpoint Único: `/payments/webhooks/mercadopago`

- **Processa:**
  - Pagamentos de links (compradores pagando criadores)
  - Assinaturas de planos (creators pagando a plataforma)
- **Validação:** HMAC com `MERCADOPAGO_WEBHOOK_SECRET`
- **Idempotência:** Verifica `x-request-id` para evitar duplicatas
- **Diferenciação:**
  - `type: 'payment'` + `external_reference` começando com `SUB-*` → Assinatura
  - `type: 'preapproval'` → Assinatura (recorrência)
  - `type: 'payment'` (outros) → Pagamento de link

### Fluxo PIX Direto vs MercadoPago

#### PIX Direto (Confirmação Manual)

```
Comprador clica link
       ↓
Solicita email do comprador
       ↓
Gera QR Code com chave PIX do vendedor
       ↓
Status: AWAITING_CONFIRMATION
       ↓
Comprador paga no app do banco
       ↓
[VENDEDOR] Recebe notificação
       ↓
[VENDEDOR] Acessa /admin/payments/pending
       ↓
[VENDEDOR] Confirma pagamento manualmente
       ↓
Status: CONFIRMED
       ↓
Email enviado ao comprador com accessToken
```

#### MercadoPago (Automático)

```
Comprador clica link
       ↓
Cria cobrança na API do MP
       ↓
Status: PENDING
       ↓
Gera QR Code MP
       ↓
Comprador paga no app
       ↓
MP envia webhook
       ↓
Sistema valida HMAC + idempotência
       ↓
Status: CONFIRMED
       ↓
Acesso liberado automaticamente
       ↓
Email enviado ao comprador
```

### Sistema de Planos

#### Matriz de Permissões

| Recurso | Starter | Creator | Pro | Ilimitado |
|---------|:-------:|:-------:|:---:|:---------:|
| Links gratuitos | ✅ ∞ | ✅ ∞ | ✅ ∞ | ✅ ∞ |
| Links monetizados | 3 | 10 | ∞ | ∞ |
| Receber pagamentos | ❌* | ✅ | ✅ | ✅ |
| Relatórios | Básico | Completo | Avançado | API |
| Taxa/Transação | R$ 0,70 | R$ 0,50 | R$ 0,35 | R$ 0,20 |

*Starter pode criar links monetizados mas não recebe (upgrade necessário)

#### Cálculo de Taxas

```typescript
// Exemplo: Plano Creator (R$ 0,50 por transação)
// Venda de R$ 50,00

// Se usar PIX Direto:
// - Vendedor recebe: R$ 50,00 - R$ 0,50 = R$ 49,50
// - Dinheiro cai na conta do vendedor

// Se usar MercadoPago:
// - Taxa MP: 1,99% + R$ 0,99
// - Taxa LinkePag: R$ 0,50
// - Vendedor recebe: R$ 50,00 - R$ 0,99 - R$ 0,99 - R$ 0,50 = R$ 47,52
```

#### Fluxo de Vida da Assinatura

```
Novo usuário → Plano Starter (planId=1, automático)
       ↓
Upgrade solicitado
       ↓
Pagamento (PIX ou Cartão)
       ↓
┌──────────────────┬──────────────────┐
│     PIX          │    Cartão        │
├──────────────────┼──────────────────┤
│ Status: pending_ │ Status: active   │
│ payment          │ (imediato)       │
│       ↓          │                  │
│ Confirmação      │                  │
│ manual/PIX       │                  │
│       ↓          │                  │
│ Status: active   │                  │
└──────────────────┴──────────────────┘
       ↓
3 dias antes da expiração → Email aviso
       ↓
Dia da expiração → Status: expired
       ↓
Downgrade automático → planId=1 (Starter)
       ↓
7 dias depois → Email de reativação
```

### Cron Jobs

| Job | Frequência | Função | Arquivo |
|-----|------------|--------|---------|
| `checkExpiringSubscriptions()` | A cada 1h | Envia email 3 dias antes | `subscriptions.cron.ts` |
| `handleExpiredSubscriptions()` | A cada 1h | Downgrade + notificação | `subscriptions.cron.ts` |

---

## 👤 USERS & AUTH

### Modelo User (Campos Essenciais)

```typescript
interface User {
  // Identificação
  email: string;           // Único
  username: string;        // Único, URL pública
  
  // Plano
  planId: 1 | 2 | 3 | 4;   // Starter | Creator | Pro | Ilimitado
  planStatus: 'active' | 'expired' | 'cancelled' | 'pending_payment';
  planExpiryDate: Date;    // Fim do período atual
  planRenewsAt: Date;      // Próxima cobrança
  paidLinksCount: number;  // Contador de links monetizados criados
  
  // Pagamentos (credenciais do vendedor - para receber pagamentos nos links)
  mercadoPagoPublicKey?: string;
  mercadoPagoAccessToken?: string;
  pixKey?: string;
  pixKeyType?: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM';
  
  // Segurança
  role: 'admin' | 'user';
}
```

> **Nota:** Campos de billing removidos (`feeBalance`, `totalFeesPaid`, `billingStatus`, etc.) - agora taxas são cobradas na hora da transação.

### Validações de Plano

```typescript
// ✅ CORRETO: Verificar antes de criar link pago
async canCreatePaidLink(userId: string): Promise<boolean> {
  const user = await this.userModel.findById(userId);
  const plan = PLANS.find(p => p.id === user.planId);
  
  if (user.planStatus !== 'active') return false;
  if (plan.maxPaidLinks === Infinity) return true;
  
  return user.paidLinksCount < plan.maxPaidLinks;
}

// ❌ PROIBIDO: Não verificar planStatus
if (user.paidLinksCount < 10) { // Pode estar expirado!
  // permitir criação
}
```

---

## 🔧 CONFIGURAÇÃO

### Variáveis de Ambiente (⚠️ IMUTÁVEIS)

> **NUNCA renomeie estas variáveis.** Se necessário, peça permissão.

```env
# MongoDB
MONGO_URI=mongodb://admin:test123@mongo:27017/app_db?authSource=admin
MONGO_DB_NAME=app_db

# Backend
BACKEND_PORT=3001
JWT_SECRET=iqXiorf428b8zvnOneY3WdcaNJkWULM5HIb2ko1LByo=
NEXT_PUBLIC_API_URL=http://localhost:3001

# Frontend
NEXT_PUBLIC_APP_PORT=3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# MercadoPago (LinkePag - para assinaturas)
MERCADOPAGO_ACCESS_TOKEN=TEST-2372715816013223-020617-fba94bad1dfecd86b5f3ce5ab0078ab3-231750138

# MercadoPago (Frontend - para inicializar SDK)
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=TEST-f44e5241-2552-4c54-b72c-8fd1a9f7c1e2

# Email
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM=noreply@linkepag.com

# PIX LinkePag (para assinaturas da plataforma)
LINKEPAG_PIX_KEY=pix@linkepag.com
LINKEPAG_PIX_KEY_TYPE=EMAIL
LINKEPAG_PIX_NAME=LinkePag Tecnologia
LINKEPAG_PIX_CITY=Sao Paulo
```

### 🚀 Deploy (⚠️ MUITO IMPORTANTE)

> **NUNCA, EM HIPÓTESE ALGUMA, use ferramentas de deploy automatizado como Railway CLI, Vercel CLI, ou similares.**

#### ✅ Como fazer deploy CORRETAMENTE:

1. **Backend (Railway):**
   ```bash
   cd backend
   git add .
   git commit -m "feat: descrição da mudança"
   git push origin main
   # O Railway detecta automaticamente e faz o deploy
   ```

2. **Frontend (Vercel):**
   ```bash
   cd frontend
   git add .
   git commit -m "feat: descrição da mudança"
   git push origin main
   # O Vercel detecta automaticamente e faz o deploy
   ```

#### ❌ O que NUNCA fazer:
- `railway up` ou `railway deploy`
- `vercel --prod`
- Qualquer comando que faça deploy direto sem passar pelo Git

#### ⚠️ Por que isso é importante:
- Deploy manual quebra variáveis de ambiente configuradas no dashboard
- Deploy manual pode sobrescrever configurações de build
- Deploy manual não passa pelos checks de CI/CD
- Deploy manual pode causar downtime inesperado

### Estrutura de Repositórios

```
linkepag/
├── backend/          # Repo Git separado (Railway)
│   └── src/
│       ├── auth/
│       ├── users/
│       ├── links/
│       ├── payments/     # Inclui webhook consolidado
│       ├── subscriptions/# Sem billing cycles
│       └── admin/
│
├── frontend/         # Repo Git separado (Vercel)
│   └── src/
│       ├── app/          # Sem /admin/billing
│       ├── components/   # Sem BillingAlerts
│       └── hooks/        # Sem useBillingAlerts
│
├── scripts/          # Scripts de migração
│   └── migrate-remove-billing.js
│
└── AGENTS.md         # Este arquivo (único para ambos)
```

> ⚠️ **ATENÇÃO:** Backend e Frontend são repositórios Git separados. Nunca commite arquivos do backend no frontend ou vice-versa.

---

## 📊 REFERÊNCIA TÉCNICA

### Endpoints por Módulo

#### 🔐 Autenticação
| Método | Endpoint | Auth |
|--------|----------|------|
| POST | `/auth/register` | - |
| POST | `/auth/login` | - |

#### 👤 Usuários
| Método | Endpoint | Auth |
|--------|----------|------|
| GET | `/users/profile` | JWT |
| GET | `/users/profile/:username` | - |
| PATCH | `/users/profile` | JWT |
| PATCH | `/users/mercadopago/credentials` | JWT |

#### 🔗 Links
| Método | Endpoint | Auth |
|--------|----------|------|
| POST | `/links` | JWT |
| GET | `/links` | JWT |
| PATCH | `/links/:id` | JWT |
| DELETE | `/links/:id` | JWT |
| POST | `/links/reorder` | JWT |

#### 💳 Pagamentos
| Método | Endpoint | Auth |
|--------|----------|------|
| POST | `/payments/create/:linkId` | - |
| POST | `/payments/create-pix-direct/:linkId` | - |
| PATCH | `/payments/:paymentId/confirm` | JWT |
| POST | `/payments/webhooks/mercadopago` | - |
| GET | `/payments/pending` | JWT |

#### ⭐ Subscriptions
| Método | Endpoint | Auth |
|--------|----------|------|
| GET | `/subscriptions/plans` | - |
| GET | `/subscriptions/current` | JWT |
| POST | `/subscriptions` | JWT |
| ~~POST~~ | ~~`/subscriptions/webhook`~~ | ~~-~~ | **REMOVIDO** → Consolidado em `/payments/webhooks/mercadopago` |

---

## 🎨 COMUNICAÇÃO E TOM DE VOZ

### Contexto Atual (MVP)

> **Fase:** Correção de bugs de billing  
> **Próximo passo:** Melhorias incrementais + redes  
> **Tom:** Informal, levemente quente, sem exageros

### Avatar do ICP

**"O Criador em Crescimento"**
- **Nome:** Luísa (representativo)
- **Idade:** 22-35 anos
- **Ocupação:** Criadora de conteúdo (Instagram, TikTok, YouTube)
- **Dor:** Não sabe monetizar a audiência
- **Objetivo:** Transformar seguidores em renda

### Tom de Voz

| Característica | Como Aplicar |
|----------------|--------------|
| **Levemente Quente** | "Bora monetizar!" em vez de "Inicie o processo" |
| **Direto** | Sem enrolação, vai direto ao ponto |
| **Empoderador** | "Você pode", "Você tem controle" |
| **Transparente** | Taxas claras, sem surpresas |

### Do's and Don'ts

| ✅ DO | ❌ DON'T |
|-------|----------|
| "Seu dinheiro, suas regras" | "Conforme os termos de serviço..." |
| "Bora lá!" | "Por favor, proceda..." |
| "Pronto pra vender?" | "Iniciar transação comercial" |
| "Você economizou R$ X" | "Há uma redução de custos" |

### Checklist de Revisão de Copy

Antes de finalizar qualquer texto na UI:

- [ ] Está no tom informal mas profissional?
- [ ] Taxas e valores estão transparentes?
- [ ] Usa "você" e não "o usuário"?
- [ ] CTAs são claros e motivadores?
- [ ] Mensagens de erro explicam o problema + solução?

---

## 🧪 COMO TRABALHAR COM ESTE PROJETO

### Estrutura Ideal de Prompt

Use este template para pedidos mais eficientes:

```markdown
## 🎯 Objetivo
[O que você quer que seja feito]

## 📍 Contexto
- Local: [backend|frontend|ambos]
- Branch: [nome-da-branch]
- Ambiente: [dev|staging|prod]

## 🐛 Problema (se for bug)
[Descrição do comportamento errado]

## 📸 Evidências
[Screenshot ou descrição detalhada]

## 🔒 Restrições
- [Áreas críticas envolvidas?]
- [Não deve alterar X]
```

### Checklist Antes de Modificar

#### Se for em Payments/Subscriptions:
- [ ] Entendi o fluxo completo afetado?
- [ ] Identifiquei todos os status possíveis?
- [ ] Considerei race conditions?
- [ ] Adicionei logs para debugging?

#### Se for em Links (Core Domain):
- [ ] Validei impacto nos links existentes?
- [ ] Testei criação/edição/deleção?
- [ ] Verifiquei ordenação?

### Quando Pedir Confirmação

O agente DEVE pedir confirmação antes de:

| Situação | Motivo |
|----------|--------|
| Renomear variável de ambiente | Pode quebrar produção |
| Alterar schema de Payment/Subscription | Risco de perda de dados |
| Mudar status de pagamento | Regra de ouro |
| Deletar migration | Irreversível |
| Alterar webhook handler | Pode parar de receber pagamentos |

O agente pode agir diretamente em:
- UI/CSS
- Logs e mensagens de erro
- Testes unitários
- Documentação

---

## 🐛 DEBUGGING

### Logs Obrigatórios

```typescript
// ✅ SEMPRE logue em operações de pagamento
this.logger.log(`[Payment] Criando pagamento: ${paymentId} | Link: ${linkId} | Valor: ${amount}`);
this.logger.log(`[Payment] Status alterado: ${oldStatus} -> ${newStatus} | Payment: ${paymentId}`);
this.logger.log(`[Webhook] Recebido: ${type} | ID: ${id} | Request: ${xRequestId}`);
```

### Queries Úteis (MongoDB)

```javascript
// Pagamentos pendentes de confirmação PIX
 db.payments.find({ 
   status: 'awaiting_confirmation',
   createdAt: { $gt: new Date(Date.now() - 7*24*60*60*1000) }
 })

// Assinaturas expirando em 3 dias
 db.subscriptions.find({
   status: 'active',
   currentPeriodEnd: { 
     $lt: new Date(Date.now() + 3*24*60*60*1000),
     $gt: new Date()
   }
 })

// Webhooks duplicados
 db.payments.aggregate([
   { $match: { webhookRequestId: { $exists: true } } },
   { $group: { _id: "$webhookRequestId", count: { $sum: 1 } } },
   { $match: { count: { $gt: 1 } } }
 ])
```

---

## 📎 APPENDIX

### Stack Tecnológico

| Camada | Tecnologia |
|--------|------------|
| Backend | NestJS ^11.0.1, MongoDB 7, Mongoose |
| Frontend | Next.js ^16.1.3, React 19.2.3, Tailwind CSS ^4.1 |
| Testes | Jest (backend), Playwright (frontend) |
| Deploy | Railway (backend), Vercel (frontend) |
| Email | Resend (prod), Mailtrap (dev) |

### Convenções de Código

- **Idioma:** Código e comentários em pt-BR
- **TypeScript:** Strict mode, evite `any`
- **Commits:** Execute no repositório correto (backend/frontend são separados)

### Changelog Resumido

| Data | Mudança |
|------|---------|
| 2026-03-14 | **🗑️ REMOÇÃO DO BILLING** - Removido sistema complexo de billing cycles, invoices, prorating. Taxas por transação serão cobradas na hora (nova implementação futura). Webhooks consolidados em um só endpoint. |
| 2026-03-09 | Reestruturação completa do AGENTS.md (zona crítica, guidelines de pagamento, tom de voz) |
| 2026-03-05 | Dois webhooks MP distintos + Sistema de alertas admin |
| 2026-02-19 | Sistema de planos completo com cron jobs |
| 2026-02-18 | PIX Direto com confirmação manual |

---

> 💡 **Dica:** Se algo não estiver claro, pergunte antes de assumir. O sistema de pagamentos é crítico — é melhor confirmar do que quebrar.
