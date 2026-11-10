'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Decimal from 'decimal.js';
import { ArrowUpRight, ArrowRight, Check, Plus, Leaf, BookOpen, ChartNoAxesCombined, FileDown, MoveUpRight, GraduationCap, Clock3, Utensils, BriefcaseBusiness } from 'lucide-react';
import { Mascot } from './mascot';
import { MarketingHeader } from './marketing-header';
import { MarketingPricing } from './marketing-pricing';
import styles from './landing-page.module.css';
import { useScrollReveal } from './use-scroll-reveal';

const features = [
  { icon: Leaf, number: '01', title: 'Tudo começa no ingrediente.', text: 'Cadastre o preço e a quantidade da embalagem. O custo por grama, mililitro ou unidade fica por nossa conta.', detail: 'Sua biblioteca, sempre à mão.' },
  { icon: BookOpen, number: '02', title: 'Sua receita, de ponta a ponta.', text: 'Some ingredientes, embalagens, despesas e seu tempo de trabalho. Porque cada detalhe entra na conta.', detail: 'Um preço que considera o seu trabalho.' },
  { icon: ChartNoAxesCombined, number: '03', title: 'Venda com os números na mão.', text: 'Simule quantidades, compare a produção em lotes e veja a diferença entre faturamento, custo e lucro.', detail: 'Mais clareza para decidir.' },
];
const questions = [
  ['Para quem é o pricit?', 'Para negócios de alimentação e profissionais autônomos que querem entender seus custos e precificar com clareza. Conheça a página de cada solução pelo menu Soluções. O questionário adapta a perspectiva ao seu trabalho, e você pode trocar o perfil depois, preservando seus dados.'],
  ['Também posso precificar serviços?', 'Sim. A solução para profissionais autônomos considera tempo de trabalho, materiais e despesas por serviço ou projeto. Acesse Profissionais autônomos no menu Soluções para conhecer essa perspectiva.'],
  ['O que entra no cálculo do preço?', 'Ingredientes, embalagens, despesas operacionais e mão de obra. Sobre o custo, você define um percentual de acréscimo (markup) para chegar ao preço sugerido. Também pode informar o preço que já pratica.'],
  ['Markup e margem de lucro são a mesma coisa?', 'Não. Markup é o acréscimo sobre o custo. Margem é a parcela do preço de venda que corresponde ao lucro. Por exemplo: custo de R$ 5,00 com markup de 100% resulta em preço de R$ 10,00 e margem de 50%.'],
  ['O pricit me ajuda a definir o valor da minha hora?', 'Sim. A aba Guia tem orientações e calculadoras para estudar o valor da sua hora, a mão de obra por lote e por unidade e a diferença entre markup e margem. Você também compara hipóteses de preço e volume vendido antes de definir os valores em Receitas. Os estudos não alteram seus cadastros e não preveem a demanda.'],
  ['Posso exportar minhas receitas?', 'Sim. O sistema exporta PDFs das receitas salvas e das simulações, com os custos e os resultados para consulta.'],
  ['Posso gerar contratos e orçamentos?', 'Sim. A aba Documentos permite cadastrar os dados do cliente, o escopo, os itens, os valores, os prazos e as condições. Você pode aproveitar preços cadastrados, salvar, exportar em PDF e compartilhar o arquivo. Os modelos são editáveis e o sistema não coleta assinaturas eletrônicas.'],
  ['Funciona no celular?', 'Sim. A interface se adapta ao celular, tablet e computador.'],
];
const currency = (value: Decimal) => value.toNumber().toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function LandingPage() {
  const root = useRef<HTMLDivElement>(null);
  useScrollReveal(root);
  const [cost, setCost] = useState('4.50');
  const [markup, setMarkup] = useState('60');
  const valid = cost !== '' && Number.isFinite(Number(cost)) && Number(cost) >= 0 && Number(cost) <= 1000000;
  const base = new Decimal(valid ? cost : 0);
  const profit = base.mul(markup).div(100);
  const price = base.plus(profit);
  return <div ref={root} className={styles.landing} data-public-page>
    <a href="#conteudo" className={styles.skip}>Pular para o conteúdo</a>
    <MarketingHeader/>
    <main id="conteudo">
      <section className={`${styles.hero} ${styles.container}`}>
        <div data-reveal="left" className={styles.heroCopy}>
          <span className={styles.pill}><span/> MENOS ACHISMO. MAIS PRICIT.</span>
          <h1>Seu trabalho vale.<br/>Seu preço também<br/>precisa <span>valer.</span><svg viewBox="0 0 100 30" aria-hidden="true"><path d="M4 17 Q43 0 91 13 M74 3 L94 13 L78 26"/></svg></h1>
          <p>Você coloca talento no que faz.<br className={styles.desktopBreak}/> A gente coloca clareza no preço. Calcule os custos de produtos ou serviços com a perspectiva do seu negócio.</p>
          <div className={styles.heroActions}><Link href="/cadastro" className={styles.primary}>Bora precificar <ArrowUpRight size={20}/></Link><a href="#simulador" className={styles.textLink}>Ver na prática <ArrowRight size={17}/></a></div>
          <div className={styles.heroNote}><Check size={15}/> Ingredientes, receitas, vendas e estudos em um só lugar.</div>
        </div>
        <div data-reveal="zoom" className={styles.heroArt}>
          <div className={styles.orbit}/><div className={styles.artLabel}>SEU TALENTO TEM VALOR.</div>
          <Image src="/mascot-cool.png" alt="Mascote do pricit, uma sacola sorridente de óculos escuros fazendo sinal de tudo certo" width={480} height={480} sizes="(max-width: 700px) 85vw, 480px" priority className={`${styles.heroMascot} ${styles.interactiveMascot}`}/>
          <div className={styles.costTag}><span className={styles.tagIcon}><Check size={18}/></span><div><small>Todos os custos na conta</small><strong>Preço com confiança.</strong></div></div>
          <div className={styles.talentTag}><MoveUpRight size={22}/><span>Seu trabalho.<br/><strong>Seu valor.</strong></span></div>
          <span className={styles.sparkle} aria-hidden="true">✳</span>
        </div>
      </section>
      <div className={styles.benefitStrip}><div data-reveal="soft" className={styles.container}><span><Leaf size={18}/> Do ingrediente ao preço</span><Plus size={14} aria-hidden="true"/><span><BookOpen size={18}/> Cada custo no seu lugar</span><Plus size={14} aria-hidden="true"/><span><ChartNoAxesCombined size={18}/> Decisões com mais clareza</span></div></div>
      <section className={`${styles.section} ${styles.container}`} aria-labelledby="audience-title">
        <div data-reveal="up" className={styles.sectionIntro}><div><span className={styles.eyebrow}>UMA PERSPECTIVA PARA O SEU NEGÓCIO</span><h2 id="audience-title">O que você faz tem valor.<br/>A gente ajuda na conta.</h2></div><p>Conheça a solução que considera os custos do seu trabalho, da produção de alimentos à prestação de serviços.</p></div>
        <div className={styles.audiences}>
          <article data-reveal="up"><span className={styles.audienceIcon}><Utensils size={25}/></span><h3>Negócios de alimentação</h3><p>Do ingrediente ao produto pronto: organize receitas, embalagens, mão de obra e despesas para precificar com mais clareza.</p><a href="#como-funciona" className={styles.textLink}>Conheça a solução para alimentação <ArrowRight size={17}/></a></article>
          <article data-reveal="up" data-reveal-offset="35"><span className={styles.audienceIcon}><BriefcaseBusiness size={25}/></span><h3>É profissional autônomo?</h3><p>Seu tempo, materiais e despesas também entram na conta. Descubra uma perspectiva feita para precificar seus serviços e projetos.</p><Link href="/solucoes/profissionais-autonomos" className={styles.textLink}>Conheça as soluções para você <ArrowRight size={17}/></Link></article>
        </div>
      </section>
      <section id="como-funciona" className={`${styles.section} ${styles.container}`}>
        <div data-reveal="up" className={styles.sectionIntro}><div><span className={styles.eyebrow}>SIMPLES DO COMEÇO AO LUCRO</span><h2>O seu próximo passo.<br/>Sem complicar a receita.</h2></div><p>Da primeira compra ao planejamento das vendas, o pricit organiza os números junto com você.</p></div>
        <div className={styles.steps}>{features.map((f, index) => <article data-reveal="up" data-reveal-offset={index * 35} key={f.number}><div className={styles.stepTop}><f.icon size={26}/><span>{f.number}</span></div><h3>{f.title}</h3><p>{f.text}</p><span className={styles.stepDetail}><Check size={14}/>{f.detail}</span></article>)}</div>
      </section>
      <section id="simulador" className={styles.demoSection}>
        <div className={`${styles.container} ${styles.demoGrid}`}>
          <div data-reveal="left" className={styles.demoCopy}><span className={styles.eyebrow}>VAMOS TIRAR DO PAPEL?</span><h2>Um preço que<br/>faz sentido.<br/><span>Até nos centavos.</span></h2><p>Quanto custa produzir uma unidade? Quanto você quer acrescentar sobre esse custo? Mexa nos valores e veja a conta acontecer.</p><div className={styles.demoFootnote}><Mascot size={82} className={styles.interactiveMascot}/><span>O preço começa no custo.<br/><strong>E inclui o valor do seu trabalho.</strong></span></div></div>
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
      <section id="guia" className={`${styles.section} ${styles.container} ${styles.guideSection}`} aria-labelledby="guide-title">
        <div data-reveal="left" className={styles.organizeCopy}>
          <span className={styles.eyebrow}>GUIA DE PRECIFICAÇÃO · DENTRO DA PLATAFORMA</span>
          <h2 id="guide-title">Aprenda a dar valor <br/>ao seu trabalho.</h2>
          <p>Além de fazer as contas, o pricit ajuda você a entendê-las. Na aba Guia, encontre orientações, exemplos editáveis e calculadoras para montar suas métricas em Receitas com mais confiança.</p>
          <ul>
            <li><Clock3/><span><strong>Quanto vale sua hora?</strong> Estude sua remuneração e o tempo disponível para produzir.</span></li>
            <li><BookOpen/><span><strong>Mão de obra na conta.</strong> Calcule o custo do seu trabalho por lote e por unidade.</span></li>
            <li><ChartNoAxesCombined/><span><strong>Preço, lucro e vendas.</strong> Entenda markup e margem e compare diferentes hipóteses de volume vendido.</span></li>
          </ul>
          <p className={styles.guideNote}>Um ganho maior por unidade pode não compensar uma queda nas vendas. Compare cenários no Guia, sem alterar suas receitas nem tratar hipóteses como previsão de demanda.</p>
          <Link href="/cadastro" className={styles.textLink}>Conhecer o Guia <ArrowRight size={18}/></Link>
        </div>
        <div data-reveal="right" className={styles.guideExample} aria-label="Exemplo ilustrativo de cálculo de mão de obra no Guia">
          <div className={styles.guideExampleHeading}><GraduationCap size={25}/><span>Seu tempo também entra na receita.</span></div>
          <span className={styles.eyebrow}>EXEMPLO DE ESTUDO</span>
          <dl className={styles.guideInputs}><div><dt>Remuneração mensal pelo trabalho</dt><dd>R$ 2.400,00</dd></div><div><dt>Tempo produtivo no mês</dt><dd>120 horas</dd></div></dl>
          <div className={styles.guideHourly}><span>Valor da hora</span><strong>R$ 20,00</strong><small>R$ 2.400,00 ÷ 120 horas</small></div>
          <dl className={styles.guideResults}><div><dt>Lote com 90 minutos de trabalho</dt><dd>R$ 30,00</dd></div><div><dt>Mão de obra por unidade, rendendo 12</dt><dd>R$ 2,50</dd></div></dl>
          <p>Na plataforma, use os exemplos ou preencha seus próprios valores. O Guia ajuda a entender a conta; você decide o que aplicar em cada receita.</p>
        </div>
      </section>
      <MarketingPricing/>
      <section id="duvidas" className={`${styles.container} ${styles.faq}`}><div data-reveal="left"><span className={styles.eyebrow}>PODE PERGUNTAR</span><h2>Sem dúvidas<br/>na receita.</h2><p>Algumas respostas antes<br/>de colocar a mão na massa.</p></div><div className={styles.questions}>{questions.map(([q,a], index)=><details data-reveal="soft" data-reveal-offset={index * 12} key={q}><summary>{q}<Plus size={19}/></summary><p>{a}</p></details>)}</div></section>
      <section className={`${styles.container} ${styles.finalSection}`}><div data-reveal="zoom" className={styles.finalCta}><div><span className={styles.eyebrow}>SEU PRÓXIMO PREÇO COMEÇA AQUI</span><h2>Capriche na receita.<br/>Acerte na conta.</h2><Link href="/cadastro" className={styles.darkButton}>Começar a precificar <ArrowUpRight size={20}/></Link></div><Image src="/mascot-happy.png" alt="Mascote do pricit sorrindo" width={260} height={260} sizes="(max-width: 700px) 160px, 260px" className={styles.interactiveMascot}/></div></section>
    </main>
    <footer className={`${styles.container} ${styles.footer}`}><Link href="/" className={styles.footerLogo} aria-label="pricit — início"><Image src="/pricit-logo-dark-green.png" alt="pricit" width={96} height={42}/></Link><span>Receita boa merece preço certo.</span><a href="#conteudo">Voltar ao topo ↑</a></footer>
  </div>;
}
