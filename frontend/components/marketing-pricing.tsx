import styles from './landing-page.module.css';

const plans = [
  { duration: '1 mês', price: '14,90', monthly: 'R$ 14,90 por mês', note: 'Um mês para organizar suas contas.' },
  { duration: '6 meses', price: '79,90', monthly: 'R$ 13,32 por mês', note: 'Mais tempo para acompanhar seu negócio.' },
  { duration: '1 ano', price: '129,90', monthly: 'R$ 10,83 por mês', note: 'Um ano com os custos do negócio na mão.' },
];

export function MarketingPricing() {
  return <section id="precos" className={styles.pricing} aria-labelledby="pricing-title" aria-describedby="pricing-status">
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
            <p className={styles.planMonthly}>{plan.monthly}</p>{index===2&&<p className={styles.planDiscount}>27% off em relação ao plano mensal</p>}
            <div className={styles.planAvailability}>Assinatura disponível em breve</div>
          </article>)}</div>
          <p className={styles.pricingNote}>Os valores por mês são equivalências aproximadas do total de cada período.</p>
        </div>
      </section>;
}
