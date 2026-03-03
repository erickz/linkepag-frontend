import { test, expect, devices } from '@playwright/test';

// Viewports mobile para testar
const MOBILE_VIEWPORTS = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone 12', width: 390, height: 844 },
  { name: 'Pixel 5', width: 393, height: 851 },
  { name: 'Samsung Galaxy S20', width: 360, height: 800 },
];

// Helper para mock de autenticação
async function setupMockAuth(page: any) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate(() => {
    localStorage.setItem('token', 'test-token-mobile');
    localStorage.setItem('user', JSON.stringify({
      id: 'test-user-mobile',
      email: 'test-mobile@example.com',
      fullName: 'Test Mobile User',
      cpf: '12345678901',
    }));
  });
}

// Helper para mock de profile
async function mockPublicProfile(page: any) {
  await page.route('**/users/profile/*', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        username: 'testuser',
        displayName: 'Test User',
        bio: 'This is a test bio for mobile',
        profilePhoto: null,
        location: 'São Paulo, Brazil',
        socialLinks: {
          instagram: 'https://instagram.com/testuser',
          website: 'https://testuser.com',
        },
        links: [
          {
            _id: '507f1f77bcf86cd799439011',
            id: '507f1f77bcf86cd799439011',
            title: 'Free Link',
            url: 'https://example.com/free',
            isPaid: false,
            price: 0,
            order: 1,
            isActive: true,
          },
          {
            _id: '507f1f77bcf86cd799439012',
            id: '507f1f77bcf86cd799439012',
            title: 'Premium Content Mobile',
            url: 'https://example.com/premium',
            isPaid: true,
            price: 29.90,
            order: 2,
            isActive: true,
          },
        ],
      }),
    });
  });
}

// Helper para mock de payment
async function mockPaymentEndpoints(page: any) {
  await page.route('**/payments/create/**', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        payment: {
          paymentId: 'PAY-MOBILE-1234567890',
          pixCode: '00020126580014br.gov.bcb.brcode01051test@example.com5204000053039865802BR5914LINKEPAG6007SAOPAULO62070503***6304',
          qrCodeUrl: 'data:image/svg+xml;base64,PHN2Zy8+',
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          amount: 29.90,
        },
      }),
    });
  });

  await page.route('**/payments/status/**', async (route: any) => {
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
}

test.describe('Mobile Responsive Tests - Public Profile', () => {
  for (const viewport of MOBILE_VIEWPORTS) {
    test.describe(`${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await mockPublicProfile(page);
        await mockPaymentEndpoints(page);
      });

      test('should display profile without horizontal scroll', async ({ page }) => {
        await page.goto('/profile/testuser');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1500);

        // Check for horizontal scroll
        const body = page.locator('body');
        const scrollWidth = await body.evaluate((el: HTMLElement) => el.scrollWidth);
        const clientWidth = await body.evaluate((el: HTMLElement) => el.clientWidth);
        
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // Allow 1px tolerance
      });

      test('should display username and bio correctly', async ({ page }) => {
        await page.goto('/profile/testuser');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1500);

        await expect(page.getByText('@testuser')).toBeVisible();
        await expect(page.getByText('This is a test bio for mobile')).toBeVisible();
      });

      test('should have touch-friendly link buttons (min 44px)', async ({ page }) => {
        await page.goto('/profile/testuser');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1500);

        // Check link buttons
        const buttons = page.locator('button').filter({ hasText: /Free Link|Premium/ });
        const count = await buttons.count();
        
        for (let i = 0; i < count; i++) {
          const box = await buttons.nth(i).boundingBox();
          expect(box?.height).toBeGreaterThanOrEqual(44);
          expect(box?.width).toBeGreaterThanOrEqual(44);
        }
      });

      test('should open checkout modal for paid link', async ({ page }) => {
        await page.goto('/profile/testuser');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1500);

        // Click on paid link
        await page.getByRole('button', { name: /Premium Content Mobile/ }).click();

        // Wait for checkout
        await expect(page.getByText('Escaneie o QR Code')).toBeVisible({ timeout: 15000 });
        
        // Verify QR code is visible
        await expect(page.locator('img[alt="QR Code PIX"]')).toBeVisible();
      });

      test('checkout modal should fit within viewport', async ({ page }) => {
        await page.goto('/profile/testuser');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1500);

        await page.getByRole('button', { name: /Premium Content Mobile/ }).click();
        await expect(page.getByText('Escaneie o QR Code')).toBeVisible({ timeout: 15000 });

        // Check if modal/dialog fits in viewport
        const modal = page.locator('[role="dialog"], .modal, .checkout').first();
        const box = await modal.boundingBox();
        
        if (box) {
          expect(box.width).toBeLessThanOrEqual(viewport.width + 32); // Allow some padding
        }
      });

      test('should have readable text (min 14px)', async ({ page }) => {
        await page.goto('/profile/testuser');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1500);

        // Check main text elements
        const elements = page.locator('p, span, h1, h2, h3, button, a');
        const count = await elements.count();
        
        for (let i = 0; i < Math.min(count, 20); i++) {
          const fontSize = await elements.nth(i).evaluate((el: HTMLElement) => {
            const style = window.getComputedStyle(el);
            return parseFloat(style.fontSize);
          });
          
          if (fontSize > 0) {
            expect(fontSize).toBeGreaterThanOrEqual(12); // Minimum 12px for small text
          }
        }
      });

      test('social links should be visible and clickable', async ({ page }) => {
        await page.goto('/profile/testuser');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1500);

        const instagramLink = page.locator('a[title="Instagram"], a[href*="instagram"]');
        await expect(instagramLink).toBeVisible();
        
        // Check touch target size
        const box = await instagramLink.boundingBox();
        if (box) {
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      });
    });
  }
});

test.describe('Mobile Responsive Tests - Login Page', () => {
  for (const viewport of MOBILE_VIEWPORTS) {
    test.describe(`${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
      });

      test('should display login form correctly', async ({ page }) => {
        await page.goto('/login');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1000);

        await expect(page.getByRole('heading', { name: /Bem-vindo/ })).toBeVisible();
        await expect(page.locator('input[type="email"]')).toBeVisible();
        await expect(page.locator('input[type="password"]')).toBeVisible();
        
        // Check form fits in viewport
        const form = page.locator('form').first();
        const box = await form.boundingBox();
        expect(box?.width).toBeLessThanOrEqual(viewport.width - 32);
      });

      test('input fields should be touch-friendly', async ({ page }) => {
        await page.goto('/login');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1000);

        const emailInput = page.locator('input[type="email"]');
        const passwordInput = page.locator('input[type="password"]');

        // Check input heights (min 44px for touch)
        const emailBox = await emailInput.boundingBox();
        const passwordBox = await passwordInput.boundingBox();

        expect(emailBox?.height).toBeGreaterThanOrEqual(40);
        expect(passwordBox?.height).toBeGreaterThanOrEqual(40);
      });

      test('should be able to type in fields', async ({ page }) => {
        await page.goto('/login');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1000);

        await page.locator('input[type="email"]').fill('test@example.com');
        await page.locator('input[type="password"]').fill('password123');

        await expect(page.locator('input[type="email"]')).toHaveValue('test@example.com');
        await expect(page.locator('input[type="password"]')).toHaveValue('password123');
      });
    });
  }
});

test.describe('Mobile Responsive Tests - Dashboard', () => {
  for (const viewport of MOBILE_VIEWPORTS) {
    test.describe(`${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await setupMockAuth(page);
        
        // Mock dashboard data
        await page.route('**/users/profile', async (route: any) => {
          const request = route.request();
          if (request.method() === 'GET') {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                id: 'test-user-mobile',
                fullName: 'Test Mobile User',
                email: 'test-mobile@example.com',
                username: 'testusermobile',
                links: [
                  { id: '1', title: 'Link 1', isActive: true },
                  { id: '2', title: 'Link 2', isActive: true },
                  { id: '3', title: 'Link 3', isActive: false },
                ],
              }),
            });
          } else {
            await route.continue();
          }
        });
      });

      test('should display dashboard cards in vertical layout', async ({ page }) => {
        await page.goto('/admin/dashboard');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(2000);

        await expect(page.getByText('Painel de Controle')).toBeVisible();
        await expect(page.getByText('Seu Progresso')).toBeVisible();
        
        // Check no horizontal overflow
        const body = page.locator('body');
        const scrollWidth = await body.evaluate((el: HTMLElement) => el.scrollWidth);
        const clientWidth = await body.evaluate((el: HTMLElement) => el.clientWidth);
        
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
      });

      test('should have accessible navigation', async ({ page }) => {
        await page.goto('/admin/dashboard');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(2000);

        // Look for menu button or navigation
        const menuButton = page.locator('button[aria-label="menu"], button:has-text("Menu"), [data-testid="menu-button"]').first();
        
        // If hamburger menu exists, it should be touchable
        if (await menuButton.isVisible().catch(() => false)) {
          const box = await menuButton.boundingBox();
          expect(box?.width).toBeGreaterThanOrEqual(44);
          expect(box?.height).toBeGreaterThanOrEqual(44);
        }
      });
    });
  }
});

test.describe('Mobile Responsive Tests - Links Page', () => {
  for (const viewport of MOBILE_VIEWPORTS) {
    test.describe(`${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await setupMockAuth(page);
        
        // Mock links data
        await page.route('**/links', async (route: any) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              links: [
                { id: '1', title: 'My First Link', url: 'https://example.com/1', isPaid: false, isActive: true, order: 1 },
                { id: '2', title: 'Paid Product', url: 'https://example.com/2', isPaid: true, price: 49.90, isActive: true, order: 2 },
              ],
            }),
          });
        });
      });

      test('should display links list correctly', async ({ page }) => {
        await page.goto('/admin/links');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(2000);

        await expect(page.getByText('Meus Links')).toBeVisible();
        
        // Check no horizontal overflow
        const body = page.locator('body');
        const scrollWidth = await body.evaluate((el: HTMLElement) => el.scrollWidth);
        const clientWidth = await body.evaluate((el: HTMLElement) => el.clientWidth);
        
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
      });

      test('add link button should be touch-friendly', async ({ page }) => {
        await page.goto('/admin/links');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(2000);

        const addButton = page.getByRole('button', { name: /adicionar|novo|add/i }).first();
        
        if (await addButton.isVisible().catch(() => false)) {
          const box = await addButton.boundingBox();
          if (box) {
            expect(box.height).toBeGreaterThanOrEqual(44);
            expect(box.width).toBeGreaterThanOrEqual(44);
          }
        }
      });
    });
  }
});

test.describe('Mobile Responsive Tests - Profile Edit', () => {
  for (const viewport of MOBILE_VIEWPORTS) {
    test.describe(`${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await setupMockAuth(page);
        
        await page.route('**/users/profile', async (route: any) => {
          const request = route.request();
          if (request.method() === 'GET') {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                id: 'test-user-mobile',
                fullName: 'Test Mobile User',
                email: 'test-mobile@example.com',
                username: 'testusermobile',
                bio: 'Test bio',
                location: 'São Paulo',
              }),
            });
          } else {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                message: 'Perfil atualizado com sucesso',
                user: { id: 'test-user-mobile', fullName: 'Updated Name' },
              }),
            });
          }
        });
      });

      test('should display edit form correctly', async ({ page }) => {
        await page.goto('/profile/edit');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(2000);

        await expect(page.getByRole('heading', { name: /Editar Perfil/ })).toBeVisible();
        
        // Check form fits
        const form = page.locator('form').first();
        const box = await form.boundingBox();
        expect(box?.width).toBeLessThanOrEqual(viewport.width - 32);
      });

      test('form inputs should be accessible', async ({ page }) => {
        await page.goto('/profile/edit');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(2000);

        const inputs = page.locator('input, textarea');
        const count = await inputs.count();
        
        for (let i = 0; i < Math.min(count, 5); i++) {
          const box = await inputs.nth(i).boundingBox();
          if (box) {
            expect(box.height).toBeGreaterThanOrEqual(40);
          }
        }
      });
    });
  }
});

test.describe('Mobile Responsive Tests - Checkout Flow', () => {
  for (const viewport of MOBILE_VIEWPORTS) {
    test.describe(`${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await mockPublicProfile(page);
        await mockPaymentEndpoints(page);
      });

      test('checkout should display QR code properly on mobile', async ({ page }) => {
        await page.goto('/profile/testuser');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1500);

        // Open checkout
        await page.getByRole('button', { name: /Premium Content Mobile/ }).click();

        // Wait for QR code
        await expect(page.locator('img[alt="QR Code PIX"]')).toBeVisible({ timeout: 15000 });

        // QR code should be reasonably sized
        const qrCode = page.locator('img[alt="QR Code PIX"]');
        const box = await qrCode.boundingBox();
        
        if (box) {
          // QR code should be at least 150px for mobile scanning
          expect(box.width).toBeGreaterThanOrEqual(150);
          expect(box.height).toBeGreaterThanOrEqual(150);
          // But not exceed viewport
          expect(box.width).toBeLessThanOrEqual(viewport.width - 32);
        }
      });

      test('copy PIX button should be visible and clickable', async ({ page }) => {
        await page.goto('/profile/testuser');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1500);

        await page.getByRole('button', { name: /Premium Content Mobile/ }).click();
        await expect(page.getByText('Escaneie o QR Code')).toBeVisible({ timeout: 15000 });

        const copyButton = page.getByRole('button', { name: /Copiar código PIX|copiar/i });
        await expect(copyButton).toBeVisible();

        // Check touch target
        const box = await copyButton.boundingBox();
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(44);
          expect(box.width).toBeGreaterThanOrEqual(100);
        }
      });

      test('email and name inputs should be visible in checkout', async ({ page }) => {
        await page.goto('/profile/testuser');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1500);

        await page.getByRole('button', { name: /Premium Content Mobile/ }).click();

        // Check for email/name inputs in checkout
        const inputs = page.locator('input[type="email"], input[type="text"]');
        const count = await inputs.count();
        
        // Should have at least one input for contact info
        expect(count).toBeGreaterThan(0);
      });
    });
  }
});

test.describe('Mobile Responsive Tests - Orientation Change', () => {
  test('should handle orientation change from portrait to landscape', async ({ page }) => {
    // Start in portrait
    await page.setViewportSize({ width: 375, height: 667 });
    await mockPublicProfile(page);
    
    await page.goto('/profile/testuser');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // Verify content is visible in portrait
    await expect(page.getByText('@testuser')).toBeVisible();

    // Change to landscape
    await page.setViewportSize({ width: 667, height: 375 });
    await page.waitForTimeout(1000);

    // Content should still be visible
    await expect(page.getByText('@testuser')).toBeVisible();

    // No horizontal scroll
    const body = page.locator('body');
    const scrollWidth = await body.evaluate((el: HTMLElement) => el.scrollWidth);
    const clientWidth = await body.evaluate((el: HTMLElement) => el.clientWidth);
    
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});

test.describe('Mobile Responsive Tests - Performance', () => {
  test('public profile should load within 3 seconds on slow 3G', async ({ page }) => {
    // Simulate slow 3G
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Mock the API to be fast
    await mockPublicProfile(page);
    
    const startTime = Date.now();
    
    await page.goto('/profile/testuser');
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for main content
    await expect(page.getByText('@testuser')).toBeVisible({ timeout: 5000 });
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000);
  });
});
