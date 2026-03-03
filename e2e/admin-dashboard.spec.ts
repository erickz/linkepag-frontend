import { test, expect, Page } from '@playwright/test';

// Helper para fazer login via localStorage (mock)
async function setupMockAuth(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  
  // Preenche o formulário de login
  await page.locator('input[type="email"]').fill('test@example.com');
  await page.locator('input[type="password"]').fill('password123');
  
  const submitButton = page.getByRole('button', { name: /entrar/i });
  await submitButton.click();
  
  // Aguarda redirecionamento para dashboard
  await page.waitForURL(/\/admin\/dashboard/, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

test.describe('Admin Dashboard (e2e)', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockAuth(page);
  });

  test.describe('Header', () => {
    test('should display logo and brand name', async ({ page }) => {
      await expect(page.locator('text=LinkePag').first()).toBeVisible();
    });

    test('should display user first name', async ({ page }) => {
      await expect(page.getByText(/Olá,\s+Test/)).toBeVisible();
    });

    test('should have logout button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /sair/i })).toBeVisible();
    });

    test('should logout and redirect to login', async ({ page }) => {
      await page.getByRole('button', { name: /sair/i }).click();
      await page.waitForURL(/\/login/, { timeout: 10000 });
      await expect(page.locator('text=Bem-vindo de volta')).toBeVisible();
    });
  });

  test.describe('Welcome Section', () => {
    test('should display page title', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Painel de Controle' })).toBeVisible();
    });

    test('should display subtitle', async ({ page }) => {
      await expect(page.getByText('Gerencie seus links, personalize sua página')).toBeVisible();
    });
  });

  test.describe('Stats Cards', () => {
    test('should display progress card', async ({ page }) => {
      await expect(page.getByText('Seu Progresso')).toBeVisible();
      await expect(page.getByText(/ativos/)).toBeVisible();
      await expect(page.getByText(/de/)).toBeVisible();
    });

    test('should display monetized links card', async ({ page }) => {
      await expect(page.getByText('Links Monetizados')).toBeVisible();
      await expect(page.getByText('PIX integrado')).toBeVisible();
    });

    test('should display share card with username', async ({ page }) => {
      await expect(page.getByText('Compartilhe')).toBeVisible();
      await expect(page.getByText(/linkpagg\.com/)).toBeVisible();
    });

    test('should have copy and view buttons in share card', async ({ page }) => {
      const shareCard = page.locator('text=Compartilhe').locator('..').locator('..');
      await expect(shareCard.getByRole('button', { name: /copiar/i })).toBeVisible();
      await expect(shareCard.getByRole('link', { name: /ver/i })).toBeVisible();
    });
  });

  test.describe('Action Cards', () => {
    test('should display "Gerenciar Links" card', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Gerenciar Links' })).toBeVisible();
      await expect(page.getByText('Adicione, edite e organize seus links')).toBeVisible();
    });

    test('should navigate to links page', async ({ page }) => {
      await page.getByRole('heading', { name: 'Gerenciar Links' }).click();
      await page.waitForURL(/\/admin\/links/, { timeout: 10000 });
      await expect(page.getByRole('heading', { name: 'Meus Links' })).toBeVisible();
    });

    test('should display "Editar Perfil" card', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Editar Perfil' })).toBeVisible();
      await expect(page.getByText('Atualize sua foto, bio')).toBeVisible();
    });

    test('should navigate to edit profile page', async ({ page }) => {
      await page.getByRole('heading', { name: 'Editar Perfil' }).click();
      await page.waitForURL(/\/profile\/edit/, { timeout: 10000 });
      await expect(page.getByRole('heading', { name: 'Editar Perfil' })).toBeVisible();
    });

    test('should display "Ver Página" card', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Ver Página' })).toBeVisible();
      await expect(page.getByText('Visualize como seus visitantes')).toBeVisible();
    });

    test('should display "Aparência" card', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Aparência' })).toBeVisible();
      await expect(page.getByText('Personalize cores, gradientes')).toBeVisible();
    });

    test('should navigate to appearance page', async ({ page }) => {
      await page.getByRole('heading', { name: 'Aparência' }).click();
      await page.waitForURL(/\/admin\/appearance/, { timeout: 10000 });
    });
  });

  test.describe('Profile Preview', () => {
    test('should display preview section title', async ({ page }) => {
      await expect(page.getByText('Pré-visualização do Perfil')).toBeVisible();
    });

    test('should display profile card in preview', async ({ page }) => {
      // Verifica se o preview do perfil está presente (procura por elementos do preview)
      const previewSection = page.locator('text=Pré-visualização do Perfil').locator('..').locator('..');
      await expect(previewSection).toBeVisible();
    });

    test('should display username in preview', async ({ page }) => {
      // O username deve aparecer no preview
      await expect(page.locator('text=@testuser')).toBeVisible();
    });

    test('should have link to view full page', async ({ page }) => {
      await expect(page.getByRole('link', { name: /ver página completa/i })).toBeVisible();
    });
  });

  test.describe('Data Loading', () => {
    test('should load user profile data', async ({ page }) => {
      // Aguarda carregamento dos dados
      await page.waitForTimeout(1000);
      
      // Verifica se o username aparece na seção de compartilhamento
      await expect(page.getByText(/testuser/)).toBeVisible();
    });

    test('should show links count correctly', async ({ page }) => {
      // Aguarda carregamento
      await page.waitForTimeout(1000);
      
      // Verifica se o número de links é exibido (vindo do mock: 3 links)
      await expect(page.getByText(/de\s+3\s+total/)).toBeVisible();
    });
  });

  test.describe('Protected Route', () => {
    test('should redirect to login when accessing dashboard without auth', async ({ page }) => {
      // Limpa localStorage para simular não autenticado
      await page.goto('/admin/dashboard');
      await page.evaluate(() => {
        localStorage.clear();
      });
      await page.reload();
      
      await page.waitForURL(/\/login/, { timeout: 10000 });
      await expect(page.locator('text=Bem-vindo de volta')).toBeVisible();
    });
  });
});
