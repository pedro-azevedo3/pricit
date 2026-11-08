'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Decimal from 'decimal.js';
import { ArrowUpRight, ArrowRight, Check, Plus, Leaf, BookOpen, ChartNoAxesCombined, FileDown, Menu, X, MoveUpRight } from 'lucide-react';
import { Mascot } from './mascot';
import styles from './landing-page.module.css';
import { useScrollReveal } from './use-scroll-reveal';

const features = [
  { icon: Leaf, number: '01', title: 'Tudo começa no ingrediente.', text: 'Cadastre o preço e a quantidade da embalagem. O custo por grama e por quilo fica por nossa conta.', detail: 'Sua biblioteca, sempre à mão.' },
  { icon: BookOpen, number: '02', title: 'Sua receita, de ponta a ponta.', text: 'Some ingredientes, embalagens, despesas e seu tempo de trabalho. Porque cada detalhe entra na conta.', detail: 'Um preço que considera o seu trabalho.' },
  { icon: ChartNoAxesCombined, number: '03', title: 'Venda com os números na mão.', text: 'Simule quantidades, compare a produção em lotes e veja a diferença entre faturamento, custo e lucro.', detail: 'Mais clareza para decidir.' },
];
const plans = [
  { duration: '1 mês', price: '14,90', monthly: 'R$ 14,90 por mês', note: 'Um mês para organizar suas contas.' },
  { duration: '6 meses', price: '71,90', monthly: 'Aprox. R$ 12,00 por mês', note: 'Mais tempo para acompanhar seu negócio.' },
  { duration: '1 ano', price: '100,00', monthly: 'Aprox. R$ 8,30 por mês', note: 'Um ano de receitas com os custos na mão.' },
];
const questions = [
  ['Para quem é o pricit?', 'Para quem produz alimentos e quer entender seus custos: confeiteiros, pequenos produtores e negócios que trabalham com receitas. Você cadastra os ingredientes, monta as receitas e planeja suas vendas.'],
  ['O que entra no cálculo do preço?', 'Ingredientes, embalagens, despesas operacionais e mão de obra. Sobre o custo, você define um percentual de acréscimo (markup) para chegar ao preço sugerido. Também pode informar o preço que já pratica.'],
  ['Markup e margem de lucro são a mesma coisa?', 'Não. Markup é o acréscimo sobre o custo. Margem é a parcela do preço de venda que corresponde ao lucro. Por exemplo: custo de R$ 5,00 com markup de 100% resulta em preço de R$ 10,00 e margem de 50%.'],
  ['Posso exportar minhas receitas?', 'Sim. O sistema exporta PDFs das receitas salvas e das simulações, com os custos e os resultados para consulta.'],
  ['Funciona no celular?', 'Sim. A interface se adapta ao celular, tablet e computador.'],
];
const currency = (value: Decimal) => value.toNumber().toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function LandingPage() {
  const root = useRef<HTMLDivElement>(null);
  useScrollReveal(root);
  const [menu, setMenu] = useState(false);
  const [cost, setCost] = useState('4.50');
  const [markup, setMarkup] = useState('60');
  const valid = cost !== '' && Number.isFinite(Number(cost)) && Number(cost) >= 0 && Number(cost) <= 1000000;
  const base = new Decimal(valid ? cost : 0);
  const profit = base.mul(markup).div(100);
  const price = base.plus(profit);
  return <div ref={root} className={styles.landing} data-public-page>
    <a href="#conteudo" className={styles.skip}>Pular para o conteúdo</a>
    <header className={styles.header}>
      <div className={styles.navbar}>
        <Link href="/" aria-label="pricit — início" className={styles.logo}><Image src="/pricit-logo-dark-green.png" alt="pricit" width={112} height={49} priority /></Link>
        <nav className={`${styles.navigation} ${menu ? styles.menuOpen : ''}`} aria-label="Navegação do site">
          <a href="#como-funciona" onClick={() => setMenu(false)}>Como funciona</a>
          <a href="#simulador" onClick={() => setMenu(false)}>Na prática</a>
          <a href="#precos" onClick={() => setMenu(false)}>Preços</a>
          <a href="#duvidas" onClick={() => setMenu(false)}>Dúvidas</a>
          <Link href="/login" className={styles.mobileAccess}>Entrar <ArrowUpRight size={16}/></Link><Link href="/cadastro" className={styles.mobileAccess}>Registre-se <ArrowUpRight size={16}/></Link>
        </nav>
        <div className={styles.navActions}><Link href="/login" className={styles.loginLink}>Entrar</Link><Link href="/cadastro" className={styles.headerCta}>Registre-se <ArrowUpRight size={16}/></Link><button className={styles.menuButton} aria-label={menu ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menu} onClick={() => setMenu(!menu)}>{menu ? <X/> : <Menu/>}</button></div>
      </div>
    </header>
    <main id="conteudo">
      <section className={`${styles.hero} ${styles.container}`}>
        <div data-reveal="left" className={styles.heroCopy}>
          <span className={styles.pill}><span/> MENOS ACHISMO. MAIS PRICIT.</span>
          <h1>Sua receita é boa.<br/>Seu preço também<br/>precisa <span>ser.</span><svg viewBox="0 0 100 30" aria-hidden="true"><path d="M4 17 Q43 0 91 13 M74 3 L94 13 L78 26"/></svg></h1>
          <p>Você coloca talento na receita.<br className={styles.desktopBreak}/> A gente coloca clareza no preço. Conheça seus custos e descubra quanto cobrar pelo que você faz.</p>
          <div className={styles.heroActions}><Link href="/cadastro" className={styles.primary}>Bora precificar <ArrowUpRight size={20}/></Link><a href="#simulador" className={styles.textLink}>Ver na prática <ArrowRight size={17}/></a></div>
          <div className={styles.heroNote}><Check size={15}/> Ingredientes, receitas e vendas em um só lugar.</div>
        </div>
        <div data-reveal="zoom" className={styles.heroArt}>
          <div className={styles.orbit}/><div className={styles.artLabel}>SEU TALENTO TEM VALOR.</div>
          <Image src="/mascot-cool.png" alt="Mascote do pricit, uma sacola sorridente de óculos escuros fazendo sinal de tudo certo" width={480} height={480} sizes="(max-width: 700px) 85vw, 480px" priority className={styles.heroMascot}/>
          <div className={styles.costTag}><span className={styles.tagIcon}><Check size={18}/></span><div><small>Todos os custos na conta</small><strong>Preço com confiança.</strong></div></div>
          <div className={styles.talentTag}><MoveUpRight size={22}/><span>Seu trabalho.<br/><strong>Seu valor.</strong></span></div>
          <span className={styles.sparkle} aria-hidden="true">✳</span>
        </div>
      </section>
      <div className={styles.benefitStrip}><div data-reveal="soft" className={styles.container}><span><Leaf size={18}/> Do ingrediente ao preço</span><Plus size={14} aria-hidden="true"/><span><BookOpen size={18}/> Cada custo no seu lugar</span><Plus size={14} aria-hidden="true"/><span><ChartNoAxesCombined size={18}/> Decisões com mais clareza</span></div></div>
      <section id="como-funciona" className={`${styles.section} ${styles.container}`}>
        <div data-reveal="up" className={styles.sectionIntro}><div><span className={styles.eyebrow}>SIMPLES DO COMEÇO AO LUCRO</span><h2>O seu próximo passo.<br/>Sem complicar a receita.</h2></div><p>Da primeira compra ao planejamento das vendas, o pricit organiza os números junto com você.</p></div>
        <div className={styles.steps}>{features.map((f, index) => <article data-reveal="up" data-reveal-offset={index * 35} key={f.number}><div className={styles.stepTop}><f.icon size={26}/><span>{f.number}</span></div><h3>{f.title}</h3><p>{f.text}</p><span className={styles.stepDetail}><Check size={14}/>{f.detail}</span></article>)}</div>
      </section>
      <section id="simulador" className={styles.demoSection}>
        <div className={`${styles.container} ${styles.demoGrid}`}>
          <div data-reveal="left" className={styles.demoCopy}><span className={styles.eyebrow}>VAMOS TIRAR DO PAPEL?</span><h2>Um preço que<br/>faz sentido.<br/><span>Até nos centavos.</span></h2><p>Quanto custa produzir uma unidade? Quanto você quer acrescentar sobre esse custo? Mexa nos valores e veja a conta acontecer.</p><div className={styles.demoFootnote}><Mascot size={82}/><span>O preço começa no custo.<br/><strong>E inclui o valor do seu trabalho.</strong></span></div></div>
          <div data-reveal="right" className={styles.calculator}>
            <div className={styles.calcHeading}><span><ChartNoAxesCombined size={19}/> Seu preço, na prática</span><small>DEMONSTRAÇÃO</small></div>
            <label htmlFor="demo-cost">Custo por unidade <span>Inclua todos os custos de produção</span></label>
            <div className={styles.costInput}><span>R$</span><input id="demo-cost" type="number" min="0" max="1000000" step="0.01" value={cost} onChange={e=>setCost(e.target.value)} aria-invalid={!valid} /></div>
            {!valid && <p className={styles.inputError}>Informe um custo entre zero e R$ 1.000.000,00.</p>}
            <div className={styles.rangeLabel}><label htmlFor="demo-markup">Acréscimo sobre o custo (markup)</label><strong>{markup}%</strong></div>
            <input id="demo-markup" className={styles.range} type="range" min="0" max="200" step="5" value={markup} onChange={e=>setMarkup(e.target.value)} style={{background:`linear-gradient(to right, #c1ff72 ${Number(markup)/2}%, #dfe3de ${Number(markup)/2}%)`}}/>
            <div className={styles.rangeLegend}><span>0%</span><span>100%</span><span>200%</span></div>
            <div className={styles.calcResult} aria-live="polite" aria-atomic="true"><span>Preço sugerido por unidade</span><output key={`${cost}-${markup}`} className={styles.priceUpdate} data-testid="demo-price">{valid ? currency(price) : '—'}</output><div><span>Resultado por unidade</span><strong>{valid ? currency(profit) : '—'}</strong></div></div>
            <p className={styles.calcNote}>Exemplo simplificado: custo × (1 + markup). No sistema, detalhe sua receita e simule a produção em lotes.</p>
            <Link href="/cadastro" className={styles.calcCta}>Precificar minha receita <ArrowUpRight size={18}/></Link>
          </div>
        </div>
      </section>
      <section className={`${styles.section} ${styles.container} ${styles.organize}`}>
        <div data-reveal="tilt" className={styles.recipePreview} aria-label="Exemplo ilustrativo de resumo de receita">
          <div className={styles.previewBar}><span><i/><i/><i/></span><span>pricit / receitas</span><small>EXEMPLO</small></div>
          <div className={styles.recipeContent}><span className={styles.recipeIcon}><BookOpen size={25}/></span><h3>Brownie da casa</h3><p>Uma receita. Todos os detalhes.</p><div className={styles.recipeRows}><div><span>Ingredientes</span><strong>R$ 24,00</strong></div><div><span>Embalagens</span><strong>R$ 6,00</strong></div><div><span>Despesas e mão de obra</span><strong>R$ 15,00</strong></div></div><div className={styles.recipeTotal}><span>Custo da receita<strong>R$ 45,00</strong></span><span>Rendimento<strong>10 unidades</strong></span></div><div className={styles.previewStatus}><Check size={16}/> Tudo pronto para precificar.</div></div>
          <div className={styles.pdfBadge}><FileDown size={23}/><span>Sua receita organizada.<br/><strong>Também em PDF.</strong></span></div>
        </div>
        <div data-reveal="right" className={styles.organizeCopy}><span className={styles.eyebrow}>MAIS ORGANIZAÇÃO. MENOS IMPROVISO.</span><h2>Seu negócio merece<br/>mais que uma<br/>conta de cabeça.</h2><p>Consulte seus ingredientes, ajuste suas receitas e revisite as simulações salvas. Os números ficam organizados para você focar na próxima fornada.</p><ul><li><Check/> Custos das receitas atualizados com os ingredientes</li><li><Check/> Comparação entre custo proporcional e lotes completos</li><li><Check/> Receitas e simulações exportadas em PDF</li></ul><Link href="/cadastro" className={styles.textLink}>Conhecer o sistema <ArrowRight size={18}/></Link></div>
      </section>
      <section id="precos" className={styles.pricing} aria-labelledby="pricing-title" aria-describedby="pricing-status">
        <div className={styles.container}>
          <div data-reveal="up" className={styles.sectionIntro}>
            <div><span className={styles.eyebrow}>PREÇOS · EM BREVE</span><h2 id="pricing-title">Um plano para<br/>o seu próximo passo.</h2></div>
            <p id="pricing-status">Nossas assinaturas chegam em breve. Conheça os valores planejados; a contratação ainda não está disponível.</p>
          </div>
          <div className={styles.plans}>{plans.map((plan, index) => <article key={plan.duration} data-reveal="up" data-reveal-offset={index * 35} className={`${styles.plan} ${index === 2 ? styles.annualPlan : ''}`} aria-label={`Plano de ${plan.duration}`}>
            <div className={styles.planHeading}><h3>{plan.duration}</h3><span className={styles.comingSoon}>Em breve</span></div>
            <p className={styles.planNote}>{plan.note}</p>
            <p className={styles.planPrice}><span>R$</span> {plan.price}</p>
            <p className={styles.planPeriod}>Valor total para {plan.duration}</p>
            <p className={styles.planMonthly}>{plan.monthly}</p>
            <div className={styles.planAvailability}>Assinatura disponível em breve</div>
          </article>)}</div>
          <p className={styles.pricingNote}>Os valores por mês são equivalências aproximadas do total de cada período.</p>
        </div>
      </section>
      <section id="duvidas" className={`${styles.container} ${styles.faq}`}><div data-reveal="left"><span className={styles.eyebrow}>PODE PERGUNTAR</span><h2>Sem dúvidas<br/>na receita.</h2><p>Algumas respostas antes<br/>de colocar a mão na massa.</p></div><div className={styles.questions}>{questions.map(([q,a], index)=><details data-reveal="soft" data-reveal-offset={index * 12} key={q}><summary>{q}<Plus size={19}/></summary><p>{a}</p></details>)}</div></section>
      <section className={`${styles.container} ${styles.finalSection}`}><div data-reveal="zoom" className={styles.finalCta}><div><span className={styles.eyebrow}>SEU PRÓXIMO PREÇO COMEÇA AQUI</span><h2>Capriche na receita.<br/>Acerte na conta.</h2><Link href="/cadastro" className={styles.darkButton}>Começar a precificar <ArrowUpRight size={20}/></Link></div><Image src="/mascot-happy.png" alt="Mascote do pricit sorrindo" width={260} height={260} sizes="(max-width: 700px) 160px, 260px"/></div></section>
    </main>
    <footer className={`${styles.container} ${styles.footer}`}><Link href="/" className={styles.footerLogo} aria-label="pricit — início"><Image src="/pricit-logo-dark-green.png" alt="pricit" width={96} height={42}/></Link><span>Receita boa merece preço certo.</span><a href="#conteudo">Voltar ao topo ↑</a></footer>
  </div>;
}
