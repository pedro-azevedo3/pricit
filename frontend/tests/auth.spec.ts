import { test, expect } from '@playwright/test';

test('telas de acesso com Google e navegação entre login e cadastro', async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('izyprice-theme', 'dark'));
  await page.goto('/');
  await page.getByRole('link', { name: 'Entrar', exact: true }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', {level: 1})).toContainText('Entre e fique');
  await page.getByRole('button', {name:'Entrar com Google'}).click();
  await expect(page.getByRole('status')).toContainText('ainda não está disponível');
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.locator('img[alt^="Mascote"]').evaluate((img: HTMLImageElement) => img.decode());
  await page.screenshot({path:`test-results/auth-${testInfo.project.name}-login.png`, fullPage: true, animations:'disabled'});
  await page.getByRole('link', {name:'Registre-se',exact:true}).click();
  await expect(page).toHaveURL(/\/cadastro$/);
  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(page.getByRole('button', {name:'Cadastrar-se com Google'})).toBeVisible();
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await expect(page.getByRole('button', {name: /Ativar tema/})).toHaveCount(0);
  await expect(page.locator('[data-public-page]')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await page.locator('img[alt^="Mascote"]').evaluate((img: HTMLImageElement) => img.decode());
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({path:`test-results/auth-${testInfo.project.name}-register.png`, fullPage:true, animations:'disabled'});
  await page.getByRole('button', {name:'Cadastrar-se com Google'}).click();
  await expect(page.getByRole('status')).toBeVisible();
  await page.getByRole('link', {name:'Entrar',exact:true}).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole('link', {name:'Voltar ao início'}).click();
  await expect(page).toHaveURL('/');
});


test('login por e-mail exibe erro e envia as credenciais', async ({page}) => {
  await page.route('**/api/v1/auth/login', async route => {
    expect(route.request().postDataJSON()).toEqual({email:'pessoa@example.com',password:'senha-de-teste-123'});
    await route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({detail:'E-mail ou senha inválidos.'})});
  });
  await page.goto('/login');
  await page.getByLabel('E-mail', {exact:true}).fill('pessoa@example.com');
  await page.getByLabel('Senha', {exact:true}).fill('senha-de-teste-123');
  await page.getByRole('button', {name:'Entrar com e-mail e senha',exact:true}).click();
  await expect(page.locator('form').getByRole('alert')).toHaveText('E-mail ou senha inválidos.');
  await expect(page.getByRole('button', {name:'Entrar com e-mail e senha',exact:true})).toBeEnabled();
  await expect(page).toHaveURL(/\/login$/);
});

test('painel sem sessão redireciona para login', async ({browser}) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/app');
  await expect(page).toHaveURL(/\/login$/);
  await context.close();
});
