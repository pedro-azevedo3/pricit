import { test, expect } from '@playwright/test';

test('tema claro e escuro com preferência persistente', async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/app');
  await expect(page.getByRole('heading', { name: 'Biblioteca de ingredientes' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Ativar tema escuro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  for (const route of ['/', '/login', '/cadastro']) {
    await page.goto(route);
    await expect(page.locator('[data-public-page]')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(page.getByRole('button', {name: /Ativar tema/})).toHaveCount(0);
  }
  await page.goto('/app');
  await expect(page.getByRole('button', {name: 'Ativar tema claro'})).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Novo ingrediente', exact: true }).first().click();
  await expect(page.getByRole('dialog')).toHaveCSS('background-color', 'rgb(27, 33, 35)');
  await expect(page.getByLabel('Nome do ingrediente')).toHaveCSS('background-color', 'rgb(27, 33, 35)');
  await page.screenshot({ path: `test-results/${testInfo.project.name}-dark-theme.png` });
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  const nav = page.getByRole('navigation', { name: testInfo.project.name === 'mobile' ? 'Navegação móvel' : 'Navegação principal' });
  await nav.getByRole('button', { name: 'Receitas' }).click();
  await expect(page.getByRole('heading', { name: 'Precificação de receitas' })).toBeVisible();
  await nav.getByRole('button', { name: /^Precificação/ }).click();
  await expect(page.getByRole('heading', { name: 'Precificação', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Ativar tema claro' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.screenshot({ path: `test-results/${testInfo.project.name}-light-theme.png` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});
