# LinkePag Frontend

Frontend da plataforma LinkePag - Link-in-bio com monetização via PIX.

## 🚀 Deploy

Este projeto está configurado para deploy no [Vercel](https://vercel.com).

### Deploy Rápidoo

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/seu-usuario/linkepag-frontend)

### Variáveis de Ambiente Obrigatórias

Configure no Vercel Dashboard:

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `NEXT_PUBLIC_API_URL` | URL do backend | `https://api.linkepag.com` |
| `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` | Chave pública MP | `TEST-f44e...` |

## 🛠️ Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Rodar em modo desenvolvimento
npm run dev
```

Acesse: http://localhost:3000

## 📁 Estrutura

```
src/
├── app/              # Rotas Next.js App Router
│   ├── (auth)/       # Grupo de rotas de autenticação
│   ├── admin/        # Área administrativa
│   ├── p/[username]/ # Perfil público
│   └── ...
├── components/       # Componentes React
├── hooks/           # Custom hooks (useAuth, useApi)
├── lib/             # Utilitários e cliente API
└── mocks/           # MSW para testes
```

## 🔗 Links Importantes

- 🎨 **Frontend (este repo)**: https://github.com/seu-usuario/linkepag-frontend
- ⚙️ **Backend**: https://github.com/seu-usuario/linkepag-backend
- 📚 **Documentação completa**: [AGENTS.md](./AGENTS.md) (copiar do mono-repo)

## 🧪 Testes

```bash
# Testes E2E com Playwright
npm run test:e2e

# Modo UI para debug
npx playwright test --ui
```

## 📝 Notas

- **Framework**: Next.js 16 com App Router
- **Styling**: Tailwind CSS v4
- **Autenticação**: JWT via contexto React
- **API Client**: Fetch com cache customizado

---

Este projeto faz parte do LinkePag - Plataforma de link-in-bio com monetização.

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new).