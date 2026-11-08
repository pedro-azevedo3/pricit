'use client';

import { Ingredient } from '@/lib/types';
import { baseUnit, type MeasurementUnit } from '@/lib/measurements';
import { perBaseUnit } from '@/lib/calculations';
import { AppSidebar } from './app-sidebar';
import { AppTopbar } from './app-topbar';
import { Ingredients } from './ingredients';
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
const noop = () => {};
const noChange = async () => {};

export function ApplicationPreview() {
  return <div className={styles.frame} inert aria-hidden="true" data-application-preview>
    <div className={styles.canvas}>
      <AppSidebar activeTab="ingredients" onNavigate={noop} onHelp={noop} preview/>
      <div className={styles.workspace}>
        <AppTopbar activeTab="ingredients" preview/>
        <div className="px-10 pb-12 pt-10"><Ingredients items={demoIngredients} onChange={noChange} notify={noop}/></div>
      </div>
    </div>
  </div>;
}
