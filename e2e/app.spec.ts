import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.BACKEND_URL || 'http://localhost:3001';

test.describe('Login Page (e2e)', () => {
  test('should display login form correctly', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    // Wait a bit for auth to load
    await page.waitForTimeout(1000);
    await expect(page.getByRole('heading', { name: 'Bem-vindo de volta' })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
  });

  test('should navigate to register page when clicking create account link', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await page.getByRole('link', { name: 'Criar conta' }).click();
    await page.waitForURL(/\/register/, { timeout: 10000 });
  });
});

test.describe('Register Page (e2e)', () => {
  test('should display register form correctly', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('domcontentloaded');
    // Wait a bit for auth to load
    await page.waitForTimeout(1000);
    await expect(page.getByRole('heading', { name: 'Crie sua conta' })).toBeVisible();
    await expect(page.locator('input[type="text"]').first()).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="text"]').nth(1)).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Criar minha conta' })).toBeVisible();
  });

  test('should navigate to login page when clicking enter link', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await page.getByRole('link', { name: 'Entrar' }).click();
    await page.waitForURL(/\/login/, { timeout: 10000 });
  });
});
