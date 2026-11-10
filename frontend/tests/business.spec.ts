import {test,expect} from '@playwright/test';
import {pricing} from '../lib/calculations';
import {businessProfiles, type BusinessProfile} from '../lib/business';
import type {Recipe, RecipeInput, Simulation} from '../lib/types';

test('serviços incluem energia e equipamentos com a mesma precisão do backend',()=>{
  const input:RecipeInput={kind:'service',name:'Corte',description:null,yield_quantity:1,production_time_minutes:30,
    hourly_labor_cost:'30',packaging_unit_cost:'0',packaging_quantity:0,operational_expense_percentage:'0',
    desired_markup_percentage:'100',selling_price:null,ingredients:[],additional_costs:[
      {name:'Energia',category:'energy',unit:'kwh',quantity:'0.2',unit_cost:'1.25'},
      {name:'Máquina',category:'equipment',unit:'hour',quantity:'0.5',unit_cost:'2'},
    ]};
  const result=pricing(input,[]);
  expect(result.additional_cost).toBe('1.25');
  expect(result.total_cost).toBe('16.25');
  expect(result.suggested_price).toBe('32.5');
});

test('perfil adapta segmentos e serviço funciona sem ingredientes, com histórico preservado',async({page,request},testInfo)=>{
  const original:BusinessProfile=await (await request.get('/api/v1/profile')).json();
  let recipeId:string|undefined;
  try{
    await page.goto('/app');
    const nav=page.getByRole('navigation',{name:testInfo.project.name==='mobile'?'Navegação móvel':'Navegação principal'});
    for(const type of ['acai','burger','bakery','beauty'] as const){
      await nav.getByRole('button',{name:'Perfil',exact:true}).click();
      await page.getByLabel('Nome do negócio').fill('Negócio de teste');
      await page.getByLabel('Tipo de negócio').selectOption(type);
      await page.getByRole('button',{name:'Salvar perfil do negócio'}).click();
      await expect(page.getByRole('status')).toContainText('Perfil atualizado');
      const business=businessProfiles[type];
      await expect(nav.getByRole('button',{name:business.offers,exact:true})).toBeVisible();
      await nav.getByRole('button',{name:business.offers,exact:true}).click();
      await page.getByRole('button',{name:business.newOffer,exact:true}).click();
      const dialog=page.getByRole('dialog');
      await expect(dialog.getByLabel(business.yieldLabel)).toHaveValue('');
      await expect(dialog.getByPlaceholder(`Ex.: ${business.sampleOffer}`,{exact:true})).toBeVisible();
      await dialog.getByRole('button',{name:'Cancelar',exact:true}).click();
    }
    await page.reload();
    await expect(nav.getByRole('button',{name:'Produtos',exact:true})).toBeVisible();
    await nav.getByRole('button',{name:'Serviços',exact:true}).click();
    await page.getByRole('button',{name:'Novo serviço',exact:true}).click();
    const name=`Corte ${testInfo.project.name}-${Date.now()}`;
    await page.getByLabel('Nome do serviço').fill(name);
    await page.getByLabel('Rendimento (atendimentos)').fill('1');
    await page.getByLabel('Minutos',{exact:true}).fill('30');
    await page.getByLabel('Valor da hora de trabalho').fill('30');
    await page.getByLabel('Lucro desejado sobre custo').fill('100');
    await page.getByRole('button',{name:'Adicionar energia',exact:true}).click();
    const energy=page.getByRole('group',{name:'Energia 1',exact:true});
    await energy.getByLabel('Nome do recurso').fill('Energia elétrica');
    await energy.getByLabel('Quantidade do recurso').fill('0.2');
    await energy.getByLabel('Valor por medida do recurso').fill('1.25');
    await page.getByRole('button',{name:'Adicionar equipamento',exact:true}).click();
    const equipment=page.getByRole('group',{name:'Equipamento 2',exact:true});
    await equipment.getByLabel('Nome do recurso').fill('Máquina de corte');
    await equipment.getByLabel('Quantidade do recurso').fill('0.5');
    await equipment.getByLabel('Valor por medida do recurso').fill('2');
    await expect(page.getByTestId('unit-cost')).toHaveText('R$ 16,25');
    await expect(page.getByTestId('suggested-price')).toHaveText('R$ 32,50');
    await page.screenshot({path:`test-results/service-${testInfo.project.name}.png`,fullPage:true,animations:'disabled'});
    await page.getByRole('button',{name:'Salvar serviço',exact:true}).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const recipes:Recipe[]=await (await request.get('/api/v1/recipes')).json();
    const saved=recipes.find(r=>r.name===name)!;recipeId=saved.id;
    expect(saved.kind).toBe('service');expect(saved.ingredients).toEqual([]);expect(saved.additional_costs).toHaveLength(2);
    expect(Number(saved.pricing.total_cost)).toBe(16.25);
    const pdf=await request.get(`/api/v1/recipes/${recipeId}/pdf`);
    expect(pdf.status()).toBe(200);expect((await pdf.body()).subarray(0,5).toString()).toBe('%PDF-');
    await page.locator('article').filter({hasText:name}).getByRole('button',{name:'Precificar vendas'}).click();
    await expect(page.getByLabel('Quantidade de atendimentos para vender')).toBeVisible();
    await page.getByLabel('Quantidade de atendimentos para vender').fill('10');
    await page.getByRole('button',{name:'Salvar precificação',exact:true}).click();
    await expect(page.getByRole('button',{name:`Ver precificação de ${name}`,exact:true})).toBeVisible();
    const simulations:Simulation[]=await (await request.get('/api/v1/simulations')).json();
    const snapshot=simulations.find(s=>s.recipe_id===recipeId)!;
    expect(Number(snapshot.results.production_cost)).toBe(162.5);
    await nav.getByRole('button',{name:'Perfil',exact:true}).click();
    await page.getByLabel('Tipo de negócio').selectOption('food');
    await page.getByRole('button',{name:'Salvar perfil do negócio'}).click();
    await expect(nav.getByRole('button',{name:'Receitas',exact:true})).toBeVisible();
    await nav.getByRole('button',{name:'Receitas',exact:true}).click();
    await page.locator('article').filter({hasText:name}).getByRole('button',{name:'Ver e editar serviço'}).click();
    await expect(page.getByLabel('Nome do serviço')).toHaveValue(name);
    await expect(page.getByTestId('unit-cost')).toHaveText('R$ 16,25');
    const historical=await (await request.get(`/api/v1/simulations/${snapshot.id}`)).json();
    expect(historical.recipe_snapshot.additional_costs).toEqual(saved.additional_costs);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  }finally{
    if(recipeId)await request.delete(`/api/v1/recipes/${recipeId}`);
    await request.put('/api/v1/profile',{data:{...original,business_name:original.business_name||'Negócio de teste'}});
  }
});

test('questionário precede criação real da conta e personaliza o primeiro acesso',async({browser},testInfo)=>{
  const prefix=process.env.E2E_SIGNUP_PREFIX;
  test.skip(!prefix,'Requer prefixo de conta temporária para limpeza administrativa após o teste.');
  const context=await browser.newContext({storageState:{cookies:[],origins:[]}});
  try{
    const page=await context.newPage();
    await page.goto('/cadastro');
    await expect(page.getByLabel('Senha',{exact:true})).toHaveCount(0);
    await page.getByLabel('Nome do negócio').fill('Salão de teste');
    await page.getByLabel('Tipo de negócio').selectOption('beauty');
    await page.getByLabel('O que você quer melhorar primeiro?').selectOption('set_prices');
    await expect(page.locator('[data-application-preview] h1')).toHaveText('Biblioteca de produtos');
    await expect(page.locator('[data-application-preview] tbody')).toContainText('Shampoo profissional');
    await page.getByRole('button',{name:'Continuar para criar conta'}).click();
    await page.getByLabel('E-mail',{exact:true}).fill(`${prefix}-${testInfo.project.name}@example.test`);
    await page.getByLabel('Senha',{exact:true}).fill('senha-de-teste-12345');
    await page.getByLabel('Confirme sua senha').fill('outra-senha-12345');
    await page.getByRole('button',{name:'Criar minha conta',exact:true}).click();
    await expect(page.locator('form').getByRole('alert')).toHaveText('As senhas não coincidem.');
    await page.getByLabel('Confirme sua senha').fill('senha-de-teste-12345');
    await page.getByRole('button',{name:'Criar minha conta',exact:true}).click();
    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByRole('heading',{name:'Biblioteca de produtos'})).toBeVisible();
    expect(await (await context.request.get('/api/v1/profile')).json()).toEqual({business_name:'Salão de teste',business_type:'beauty',pricing_goal:'set_prices'});
  }finally{await context.close();}
});
