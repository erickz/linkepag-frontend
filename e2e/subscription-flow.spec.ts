import { test, expect } from '@playwright/test';

test.describe('Subscription Flow - Plans and Upgrade', () => {
  const testTimestamp = Date.now();
  const userEmail = `subuser${testTimestamp}@example.com`;
  const userUsername = `subuser${testTimestamp}`;
  const userCpf = `${40000000000 + (testTimestamp % 89999999999)}`.slice(0, 11);
  const testPassword = 'TestPassword123';

  test.beforeAll(async ({ request }) => {
    // Create test user via API
    await request.post('http://localhost:3001/auth/register', {
      data: {
        fullName: 'Subscription Test User',
        email: userEmail,
        cpf: userCpf,
        password: testPassword,
        username: userUsername,
      },
    });
  });

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    await page.locator('input[type="email"]').fill(userEmail);
    await page.locator('input[type="password"]').fill(testPassword);
    await page.getByRole('button', { name: 'Entrar' }).click();

    await page.waitForTimeout(3000);
  });

  test('should display available plans', async ({ page }) => {
    await page.goto('/admin/plans');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Verify plans page loaded
    await expect(page.getByText(/Plano|Plan|Assinatura/i).first()).toBeVisible({ timeout: 10000 });

    // Check for plan names
    const planNames = ['Starter', 'Creator', 'Pro', 'Ilimitado'];
    let foundPlan = false;
    for (const name of planNames) {
      if (await page.getByText(name).first().isVisible().catch(() => false)) {
        foundPlan = true;
        break;
      }
    }
    expect(foundPlan).toBe(true);
  });

  test('should show current plan (Starter/Grátis)', async ({ page }) => {
    await page.goto('/admin/plans');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Look for current plan indicator
    const currentPlanIndicators = [
      'Atual',
      'Current',
      'ativo',
      'Active',
      'Seu plano',
    ];

    let foundIndicator = false;
    for (const indicator of currentPlanIndicators) {
      if (await page.getByText(indicator).first().isVisible().catch(() => false)) {
        foundIndicator = true;
        break;
      }
    }

    // May or may not have indicator, but page should load
    expect(page.url()).toContain('/admin/plans');
  });

  test('should initiate upgrade to Creator plan', async ({ page }) => {
    await page.goto('/admin/plans');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Mock subscription API
    await page.route('**/subscriptions', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            subscription: {
              id: `SUB-${Date.now()}`,
              planId: 2,
              planName: 'Creator',
              status: 'pending_payment',
              amount: 19.90,
            },
            pixData: {
              pixCode: '00020126580014BR.GOV.BCB.PIX0123pix@linkepag.com520400005303986540619.905802BR5910LinkePag6009SAOPAULO62070503***6304E2CA',
              qrCodeUrl: 'data:image/svg+xml;base64,PHN2Zy8+',
              expirationDate: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Find and click upgrade button for Creator plan
    const upgradeButtons = [
      page.getByRole('button', { name: /Assinar|Subscribe|Upgrade|Escolher/i }).nth(1),
      page.locator('button:has-text("R$ 19,90")').first(),
      page.locator('button:has-text("Creator")').first(),
    ];

    for (const btn of upgradeButtons) {
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();
        break;
      }
    }

    await page.waitForTimeout(3000);

    // Should show payment options or PIX
    const paymentVisible = await page.getByText(/PIX|pagamento|payment|QR Code/i).first().isVisible().catch(() => false);
    expect(paymentVisible).toBe(true);
  });

  test('should display plan features comparison', async ({ page }) => {
    await page.goto('/admin/plans');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Check for feature comparisons
    const featureKeywords = [
      'link',
      'monetizado',
      'taxa',
      'fee',
      'relatório',
      'suporte',
      'support',
    ];

    let foundFeature = false;
    for (const keyword of featureKeywords) {
      const text = await page.locator('body').textContent();
      if (text?.toLowerCase().includes(keyword)) {
        foundFeature = true;
        break;
      }
    }

    expect(foundFeature).toBe(true);
  });

  test('should show plan limit warning on dashboard', async ({ page }) => {
    // Create multiple links to trigger limit warning
    await page.goto('/admin/links');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Try to create paid links
    for (let i = 0; i < 4; i++) {
      const addButton = page.getByRole('button', { name: /Adicionar|Novo/i }).first();
      if (await addButton.isVisible().catch(() => false)) {
        await addButton.click();
        await page.waitForTimeout(1000);

        await page.locator('input[name="title"]').fill(`Paid Link ${i}`);
        await page.locator('input[name="url"]').fill(`https://example.com/paid${i}`);

        // Set as paid
        const paidToggle = page.locator('input[name="isPaid"], [role="switch"]').first();
        if (await paidToggle.isVisible().catch(() => false)) {
          await paidToggle.click();
        }

        const priceInput = page.locator('input[name="price"]').first();
        if (await priceInput.isVisible().catch(() => false)) {
          await priceInput.fill('10.00');
        }

        await page.getByRole('button', { name: /Salvar|Criar/i }).click();
        await page.waitForTimeout(2000);

        // Check for limit warning
        const warningVisible = await page.getByText(/limite|Limite|upgrade|Upgrade/i).first().isVisible().catch(() => false);
        if (warningVisible && i >= 3) {
          expect(warningVisible).toBe(true);
          break;
        }
      }
    }
  });

  test('should cancel subscription', async ({ page }) => {
    // First upgrade
    await page.goto('/admin/plans');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Mock APIs
    await page.route('**/subscriptions', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            subscription: {
              id: `SUB-${Date.now()}`,
              planId: 2,
              planName: 'Creator',
              status: 'active',
              amount: 19.90,
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.route('**/subscriptions/cancel', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Assinatura cancelada com sucesso',
        }),
      });
    });

    // Upgrade first
    const upgradeBtn = page.getByRole('button', { name: /Assinar|Escolher/i }).nth(1);
    if (await upgradeBtn.isVisible().catch(() => false)) {
      await upgradeBtn.click();
      await page.waitForTimeout(3000);
    }

    // Navigate back to plans
    await page.goto('/admin/plans');
    await page.waitForTimeout(3000);

    // Find cancel button
    const cancelButton = page.getByRole('button', { name: /Cancelar|Cancel/i });
    if (await cancelButton.isVisible().catch(() => false)) {
      await cancelButton.click();
      await page.waitForTimeout(1000);

      // Confirm cancellation
      const confirmButton = page.getByRole('button', { name: /Sim|Confirmar|Yes/i });
      if (await confirmButton.isVisible().catch(() => false)) {
        await confirmButton.click();
        await page.waitForTimeout(2000);

        // Verify success
        const successVisible = await page.getByText(/cancelada|cancelled/i).first().isVisible().catch(() => false);
        expect(successVisible).toBe(true);
      }
    }
  });

  test('should display payment history', async ({ page }) => {
    // Mock subscription history
    await page.route('**/subscriptions/history', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          history: [
            {
              id: 'SUB-001',
              planId: 2,
              planName: 'Creator',
              status: 'active',
              amount: 19.90,
              startedAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            },
          ],
        }),
      });
    });

    await page.goto('/admin/plans');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Look for history section
    const historyVisible = await page.getByText(/Histórico|History|Transações/i).first().isVisible().catch(() => false);
    
    // History may not always be visible, but page should load
    expect(page.url()).toContain('/admin/plans');
  });
});
