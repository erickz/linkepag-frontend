import { test, expect } from '@playwright/test';

test.describe('PixCheckout Component - Payment Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Set auth state first
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => {
      localStorage.setItem('token', 'test-token');
      localStorage.setItem('user', JSON.stringify({
        id: 'test-user-id',
        email: 'test@example.com',
        fullName: 'Test User',
        cpf: '12345678901',
      }));
    });
  });

  test('should complete payment flow and show confirmation', async ({ page }) => {
    // Mock the public profile endpoint
    await page.route('**/users/profile/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          username: 'testuser',
          displayName: 'Test User',
          links: [
            {
              _id: '507f1f77bcf86cd799439012',
              id: '507f1f77bcf86cd799439012',
              title: 'Premium Content',
              url: 'https://example.com/premium',
              isPaid: true,
              price: 29.90,
            },
          ],
        }),
      });
    });

    // Mock payment creation
    await page.route('**/payments/create/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          payment: {
            paymentId: 'PAY-1234567890-ABCD',
            pixCode: '00020126580014br.gov.bcb.brcode01051test@example.com5204000053039865802BR5914LINKEPAG6007SAOPAULO62070503***6304',
            qrCodeUrl: 'data:image/svg+xml;base64,PHN2Zy8+',
            expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            amount: 29.90,
          },
        }),
      });
    });

    // Mock simulate payment
    await page.route('**/payments/simulate/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          status: 'confirmed',
        }),
      });
    });

    // Mock payment status
    await page.route('**/payments/status/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          status: 'confirmed',
          linkUrl: 'https://example.com/premium',
          accessToken: 'access-token-123456',
        }),
      });
    });

    await page.goto('/profile/testuser');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Click on paid link to open checkout
    await page.getByRole('button', { name: /Premium Content/ }).click();

    // Wait for checkout to appear with confirmation
    await expect(page.getByText('Pagamento confirmado!')).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Seu acesso foi liberado')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Acessar Conteúdo' })).toBeVisible({ timeout: 10000 });
  });

  test('should handle payment creation error', async ({ page }) => {
    // Mock the public profile endpoint
    await page.route('**/users/profile/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          username: 'testuser',
          displayName: 'Test User',
          links: [
            {
              _id: '507f1f77bcf86cd799439012',
              id: '507f1f77bcf86cd799439012',
              title: 'Premium Content',
              url: 'https://example.com/premium',
              isPaid: true,
              price: 29.90,
            },
          ],
        }),
      });
    });

    // Mock failed payment creation
    await page.route('**/payments/create/**', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Link não encontrado ou não é pago',
        }),
      });
    });

    await page.goto('/profile/testuser');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Click on paid link
    await page.getByRole('button', { name: /Premium Content/ }).click();

    // Wait for error message
    await expect(page.getByText('Link não encontrado ou não é pago')).toBeVisible({ timeout: 20000 });
  });

  test('should handle expired payment and generate new PIX', async ({ page }) => {
    let createCount = 0;

    // Mock the public profile endpoint
    await page.route('**/users/profile/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          username: 'testuser',
          displayName: 'Test User',
          links: [
            {
              _id: '507f1f77bcf86cd799439012',
              id: '507f1f77bcf86cd799439012',
              title: 'Premium Content',
              url: 'https://example.com/premium',
              isPaid: true,
              price: 29.90,
            },
          ],
        }),
      });
    });

    // Mock payment creation
    await page.route('**/payments/create/**', async (route) => {
      createCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          payment: {
            paymentId: `PAY-${Date.now()}-${createCount}`,
            pixCode: '00020126580014br.gov.bcb.brcode01051test@example.com5204000053039865802BR5914LINKEPAG6007SAOPAULO62070503***6304',
            qrCodeUrl: 'data:image/svg+xml;base64,PHN2Zy8+',
            expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            amount: 29.90,
          },
        }),
      });
    });

    // Mock payment status as expired
    await page.route('**/payments/status/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          status: 'expired',
        }),
      });
    });

    await page.goto('/profile/testuser');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Click on paid link
    await page.getByRole('button', { name: /Premium Content/ }).click();

    // Wait for expired state
    await expect(page.getByText('Pagamento expirado')).toBeVisible({ timeout: 20000 });

    // Verify generate new PIX button is visible
    await expect(page.getByRole('button', { name: 'Gerar novo PIX' })).toBeVisible();
  });

  test('should open checkout and show pending state', async ({ page }) => {
    // Mock the public profile endpoint
    await page.route('**/users/profile/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          username: 'testuser',
          displayName: 'Test User',
          links: [
            {
              _id: '507f1f77bcf86cd799439012',
              id: '507f1f77bcf86cd799439012',
              title: 'Premium Content',
              url: 'https://example.com/premium',
              isPaid: true,
              price: 29.90,
            },
          ],
        }),
      });
    });

    // Mock payment creation
    await page.route('**/payments/create/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          payment: {
            paymentId: 'PAY-1234567890-ABCD',
            pixCode: '00020126580014br.gov.bcb.brcode01051test@example.com5204000053039865802BR5914LINKEPAG6007SAOPAULO62070503***6304',
            qrCodeUrl: 'data:image/svg+xml;base64,PHN2Zy8+',
            expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            amount: 29.90,
          },
        }),
      });
    });

    // Mock status
    await page.route('**/payments/status/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          status: 'pending',
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        }),
      });
    });

    await page.goto('/profile/testuser');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Click on paid link to open checkout
    await page.getByRole('button', { name: /Premium Content/ }).click();

    // Wait for pending state
    await expect(page.getByText('tempo restante')).toBeVisible({ timeout: 20000 });
    
    // Verify QR code is displayed
    await expect(page.locator('img[alt="QR Code PIX"]')).toBeVisible({ timeout: 10000 });
  });
});
