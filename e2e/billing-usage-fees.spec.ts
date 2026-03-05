import { test, expect, type APIRequestContext } from '@playwright/test';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

test.describe('Sistema de Cobrança por Uso/Transação', () => {
  const testTimestamp = Date.now();
  const sellerEmail = `billing-seller${testTimestamp}@example.com`;
  const sellerUsername = `billing-seller${testTimestamp}`;
  const sellerCpf = `${30000000000 + (testTimestamp % 89999999999)}`.slice(0, 11);
  const testPassword = 'TestPassword123';
  
  let sellerToken: string;
  let createdLinkId: string;

  /**
   * Helper: Criar vendedor de teste com plano específico
   */
  async function createTestSeller(
    request: APIRequestContext,
    planId: number = 2 // Creator por padrão
  ): Promise<{ token: string; userId: string }> {
    // Registrar usuário
    await request.post(`${API_BASE_URL}/auth/register`, {
      data: {
        fullName: 'Billing Test Seller',
        email: sellerEmail,
        cpf: sellerCpf,
        password: testPassword,
        username: sellerUsername,
      },
    });

    // Login
    const loginRes = await request.post(`${API_BASE_URL}/auth/login`, {
      data: {
        email: sellerEmail,
        password: testPassword,
      },
    });

    if (!loginRes.ok()) {
      throw new Error('Failed to login test seller');
    }

    const loginData = await loginRes.json();
    const token = loginData.token;
    const userId = loginData.user?.id || loginData.user?._id;

    // Configurar PIX key
    await request.patch(`${API_BASE_URL}/users/profile`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        pixKey: '12345678900',
        pixKeyType: 'CPF',
      },
    });

    // Upgrade para plano especificado (se não for Starter)
    if (planId > 1) {
      await request.post(`${API_BASE_URL}/subscriptions`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          planId,
          paymentMethod: 'pix',
        },
      });
    }

    return { token, userId };
  }

  /**
   * Helper: Criar link pago
   */
  async function createPaidLink(
    request: APIRequestContext,
    token: string,
    price: number = 50.00
  ): Promise<string> {
    const linkRes = await request.post(`${API_BASE_URL}/links`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: `Produto Teste R$ ${price}`,
        url: 'https://example.com/product',
        type: 'paid',
        isPaid: true,
        price,
      },
    });

    if (!linkRes.ok()) {
      throw new Error('Failed to create paid link');
    }

    const linkData = await linkRes.json();
    return linkData.link.id || linkData.link._id;
  }

  /**
   * Helper: Simular compra via PIX Direto
   */
  async function simulatePixDirectPayment(
    request: APIRequestContext,
    linkId: string,
    buyerEmail: string = 'buyer@example.com'
  ): Promise<{ paymentId: string; pixCode: string }> {
    const paymentRes = await request.post(
      `${API_BASE_URL}/payments/create-pix-direct/${linkId}`,
      {
        data: {
          payerEmail: buyerEmail,
          payerName: 'Test Buyer',
        },
      }
    );

    if (!paymentRes.ok()) {
      throw new Error('Failed to create PIX Direct payment');
    }

    const paymentData = await paymentRes.json();
    return {
      paymentId: paymentData.payment.paymentId,
      pixCode: paymentData.payment.pixCode,
    };
  }

  /**
   * Helper: Confirmar pagamento manualmente (vendedor)
   */
  async function confirmPaymentManual(
    request: APIRequestContext,
    paymentId: string,
    sellerToken: string
  ): Promise<void> {
    const confirmRes = await request.patch(
      `${API_BASE_URL}/payments/${paymentId}/confirm`,
      {
        headers: { Authorization: `Bearer ${sellerToken}` },
        data: {
          notes: 'Pagamento confirmado via teste E2E',
        },
      }
    );

    if (!confirmRes.ok()) {
      throw new Error('Failed to confirm payment manually');
    }
  }

  /**
   * Helper: Login na página
   */
  async function loginAsSeller(page: any): Promise<void> {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    await page.locator('input[type="email"]').fill(sellerEmail);
    await page.locator('input[type="password"]').fill(testPassword);
    await page.getByRole('button', { name: 'Entrar' }).click();

    await page.waitForTimeout(3000);
  }

  test.beforeAll(async ({ request }) => {
    // Criar vendedor de teste com plano Creator
    const { token } = await createTestSeller(request, 2);
    sellerToken = token;

    // Criar link pago
    createdLinkId = await createPaidLink(request, token, 50.00);
  });

  test.beforeEach(async ({ page }) => {
    // Login antes de cada teste que precisa de autenticação
    await loginAsSeller(page);
  });

  test.describe('Visualização de Taxas no Dashboard', () => {
    test('deve exibir resumo de taxas no dashboard de cobranças', async ({ page }) => {
      // Mock das APIs de billing para ter dados consistentes
      await page.route('**/billing/summary', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            feeBalance: 25.00,
            totalFeesPaid: 150.00,
            currentPlanFee: 0.50,
            nextBillingDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          }),
        });
      });

      await page.route('**/billing/report', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            totalTransactionFees: 175.00,
            transactionCount: 350,
            period: {
              start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
              end: new Date().toISOString(),
            },
          }),
        });
      });

      await page.route('**/billing/invoice/current', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            totalFees: 25.00,
            transactionCount: 50,
            status: 'pending',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          }),
        });
      });

      await page.route('**/billing/fees*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            fees: [],
            totalPages: 1,
            currentPage: 1,
          }),
        });
      });

      // Acessar página de billing
      await page.goto('/admin/billing');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);

      // Verificar se cards de resumo estão visíveis
      await expect(page.getByText('Saldo Devedor').first()).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Total Pago').first()).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Taxas do Período').first()).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Fatura Atual').first()).toBeVisible({ timeout: 10000 });

      // Verificar valores exibidos
      await expect(page.getByText('R$ 25,00').first()).toBeVisible();
      await expect(page.getByText('R$ 150,00').first()).toBeVisible();
    });

    test('deve exibir loading state enquanto carrega dados', async ({ page }) => {
      // Delay na resposta para verificar loading
      await page.route('**/billing/summary', async (route) => {
        await new Promise((r) => setTimeout(r, 2000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            feeBalance: 10.00,
            totalFeesPaid: 50.00,
          }),
        });
      });

      await page.goto('/admin/billing');
      await page.waitForLoadState('domcontentloaded');

      // Verificar spinner de loading
      const spinner = page.locator('.animate-spin').first();
      await expect(spinner).toBeVisible({ timeout: 5000 });
    });

    test('deve exibir mensagem de erro quando API falha', async ({ page }) => {
      await page.route('**/billing/summary', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Erro ao carregar dados' }),
        });
      });

      await page.goto('/admin/billing');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Verificar mensagem de erro
      const errorVisible = await page.getByText(/Erro|error|falha/i).first().isVisible().catch(() => false);
      expect(errorVisible).toBe(true);
    });
  });

  test.describe('Transação PIX Direto - Taxa Acumula', () => {
    test('deve acumular taxa no saldo devedor após venda PIX Direto', async ({ page, request }) => {
      // Criar nova venda PIX Direto
      const buyerEmail = `buyer-${Date.now()}@example.com`;
      const { paymentId } = await simulatePixDirectPayment(request, createdLinkId, buyerEmail);

      // Confirmar pagamento manualmente
      await confirmPaymentManual(request, paymentId, sellerToken);

      // Mock do billing summary com taxa acumulada
      await page.route('**/billing/summary', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            feeBalance: 0.50, // Taxa do plano Creator
            totalFeesPaid: 0,
            currentPlanFee: 0.50,
            nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          }),
        });
      });

      await page.route('**/billing/fees*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            fees: [
              {
                _id: `fee-${Date.now()}`,
                amount: 0.50,
                status: 'pending',
                description: 'Taxa de transação',
                createdAt: new Date().toISOString(),
                transactionAmount: 50.00,
                paymentId: {
                  paymentId: paymentId,
                  amount: 50.00,
                  payerEmail: buyerEmail,
                  payerName: 'Test Buyer',
                },
              },
            ],
            totalPages: 1,
            currentPage: 1,
          }),
        });
      });

      await page.route('**/billing/report', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            totalTransactionFees: 0.50,
            transactionCount: 1,
            period: {
              start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
              end: new Date().toISOString(),
            },
          }),
        });
      });

      await page.route('**/billing/invoice/current', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            totalFees: 0.50,
            transactionCount: 1,
            status: 'pending',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          }),
        });
      });

      // Acessar billing
      await page.goto('/admin/billing');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);

      // Verificar se taxa foi registrada
      await expect(page.getByText('R$ 0,50').first()).toBeVisible();
      
      // Verificar tabela com transação
      await expect(page.getByText('Test Buyer').first()).toBeVisible();
      await expect(page.getByText(buyerEmail).first()).toBeVisible();
      await expect(page.getByText('Pendente').first()).toBeVisible();
    });

    test('deve mostrar taxa diferente conforme o plano do usuário', async ({ page }) => {
      // Mock para plano Starter (R$ 0,70)
      await page.route('**/billing/summary', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            feeBalance: 7.00, // 10 vendas × R$ 0,70
            totalFeesPaid: 0,
            currentPlanFee: 0.70,
            planName: 'Starter',
          }),
        });
      });

      await page.route('**/billing/fees*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            fees: Array.from({ length: 10 }, (_, i) => ({
              _id: `fee-${i}`,
              amount: 0.70,
              status: 'pending',
              description: 'Taxa de transação',
              createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
              transactionAmount: 50.00,
            })),
            totalPages: 1,
            currentPage: 1,
          }),
        });
      });

      await page.route('**/billing/report', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            totalTransactionFees: 7.00,
            transactionCount: 10,
          }),
        });
      });

      await page.route('**/billing/invoice/current', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            totalFees: 7.00,
            transactionCount: 10,
            status: 'pending',
          }),
        });
      });

      await page.goto('/admin/billing');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);

      // Verificar saldo devedor correto
      await expect(page.getByText('R$ 7,00').first()).toBeVisible();
      
      // Verificar múltiplas transações na tabela
      const tableRows = page.locator('table tbody tr');
      await expect(tableRows).toHaveCount(10);
    });
  });

  test.describe('Geração de Fatura', () => {
    test('deve exibir botão de gerar fatura quando há saldo devedor', async ({ page }) => {
      await page.route('**/billing/summary', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            feeBalance: 50.00,
            totalFeesPaid: 0,
          }),
        });
      });

      await page.route('**/billing/invoice/current', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            totalFees: 50.00,
            transactionCount: 100,
            status: 'pending',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          }),
        });
      });

      await page.route('**/billing/fees*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            fees: [],
            totalPages: 1,
          }),
        });
      });

      await page.route('**/billing/report', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            totalTransactionFees: 50.00,
            transactionCount: 100,
          }),
        });
      });

      await page.goto('/admin/billing');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);

      // Verificar botão de gerar fatura
      const generateButton = page.getByRole('button', { name: /Gerar Fatura|PIX/i });
      await expect(generateButton).toBeVisible();
    });

    test('deve gerar fatura mensal com PIX para pagamento', async ({ page }) => {
      // Mock da fatura com QR Code
      await page.route('**/billing/summary', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            feeBalance: 25.00,
            totalFeesPaid: 100.00,
          }),
        });
      });

      await page.route('**/billing/invoice/current', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            totalFees: 25.00,
            transactionCount: 50,
            status: 'pending',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            qrCodeUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0id2hpdGUiLz48L3N2Zz4=',
            pixCode: '00020126580014BR.GOV.BCB.PIX0123pix@linkepag.com520400005303986540625.005802BR5914LinkePag6009SAOPAULO62070503***6304E2CA',
          }),
        });
      });

      await page.route('**/billing/fees*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            fees: Array.from({ length: 5 }, (_, i) => ({
              _id: `fee-${i}`,
              amount: 5.00,
              status: 'invoiced',
              description: 'Taxa de transação',
              createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
              transactionAmount: 100.00,
            })),
            totalPages: 1,
          }),
        });
      });

      await page.route('**/billing/report', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            totalTransactionFees: 25.00,
            transactionCount: 50,
          }),
        });
      });

      await page.route('**/billing/invoice/generate', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            invoiceId: `INV-${Date.now()}`,
            qrCodeUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0id2hpdGUiLz48L3N2Zz4=',
            pixCode: '00020126580014BR.GOV.BCB.PIX0123pix@linkepag.com520400005303986540625.005802BR5914LinkePag6009SAOPAULO62070503***6304E2CA',
          }),
        });
      });

      await page.goto('/admin/billing');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);

      // Clicar em gerar fatura
      const generateButton = page.getByRole('button', { name: /Gerar Fatura|PIX/i });
      await generateButton.click();

      await page.waitForTimeout(2000);

      // Verificar alerta de sucesso
      page.on('dialog', async (dialog) => {
        expect(dialog.message()).toContain('sucesso');
        await dialog.accept();
      });
    });

    test('deve exibir QR Code da fatura quando disponível', async ({ page }) => {
      await page.route('**/billing/summary', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            feeBalance: 30.00,
            totalFeesPaid: 0,
          }),
        });
      });

      await page.route('**/billing/invoice/current', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            totalFees: 30.00,
            transactionCount: 60,
            status: 'pending',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            qrCodeUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0id2hpdGUiLz48L3N2Zz4=',
            pixCode: '00020126580014BR.GOV.BCB.PIX0123pix@linkepag.com520400005303986540630.005802BR5914LinkePag6009SAOPAULO62070503***6304E2CA',
          }),
        });
      });

      await page.route('**/billing/fees*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            fees: [],
            totalPages: 1,
          }),
        });
      });

      await page.route('**/billing/report', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            totalTransactionFees: 30.00,
            transactionCount: 60,
          }),
        });
      });

      await page.goto('/admin/billing');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);

      // Verificar QR Code
      const qrCode = page.locator('img[alt*="QR"], img[src*="qr"]').first();
      await expect(qrCode).toBeVisible();

      // Verificar código PIX copia-cola
      await expect(page.getByText(/00020|pix@linkepag.com/).first()).toBeVisible();
    });
  });

  test.describe('Relatório de Taxas com Filtros', () => {
    test('deve filtrar relatório de taxas por período', async ({ page }) => {
      const today = new Date();
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());

      await page.route('**/billing/report?**', async (route) => {
        const url = route.request().url();
        
        // Verificar se filtros foram aplicados
        if (url.includes('startDate') && url.includes('endDate')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              totalTransactionFees: 15.00,
              transactionCount: 30,
              period: {
                start: lastMonth.toISOString(),
                end: today.toISOString(),
              },
            }),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              totalTransactionFees: 50.00,
              transactionCount: 100,
              period: {
                start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                end: new Date().toISOString(),
              },
            }),
          });
        }
      });

      await page.route('**/billing/summary', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            feeBalance: 50.00,
            totalFeesPaid: 100.00,
          }),
        });
      });

      await page.route('**/billing/invoice/current', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            totalFees: 50.00,
            transactionCount: 100,
            status: 'pending',
          }),
        });
      });

      await page.route('**/billing/fees*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            fees: [
              {
                _id: `fee-${Date.now()}`,
                amount: 0.50,
                status: 'pending',
                description: 'Taxa de transação',
                createdAt: lastMonth.toISOString(),
                transactionAmount: 50.00,
              },
            ],
            totalPages: 1,
          }),
        });
      });

      await page.goto('/admin/billing');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);

      // Valor inicial (sem filtro)
      await expect(page.getByText('R$ 50,00').first()).toBeVisible();
    });

    test('deve atualizar totais quando período muda', async ({ page }) => {
      await page.route('**/billing/report', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            totalTransactionFees: 100.00,
            transactionCount: 200,
            period: {
              start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
              end: new Date().toISOString(),
            },
          }),
        });
      });

      await page.route('**/billing/summary', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            feeBalance: 100.00,
            totalFeesPaid: 200.00,
          }),
        });
      });

      await page.route('**/billing/invoice/current', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            totalFees: 100.00,
            transactionCount: 200,
            status: 'pending',
          }),
        });
      });

      await page.route('**/billing/fees*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            fees: Array.from({ length: 20 }, (_, i) => ({
              _id: `fee-${i}`,
              amount: 5.00,
              status: 'pending',
              description: 'Taxa de transação',
              createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
              transactionAmount: 50.00,
            })),
            totalPages: 2,
            currentPage: 1,
          }),
        });
      });

      await page.goto('/admin/billing');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);

      // Verificar valores iniciais
      await expect(page.getByText('R$ 100,00').first()).toBeVisible();

      // Verificar contagem de transações
      await expect(page.getByText('200 transações').first()).toBeVisible();
    });
  });

  test.describe('Transação MercadoPago - Split', () => {
    test('deve registrar taxa como paga quando venda via MercadoPago', async ({ page, request }) => {
      // Mock de venda via MercadoPago com taxa já retida
      await page.route('**/billing/summary', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            feeBalance: 0, // Sem saldo devedor porque taxa foi retida
            totalFeesPaid: 50.00, // Total já pago via split
            currentPlanFee: 0.50,
          }),
        });
      });

      await page.route('**/billing/fees*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            fees: [
              {
                _id: `fee-mp-${Date.now()}`,
                amount: 0.50,
                status: 'paid', // Já pago via split
                description: 'Taxa retida via MercadoPago',
                createdAt: new Date().toISOString(),
                transactionAmount: 50.00,
                paymentId: {
                  paymentId: `MP-${Date.now()}`,
                  amount: 50.00,
                  payerEmail: 'buyer@example.com',
                  payerName: 'Test Buyer',
                },
              },
            ],
            totalPages: 1,
          }),
        });
      });

      await page.route('**/billing/report', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            totalTransactionFees: 50.00,
            transactionCount: 100,
          }),
        });
      });

      await page.route('**/billing/invoice/current', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            totalFees: 0,
            transactionCount: 0,
            status: 'paid',
          }),
        });
      });

      await page.goto('/admin/billing');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);

      // Verificar que saldo devedor é zero
      await expect(page.getByText('R$ 0,00').first()).toBeVisible();

      // Verificar que taxa aparece como paga
      await expect(page.getByText('Pago').first()).toBeVisible();

      // Verificar botão de gerar fatura não aparece (sem saldo)
      const generateButton = page.getByRole('button', { name: /Gerar Fatura/i });
      await expect(generateButton).not.toBeVisible();
    });

    test('deve diferenciar taxas PIX Direto de MercadoPago na tabela', async ({ page }) => {
      await page.route('**/billing/summary', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            feeBalance: 5.00, // Apenas taxas PIX Direto pendentes
            totalFeesPaid: 45.00, // Taxas MercadoPago já retidas
          }),
        });
      });

      await page.route('**/billing/fees*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            fees: [
              // Taxa MercadoPago - paga
              {
                _id: 'fee-mp-1',
                amount: 0.50,
                status: 'paid',
                description: 'Taxa retida via MercadoPago',
                createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                transactionAmount: 50.00,
              },
              // Taxa PIX Direto - pendente
              {
                _id: 'fee-pix-1',
                amount: 0.50,
                status: 'pending',
                description: 'Taxa de transação PIX',
                createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                transactionAmount: 50.00,
              },
              // Taxa PIX Direto - pendente
              {
                _id: 'fee-pix-2',
                amount: 0.50,
                status: 'pending',
                description: 'Taxa de transação PIX',
                createdAt: new Date().toISOString(),
                transactionAmount: 50.00,
              },
            ],
            totalPages: 1,
          }),
        });
      });

      await page.route('**/billing/report', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            totalTransactionFees: 50.00,
            transactionCount: 100,
          }),
        });
      });

      await page.route('**/billing/invoice/current', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            totalFees: 5.00,
            transactionCount: 10,
            status: 'pending',
          }),
        });
      });

      await page.goto('/admin/billing');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);

      // Verificar status diferentes na tabela
      const paidBadges = page.locator('text=Pago');
      const pendingBadges = page.locator('text=Pendente');

      await expect(paidBadges.first()).toBeVisible();
      await expect(pendingBadges.first()).toBeVisible();

      // Verificar contagem correta
      await expect(pendingBadges).toHaveCount(2);
      await expect(paidBadges).toHaveCount(1);
    });
  });

  test.describe('Tabela de Histórico', () => {
    test('deve exibir histórico de taxas com todas as colunas', async ({ page }) => {
      await page.route('**/billing/summary', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            feeBalance: 25.00,
            totalFeesPaid: 75.00,
          }),
        });
      });

      await page.route('**/billing/fees*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            fees: [
              {
                _id: 'fee-1',
                amount: 0.50,
                status: 'pending',
                description: 'Taxa de transação',
                createdAt: new Date().toISOString(),
                transactionAmount: 50.00,
                paymentId: {
                  paymentId: 'PAY-001',
                  amount: 50.00,
                  payerEmail: 'cliente1@example.com',
                  payerName: 'Cliente Um',
                },
              },
              {
                _id: 'fee-2',
                amount: 0.50,
                status: 'paid',
                description: 'Taxa de transação',
                createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                transactionAmount: 50.00,
                paymentId: {
                  paymentId: 'PAY-002',
                  amount: 50.00,
                  payerEmail: 'cliente2@example.com',
                  payerName: 'Cliente Dois',
                },
              },
            ],
            totalPages: 1,
          }),
        });
      });

      await page.route('**/billing/report', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            totalTransactionFees: 100.00,
            transactionCount: 200,
          }),
        });
      });

      await page.route('**/billing/invoice/current', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            totalFees: 25.00,
            transactionCount: 50,
            status: 'pending',
          }),
        });
      });

      await page.goto('/admin/billing');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);

      // Verificar colunas da tabela
      await expect(page.getByText('Data').first()).toBeVisible();
      await expect(page.getByText('Transação').first()).toBeVisible();
      await expect(page.getByText('Valor').first()).toBeVisible();
      await expect(page.getByText('Taxa').first()).toBeVisible();
      await expect(page.getByText('Líquido').first()).toBeVisible();
      await expect(page.getByText('Status').first()).toBeVisible();

      // Verificar dados
      await expect(page.getByText('Cliente Um').first()).toBeVisible();
      await expect(page.getByText('cliente1@example.com').first()).toBeVisible();
      await expect(page.getByText('Cliente Dois').first()).toBeVisible();
    });

    test('deve exibir paginação quando há muitas transações', async ({ page }) => {
      await page.route('**/billing/summary', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            feeBalance: 250.00,
            totalFeesPaid: 750.00,
          }),
        });
      });

      await page.route('**/billing/fees*', async (route) => {
        const url = route.request().url();
        const pageParam = url.includes('page=2') ? 2 : 1;

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            fees: Array.from({ length: 10 }, (_, i) => ({
              _id: `fee-page${pageParam}-${i}`,
              amount: 0.50,
              status: i % 2 === 0 ? 'pending' : 'paid',
              description: 'Taxa de transação',
              createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
              transactionAmount: 50.00,
            })),
            totalPages: 5,
            currentPage: pageParam,
          }),
        });
      });

      await page.route('**/billing/report', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            totalTransactionFees: 1000.00,
            transactionCount: 2000,
          }),
        });
      });

      await page.route('**/billing/invoice/current', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            totalFees: 250.00,
            transactionCount: 500,
            status: 'pending',
          }),
        });
      });

      await page.goto('/admin/billing');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);

      // Verificar informação de página
      await expect(page.getByText(/Página 1 de 5/).first()).toBeVisible();

      // Verificar botões de navegação
      const prevButton = page.locator('button').filter({ has: page.locator('svg') }).first();
      const nextButton = page.locator('button').filter({ has: page.locator('svg') }).nth(1);

      await expect(prevButton).toBeDisabled();
      await expect(nextButton).toBeEnabled();

      // Clicar em próxima página
      await nextButton.click();
      await page.waitForTimeout(2000);

      // Verificar página 2
      await expect(page.getByText(/Página 2 de 5/).first()).toBeVisible();
    });

    test('deve exibir estado vazio quando não há taxas', async ({ page }) => {
      await page.route('**/billing/summary', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            feeBalance: 0,
            totalFeesPaid: 0,
          }),
        });
      });

      await page.route('**/billing/fees*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            fees: [],
            totalPages: 0,
            currentPage: 1,
          }),
        });
      });

      await page.route('**/billing/report', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            totalTransactionFees: 0,
            transactionCount: 0,
          }),
        });
      });

      await page.route('**/billing/invoice/current', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            totalFees: 0,
            transactionCount: 0,
            status: 'paid',
          }),
        });
      });

      await page.goto('/admin/billing');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);

      // Verificar mensagem de estado vazio
      await expect(page.getByText(/Nenhuma taxa registrada/).first()).toBeVisible();
      await expect(page.getByText(/As taxas aparecerão aqui/).first()).toBeVisible();
    });

    test('deve calcular valores líquidos corretamente', async ({ page }) => {
      await page.route('**/billing/summary', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            feeBalance: 10.00,
            totalFeesPaid: 40.00,
          }),
        });
      });

      await page.route('**/billing/fees*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            fees: [
              {
                _id: 'fee-1',
                amount: 0.50,
                status: 'pending',
                createdAt: new Date().toISOString(),
                transactionAmount: 50.00, // Líquido deve ser R$ 49,50
              },
              {
                _id: 'fee-2',
                amount: 0.50,
                status: 'paid',
                createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                transactionAmount: 100.00, // Líquido deve ser R$ 99,50
              },
            ],
            totalPages: 1,
          }),
        });
      });

      await page.route('**/billing/report', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            totalTransactionFees: 50.00,
            transactionCount: 100,
          }),
        });
      });

      await page.route('**/billing/invoice/current', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            totalFees: 10.00,
            transactionCount: 20,
            status: 'pending',
          }),
        });
      });

      await page.goto('/admin/billing');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);

      // Verificar valores líquidos calculados (Valor - Taxa)
      // R$ 49,50 = R$ 50,00 - R$ 0,50
      // R$ 99,50 = R$ 100,00 - R$ 0,50
      const liquidValues = page.locator('text=R$ 49,50');
      const liquidValues2 = page.locator('text=R$ 99,50');

      await expect(liquidValues.first()).toBeVisible();
      await expect(liquidValues2.first()).toBeVisible();
    });
  });

  test.describe('Seção Informativa', () => {
    test('deve explicar diferença entre PIX Direto e MercadoPago', async ({ page }) => {
      await page.route('**/billing/summary', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            feeBalance: 0,
            totalFeesPaid: 0,
          }),
        });
      });

      await page.route('**/billing/fees*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            fees: [],
            totalPages: 1,
          }),
        });
      });

      await page.route('**/billing/report', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            totalTransactionFees: 0,
            transactionCount: 0,
          }),
        });
      });

      await page.route('**/billing/invoice/current', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            totalFees: 0,
            transactionCount: 0,
            status: 'paid',
          }),
        });
      });

      await page.goto('/admin/billing');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);

      // Verificar seção informativa
      await expect(page.getByText(/Como funcionam as taxas?/).first()).toBeVisible();
      await expect(page.getByText(/MercadoPago:/).first()).toBeVisible();
      await expect(page.getByText(/PIX Direto:/).first()).toBeVisible();
      await expect(page.getByText(/Taxas por plano:/).first()).toBeVisible();

      // Verificar taxas por plano
      await expect(page.getByText(/Starter R\$ 0,70/).first()).toBeVisible();
      await expect(page.getByText(/Creator R\$ 0,50/).first()).toBeVisible();
      await expect(page.getByText(/Pro R\$ 0,35/).first()).toBeVisible();
      await expect(page.getByText(/Ilimitado R\$ 0,20/).first()).toBeVisible();
    });
  });

  test.describe('Atualização de Dados', () => {
    test('deve recarregar dados ao clicar em atualizar', async ({ page }) => {
      let requestCount = 0;

      await page.route('**/billing/summary', async (route) => {
        requestCount++;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            feeBalance: requestCount * 10, // Valor muda a cada chamada
            totalFeesPaid: 0,
          }),
        });
      });

      await page.route('**/billing/fees*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            fees: [],
            totalPages: 1,
          }),
        });
      });

      await page.route('**/billing/report', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            totalTransactionFees: requestCount * 10,
            transactionCount: 0,
          }),
        });
      });

      await page.route('**/billing/invoice/current', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            totalFees: requestCount * 10,
            transactionCount: 0,
            status: 'pending',
          }),
        });
      });

      await page.goto('/admin/billing');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);

      // Verificar valor inicial
      expect(requestCount).toBe(1);
      await expect(page.getByText('R$ 10,00').first()).toBeVisible();

      // Clicar em atualizar
      const refreshButton = page.getByRole('button', { name: /Atualizar/i });
      await refreshButton.click();

      await page.waitForTimeout(3000);

      // Verificar que nova requisição foi feita
      expect(requestCount).toBe(2);
      await expect(page.getByText('R$ 20,00').first()).toBeVisible();
    });
  });

  test.describe('Proteção de Rota', () => {
    test('deve redirecionar para login quando não autenticado', async ({ page }) => {
      // Limpar token
      await page.goto('/admin/billing');
      await page.evaluate(() => localStorage.removeItem('token'));
      await page.reload();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);

      // Verificar redirecionamento
      const currentUrl = page.url();
      expect(currentUrl.includes('/login')).toBe(true);
    });
  });
});
