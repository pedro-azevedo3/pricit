'use client';

import { type FormEvent, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowUpRight, Check, Info, Leaf, BookOpen, ChartNoAxesCombined, ArrowRight, Settings2, ChevronDown } from 'lucide-react';
import { api } from '@/lib/api';
import styles from './auth-screen.module.css';

function GoogleMark() {
  return <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.58-4.12H3.07v2.59A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.42 13.92A6 6 0 0 1 6.1 12c0-.67.11-1.32.32-1.92V7.49H3.07A10 10 0 0 0 2 12c0 1.61.39 3.14 1.07 4.51l3.35-2.59Z"/><path fill="#EA4335" d="M12 5.96c1.47 0 2.79.5 3.83 1.5l2.87-2.88A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.49l3.35 2.59C7.2 7.72 9.4 5.96 12 5.96Z"/></svg>;
}

function ProductPreview({ register }: { register: boolean }) {
  return <aside className={styles.previewPanel} aria-label="Conheça o pricit">
    <div className={styles.previewWindow} aria-label="Prévia ilustrativa de uma receita no pricit">
      <div className={styles.previewSidebar} aria-hidden="true">
        <span className={styles.previewBrand}>p<span>·</span></span>
        <span><Leaf size={21}/></span><span className={styles.previewActive}><BookOpen size={21}/></span>
        <span><ChartNoAxesCombined size={21}/></span><span className={styles.previewSettings}><Settings2 size={21}/></span>
      </div>
      <div className={styles.previewContent}>
        <div className={styles.previewTopline}><span>Meu negócio <span>/</span> Receitas</span><span className={styles.exampleLabel}>PRÉVIA ILUSTRATIVA</span></div>
        <div className={styles.previewHeading}><div><span className={styles.previewEyebrow}>CADA DETALHE NA CONTA</span><h2>Brownie da casa</h2><p>Sua receita boa. Seu preço certo.</p></div><span className={styles.recipeSelector}>Minhas receitas <ChevronDown size={13}/></span></div>
        <div className={styles.previewMetrics}>
          <div><span>Custo da receita</span><strong><small>R$</small> 54,00</strong><p>12 unidades de rendimento</p></div>
          <div><span>Custo por unidade</span><strong><small>R$</small> 4,50</strong><p>Todos os custos incluídos</p></div>
          <div className={styles.suggestedPrice}><span>Preço sugerido</span><strong><small>R$</small> 7,20</strong><p><Check size={13}/> Markup de 60%</p></div>
        </div>
        <div className={styles.previewDetails}>
          <div className={styles.costComposition}><h3><ChartNoAxesCombined size={17}/> De onde vem o custo?</h3><div className={styles.costBar} aria-hidden="true"><span/><span/><span/></div>
            <div className={styles.costRow}><span><i/>Ingredientes</span><strong>R$ 36,00</strong></div>
            <div className={styles.costRow}><span><i/>Embalagens</span><strong>R$ 6,00</strong></div>
            <div className={styles.costRow}><span><i/>Despesas e mão de obra</span><strong>R$ 12,00</strong></div>
            <div className={styles.costTotal}><span>Custo total</span><strong>R$ 54,00</strong></div>
          </div>
          <div className={styles.priceBreakdown}><h3><BookOpen size={17}/> Cada unidade, por inteiro.</h3><div className={styles.priceEquation}><span>Custo<strong>R$ 4,50</strong></span><span>+</span><span>Resultado<strong>R$ 2,70</strong></span></div><div className={styles.resultTotal}><span>Seu preço sugerido</span><strong>R$ 7,20</strong></div><p>Mais clareza para valorizar o seu trabalho.</p></div>
        </div>
        <div className={styles.previewRecipeList}><h3>Suas receitas, organizadas.</h3><div><span><BookOpen size={15}/> Brownie da casa</span><span>12 unidades</span><strong>R$ 7,20 / un.</strong><ArrowRight size={16}/></div><div><span><BookOpen size={15}/> Brigadeiro tradicional</span><span>30 unidades</span><span>Ver receita</span><ArrowRight size={16}/></div></div>
      </div>
    </div>
    <div className={styles.mascotSticker}><Image src={register ? '/mascot-happy.png' : '/mascot-cool.png'} alt={register ? 'Mascote do pricit sorrindo para dar boas-vindas' : 'Mascote do pricit de óculos escuros fazendo sinal de tudo certo'} width={150} height={150} sizes="150px" priority/></div>
    <div className={styles.previewCaption}><span className={styles.captionEyebrow}>MENOS ACHISMO. MAIS PRICIT.</span><h2>{register ? <><em>Seu talento tem valor.</em><br/>Vamos colocar na conta?</> : <><em>Do ingrediente ao lucro,</em><br/>tudo faz mais sentido.</>}</h2><p>Ingredientes, receitas e preços organizados para o seu negócio.</p><span className={styles.captionLine} aria-hidden="true"/></div>
  </aside>;
}

export function AuthScreen({ mode }: { mode: 'login' | 'register' }) {
  const register = mode === 'register';
  const [unavailable, setUnavailable] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      await api('/auth/login', {method: 'POST', body: JSON.stringify({email, password})});
      window.location.assign('/app');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Não foi possível entrar. Tente novamente.');
      setBusy(false);
    }
  }
  return <main className={styles.page} data-public-page>
    <section className={styles.formPanel} aria-labelledby="auth-title">
      <Link href="/" className={styles.back}><ArrowLeft size={15}/> Voltar ao início</Link>
      <div className={styles.formContent}>
        <Link href="/" className={styles.logo} aria-label="pricit — início"><Image src="/pricit-logo-dark-green.png" alt="pricit" width={112} height={49} priority/></Link>
        <h1 id="auth-title">{register ? <>Seu negócio.<br/>Um novo começo.</> : <>Entre e fique à vontade.</>}</h1>
        <p className={styles.description}>{register ? 'Dê o primeiro passo para organizar suas receitas e precificar com mais confiança.' : 'Seu próximo passo começa aqui. Entre para continuar cuidando do seu negócio.'}</p>
        <button type="button" className={styles.googleButton} onClick={() => setUnavailable(true)} aria-describedby={unavailable ? 'google-status' : undefined}><GoogleMark/>{register ? 'Cadastrar-se com Google' : 'Entrar com Google'}</button>
        {unavailable && <div id="google-status" role="status" className={styles.notice}><Info size={17}/><p>O acesso com Google ainda não está disponível. Tente novamente mais tarde.</p></div>}
        <div className={styles.divider}><span/>{register ? 'Acesso por e-mail' : 'Ou entre com e-mail'}<span/></div>
        {!register ? <form onSubmit={login} className={styles.emailForm}>
          <label htmlFor="email">E-mail</label>
          <input id="email" type="email" placeholder="voce@exemplo.com" autoComplete="username" maxLength={254} required value={email} onChange={event => setEmail(event.target.value)} disabled={busy}/>
          <label htmlFor="password">Senha</label>
          <input id="password" type="password" placeholder="Sua senha de acesso" autoComplete="current-password" maxLength={256} required value={password} onChange={event => setPassword(event.target.value)} disabled={busy}/>
          {error && <p role="alert" className={styles.loginError}>{error}</p>}
          <button className={styles.emailButton} disabled={busy} type="submit">{busy ? 'Entrando…' : 'Entrar com e-mail e senha'}<ArrowRight size={17}/></button>
        </form> : <div className={styles.registerAccess}>
          <span className={styles.registerIcon}><Leaf size={20}/></span><p>Para acesso por e-mail e senha, solicite uma conta ao administrador.</p>
          <ul className={styles.benefits}><li><Check size={15}/> Seus ingredientes organizados</li><li><Check size={15}/> Todos os custos da receita na conta</li><li><Check size={15}/> Mais clareza para planejar suas vendas</li></ul>
        </div>}
        <div className={styles.switchMode}>{register ? 'Já tem uma conta?' : 'Ainda não tem uma conta?'} <Link href={register ? '/login' : '/cadastro'}>{register ? 'Entrar' : 'Registre-se'}<ArrowUpRight size={14}/></Link></div>
        <p className={styles.formFooter}>Receita boa merece preço certo.</p>
      </div>
    </section>
    <ProductPreview register={register}/>
  </main>;
}
