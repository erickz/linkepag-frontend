import { test, expect } from '@playwright/test';

/**
 * Onboarding - criação de link (etapa 3)
 *
 * Regressão: para usuários que JÁ possuíam links, o botão "Criar e continuar"
 * apenas finalizava o onboarding (finishOnboarding) sem chamar handleCreateLink —
 * o link preenchido era descartado silenciosamente. Estes testes garantem que
 * o link é persistido de fato no backend.
 */
test.describe('Onboarding - Link Creation', () => {
  const testTimestamp = Date.now();
  const testPassword = 'TestPassword123';
  // Email único por worker: fullyParallel roda beforeAll em mais de um worker
  let testEmail: string;
  let token: string;

  test.beforeAll(async ({ request }, testInfo) => {
    testEmail = `onboardinglinks${testTimestamp}w${testInfo.workerIndex}@example.com`;

    const registerRes = await request.post('http://localhost:3001/auth/register', {
      data: {
        fullName: 'Onboarding Links User',
        email: testEmail,
        password: testPassword,
      },
    });

    const body = await registerRes.json();
    token = body.token;

    // Usuário já começa COM um link (condição do bug: completedSteps inclui 'link')
    const linkRes = await request.post('http://localhost:3001/links', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: 'Link preexistente',
        template: 'direct',
        url: 'https://example.com/preexistente',
        price: 0,
      },
    });

    if (!linkRes.ok()) {
      console.log('Seed link response:', await linkRes.text());
    }
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

  test('should create a new link via onboarding even when user already has links', async ({ page, request }) => {
    await page.goto('/admin/onboarding');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Vai direto para a etapa 3
    await page.getByRole('button', { name: 'Cadastre um link' }).click();
    await page.waitForTimeout(1000);

    // Usuário já tem links -> botão principal deve ser "Finalizar"
    await expect(page.getByRole('button', { name: 'Finalizar' })).toBeVisible();

    // Usuário já tem links -> abre o formulário de novo link
    await page.getByRole('button', { name: 'Criar outro link' }).click();
    await page.waitForTimeout(500);

    // Antes de escolher o template, a ação principal NÃO deve aparecer
    await expect(page.getByRole('button', { name: /Salvar e Finalizar/ })).toBeHidden();

    // Escolhe "Link comum" e preenche
    await page.getByRole('button', { name: /Link comum/ }).click();
    await page.waitForTimeout(500);

    // Com o formulário do template aberto, o botão "Voltar" não deve aparecer
    await expect(page.getByRole('button', { name: 'Voltar' })).toBeHidden();

    await page.locator('input[placeholder*="portfólio"]').fill('Link onboarding e2e');
    await page.locator('input[placeholder="https://seusite.com"]').fill('https://example.com/e2e');

    // O botão deve estar no modo de criação ("Salvar e Finalizar")
    const submitButton = page.getByRole('button', { name: /Salvar e Finalizar/ });
    await expect(submitButton).toBeEnabled({ timeout: 5000 });
    await submitButton.click();

    // Finaliza e redireciona para o dashboard
    await page.waitForURL(/\/admin\/dashboard/, { timeout: 15000 });

    // VERIFICAÇÃO CRÍTICA: o link precisa existir no backend
    const linksRes = await request.get('http://localhost:3001/links', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const linksBody = await linksRes.json();
    const links = Array.isArray(linksBody) ? linksBody : (linksBody.links || []);
    const titles = links.map((l: any) => l.title);

    expect(titles).toContain('Link onboarding e2e');
  });

  test('should create a paid link via onboarding with masked price input', async ({ page, request }) => {
    await page.goto('/admin/onboarding');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    await page.getByRole('button', { name: 'Cadastre um link' }).click();
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: 'Criar outro link' }).click();
    await page.waitForTimeout(500);

    // Escolhe "Cobrar por acesso" e preenche
    await page.getByRole('button', { name: /Cobrar por acesso/ }).click();
    await page.waitForTimeout(500);
    await page.locator('input[placeholder*="grupo VIP"]').fill('Grupo VIP e2e');

    // Digita só dígitos; a máscara deve formatar para "29,90"
    const priceInput = page.locator('input[placeholder="0,00"]');
    await priceInput.fill('2990');
    await expect(priceInput).toHaveValue('29,90');

    await page.locator('input[placeholder="https://seusite.com"]').fill('https://t.me/+grupovip');

    const submitButton = page.getByRole('button', { name: /Salvar e Finalizar/ });
    await expect(submitButton).toBeEnabled({ timeout: 5000 });
    await submitButton.click();

    await page.waitForURL(/\/admin\/dashboard/, { timeout: 15000 });

    // Verifica no backend: link criado com o preço correto
    const linksRes = await request.get('http://localhost:3001/links', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const linksBody = await linksRes.json();
    const links = Array.isArray(linksBody) ? linksBody : (linksBody.links || []);
    const paidLink = links.find((l: any) => l.title === 'Grupo VIP e2e');

    expect(paidLink).toBeTruthy();
    expect(paidLink.price).toBe(29.9);
  });
});
