# AGENTS.md - LinkePag

Este documento contém informações essenciais para agentes de IA que trabalharão neste projeto.

---

## Visão Geral do Projeto

**LinkePag** (também referenciado como LinkPagg) é uma plataforma full-stack de link-in-bio que permite aos usuários criar perfis personalizados, gerenciar links e receber pagamentos via PIX integrado. É uma alternativa para criadores de conteúdo monetizarem sua audiência através de uma página única.

### Funcionalidades Principais

- Criação de perfis personalizados com username único
- Gerenciamento de links (gratuitos e pagos)
- Sistema de pagamento via PIX integrado
- Autenticação segura com JWT
- Painel administrativo para gerenciamento
- Integração frontend-backend completa

---

## Stack Tecnológico

### Backend

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| NestJS | ^11.0.1 | Framework Node.js progressivo |
| MongoDB | 7 | Banco de dados NoSQL via Mongoose |
| Passport JWT | ^11.0.5 | Autenticação JWT |
| @nestjs/throttler | ^6.5.0 | Rate limiting |
| Nodemailer | ^8.0.1 | Envio de emails (fallback) |
| Resend | ^6.9.2 | Envio de emails (primário) |
| @nestjs/schedule | ^6.1.1 | Cron jobs para planos |
| TypeScript | ^5.7.3 | Linguagem principal |
| Jest | ^30.0.0 | Testes unitários e E2E |

### Frontend

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| Next.js | ^16.1.3 | Framework React com App Router |
| React | 19.2.3 | Biblioteca UI |
| Tailwind CSS | ^4.1 | Styling utility-first |
| TypeScript | ^5 | Tipagem estática |
| Playwright | ^1.58.1 | Testes E2E |
| MSW | ^2.12.8 | Mock Service Worker (testes) |

### Infraestrutura

| Ferramenta | Propósito |
|------------|-----------|
| Docker | Containerização |
| Docker Compose | Orquestração de containers |
| MongoDB Memory Server | Banco em memória para testes |

### Integrações Externas

| Serviço | Propósito |
|---------|-----------|
| MercadoPago | Gateway de pagamentos PIX |
| Resend | Envio de emails em produção |
| Mailtrap | Envio de emails em desenvolvimento (fallback) |

---

## Estrutura de Diretórios

```
linkepag/
├── backend/                    # API NestJS
│   ├── src/
│   │   ├── auth/              # Módulo de autenticação
│   │   │   ├── dto/           # DTOs (login.dto.ts, register.dto.ts)
│   │   │   ├── validators/    # Validadores (cpf, full-name)
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.module.ts
│   │   │   ├── jwt.strategy.ts
│   │   │   └── throttler-login.guard.ts
│   │   ├── users/             # Módulo de usuários
│   │   │   ├── schemas/       # Schema MongoDB (user.schema.ts)
│   │   │   ├── dto/           # update-profile.dto.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   └── users.module.ts
│   │   ├── links/             # Módulo de links
│   │   │   ├── schemas/       # link.schema.ts
│   │   │   ├── dto/           # link.dto.ts
│   │   │   ├── links.controller.ts
│   │   │   ├── links.service.ts
│   │   │   └── links.module.ts
│   │   ├── payments/          # Módulo de pagamentos (PIX)
│   │   │   ├── schemas/       # payment.schema.ts
│   │   │   ├── payments.controller.ts
│   │   │   ├── access.controller.ts
│   │   │   ├── payments.service.ts
│   │   │   ├── mercadopago.service.ts  # Integração MercadoPago
│   │   │   └── payments.module.ts
│   │   ├── contact/           # Módulo de formulário de contato
│   │   │   ├── contact.controller.ts
│   │   │   ├── contact.module.ts
│   │   │   ├── contact.service.ts
│   │   │   └── dto/contact-form.dto.ts
│   │   ├── email/             # Módulo de email
│   │   │   ├── email.service.ts
│   │   │   └── email.module.ts
│   │   ├── subscriptions/     # Módulo de planos/assinaturas
│   │   │   ├── subscriptions.controller.ts
│   │   │   ├── subscriptions.cron.ts
│   │   │   ├── subscriptions.module.ts
│   │   │   ├── subscriptions.service.ts
│   │   │   ├── dto/create-subscription.dto.ts
│   │   │   └── schemas/subscription.schema.ts
│   │   ├── app.module.ts      # Módulo raiz
│   │   ├── app.controller.ts
│   │   ├── app.service.ts
│   │   └── main.ts            # Entry point
│   ├── test/                  # Testes E2E
│   │   ├── auth-e2e-spec.ts
│   │   ├── auth-throttle.e2e-spec.ts
│   │   ├── users.e2e-spec.ts
│   │   ├── links-payments.e2e-spec.ts
│   │   ├── leads.e2e-spec.ts
│   │   ├── subscriptions.e2e-spec.ts
│   │   ├── jest-e2e.json
│   │   ├── global-setup.ts    # Setup MongoMemoryServer
│   │   ├── global-teardown.ts
│   │   └── setup.ts
│   ├── scripts/               # Scripts utilitários
│   │   ├── generate-usernames.ts
│   │   └── migrate-links-payment-fields.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── nest-cli.json
│   ├── eslint.config.mjs
│   ├── .prettierrc
│   └── Dockerfile
│
├── frontend/                   # Aplicação Next.js
│   ├── src/
│   │   ├── app/               # App Router (Next.js 16)
│   │   │   ├── (auth)/        # Grupo de rotas de auth
│   │   │   │   ├── login/
│   │   │   │   └── register/
│   │   │   ├── admin/         # Área administrativa
│   │   │   │   ├── dashboard/
│   │   │   │   ├── links/
│   │   │   │   ├── leads/     # Gerenciamento de leads
│   │   │   │   ├── appearance/# Configurações de aparência
│   │   │   │   ├── editor/    # Editor de perfil
│   │   │   │   ├── onboarding/# Onboarding de novos usuários
│   │   │   │   ├── payments/  # Configurações de pagamento
│   │   │   │   │   ├── config/
│   │   │   │   │   └── pending/# Vendas pendentes
│   │   │   │   ├── plans/     # Gerenciamento de planos
│   │   │   │   └── settings/  # Configurações do usuário
│   │   │   │       ├── appearance/
│   │   │   │       ├── payments/
│   │   │   │       ├── personal/
│   │   │   │       └── profile/
│   │   │   ├── p/             # Perfil público (short URL)
│   │   │   │   └── [username]/
│   │   │   ├── plans/         # Página de planos
│   │   │   │   └── checkout/  # Checkout de assinatura
│   │   │   ├── contato/       # Formulário de contato
│   │   │   ├── forgot-password/
│   │   │   ├── reset-password/
│   │   │   ├── profile/edit/  # Edição de perfil (legacy)
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx       # Landing page
│   │   │   └── providers.tsx
│   │   ├── components/        # Componentes React
│   │   │   ├── LinkButton.tsx
│   │   │   ├── PixCheckout.tsx
│   │   │   ├── AdminHeader.tsx
│   │   │   ├── AdminLayout.tsx
│   │   │   ├── AdminSidebar.tsx
│   │   │   ├── AuthNavButton.tsx
│   │   │   ├── CreditCardForm.tsx
│   │   │   ├── Logo.tsx
│   │   │   ├── PageHeader.tsx
│   │   │   ├── PlanNotification.tsx
│   │   │   ├── PlanUpgradeModal.tsx
│   │   │   └── icons.tsx
│   │   ├── hooks/             # Custom hooks
│   │   │   ├── useAuth.tsx
│   │   │   ├── useLoginThrottle.ts
│   │   │   ├── useApi.ts
│   │   │   ├── useMask.ts
│   │   │   ├── useMercadoPago.ts
│   │   │   ├── usePageEditor.ts
│   │   │   └── useSubscription.ts
│   │   ├── lib/               # Utilitários
│   │   │   ├── api.ts         # Cliente API
│   │   │   ├── api-cache.ts   # Sistema de cache
│   │   │   └── masks.ts       # Máscaras de input
│   │   └── mocks/             # MSW mocks
│   │       ├── setup.ts
│   │       ├── handlers.ts
│   │       └── index.ts
│   ├── e2e/                   # Testes Playwright
│   │   ├── app.spec.ts
│   │   ├── pix-checkout.spec.ts
│   │   ├── profile-update.spec.ts
│   │   └── public-profile-paid-links.spec.ts
│   ├── public/                # Assets estáticos
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.ts
│   ├── playwright.config.ts
│   ├── playwright.global-setup.ts
│   ├── eslint.config.mjs
│   └── Dockerfile
│
├── docker-compose.yml         # Orquestração Docker
├── .env                       # Variáveis de ambiente
└── README.md
```

---

## Configuração de Ambiente

### Arquivo `.env` (Raiz do Projeto)

```env
# ============================================
# MongoDB
# ============================================
MONGO_URI=mongodb://admin:test123@mongo:27017/app_db?authSource=admin
MONGO_DB_NAME=app_db
MONGO_PORT=27017
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=test123

# ============================================
# Backend
# ============================================
BACKEND_PORT=3001
NODE_ENV=development
JWT_SECRET=iqXiorf428b8zvnOneY3WdcaNJkWULM5HIb2ko1LByo=
BACKEND_API_URL=http://localhost:3001

# Throttling - automaticamente desabilitado quando NODE_ENV=development

# ============================================
# Frontend
# ============================================
FRONTEND_PORT=3000
FRONTEND_APP_URL=http://localhost:3000

# ============================================
# MercadoPago
# ============================================
# Chave pública (usada no frontend para tokenização de cartões)
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=TEST-f44e5241-2552-4c54-b72c-8fd1a9f7c1e2
# Access Token (usado apenas no backend)
MERCADOPAGO_ACCESS_TOKEN=TEST-2372715816013223-020617-fba94bad1dfecd86b5f3ce5ab0078ab3-231750138
# Webhook URL (produção apenas - localhost não é aceito pelo MP)
# MERCADOPAGO_WEBHOOK_URL=https://api.seusite.com/payments/webhook/mercadopago

# ============================================
# Configuração de Email
# ============================================
# Provider: 'resend' ou 'smtp' (padrão: smtp)
EMAIL_PROVIDER=resend

# Resend Configuration
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM=noreply@linkepag.com

# SMTP Configuration (fallback)
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=3ce6c8ba5ade24
SMTP_PASS=f682b55e1e85c2
SMTP_FROM=noreply@linkepag.com

# Email de contato
CONTACT_EMAIL=suporte@linkepag.com

# ============================================
# LinkePag PIX (for subscription payments)
# ============================================
LINKEPAG_PIX_KEY=pix@linkepag.com
LINKEPAG_PIX_KEY_TYPE=EMAIL
LINKEPAG_PIX_NAME=LinkePag Tecnologia
LINKEPAG_PIX_CITY=Sao Paulo
```

---

## Sistema de Cache (Frontend)

O frontend implementa um sistema de cache otimizado para reduzir requisições ao backend:

### Arquitetura

| Componente | Arquivo | Propósito |
|------------|---------|-----------|
| Cache Store | `lib/api-cache.ts` | Singleton de cache em memória |
| Data Hooks | `hooks/useApi.ts` | Hooks `useApi`, `useApiParallel`, `useApiMutation` |
| API Client | `lib/api.ts` | Integração cache + API com TTLs |

### TTLs Padrão

| Recurso | TTL | Cache Key |
|---------|-----|-----------|
| Profile | 60s | `profile` |
| Links | 30s | `links` |
| Public Profile | 120s | `public-profile:{username}` |
| Payments | 0s | (sem cache) |

### Hooks Disponíveis

```typescript
// Fetch simples com cache
const { data, isLoading, error, refetch } = useApi(
  CACHE_KEYS.PROFILE,
  getProfile,
  { enabled: isAuthenticated }
);

// Fetch paralelo múltiplos
const { data, isLoading } = useApiParallel({
  links: { key: CACHE_KEYS.LINKS, fetchFn: getLinks },
  profile: { key: CACHE_KEYS.PROFILE, fetchFn: getProfile },
});

// Mutations com invalidação automática
const { mutate, isLoading } = useApiMutation(createLink);
mutate(data, { 
  onSuccess: () => refetchLinks(),
  invalidateKeys: [CACHE_KEYS.LINKS]
});
```

### Features

- ✅ **AbortController**: Cancela requisições pendentes ao desmontar
- ✅ **Deduplicação**: Mesma chave de cache = mesma promise
- ✅ **Stale-while-revalidate**: Retorna cache imediatamente, atualiza em background
- ✅ **Invalidação automática**: Mutations limpam cache afetado
- ✅ **Prevenção de memory leaks**: Flags de mount/unmount

---

## Comandos de Build e Execução

### Docker (Recomendado)

```bash
# Iniciar todos os serviços
docker-compose up -d

# Rebuild após mudanças
docker-compose up -d --build

# Ver logs
docker-compose logs -f
```

### Backend (Local)

```bash
cd backend
npm install

# Desenvolvimento (hot reload)
npm run start:dev

# Produção
npm run build
npm run start:prod
```

### Frontend (Local)

```bash
cd frontend
npm install

# Desenvolvimento
npm run dev

# Build de produção
npm run build
npm start
```

### URLs de Acesso

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- MongoDB: localhost:27017

---

## Comandos de Teste

### Backend

```bash
cd backend

# Testes unitários
npm test

# Testes em watch mode
npm run test:watch

# Cobertura
npm run test:cov

# Testes E2E
npm run test:e2e

# Todos os testes (unit + E2E)
npm run test:all
```

### Frontend

```bash
cd frontend

# Testes E2E com Playwright
npm run test:e2e

# Modo UI (debug)
npx playwright test --ui
```

---

## Convenções de Código

### Backend (NestJS)

- **Estilo**: TypeScript com decorators do NestJS
- **Formatação**: Prettier com single quotes e trailing commas
- **Linting**: ESLint com typescript-eslint
- **Módulos**: Cada funcionalidade é um módulo NestJS separado
- **Schemas**: Mongoose com decorators `@Prop()`
- **DTOs**: Classes com validação usando `class-validator`

Exemplo de estrutura de módulo:
```typescript
// Módulo: users/
// - users.module.ts      (definição do módulo)
// - users.controller.ts  (rotas HTTP)
// - users.service.ts     (lógica de negócio)
// - schemas/user.schema.ts (definição MongoDB)
// - dto/*.dto.ts         (Data Transfer Objects)
```

### Frontend (Next.js)

- **Estilo**: TypeScript strict, React functional components
- **Styling**: Tailwind CSS v4
- **App Router**: Usando estrutura `app/` do Next.js 16
- **Fontes**: Geist (Vercel) via next/font
- **API Client**: Fetch API com funções utilitárias em `lib/api.ts`
- **Estado**: React hooks (useState, useEffect) + localStorage para auth

---

## Estratégia de Testes

### Backend

| Tipo | Framework | Configuração |
|------|-----------|--------------|
| Unitário | Jest | Configurado em `package.json` |
| E2E | Jest + Supertest | `test/jest-e2e.json` |
| Banco de Teste | MongoMemoryServer | Setup em `test/global-setup.ts` |

Características dos testes:
- Usa `mongodb-memory-server` para banco isolado
- Setup global cria conexão MongoDB única
- Teardown limpa dados após testes
- Testes de throttle incluem verificação de rate limiting

### Frontend

| Tipo | Framework | Configuração |
|------|-----------|--------------|
| E2E | Playwright | `playwright.config.ts` |
| Mocks | MSW | `src/mocks/handlers.ts` |

Características dos testes:
- MSW (Mock Service Worker) mocka API em testes
- Global setup inicia MSW server antes dos testes
- Tests rodam em Chromium (Desktop Chrome)
- Screenshots e traces em falhas

---

## Arquitetura de Segurança

### Autenticação

- JWT (JSON Web Tokens) com Passport
- Tokens expiram em 7 dias
- Senhas hasheadas com bcrypt
- Guardas em rotas protegidas (`JwtAuthGuard`)

### Rate Limiting (Throttling)

Configurado em `app.module.ts` - limites generosos para evitar bloqueios em uso normal:

**Produção:**
- **short**: 200 requests/segundo (bursts)
- **login**: 30 tentativas/minuto (proteção brute-force)
- **long**: 500 requests/minuto (geral)

**Desenvolvimento (desativado/altos):**
- **short**: 2000 requests/segundo
- **login**: 1000 tentativas/minuto
- **long**: 2000 requests/minuto

### CORS

Configurado em `main.ts`:
```typescript
app.enableCors({
  origin: process.env.FRONTEND_APP_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
});
```

---

## Modelos de Dados Principais

### User

```typescript
{
  fullName: string;
  email: string;          // único, indexado
  cpf?: string;           // único (application-level)
  phone?: string;
  password: string;       // hasheada
  username: string;       // único, indexado
  status: 'active' | 'blocked';
  displayName?: string;
  bio?: string;
  profilePhoto?: string;
  location?: string;
  socialLinks: {
    instagram?: string;
    tiktok?: string;
    youtube?: string;
    twitter?: string;
    linkedin?: string;
    github?: string;
    website?: string;
  };
  links: ObjectId[];      // referência para Links
  // Security
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  // MercadoPago credentials
  mercadoPagoPublicKey?: string;
  mercadoPagoAccessToken?: string;
  // PIX credentials
  pixKey?: string;
  pixKeyType?: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM';
  pixQRCodeImage?: string;
  // Plan fields
  planId: number;         // 1=Starter, 2=Creator, 3=Pro, 4=Ilimitado
  planStatus: 'active' | 'expired' | 'cancelled' | 'pending_payment';
  planExpiryDate?: Date;
  planStartedAt?: Date;
  planRenewsAt?: Date;
  paidLinksCount: number;
  // Appearance settings
  appearanceSettings?: {
    headerGradient?: string;
    backgroundColor?: string;
    paidLinkAccent?: string;
  };
}
```

### Link

```typescript
{
  userId: ObjectId;       // referência ao usuário
  title: string;
  description?: string;
  url: string;
  icon?: string;
  order: number;          // para ordenação
  isActive: boolean;
  openInNewTab: boolean;
  type: 'free' | 'paid';
  isPaid: boolean;
  price: number;
  paymentTimeoutMinutes: number; // padrão: 30
}
```

**Nota:** A configuração de chave PIX foi movida para o modelo `User`. Todos os links de um usuário usam a mesma chave PIX configurada no perfil.

### Payment

```typescript
{
  userId: ObjectId;
  linkId: ObjectId;
  paymentId: string;           // identificador único
  amount: number;
  status: 'pending' | 'awaiting_confirmation' | 'confirmed' | 'expired' | 'failed';
  paymentMethodType?: 'pix_direct' | 'mercado_pago';
  gateway?: 'internal' | 'mercadopago' | 'asaas' | 'pagar_me';
  receiptUrl?: string;         // URL do comprovante enviado
  receiptUploadedAt?: Date;
  sellerNotified: boolean;
  pixCode?: string;
  qrCodeUrl?: string;
  pixKey?: string;
  pixKeyType?: string;
  payerEmail?: string;
  payerPhone?: string;
  payerName?: string;
  confirmedAt?: Date;
  confirmedByUserId?: ObjectId;
  confirmationNotes?: string;
  expiresAt?: Date;
  accessToken?: string;
  accessTokenExpiresAt?: Date;
  accessTokenUsageCount: number;
  lastAccessedAt?: Date;
  idempotencyKey?: string;     // Previne pagamentos duplicados
  confirmationEmailSent: boolean;
  processedAt?: Date;
  webhookRequestId?: string;
  webhookProcessedAt?: Date;
  linkAccessed: boolean;
  timeoutMinutes: number;
  gatewayId?: string;
}
```

### Subscription

```typescript
{
  userId: ObjectId;
  planId: number;              // 1=Starter, 2=Creator, 3=Pro, 4=Ilimitado
  status: 'active' | 'cancelled' | 'expired' | 'pending_payment';
  amount: number;
  currency: string;            // padrão: 'BRL'
  paymentMethod?: 'pix' | 'credit_card';
  mercadoPagoPaymentId?: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  startedAt: Date;
  endedAt?: Date;
  cancelledAt?: Date;
  paymentHistory: Array<{
    amount: number;
    status: string;
    paidAt?: Date;
    mercadoPagoPaymentId?: string;
  }>;
}
```

**Status de Pagamento:**
| Status | Descrição | Quando ocorre |
|--------|-----------|---------------|
| `pending` | Aguardando pagamento | MercadoPago - QR Code gerado, aguardando |
| `awaiting_confirmation` | Aguardando confirmação manual | PIX Direto - pagamento feito, vendedor precisa confirmar |
| `confirmed` | Pagamento confirmado | Automático (MP) ou manual (PIX Direto) |
| `expired` | Pagamento expirado | Timeout excedido (apenas MP) |
| `failed` | Falha no processamento | Erro técnico |

---

## Endpoints da API

### Autenticação

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| POST | `/auth/register` | Registrar novo usuário | - |
| POST | `/auth/login` | Login e obter JWT | - |
| POST | `/auth/forgot-password` | Solicitar redefinição de senha | - |
| POST | `/auth/reset-password` | Redefinir senha com token | - |

### Usuários

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| GET | `/users/profile` | Perfil do usuário logado | JWT |
| GET | `/users/profile/:username` | Perfil público | - |
| PATCH | `/users/profile` | Atualizar perfil | JWT |
| PATCH | `/users/username` | Atualizar username | JWT |
| GET | `/users/mercadopago/credentials` | Obter credenciais MP | JWT |
| PATCH | `/users/mercadopago/credentials` | Atualizar credenciais MP | JWT |

### Links

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| POST | `/links` | Criar link | JWT |
| GET | `/links` | Listar links do usuário | JWT |
| PATCH | `/links/:id` | Atualizar link | JWT |
| DELETE | `/links/:id` | Deletar link | JWT |
| PATCH | `/links/:id/toggle` | Toggle ativo/inativo | JWT |
| POST | `/links/reorder` | Reordenar links | JWT |

### Pagamentos

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| POST | `/payments/create-pix-direct/:linkId` | Criar pagamento PIX Direto (chave do usuário) | - |
| POST | `/payments/create/:linkId` | Criar pagamento via MercadoPago | - |
| GET | `/payments/status/:paymentId` | Verificar status | - |
| PATCH | `/payments/:paymentId/confirm` | Confirmar pagamento manual (PIX Direto) | JWT |
| POST | `/payments/:paymentId/receipt` | Enviar comprovante de pagamento | - |
| GET | `/payments/pending` | Listar pagamentos pendentes (PIX Direto) | JWT |
| POST | `/payments/simulate/:paymentId` | Simular pagamento (test) | JWT |
| GET | `/payments/validate-access/:linkId?token=` | Validar acesso | - |
| GET | `/payments/my-payments` | Pagamentos do usuário | JWT |
| GET | `/payments/link/:linkId` | Pagamentos de um link | JWT |
| GET | `/payments/report` | Relatório de vendas | JWT |
| POST | `/payments/webhook` | Webhook genérico | - |
| POST | `/payments/webhook/mercadopago` | Webhook MercadoPago | - |

### Leads

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| POST | `/leads` | Criar/atualizar lead (valida propriedade do link) | - |
| GET | `/leads` | Listar leads do usuário | JWT |
| GET | `/leads/stats` | Estatísticas de leads | JWT |
| GET | `/leads/export` | Exportar leads para CSV | JWT |
| GET | `/leads/link/:linkId` | Leads de um link específico | JWT |
| PATCH | `/leads/:id` | Atualizar metadados (name, phone) | JWT |
| DELETE | `/leads/:id` | Remover lead | JWT |

### Subscriptions (Planos)

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| GET | `/subscriptions/plans` | Listar planos disponíveis | - |
| GET | `/subscriptions/current` | Minha assinatura atual | JWT |
| POST | `/subscriptions` | Criar nova assinatura | JWT |
| PATCH | `/subscriptions/cancel` | Cancelar assinatura | JWT |
| POST | `/subscriptions/renew` | Renovar assinatura | JWT |
| GET | `/subscriptions/history` | Histórico de assinaturas | JWT |
| POST | `/subscriptions/webhook` | Webhook MercadoPago | - |

### Contact

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| POST | `/contact` | Enviar formulário de contato | - |

---

## Sistema de Pagamentos

### Visão Geral

O LinkePag oferece **duas modalidades de recebimento** para máxima flexibilidade:

| Método | Taxa do Gateway | Taxa LinkePag | Quando Usar |
|--------|----------------|---------------|-------------|
| **PIX Direto** | R$ 0 | Varia por plano* | Usuários que já têm chave PIX (CPF/CNPJ) |
| **MercadoPago** | 1,99% + R$ 0,99 | Varia por plano* | Usuários que querem automação completa |

*Taxa varia conforme o plano do usuário: Starter (R$ 0,70), Creator (R$ 0,50), Pro (R$ 0,35), Ilimitado (R$ 0,20).

### 1. PIX Direto (Chave do Usuário)

Neste modelo, o dinheiro vai direto para a conta do usuário, sem intermediários:

- Usuário cadastra sua **chave PIX** (CPF, CNPJ, email, celular ou aleatória)
- Sistema gera QR Code dinâmico com a chave do usuário
- Comprador escaneia e paga diretamente
- Valor cai na conta do usuário instantaneamente
- LinkePag cobra a taxa do plano do usuário após confirmação (R$ 0,70 a R$ 0,20)

**Vantagens:**
- Zero taxa de gateway de pagamento
- Dinheiro na conta do usuário em segundos
- Sem necessidade de conta MercadoPago
- Ideal para creators que já têm conta bancária com PIX

**Configuração:**
1. Usuário acessa `/admin/payments`
2. Seleciona "Usar minha chave PIX"
3. Informa tipo (CPF/CNPJ/email/celular/aleatória) e a chave
4. Sistema valida e gera QR code para teste

### 2. MercadoPago Integrado

Para usuários que preferem automação completa e relatórios detalhados:

- Usuário configura credenciais do MercadoPago
- Sistema cria cobrança via API do MP
- Webhook confirma pagamento automaticamente
- Valor (menos taxas) é transferido para conta MP do usuário

**Configuração:**
1. Usuário acessa `/admin/payments`
2. Insere Public Key e Access Token do MercadoPago
3. Sistema valida e armazena as credenciais
4. Pagamentos futuros usam a conta do usuário

---

## Modelo de Planos e Precificação

O LinkePag opera com um modelo **freemium baseado em taxas decrescentes por plano**. Todos os planos cobram uma taxa por transação bem-sucedida, com valores menores para planos superiores.

### Estrutura de Planos

| Plano | Nome | Mensalidade | Taxa/Transação | Público-Alvo | Break-even* |
|-------|------|-------------|----------------|--------------|-------------|
| **1** | **Starter** | R$ 0 | **R$ 0,70** | Iniciantes, testando a plataforma | — |
| **2** | **Creator** | R$ 19,90 | **R$ 0,50** | Creators com audiência estabelecida | 100 vendas |
| **3** | **Pro** | R$ 49,90 | **R$ 0,35** | Profissionais, renda significativa | 250 vendas |
| **4** | **Ilimitado** | R$ 99,90 | **R$ 0,20** | Negócios estruturados, alto volume | 400 vendas |

\* Break-even calculado em comparação ao plano Starter (economia na taxa compensa a mensalidade).

### Lógica das Taxas

```
Economia por upgrade:
- Starter → Creator: economiza R$ 0,20 por venda
- Creator → Pro: economiza R$ 0,20 por venda  
- Pro → Ilimitado: economiza R$ 0,10 por venda
```

**Exemplo prático:**
- Usuário no plano Starter faz 100 vendas de R$ 30 → paga R$ 70,00 em taxas
- No plano Creator: paga R$ 19,90 + R$ 50,00 = R$ 69,90 (já compensa)
- No plano Pro: paga R$ 49,90 + R$ 30,00 = R$ 79,90 (precisa de mais volume)

### Por que não há taxa zero?

O modelo foi projetado para garantir receita em **todas** as transações:
- **Sustentabilidade**: Mesmo o plano Ilimitado gera receita por transação (R$ 0,20)
- **Alinhamento de interesses**: Plataforma ganha quando o usuário vende
- **Previsibilidade**: Taxa fixa é mais transparente para o usuário do que porcentagem variável
- **Escalabilidade**: Receita cresce com o GMV (Gross Merchandise Value) dos usuários

### Features por Plano

| Feature | Starter | Creator | Pro | Ilimitado |
|---------|---------|---------|-----|-----------|
| Links monetizados | 3 | 10 | Ilimitado | Ilimitado |
| Links gratuitos | Ilimitado | Ilimitado | Ilimitado | Ilimitado |
| Relatório de vendas | Básico | Completo | Avançado | Avançado + API |
| Exportação de leads | — | CSV | CSV + Excel | Todos formatos |
| Suporte | Email (48h) | Email (24h) | Chat (12h) | Prioritário (4h) |
| Personalização de checkout | Básica | Avançada | Total | White-label |
| Domínio próprio | — | — | 1 domínio | Múltiplos |
| Webhooks | — | — | ✅ | ✅ |
| Múltiplos usuários | — | — | — | Até 5 |

### Estratégia de Upgrade

O sistema incentiva upgrades através de **nudges** no dashboard:

1. **Contador de economia**: Mostra quanto o usuário economizaria no plano superior
2. **Soft paywall**: Avisos educativos ao atingir limites (ex: "Faltam 2 links para o limite")
3. **Momento de sucesso**: Notificação celebratória após vendas com CTA para upgrade

**Exemplo de mensagem:**
> "🎉 Você já faturou R$ 500 este mês!  
> Com o plano Creator, você teria economizado R$ 14,30 em taxas.  
> [Ver planos]"

### Webhook (Produção)

O MercadoPago **não aceita URLs localhost** na `notification_url`. O sistema detecta automaticamente:

**Desenvolvimento (localhost):**
- Webhook é automaticamente omitido
- Status do pagamento é verificado via polling no frontend
- Funciona normalmente para testes

**Produção:**
- Configure `BACKEND_API_URL` com HTTPS (ex: `https://api.seusite.com`)
- Ou defina `MERCADOPAGO_WEBHOOK_URL` explicitamente
- O webhook recebe notificações instantâneas de pagamento confirmado

```env
# Produção - Webhook ativo
BACKEND_API_URL=https://api.seusite.com
NODE_ENV=production

# Ou URL customizada (opcional)
MERCADOPAGO_WEBHOOK_URL=https://api.seusite.com/payments/webhook/mercadopago
```

### Fluxo de Pagamento por Tipo

#### 1. MercadoPago (Automático)

```
Cliente clica em link pago
    ↓
Sistema verifica credenciais MP do vendedor
    ↓
Cria pagamento via API MercadoPago
    ↓
Retorna QR Code + código copia-cola
    ↓
Webhook confirma pagamento
    ↓
Acesso liberado automaticamente (token enviado por email)
```

**Vantagens do MercadoPago:**
- **100% automático**: Sem intervenção manual do vendedor
- **Entrega automática**: O comprador recebe o link de acesso automaticamente após a confirmação do pagamento
- **Sem necessidade de confirmação**: O sistema libera o acesso instantaneamente via webhook
- **Experiência superior**: O comprador não precisa aguardar aprovação manual

#### 2. PIX Direto (Requer Confirmação Manual)

O checkout PIX Direto acontece **inline na página pública do perfil** (`/profile/[username]`), através do componente `PixCheckout`:

```
Visitante acessa página pública do vendedor (/profile/[username])
    ↓
Clica em link pago → PixCheckout expande inline na própria página
    ↓
Informa email (obrigatório para receber acesso depois)
    ↓
Clica em "Gerar PIX" → POST /payments/create-pix-direct/:linkId
    ↓
Sistema retorna QR Code + código PIX copia-cola
    ↓
Visitante copia código ou escaneia QR Code
    ↓
Faz pagamento no app do banco
    ↓
[OPCIONAL] Faz upload do comprovante no próprio checkout inline
    ↓
[AGUARDANDO CONFIRMAÇÃO MANUAL]
    ↓
Vendedor confirma recebimento no dashboard (/admin/payments/pending)
    ↓
Sistema envia email ao comprador com link de acesso
```

**Localização do checkout:** O checkout PIX Direto é renderizado **inline** na página pública do perfil (`/profile/[username]`), através do componente `PixCheckout.tsx`. Não há redirecionamento para página externa.

**Arquivos do checkout:**
| Arquivo | Descrição |
|---------|-----------|
| `frontend/src/components/PixCheckout.tsx` | Componente de checkout (usado tanto para MP quanto PIX Direto) |
| `frontend/src/app/profile/[username]/page.tsx` | Página pública onde o checkout é renderizado inline |

**Processo de Confirmação Manual:**

Como o dinheiro vai direto para a conta do vendedor, o sistema não recebe webhook automático. O fluxo de liberação é:

1. **Vendedor recebe notificação** do banco (push/email)
2. **Vendedor acessa dashboard** → Aba "Vendas Pendentes"
3. **Vendedor visualiza:**
   - Dados do comprador (email capturado no checkout)
   - Valor pago
   - Comprovante (se enviado pelo comprador)
4. **Vendedor clica** "Confirmar Pagamento e Liberar Acesso"
5. **Sistema:**
   - Gera `accessToken` único
   - Atualiza status do pagamento para `confirmed`
   - Envia email ao comprador com link de acesso

**Melhorias de UX para PIX Direto:**

| Feature | Descrição | Status |
|---------|-----------|--------|
| Upload de comprovante | Comprador pode enviar screenshot do pagamento | Opcional |
| Notificação push | Vendedor recebe alerta imediato no dashboard | Implementar |
| Reenvio de acesso | Vendedor pode reenviar email de acesso | Disponível |
| Token temporário | Link de acesso expira em 30 dias | Padrão |

**Considerações Importantes:**

- **Delay:** Pode haver delay entre pagamento e liberação (depende do vendedor)
- **Comunicação:** Instruir comprador: "Após pagar, seu acesso será liberado em até X minutos"
- **Fallback:** Sempre oferecer MercadoPago quando configurado (experiência superior)
- **Reputação:** Monitore tempo de resposta dos vendedores - afeta conversão

### Arquivos Relacionados

| Arquivo | Descrição |
|---------|-----------|
| `payments/mercadopago.service.ts` | Serviço de integração com API |
| `payments/payments.service.ts` | Lógica de criação/verificação |
| `payments/payments.controller.ts` | Endpoints de pagamentos |
| `payments/schemas/payment.schema.ts` | Schema com tipos de pagamento e gateway |
| `users/schemas/user.schema.ts` | Campos de credenciais MP |
| `frontend/src/components/PixCheckout.tsx` | Componente de checkout inline (MP e PIX Direto) |
| `frontend/src/app/profile/[username]/page.tsx` | Página pública com checkout inline |
| `frontend/src/app/admin/payments/page.tsx` | Configuração de credenciais |
| `frontend/src/app/admin/payments/pending/page.tsx` | Vendas pendentes (confirmação manual PIX Direto) |
| `frontend/src/app/admin/payments/report/page.tsx` | Relatório de vendas |

---

## Sistema de Notificações por Email

### Templates Disponíveis

| Template | Quando é enviado | Destinatário |
|----------|------------------|--------------|
| `sendPaymentConfirmation()` | Pagamento confirmado | Comprador |
| `sendPendingPaymentNotification()` | Nova venda PIX Direto criada | Vendedor |
| `sendReceiptUploadedNotification()` | Comprador envia comprovante | Vendedor |
| `sendPasswordResetEmail()` | Solicitação de reset de senha | Usuário |
| `sendPlanExpiryWarning()` | 3 dias antes da expiração do plano | Assinante |
| `sendPlanExpired()` | No dia da expiração do plano | Assinante |
| `sendPlanStillExpired()` | 7 dias após expiração | Assinante |
| `sendPaymentFailed()` | Falha na cobrança da assinatura | Assinante |
| `sendSubscriptionConfirmed()` | Assinatura ativada | Assinante |
| `sendPaymentExpired()` | PIX de assinatura expirado | Assinante |
| `sendContactFormEmail()` | Formulário de contato enviado | Equipe de suporte |

### Fluxo PIX Direto - Notificações

```
Comprador cria pagamento PIX Direto
    ↓
Sistema envia email ao vendedor: "Nova venda pendente"
    ↓
[OPCIONAL] Comprador envia comprovante
    ↓
Sistema envia email ao vendedor: "Comprovante recebido"
    ↓
Vendedor confirma pagamento no dashboard
    ↓
Sistema envia email ao comprador: "Pagamento confirmado - Acesso liberado"
```

### Configuração de Email

Variáveis de ambiente necessárias:
```env
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-usuario
SMTP_PASS=sua-senha
SMTP_FROM=noreply@linkepag.com
```

---

## Sistema de Reset de Senha

### Fluxo

1. Usuário acessa `/forgot-password` e informa o email
2. Backend gera token único (SHA256) com validade de 1 hora
3. Email é enviado com link de redefinição contendo o token
4. Usuário clica no link e acessa `/reset-password?token=xxx`
5. Backend valida o token e atualiza a senha
6. Token é invalidado após uso

### Segurança

- Tokens são armazenados como hash SHA256 no banco
- Tokens expiram automaticamente após 1 hora
- Mesma mensagem de retorno para email existente ou não (prevenção de enumeração)
- Senha deve ter: mínimo 6 caracteres, 1 maiúscula, 1 minúscula, 1 número

### Frontend

| Rota | Descrição |
|------|-----------|
| `/forgot-password` | Página para solicitar redefinição |
| `/reset-password?token=xxx` | Página para definir nova senha |

### Backend

| Arquivo | Descrição |
|---------|-----------|
| `auth/dto/forgot-password.dto.ts` | Validação do email |
| `auth/dto/reset-password.dto.ts` | Validação do token e senha |
| `email/email.service.ts` | Template de email de reset |
| `users/schemas/user.schema.ts` | Campos `resetPasswordToken` e `resetPasswordExpires` |

---

## Sistema de Leads

### Visão Geral

O sistema de leads captura informações de contato (email, nome, telefone) de compradores durante o checkout de links monetizados. Cada lead é associado ao usuário (vendedor) e ao link específico.

### Segurança e Comportamento Determinístico

O sistema foi projetado para ser **determinístico e seguro**:

#### Prevenção de Duplicados
- **Chave única**: Combinação de `userId` + `email`
- **Comportamento**: Se um lead com o mesmo email já existir para aquele vendedor, o sistema atualiza o lead existente em vez de criar um novo
- **Benefício**: Um comprador que comprar múltiplas vezes do mesmo vendedor terá apenas um registro

#### Validação de Propriedade (Segurança)
- O endpoint `POST /leads` é público, mas **valida que o linkId pertence ao userId informado**
- Isso impede que atacantes criem leads falsos para outros vendedores
- A validação é feita consultando o Link no banco antes de criar o lead

#### Comportamento Determinístico da Atualização
Quando um lead existente é atualizado (mesmo email + usuário):

| Campo | Comportamento | Motivo |
|-------|---------------|--------|
| `name` | ✅ Atualizado | Metadado mutável |
| `phone` | ✅ Atualizado | Metadado mutável |
| `paymentId` | ✅ Atualizado | Registra última compra |
| `linkId` | ❌ **Preservado** | Mantém origem da **primeira** captação |
| `userId` | ❌ **Preservado** | Nunca muda |
| `source` | ❌ **Preservado** | Mantém origem original |
| `email` | ❌ **Preservado** | Chave identificadora |

**Exemplo**: Se um cliente compra primeiro no "Link A" e depois no "Link B", o lead mantém `linkId = Link A` (origem), mas atualiza `paymentId` para a compra mais recente.

### Fluxo de Captura

1. Cliente acessa link monetizado na página pública
2. Sistema exibe checkout inline (PixCheckout)
3. Cliente informa nome e email para receber confirmação
4. Ao criar pagamento, sistema chama `LeadsService.createFromCheckout()`
5. Lead é criado (se novo) ou atualizado (se existente) seguindo regras determinísticas
6. Quando pagamento é confirmado, lead é marcado como `converted: true`

### Endpoints

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| POST | `/leads` | Criar/atualizar lead (valida propriedade do link) | - |
| GET | `/leads` | Listar leads do usuário | JWT |
| GET | `/leads/stats` | Estatísticas de leads | JWT |
| GET | `/leads/export` | Exportar CSV | JWT |
| GET | `/leads/link/:linkId` | Leads de um link | JWT |
| PATCH | `/leads/:id` | Atualizar metadados (name, phone) | JWT |
| DELETE | `/leads/:id` | Remover lead | JWT |

### Arquivos Relacionados

| Arquivo | Descrição |
|---------|-----------|
| `leads/leads.service.ts` | `createFromCheckout()` com lógica determinística |
| `leads/leads.controller.ts` | Endpoints com validação de propriedade |
| `leads/schemas/lead.schema.ts` | Schema MongoDB com índices |
| `payments/payments.service.ts` | Captura lead durante checkout |

### Modelo de Dados (Lead)

```typescript
{
  userId: ObjectId;       // Vendedor (referência ao User) - imutável
  linkId: ObjectId;       // Link de ORIGEM (referência ao Link) - imutável após criação
  paymentId?: ObjectId;   // Último pagamento associado - atualizado
  email: string;          // Email do comprador (obrigatório) - chave única com userId
  name?: string;          // Nome do comprador - atualizável
  phone?: string;         // Telefone - atualizável
  source?: string;        // Origem (ex: 'checkout') - imutável
  converted: boolean;     // Se converteu (pagamento confirmado)
  convertedAt?: Date;     // Data da conversão
  metadata?: Record;      // Dados extras
}
```

### Métodos do Service

#### `createFromCheckout(userId, linkId, data)`
**Uso**: Fluxo de checkout/pagamento  
**Acesso**: Público (via controller com validação de propriedade)  
**Comportamento**:
- Se lead existir (mesmo email + userId): atualiza `name`, `phone`, `paymentId`
- Se não existir: cria novo lead com todos os campos
- **Nunca altera** `linkId` de leads existentes

#### `updateMetadata(leadId, userId, data)`
**Uso**: Atualização manual pelo vendedor  
**Acesso**: Apenas usuário autenticado (próprio lead)  
**Campos permitidos**: `name`, `phone`  
**Comportamento**: Apenas atualiza se valores forem válidos (não vazios)

---

## Considerações de Desenvolvimento

### Adicionar Novo Módulo no Backend

1. Criar pasta em `src/nome-modulo/`
2. Criar arquivo `nome-modulo.module.ts` com `@Module()`
3. Registrar módulo em `app.module.ts` imports
4. Seguir convenção: controller, service, schema, dto

### Adicionar Nova Rota no Frontend

1. Criar pasta em `src/app/caminho/`
2. Criar `page.tsx` (obrigatório)
3. Criar `layout.tsx` se necessário layout específico
4. Atualizar navegação/links conforme necessário

### Testes E2E Backend

Sempre usar MongoMemoryServer (já configurado). Não executar testes contra banco de produção.

### Testes E2E Frontend

Usar MSW para mockar APIs. Configuração já existe em `playwright.global-setup.ts`.

---

## Docker

### Containers

| Container | Porta | Descrição |
|-----------|-------|-----------|
| mongo | 27017 | MongoDB 7 |
| backend | 3001 | API NestJS (dev mode) |
| frontend | 3000 | Next.js dev server |

### Volumes

- `mongo_data`: Persistência dos dados MongoDB
- Bind mounts: Código-fonte mapeado para hot reload

---

## Notas Importantes

1. **Idioma**: Todo o código e comentários estão em **português (pt-BR)**. Mensagens de erro também devem ser em português.

2. **Ambiente de Teste**: O projeto usa credenciais de teste do MercadoPago. Nunca commitar credenciais reais.

3. **Email**: O sistema suporta dois providers de email:
   - **Resend** (recomendado para produção): Configurar `EMAIL_PROVIDER=resend` e `RESEND_API_KEY`
   - **SMTP/Mailtrap** (fallback/development): Usado quando Resend não está configurado
   
4. **JWT Secret**: O segredo atual é para desenvolvimento. Em produção, gerar novo segredo seguro.

5. **Frontend URL**: O frontend usa variável de ambiente `BACKEND_API_URL` para comunicação com backend.

6. **Type Safety**: Ambos projetos usam TypeScript strict. Evitar usar `any`.

7. **MercadoPago Webhook**: Em desenvolvimento (localhost), o webhook é automaticamente desabilitado pois o MercadoPago não aceita URLs localhost. Em produção, configure `MERCADOPAGO_WEBHOOK_URL` ou deixe o sistema usar `BACKEND_API_URL` automaticamente.

8. **Throttling**: Em ambiente de desenvolvimento (`NODE_ENV=development`), o rate limiting é automaticamente desabilitado.

9. **Perfil Público**: A URL curta para perfis públicos é `/p/[username]` (ex: `/p/joaosilva`), não `/profile/[username]`.

---

## Comandos Úteis

```bash
# Limpar volumes Docker (cuidado: apaga dados)
docker-compose down -v

# Ver logs de um serviço específico
docker-compose logs -f backend
docker-compose logs -f frontend

# Acessar container
docker exec -it backend sh
docker exec -it mongo mongosh -u admin -p test123 --authenticationDatabase admin

# Instalar dependências após mudanças no package.json
docker-compose exec backend npm install
docker-compose exec frontend npm install
```

---

*Última atualização: 2026-02-25*

---

## Sistema de Planos de Assinatura

### Visão Geral

O LinkePag opera com um modelo **freemium baseado em taxas decrescentes por plano**. Todos os planos cobram uma taxa por transação bem-sucedida, com valores menores para planos superiores.

### Estrutura de Planos

| Plano | Nome | Mensalidade | Taxa/Transação | Links Monetizados |
|-------|------|-------------|----------------|-------------------|
| **1** | **Starter** | R$ 0 | **R$ 0,70** | 3 |
| **2** | **Creator** | R$ 19,90 | **R$ 0,50** | 10 |
| **3** | **Pro** | R$ 49,90 | **R$ 0,35** | Ilimitado |
| **4** | **Ilimitado** | R$ 99,90 | **R$ 0,20** | Ilimitado |

### Funcionalidades por Plano

| Feature | Starter | Creator | Pro | Ilimitado |
|---------|---------|---------|-----|-----------|
| Links monetizados | 3 | 10 | Ilimitado | Ilimitado |
| Links gratuitos | Ilimitado | Ilimitado | Ilimitado | Ilimitado |
| Relatório de vendas | Básico | Completo | Avançado | Avançado + API |
| Exportação de leads | — | CSV | CSV + Excel | Todos formatos |
| Suporte | Email (48h) | Email (24h) | Chat (12h) | Prioritário (4h) |
| Personalização de checkout | Básica | Avançada | Total | White-label |
| Domínio próprio | — | — | 1 domínio | Múltiplos |
| Webhooks | — | — | ✅ | ✅ |
| Múltiplos usuários | — | — | — | Até 5 |

### Arquitetura do Sistema

#### Backend - Módulo Subscriptions

**Arquivos:**
| Arquivo | Descrição |
|---------|-----------|
| `subscriptions/subscriptions.module.ts` | Módulo NestJS |
| `subscriptions/subscriptions.controller.ts` | Endpoints da API |
| `subscriptions/subscriptions.service.ts` | Lógica de negócio |
| `subscriptions/subscriptions.cron.ts` | Cron jobs de cobrança |
| `subscriptions/schemas/subscription.schema.ts` | Schema MongoDB |
| `subscriptions/dto/create-subscription.dto.ts` | DTOs de entrada |

**Endpoints:**
| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| GET | `/subscriptions/plans` | Listar planos disponíveis | - |
| GET | `/subscriptions/current` | Minha assinatura atual | JWT |
| POST | `/subscriptions` | Criar nova assinatura | JWT |
| PATCH | `/subscriptions/cancel` | Cancelar assinatura | JWT |
| POST | `/subscriptions/renew` | Renovar assinatura | JWT |
| GET | `/subscriptions/history` | Histórico de assinaturas | JWT |
| POST | `/subscriptions/webhook` | Webhook MercadoPago | - |

**Serviço (SubscriptionsService):**
- `createSubscription()` - Cria assinatura com pagamento
- `getSubscription()` / `getCurrentSubscription()` - Busca assinatura atual
- `createOrGetSubscription()` - Cria Starter se não existir
- `cancelSubscription()` - Cancela e volta para Starter
- `renewSubscription()` - Renova plano atual
- `handlePaymentWebhook()` - Processa webhooks do MP
- `checkExpiringSubscriptions()` - Notifica sobre expiração
- `handleExpiredSubscriptions()` - Processa expirações
- `canCreatePaidLink()` - Verifica limite de links
- `canReceivePayments()` - Verifica se pode receber pagamentos

#### Frontend - Hooks e Componentes

**Hook useSubscription:**
```typescript
const {
  plans,                    // Lista de planos
  subscription,             // Assinatura atual
  currentPlan,              // Plano atual
  canCreatePaidLink,        // Verifica se pode criar link pago
  isSubscriptionActive,     // Verifica se está ativo
  isExpiringSoon,          // Verifica se expira em 3 dias
  calculateUpgradeSavings,  // Calcula economia de upgrade
  createSubscription,       // Cria assinatura
  cancelSubscription,       // Cancela assinatura
} = useSubscription();
```

**Componentes:**
| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| `PlanNotification` | `components/PlanNotification.tsx` | Banner de notificação de plano |
| `PlanBadge` | `components/PlanNotification.tsx` | Badge do plano no header |
| `PlanUpgradeModal` | `components/PlanUpgradeModal.tsx` | Modal de upgrade |
| `PlanLimitWarning` | `components/PlanUpgradeModal.tsx` | Aviso de limite de links |

**Páginas:**
| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/admin/plans` | `app/admin/plans/page.tsx` | Gerenciamento de planos |

### Fluxo de Assinatura

1. **Novo usuário:** Recebe plano Starter automaticamente
2. **Upgrade:** Usuário seleciona plano → escolhe pagamento (PIX/cartão) → confirma
3. **Pagamento PIX:** Gera QR Code → aguarda confirmação → ativa plano
4. **Pagamento Cartão:** Processa via MercadoPago → ativa imediatamente
5. **Renovação:** Automática para cartão / Manual para PIX
6. **Expiração:** 3 emails de notificação → downgrade automático para Starter

### Bloqueio por Plano Expirado

Quando o plano expira:
- **Links existentes:** Continuam funcionando
- **Novos links pagos:** Bloqueados (mensagem: "Serviço temporariamente indisponível")
- **Recebimento de pagamentos:** Bloqueado para proteger compradores
- **Upgrade:** Necessário para reativar funcionalidades

### Cron Jobs

**Verificação de expiração (a cada hora):**
- Verifica planos expirando em 3 dias → Envia email de aviso
- Verifica planos expirados → Envia email e faz downgrade
- Verifica planos expirados há 7 dias → Email de reativação

### Notificações por Email

**Templates:**
- `sendPlanExpiryWarning()` - 3 dias antes da expiração
- `sendPlanExpired()` - No dia da expiração
- `sendPlanStillExpired()` - 7 dias após expiração
- `sendPaymentFailed()` - Falha na cobrança
- `sendSubscriptionConfirmed()` - Assinatura ativada

### Integração com Links

**Verificação ao criar link pago:**
```typescript
// Em links.service.ts
if (dto.isPaid) {
  const subscription = await this.subscriptionsService.getSubscription(userId);
  const currentPaidLinks = await this.countPaidLinks(userId);
  
  if (subscription.maxPaidLinks !== null && 
      currentPaidLinks >= subscription.maxPaidLinks) {
    throw new ForbiddenException('Limite de links atingido');
  }
}
```

### Variáveis de Ambiente

```env
# Chave PIX da LinkePag (para recebimento de assinaturas)
LINKEPAG_PIX_KEY=pix@linkepag.com
LINKEPAG_PIX_KEY_TYPE=EMAIL
LINKEPAG_PIX_NAME=LinkePag Tecnologia
LINKEPAG_PIX_CITY=Sao Paulo
```

---

### Changelog Recente

**2026-02-19 - Implementação Sistema de Planos Completo**
- Criado módulo completo de Subscriptions no backend
- Schema Subscription com status, datas, métodos de pagamento
- Serviço SubscriptionsService com todas as operações
- Controller com endpoints RESTful
- Cron jobs para verificação de expiração e cobrança
- Hook useSubscription no frontend
- Página /admin/plans para gerenciamento
- Componente PlanUpgradeModal para upgrade
- Componente PlanLimitWarning para avisos
- PlanNotification e PlanBadge para notificações
- Integração com links (verificação de limite)
- Bloqueio de vendas quando plano expirado
- Emails de notificação de plano
- Calculadora de economia na página de planos
- Criado módulo completo de Subscriptions no backend
- Adicionados campos de plano ao schema User
- Implementados cron jobs para verificação de expiração
- Criadas páginas de planos e checkout no frontend
- Adicionado componente de notificação de plano
- Integração com MercadoPago para pagamentos de planos
- Sistema de emails para notificações de plano
- Bloqueio de funcionalidades para planos expirados
- Limitação de links monetizados por plano

**2026-02-18 - Refatoração: PIX movido de Link para User**
- **Removido do schema Link:** campos `pixKey` e `pixKeyType`
- **Schema User:** já possui `pixKey`, `pixKeyType`, `pixQRCodeImage`
- **Backend atualizado:** `createPixDirectPayment()` agora busca chave PIX do User, não do Link
- **Frontend atualizado:** Página `/admin/links` removeu formulário de configuração de PIX
- **Motivação:** A chave PIX é uma configuração do vendedor (User), não do link individual

**2026-02-18 - Implementação PIX Direto com Confirmação Manual (Backend + Frontend)**

**Backend:**
- Criado método `createPixDirectPayment()` para pagamentos via chave PIX do usuário
- Adicionado status `awaiting_confirmation` para pagamentos PIX Direto pendentes
- Novos campos no schema Payment: `paymentMethodType`, `gateway`, `receiptUrl`, `sellerNotified`, `confirmedByUserId`
- Criado endpoint `POST /payments/create-pix-direct/:linkId` para criar pagamento PIX Direto
- Criado endpoint `GET /payments/pending` para listar pagamentos aguardando confirmação
- Criado endpoint `PATCH /payments/:paymentId/confirm` para confirmação manual pelo vendedor
- Criado endpoint `POST /payments/:paymentId/receipt` para upload de comprovante
- Implementado envio automático de email ao vendedor quando há nova venda pendente
- Implementado envio de email ao vendedor quando comprovante é enviado
- Templates de email: `sendPendingPaymentNotification()` e `sendReceiptUploadedNotification()`

**Frontend:**
- Componente `PixCheckout.tsx` atualizado para suportar PIX Direto
- Upload de comprovante aparece automaticamente após copiar código PIX
- Nova página `/admin/payments/pending` para confirmação manual com preview de comprovantes
- API methods: `createPixDirectPayment()`, `uploadReceipt()`, `getPendingPayments()`, `confirmPaymentManual()`
- Checkout PIX Direto renderizado inline na página pública do perfil
- Adicionado campo "Nome" no checkout (obrigatório, usado para personalizar mensagens)

**2026-02-18 - Fluxo de Pagamento PIX Direto**
- Documentada diferença entre PIX via MercadoPago (automático) vs PIX Direto (manual)
- Definido processo de confirmação manual para PIX Direto (vendedor confirma no dashboard)
- Adicionado fluxo completo de liberação de acesso via token após confirmação
- Especificadas features de UX: upload de comprovante, notificação push, reenvio de acesso
- Recomendação: sempre oferecer MercadoPago quando configurado (experiência superior)

**2026-02-18 - Modelo de Planos e Precificação**
- Definida estrutura de 4 planos: Starter, Creator, Pro e Ilimitado
- **Taxas decrescentes por plano**: Starter (R$ 0,70) → Creator (R$ 0,50) → Pro (R$ 0,35) → Ilimitado (R$ 0,20)
- **Nenhum plano com taxa zero**: Todos geram receita por transação para sustentabilidade do modelo
- **Mensalidades**: R$ 0 → R$ 19,90 → R$ 49,90 → R$ 99,90
- Estratégia de upgrade baseada em economia de taxas (break-even calculado para cada nível)
- Features escalonadas por plano: limites de links, relatórios, suporte, personalização
- Adicionada seção completa "Modelo de Planos e Precificação" na documentação

**2026-02-10 - Segurança do Sistema de Leads (Refatoração)**
- **Refatoração completa** do sistema de leads para comportamento determinístico e seguro
- Renomeado método `createOrUpdate` → `createFromCheckout` com documentação explícita
- **Validação de propriedade**: Endpoint `POST /leads` valida que linkId pertence ao userId informado (evita spoofing)
- **Comportamento determinístico**: Na atualização, apenas `name`, `phone`, `paymentId` são alterados; `linkId` é preservado (origem da primeira captação)
- **Novo método** `updateMetadata()` para atualização controlada apenas pelo dono do lead
- **Novo endpoint** `PATCH /leads/:id` para atualização manual de metadados (name, phone)
- Adicionada documentação completa sobre regras de mutabilidade de campos

**2026-02-10 - Correção Webhook MercadoPago**
- Corrigido erro `notificaction_url attribute must be url valid`
- Webhook é automaticamente desabilitado em desenvolvimento (localhost não é aceito pelo MP)
- Adicionada detecção automática de ambiente (localhost vs produção)
- Adicionada variável `MERCADOPAGO_WEBHOOK_URL` para configuração customizada em produção
- Webhook só é enviado quando URL é HTTPS válida e não-localhost

**2026-02-10 - Integração MercadoPago**
- Instalado SDK do MercadoPago no backend
- Adicionados campos `mercadoPagoPublicKey` e `mercadoPagoAccessToken` no User
- Criado serviço `MercadoPagoService` para integração com API
- Criados endpoints para gerenciar credenciais: `GET/PATCH /users/mercadopago/credentials`
- Criada página `/admin/payments` para configuração de credenciais
- Criada página `/admin/payments/report` para relatório de vendas
- Criado endpoint `GET /payments/report` para relatório completo
- Atualizado `createPayment` para usar API real quando usuário tem credenciais
- Adicionado aviso no checkout quando vendedor não configurou MercadoPago
- Cada usuário recebe pagamentos em sua própria conta do MercadoPago

**2026-02-10 - Sistema de Reset de Senha**
- Implementado fluxo completo de "Esqueci a senha"
- Adicionados endpoints: `POST /auth/forgot-password` e `POST /auth/reset-password`
- Criadas páginas frontend: `/forgot-password` e `/reset-password`
- Templates de email para redefinição de senha
- Tokens com hash SHA256 e expiração de 1 hora
- **Correção**: Adicionado `EmailModule` ao `AppModule` para carregamento correto do serviço de email

**2026-02-09 - Otimização de Requisições e Throttle**
- Aumentados limites do throttle (50→200 req/s, 100→500 req/min)
- Implementado sistema de cache no frontend com TTLs
- Criados hooks otimizados: `useApi`, `useApiParallel`, `useApiMutation`
- Adicionada deduplicação de requisições (mesma chave = mesma promise)
- AbortController integrado para cancelar requisições ao desmontar
- Cache automático para profile, links e perfil público
