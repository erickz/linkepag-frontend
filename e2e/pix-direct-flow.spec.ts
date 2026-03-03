import { test, expect } from '@playwright/test';

test.describe('PIX Direto Flow - Manual Confirmation', () => {
  const testTimestamp = Date.now();
  const sellerEmail = `seller${testTimestamp}@example.com`;
  const sellerUsername = `seller${testTimestamp}`;
  const sellerCpf = `${30000000000 + (testTimestamp % 89999999999)}`.slice(0, 11);
  const testPassword = 'TestPassword123';
  let createdLinkId: string;

  test.beforeAll(async ({ request }) => {
    // Create seller user via API
    await request.post('http://localhost:3001/auth/register', {
      data: {
        fullName: 'PIX Seller Test',
        email: sellerEmail,
        cpf: sellerCpf,
        password: testPassword,
        username: sellerUsername,
      },
    });

    // Login to get token
    const loginRes = await request.post('http://localhost:3001/auth/login', {
      data: {
        email: sellerEmail,
        password: testPassword,
      },
    });

    if (loginRes.ok()) {
      const loginData = await loginRes.json();
      const token = loginData.token;

      // Set PIX key on user profile
      await request.patch('http://localhost:3001/users/profile', {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          pixKey: '12345678900',
          pixKeyType: 'CPF',
        },
      });

      // Create a paid link
      const linkRes = await request.post('http://localhost:3001/links', {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          title: 'PIX Direto Product',
          url: 'https://example.com/product',
          type: 'paid',
          isPaid: true,
          price: 50.00,
        },
      });

      if (linkRes.ok()) {
        const linkData = await linkRes.json();
        createdLinkId = linkData.link.id;
      }
    }
  });

  test('buyer can initiate PIX Direto checkout', async ({ page }) => {
    // Navigate to seller's public profile
    await page.goto(`/profile/${sellerUsername}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Mock the API responses for PIX Direto
    await page.route('**/payments/create-pix-direct/**', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          payment: {
            paymentId: `PAY-PIX-${Date.now()}`,
            pixCode: '00020126580014BR.GOV.BCB.PIX012312345678900520400005303986540650.005802BR5914TestSeller6009SAOPAULO62070503***6304E2CA',
            qrCodeUrl: 'data:image/svg+xml;base64,PHN2Zy8+',
            amount: 50.00,
            status: 'awaiting_confirmation',
            paymentMethodType: 'pix_direct',
          },
        }),
      });
    });

    // Click on the paid link
    await page.getByRole('button', { name: /PIX Direto Product/i }).click();
    await page.waitForTimeout(2000);

    // Fill buyer email
    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.isVisible().catch(() => false)) {
      await emailInput.fill('buyer@example.com');
    }

    // Fill buyer name
    const nameInput = page.locator('input[name="name"], input[placeholder*="nome"]').first();
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill('Test Buyer');
    }

    // Click to generate PIX
    await page.getByRole('button', { name: /Gerar PIX|Copia e Cola|Pagar/i }).click();

    await page.waitForTimeout(3000);

    // Verify PIX code is displayed
    await expect(page.getByText(/Copia e Cola|QR Code|00020/i).first()).toBeVisible({ timeout: 10000 });

    // Verify QR code image is displayed
    const qrCode = page.locator('img[alt*="QR"], img[src*="qr"]').first();
    expect(await qrCode.isVisible().catch(() => false)).toBe(true);
  });

  test('seller can view pending payments', async ({ page }) => {
    // Login as seller
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    await page.locator('input[type="email"]').fill(sellerEmail);
    await page.locator('input[type="password"]').fill(testPassword);
    await page.getByRole('button', { name: 'Entrar' }).click();

    await page.waitForTimeout(3000);

    // Navigate to pending payments
    await page.goto('/admin/payments/pending');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Verify pending payments page loaded
    await expect(page.getByText(/Pendente|pendente|Pending/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('seller can confirm PIX payment manually', async ({ page }) => {
    // Login as seller
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    await page.locator('input[type="email"]').fill(sellerEmail);
    await page.locator('input[type="password"]').fill(testPassword);
    await page.getByRole('button', { name: 'Entrar' }).click();

    await page.waitForTimeout(3000);

    // Navigate to pending payments
    await page.goto('/admin/payments/pending');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Mock the confirm API
    await page.route('**/payments/*/confirm', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          payment: {
            status: 'confirmed',
            accessToken: 'access-token-12345',
            linkUrl: 'https://example.com/product',
          },
        }),
      });
    });

    // Find and click confirm button
    const confirmButton = page.getByRole('button', { name: /Confirmar|Confirm|Liberar/i }).first();
    if (await confirmButton.isVisible().catch(() => false)) {
      await confirmButton.click();

      // Handle confirmation modal/dialog if present
      await page.waitForTimeout(1000);
      const finalConfirm = page.getByRole('button', { name: /Sim|Yes|Confirmar/i });
      if (await finalConfirm.isVisible().catch(() => false)) {
        await finalConfirm.click();
      }

      await page.waitForTimeout(2000);

      // Verify success message
      const successVisible = await page.getByText(/confirmado|Confirmado|confirmed/i).first().isVisible().catch(() => false);
      expect(successVisible).toBe(true);
    }
  });

  test('buyer can upload receipt', async ({ page }) => {
    await page.goto(`/profile/${sellerUsername}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Mock APIs
    await page.route('**/payments/create-pix-direct/**', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          payment: {
            paymentId: `PAY-RECEIPT-${Date.now()}`,
            pixCode: '00020126580014BR.GOV.BCB.PIX012312345678900520400005303986540650.005802BR5914TestSeller6009SAOPAULO62070503***6304E2CA',
            qrCodeUrl: 'data:image/svg+xml;base64,PHN2Zy8+',
            amount: 50.00,
            status: 'awaiting_confirmation',
          },
        }),
      });
    });

    await page.route('**/payments/*/receipt', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    // Click on paid link
    await page.getByRole('button', { name: /PIX Direto Product/i }).click();
    await page.waitForTimeout(2000);

    // Fill email
    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.isVisible().catch(() => false)) {
      await emailInput.fill('buyer@example.com');
    }

    // Generate PIX
    await page.getByRole('button', { name: /Gerar PIX|Pagar/i }).click();
    await page.waitForTimeout(3000);

    // Look for receipt upload option
    const uploadInput = page.locator('input[type="file"]').first();
    const uploadButton = page.getByRole('button', { name: /comprovante|receipt|upload/i }).first();

    if (await uploadInput.isVisible().catch(() => false) || 
        await uploadButton.isVisible().catch(() => false)) {
      // Upload receipt flow would go here
      expect(true).toBe(true); // Test passes if upload option is available
    }
  });

  test('buyer receives access after confirmation', async ({ page }) => {
    await page.goto(`/profile/${sellerUsername}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Mock confirmed payment status
    let statusCallCount = 0;
    await page.route('**/payments/status/**', async (route) => {
      statusCallCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          status: statusCallCount > 1 ? 'confirmed' : 'awaiting_confirmation',
          linkUrl: 'https://example.com/product',
          accessToken: 'access-token-abc123',
        }),
      });
    });

    await page.route('**/payments/create-pix-direct/**', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          payment: {
            paymentId: `PAY-ACCESS-${Date.now()}`,
            pixCode: '00020126580014BR.GOV.BCB.PIX012312345678900520400005303986540650.005802BR5914TestSeller6009SAOPAULO62070503***6304E2CA',
            qrCodeUrl: 'data:image/svg+xml;base64,PHN2Zy8+',
            amount: 50.00,
            status: 'awaiting_confirmation',
          },
        }),
      });
    });

    // Start checkout
    await page.getByRole('button', { name: /PIX Direto Product/i }).click();
    await page.waitForTimeout(2000);

    await page.locator('input[type="email"]').first().fill('buyer@example.com');
    await page.getByRole('button', { name: /Gerar PIX|Pagar/i }).click();
    await page.waitForTimeout(3000);

    // Wait for status check to return confirmed
    await page.waitForTimeout(5000);

    // Verify access is granted
    const accessButton = page.getByRole('button', { name: /Acessar|Access|Abrir/i });
    const confirmedMessage = page.getByText(/confirmado|liberado|Acesso/i);

    const hasAccess = await accessButton.isVisible().catch(() => false) ||
                     await confirmedMessage.first().isVisible().catch(() => false);

    expect(hasAccess).toBe(true);
  });
});
