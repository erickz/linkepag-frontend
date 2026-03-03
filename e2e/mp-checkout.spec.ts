import { test, expect } from '@playwright/test';

test.describe('MercadoPago Checkout Flow', () => {
  const testTimestamp = Date.now();
  const sellerEmail = `mpseller${testTimestamp}@example.com`;
  const sellerUsername = `mpseller${testTimestamp}`;
  const sellerCpf = `${50000000000 + (testTimestamp % 89999999999)}`.slice(0, 11);
  const testPassword = 'TestPassword123';

  test.beforeAll(async ({ request }) => {
    // Create seller with MercadoPago credentials
    await request.post('http://localhost:3001/auth/register', {
      data: {
        fullName: 'MP Seller Test',
        email: sellerEmail,
        cpf: sellerCpf,
        password: testPassword,
        username: sellerUsername,
      },
    });

    const loginRes = await request.post('http://localhost:3001/auth/login', {
      data: {
        email: sellerEmail,
        password: testPassword,
      },
    });

    if (loginRes.ok()) {
      const loginData = await loginRes.json();
      const token = loginData.token;

      // Set MercadoPago credentials
      await request.patch('http://localhost:3001/users/mercadopago/credentials', {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          mercadoPagoPublicKey: 'TEST-f44e5241-2552-4c54-b72c-8fd1a9f7c1e2',
          mercadoPagoAccessToken: 'TEST-2372715816013223-020617-fba94bad1dfecd86b5f3ce5ab0078ab3-231750138',
        },
      });

      // Create a paid link
      await request.post('http://localhost:3001/links', {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          title: 'MP Product',
          url: 'https://example.com/mp-product',
          type: 'paid',
          isPaid: true,
          price: 100.00,
        },
      });
    }
  });

  test('buyer can checkout with MercadoPago', async ({ page }) => {
    await page.goto(`/profile/${sellerUsername}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Mock MercadoPago payment creation
    await page.route('**/payments/create/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          payment: {
            paymentId: `MP-${Date.now()}`,
            pixCode: '00020126580014BR.GOV.BCB.PIX0123mp@mercadopago.com5204000053039865406100.005802BR5914MercadoPago6009SAOPAULO62070503***6304E2CA',
            qrCodeUrl: 'data:image/svg+xml;base64,PHN2Zy8+',
            amount: 100.00,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            paymentMethodType: 'mercado_pago',
          },
        }),
      });
    });

    // Click on product
    await page.getByRole('button', { name: /MP Product/i }).click();
    await page.waitForTimeout(2000);

    // Fill buyer info
    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.isVisible().catch(() => false)) {
      await emailInput.fill('buyer@example.com');
    }

    // Generate payment
    await page.getByRole('button', { name: /Pagar|Checkout|Pagar com/i }).click();
    await page.waitForTimeout(3000);

    // Verify PIX/QR code is displayed
    await expect(page.getByText(/Copia e Cola|QR Code/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('webhook confirmation updates payment status', async ({ page }) => {
    let statusCheckCount = 0;

    await page.route('**/payments/status/**', async (route) => {
      statusCheckCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          status: statusCheckCount > 2 ? 'confirmed' : 'pending',
          linkUrl: 'https://example.com/mp-product',
          accessToken: 'mp-access-token-123',
        }),
      });
    });

    await page.route('**/payments/create/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          payment: {
            paymentId: `MP-WEBHOOK-${Date.now()}`,
            pixCode: '00020126580014BR.GOV.BCB.PIX0123mp@mercadopago.com5204000053039865406100.005802BR5914MercadoPago6009SAOPAULO62070503***6304E2CA',
            qrCodeUrl: 'data:image/svg+xml;base64,PHN2Zy8+',
            amount: 100.00,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          },
        }),
      });
    });

    await page.goto(`/profile/${sellerUsername}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Start checkout
    await page.getByRole('button', { name: /MP Product/i }).click();
    await page.waitForTimeout(2000);

    await page.locator('input[type="email"]').first().fill('buyer@example.com');
    await page.getByRole('button', { name: /Pagar/i }).click();
    await page.waitForTimeout(3000);

    // Wait for status checks
    await page.waitForTimeout(10000);

    // Should show confirmed status
    const confirmed = await page.getByText(/confirmado|Confirmado|Acesso/i).first().isVisible().catch(() => false);
    expect(confirmed).toBe(true);
  });

  test('seller can configure MercadoPago credentials', async ({ page }) => {
    // Login as seller
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    await page.locator('input[type="email"]').fill(sellerEmail);
    await page.locator('input[type="password"]').fill(testPassword);
    await page.getByRole('button', { name: 'Entrar' }).click();

    await page.waitForTimeout(3000);

    // Navigate to payment settings
    await page.goto('/admin/payments');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Verify payment settings page
    await expect(page.getByText(/Pagamento|Payment|MercadoPago/i).first()).toBeVisible({ timeout: 10000 });

    // Check for credentials fields
    const publicKeyField = page.locator('input[name="mercadoPagoPublicKey"], input[placeholder*="Public"]').first();
    const accessTokenField = page.locator('input[name="mercadoPagoAccessToken"], input[placeholder*="Access"]').first();

    const hasFields = await publicKeyField.isVisible().catch(() => false) ||
                     await accessTokenField.isVisible().catch(() => false);

    expect(hasFields).toBe(true);
  });

  test('shows warning when seller has no MP credentials', async ({ page }) => {
    // Create user without MP credentials
    const noMpEmail = `nomp${Date.now()}@example.com`;
    const noMpUsername = `nomp${Date.now()}`;

    await page.request.post('http://localhost:3001/auth/register', {
      data: {
        fullName: 'No MP User',
        email: noMpEmail,
        cpf: `${60000000000 + (Date.now() % 89999999999)}`.slice(0, 11),
        password: testPassword,
        username: noMpUsername,
      },
    });

    const loginRes = await page.request.post('http://localhost:3001/auth/login', {
      data: {
        email: noMpEmail,
        password: testPassword,
      },
    });

    let noMpToken = '';
    if (loginRes.ok()) {
      const data = await loginRes.json();
      noMpToken = data.token;

      // Create paid link without MP
      await page.request.post('http://localhost:3001/links', {
        headers: { Authorization: `Bearer ${noMpToken}` },
        data: {
          title: 'No MP Product',
          url: 'https://example.com/no-mp',
          type: 'paid',
          isPaid: true,
          price: 50.00,
        },
      });
    }

    // Visit profile as buyer
    await page.goto(`/profile/${noMpUsername}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Mock no MP available
    await page.route('**/payments/create/**', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Vendedor não configurou MercadoPago',
        }),
      });
    });

    // Try to buy
    await page.getByRole('button', { name: /No MP Product/i }).click();
    await page.waitForTimeout(2000);

    // Should show warning
    const warning = await page.getByText(/não configurado|não disponível|unavailable/i).first().isVisible().catch(() => false);
    expect(warning).toBe(true);
  });
});
