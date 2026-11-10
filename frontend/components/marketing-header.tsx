'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, ArrowRight, ChevronDown, Menu, X, Utensils, BriefcaseBusiness } from 'lucide-react';
import styles from './landing-page.module.css';
import nav from './marketing-header.module.css';

export function MarketingHeader({ autonomous = false }: { autonomous?: boolean }) {
  const [menu, setMenu] = useState(false);
  const [solutions, setSolutions] = useState(false);
  const root = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const mobileTrigger = useRef<HTMLButtonElement>(null);
  const signup = autonomous ? '/cadastro?perfil=freelance' : '/cadastro';
  function close() { setMenu(false); setSolutions(false); }
  useEffect(() => {
    function outside(event: PointerEvent) { if (!root.current?.contains(event.target as Node)) close(); }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') { if (menu) mobileTrigger.current?.focus(); else if (solutions) trigger.current?.focus(); close(); }
    }
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [menu, solutions]);
  return <header ref={root} className={styles.header} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node)) close();
  }}>
    <div className={styles.navbar}>
      <Link href="/" aria-label="pricit — início" className={styles.logo} onClick={close}><Image src="/pricit-logo-dark-green.png" alt="pricit" width={112} height={49} priority/></Link>
      <nav id="site-navigation" className={`${styles.navigation} ${menu ? styles.menuOpen : ''}`} aria-label="Navegação do site">
        <button ref={trigger} type="button" className={nav.trigger} aria-expanded={solutions} aria-controls="site-solutions" onClick={() => setSolutions(!solutions)}>Soluções <ChevronDown size={15} aria-hidden="true" className={solutions ? nav.rotated : ''}/></button>
        {solutions && <div id="site-solutions" className={nav.panel}>
          <div className={nav.intro}><span>SOLUÇÕES PRICIT</span><h2>Seu negócio.<br/>Sua forma de precificar.</h2><p>Uma plataforma que considera os custos de quem produz e de quem presta serviços.</p></div>
          <div className={nav.options}>
            <Link href="/#como-funciona" onClick={close} className={nav.option}><Utensils size={23}/><div><strong>Alimentação</strong><p>Confeitaria, açaí, sorveterias, hamburguerias e padarias em um só lugar.</p></div><ArrowUpRight size={19}/></Link>
            <Link href="/solucoes/profissionais-autonomos" onClick={close} className={nav.option} aria-current={autonomous ? 'page' : undefined}><BriefcaseBusiness size={23}/><div><strong>Profissionais autônomos</strong><p>Seu tempo, materiais e despesas no preço de cada serviço ou projeto.</p></div><ArrowUpRight size={19}/></Link>
          </div>
          <div className={nav.bottom}><span>O perfil do negócio pode ser alterado dentro da plataforma.</span><Link href={signup} onClick={close}>Encontrar meu perfil <ArrowRight size={16}/></Link></div>
        </div>}
        <a href="#como-funciona" onClick={close}>Como funciona</a>
        <a href={autonomous ? '#na-pratica' : '#simulador'} onClick={close}>Na prática</a>
        <a href={autonomous ? '/#precos' : '#precos'} onClick={close}>Preços</a>
        <a href="#duvidas" onClick={close}>Dúvidas</a>
        <Link href="/login" className={styles.mobileAccess} onClick={close}>Entrar <ArrowUpRight size={16}/></Link><Link href={signup} className={styles.mobileAccess} onClick={close}>Registre-se <ArrowUpRight size={16}/></Link>

      </nav>
      <div className={styles.navActions}><Link href="/login" className={styles.loginLink}>Entrar</Link><Link href={signup} className={styles.headerCta}>Registre-se <ArrowUpRight size={16}/></Link><button ref={mobileTrigger} type="button" className={styles.menuButton} aria-label={menu ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menu} aria-controls="site-navigation" onClick={() => { setMenu(!menu); setSolutions(false); }}>{menu ? <X/> : <Menu/>}</button></div>
    </div>
  </header>;
}
