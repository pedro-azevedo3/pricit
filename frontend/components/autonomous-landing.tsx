'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Decimal from 'decimal.js';
import { ArrowUpRight, ArrowRight, Check, Clock3, FilePenLine, ChartNoAxesCombined, Package, Plus, BriefcaseBusiness, GraduationCap, ShoppingBasket } from 'lucide-react';
import { MarketingHeader } from './marketing-header';
import { MarketingPricing } from './marketing-pricing';
import { useScrollReveal } from './use-scroll-reveal';
import base from './landing-page.module.css';
import styles from './autonomous-landing.module.css';

const signup = '/cadastro?perfil=freelance';
const steps = [
  { icon: Clock3, title: 'Comece pelo seu tempo.', text: 'Use o Guia para estudar sua remuneração e suas horas produtivas. Leve o valor da hora para a ficha do serviço.' },
  { icon: Package, title: 'Coloque os custos na conta.', text: 'Some mão de obra, materiais consumidos e despesas de estrutura, energia, deslocamento ou equipamentos.' },
  { icon: FilePenLine, title: 'Apresente sua proposta.', text: 'Monte orçamentos e contratos com escopo, valores, prazos e condições. Exporte em PDF e envie ao cliente.' },
];
const questions = [
  ['Preciso cadastrar materiais para precificar?', 'Não. Nos perfis de serviços, os materiais são opcionais. Você pode calcular um projeto com o tempo de trabalho e as despesas necessárias para executá-lo.'],
  ['Atendo clientes e também trabalho por projeto. Serve para mim?', 'Sim. Escolha um perfil no cadastro e monte as fichas de acordo com suas entregas ou atendimentos. Informe o tempo, os custos e o rendimento de cada ficha. Você pode alterar o perfil do negócio depois.'],
  ['O valor da minha hora já é meu lucro?', 'Não. Sua remuneração pelo trabalho compõe o custo do serviço. O acréscimo sobre o custo é definido separadamente. O Guia ajuda a entender a diferença entre mão de obra, markup e margem.'],
  ['Posso enviar orçamentos e contratos?', 'Sim. Na aba Documentos, preencha os dados do cliente, escopo, itens, valores, prazos e condições. Salve e exporte o PDF para compartilhar. Os modelos são editáveis; a plataforma não coleta assinaturas eletrônicas.'],
  ['O pricit define quanto meus clientes vão pagar?', 'Você define os valores e avalia os cenários. O sistema organiza custos e simulações; o preço sugerido não garante demanda ou vendas. Considere também seu mercado, seu posicionamento e o escopo combinado com o cliente.'],
  ['Como funcionam os planos?', 'As assinaturas estão em breve. Os valores planejados são R$ 14,90 por 1 mês, R$ 79,90 por 6 meses e R$ 129,90 por 1 ano. A contratação ainda não está disponível. Consulte a seção Preços nesta página.'],
];
const money = (n: Decimal) => n.toNumber().toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function AutonomousLanding() {
  const root = useRef<HTMLDivElement>(null);
  useScrollReveal(root);
  const [hours, setHours] = useState('4');
  const [hourly, setHourly] = useState('40');
  const [expenses, setExpenses] = useState('30');
  const [markup, setMarkup] = useState('30');
  const valid = [hours, hourly, expenses, markup].every(v => v !== '' && Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 1000000);
  const labor = new Decimal(valid ? hours : 0).mul(valid ? hourly : 0);
  const cost = labor.plus(valid ? expenses : 0);
  const result = cost.mul(new Decimal(valid ? markup : 0).div(100).plus(1));
  return <div ref={root} className={`${base.landing} ${styles.page}`} data-public-page>
    <a href="#conteudo" className={base.skip}>Pular para o conteúdo</a>
    <MarketingHeader autonomous/>
    <main id="conteudo">
      <section className={`${base.container} ${styles.hero}`}>
        <div data-reveal="left" className={styles.heroCopy}>
          <span className={base.pill}><span/> PARA PROFISSIONAIS AUTÔNOMOS</span>
          <h1>Seu tempo é trabalho.<br/>Seu preço precisa<br/>dar <em>conta dele.</em></h1>
          <p>Do primeiro atendimento ao próximo projeto: entenda seus custos, valorize suas horas e apresente propostas com clareza.</p>
          <div className={styles.actions}><Link href={signup} className={base.primary}>Precificar meu serviço <ArrowUpRight size={19}/></Link><a href="#na-pratica" className={base.textLink}>Experimentar a conta <ArrowRight size={17}/></a></div>
          <span className={styles.note}><Check size={15}/> Tempo, custos e documentos em um só lugar.</span>
        </div>
        <div data-reveal="right" className={styles.heroVisual}>
          <div className={styles.projectCard} aria-label="Exemplo ilustrativo de precificação de um projeto">
            <div className={styles.cardTop}><span><BriefcaseBusiness size={18}/> pricit / serviços</span><span>EXEMPLO</span></div>
            <div className={styles.projectHeading}><span className={styles.projectIcon}><BriefcaseBusiness size={25}/></span><div><small>FICHA DE SERVIÇO</small><h2>Projeto personalizado</h2></div></div>
            <dl className={styles.costRows}><div><dt>4 horas × R$ 40,00</dt><dd>R$ 160,00</dd></div><div><dt>Materiais e despesas</dt><dd>R$ 30,00</dd></div><div><dt>Custo do projeto</dt><dd>R$ 190,00</dd></div></dl>
            <div className={styles.projectPrice}><span>Preço com acréscimo de 30%</span><strong>R$ 247,00</strong><small>R$ 57,00 acima do custo calculado</small></div>
            <div className={styles.cardBottom}><FilePenLine size={17}/> Do custo à proposta para o cliente.</div>
          </div>
          <div className={styles.hourBadge}><Clock3 size={22}/><span>Cada hora conta.<strong>Inclusive a sua.</strong></span></div>
          <Image src="/mascot-cool.png" alt="Mascote do pricit de óculos escuros" width={180} height={180} priority className={`${styles.mascot} ${base.interactiveMascot}`}/>
        </div>
      </section>
      <div className={base.benefitStrip}><div className={base.container}><span><Clock3 size={18}/> Valor da hora</span><Plus size={14}/><span><ChartNoAxesCombined size={18}/> Custos por serviço</span><Plus size={14}/><span><FilePenLine size={18}/> Orçamentos em PDF</span></div></div>
      <section className={`${base.container} ${base.section}`} id="como-funciona">
        <div className={base.sectionIntro} data-reveal="up"><div><span className={base.eyebrow}>PARA QUEM FAZ O PRÓPRIO NEGÓCIO ACONTECER</span><h2>Talento para entregar.<br/>Clareza para cobrar.</h2></div><p>Freelancers, fotógrafos, designers e profissionais que prestam serviços: a conta começa no trabalho que cada entrega exige.</p></div>
        <div className={base.steps}>{steps.map(({ icon: Icon, title, text }, i) => <article key={title} data-reveal="up" data-reveal-offset={i * 35}><div className={base.stepTop}><Icon size={26}/><span>0{i + 1}</span></div><h3>{title}</h3><p>{text}</p><span className={base.stepDetail}><Check size={14}/> Você decide os valores.</span></article>)}</div>
      </section>
      <section id="na-pratica" className={base.demoSection}>
        <div className={`${base.container} ${base.demoGrid}`}>
          <div className={base.demoCopy} data-reveal="left"><span className={base.eyebrow}>UMA CONTA COM A SUA PERSPECTIVA</span><h2>Quanto custa<br/>entregar o seu<br/><span>próximo projeto?</span></h2><p>Considere as horas necessárias, o valor da sua hora e as despesas da entrega. Depois, experimente um acréscimo sobre esse custo.</p><p className={styles.explanation}>Sua mão de obra faz parte do custo. O resultado acima dele é calculado separadamente.</p></div>
          <div className={`${base.calculator} ${styles.calculator}`} data-reveal="right">
            <div className={base.calcHeading}><span><ChartNoAxesCombined size={19}/> Seu serviço, na prática</span><small>DEMONSTRAÇÃO</small></div>
            <div className={styles.fields}>
              <label>Horas do projeto<input type="number" min="0" max="1000000" step="0.25" value={hours} placeholder="Ex.: 4" onChange={e => setHours(e.target.value)}/></label>
              <label>Valor da hora (R$)<input type="number" min="0" max="1000000" step="0.01" value={hourly} placeholder="Ex.: 40" onChange={e => setHourly(e.target.value)}/></label>
              <label>Materiais e despesas (R$)<input type="number" min="0" max="1000000" step="0.01" value={expenses} placeholder="Ex.: 30" onChange={e => setExpenses(e.target.value)}/></label>
              <label>Acréscimo sobre o custo (%)<input type="number" min="0" max="1000000" step="1" value={markup} placeholder="Ex.: 30" onChange={e => setMarkup(e.target.value)}/></label>
            </div>
            {!valid && <p role="alert" className={base.inputError}>Preencha todos os campos com valores entre zero e 1.000.000.</p>}
            <div className={styles.calculation}><span>Mão de obra <strong>{valid ? money(labor) : '—'}</strong></span><span>Custo do projeto <strong>{valid ? money(cost) : '—'}</strong></span></div>
            <div className={base.calcResult} aria-live="polite" aria-atomic="true"><span>Preço sugerido do projeto</span><output data-testid="service-price">{valid ? money(result) : '—'}</output><div><span>Valor acima do custo</span><strong>{valid ? money(result.minus(cost)) : '—'}</strong></div></div>
            <p className={base.calcNote}>Exemplo simplificado: (horas × valor da hora + despesas) × (1 + acréscimo). Ajuste os custos à sua realidade; a simulação não garante vendas.</p>
            <Link href={signup} className={base.calcCta}>Montar minhas fichas de serviço <ArrowUpRight size={18}/></Link>
          </div>
        </div>
      </section>
      <section className={`${base.container} ${base.section} ${styles.toolSection}`}>
        <div data-reveal="left"><span className={base.eyebrow}>ENTRE O COMBINADO E A ENTREGA</span><h2>Organize o trabalho.<br/>Formalize a proposta.</h2><p className={styles.sectionText}>Um preço faz mais sentido quando vem acompanhado do que será entregue. Registre o escopo e as condições para compartilhar com seu cliente.</p><Link href={signup} className={base.textLink}>Conhecer a plataforma <ArrowRight size={17}/></Link></div>
        <div className={styles.tools}>{[
          { icon: FilePenLine, title: 'Orçamentos e contratos', text: 'Dados do cliente, itens, valores, escopo e condições em documentos editáveis, com exportação em PDF.' },
          { icon: GraduationCap, title: 'Guia para valorizar sua hora', text: 'Estude remuneração, tempo produtivo, mão de obra, markup e margem antes de definir seu preço.' },
          { icon: ShoppingBasket, title: 'Materiais para a próxima entrega', text: 'Selecione os itens da biblioteca, organize uma lista de compras e leve o PDF com você.' },
        ].map(({ icon: Icon, title, text }) => <article key={title} data-reveal="up"><span><Icon size={23}/></span><div><h3>{title}</h3><p>{text}</p></div></article>)}<p className={styles.disclaimer}>Você revisa e compartilha os documentos. Assinaturas eletrônicas não são coletadas pela plataforma.</p></div>
      </section>
      <MarketingPricing/>
      <section id="duvidas" className={`${base.container} ${base.faq}`}><div data-reveal="left"><span className={base.eyebrow}>ANTES DO PRÓXIMO PROJETO</span><h2>Seu trabalho muda.<br/>A conta acompanha.</h2><p>Respostas para quem trabalha<br/>por conta própria.</p></div><div className={base.questions}>{questions.map(([q, a]) => <details key={q}><summary>{q}<Plus size={19}/></summary><p>{a}</p></details>)}</div></section>
      <section className={`${base.container} ${base.finalSection}`}><div className={base.finalCta} data-reveal="zoom"><div><span className={base.eyebrow}>SEU TALENTO TEM VALOR</span><h2>Faça seu próximo preço<br/>respeitar seu trabalho.</h2><Link href={signup} className={base.darkButton}>Começar com meu perfil <ArrowUpRight size={20}/></Link><Link href="#precos" className={styles.plansLink}>Ver planos · assinaturas em breve</Link></div><Image src="/mascot-happy.png" alt="Mascote do pricit sorrindo" width={260} height={260} className={base.interactiveMascot}/></div></section>
    </main>
    <footer className={`${base.container} ${base.footer}`}><Link href="/" className={base.footerLogo} aria-label="pricit — início"><Image src="/pricit-logo-dark-green.png" alt="pricit" width={96} height={42}/></Link><span>Seu trabalho merece preço certo.</span><a href="#conteudo">Voltar ao topo ↑</a></footer>
  </div>;
}
