import { test, expect } from '@playwright/test';
import { displayDecimal, money, percent, decimalText, pricing } from '../lib/calculations';

test('arredondamento uniforme e duas casas sem alterar cálculos', () => {
  const cases = [
    ['5.26','5.26'], ['5.269','5.27'], ['5.27','5.30'], ['5.28','5.30'],
    ['5.29','5.30'], ['5.30','5.30'], ['5.97','6.00'], ['9.99','10.00'],
    ['0','0.00'], ['0.004','0.00'], ['0.006','0.01'], ['0.07','0.10'],
    ['-5.27','-5.30'], ['-0.001','0.00'], ['1234.57','1234.60'],
  ];
  for (const [source, expected] of cases) expect(displayDecimal(source).toFixed(2)).toBe(expected);
  expect(money('1234.57')).toBe('R$ 1.234,60');
  expect(percent('37.5789')).toBe('37,60%');
  expect(decimalText('2.27')).toBe('2,30');
  const result = pricing({name:'Teste',description:null,yield_quantity:1,production_time_minutes:0,packaging_unit_cost:'5.27',packaging_quantity:1,operational_expense_percentage:'0',hourly_labor_cost:'0',desired_markup_percentage:'0',selling_price:null,ingredients:[]}, []);
  expect(result.total_cost).toBe('5.27');
  expect(money(result.total_cost)).toBe('R$ 5,30');
});

test('campos e prévias usam o mesmo padrão', async ({page}) => {
  await page.goto('/app');
  await page.getByRole('button',{name:'Novo ingrediente',exact:true}).first().click();
  await page.getByLabel('Quantidade da embalagem').fill('1000');
  const price = page.getByLabel('Valor pago pela embalagem');
  await price.fill('5.27');
  await page.getByLabel('Nome do ingrediente').click();
  await expect(price).toHaveValue('5.30');
  await expect(page.getByRole('dialog')).toContainText('R$ 5,30');
  await price.fill('5.26');
  await page.getByLabel('Nome do ingrediente').click();
  await expect(price).toHaveValue('5.26');
  await expect(page.getByRole('dialog')).toContainText('R$ 5,26');
  await page.getByRole('button',{name:'Cancelar',exact:true}).click();
});
