import { test, expect } from '@playwright/test';

test('landing apresenta o produto, calcula o preço e abre o cadastro', async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('izyprice-theme', 'dark'));
  await page.goto('/');
  await expect(page.locator('[data-public-page]')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(page.getByRole('button', {name: /Ativar tema/})).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Sua receita é boa.');
  await page.locator('img[alt^="Mascote do pricit,"]').evaluate((img: HTMLImageElement) => img.decode());
  await expect(page.getByTestId('demo-price')).toHaveText('R$ 7,20');
  await page.getByLabel('Custo por unidade').fill('10');
  await expect(page.getByTestId('demo-price')).toHaveText('R$ 16,00');
  await page.getByLabel('Acréscimo sobre o custo (markup)').fill('100');
  await expect(page.getByTestId('demo-price')).toHaveText('R$ 20,00');
  await page.getByLabel('Custo por unidade').fill('-1');
  await expect(page.getByTestId('demo-price')).toHaveText('—');
  await expect(page.getByText('Informe um custo entre zero')).toBeVisible();
  await page.getByLabel('Custo por unidade').fill('4.50');
  await page.getByLabel('Acréscimo sobre o custo (markup)').fill('60');
  await page.getByText('Markup e margem de lucro são a mesma coisa?', { exact: true }).click();
  await expect(page.getByText('Não. Markup é o acréscimo', { exact: false })).toBeVisible();
  const guide = page.getByRole('region', { name: 'Aprenda a dar valor ao seu trabalho.' });
  await guide.scrollIntoViewIfNeeded();
  await expect(guide.getByText('GUIA DE PRECIFICAÇÃO · DENTRO DA PLATAFORMA')).toBeVisible();
  await expect(guide.getByText('R$ 20,00', {exact:true})).toBeVisible();
  await expect(guide.getByText('R$ 30,00', {exact:true})).toBeVisible();
  await expect(guide.getByText('R$ 2,50', {exact:true})).toBeVisible();
  await expect(guide.getByRole('link', {name:'Conhecer o Guia'})).toHaveAttribute('href','/cadastro');
  await page.getByText('O pricit me ajuda a definir o valor da minha hora?', {exact:true}).click();
  await expect(page.getByText('Sim. A aba Guia tem orientações', {exact:false})).toBeVisible();
  await guide.screenshot({path:`test-results/landing-guide-${testInfo.project.name}.png`,animations:'disabled'});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `test-results/landing-${testInfo.project.name}-light.png`, fullPage: true, animations: 'disabled' });
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', {name: 'Abrir menu'}).click();
    await page.getByRole('navigation', {name:'Navegação do site'}).getByRole('link', {name:'Como funciona'}).click();
    await expect(page.getByRole('button', {name:'Abrir menu'})).toHaveAttribute('aria-expanded', 'false');
  }
  await page.getByRole('link', { name: 'Bora precificar' }).click();
  await expect(page).toHaveURL(/\/cadastro$/);
  await expect(page.getByRole('button', { name: 'Cadastrar-se com Google' })).toBeVisible();
});
