import { test, expect } from '@playwright/test';
import { perBaseUnit, pricing } from '../lib/calculations';
import { Ingredient, RecipeInput } from '../lib/types';

const ingredient = (id:string, unit:'ml'|'un', quantity:string, price:string):Ingredient => ({
  id, name:id, measurement_unit:unit, package_quantity:quantity, package_price:price,
  is_active:true, created_at:'', updated_at:'', cost_per_gram:null,cost_per_kg:null,
  base_unit:unit, cost_per_base_unit:unit==='un'?'1.5':'.008',
});

test('cálculo decimal de ml e unidades preserva precisão', () => {
  const eggs=ingredient('ovos','un','12','18'), milk=ingredient('leite','ml','1000','8');
  expect(perBaseUnit(eggs).toString()).toBe('1.5');
  expect(perBaseUnit(milk).toString()).toBe('0.008');
  const recipe:RecipeInput={name:'Teste',description:null,yield_quantity:4,production_time_minutes:0,
    packaging_unit_cost:'0',packaging_quantity:0,operational_expense_percentage:'0',hourly_labor_cost:'0',
    desired_markup_percentage:'50',selling_price:null,
    ingredients:[{ingredient_id:'ovos',quantity_used:'2',measurement_unit:'un'}, {ingredient_id:'leite',quantity_used:'250',measurement_unit:'ml'}]};
  const result=pricing(recipe,[eggs,milk]);
  expect(result.ingredients_cost).toBe('5');
  expect(result.unit_cost).toBe('1.25');
  expect(result.suggested_price).toBe('1.875');
});

test('ingredientes por ml e unidade funcionam no cadastro e na receita',async({page,request},testInfo)=>{
  const suffix=`${testInfo.project.name}-${Date.now()}`;
  const names={eggs:`Ovos ${suffix}`,milk:`Leite ${suffix}`,recipe:`Receita ml e un ${suffix}`};
  const ids:string[]=[]; let recipeId:string|undefined;
  try {
    await page.goto('/app');
    for(const [name,unit,quantity,price] of [[names.eggs,'un','12','18'],[names.milk,'ml','1000','8']]){
      await page.getByRole('button',{name:'Novo ingrediente',exact:true}).first().click();
      const dialog=page.getByRole('dialog');
      await dialog.getByLabel('Nome do ingrediente').fill(name);
      await dialog.getByLabel('Unidade de medida').selectOption(unit);
      if(unit==='un') await expect(dialog.getByLabel('Quantidade da embalagem')).toHaveValue('1.00');
      await dialog.getByLabel('Quantidade da embalagem').fill(quantity);
      await dialog.getByLabel('Valor pago pela embalagem').fill(price);
      await expect(dialog).toContainText(unit==='un'?'Custo por unidade':'Custo por mililitro');
      await expect(dialog).not.toContainText('Custo por grama');
      await dialog.getByRole('button',{name:'Salvar ingrediente',exact:true}).click();
      await expect(dialog).toHaveCount(0);
      const rows:Ingredient[]=await (await request.get('/api/v1/ingredients')).json();
      ids.push(rows.find(i=>i.name===name)!.id);
    }
    const nav=page.getByRole('navigation',{name:testInfo.project.name==='mobile'?'Navegação móvel':'Navegação principal'});
    await nav.getByRole('button',{name:'Receitas'}).click();
    await page.getByRole('button',{name:'Nova receita',exact:true}).click();
    await page.getByLabel('Nome da receita').fill(names.recipe);
    await page.getByLabel('Rendimento (unidades)').fill('4');
    for(const [name,unit,quantity] of [[names.eggs,'un','2'],[names.milk,'ml','250']]){
      await page.getByLabel('Selecionar ingrediente').selectOption({label:name});
      const select=page.getByRole('combobox',{name:'Unidade usada',exact:true});
      await expect(select).toHaveValue(unit);
      await expect(select.locator('option')).toHaveCount(1);
      await page.getByLabel('Quantidade usada',{exact:true}).fill(quantity);
      await page.getByRole('button',{name:'Adicionar ingrediente',exact:true}).click();
      await expect(page.getByRole('combobox',{name:`Unidade de ${name}`,exact:true})).toHaveValue(unit);
    }
    await expect(page.getByTestId('unit-cost')).toHaveText('R$ 1,25');
    await page.getByRole('button',{name:'Salvar receita',exact:true}).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const recipes=await (await request.get('/api/v1/recipes')).json();
    const saved=recipes.find((r:{name:string})=>r.name===names.recipe);
    recipeId=saved.id;
    expect(Number(saved.pricing.ingredients_cost)).toBe(5);
    await page.reload();
    await nav.getByRole('button',{name:'Receitas'}).click();
    await page.locator('article').filter({hasText:names.recipe}).getByRole('button',{name:'Ver e editar receita'}).click();
    await page.getByRole('button',{name:`Editar ingrediente ${names.eggs}`,exact:true}).click();
    const editor=page.getByRole('dialog',{name:'Editar ingrediente',exact:true});
    await expect(editor.getByLabel('Unidade de medida')).toHaveValue('un');
    await editor.getByLabel('Valor pago pela embalagem').fill('24');
    await editor.getByRole('button',{name:'Salvar ingrediente',exact:true}).click();
    await expect(editor).toHaveCount(0);
    await expect(page.getByTestId('unit-cost')).toHaveText('R$ 1,50');
    const updated=await (await request.get('/api/v1/recipes/'+recipeId)).json();
    expect(Number(updated.pricing.ingredients_cost)).toBe(6);
  } finally {
    if(recipeId) await request.delete('/api/v1/recipes/'+recipeId);
    for(const id of ids) await request.delete('/api/v1/ingredients/'+id);
  }
});
