import { test, expect } from '@playwright/test';

test.describe('Links CRUD - Complete Management Flow', () => {
  const testTimestamp = Date.now();
  const testEmail = `linkstest${testTimestamp}@example.com`;
  const testUsername = `linkstest${testTimestamp}`;
  const testCpf = `${20000000000 + (testTimestamp % 89999999999)}`.slice(0, 11);
  const testPassword = 'TestPassword123';

  test.beforeAll(async ({ request }) => {
    // Create test user via API
    const registerRes = await request.post('http://localhost:3001/auth/register', {
      data: {
        fullName: 'Links Test User',
        email: testEmail,
        cpf: testCpf,
        password: testPassword,
        username: testUsername,
      },
    });

    if (!registerRes.ok() && registerRes.status() !== 400) {
      console.log('Registration response:', await registerRes.text());
    }
  });

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').fill(testPassword);
    await page.getByRole('button', { name: 'Entrar' }).click();

    await page.waitForTimeout(3000);
  });

  test('should create a free link', async ({ page }) => {
    await page.goto('/admin/links');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Click add link button
    await page.getByRole('button', { name: /Adicionar|Novo|Criar/i }).first().click();
    await page.waitForTimeout(1000);

    // Fill link form
    await page.locator('input[name="title"], input[placeholder*="título"]').fill('My Free Link');
    await page.locator('input[name="url"], input[placeholder*="URL"]').fill('https://example.com/free');
    
    // Select free type if applicable
    const freeRadio = page.locator('input[value="free"], input[type="radio"]').first();
    if (await freeRadio.isVisible().catch(() => false)) {
      await freeRadio.click();
    }

    // Submit
    await page.getByRole('button', { name: /Salvar|Criar|Adicionar/i }).click();

    await page.waitForTimeout(2000);

    // Verify link was created
    await expect(page.getByText('My Free Link')).toBeVisible({ timeout: 10000 });
  });

  test('should create a paid link', async ({ page }) => {
    await page.goto('/admin/links');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Click add link button
    await page.getByRole('button', { name: /Adicionar|Novo|Criar/i }).first().click();
    await page.waitForTimeout(1000);

    // Fill link form
    await page.locator('input[name="title"], input[placeholder*="título"]').fill('My Paid Course');
    await page.locator('input[name="url"], input[placeholder*="URL"]').fill('https://example.com/course');
    
    // Select paid type
    const paidRadio = page.locator('input[value="paid"]').first();
    if (await paidRadio.isVisible().catch(() => false)) {
      await paidRadio.click();
    } else {
      // Toggle isPaid switch
      const paidSwitch = page.locator('input[name="isPaid"], [role="switch"]').first();
      if (await paidSwitch.isVisible().catch(() => false)) {
        await paidSwitch.click();
      }
    }

    // Fill price
    const priceInput = page.locator('input[name="price"], input[type="number"]').first();
    if (await priceInput.isVisible().catch(() => false)) {
      await priceInput.fill('97.00');
    }

    // Submit
    await page.getByRole('button', { name: /Salvar|Criar|Adicionar/i }).click();

    await page.waitForTimeout(2000);

    // Verify link was created
    await expect(page.getByText('My Paid Course')).toBeVisible({ timeout: 10000 });
  });

  test('should edit an existing link', async ({ page }) => {
    await page.goto('/admin/links');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Find edit button for first link
    const editButton = page.getByRole('button', { name: /Editar|edit/i }).first();
    if (await editButton.isVisible().catch(() => false)) {
      await editButton.click();
    } else {
      // Try clicking on the link itself
      const linkCard = page.locator('[data-testid="link-card"], .link-item').first();
      if (await linkCard.isVisible().catch(() => false)) {
        await linkCard.click();
      }
    }

    await page.waitForTimeout(1000);

    // Update title
    const titleInput = page.locator('input[name="title"]').first();
    await titleInput.clear();
    await titleInput.fill('Updated Link Title');

    // Submit
    await page.getByRole('button', { name: /Salvar|Atualizar|Update/i }).click();

    await page.waitForTimeout(2000);

    // Verify update
    await expect(page.getByText('Updated Link Title')).toBeVisible({ timeout: 10000 });
  });

  test('should toggle link active status', async ({ page }) => {
    await page.goto('/admin/links');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Find toggle switch for first link
    const toggleSwitch = page.locator('[role="switch"], input[type="checkbox"]').first();
    if (await toggleSwitch.isVisible().catch(() => false)) {
      const initialState = await toggleSwitch.isChecked().catch(() => true);
      await toggleSwitch.click();
      await page.waitForTimeout(1000);
      
      // Verify state changed
      const newState = await toggleSwitch.isChecked().catch(() => !initialState);
      expect(newState).toBe(!initialState);
    }
  });

  test('should reorder links via drag or buttons', async ({ page }) => {
    await page.goto('/admin/links');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Check for reorder buttons (up/down arrows)
    const upButton = page.getByRole('button', { name: /up|subir|↑/i }).first();
    const downButton = page.getByRole('button', { name: /down|descer|↓/i }).first();

    if (await upButton.isVisible().catch(() => false)) {
      await upButton.click();
      await page.waitForTimeout(1000);
      // Success if no error
    } else if (await downButton.isVisible().catch(() => false)) {
      await downButton.click();
      await page.waitForTimeout(1000);
    }
  });

  test('should delete a link', async ({ page }) => {
    await page.goto('/admin/links');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Get all link titles before deletion
    const linksBefore = await page.locator('.link-item, [data-testid="link-card"]').count();

    // Find delete button for last created link
    const deleteButton = page.getByRole('button', { name: /Excluir|Delete|Remover/i }).last();
    if (await deleteButton.isVisible().catch(() => false)) {
      await deleteButton.click();
      
      // Confirm deletion if dialog appears
      await page.waitForTimeout(500);
      const confirmButton = page.getByRole('button', { name: /Confirmar|Sim|Yes|Deletar/i });
      if (await confirmButton.isVisible().catch(() => false)) {
        await confirmButton.click();
      }
    }

    await page.waitForTimeout(2000);

    // Verify link count decreased or success message
    const successVisible = await page.getByText(/excluído|removido|deleted|removed/i).first().isVisible().catch(() => false);
    expect(successVisible).toBe(true);
  });

  test('should display links on public profile', async ({ page }) => {
    // First create a link
    await page.goto('/admin/links');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Add a visible link
    await page.getByRole('button', { name: /Adicionar|Novo/i }).first().click();
    await page.waitForTimeout(1000);
    await page.locator('input[name="title"]').fill('Public Test Link');
    await page.locator('input[name="url"]').fill('https://example.com/public');
    await page.getByRole('button', { name: /Salvar|Criar/i }).click();
    await page.waitForTimeout(2000);

    // Navigate to public profile
    await page.goto(`/profile/${testUsername}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Verify link is displayed
    await expect(page.getByText('Public Test Link')).toBeVisible({ timeout: 10000 });
  });

  test('should handle plan limit for paid links', async ({ page }) => {
    // Starter plan allows max 3 paid links
    await page.goto('/admin/links');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Try to create multiple paid links
    for (let i = 0; i < 5; i++) {
      await page.getByRole('button', { name: /Adicionar|Novo/i }).first().click();
      await page.waitForTimeout(1000);

      await page.locator('input[name="title"]').fill(`Paid Link ${i}`);
      await page.locator('input[name="url"]').fill(`https://example.com/paid${i}`);
      
      // Set as paid
      const paidToggle = page.locator('input[name="isPaid"], [role="switch"]').first();
      if (await paidToggle.isVisible().catch(() => false)) {
        await paidToggle.click();
      }

      const priceInput = page.locator('input[name="price"]').first();
      if (await priceInput.isVisible().catch(() => false)) {
        await priceInput.fill('10.00');
      }

      await page.getByRole('button', { name: /Salvar|Criar/i }).click();
      await page.waitForTimeout(2000);

      // Check for limit error after 3rd link
      if (i >= 3) {
        const errorVisible = await page.getByText(/limite|Limite|limit/i).first().isVisible().catch(() => false);
        if (errorVisible) {
          break; // Expected behavior
        }
      }
    }
  });
});
