import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Onboarding - Profile Photo', () => {
  const testTimestamp = Date.now();
  const testPassword = 'TestPassword123';
  let testEmail: string;
  let token: string;

  test.beforeAll(async ({ request }, testInfo) => {
    testEmail = `phototest${testTimestamp}w${testInfo.workerIndex}@example.com`;

    const registerRes = await request.post('http://localhost:3001/auth/register', {
      data: {
        fullName: 'Photo Test User',
        email: testEmail,
        password: testPassword,
      },
    });

    const body = await registerRes.json();
    token = body.token;
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

  test('should upload and then remove profile photo', async ({ page, request }) => {
    await page.goto('/admin/onboarding');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Create a simple test image
    const testImagePath = path.join('/tmp', `test-photo-${testTimestamp}.jpg`);
    // Minimal valid JPEG (1x1 pixel)
    const base64Jpeg = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAAA//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8Af//Z';
    fs.writeFileSync(testImagePath, Buffer.from(base64Jpeg, 'base64'));

    // Upload photo
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testImagePath);
    await page.waitForTimeout(1000);

    // Check that image preview is visible
    const img = page.locator('img[alt="Preview"]');
    await expect(img).toBeVisible();

    // Fill required fields
    await page.fill('input[placeholder="Como você quer ser chamado"]', 'Photo User');
    await page.fill('#onboarding-instagram', 'photoinsta');
    await page.locator('#onboarding-instagram').blur();
    await page.waitForTimeout(500);

    // Save profile
    await page.click('button:has-text("Continuar")');
    await page.waitForTimeout(3000);

    // Verify backend has photo
    const profileRes1 = await request.get('http://localhost:3001/users/profile', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const profile1 = await profileRes1.json();
    expect(profile1.profilePhoto).toContain('data:image');

    // Go back to step 1
    await page.goto('/admin/onboarding');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Remove photo
    await page.click('button:has-text("Remover")');
    await page.waitForTimeout(500);

    // Check that image preview is gone
    await expect(img).toBeHidden();

    // Save again
    await page.click('button:has-text("Continuar")');
    await page.waitForTimeout(3000);

    // Verify backend removed photo
    const profileRes2 = await request.get('http://localhost:3001/users/profile', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const profile2 = await profileRes2.json();
    expect(profile2.profilePhoto).toBe('');

    // Cleanup
    fs.unlinkSync(testImagePath);
  });
});
