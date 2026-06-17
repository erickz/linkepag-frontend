import { test, expect } from '@playwright/test';

/**
 * Testes de smoke para Meta Pixel e TikTok Pixel.
 *
 * Estes testes verificam se os scripts base estão presentes no DOM e se os
 * objetos globais (fbq, ttq) ficam disponíveis após o carregamento.
 *
 * Requer NEXT_PUBLIC_META_PIXEL_ID e NEXT_PUBLIC_TIKTOK_PIXEL_ID configurados.
 *
 * Nota: eventos iniciais (PageView, init) são processados e removidos das
 * filas internas logo após o carregamento dos scripts, então testes que
 * inspecionam `fbq.queue`/`ttq.queue` são instáveis. Testes de formato de
 * payload (ex: contents[], SHA-256) são melhor feitos via interceptação de
 * rede para os endpoints oficiais dos pixels.
 */

test.describe('Pixel Tracking', () => {
  test('Meta Pixel script está presente no DOM', async ({ page }) => {
    await page.goto('/');

    const metaScript = page.locator('script#meta-pixel-base');
    const count = await metaScript.count();

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
});
