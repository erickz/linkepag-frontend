import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.BACKEND_URL || 'http://localhost:3001';

test.describe('Auth Flow - Complete User Journey', () => {
  const testTimestamp = Date.now();
  const testEmail = `testuser${testTimestamp}@example.com`;
  const testUsername = `testuser${testTimestamp}`;
  const testCpf = `${10000000000 + (testTimestamp % 89999999999)}`.slice(0, 11);
  const testPassword = 'TestPassword123';

  test('complete flow: register → login → access dashboard', async ({ page }) => {
    // Step 1: Navigate to register page
    await page.goto('/register');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Verify register form is displayed
    await expect(page.getByRole('heading', { name: 'Crie sua conta' })).toBeVisible();

    // Step 2: Fill registration form
    await page.locator('input[type="text"]').first().fill('Test User Full Name');
    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="text"]').nth(1).fill(testCpf);
    await page.locator('input[type="password"]').fill(testPassword);
    
    // Username might be auto-generated or separate field
    const usernameInput = page.locator('input[name="username"], input[placeholder*="usuário"]').first();
    if (await usernameInput.isVisible().catch(() => false)) {
      await usernameInput.fill(testUsername);
    }

    // Step 3: Submit registration
    await page.getByRole('button', { name: /Criar|Cadastrar|Continuar/i }).click();

    // Wait for registration to complete (redirect or success message)
    await page.waitForTimeout(3000);

    // Should redirect to login or show success
    const currentUrl = page.url();
    expect(currentUrl.includes('/login') || currentUrl.includes('/dashboard')).toBe(true);

    // Step 4: Login with credentials
    if (currentUrl.includes('/login')) {
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);
    }

    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').fill(testPassword);
    
    await page.getByRole('button', { name: 'Entrar' }).click();

    // Wait for login to complete
    await page.waitForTimeout(3000);

    // Step 5: Verify access to protected area (dashboard)
    const postLoginUrl = page.url();
    expect(postLoginUrl.includes('/admin') || postLoginUrl.includes('/dashboard')).toBe(true);

    // Verify dashboard elements
    await expect(page.getByText(/Dashboard|Painel|Bem-vindo/i).first()).toBeVisible({ timeout: 10000 });

    // Step 6: Verify localStorage has auth token
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
    expect(token.length).toBeGreaterThan(10);
  });

  test('should show validation errors for invalid registration data', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Try to submit empty form
    await page.getByRole('button', { name: /Criar|Cadastrar/i }).click();

    // Should show validation errors
    await page.waitForTimeout(1000);
    
    // Check for error messages or validation hints
    const errorVisible = await page.getByText(/obrigatório|required|inválido|invalid/i).first().isVisible().catch(() => false);
    expect(errorVisible).toBe(true);
  });

  test('should show error for invalid login credentials', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Try to login with wrong password
    await page.locator('input[type="email"]').fill(`nonexistent${Date.now()}@example.com`);
    await page.locator('input[type="password"]').fill('wrongpassword');
    
    await page.getByRole('button', { name: 'Entrar' }).click();

    // Wait for error
    await page.waitForTimeout(2000);

    // Should show error message
    const errorVisible = await page.getByText(/inválido|incorrect|não encontrado|not found/i).first().isVisible().catch(() => false);
    expect(errorVisible).toBe(true);
  });

  test('forgot password flow', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Verify forgot password form
    await expect(page.getByRole('heading', { name: /Recuperar|Esqueci|Reset/i })).toBeVisible();

    // Enter email
    await page.locator('input[type="email"]').fill(testEmail);
    
    await page.getByRole('button', { name: /Enviar|Send|Recuperar/i }).click();

    // Wait for response
    await page.waitForTimeout(2000);

    // Should show success message (even if email doesn't exist - security)
    const successVisible = await page.getByText(/enviado|sent|verifique|check/i).first().isVisible().catch(() => false);
    expect(successVisible).toBe(true);
  });

  test('logout flow', async ({ page }) => {
    // First login
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').fill(testPassword);
    await page.getByRole('button', { name: 'Entrar' }).click();

    await page.waitForTimeout(3000);

    // Verify logged in
    let token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();

    // Find and click logout
    const logoutButton = page.getByRole('button', { name: /Sair|Logout|Exit/i });
    if (await logoutButton.isVisible().catch(() => false)) {
      await logoutButton.click();
    } else {
      // Try menu/logout link
      const logoutLink = page.getByRole('link', { name: /Sair|Logout/i });
      if (await logoutLink.isVisible().catch(() => false)) {
        await logoutLink.click();
      }
    }

    await page.waitForTimeout(2000);

    // Verify token is cleared
    token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeFalsy();
  });
});

test.describe('Auth Protection', () => {
  test('should redirect to login when accessing protected route without auth', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    expect(currentUrl.includes('/login')).toBe(true);
  });

  test('should redirect to login when accessing profile edit without auth', async ({ page }) => {
    await page.goto('/profile/edit');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    expect(currentUrl.includes('/login')).toBe(true);
  });
});
