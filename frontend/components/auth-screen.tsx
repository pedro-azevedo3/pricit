'use client';

import { type FormEvent, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowUpRight, Check, Info, Leaf, ArrowRight } from 'lucide-react';
import { ApplicationPreview, type PreviewTab } from './application-preview';
import { api } from '@/lib/api';
import { BusinessFields } from './business-fields';
import { defaultProfile, businessProfiles, type BusinessProfile, type BusinessType, type PricingGoal } from '@/lib/business';
import { BusinessProvider } from './business-context';
import styles from './auth-screen.module.css';

function GoogleMark() {
  return <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.58-4.12H3.07v2.59A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.42 13.92A6 6 0 0 1 6.1 12c0-.67.11-1.32.32-1.92V7.49H3.07A10 10 0 0 0 2 12c0 1.61.39 3.14 1.07 4.51l3.35-2.59Z"/><path fill="#EA4335" d="M12 5.96c1.47 0 2.79.5 3.83 1.5l2.87-2.88A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.49l3.35 2.59C7.2 7.72 9.4 5.96 12 5.96Z"/></svg>;
}

function ProductPreview({ register, profile }: { register: boolean; profile: BusinessProfile }) {
  const [tab, setTab] = useState<PreviewTab>('ingredients');
  const guide = tab === 'guide';
  const business = businessProfiles[profile.business_type];
  return <aside className={styles.previewPanel} aria-label="Conheça o pricit">
    <div id="auth-product-preview" className={styles.previewWindow} role="img" aria-label={guide ? 'Prévia do Guia de precificação do pricit: hora de trabalho, mão de obra e lucro' : `Prévia da biblioteca de ${business.resources.toLowerCase()} do pricit com dados de exemplo`}>
      <BusinessProvider profile={profile}><ApplicationPreview tab={tab}/></BusinessProvider>
    </div>
    <span className={styles.exampleLabel}>DADOS DE EXEMPLO</span>
    <div className={styles.mascotSticker}><Image src={register ? '/mascot-happy.png' : '/mascot-cool.png'} alt={register ? 'Mascote do pricit sorrindo para dar boas-vindas' : 'Mascote do pricit de óculos escuros fazendo sinal de tudo certo'} width={150} height={150} sizes="150px" priority/></div>
    <div className={styles.previewCaption} aria-live="polite" aria-atomic="true"><span className={styles.captionEyebrow}>{guide ? 'APRENDA. CALCULE. APLIQUE.' : 'MENOS ACHISMO. MAIS PRICIT.'}</span><h2>{guide ? <><em>Seu tempo tem valor.</em><br/>Aprenda a colocar no preço.</> : register ? <><em>Seu talento tem valor.</em><br/>Vamos colocar na conta?</> : <><em>Do ingrediente ao lucro,</em><br/>tudo faz mais sentido.</>}</h2><p>{guide ? 'Calcule sua hora e a mão de obra. Compare preço, lucro e volume de vendas no Guia.' : 'Organize seus custos, precifique produtos ou serviços e aprenda com o Guia.'}</p></div>
    <div className={styles.previewControls} role="group" aria-label="Escolher prévia do sistema">
      <button type="button" aria-pressed={!guide} aria-controls="auth-product-preview" onClick={() => setTab('ingredients')}>Ver {business.resources.toLowerCase()}</button>
      <button type="button" aria-pressed={guide} aria-controls="auth-product-preview" onClick={() => setTab('guide')}>Ver Guia de precificação</button>
    </div>
  </aside>;
}

export function AuthScreen({ mode }: { mode: 'login' | 'register' }) {
  const register = mode === 'register';
  const [unavailable, setUnavailable] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<BusinessProfile>({business_name:'',business_type:'' as BusinessType,pricing_goal:'' as PricingGoal});
  const [confirmation, setConfirmation] = useState('');
  async function signup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    if (step === 0) { setStep(1); return; }
    if (password !== confirmation) { setError('As senhas não coincidem.'); return; }
    setBusy(true);
    try {
      await api('/auth/register', {method:'POST',body:JSON.stringify({...profile,email,password})});
      window.location.assign('/app');
    } catch (e) { setError((e as Error).message); setBusy(false); }
  }
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
        <p className={styles.description}>{register ? 'Escolha seu segmento e aprenda a calcular custos, mão de obra e preços de produtos ou serviços.' : 'Entre para cuidar do seu negócio, planejar preços e continuar aprendendo no Guia.'}</p>
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
        </form> : <form onSubmit={signup} className={`${styles.emailForm} ${styles.questionnaire}`}>
          <p className={styles.stepLabel}>PASSO {step+1} DE 2 · {step===0?'SEU NEGÓCIO':'SEU ACESSO'}</p>
          {step===0 ? <><p className={styles.questionnaireIntro}>Conte um pouco sobre seu negócio. Vamos adaptar a plataforma ao seu segmento. Você poderá mudar essa escolha em Perfil.</p><BusinessFields value={profile} onChange={setProfile}/></> : <>
            <label htmlFor="register-email">E-mail</label><input id="register-email" type="email" required maxLength={254} autoComplete="username" placeholder="voce@exemplo.com" value={email} disabled={busy} onChange={e=>setEmail(e.target.value)}/>
            <label htmlFor="register-password">Senha</label><input id="register-password" type="password" required minLength={12} maxLength={256} autoComplete="new-password" placeholder="Crie uma senha com pelo menos 12 caracteres" value={password} disabled={busy} onChange={e=>setPassword(e.target.value)}/>
            <label htmlFor="confirm-password">Confirme sua senha</label><input id="confirm-password" type="password" required minLength={12} maxLength={256} autoComplete="new-password" placeholder="Digite a senha novamente" value={confirmation} disabled={busy} onChange={e=>setConfirmation(e.target.value)}/>
            <p className={styles.questionnaireIntro}>Use pelo menos 12 caracteres. Seu perfil do negócio será salvo junto com sua conta.</p>
          </>}
          {error&&<p role="alert" className={styles.loginError}>{error}</p>}
          <button type="submit" className={styles.emailButton} disabled={busy}>{busy?'Criando conta…':step===0?'Continuar para criar conta':'Criar minha conta'}<ArrowRight size={17}/></button>
          {step===1&&<button type="button" className={styles.backQuestionnaire} disabled={busy} onClick={()=>{setStep(0);setError('');}}>Voltar ao questionário</button>}
        </form>}
        <div className={styles.switchMode}>{register ? 'Já tem uma conta?' : 'Ainda não tem uma conta?'} <Link href={register ? '/login' : '/cadastro'}>{register ? 'Entrar' : 'Registre-se'}<ArrowUpRight size={14}/></Link></div>
        <p className={styles.formFooter}>Receita boa merece preço certo.</p>
      </div>
    </section>
    <ProductPreview register={register} profile={register&&profile.business_type?profile:defaultProfile}/>
  </main>;
}
