'use client';

import { Ingredient } from '@/lib/types';
import { baseUnit, type MeasurementUnit } from '@/lib/measurements';
import { perBaseUnit } from '@/lib/calculations';
import { AppSidebar } from './app-sidebar';
import { AppTopbar } from './app-topbar';
import { Ingredients } from './ingredients';
import { PricingGuide } from './pricing-guide';
import { useBusiness } from './business-context';
import { businessProfiles } from '@/lib/business';
import styles from './application-preview.module.css';

// Public examples only. This preview never loads a session or customer records.
function demoIngredient(id:string,name:string,measurement_unit:MeasurementUnit,package_quantity:string,package_price:string):Ingredient {
  const data={id,name,measurement_unit,package_quantity,package_price};
  const cost=perBaseUnit(data), unit=baseUnit(measurement_unit);
  return {...data,is_active:true,created_at:'2026-01-01T00:00:00Z',updated_at:'2026-01-01T00:00:00Z',
    base_unit:unit,cost_per_base_unit:cost.toString(),cost_per_gram:unit==='g'?cost.toString():null,
    cost_per_kg:unit==='g'?cost.mul(1000).toString():null};
}
const demoIngredients = [
  demoIngredient('demo-flour','Farinha de trigo','kg','1','6'),
  demoIngredient('demo-chocolate','Chocolate meio amargo','g','500','24'),
  demoIngredient('demo-milk','Leite integral','ml','1000','5.50'),
  demoIngredient('demo-eggs','Ovos','un','12','12'),
];
const businessExamples = {
  beauty: [demoIngredient('demo-shampoo','Shampoo profissional','ml','1000','40'),demoIngredient('demo-wax','Cera modeladora','g','100','25'),demoIngredient('demo-blades','Lâminas descartáveis','un','100','50'),demoIngredient('demo-gloves','Luvas descartáveis','un','100','30')],
  acai: [demoIngredient('demo-acai','Polpa de açaí','kg','5','60'),demoIngredient('demo-granola','Granola','g','1000','20'),demoIngredient('demo-condensed','Leite condensado','g','395','7'),demoIngredient('demo-cups','Copos descartáveis','un','100','30')],
  burger: [demoIngredient('demo-meat','Carne para hambúrguer','kg','1','35'),demoIngredient('demo-bun','Pão de hambúrguer','un','12','18'),demoIngredient('demo-cheese','Queijo cheddar','g','500','20'),demoIngredient('demo-box','Embalagem para lanche','un','100','60')],
  bakery: [demoIngredient('demo-bread-flour','Farinha de trigo','kg','5','25'),demoIngredient('demo-yeast','Fermento biológico','g','500','15'),demoIngredient('demo-butter','Manteiga','g','500','20'),demoIngredient('demo-paper','Sacos de papel','un','100','15')],
};
const noop = () => {};
const noChange = async () => {};

export type PreviewTab = 'ingredients' | 'guide';

export function ApplicationPreview({ tab = 'ingredients' }: { tab?: PreviewTab }) {
  const {profile}=useBusiness();
  const examples=profile.business_type==='food'?demoIngredients:businessExamples[profile.business_type as keyof typeof businessExamples] || [demoIngredient('demo-supply',businessProfiles[profile.business_type].sampleResource,'un','10','50')];
  return <div className={styles.frame} inert aria-hidden="true" data-application-preview>
    <div className={styles.canvas}>
      <AppSidebar activeTab={tab} onNavigate={noop} onHelp={noop} preview/>
      <div className={styles.workspace}>
        <AppTopbar activeTab={tab} preview/>
        <div key={tab} className="page-transition px-10 pb-12 pt-10">{tab === 'guide'
          ? <PricingGuide onRecipes={noop}/>
          : <Ingredients items={examples} onChange={noChange} notify={noop}/>}</div>
      </div>
    </div>
  </div>;
}
