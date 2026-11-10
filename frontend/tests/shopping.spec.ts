import {test,expect} from '@playwright/test';
import {shoppingTotals,type ShoppingList,type ShoppingItem} from '../lib/shopping';

test('estimativas de compras preservam centavos e distinguem itens comprados',()=>{
  const items:ShoppingItem[]=[{ingredient_id:'a',name:'Farinha',packages:2,purchased:true,measurement_unit:'g',package_quantity:'1000',package_price:'5.27'},
    {ingredient_id:'b',name:'Leite',packages:3,purchased:false,measurement_unit:'ml',package_quantity:'1000',package_price:'8'}];
  const result=shoppingTotals(items);expect(result.total.toString()).toBe('34.54');expect(result.pending.toString()).toBe('24');
});

test('seleciona biblioteca, salva compras, marca comprado, preserva referência e exporta PDF',async({page,request},testInfo)=>{
  const suffix=`${testInfo.project.name}-${Date.now()}`;
  const ids:string[]=[];let listId:string|undefined;
  const names={flour:`Farinha ${suffix}`,milk:`Leite ${suffix}`,eggs:`Ovos ${suffix}`};
  try{
    for(const [name,unit,quantity,price] of [[names.flour,'g','1000','5.27'],[names.milk,'ml','1000','8'],[names.eggs,'un','12','18']]){
      const response=await request.post('/api/v1/ingredients',{data:{name,measurement_unit:unit,package_quantity:quantity,package_price:price}});
      expect(response.status()).toBe(201);ids.push((await response.json()).id);
    }
    await page.goto('/app');
    const nav=page.getByRole('navigation',{name:testInfo.project.name==='mobile'?'Navegação móvel':'Navegação principal'});
    await nav.getByRole('button',{name:'Compras',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Listas de compras',exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Nova lista',exact:true}).click();
    const dialog=page.getByRole('dialog');
    const name=`Compras ${suffix}`;
    await dialog.getByLabel('Nome da lista',{exact:true}).fill(name);
    await dialog.getByRole('button',{name:'Salvar lista',exact:true}).click();
    await expect(dialog.getByRole('alert')).toContainText('Selecione pelo menos um item');
    await dialog.getByLabel('Adicionar à lista: '+names.flour,{exact:true}).check();
    await dialog.getByLabel('Adicionar à lista: '+names.milk,{exact:true}).check();
    await dialog.getByLabel('Embalagens de '+names.flour,{exact:true}).fill('2');
    await dialog.getByLabel('Embalagens de '+names.milk,{exact:true}).fill('3');
    await dialog.getByLabel('Comprado: '+names.flour,{exact:true}).check();
    await expect(dialog.getByTestId('shopping-total')).toHaveText('R$ 34,54');
    await expect(dialog.getByTestId('shopping-pending')).toHaveText('R$ 24,00');
    await dialog.getByLabel('Observações').fill('Conferir validade.');
    await dialog.getByRole('button',{name:'Salvar lista',exact:true}).click();
    await expect(dialog).toHaveCount(0);
    const lists:ShoppingList[]=await (await request.get('/api/v1/shopping-lists')).json();
    const saved=lists.find(list=>list.name===name)!;listId=saved.id;
    expect(Number(saved.estimated_total)).toBe(34.54);expect(saved.purchased_count).toBe(1);
    const card=page.locator(`[data-shopping-id="${listId}"]`);
    const pdf=await request.get(`/api/v1/shopping-lists/${listId}/pdf`);
    expect(pdf.status()).toBe(200);expect((await pdf.body()).subarray(0,5).toString()).toBe('%PDF-');
    const downloadPromise=page.waitForEvent('download');await card.getByRole('link',{name:'Exportar PDF'}).click();
    expect((await downloadPromise).suggestedFilename()).toContain('lista-de-compras-');
    await request.put(`/api/v1/ingredients/${ids[0]}`,{data:{name:names.flour,measurement_unit:'g',package_quantity:'1000',package_price:'9'}});
    await page.reload();await nav.getByRole('button',{name:'Compras',exact:true}).click();
    await page.getByLabel('Pesquisar listas de compras').fill(name);
    await card.getByRole('button',{name:'Ver e editar lista'}).click();
    await expect(dialog.getByTestId('shopping-total')).toHaveText('R$ 34,54');
    await dialog.getByLabel('Adicionar à lista: '+names.eggs,{exact:true}).check();
    await expect(dialog.getByTestId('shopping-total')).toHaveText('R$ 52,54');
    await dialog.getByRole('button',{name:'Salvar lista',exact:true}).click();await expect(dialog).toHaveCount(0);
    await request.delete(`/api/v1/ingredients/${ids[0]}`);
    await page.reload();await nav.getByRole('button',{name:'Compras',exact:true}).click();
    await card.getByRole('button',{name:'Ver e editar lista'}).click();
    await expect(dialog.getByLabel('Embalagens de '+names.flour,{exact:true})).toHaveValue('2');
    await dialog.getByLabel('Embalagens de '+names.flour,{exact:true}).fill('1');
    await dialog.getByLabel('Comprado: '+names.flour,{exact:true}).uncheck();
    await expect(dialog.getByTestId('shopping-pending')).toHaveText('R$ 47,27');
    await dialog.getByRole('button',{name:'Salvar lista',exact:true}).click();await expect(dialog).toHaveCount(0);
    expect((await (await request.get(`/api/v1/shopping-lists/${listId}`)).json()).items[0].package_price).toBe('5.27');
    if(testInfo.project.name==='mobile')await page.setViewportSize({width:320,height:740});
    await expect(nav.getByRole('button',{name:'Compras',exact:true})).toBeInViewport();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
    await page.screenshot({path:`test-results/shopping-${testInfo.project.name}.png`,fullPage:true,animations:'disabled'});
    await card.getByRole('button',{name:'Excluir lista '+name,exact:true}).click();
    await page.getByRole('dialog').getByRole('button',{name:'Confirmar',exact:true}).click();
    await expect(card).toHaveCount(0);listId=undefined;
    expect((await request.get(`/api/v1/ingredients/${ids[1]}`)).status()).toBe(200);
  }finally{if(listId)await request.delete(`/api/v1/shopping-lists/${listId}`);for(const id of ids)await request.delete(`/api/v1/ingredients/${id}`);}
});
