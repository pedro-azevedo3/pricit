import { test, expect } from '@playwright/test';
import { studyLabor, studySales } from '../lib/pricing-guide';

test('referência da hora e mão de obra mantém a precisão dos cálculos', () => {
  const input = { income: '2400', days: '20', hours: '6', minutes: '90', yield: '12' };
  const result = studyLabor(input)!;
  expect(result.monthlyHours.toString()).toBe('120');
  expect(result.hourly.toString()).toBe('20');
  expect(result.batch.toString()).toBe('30');
  expect(result.unit.toString()).toBe('2.5');
  expect(studyLabor({ ...input, minutes: '0' })!.batch.toString()).toBe('0');
  expect(studyLabor({ ...input, hours: '6.5' })!.monthlyHours.toString()).toBe('130');
  for (const patch of [{ income: '' }, { hours: '0' }, { yield: '0' }, { days: '32' }, { days: '1.5' }, { hours: '25' }, { minutes: '-1' }, { income: 'Infinity' }]) {
    expect(studyLabor({ ...input, ...patch })).toBeNull();
  }
});

test('volume pode reduzir o resultado total mesmo com acréscimo maior', () => {
  const input = { cost: '5', markupA: '100', unitsA: '100', markupB: '200', unitsB: '40' };
  const result = studySales(input)!;
  expect(result.a.price.toString()).toBe('10');
  expect(result.b.price.toString()).toBe('15');
  expect(result.a.result.toString()).toBe('500');
  expect(result.b.result.toString()).toBe('400');
  expect(studySales({ ...input, cost: '5.23', markupA: '13.32' })!.a.price.toString()).toBe('5.926636');
  expect(studySales({ ...input, unitsA: '0', markupB: '0' })!.a.result.toString()).toBe('0');
  for (const patch of [{ cost: '0' }, { cost: '' }, { unitsA: '1.5' }, { markupB: '-1' }, { markupA: 'NaN' }]) {
    expect(studySales({ ...input, ...patch })).toBeNull();
  }
});

test('guia calcula exemplos sem salvar dados e mantém estudos ao visitar Receitas', async ({ page }, testInfo) => {
  const writes: string[] = [];
  page.on('request', request => {
    if (request.url().includes('/api/') && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) writes.push(request.url());
  });
  await page.goto('/app');
  await expect(page.getByRole('heading', { name: 'Biblioteca de ingredientes' })).toBeVisible();
  const nav = page.getByRole('navigation', { name: testInfo.project.name === 'mobile' ? 'Navegação móvel' : 'Navegação principal' });
  await nav.getByRole('button', { name: 'Guia', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Guia de precificação' })).toBeVisible();
  for (const input of await page.locator('#guide-labor input, #guide-sales input').all()) {
    await expect(input).toHaveValue('');
    await expect(input).toHaveAttribute('placeholder', /^Ex\.:/);
  }
  await page.getByRole('button', { name: 'Usar exemplo de mão de obra' }).click();
  const labor = page.locator('#guide-labor');
  await expect(labor.getByText('R$ 20,00', { exact: true })).toBeVisible();
  await expect(labor.getByText('R$ 30,00', { exact: true })).toBeVisible();
  await expect(labor.getByText('R$ 2,50', { exact: true })).toBeVisible();
  await page.getByLabel('Unidades produzidas por lote').fill('0');
  await expect(labor.getByText('R$ 2,50', { exact: true })).toHaveCount(0);
  await page.getByLabel('Unidades produzidas por lote').fill('12');
  await page.getByRole('button', { name: 'Usar exemplo de vendas' }).click();
  const table = page.getByRole('table', { name: 'Comparação das hipóteses de venda' });
  await expect(table.getByRole('row', { name: 'Resultado total estimado' })).toContainText('R$ 500,00');
  await expect(table.getByRole('row', { name: 'Resultado total estimado' })).toContainText('R$ 400,00');
  await page.getByLabel('Unidades vendidas B').fill('60');
  await expect(page.getByText('Com as quantidades informadas, o cenário B gera o maior resultado total.', { exact: false })).toBeVisible();
  await page.getByLabel('Unidades vendidas B').fill('0');
  await page.getByLabel('Unidades vendidas A').fill('0');
  await expect(page.getByText('Os dois cenários chegam ao mesmo resultado total.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Usar exemplo de vendas' }).click();
  await page.getByRole('button', { name: 'Abrir Receitas' }).click();
  await expect(page.getByRole('heading', { name: 'Precificação de receitas' })).toBeVisible();
  await nav.getByRole('button', { name: 'Guia', exact: true }).click();
  await expect(page.getByLabel('Remuneração mensal pelo trabalho (R$)')).toHaveValue('2400');
  expect(writes).toEqual([]);
  for (const theme of ['light', 'dark']) {
    await page.evaluate(value => document.documentElement.dataset.theme = value, theme);
    for (const target of ['#guide-labor', '#guide-sales', '#guide-apply']) {
      await page.locator(target).scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `test-results/guide-${testInfo.project.name}-${theme}.png`, animations: 'disabled' });
  }
  if (testInfo.project.name === 'mobile') {
    await page.setViewportSize({ width: 320, height: 700 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await expect(nav.getByRole('button', { name: 'Guia', exact: true })).toBeInViewport();
  }
});
