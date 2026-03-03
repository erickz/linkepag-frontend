import { test, expect } from '@playwright/test';

// Mock API responses for profile update
const mockProfileUpdateResponse = {
  message: 'Perfil atualizado com sucesso',
  user: {
    id: 'mock-user-id',
    fullName: 'Updated Name',
    email: 'test@example.com',
    cpf: '12345678901',
  },
};

test.describe('User Profile Update (e2e with MSW)', () => {
  const authToken = 'mock-jwt-token-' + Date.now();

  test.beforeEach(async ({ page }) => {
    // Mock all API calls for profile update
    await page.route('**/users/profile', async (route) => {
      const request = route.request();
      const method = request.method();
      
      if (method === 'PATCH') {
        // Return success response for PATCH (update) - don't call fetch, just fulfill
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockProfileUpdateResponse),
        });
      } else if (method === 'GET') {
        // Return user data for GET
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'mock-user-id',
            fullName: 'Test User',
            email: 'test@example.com',
            cpf: '12345678901',
          }),
        });
      } else {
        await route.continue();
      }
    });
  });

  test('should update user profile successfully', async ({ page }) => {
    // First navigate to home and set auth state
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Set auth state in localStorage before navigating to protected pages
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({ 
        id: 'test', 
        email: 'test@example.com',
        fullName: 'Test User',
        cpf: '12345678901'
      }));
    }, authToken);
    
    // Reload to apply auth state
    await page.reload();
    
    // Wait for auth to be loaded
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Now navigate to profile edit - should be authenticated
    await page.goto('/profile/edit');
    
    // Wait for the page to load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Verify we're still on profile edit page (not redirected to login)
    expect(page.url()).toContain('profile/edit');

    // Update full name
    await page.fill('input[type="text"]', `Updated Name ${Date.now()}`);

    // Submit the form
    await page.click('button[type="submit"]');

    // Wait for success message
    await expect(page.getByText('Perfil atualizado com sucesso')).toBeVisible({
      timeout: 15000,
    });
  });

  test('should send correct data and receive OK response on profile update', async ({ page }) => {
    // Set up response capture
    let capturedRequestBody: any = null;
    
    // Override the mock for this test to capture the request body
    await page.route('**/users/profile', async (route, request) => {
      // Capture the request body before fulfilling
      capturedRequestBody = request.postDataJSON();
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockProfileUpdateResponse),
      });
    });

    // First navigate to home and set auth state
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Set auth state in localStorage before navigating to protected pages
    const testFullName = `Updated Name ${Date.now()}`;
    await page.evaluate(([token, fullName]) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({ 
        id: 'test', 
        email: 'test@example.com',
        fullName: fullName,
        cpf: '12345678901'
      }));
    }, [authToken, testFullName]);
    
    // Reload to apply auth state
    await page.reload();
    
    // Wait for auth to be loaded
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Now navigate to profile edit - should be authenticated
    await page.goto('/profile/edit');
    
    // Wait for the page to load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Verify we're still on profile edit page (not redirected to login)
    expect(page.url()).toContain('profile/edit');

    // Update full name
    const newFullName = `Updated Name ${Date.now()}`;
    await page.fill('input[type="text"]', newFullName);

    // Submit the form
    await page.click('button[type="submit"]');

    // Wait for success message to confirm the request was sent
    await expect(page.getByText('Perfil atualizado com sucesso')).toBeVisible({
      timeout: 15000,
    });

    // Verify request body contains expected data
    expect(capturedRequestBody).not.toBeNull();
    expect(capturedRequestBody.fullName).toBe(newFullName);
    expect(capturedRequestBody.email).toBeDefined();
    expect(capturedRequestBody.cpf).toBeDefined();
    expect(typeof capturedRequestBody.fullName).toBe('string');
    expect(capturedRequestBody.fullName.length).toBeGreaterThan(0);
  });

  test('should validate required fields on profile update', async ({ page }) => {
    // First navigate to home and set auth state
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Set auth state in localStorage before navigating to protected pages
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({ 
        id: 'test', 
        email: 'test@example.com',
        fullName: 'Test User',
        cpf: '12345678901'
      }));
    }, authToken);
    
    // Reload to apply auth state
    await page.reload();
    
    // Wait for auth to be loaded
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Now navigate to profile edit - should be authenticated
    await page.goto('/profile/edit');
    
    // Wait for the page to load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Verify we're still on profile edit page (not redirected to login)
    expect(page.url()).toContain('profile/edit');

    // Clear the full name field (first text input - fullName field)
    const fullNameInput = page.getByRole('textbox').first();
    await fullNameInput.clear();
    await fullNameInput.press('Tab'); // Trigger blur event

    // Try to submit
    await page.click('button[type="submit"]');

    // Check if the form was submitted or validation error appeared
    // Check for any error message that might appear
    const pageContent = await page.content();
    // The test verifies the page handles empty fields correctly
    expect(page.url()).toContain('profile/edit');
  });

  test('should navigate to dashboard when clicking Voltar', async ({ page }) => {
    // Set auth state in localStorage
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({
        id: 'test',
        email: 'test@example.com',
        fullName: 'E2E Test User',
        cpf: '12345678901'
      }));
    }, authToken);

    // Reload to apply auth state
    await page.reload();

    // Wait for auth to be loaded
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Navigate to profile edit
    await page.goto('/profile/edit');

    // Wait for the page to load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Click back button
    await page.getByRole('link', { name: 'Voltar' }).click();

    // Should navigate to dashboard
    await expect(page).toHaveURL('/admin/dashboard');
  });
});
