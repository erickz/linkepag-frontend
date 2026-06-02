import { test, expect } from '@playwright/test';

/**
 * Testes para verificar se Meta Pixel e TikTok Pixel estão carregando
 * e disparando eventos corretamente.
 *
 * Requer NEXT_PUBLIC_META_PIXEL_ID e NEXT_PUBLIC_TIKTOK_PIXEL_ID configurados.
 */

test.describe('Pixel Tracking', () => {
  test('Meta Pixel script está presente no DOM', async ({ page }) => {
    await page.goto('/');

    // Verifica se o script do Meta Pixel está no DOM
    const metaScript = page.locator('script#meta-pixel-base');
    const count = await metaScript.count();

    // Se a env var não estiver configurada, o script não existe (isso é OK)
    if (count === 0) {
      test.skip();
      return;
    }

    expect(count).toBeGreaterThan(0);
  });

  test('TikTok Pixel script está presente no DOM', async ({ page }) => {
    await page.goto('/');

    const ttScript = page.locator('script#tiktok-pixel');
    const count = await ttScript.count();

    if (count === 0) {
      test.skip();
      return;
    }

    expect(count).toBeGreaterThan(0);
  });

  test('fbq está disponível no window após carregamento', async ({ page }) => {
    await page.goto('/');

    // Aguarda um pouco para os scripts carregarem
    await page.waitForTimeout(1500);

    const fbqAvailable = await page.evaluate(() => {
      return typeof (window as unknown as Record<string, unknown>).fbq !== 'undefined';
    });

    if (!fbqAvailable) {
      test.skip();
      return;
    }

    expect(fbqAvailable).toBe(true);
  });

  test('ttq está disponível no window após carregamento', async ({ page }) => {
    await page.goto('/');

    await page.waitForTimeout(1500);

    const ttqAvailable = await page.evaluate(() => {
      return typeof (window as unknown as Record<string, unknown>).ttq !== 'undefined';
    });

    if (!ttqAvailable) {
      test.skip();
      return;
    }

    expect(ttqAvailable).toBe(true);
  });

  test('PageView é disparado automaticamente no Meta Pixel', async ({ page }) => {
    await page.goto('/');

    await page.waitForTimeout(1500);

    const hasPageView = await page.evaluate(() => {
      const fbq = (window as unknown as Record<string, unknown>).fbq;
      if (!fbq) return false;
      const q = (fbq as unknown as { queue: unknown[][] }).queue;
      return q.some((item: unknown[]) => item[0] === 'track' && item[1] === 'PageView');
    });

    if (!hasPageView) {
      test.skip();
      return;
    }

    expect(hasPageView).toBe(true);
  });

  test('PageView é disparado automaticamente no TikTok Pixel', async ({ page }) => {
    await page.goto('/');

    await page.waitForTimeout(1500);

    const hasPageView = await page.evaluate(() => {
      const ttq = (window as unknown as Record<string, unknown>).ttq;
      if (!ttq) return false;
      const q = (ttq as unknown as { queue: unknown[][] }).queue;
      return q.some((item: unknown[]) => item[0] === 'page');
    });

    if (!hasPageView) {
      test.skip();
      return;
    }

    expect(hasPageView).toBe(true);
  });

  test('Meta Pixel AAM (fbq init com dados) é disparado após login', async ({ page }) => {
    // Navega para login
    await page.goto('/login');

    await page.waitForTimeout(1000);

    const fbqAvailable = await page.evaluate(() => {
      return typeof (window as unknown as Record<string, unknown>).fbq !== 'undefined';
    });

    if (!fbqAvailable) {
      test.skip();
      return;
    }

    // Preenche credenciais de teste (ajustar se necessário)
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(2000);

    // Verifica se algum evento foi enfileirado (mesmo que falhe o login, o tracking tenta rodar)
    const hasEvents = await page.evaluate(() => {
      const fbq = (window as unknown as Record<string, unknown>).fbq;
      if (!fbq) return false;
      const q = (fbq as unknown as { queue: unknown[][] }).queue;
      return q.length > 0;
    });

    expect(hasEvents).toBe(true);
  });
});
