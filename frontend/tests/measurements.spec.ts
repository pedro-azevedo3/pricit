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
      await expect(dialog.getByLabel('Quantidade da embalagem')).toHaveValue('');
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
    const hours=page.getByLabel('Horas',{exact:true}), minutes=page.getByLabel('Minutos',{exact:true});
    await expect(hours).toHaveValue('');
    await expect(hours).toHaveAttribute('placeholder','Ex.: 1');
    await expect(minutes).toHaveValue('');
    await expect(minutes).toHaveAttribute('placeholder','Ex.: 30');
    await hours.click();
    await page.keyboard.insertText('2');
    await expect(hours).toHaveValue('2');
    await hours.fill('');
    await expect(hours).toHaveValue('');
    await hours.fill('2');
    await minutes.fill('15');
    for(const [name,unit,quantity] of [[names.eggs,'un','2'],[names.milk,'ml','250']]){
      await page.getByLabel('Selecionar ingrediente').selectOption(ids[name===names.eggs?0:1]);
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
    expect(saved.production_time_minutes).toBe(135);
    await page.reload();
    await nav.getByRole('button',{name:'Receitas'}).click();
    await page.locator('article').filter({hasText:names.recipe}).getByRole('button',{name:'Ver e editar receita'}).click();
    await expect(page.getByLabel('Horas',{exact:true})).toHaveValue('2');
    await expect(page.getByLabel('Minutos',{exact:true})).toHaveValue('15');
    await page.getByRole('button',{name:`Editar ingrediente ${names.eggs}`,exact:true}).click();
    const editor=page.getByRole('dialog',{name:'Editar ingrediente',exact:true});
    await expect(editor.getByLabel('Unidade de medida')).toHaveValue('un');
    await expect(editor.getByLabel('Quantidade da embalagem')).toHaveValue('12.00');
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


test('campos novos começam vazios e a seleção compara preço e embalagem entre marcas',async({page,request},testInfo)=>{
  const suffix=`${testInfo.project.name}-${Date.now()}`;
  const ids:string[]=[];
  try {
    await page.goto('/app');
    await page.getByRole('button',{name:'Novo ingrediente',exact:true}).first().click();
    const ingredientDialog=page.getByRole('dialog');
    await expect(ingredientDialog.getByLabel('Quantidade da embalagem')).toHaveValue('');
    await expect(ingredientDialog.getByLabel('Quantidade da embalagem')).toHaveAttribute('placeholder','Ex.: 1000');
    await ingredientDialog.getByLabel('Unidade de medida').selectOption('un');
    await expect(ingredientDialog.getByLabel('Quantidade da embalagem')).toHaveValue('');
    await expect(ingredientDialog.getByLabel('Quantidade da embalagem')).toHaveAttribute('placeholder','Ex.: 12');
    await ingredientDialog.getByRole('button',{name:'Cancelar',exact:true}).click();
    for(const [brand,quantity,price] of [['A','1000','6'],['B','500','10']]){
      const response=await request.post('/api/v1/ingredients',{data:{name:`Farinha marca ${brand} ${suffix}`,measurement_unit:'g',package_quantity:quantity,package_price:price}});
      expect(response.status()).toBe(201);
      ids.push((await response.json()).id);
    }
    const nav=page.getByRole('navigation',{name:testInfo.project.name==='mobile'?'Navegação móvel':'Navegação principal'});
    await nav.getByRole('button',{name:'Receitas'}).click();
    await page.getByRole('button',{name:'Nova receita',exact:true}).click();
    const recipeDialog=page.getByRole('dialog');
    const yieldField=recipeDialog.getByLabel('Rendimento (unidades)');
    await expect(yieldField).toHaveValue('');
    await expect(yieldField).toHaveAttribute('placeholder','Ex.: 12');
    await expect(page.getByTestId('unit-cost')).toHaveText('—');
    expect(await yieldField.evaluate((el:HTMLInputElement)=>el.validity.valueMissing)).toBe(true);
    const select=recipeDialog.getByLabel('Selecionar ingrediente');
    await expect(select.locator(`option[value="${ids[0]}"]`)).toContainText('R$ 6,00 / 1.000,00 g');
    await expect(select.locator(`option[value="${ids[1]}"]`)).toContainText('R$ 10,00 / 500,00 g');
    await yieldField.fill('10');
    await expect(recipeDialog.getByLabel('Quantidade de embalagens')).toHaveValue('10');
    for(const id of ids){
      await select.selectOption(id);
      await recipeDialog.getByLabel('Quantidade usada',{exact:true}).fill('100');
      await recipeDialog.getByRole('button',{name:'Adicionar ingrediente',exact:true}).click();
    }
    await expect(recipeDialog).toContainText('1.000,00 g por R$ 6,00');
    await expect(recipeDialog).toContainText('500,00 g por R$ 10,00');
    await expect(page.getByTestId('unit-cost')).toHaveText('R$ 0,26');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
    await recipeDialog.getByRole('button',{name:'Cancelar',exact:true}).click();
  } finally {
    for(const id of ids) await request.delete('/api/v1/ingredients/'+id);
  }
});


test('seletor alterna custo por 1 g, 50 g e 100 g sem alterar ml, unidades ou dados salvos',async({page,request},testInfo)=>{
  const suffix=`${testInfo.project.name}-${Date.now()}`;
  const ids:string[]=[];
  try {
    const cases=[
      {unit:'g',quantity:'1000',price:'6',base:0.006,display:['R$ 0,01 / 1 g','R$ 0,30 / 50 g','R$ 0,60 / 100 g']},
      {unit:'kg',quantity:'1',price:'20',base:0.02,display:['R$ 0,02 / 1 g','R$ 1,00 / 50 g','R$ 2,00 / 100 g']},
      {unit:'ml',quantity:'1000',price:'8',base:0.008,display:['R$ 0,01 / ml','R$ 0,01 / ml','R$ 0,01 / ml']},
      {unit:'un',quantity:'12',price:'18',base:1.5,display:['R$ 1,50 / un','R$ 1,50 / un','R$ 1,50 / un']},
    ];
    for(const item of cases){
      const response=await request.post('/api/v1/ingredients',{data:{name:`Medida ${item.unit} ${suffix}`,measurement_unit:item.unit,package_quantity:item.quantity,package_price:item.price}});
      expect(response.status()).toBe(201);
      const data=await response.json();ids.push(data.id);
      expect(Number(data.cost_per_base_unit)).toBe(item.base);
    }
    const writes:string[]=[];
    page.on('request',r=>{if(r.url().includes('/api/')&&['POST','PUT','PATCH','DELETE'].includes(r.method()))writes.push(r.url());});
    await page.goto('/app');
    const selector=page.getByRole('combobox',{name:'Custo por medida de massa'});
    await expect(selector).toHaveValue('100');
    for(const grams of ['100','1','50']){
      await selector.selectOption(grams);
      for(const item of cases){
        const row=page.getByRole('row').filter({hasText:`Medida ${item.unit} ${suffix}`});
        await expect(row.getByRole('cell').nth(3)).toContainText(item.display[['1','50','100'].indexOf(grams)]);
        if(['g','kg'].includes(item.unit)) await expect(row.getByRole('cell').nth(3)).toContainText(`R$ ${item.unit==='g'?'6,00':'20,00'} / kg`);
      }
    }
    await page.screenshot({path:`test-results/ingredient-cost-measure-${testInfo.project.name}.png`,fullPage:true,animations:'disabled'});
    await page.getByRole('textbox',{name:'Pesquisar ingredientes'}).fill(`Medida g ${suffix}`);
    await expect(page.getByRole('row').filter({hasText:`Medida g ${suffix}`})).toContainText('R$ 0,30 / 50 g');
    expect(writes).toEqual([]);
    const stored:Ingredient[]=await (await request.get('/api/v1/ingredients')).json();
    for(let index=0;index<cases.length;index++){
      const saved=stored.find(i=>i.id===ids[index])!;
      expect(Number(saved.cost_per_base_unit)).toBe(cases[index].base);
      expect(Number(saved.package_price)).toBe(Number(cases[index].price));
    }
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  } finally {
    for(const id of ids) await request.delete('/api/v1/ingredients/'+id);
  }
});
