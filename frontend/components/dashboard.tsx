'use client';
import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { api } from '@/lib/api';
import { Ingredient, Recipe, Simulation } from '@/lib/types';
import { Ingredients } from '@/components/ingredients';
import { Recipes } from '@/components/recipes';
import { Simulator } from '@/components/simulator';
import { PricingGuide } from '@/components/pricing-guide';
import { ErrorBox, Loading, Modal } from '@/components/shared';
import { Mascot } from '@/components/mascot';
import { AppSidebar } from '@/components/app-sidebar';
import { AppTopbar } from '@/components/app-topbar';
import { appTabs as tabs, type AppTab as Tab } from '@/lib/navigation';
import { Button } from '@/components/ui/button';
export default function Dashboard(){
 const [tab,setTab]=useState<Tab>('ingredients'),[ingredients,setIngredients]=useState<Ingredient[]>([]),[recipes,setRecipes]=useState<Recipe[]>([]),[simulations,setSimulations]=useState<Simulation[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[toast,setToast]=useState(''),[simId,setSimId]=useState(''),[help,setHelp]=useState(false);
 const [sidebarCollapsed,setSidebarCollapsed]=useState(false);
 useEffect(()=>{try{setSidebarCollapsed(localStorage.getItem('pricit-sidebar-collapsed')==='true');}catch{}},[]);
 function toggleSidebar(){setSidebarCollapsed(current=>{const next=!current;try{localStorage.setItem('pricit-sidebar-collapsed',String(next));}catch{}return next;});}
 async function logout(){try{await api('/auth/logout',{method:'POST'});window.location.replace('/login');}catch(e){setError(e instanceof Error?e.message:'Não foi possível sair.');}}
 const load=useCallback(async()=>{const [i,r,s]=await Promise.all([api<Ingredient[]>('/ingredients?include_archived=true'),api<Recipe[]>('/recipes'),api<Simulation[]>('/simulations')]);setIngredients(i);setRecipes(r);setSimulations(s);setError('');},[]);
 useEffect(()=>{api('/auth/me').then(()=>load()).catch(e=>{if(e.status===401)window.location.replace('/login');else setError(e.message);}).finally(()=>setLoading(false));},[load]);
 useEffect(()=>{if(toast){const timer=setTimeout(()=>setToast(''),5000);return()=>clearTimeout(timer);}},[toast]);
 function navigate(t:Tab){setTab(t);setError('');if(t==='guide')return;load().catch(e=>setError(e.message));}
 return <div className="min-h-dvh" data-sidebar-collapsed={sidebarCollapsed}>
 <AppSidebar activeTab={tab} collapsed={sidebarCollapsed} onNavigate={navigate} onToggle={toggleSidebar} onHelp={()=>setHelp(true)}/>
 <div className="app-workspace"><AppTopbar activeTab={tab} onLogout={logout}/>
 <main className="mx-auto max-w-[1440px] px-4 pb-28 pt-8 md:px-10 md:pt-10 lg:pb-12"><div hidden={tab!=='guide'}><PricingGuide onRecipes={()=>navigate('recipes')}/></div><div key={tab} className="page-transition">{tab!=='guide'&&<>{loading?<Loading/>:error?<><ErrorBox message={error}/><Button onClick={()=>{setLoading(true);load().catch(e=>setError(e.message)).finally(()=>setLoading(false));}}>Tentar novamente</Button></>:tab==='ingredients'?<Ingredients items={ingredients} onChange={load} notify={setToast}/>:tab==='recipes'?<Recipes recipes={recipes} ingredients={ingredients} onChange={load} notify={setToast} onSimulate={id=>{setSimId(id);setTab('simulator');}}/>:<Simulator key={simId} initialId={simId} recipes={recipes} simulations={simulations} onChange={load} notify={setToast}/>}</>}</div><footer className="mt-10 flex items-center justify-between gap-2 border-t border-[var(--border)] pt-5 text-[10px] text-[var(--muted)]"><span>Pequenos detalhes. Melhores resultados.</span><span>pricit · Precifique com confiança</span></footer></main></div>
 <nav aria-label="Navegação móvel" className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-[var(--border)] bg-[var(--surface)]/95 py-3 backdrop-blur lg:hidden">{tabs.map(t=><button key={t.id} onClick={()=>navigate(t.id)} aria-current={tab===t.id?'page':undefined} className={`flex min-w-0 flex-1 cursor-pointer flex-col items-center gap-1.5 rounded-xl px-2 py-1.5 text-[10px] ${tab===t.id?'bg-[var(--accent)] text-[var(--brand-text)]':'text-[var(--muted)]'}`}><t.icon size={19}/>{t.name}</button>)}</nav>
 {toast&&<div role="status" className="toast-transition fixed bottom-24 right-4 z-[60] flex max-w-[calc(100%-2rem)] items-center gap-3 rounded-xl bg-[var(--brand)] px-5 py-4 text-sm text-[var(--on-brand)] shadow-lg lg:bottom-6"><Mascot pose="cool" size={44} className="shrink-0"/>{toast}<button aria-label="Fechar aviso" onClick={()=>setToast('')}><X size={15}/></button></div>}
 <Modal open={help} onClose={()=>setHelp(false)} title="Do ingrediente ao lucro" description="Três passos para precificar com confiança."><Mascot pose="cool" size={112} className="mx-auto mb-6"/><ol className="space-y-5 text-sm leading-6"><li><strong>1. Cadastre seus ingredientes.</strong><p className="text-[var(--muted)]">Informe quantidade e preço da embalagem. Calculamos o custo por grama, mililitro ou unidade.</p></li><li><strong>2. Monte suas receitas.</strong><p className="text-[var(--muted)]">Inclua ingredientes, embalagens, despesas e mão de obra. O lucro desejado é um acréscimo sobre o custo (markup).</p></li><li><strong>3. Precifique suas vendas.</strong><p className="text-[var(--muted)]">Compare o custo proporcional com a produção em lotes. Salve cenários e exporte seus PDFs.</p></li></ol></Modal></div>;
}
