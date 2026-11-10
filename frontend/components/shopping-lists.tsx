'use client';
import { useEffect, useState } from 'react';
import { Download, Plus, ShoppingBasket, Trash2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { type Ingredient } from '@/lib/types';
import { fromIngredient, shoppingMoney, shoppingQuantity, shoppingTotals, type ShoppingDraft, type ShoppingItem, type ShoppingList } from '@/lib/shopping';
import { useBusiness } from './business-context';
import { Button } from './ui/button';
import { Confirm, Empty, ErrorBox, Loading, Modal } from './shared';
import styles from './shopping-lists.module.css';

const blank=():ShoppingDraft=>({name:'',notes:'',items:[]});

export function ShoppingLists({ ingredients, onLibrary, notify }: {ingredients:Ingredient[];onLibrary:()=>void;notify:(message:string)=>void}) {
  const {business}=useBusiness();
  const [lists,setLists]=useState<ShoppingList[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const [draft,setDraft]=useState<ShoppingDraft>(blank),[editing,setEditing]=useState<ShoppingList|null>(null),[open,setOpen]=useState(false);
  const [search,setSearch]=useState(''),[catalogSearch,setCatalogSearch]=useState(''),[formError,setFormError]=useState(''),[busy,setBusy]=useState(false),[target,setTarget]=useState<ShoppingList|null>(null);
  async function load(){setLists(await api<ShoppingList[]>('/shopping-lists'));setError('');}
  useEffect(()=>{load().catch(e=>setError(e.message)).finally(()=>setLoading(false));},[]);
  function edit(list?:ShoppingList){setEditing(list||null);setDraft(list?{name:list.name,notes:list.notes,items:list.items.map(item=>({...item}))}:blank());setFormError('');setCatalogSearch('');setOpen(true);}
  function toggle(ingredient:Ingredient){setFormError('');const selected=draft.items.some(item=>item.ingredient_id===ingredient.id);
    if(selected){setDraft(current=>({...current,items:current.items.filter(item=>item.ingredient_id!==ingredient.id)}));return;}
    if(draft.items.length>=1000)return;
    const original=editing?.items.find(item=>item.ingredient_id===ingredient.id);
    setDraft(current=>({...current,items:[...current.items,original?{...original,packages:1,purchased:false}:fromIngredient(ingredient)]}));
  }
  function patch(index:number,value:Partial<ShoppingItem>){setDraft(current=>({...current,items:current.items.map((item,i)=>i===index?{...item,...value}:item)}));}
  async function save(event:React.FormEvent){event.preventDefault();setFormError('');if(!draft.items.length){setFormError('Selecione pelo menos um item da sua biblioteca.');return;}
    setBusy(true);try{await api(editing?`/shopping-lists/${editing.id}`:'/shopping-lists',{method:editing?'PUT':'POST',body:JSON.stringify({name:draft.name,notes:draft.notes,items:draft.items.map(({ingredient_id,packages,purchased})=>({ingredient_id,packages,purchased}))})});await load();setOpen(false);notify('Lista de compras salva. O PDF está pronto para exportar.');}
    catch(e){setFormError((e as Error).message);}finally{setBusy(false);}
  }
  async function remove(){if(!target)return;setBusy(true);try{await api(`/shopping-lists/${target.id}`,{method:'DELETE'});await load();setTarget(null);notify('Lista de compras excluída.');}catch(e){setError((e as Error).message);setTarget(null);}finally{setBusy(false);}}
  const catalog=ingredients.filter(item=>item.is_active&&item.name.toLocaleLowerCase('pt-BR').includes(catalogSearch.toLocaleLowerCase('pt-BR')));
  const filtered=lists.filter(list=>list.name.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')));
  const totals=shoppingTotals(draft.items);
  return <>
    <div className={styles.heading}><div><p className="eyebrow">Sua próxima compra, organizada</p><h1>Listas de compras</h1><p>Selecione itens da sua biblioteca, defina quantas embalagens comprar e leve sua lista em PDF.</p></div><Button onClick={()=>edit()}><Plus size={16}/>Nova lista</Button></div>
    <label className={styles.search}>Buscar lista<input aria-label="Pesquisar listas de compras" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Nome da lista…"/></label>
    <ErrorBox message={error}/>{error&&<Button variant="outline" onClick={()=>{setLoading(true);load().catch(e=>setError(e.message)).finally(()=>setLoading(false));}}>Tentar novamente</Button>}
    {loading?<Loading/>:!error&&(filtered.length?<div className={styles.cards}>{filtered.map(list=><article key={list.id} data-shopping-id={list.id} className={`panel ${styles.card}`}><ShoppingBasket size={23} aria-hidden="true"/><h2>{list.name}</h2><p>{list.items.length} item(ns) · {list.purchased_count} comprado(s)<br/>Atualizada em {new Date(list.updated_at).toLocaleDateString('pt-BR')}</p><div className={styles.cardTotals}><div><p>Total estimado</p><strong>{shoppingMoney(list.estimated_total)}</strong></div><div><p>Pendente de compra</p><strong>{shoppingMoney(list.pending_total)}</strong></div></div><div className={styles.actions}><Button variant="outline" onClick={()=>edit(list)}>Ver e editar lista</Button><Button asChild variant="outline"><a href={`/api/v1/shopping-lists/${list.id}/pdf`}><Download size={15}/>Exportar PDF</a></Button><Button variant="ghost" size="icon" aria-label={`Excluir lista ${list.name}`} onClick={()=>setTarget(list)}><Trash2 size={15}/></Button></div></article>)}</div>:<Empty title={search?'Nenhuma lista encontrada':'Organize sua próxima compra'} description="Escolha itens já cadastrados e monte sua primeira lista de compras."/>) }
    <Modal open={open} onClose={()=>!busy&&setOpen(false)} title={editing?'Editar lista de compras':'Nova lista de compras'} description="Selecione itens cadastrados. O PDF utiliza a versão salva da lista." wide>
      <form onSubmit={save} className={styles.form}>
        <label>Nome da lista<input required maxLength={200} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})} placeholder="Ex.: Compras da semana"/></label>
        <section><h3>Selecionar da biblioteca</h3><p className={styles.note}>Selecione seus {business.resources.toLowerCase()}. Use o tamanho da embalagem cadastrada como referência e ajuste quantas embalagens deseja comprar abaixo.</p><label>Pesquisar na biblioteca<input value={catalogSearch} onChange={e=>setCatalogSearch(e.target.value)} placeholder="Nome do item ou marca…"/></label>
          {catalog.length?<div className={styles.catalog}>{catalog.map(ingredient=>{const selected=draft.items.some(item=>item.ingredient_id===ingredient.id);return <label className={styles.catalogItem} key={ingredient.id}><input type="checkbox" aria-label={`Adicionar à lista: ${ingredient.name}`} checked={selected} disabled={!selected&&draft.items.length>=1000} onChange={()=>toggle(ingredient)}/><span><strong>{ingredient.name}</strong><small>{shoppingQuantity(ingredient.package_quantity)} {ingredient.measurement_unit} por embalagem · {shoppingMoney(ingredient.package_price)}</small></span></label>;})}</div>:<p className={styles.note}>{catalogSearch?'Nenhum item encontrado. Tente outro nome.':'Cadastre itens na sua biblioteca para adicioná-los à lista.'}</p>}
          {!ingredients.some(item=>item.is_active)&&<Button variant="outline" onClick={onLibrary}>Abrir biblioteca</Button>}
        </section>
        <section><h3>Itens da lista ({draft.items.length})</h3>{!draft.items.length&&<p className={styles.note}>Marque os itens que deseja comprar na seleção acima.</p>}
          {draft.items.map((item,index)=><div className={styles.selected} key={item.ingredient_id}><div className={styles.itemHeading}><div><strong>{item.name}</strong><p>{shoppingQuantity(item.package_quantity)} {item.measurement_unit} por embalagem · {shoppingMoney(item.package_price)} cada</p></div><Button variant="ghost" size="icon" aria-label={`Remover da lista: ${item.name}`} onClick={()=>setDraft({...draft,items:draft.items.filter((_,i)=>i!==index)})}><X size={16}/></Button></div><div className={styles.itemFields}><label>Quantidade de embalagens<input required type="number" inputMode="numeric" min="1" max="1000000" step="1" aria-label={`Embalagens de ${item.name}`} value={item.packages||''} placeholder="Ex.: 2" onChange={e=>patch(index,{packages:Number(e.target.value)})}/></label><label className={styles.purchased}><input type="checkbox" aria-label={`Comprado: ${item.name}`} checked={item.purchased} onChange={e=>patch(index,{purchased:e.target.checked})}/>Comprado</label><output className={styles.linePrice}>{shoppingMoney(totals.lines[index])}</output></div></div>)}
        </section>
        <label>Observações (opcional)<textarea rows={3} maxLength={5000} value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})} placeholder="Ex.: Conferir validade e comparar marcas no mercado."/></label>
        <div className={styles.summary} aria-live="polite"><div><p>Total estimado</p><strong data-testid="shopping-total">{shoppingMoney(totals.total)}</strong></div><div><p>Pendente de compra</p><strong data-testid="shopping-pending">{shoppingMoney(totals.pending)}</strong></div></div>
        <p className={styles.note}>A lista preserva os dados e preços de referência de cada item ao adicioná-lo. Confira os preços no momento da compra. Marcar como comprado não altera os cadastros da biblioteca.</p>
        <ErrorBox message={formError}/><div className={styles.buttons}>{editing&&<Button asChild variant="outline"><a href={`/api/v1/shopping-lists/${editing.id}/pdf`}>PDF da versão salva</a></Button>}<Button variant="outline" disabled={busy} onClick={()=>setOpen(false)}>Cancelar</Button><Button type="submit" disabled={busy}>{busy?'Salvando…':'Salvar lista'}</Button></div>
      </form>
    </Modal>
    {target&&<Confirm title="Excluir lista de compras?" description={`“${target.name}” será excluída. Os itens cadastrados na biblioteca serão preservados.`} onClose={()=>!busy&&setTarget(null)} onConfirm={remove} busy={busy}/>}
  </>;
}
