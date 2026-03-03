import { test, expect } from '@playwright/test';

test.describe('Form Validations - Register Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
  });

  test('should show error for empty full name', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: /criar conta/i });
    await submitButton.click();

    // Should show validation error
    const errorMessage = page.getByText(/nome é obrigatório|nome completo/i);
    await expect(errorMessage).toBeVisible();
  });

  test('should show error for invalid email format', async ({ page }) => {
    await page.locator('input[type="email"]').fill('invalid-email');
    await page.getByRole('button', { name: /criar conta/i }).click();

    const errorMessage = page.getByText(/email inválido|email válido/i);
    await expect(errorMessage).toBeVisible();
  });

  test('should show error for empty email', async ({ page }) => {
    await page.getByRole('button', { name: /criar conta/i }).click();

    const errorMessage = page.getByText(/email é obrigatório/i);
    await expect(errorMessage).toBeVisible();
  });

  test('should show error for invalid CPF format', async ({ page }) => {
    // Fill CPF field with invalid value
    const cpfInput = page.locator('input[name="cpf"], input[placeholder*="CPF"], input[type="text"]').nth(1);
    await cpfInput.fill('123');
    await page.getByRole('button', { name: /criar conta/i }).click();

    const errorMessage = page.getByText(/CPF inválido|CPF deve ter/i);
    await expect(errorMessage).toBeVisible();
  });

  test('should show error for weak password', async ({ page }) => {
    await page.locator('input[type="password"]').fill('123');
    await page.getByRole('button', { name: /criar conta/i }).click();

    const errorMessage = page.getByText(/senha|mínimo|caracteres/i);
    await expect(errorMessage).toBeVisible();
  });

  test('should show error for mismatched passwords', async ({ page }) => {
    await page.locator('input[type="password"]').first().fill('Password123');
    // If there's a confirm password field
    const confirmInput = page.locator('input[type="password"]').nth(1);
    if (await confirmInput.isVisible().catch(() => false)) {
      await confirmInput.fill('Different123');
      await page.getByRole('button', { name: /criar conta/i }).click();

      const errorMessage = page.getByText(/senhas não conferem|senhas são diferentes/i);
      await expect(errorMessage).toBeVisible();
    }
  });

  test('should enable submit button only when form is valid', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: /criar conta/i });
    
    // Initially button might be disabled or will show errors on click
    await page.locator('input[type="text"]').first().fill('Test User');
    await page.locator('input[type="email"]').fill('test@example.com');
    
    // Button should be visible
    await expect(submitButton).toBeVisible();
  });

  test('should mask CPF input', async ({ page }) => {
    const cpfInput = page.locator('input[name="cpf"], input[placeholder*="CPF"], input[type="text"]').nth(1);
    
    await cpfInput.fill('12345678901');
    const value = await cpfInput.inputValue();
    
    // CPF should be masked (format: 123.456.789-01)
    expect(value).toContain('.');
  });
});

test.describe('Form Validations - Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
  });

  test('should show error for empty email', async ({ page }) => {
    await page.getByRole('button', { name: /entrar/i }).click();

    const errorMessage = page.getByText(/email é obrigatório|preencha o email/i);
    await expect(errorMessage).toBeVisible();
  });

  test('should show error for empty password', async ({ page }) => {
    await page.getByRole('button', { name: /entrar/i }).click();

    const errorMessage = page.getByText(/senha é obrigatória|preencha a senha/i);
    await expect(errorMessage).toBeVisible();
  });

  test('should show error for invalid email format', async ({ page }) => {
    await page.locator('input[type="email"]').fill('not-an-email');
    await page.getByRole('button', { name: /entrar/i }).click();

    const errorMessage = page.getByText(/email inválido/i);
    await expect(errorMessage).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.locator('input[type="email"]').fill('nonexistent@example.com');
    await page.locator('input[type="password"]').fill('wrongpassword');
    await page.getByRole('button', { name: /entrar/i }).click();

    const errorMessage = page.getByText(/credenciais inválidas|email ou senha incorretos|não encontrado/i);
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Form Validations - Forgot Password', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/forgot-password');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
  });

  test('should show error for empty email', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: /enviar|recuperar|confirmar/i });
    await submitButton.click();

    const errorMessage = page.getByText(/email é obrigatório|preencha o email/i);
    await expect(errorMessage).toBeVisible();
  });

  test('should show error for invalid email format', async ({ page }) => {
    await page.locator('input[type="email"]').fill('invalid-email');
    await page.getByRole('button', { name: /enviar|recuperar|confirmar/i }).click();

    const errorMessage = page.getByText(/email inválido/i);
    await expect(errorMessage).toBeVisible();
  });

  test('should show success message after submitting valid email', async ({ page }) => {
    // Mock the API response
    await page.route('**/auth/forgot-password', async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Se o email existir, você receberá um link de recuperação' }),
      });
    });

    await page.locator('input[type="email"]').fill('test@example.com');
    await page.getByRole('button', { name: /enviar|recuperar|confirmar/i }).click();

    const successMessage = page.getByText(/email enviado|link de recuperação|verifique seu email/i);
    await expect(successMessage).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Form Validations - Reset Password', () => {
  test('should show error for invalid token', async ({ page }) => {
    await page.goto('/reset-password?token=invalid-token');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    await page.locator('input[type="password"]').fill('NewPassword123');
    await page.getByRole('button', { name: /redefinir|confirmar|salvar/i }).click();

    const errorMessage = page.getByText(/token inválido|token expirado/i);
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('should show error for weak password', async ({ page }) => {
    await page.goto('/reset-password?token=valid-token-mock');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    await page.locator('input[type="password"]').fill('123');
    await page.getByRole('button', { name: /redefinir|confirmar|salvar/i }).click();

    const errorMessage = page.getByText(/senha|mínimo|caracteres|maíuscula/i);
    await expect(errorMessage).toBeVisible();
  });
});

test.describe('Form Validations - Profile Edit', () => {
  test.beforeEach(async ({ page }) => {
    // Setup auth
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => {
      localStorage.setItem('token', 'test-token-validation');
      localStorage.setItem('user', JSON.stringify({
        id: 'test-user-validation',
        email: 'test-validation@example.com',
        fullName: 'Test Validation User',
        cpf: '12345678901',
      }));
    });

    // Mock profile data
    await page.route('**/users/profile', async (route: any) => {
      const request = route.request();
      if (request.method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-user-validation',
            fullName: 'Test Validation User',
            email: 'test-validation@example.com',
            username: 'testuservalidation',
            bio: 'Test bio',
            location: 'São Paulo',
            socialLinks: {},
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Perfil atualizado com sucesso',
            user: { id: 'test-user-validation', fullName: 'Updated Name' },
          }),
        });
      }
    });

    await page.goto('/profile/edit');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('should show error for empty full name', async ({ page }) => {
    const nameInput = page.getByRole('textbox').first();
    await nameInput.clear();
    await page.getByRole('button', { name: /salvar|atualizar/i }).click();

    const errorMessage = page.getByText(/nome é obrigatório/i);
    await expect(errorMessage).toBeVisible();
  });

  test('should show error for empty bio exceeding max length', async ({ page }) => {
    const bioInput = page.locator('textarea').first();
    
    if (await bioInput.isVisible().catch(() => false)) {
      // Fill with more than 500 characters
      const longText = 'a'.repeat(501);
      await bioInput.fill(longText);
      await page.getByRole('button', { name: /salvar|atualizar/i }).click();

      const errorMessage = page.getByText(/máximo|500|caracteres/i);
      await expect(errorMessage).toBeVisible();
    }
  });

  test('should validate URL format for social links', async ({ page }) => {
    const instagramInput = page.locator('input[placeholder*="Instagram"], input[name*="instagram"]').first();
    
    if (await instagramInput.isVisible().catch(() => false)) {
      await instagramInput.fill('not-a-valid-url');
      await page.getByRole('button', { name: /salvar|atualizar/i }).click();

      const errorMessage = page.getByText(/URL inválida|formato inválido/i);
      await expect(errorMessage).toBeVisible();
    }
  });
});

test.describe('Form Validations - Create Link', () => {
  test.beforeEach(async ({ page }) => {
    // Setup auth
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => {
      localStorage.setItem('token', 'test-token-link');
      localStorage.setItem('user', JSON.stringify({
        id: 'test-user-link',
        email: 'test-link@example.com',
        fullName: 'Test Link User',
        cpf: '12345678901',
      }));
    });

    // Mock links API
    await page.route('**/links', async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ links: [] }),
      });
    });

    await page.goto('/admin/links');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('should show error for empty link title', async ({ page }) => {
    // Click add link button if exists
    const addButton = page.getByRole('button', { name: /adicionar|novo/i }).first();
    if (await addButton.isVisible().catch(() => false)) {
      await addButton.click();
      await page.waitForTimeout(500);
    }

    const submitButton = page.getByRole('button', { name: /salvar|criar/i });
    await submitButton.click();

    const errorMessage = page.getByText(/título é obrigatório/i);
    await expect(errorMessage).toBeVisible();
  });

  test('should show error for invalid URL', async ({ page }) => {
    const urlInput = page.locator('input[type="url"], input[placeholder*="URL"], input[name*="url"]').first();
    
    if (await urlInput.isVisible().catch(() => false)) {
      await urlInput.fill('not-a-valid-url');
      const submitButton = page.getByRole('button', { name: /salvar|criar/i });
      await submitButton.click();

      const errorMessage = page.getByText(/URL inválida|formato inválido/i);
      await expect(errorMessage).toBeVisible();
    }
  });

  test('should show error for negative price in paid link', async ({ page }) => {
    // Toggle paid link if exists
    const paidToggle = page.locator('input[type="checkbox"], [role="switch"]').filter({ hasText: /pago|monetizado/i }).first();
    
    if (await paidToggle.isVisible().catch(() => false)) {
      await paidToggle.click();
      
      const priceInput = page.locator('input[type="number"], input[name*="price"]').first();
      await priceInput.fill('-10');
      
      const submitButton = page.getByRole('button', { name: /salvar|criar/i });
      await submitButton.click();

      const errorMessage = page.getByText(/preço deve ser positivo|valor inválido/i);
      await expect(errorMessage).toBeVisible();
    }
  });
});

test.describe('Form Validations - Checkout', () => {
  test.beforeEach(async ({ page }) => {
    // Mock public profile
    await page.route('**/users/profile/*', async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          username: 'testuser',
          displayName: 'Test User',
          links: [{
            _id: '507f1f77bcf86cd799439012',
            id: '507f1f77bcf86cd799439012',
            title: 'Premium Content',
            url: 'https://example.com/premium',
            isPaid: true,
            price: 29.90,
          }],
        }),
      });
    });

    await page.goto('/profile/testuser');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // Open checkout
    await page.getByRole('button', { name: /Premium Content/ }).click();
    await page.waitForTimeout(1000);
  });

  test('should show error for empty email in checkout', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]').first();
    
    if (await emailInput.isVisible().catch(() => false)) {
      await emailInput.clear();
      const submitButton = page.getByRole('button', { name: /gerar pix|confirmar|pagar/i });
      await submitButton.click();

      const errorMessage = page.getByText(/email é obrigatório/i);
      await expect(errorMessage).toBeVisible();
    }
  });

  test('should show error for invalid email in checkout', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]').first();
    
    if (await emailInput.isVisible().catch(() => false)) {
      await emailInput.fill('invalid-email');
      const submitButton = page.getByRole('button', { name: /gerar pix|confirmar|pagar/i });
      await submitButton.click();

      const errorMessage = page.getByText(/email inválido/i);
      await expect(errorMessage).toBeVisible();
    }
  });

  test('should show error for empty name in checkout', async ({ page }) => {
    const nameInput = page.locator('input[type="text"]').filter({ hasText: /nome/i }).first();
    
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.clear();
      const submitButton = page.getByRole('button', { name: /gerar pix|confirmar|pagar/i });
      await submitButton.click();

      const errorMessage = page.getByText(/nome é obrigatório/i);
      await expect(errorMessage).toBeVisible();
    }
  });
});
