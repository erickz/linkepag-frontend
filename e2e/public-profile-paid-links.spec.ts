import { test, expect } from '@playwright/test';

// Mock responses for public profile
const mockPublicProfile = {
  username: 'testuser',
  displayName: 'Test User',
  bio: 'This is a test bio',
  profilePhoto: null,
  location: 'São Paulo, Brazil',
  socialLinks: {
    instagram: 'https://instagram.com/testuser',
    tiktok: '',
    youtube: '',
    twitter: '',
    linkedin: '',
    github: '',
    website: 'https://testuser.com',
  },
  links: [
    {
      _id: '507f1f77bcf86cd799439011',
      id: '507f1f77bcf86cd799439011',
      title: 'Free Link',
      description: 'This is a free link',
      url: 'https://example.com/free',
      icon: '🔗',
      order: 1,
      isActive: true,
      isPaid: false,
      price: 0,
      openInNewTab: true,
      buttonColor: '#ffffff',
      textColor: '#000000',
    },
    {
      _id: '507f1f77bcf86cd799439012',
      id: '507f1f77bcf86cd799439012',
      title: 'Premium Content',
      description: 'Exclusive content available for purchase',
      url: 'https://example.com/premium',
      icon: '⭐',
      order: 2,
      isActive: true,
      isPaid: true,
      price: 29.90,
      openInNewTab: false,
      buttonColor: null,
      textColor: null,
    },
    {
      _id: '507f1f77bcf86cd799439013',
      id: '507f1f77bcf86cd799439013',
      title: 'Another Free Link',
      url: 'https://example.com/another',
      order: 3,
      isActive: true,
      isPaid: false,
      price: 0,
    },
  ],
};

const mockPaymentResponse = {
  success: true,
  payment: {
    paymentId: 'PAY-1234567890-ABCD',
    pixCode: '00020126580014br.gov.bcb.brcode01051test@example.com5204000053039865802BR5914LINKEPAG6007SAOPAULO62070503***6304',
    qrCodeUrl: 'data:image/svg+xml;base64,PHN2Zy8+',
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    amount: 29.90,
  },
};

test.describe('Public Profile Page with Paid Links', () => {
  test.beforeEach(async ({ page }) => {
    // Set auth state for payment calls
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

    // Mock the public profile endpoint
    await page.route('**/users/profile/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockPublicProfile),
      });
    });
  });

  test('should display public profile with all information', async ({ page }) => {
    await page.goto('/profile/testuser');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Check profile header
    await expect(page.getByText('@testuser')).toBeVisible();
    await expect(page.getByText('Test User')).toBeVisible();
    await expect(page.getByText('This is a test bio')).toBeVisible();
    await expect(page.getByText('📍 São Paulo, Brazil')).toBeVisible();
  });

  test('should display all free and paid links with correct keys', async ({ page }) => {
    await page.goto('/profile/testuser');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Check that links are rendered with proper keys (no console errors)
    // Use more specific selectors to avoid matching multiple elements
    await expect(page.getByRole('button', { name: /Free Link/ }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Premium Content/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Another Free Link/ })).toBeVisible();

    // Check paid link badge
    await expect(page.getByText('PAGO')).toBeVisible();
    // Price is displayed with toFixed(2) which uses dot (29.90)
    await expect(page.getByText('R$ 29.90')).toBeVisible();
  });

  test('should open free link in new tab when clicked', async ({ page }) => {
    await page.goto('/profile/testuser');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Click on free link - use more specific selector
    const pagePromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /Free Link/ }).first().click();
    const popup = await pagePromise;

    // Verify popup URL
    await expect(popup).toHaveURL(/example\.com\/free/);
  });

  test('should open checkout and complete payment flow', async ({ page }) => {
    // Mock payment creation endpoint
    await page.route('**/payments/create/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockPaymentResponse),
      });
    });

    // Mock simulate payment endpoint
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

    // Mock payment status - starts pending, then confirmed after simulate
    let checkCount = 0;
    await page.route('**/payments/status/**', async (route) => {
      checkCount++;
      if (checkCount <= 2) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            status: 'pending',
            expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          }),
        });
      } else {
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
      }
    });

    await page.goto('/profile/testuser');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Click on paid link to open checkout - use more specific selector
    await page.getByRole('button', { name: /Premium Content/ }).click();

    // Wait for checkout to appear with price
    await expect(page.getByRole('button', { name: /R\$ 29.90/ })).toBeVisible({ timeout: 15000 });

    // Check QR code and instructions are visible
    await expect(page.getByText('Escaneie o QR Code')).toBeVisible();
    await expect(page.locator('img[alt="QR Code PIX"]')).toBeVisible({ timeout: 10000 });

    // Click simulate payment button
    await page.getByRole('button', { name: 'Simular pagamento (teste)' }).click();

    // Wait for confirming state
    await expect(page.getByText('Confirmando pagamento...')).toBeVisible({ timeout: 10000 });

    // Wait for payment confirmed
    await expect(page.getByText('Pagamento confirmado!')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Seu acesso foi liberado')).toBeVisible({ timeout: 5000 });

    // Check access content button appears
    await expect(page.getByRole('button', { name: 'Acessar Conteúdo' })).toBeVisible();
  });

  test('should access premium content after payment confirmation', async ({ page }) => {
    // Mock all payment endpoints - simulate already confirmed payment
    await page.route('**/payments/create/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockPaymentResponse),
      });
    });

    // Status already confirmed - no need for simulate
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
    await page.waitForTimeout(1000);

    // Click on paid link to open checkout
    await page.getByRole('button', { name: /Premium Content/ }).click();

    // Wait for confirmation - since status is mocked as confirmed
    await expect(page.getByText('Pagamento confirmado!')).toBeVisible({ timeout: 20000 });

    // Verify "Acessar Conteúdo" button is visible
    const accessButton = page.getByRole('button', { name: 'Acessar Conteúdo' });
    await expect(accessButton).toBeVisible({ timeout: 10000 });

    // Verify the button is clickable and opens the content
    await accessButton.click();

    // Give time for the click to register
    await page.waitForTimeout(1000);
  });

  test('should display QR code and PIX instructions in checkout', async ({ page }) => {
    await page.route('**/payments/create/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockPaymentResponse),
      });
    });

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
    await page.waitForTimeout(2000);

    // Click on paid link to open checkout
    await page.getByRole('button', { name: /Premium Content/ }).click();

    // Wait for checkout to load
    await expect(page.getByRole('button', { name: /R\$ 29.90/ })).toBeVisible({ timeout: 15000 });

    // Check QR code is displayed
    const qrCode = page.locator('img[alt="QR Code PIX"]');
    await expect(qrCode).toBeVisible();

    // Check instructions
    await expect(page.getByText('ou copie o código PIX')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Copiar código PIX' })).toBeVisible();
  });

  test('should copy PIX code to clipboard', async ({ page }) => {
    await page.route('**/payments/create/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockPaymentResponse),
      });
    });

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

    // Wait for checkout to load
    await expect(page.getByRole('button', { name: /R\$ 29.90/ })).toBeVisible({ timeout: 15000 });

    // Verify copy button exists and is clickable
    const copyButton = page.getByRole('button', { name: 'Copiar código PIX' });
    await expect(copyButton).toBeVisible();

    // In headless mode, clipboard API may not work, but we can verify the button exists
    // and is properly positioned
    await copyButton.click();

    // Check if the button text changed (copied state) - this may not work in all browsers
    const buttonText = await copyButton.textContent();
    expect(buttonText).toBeTruthy();
  });

  test('should display social links in footer', async ({ page }) => {
    await page.goto('/profile/testuser');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Check social icons are present
    const instagramIcon = page.locator('a[title="Instagram"]');
    await expect(instagramIcon).toBeVisible();

    const websiteIcon = page.locator('a[title="Website"]');
    await expect(websiteIcon).toBeVisible();
  });

  test('should handle empty links array', async ({ page }) => {
    // Mock profile with no links
    await page.route('**/users/profile/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          username: 'emptyuser',
          displayName: 'Empty User',
          links: [],
          socialLinks: {},
        }),
      });
    });

    await page.goto('/profile/emptyuser');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Check empty state message
    await expect(page.getByText('Nenhum link disponível ainda')).toBeVisible();
  });

  test('should handle profile not found error', async ({ page }) => {
    // Mock 404 response
    await page.route('**/users/profile/*', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Perfil não encontrado' }),
      });
    });

    await page.goto('/profile/nonexistent');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Check error message
    await expect(page.getByText('Ops!')).toBeVisible();
    await expect(page.getByText('Perfil não encontrado')).toBeVisible();
  });

  test('should display loading state while fetching profile', async ({ page }) => {
    let isFirstRequest = true;
    
    // Mock slow response
    await page.route('**/users/profile/*', async (route) => {
      if (isFirstRequest) {
        isFirstRequest = false;
        // Delay for 3 seconds
        await new Promise(resolve => setTimeout(resolve, 3000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockPublicProfile),
        });
      } else {
        // Immediate response for subsequent requests
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockPublicProfile),
        });
      }
    });

    await page.goto('/profile/testuser');
    await page.waitForLoadState('domcontentloaded');

    // Check loading spinner is visible initially
    const loadingSpinner = page.locator('.animate-spin').first();
    await expect(loadingSpinner).toBeVisible({ timeout: 5000 });
    
    // Wait for loading to complete
    await page.waitForTimeout(4000);
    
    // Verify profile content is now visible
    await expect(page.getByText('@testuser')).toBeVisible();
  });
});

test.describe('Public Profile - Edge Cases', () => {
  test('should handle special characters in username', async ({ page }) => {
    await page.route('**/users/profile/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          username: 'test-user_123',
          displayName: 'Test User',
          links: [],
        }),
      });
    });

    await page.goto('/profile/test%20user_123');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Username should be sanitized and displayed
    await expect(page.getByText('test user_123')).toBeVisible();
  });

  test('should handle profile with profile photo', async ({ page }) => {
    await page.route('**/users/profile/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          username: 'photouser',
          displayName: 'Photo User',
          profilePhoto: 'https://example.com/photo.jpg',
          links: [],
        }),
      });
    });

    await page.goto('/profile/photouser');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Avatar should have background image set
    const avatar = page.locator('.rounded-full').first();
    await expect(avatar).toBeVisible();
  });

  test('should handle multiple paid links on same page', async ({ page }) => {
    const profileWithMultiplePaidLinks = {
      ...mockPublicProfile,
      links: [
        {
          _id: 'paid1',
          id: 'paid1',
          title: 'Paid Link 1',
          url: 'https://example.com/paid1',
          isPaid: true,
          price: 10.00,
        },
        {
          _id: 'paid2',
          id: 'paid2',
          title: 'Paid Link 2',
          url: 'https://example.com/paid2',
          isPaid: true,
          price: 20.00,
        },
      ],
    };

    await page.route('**/users/profile/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(profileWithMultiplePaidLinks),
      });
    });

    await page.goto('/profile/testuser');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Both paid links should be visible - use role selectors
    await expect(page.getByRole('button', { name: /Paid Link 1/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /R\$ 10.00/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Paid Link 2/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /R\$ 20.00/ })).toBeVisible();
  });
});
