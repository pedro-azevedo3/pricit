'use client';

import { useState } from 'react';
import { ArrowRight, Clock3, TrendingUp, BookOpen, Check } from 'lucide-react';
import { money, decimalText, d } from '@/lib/calculations';
import { studyLabor, studySales, type LaborStudy, type SalesStudy } from '@/lib/pricing-guide';
import { Button } from './ui/button';
import { Metric } from './shared';
import styles from './pricing-guide.module.css';

const emptyLabor: LaborStudy = { income: '', days: '', hours: '', minutes: '', yield: '' };
const emptySales: SalesStudy = { cost: '', markupA: '', unitsA: '', markupB: '', unitsB: '' };
const laborExample: LaborStudy = { income: '2400', days: '20', hours: '6', minutes: '90', yield: '12' };
const salesExample: SalesStudy = { cost: '5', markupA: '100', unitsA: '100', markupB: '200', unitsB: '40' };

function StudyField({ label, value, onChange, example, min = 0, max = 1e6, step = '0.01' }: {
  label: string; value: string; onChange: (value: string) => void; example: string;
  min?: number; max?: number; step?: string;
}) {
  return <label>{label}<input type="number" inputMode={step === '1' ? 'numeric' : 'decimal'}
    min={min} max={max} step={step} value={value} placeholder={`Ex.: ${example}`}
    onChange={event => onChange(event.target.value)}/></label>;
}

export function PricingGuide({ onRecipes }: { onRecipes: () => void }) {
  const [labor, setLabor] = useState(emptyLabor);
  const [sales, setSales] = useState(emptySales);
  const laborResult = studyLabor(labor), salesResult = studySales(sales);
  const setLaborField = (field: keyof LaborStudy, value: string) => setLabor(current => ({ ...current, [field]: value }));
  const setSalesField = (field: keyof SalesStudy, value: string) => setSales(current => ({ ...current, [field]: value }));
  const largestResult = salesResult ? (salesResult.a.result.gte(salesResult.b.result) ? salesResult.a.result : salesResult.b.result) : d(0);
  const barWidth = (value: ReturnType<typeof d>) => largestResult.gt(0) ? `${value.div(largestResult).mul(100).toNumber()}%` : '0%';

  return <div className={styles.guide}>
    <header className={styles.intro}>
      <p className="eyebrow">Aprenda e aplique no seu negócio</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Guia de precificação</h1>
      <p className={styles.lead}>Seu tempo tem valor. Seu preço precisa fazer sentido.</p>
      <p>Estude sua hora de trabalho, o custo da mão de obra e o equilíbrio entre lucro e vendas. Faça as contas aqui antes de definir os valores em Receitas.</p>
      <nav aria-label="Tópicos do guia" className={styles.topics}>
        <a href="#guide-labor"><Clock3 size={16}/>Hora e mão de obra</a>
        <a href="#guide-sales"><TrendingUp size={16}/>Lucro e vendas</a>
        <a href="#guide-apply"><BookOpen size={16}/>Aplicar em Receitas</a>
      </nav>
      <p className="subtle">Área de estudos: estes cálculos ficam apenas nesta sessão da tela e não alteram seus cadastros.</p>
    </header>

    <section id="guide-labor" className={`panel ${styles.lesson}`} aria-labelledby="guide-labor-title">
      <h2 id="guide-labor-title" className={styles.title}><span className="number-dot">1</span>Quanto vale a sua hora?</h2>
      <p>Comece pela remuneração mensal que deseja receber pelo seu trabalho. Divida pelas horas que consegue dedicar à produção no mês. Essa meta precisa ser compatível com sua capacidade de produção e com as vendas.</p>
      <div className={styles.formula}>Valor da hora = remuneração mensal ÷ horas produtivas no mês</div>
      <p>Use uma agenda realista: reserve tempo para compras, atendimento e administração ao estimar as horas produtivas. Se essas atividades forem incluídas no tempo de cada receita, não as conte novamente em outro custo.</p>

      <div className={styles.exercise}>
        <div className={styles.exerciseHeader}><h3>Calcule uma referência para sua mão de obra</h3><Button variant="outline" onClick={() => setLabor(laborExample)}>Usar exemplo de mão de obra</Button></div>
        <div className={styles.fields}>
          <StudyField label="Remuneração mensal pelo trabalho (R$)" value={labor.income} example="2400" min={0.01} max={1e9} onChange={v => setLaborField('income', v)}/>
          <StudyField label="Dias de produção por mês" value={labor.days} example="20" min={1} max={31} step="1" onChange={v => setLaborField('days', v)}/>
          <StudyField label="Horas produtivas por dia" value={labor.hours} example="6" min={0.01} max={24} onChange={v => setLaborField('hours', v)}/>
          <StudyField label="Tempo de trabalho por lote (minutos)" value={labor.minutes} example="90" step="1" onChange={v => setLaborField('minutes', v)}/>
          <StudyField label="Unidades produzidas por lote" value={labor.yield} example="12" min={1} step="1" onChange={v => setLaborField('yield', v)}/>
        </div>
        <div className={styles.results} aria-live="polite" aria-atomic="true">
          <Metric label="Valor da sua hora" value={laborResult ? money(laborResult.hourly) : '—'} detail={laborResult ? `${decimalText(laborResult.monthlyHours)} horas produtivas no mês` : 'Informe sua remuneração e disponibilidade'}/>
          <Metric label="Mão de obra por lote" value={laborResult ? money(laborResult.batch) : '—'} detail="Valor da hora × minutos de trabalho ÷ 60"/>
          <Metric label="Mão de obra por unidade" value={laborResult ? money(laborResult.unit) : '—'} detail="Custo de mão de obra do lote ÷ rendimento" highlight/>
        </div>
        {!laborResult && <p className="subtle mt-3">Preencha todos os campos com valores válidos. Remuneração, dias, horas e rendimento precisam ser maiores que zero. Dias (até 31), minutos e unidades são inteiros; horas por dia vão até 24.</p>}
      </div>

      <details className={styles.details}><summary>Que tempo devo contar? E se outra pessoa trabalhar comigo?</summary><div>
        <p>Conte preparo, montagem, embalagem e limpeza associados ao lote. O tempo do forno sem sua atenção não é automaticamente tempo de mão de obra: se você prepara outro lote nesse intervalo, evite cobrar os mesmos minutos duas vezes.</p>
        <p>Com mais de uma pessoa, calcule o custo de cada uma (valor da hora × tempo trabalhado) e some. Para funcionários, considere remuneração e os custos aplicáveis à contratação. Em Receitas, use um valor por hora equivalente que, multiplicado pelo tempo informado, represente esse total.</p>
      </div></details>
      <p className={styles.note}><strong>Seu pagamento pelo trabalho é um custo. O lucro é do negócio.</strong> A mesma retirada não deve entrar na mão de obra e novamente nas despesas operacionais. O lucro pode formar uma reserva, financiar melhorias e remunerar o investimento.</p>
      <p className="subtle">Para aprofundar: <a className={styles.source} href="https://sebrae.com.br/Sebrae/Portal%20Sebrae/UFs/MG/Imagens/Conserto%20de%20Roupas.pdf" target="_blank" rel="noreferrer">Sebrae — mão de obra e remuneração (PDF)</a>.</p>
    </section>

    <section id="guide-sales" className={`panel ${styles.lesson}`} aria-labelledby="guide-sales-title">
      <h2 id="guide-sales-title" className={styles.title}><span className="number-dot">2</span>Mais lucro por unidade significa mais lucro no mês?</h2>
      <p>Nem sempre. Um preço acima do valor que o cliente percebe pode dificultar a venda e reduzir o volume. Qualidade, apresentação, conveniência e diferenciação também influenciam a decisão: aumentar o preço não significa necessariamente perder clientes.</p>
      <div className={styles.note}><h3>Entenda o percentual antes de escolher</h3><p>Em Receitas, “Lucro desejado sobre custo (%)” é um acréscimo sobre o custo, chamado markup. Um produto que custa R$ 5,00 com acréscimo de 100% é vendido a R$ 10,00. Sobram R$ 5,00: isso representa 50% do preço de venda, a margem sobre faturamento.</p><p className="mt-2">Preço = custo × (1 + acréscimo ÷ 100). Margem = (preço − custo) ÷ preço × 100.</p></div>
      <div className={styles.exercise}>
        <div className={styles.exerciseHeader}><h3>Compare preço e volume de vendas</h3><Button variant="outline" onClick={() => setSales(salesExample)}>Usar exemplo de vendas</Button></div>
        <p>Informe duas hipóteses para o mesmo período. A quantidade vendida é definida por você; o guia não prevê a demanda.</p>
        <div className="mt-4 max-w-sm"><StudyField label="Custo completo por unidade (R$)" value={sales.cost} example="5" min={0.01} max={1e9} onChange={v => setSalesField('cost', v)}/></div>
        <div className={styles.scenarios}>
          {(['A', 'B'] as const).map(letter => <fieldset key={letter} className={styles.scenario}><legend>Cenário {letter}</legend><div className={styles.fields}>
            <StudyField label={`Acréscimo sobre custo ${letter} (%)`} value={sales[`markup${letter}`]} example={letter === 'A' ? '100' : '200'} onChange={v => setSalesField(`markup${letter}`, v)}/>
            <StudyField label={`Unidades vendidas ${letter}`} value={sales[`units${letter}`]} example={letter === 'A' ? '100' : '40'} step="1" onChange={v => setSalesField(`units${letter}`, v)}/>
          </div></fieldset>)}
        </div>
        {salesResult ? <div aria-live="polite" aria-atomic="true">
          <div className={styles.tableWrap}><table><caption>Comparação das hipóteses de venda</caption><thead><tr><th scope="col">Indicador</th><th scope="col">Cenário A</th><th scope="col">Cenário B</th></tr></thead><tbody>
            <tr><th scope="row">Preço por unidade</th><td>{money(salesResult.a.price)}</td><td>{money(salesResult.b.price)}</td></tr>
            <tr><th scope="row">Resultado por unidade</th><td>{money(salesResult.a.unitResult)}</td><td>{money(salesResult.b.unitResult)}</td></tr>
            <tr><th scope="row">Faturamento</th><td>{money(salesResult.a.revenue)}</td><td>{money(salesResult.b.revenue)}</td></tr>
            <tr><th scope="row">Resultado total estimado</th><td>{money(salesResult.a.result)}</td><td>{money(salesResult.b.result)}</td></tr>
          </tbody></table></div>
          <figure className={styles.chart}><figcaption>Resultado total: (preço − custo unitário) × unidades vendidas</figcaption>
            {(['a', 'b'] as const).map(key => <div key={key} className={styles.barRow}><span>Cenário {key.toUpperCase()}</span><div className={styles.track}><div className={styles.bar} style={{ width: barWidth(salesResult[key].result) }}/></div><strong>{money(salesResult[key].result)}</strong></div>)}
          </figure>
          <p className={styles.note}>{salesResult.a.result.eq(salesResult.b.result) ? 'Os dois cenários chegam ao mesmo resultado total.' : `Com as quantidades informadas, o cenário ${salesResult.a.result.gt(salesResult.b.result) ? 'A' : 'B'} gera o maior resultado total.`} Observe o conjunto: ganho por unidade e volume vendido.</p>
        </div> : <p className="subtle mt-3">Preencha o custo acima de zero, os acréscimos a partir de zero e as quantidades inteiras a partir de zero para comparar.</p>}
        <p className="subtle mt-4">Hipótese simplificada: custo unitário constante e produção igual às vendas, sem sobras. Inclua mão de obra, despesas, tributos e taxas no custo informado para aproximar o resultado do lucro líquido. O guia não adiciona esses gastos automaticamente; custos fixos e produção em lotes podem mudar o resultado real.</p>
      </div>
      <p>Não existe um percentual ideal para todo produto. Compare ofertas semelhantes e teste preços acompanhando pedidos, conversão de orçamentos em vendas, recompra e desperdício. Descontos também precisam caber nos custos. Na aba Precificação, confira o efeito dos lotes e das sobras na produção.</p>
      <p className="subtle">Para aprofundar: <a className={styles.source} href="https://meuatendimento.sebrae.com.br/sites/PortalSebrae/artigos/como-definir-o-preco-de-venda-de-um-produto-ou-servico%2Ccc9836627a963410VgnVCM1000003b74010aRCRD" target="_blank" rel="noreferrer">Sebrae — equilíbrio entre custos e mercado</a> e <a className={styles.source} href="https://blog.rn.sebrae.com.br/precificar-produto-2026/" target="_blank" rel="noreferrer">preço e valor percebido pelo cliente</a>.</p>
    </section>

    <section id="guide-apply" className={`panel ${styles.lesson}`} aria-labelledby="guide-apply-title">
      <h2 id="guide-apply-title" className={styles.title}><span className="number-dot">3</span>Leve os estudos para Receitas</h2>
      <p>Depois de revisar suas hipóteses, abra a receita e preencha os campos correspondentes:</p>
      <ul className={styles.checklist}>
        <li><Check size={18}/><span><strong>Valor da hora de trabalho:</strong> use sua referência de remuneração por hora.</span></li>
        <li><Check size={18}/><span><strong>Tempo de produção e Rendimento:</strong> informe o trabalho dedicado ao lote e quantas unidades ele produz.</span></li>
        <li><Check size={18}/><span><strong>Despesas operacionais:</strong> estime os gastos não incluídos em outros custos. O percentual do app incide sobre ingredientes + embalagens. Confira se o valor em reais cobre sua parcela de energia, gás, água e outros gastos, sem repeti-los.</span></li>
        <li><Check size={18}/><span><strong>Lucro desejado sobre custo:</strong> defina o acréscimo e confira a margem calculada no resumo.</span></li>
        <li><Check size={18}/><span><strong>Preço praticado:</strong> compare o preço que você cobra com o sugerido e acompanhe o resultado real das vendas.</span></li>
      </ul>
      <Button onClick={onRecipes}>Abrir Receitas<ArrowRight size={17}/></Button>
      <p className="subtle mt-3">Os valores não são transferidos automaticamente. Revise cada receita antes de salvar.</p>
    </section>
  </div>;
}
