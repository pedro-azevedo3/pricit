'use client';

import { type FormEvent, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowUpRight, Check, Info, Leaf, BookOpen, ChartNoAxesCombined } from 'lucide-react';
import { api } from '@/lib/api';
import styles from './auth-screen.module.css';

function GoogleMark() {
  return <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.58-4.12H3.07v2.59A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.42 13.92A6 6 0 0 1 6.1 12c0-.67.11-1.32.32-1.92V7.49H3.07A10 10 0 0 0 2 12c0 1.61.39 3.14 1.07 4.51l3.35-2.59Z"/><path fill="#EA4335" d="M12 5.96c1.47 0 2.79.5 3.83 1.5l2.87-2.88A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.49l3.35 2.59C7.2 7.72 9.4 5.96 12 5.96Z"/></svg>;
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
  return <div className={styles.page} data-public-page>
    <header className={styles.header}>
      <Link href="/" className={styles.logo} aria-label="pricit — início"><Image src="/pricit-logo-dark-green.png" alt="pricit" width={102} height={44} priority/></Link>
      <div className={styles.headerActions}><Link href="/" className={styles.back}><ArrowLeft size={15}/> Voltar ao início</Link></div>
    </header>
    <main className={styles.main}>
      <aside className={styles.story} aria-label="Seu negócio com o pricit">
        <div className={styles.storyCopy}><span className={styles.eyebrow}><span/> MENOS ACHISMO. MAIS PRICIT.</span><h2>{register ? <>Seu talento tem valor.<br/><em>Vamos colocar <br/>na conta?</em></> : <>Receita boa. <br/>Preço certo.<br/><em>É bom ter você aqui.</em></>}</h2><p>{register ? 'O próximo passo do seu negócio começa com um preço que faz sentido.' : 'Seus ingredientes, suas receitas e o próximo passo do seu negócio.'}</p></div>
        <div className={styles.art}><div className={styles.circle}/><Image src={register ? '/mascot-happy.png' : '/mascot-cool.png'} alt={register ? 'Mascote do pricit sorrindo para dar boas-vindas' : 'Mascote do pricit de óculos escuros fazendo sinal de tudo certo'} width={340} height={340} sizes="(max-width: 760px) 140px, 340px" priority/><span className={styles.artNote}><Check size={15}/>{register ? 'Seu trabalho merece um bom preço.' : 'Tudo no seu lugar. Bora continuar?'}</span></div>
        <span className={styles.storyFooter}>DO INGREDIENTE AO LUCRO, COM VOCÊ.</span>
      </aside>
      <section className={styles.formPanel} aria-labelledby="auth-title">
        <div className={styles.formContent}>
          <span className={styles.formEyebrow}>{register ? 'BORA COMEÇAR?' : 'BOM TER VOCÊ DE VOLTA'}</span>
          <h1 id="auth-title">{register ? <>Seu negócio.<br/>Um novo começo.</> : <>Entre e fique<br/>à vontade.</>}</h1>
          <p className={styles.description}>{register ? 'Crie sua conta com o Google e dê o primeiro passo para precificar com mais confiança.' : 'Entre com seu e-mail e senha para continuar de onde parou no pricit.'}</p>
          {!register && <form onSubmit={login} className={styles.emailForm}>
            <label htmlFor="email">E-mail</label>
            <input id="email" type="email" autoComplete="username" maxLength={254} required value={email} onChange={event => setEmail(event.target.value)} disabled={busy}/>
            <label htmlFor="password">Senha</label>
            <input id="password" type="password" autoComplete="current-password" maxLength={256} required value={password} onChange={event => setPassword(event.target.value)} disabled={busy}/>
            {error && <p role="alert" className={styles.loginError}>{error}</p>}
            <button className={styles.emailButton} disabled={busy} type="submit">{busy ? 'Entrando…' : 'Entrar com e-mail e senha'}</button>
            <p className={styles.passwordNote}>Use os dados de acesso fornecidos pelo administrador.</p>
            <span className={styles.divider}>ou</span>
          </form>}
          <button type="button" className={styles.googleButton} onClick={() => setUnavailable(true)} aria-describedby={unavailable ? 'google-status' : undefined}><GoogleMark/>{register ? 'Cadastrar-se com Google' : 'Entrar com Google'}</button>
          {unavailable && <div id="google-status" role="status" className={styles.notice}><Info size={18}/><p>O acesso com Google ainda não está disponível. Tente novamente mais tarde.</p></div>}
          {register && <p className={styles.passwordNote}>Para acesso por e-mail e senha, solicite uma conta ao administrador.</p>}
          {register && <ul className={styles.benefits}><li><Leaf size={17}/><span>Seus ingredientes organizados</span></li><li><BookOpen size={17}/><span>Todos os custos da receita na conta</span></li><li><ChartNoAxesCombined size={17}/><span>Mais clareza para planejar suas vendas</span></li></ul>}
          <div className={styles.switchMode}>{register ? 'Já tem uma conta?' : 'Ainda não tem uma conta?'} <Link href={register ? '/login' : '/cadastro'}>{register ? 'Entrar' : 'Registre-se'}<ArrowUpRight size={15}/></Link></div>
        </div>
        <p className={styles.formFooter}>pricit <span>·</span> Receita boa merece preço certo.</p>
      </section>
    </main>
  </div>;
}
