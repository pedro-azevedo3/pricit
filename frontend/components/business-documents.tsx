'use client';
import { useEffect, useState } from 'react';
import { Plus, FileText, Download, Share2, Pencil, Trash2, X, Save } from 'lucide-react';
import Decimal from 'decimal.js';
import { api } from '@/lib/api';
import { d } from '@/lib/calculations';
import { type Recipe } from '@/lib/types';
import { type BusinessDocument, type DocumentInput, type DocumentItem, baseTerms, documentCategories, documentMoney, documentTotals, inputFromDocument, newDocument } from '@/lib/documents';
import { useBusiness } from './business-context';
import { Button } from './ui/button';
import { Confirm, Empty, ErrorBox, Loading, Modal } from './shared';
import styles from './business-documents.module.css';

export function BusinessDocuments({ recipes, notify }: { recipes:Recipe[];notify:(message:string)=>void }) {
  const { profile, business }=useBusiness();
  const [items,setItems]=useState<BusinessDocument[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const [open,setOpen]=useState(false),[editing,setEditing]=useState<string|null>(null),[busy,setBusy]=useState(false),[formError,setFormError]=useState('');
  const [draft,setDraft]=useState<DocumentInput>(()=>newDocument('quote',profile.business_name)),[target,setTarget]=useState<BusinessDocument|null>(null);
  const [search,setSearch]=useState(''),[filter,setFilter]=useState('all'),[source,setSource]=useState('');
  async function load(){const data=await api<BusinessDocument[]>('/documents');setItems(data);}
  useEffect(()=>{load().catch(e=>setError(e.message)).finally(()=>setLoading(false));},[]);
  function edit(item?:BusinessDocument,kind:DocumentInput['kind']='quote') {
    setEditing(item?.id||null);setDraft(item?inputFromDocument(item):newDocument(kind,profile.business_name));
    setFormError('');setSource('');setOpen(true);
  }
  function convert(item:BusinessDocument){setEditing(null);setDraft({...inputFromDocument(item),kind:'contract',valid_until:null,terms:item.terms||baseTerms});setFormError('');setSource('');setOpen(true);}
  function set<K extends keyof DocumentInput>(key:K,value:DocumentInput[K]){setDraft(current=>({...current,[key]:value}));}
  function patchItem(index:number,patch:Partial<DocumentItem>){set('items',draft.items.map((item,i)=>i===index?{...item,...patch}:item));}
  function addSource(){const recipe=recipes.find(r=>r.id===source);if(!recipe)return;
    const item:DocumentItem={description:recipe.name,category:'service',quantity:'1',unit_price:d(recipe.pricing.effective_price).toFixed(2,Decimal.ROUND_HALF_UP)};
    set('items',draft.items.length===1&&!draft.items[0].description&&!draft.items[0].quantity&&!draft.items[0].unit_price?[item]:[...draft.items,item]);setSource('');
  }
  const totals=documentTotals(draft.items,draft.discount);
  async function save(event:React.FormEvent){event.preventDefault();setFormError('');
    if(totals.total.lt(0)){setFormError('O desconto não pode superar o subtotal.');return;}
    setBusy(true);try{await api(editing?`/documents/${editing}`:'/documents',{method:editing?'PUT':'POST',body:JSON.stringify({...draft,discount:draft.discount||'0'})});await load();setOpen(false);notify('Documento salvo. O PDF está pronto para exportar ou compartilhar.');}
    catch(e){setFormError((e as Error).message);}finally{setBusy(false);}
  }
  async function remove(){if(!target)return;setBusy(true);try{await api(`/documents/${target.id}`,{method:'DELETE'});await load();setTarget(null);notify('Documento excluído.');}catch(e){setError((e as Error).message);setTarget(null);}finally{setBusy(false);}}
  async function share(item:BusinessDocument){setError('');setBusy(true);try{
    const response=await fetch(`/api/v1/documents/${item.id}/pdf`,{cache:'no-store'});
    if(!response.ok)throw new Error('Não foi possível carregar o PDF. Entre novamente se sua sessão expirou.');
    const blob=await response.blob();const name=`${item.kind==='contract'?'contrato':'orcamento'}-${item.id.slice(0,8)}.pdf`;
    const file=new File([blob],name,{type:'application/pdf'});
    if(navigator.canShare?.({files:[file]})&&navigator.share){await navigator.share({files:[file],title:item.title});}
    else{const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('PDF baixado. Anexe o arquivo no WhatsApp ou e-mail para enviar ao cliente.');}
  }catch(e){if(!(e instanceof DOMException&&e.name==='AbortError'))setError((e as Error).message);}finally{setBusy(false);}}
  const filtered=items.filter(item=>(filter==='all'||item.kind===filter)&&`${item.title} ${item.client_name}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')));
  return <>
    <div className={styles.heading}><div><p className="eyebrow">Do preço ao combinado com o cliente</p><h1>Contratos e orçamentos</h1><p>Organize escopo, itens, valores, prazos e condições. Salve seus documentos e compartilhe o PDF com o cliente.</p></div><div className={styles.actions}><Button onClick={()=>edit()}><Plus size={16}/>Novo orçamento</Button><Button variant="outline" onClick={()=>edit(undefined,'contract')}><FileText size={16}/>Novo contrato</Button></div></div>
    <div className={`panel ${styles.filters}`}><label>Buscar documento<input aria-label="Pesquisar documentos" placeholder="Título ou nome do cliente…" value={search} onChange={e=>setSearch(e.target.value)}/></label><label>Tipo de documento<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Todos</option><option value="quote">Orçamentos</option><option value="contract">Contratos</option></select></label></div>
    <ErrorBox message={error}/>
    {loading?<Loading/>:filtered.length?<div className={styles.cards}>{filtered.map(item=><article key={item.id} data-document-id={item.id} className={`panel ${styles.card}`}><span className={styles.badge}>{item.kind==='quote'?'Orçamento':'Contrato'} · {item.id.slice(0,8).toUpperCase()}</span><h2>{item.title}</h2><p>Cliente: {item.client_name}<br/>Emissão: {item.issue_date.split('-').reverse().join('/')}</p><strong className={styles.cardTotal}>{documentMoney(item.totals.total)}</strong><div className={styles.actions}>
      <Button variant="outline" onClick={()=>edit(item)}><Pencil size={15}/>Editar documento</Button><Button asChild variant="outline"><a href={`/api/v1/documents/${item.id}/pdf`}><Download size={15}/>Exportar PDF</a></Button><Button variant="outline" disabled={busy} onClick={()=>share(item)}><Share2 size={15}/>Compartilhar PDF</Button>
      {item.kind==='quote'&&<Button variant="ghost" onClick={()=>convert(item)}>Usar como contrato</Button>}<Button variant="ghost" size="icon" aria-label={`Excluir documento ${item.title}`} onClick={()=>setTarget(item)}><Trash2 size={15}/></Button>
    </div></article>)}</div>:<Empty title={search?'Nenhum documento encontrado':'Seu próximo combinado começa aqui'} description="Crie um orçamento ou contrato com os dados do cliente e as condições do trabalho."/>}
    <p className={`${styles.source} !mt-6`}>O PDF não coleta assinaturas nem registra aceite eletrônico. Revise o modelo e combine as condições com o cliente antes do envio. Os documentos ficam privados na sua conta.</p>
    <Modal open={open} onClose={()=>!busy&&setOpen(false)} title={draft.kind==='quote'?'Orçamento':'Contrato'} description="Preencha, revise e salve. A exportação utiliza os valores da versão salva." wide>
      <form onSubmit={save} className={styles.form}>
        <div className={styles.grid}><label>Título do documento<input required maxLength={200} placeholder={`Ex.: ${business.sampleOffer}`} value={draft.title} onChange={e=>set('title',e.target.value)}/></label><label>Data de emissão<input required type="date" value={draft.issue_date} onChange={e=>set('issue_date',e.target.value)}/></label></div>
        <section><h3>Prestador / fornecedor</h3><div className={styles.grid}><label>Nome do prestador<input required maxLength={200} value={draft.provider_name} onChange={e=>set('provider_name',e.target.value)} placeholder="Nome ou razão social"/></label><label>CPF/CNPJ do prestador (opcional)<input maxLength={40} value={draft.provider_document} onChange={e=>set('provider_document',e.target.value)} placeholder="CPF ou CNPJ"/></label><label>Contato do prestador (opcional)<input maxLength={300} value={draft.provider_contact} onChange={e=>set('provider_contact',e.target.value)} placeholder="E-mail ou telefone"/></label><label>Endereço do prestador (opcional)<input maxLength={500} value={draft.provider_address} onChange={e=>set('provider_address',e.target.value)} placeholder="Endereço completo"/></label></div></section>
        <section><h3>Cliente / contratante</h3><div className={styles.grid}><label>Nome do cliente<input required maxLength={200} value={draft.client_name} onChange={e=>set('client_name',e.target.value)} placeholder="Nome ou razão social"/></label><label>CPF/CNPJ do cliente (opcional)<input maxLength={40} value={draft.client_document} onChange={e=>set('client_document',e.target.value)} placeholder="CPF ou CNPJ"/></label><label>Contato do cliente (opcional)<input maxLength={300} value={draft.client_contact} onChange={e=>set('client_contact',e.target.value)} placeholder="E-mail ou telefone"/></label><label>Endereço do cliente (opcional)<input maxLength={500} value={draft.client_address} onChange={e=>set('client_address',e.target.value)} placeholder="Endereço completo"/></label></div></section>
        <section><h3>Escopo e prazos</h3><label>Descrição do trabalho e entregas<textarea required rows={4} maxLength={10000} value={draft.scope} onChange={e=>set('scope',e.target.value)} placeholder="Descreva o que será feito, as entregas, as quantidades e o que está incluído."/></label><div className={styles.grid}><label>Início previsto<input required type="date" value={draft.start_date} onChange={e=>set('start_date',e.target.value)}/></label><label>Término previsto<input required type="date" min={draft.start_date||undefined} value={draft.end_date} onChange={e=>set('end_date',e.target.value)}/></label>{draft.kind==='quote'&&<label>Validade do orçamento<input required type="date" min={draft.issue_date} value={draft.valid_until||''} onChange={e=>set('valid_until',e.target.value||null)}/></label>}</div></section>
        <section><h3>Itens e valores</h3><p className={styles.intro}>Discrimine serviços, mão de obra, materiais e equipamentos quando aplicável. Itens copiados de fichas usam apenas o preço de venda, sem revelar seus custos internos.</p>
          {recipes.length>0&&<div className={styles.grid}><label>Adicionar ficha cadastrada<select value={source} onChange={e=>setSource(e.target.value)}><option value="">Selecione uma ficha…</option>{recipes.map(recipe=><option key={recipe.id} value={recipe.id}>{recipe.name}</option>)}</select></label><Button variant="outline" disabled={!source||draft.items.length>=100} onClick={addSource}>Adicionar ficha ao documento</Button></div>}
          {draft.items.map((item,index)=><fieldset key={index} className={styles.item}><legend className="px-2 text-xs font-semibold">Item {index+1}</legend><div className={styles.itemHeading}><strong>{documentMoney(totals.lines[index])}</strong><Button variant="ghost" size="icon" disabled={draft.items.length===1} aria-label={`Remover item ${index+1}`} onClick={()=>set('items',draft.items.filter((_,i)=>i!==index))}><X size={16}/></Button></div><div className={styles.grid}><label>Descrição do item<input required maxLength={1000} placeholder="Ex.: Sessão, peça ou entrega" value={item.description} onChange={e=>patchItem(index,{description:e.target.value})}/></label><label>Categoria do item<select value={item.category} onChange={e=>patchItem(index,{category:e.target.value as DocumentItem['category']})}>{Object.entries(documentCategories).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label></div><div className={styles.itemAmounts}><label>Quantidade do item<input required type="number" min="0.000001" max="999999999999" step="0.000001" placeholder="Ex.: 1" value={item.quantity} onChange={e=>patchItem(index,{quantity:e.target.value})}/></label><label>Preço unitário do item (R$)<input required type="number" min="0" max="999999999999" step="0.01" placeholder="Ex.: 150,00" value={item.unit_price} onChange={e=>patchItem(index,{unit_price:e.target.value})}/></label></div></fieldset>)}
          <Button variant="outline" disabled={draft.items.length>=100} onClick={()=>set('items',[...draft.items,{description:'',category:'service',quantity:'',unit_price:''}])}><Plus size={15}/>Adicionar item</Button>
          <label>Desconto no documento (R$, opcional)<input type="number" min="0" max="999999999999" step="0.01" placeholder="Ex.: 0,00" value={draft.discount} onChange={e=>set('discount',e.target.value)}/></label>
          <div className={styles.summary} aria-live="polite"><div><span>Subtotal</span><strong>{documentMoney(totals.subtotal)}</strong></div><div><span>Desconto</span><strong>{documentMoney(draft.discount||'0')}</strong></div><div className={styles.total}><span>Total do documento</span><output data-testid="document-total">{documentMoney(totals.total)}</output></div></div>
        </section>
        <section><h3>Pagamento e condições</h3><label>Condições de pagamento<textarea required maxLength={5000} rows={3} value={draft.payment_terms} onChange={e=>set('payment_terms',e.target.value)} placeholder="Informe valores, parcelas, vencimentos e meios de pagamento combinados."/></label><label>Condições e responsabilidades {draft.kind==='quote'?'(opcional)':''}<textarea required={draft.kind==='contract'} maxLength={15000} rows={7} value={draft.terms} onChange={e=>set('terms',e.target.value)} placeholder="Defina responsabilidades, revisões, reagendamento e cancelamento conforme o trabalho."/></label>
          <p className={styles.source}>Modelo editável. Adapte ao serviço e revise as condições antes de compartilhar. Referências: <a href="https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm#art40" target="_blank" rel="noreferrer">CDC, art. 40 (orçamentos)</a> e <a href="https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm#art104" target="_blank" rel="noreferrer">Código Civil, arts. 104 e 107</a>.</p>
        </section>
        <ErrorBox message={formError}/><div className={styles.buttons}><Button variant="outline" disabled={busy} onClick={()=>setOpen(false)}>Cancelar</Button><Button type="submit" disabled={busy}><Save size={16}/>{busy?'Salvando…':'Salvar documento'}</Button></div>
      </form>
    </Modal>
    {target&&<Confirm title="Excluir documento?" description={`“${target.title}” será removido da sua conta. Arquivos já compartilhados com o cliente não serão alterados.`} onClose={()=>!busy&&setTarget(null)} onConfirm={remove} busy={busy}/>}
  </>;
}
