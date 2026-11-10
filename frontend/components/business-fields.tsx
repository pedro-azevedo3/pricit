'use client';
import { businessProfiles, pricingGoals, type BusinessProfile, type BusinessType, type PricingGoal } from '@/lib/business';

export function BusinessFields({ value, onChange, disabled = false }: { value: BusinessProfile; onChange: (profile: BusinessProfile) => void; disabled?: boolean }) {
  return <div className="space-y-5">
    <label>Nome do negócio<input required maxLength={200} placeholder="Ex.: Meu negócio" autoComplete="organization" value={value.business_name} disabled={disabled} onChange={e => onChange({ ...value, business_name: e.target.value })}/></label>
    <label>Tipo de negócio<select required value={value.business_type} disabled={disabled} onChange={e => onChange({ ...value, business_type: e.target.value as BusinessType })}>
      <option value="" disabled>Selecione o seu segmento</option>
      {Object.entries(businessProfiles).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}
    </select></label>
    <label>O que você quer melhorar primeiro?<select required value={value.pricing_goal} disabled={disabled} onChange={e => onChange({ ...value, pricing_goal: e.target.value as PricingGoal })}>
      <option value="" disabled>Selecione seu objetivo</option>
      {pricingGoals.map(goal => <option key={goal.value} value={goal.value}>{goal.label}</option>)}
    </select></label>
  </div>;
}
