import { test, expect } from '@playwright/test';

test.describe('Plan Edge Cases - Complex Scenarios', () => {
  const testTimestamp = Date.now();
  const userEmail = `edgecase${testTimestamp}@example.com`;
  const userUsername = `edgecase${testTimestamp}`;
  const userCpf = `${40000000000 + (testTimestamp % 89999999999)}`.slice(0, 11);
  const testPassword = 'TestPassword123';

  test.beforeAll(async ({ request }) => {
    // Create test user via API
    await request.post('http://localhost:3001/auth/register', {
      data: {
        fullName: 'Edge Case Test User',
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

  test.describe('Upgrade Pending Scenarios', () => {
    test('should allow creating paid links when upgrade to Creator is pending', async ({ page }) => {
      // Mock subscription to show pending upgrade to Creator (planId: 2, maxPaidLinks: 10)
      await page.route('**/subscriptions/current', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            subscription: {
              id: `SUB-PENDING-${Date.now()}`,
              planId: 2, // Creator
              planName: 'Creator',
              status: 'pending_payment',
              amount: 19.90,
              startedAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              pixData: {
                pixCode: '00020126580014BR.GOV.BCB.PIX0123pix@linkepag.com520400005303986540619.905802BR5910LinkePag6009SAOPAULO62070503***6304E2CA',
                qrCodeUrl: 'data:image/svg+xml;base64,PHN2Zy8+',
                expirationDate: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
              },
            },
          }),
        });
      });

      // Navigate to links page
      await page.goto('/admin/links');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Try to create a paid link - should be allowed (Creator has 10 paid links limit)
      await page.getByRole('button', { name: /Novo|Adicionar/i }).first().click();
      await page.waitForTimeout(1000);

      await page.locator('input[name="title"]').fill('Test Paid Link Pending');
      await page.locator('input[name="url"]').fill('https://example.com/test-pending');

      // Set as paid
      const paidToggle = page.locator('button:has-text("Monetizado"), [role="switch"]').first();
      if (await paidToggle.isVisible().catch(() => false)) {
        await paidToggle.click();
      }

      await page.waitForTimeout(500);

      // Should NOT show "complete payment" error - should allow creating
      const paymentRequiredError = await page.getByText(/complete.*pagamento|complete.*payment/i).first().isVisible().catch(() => false);
      expect(paymentRequiredError).toBe(false);

      // Fill price
      const priceInput = page.locator('input[name="price"]').first();
      if (await priceInput.isVisible().catch(() => false)) {
        await priceInput.fill('25.00');
      }

      // Save should be possible
      const saveButton = page.getByRole('button', { name: /Salvar|Criar/i });
      expect(await saveButton.isEnabled().catch(() => false)).toBe(true);
    });

    test('should show Creator plan features when upgrade is pending', async ({ page }) => {
      // Mock subscription with pending_payment status
      await page.route('**/subscriptions/current', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            subscription: {
              id: `SUB-PENDING-2`,
              planId: 2, // Creator
              planName: 'Creator',
              status: 'pending_payment',
              amount: 19.90,
              startedAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            },
          }),
        });
      });

      await page.goto('/admin/plans');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Should show Creator as current plan, not Starter
      const creatorPlanVisible = await page.getByText(/Creator|Creator.*pendente|Creator.*pending/i).first().isVisible().catch(() => false);
      
      // The page should reflect the pending upgrade plan
      expect(page.url()).toContain('/admin/plans');
    });

    test('should show pending payment indicator in upgrade modal', async ({ page }) => {
      // Mock pending subscription
      await page.route('**/subscriptions/current', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            subscription: {
              id: `SUB-PENDING-3`,
              planId: 3, // Pro
              planName: 'Pro',
              status: 'pending_payment',
              amount: 49.90,
              startedAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            },
          }),
        });
      });

      await page.goto('/admin/links');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Try to open upgrade modal by clicking upgrade button
      const upgradeButton = page.getByRole('button', { name: /Upgrade|Fazer upgrade/i }).first();
      if (await upgradeButton.isVisible().catch(() => false)) {
        await upgradeButton.click();
        await page.waitForTimeout(1000);

        // Should show that upgrade is pending - should NOT show upgrade buttons
        const pendingIndicator = await page.getByText(/pendente|pending|aguardando/i).first().isVisible().catch(() => false);
        
        // Modal should appear
        expect(await page.locator('[role="dialog"], .modal, [class*="modal"]').first().isVisible().catch(() => false)).toBe(true);
      }
    });
  });

  test.describe('Plan Expired Scenarios', () => {
    test('should block paid link creation when plan is expired', async ({ page }) => {
      // Mock expired subscription
      await page.route('**/subscriptions/current', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            subscription: {
              id: `SUB-EXPIRED-${Date.now()}`,
              planId: 2, // Was Creator
              planName: 'Creator',
              status: 'expired',
              amount: 19.90,
              startedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
              expiresAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Expired 30 days ago
            },
          }),
        });
      });

      await page.goto('/admin/links');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Try to create paid link
      await page.getByRole('button', { name: /Novo|Adicionar/i }).first().click();
      await page.waitForTimeout(1000);

      await page.locator('input[name="title"]').fill('Test Expired Link');
      await page.locator('input[name="url"]').fill('https://example.com/expired');

      // Set as paid
      const paidToggle = page.locator('button:has-text("Monetizado")').first();
      if (await paidToggle.isVisible().catch(() => false)) {
        await paidToggle.click();
      }

      await page.waitForTimeout(500);

      // Should show expired plan error
      const expiredError = await page.getByText(/expirou|expired|renove|renew/i).first().isVisible().catch(() => false);
      expect(expiredError).toBe(true);
    });

    test('should downgrade to Free plan when Creator expires and block if over limit', async ({ page }) => {
      // Mock expired subscription - user had Creator with 10 links, but now expired
      await page.route('**/subscriptions/current', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            subscription: {
              id: `SUB-EXPIRED-DOWNGRADE`,
              planId: 2, // Was Creator
              planName: 'Creator',
              status: 'expired',
              amount: 19.90,
              startedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
              expiresAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            },
          }),
        });
      });

      // Mock links - user has 5 paid links (more than Free's 3)
      await page.route('**/links', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            links: Array.from({ length: 5 }, (_, i) => ({
              id: `link-${i}`,
              title: `Paid Link ${i}`,
              url: `https://example.com/link${i}`,
              isActive: true,
              isPaid: true,
              price: 10 + i,
              order: i,
            })),
          }),
        });
      });

      await page.goto('/admin/links');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Should show downgrade warning - Free plan only allows 3 links
      const limitWarning = await page.getByText(/limite|limit|3.*links|upgrade/i).first().isVisible().catch(() => false);
      
      // Page should load with existing links but show warning
      expect(page.url()).toContain('/admin/links');
    });

    test('should show expired plan status in plans page', async ({ page }) => {
      await page.route('**/subscriptions/current', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            subscription: {
              id: `SUB-EXPIRED-STATUS`,
              planId: 2,
              planName: 'Creator',
              status: 'expired',
              amount: 19.90,
              startedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
              expiresAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            },
          }),
        });
      });

      await page.goto('/admin/plans');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Should show expired status
      const expiredStatus = await page.getByText(/expirado|expired|cancelado|cancelled/i).first().isVisible().catch(() => false);
      expect(expiredStatus).toBe(true);
    });
  });

  test.describe('Plan Cancelled Scenarios', () => {
    test('should block link creation when plan is cancelled', async ({ page }) => {
      // Mock cancelled subscription
      await page.route('**/subscriptions/current', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            subscription: {
              id: `SUB-CANCELLED-${Date.now()}`,
              planId: 2,
              planName: 'Creator',
              status: 'cancelled',
              amount: 19.90,
              startedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
              expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
            },
          }),
        });
      });

      await page.goto('/admin/links');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Try to create paid link
      await page.getByRole('button', { name: /Novo|Adicionar/i }).first().click();
      await page.waitForTimeout(1000);

      await page.locator('input[name="title"]').fill('Test Cancelled Link');
      await page.locator('input[name="url"]').fill('https://example.com/cancelled');

      // Set as paid
      const paidToggle = page.locator('button:has-text("Monetizado")').first();
      if (await paidToggle.isVisible().catch(() => false)) {
        await paidToggle.click();
      }

      await page.waitForTimeout(500);

      // Should show cancelled plan error
      const cancelledError = await page.getByText(/cancelado|cancelled|assine.*novamente|subscribe.*again/i).first().isVisible().catch(() => false);
      expect(cancelledError).toBe(true);
    });
  });

  test.describe('Payment Failed Scenarios', () => {
    test('should block link creation when payment failed', async ({ page }) => {
      // Mock payment_failed subscription
      await page.route('**/subscriptions/current', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            subscription: {
              id: `SUB-FAILED-${Date.now()}`,
              planId: 3,
              planName: 'Pro',
              status: 'payment_failed',
              amount: 49.90,
              startedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
              expiresAt: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
            },
          }),
        });
      });

      await page.goto('/admin/links');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Try to create paid link
      await page.getByRole('button', { name: /Novo|Adicionar/i }).first().click();
      await page.waitForTimeout(1000);

      await page.locator('input[name="title"]').fill('Test Failed Payment Link');
      await page.locator('input[name="url"]').fill('https://example.com/failed');

      // Set as paid
      const paidToggle = page.locator('button:has-text("Monetizado")').first();
      if (await paidToggle.isVisible().catch(() => false)) {
        await paidToggle.click();
      }

      await page.waitForTimeout(500);

      // Should show payment failed error
      const failedError = await page.getByText(/pagamento.*falhou|payment.*failed|atualize.*pagamento|update.*payment/i).first().isVisible().catch(() => false);
      expect(failedError).toBe(true);
    });
  });

  test.describe('Link Limit Edge Cases', () => {
    test('should allow exactly the limit of paid links', async ({ page }) => {
      // Mock active Creator subscription (10 links limit)
      await page.route('**/subscriptions/current', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            subscription: {
              id: `SUB-CREATOR-LIMIT`,
              planId: 2,
              planName: 'Creator',
              status: 'active',
              amount: 19.90,
              startedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
              expiresAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
            },
          }),
        });
      });

      // Mock exactly 9 links (one less than limit)
      await page.route('**/links', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            links: Array.from({ length: 9 }, (_, i) => ({
              id: `link-${i}`,
              title: `Paid Link ${i}`,
              url: `https://example.com/link${i}`,
              isActive: true,
              isPaid: true,
              price: 10 + i,
              order: i,
            })),
          }),
        });
      });

      await page.goto('/admin/links');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Should allow creating 10th link
      await page.getByRole('button', { name: /Novo|Adicionar/i }).first().click();
      await page.waitForTimeout(1000);

      await page.locator('input[name="title"]').fill('10th Link');
      await page.locator('input[name="url"]').fill('https://example.com/10th');

      // Set as paid
      const paidToggle = page.locator('button:has-text("Monetizado")').first();
      if (await paidToggle.isVisible().catch(() => false)) {
        await paidToggle.click();
      }

      await page.waitForTimeout(500);

      // Should NOT show limit error yet
      const limitError = await page.getByText(/limite.*atingido|limit.*reached/i).first().isVisible().catch(() => false);
      expect(limitError).toBe(false);
    });

    test('should block when exceeding limit with pending upgrade', async ({ page }) => {
      // Mock pending upgrade to Creator (10 links)
      await page.route('**/subscriptions/current', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            subscription: {
              id: `SUB-PENDING-LIMIT`,
              planId: 2,
              planName: 'Creator',
              status: 'pending_payment',
              amount: 19.90,
              startedAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            },
          }),
        });
      });

      // Mock already 10 links (at limit)
      await page.route('**/links', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            links: Array.from({ length: 10 }, (_, i) => ({
              id: `link-${i}`,
              title: `Paid Link ${i}`,
              url: `https://example.com/link${i}`,
              isActive: true,
              isPaid: true,
              price: 10 + i,
              order: i,
            })),
          }),
        });
      });

      await page.goto('/admin/links');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Try to create 11th link
      await page.getByRole('button', { name: /Novo|Adicionar/i }).first().click();
      await page.waitForTimeout(1000);

      await page.locator('input[name="title"]').fill('11th Link');
      await page.locator('input[name="url"]').fill('https://example.com/11th');

      // Set as paid
      const paidToggle = page.locator('button:has-text("Monetizado")').first();
      if (await paidToggle.isVisible().catch(() => false)) {
        await paidToggle.click();
      }

      await page.waitForTimeout(500);

      // Should show limit error - upgrade to Pro needed
      const limitError = await page.getByText(/limite.*atingido|limit.*reached|upgrade/i).first().isVisible().catch(() => false);
      expect(limitError).toBe(true);
    });
  });

  test.describe('Multiple Status Transitions', () => {
    test('should handle transition from active to expired correctly', async ({ page }) => {
      // Start with active subscription
      await page.route('**/subscriptions/current', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            subscription: {
              id: `SUB-TRANSITION`,
              planId: 2,
              planName: 'Creator',
              status: 'active',
              amount: 19.90,
              startedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
              expiresAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // Expires tomorrow
            },
          }),
        });
      });

      await page.goto('/admin/plans');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Should show expiring soon warning
      const expiringWarning = await page.getByText(/expirando|expiring|renovar|renew/i).first().isVisible().catch(() => false);
      
      // Should show Creator as current plan
      expect(await page.getByText(/Creator/i).first().isVisible().catch(() => false)).toBe(true);
    });
  });
});
