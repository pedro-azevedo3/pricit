import {test, expect} from '@playwright/test';

test('menu lateral recolhe para ícones e preserva a preferência', async ({page},testInfo)=>{
  await page.goto('/app');
  await expect(page.getByRole('heading',{name:'Biblioteca de ingredientes'})).toBeVisible();
  if(testInfo.project.name==='mobile'){
    await expect(page.getByRole('button',{name:'Recolher menu lateral'})).toHaveCount(0);
    await expect(page.getByRole('navigation',{name:'Navegação móvel'})).toBeVisible();
    return;
  }
  const sidebar=page.getByRole('complementary',{name:'Menu lateral'});
  const workspace=page.locator('.app-workspace');
  await expect.poll(()=>sidebar.evaluate(el=>Math.round(el.getBoundingClientRect().width))).toBe(234);
  const toggle=page.getByRole('button',{name:'Recolher menu lateral'});
  await expect(toggle).toHaveAttribute('aria-expanded','true');
  await toggle.click();
  await expect(page.getByRole('button',{name:'Expandir menu lateral'})).toHaveAttribute('aria-expanded','false');
  await expect.poll(()=>sidebar.evaluate(el=>Math.round(el.getBoundingClientRect().width))).toBe(80);
  await expect.poll(()=>workspace.evaluate(el=>Math.round(el.getBoundingClientRect().left))).toBe(80);
  const nav=page.getByRole('navigation',{name:'Navegação principal'});
  await expect(nav.getByRole('button',{name:'Receitas',exact:true})).toHaveAttribute('title','Receitas');
  await nav.getByRole('button',{name:'Receitas',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Precificação de receitas'})).toBeVisible();
  await nav.getByRole('button',{name:'Precificação',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Precificação',exact:true})).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button',{name:'Expandir menu lateral'})).toBeVisible();
  await expect.poll(()=>sidebar.evaluate(el=>Math.round(el.getBoundingClientRect().width))).toBe(80);
  await page.getByRole('button',{name:'Expandir menu lateral'}).focus();
  await page.keyboard.press('Enter');
  await expect.poll(()=>sidebar.evaluate(el=>Math.round(el.getBoundingClientRect().width))).toBe(234);
  await expect.poll(()=>workspace.evaluate(el=>Math.round(el.getBoundingClientRect().left))).toBe(234);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});
