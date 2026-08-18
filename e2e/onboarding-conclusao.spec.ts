import { test, expect } from '@playwright/test';

test.describe('Onboarding - Conclusão', () => {
  const testTimestamp = Date.now();
  const testPassword = 'TestPassword123';
  let testEmail: string;
  let token: string;

  test.beforeAll(async ({ request }, testInfo) => {
    testEmail = `conclusaotest${testTimestamp}w${testInfo.workerIndex}@example.com`;

    const registerRes = await request.post('http://localhost:3001/auth/register', {
      data: {
        fullName: 'Conclusao Test User',
        email: testEmail,
        password: testPassword,
      },
    });

    const body = await registerRes.json();
    token = body.token;

    // Preenche perfil com Instagram e TikTok
    await request.patch('http://localhost:3001/users/profile', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        displayName: 'Conclusao User',
        socialLinks: {
          instagram: 'https://instagram.com/meinstagram',
          tiktok: 'https://tiktok.com/@metiktok',
        },
      },
    });
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').fill(testPassword);
    await page.getByRole('button', { name: 'Entrar' }).click();

    await page.waitForTimeout(3000);
  });

  test('prioriza Instagram como botao principal e mantem TikTok/WhatsApp secundarios', async ({ page }) => {
    await page.goto('/admin/onboarding/conclusao');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Botão principal deve ser Instagram
    const primaryButton = page.locator('button:has-text("Copiar link e abrir Instagram")').first();
    await expect(primaryButton).toBeVisible();

    // TikTok deve aparecer como secundário
    await expect(page.locator('button:has-text("Copiar link e abrir TikTok")')).toBeVisible();

    // WhatsApp deve aparecer como secundário
    await expect(page.locator('button:has-text("Compartilhar no WhatsApp")')).toBeVisible();

    // Não deve ter mais uma seção separada de "Divulgue também no WhatsApp"
    await expect(page.locator('h3:has-text("Divulgue também no WhatsApp")')).toBeHidden();
  });

  test('fallback para WhatsApp quando nao ha redes sociais', async ({ page, request }) => {
    // Remove redes sociais
    await request.patch('http://localhost:3001/users/profile', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        socialLinks: {
          instagram: '',
          tiktok: '',
        },
      },
    });

    await page.goto('/admin/onboarding/conclusao');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Botão principal deve ser WhatsApp
    await expect(page.locator('button:has-text("Compartilhar no WhatsApp")').first()).toBeVisible();

    // Não deve ter botões de Instagram/TikTok
    await expect(page.locator('button:has-text("Copiar link e abrir Instagram")')).toBeHidden();
    await expect(page.locator('button:has-text("Copiar link e abrir TikTok")')).toBeHidden();
  });
});
