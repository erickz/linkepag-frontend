import { test, expect } from '@playwright/test';

/**
 * Regressão: o backend retornava socialLinks como subdocumento Mongoose
 * ({ $__parent, _doc... }), então o frontend não conseguia ler os valores
 * salvos ao recarregar a página de onboarding.
 */
test('onboarding salva e recupera Instagram/TikTok', async ({ page, request }) => {
  const ts = Date.now();
  const email = `auto${ts}@example.com`;
  const password = 'Teste123!';

  // 1. Registro
  await page.goto('http://localhost:3000/register');
  await page.waitForLoadState('domcontentloaded');
  await page.fill('input[placeholder="João Silva"]', `Teste Auto ${ts}`);
  await page.fill('input[placeholder="seu@email.com"]', email);
  await page.fill('input[placeholder="Mínimo 6 caracteres, 1 maiúscula e 1 número"]', password);
  await page.click('button:has-text("Criar minha conta")');
  await page.waitForURL('**/admin/onboarding', { timeout: 15000 });
  await page.waitForTimeout(1500);

  // 2. Etapa 1
  await page.fill('input[placeholder="Como você quer ser chamado"]', 'Meu Nome');
  await page.fill('input[placeholder="seuusername"]', `auto${ts}`);

  await page.fill('#onboarding-instagram', 'meuinsta');
  await page.locator('#onboarding-instagram').blur();
  await page.waitForTimeout(300);

  await page.fill('#onboarding-tiktok', 'meutiktok');
  await page.locator('#onboarding-tiktok').blur();
  await page.waitForTimeout(300);

  await page.click('button:has-text("Continuar")');
  await page.waitForTimeout(2500);

  // 3. Recupera token e verifica no backend
  const token = await page.evaluate(() => localStorage.getItem('token'));
  const response = await request.get('http://localhost:3001/users/profile', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const profile = await response.json();

  expect(profile.displayName).toBe('Meu Nome');
  expect(profile.socialLinks?.instagram).toContain('meuinsta');
  expect(profile.socialLinks?.tiktok).toContain('meutiktok');

  // 4. Recarrega a página: os campos devem estar preenchidos
  await page.goto('/admin/onboarding');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1500);

  await expect(page.locator('input[placeholder="Como você quer ser chamado"]')).toHaveValue('Meu Nome');
  await expect(page.locator('#onboarding-instagram')).toHaveValue('meuinsta');
  await expect(page.locator('#onboarding-tiktok')).toHaveValue('meutiktok');
});
