'use client';
import { Plus, X } from 'lucide-react';
import { type AdditionalCost } from '@/lib/types';
import { d, money } from '@/lib/calculations';
import { Button } from './ui/button';

const categories = {energy:'Energia',equipment:'Equipamento',other:'Outro custo'};
export function AdditionalCostEditor({ value, onChange, service }: { value: AdditionalCost[]; onChange: (costs: AdditionalCost[]) => void; service: boolean }) {
  const patch = (index: number, data: Partial<AdditionalCost>) => onChange(value.map((item,i)=>i===index?{...item,...data}:item));
  const add = (category: AdditionalCost['category']) => onChange([...value,{name:'',category,unit:category==='energy'?'kwh':category==='equipment'?'hour':'unit',quantity:'',unit_cost:''}]);
  return <div className="mt-5 space-y-4">
    <h4 className="font-semibold">Energia, equipamentos e outros custos</h4>
    <p className="subtle">Informe os recursos usados {service?'no atendimento ou conjunto de atendimentos desta ficha':'no lote inteiro'}. Cada custo é quantidade × valor por medida e entra uma única vez no total, fora do percentual de despesas.</p>
    {value.map((item,index)=><fieldset key={index} className="rounded-xl border border-[var(--border)] p-4">
      <legend className="px-2 text-xs font-semibold">{categories[item.category]} {index+1}</legend>
      <div className="mb-3 flex justify-end"><Button size="icon" variant="ghost" aria-label={`Remover custo ${index+1}`} onClick={()=>onChange(value.filter((_,i)=>i!==index))}><X size={16}/></Button></div>
      <div className="field-grid"><label>Nome do recurso<input required maxLength={200} value={item.name} placeholder={item.category==='energy'?'Ex.: Energia da secadora':item.category==='equipment'?'Ex.: Máquina de corte':'Ex.: Rateio do aluguel'} onChange={e=>patch(index,{name:e.target.value})}/></label>
        <label>Medida do recurso<select value={item.unit} onChange={e=>patch(index,{unit:e.target.value as AdditionalCost['unit']})}><option value="kwh">Quilowatt-hora (kWh)</option><option value="hour">Horas de uso</option><option value="unit">Unidade / rateio</option></select></label>
        <label>Quantidade do recurso<input required type="number" min="0.000001" max="999999999999" step="0.000001" inputMode="decimal" placeholder={item.unit==='hour'?'Ex.: 0,5':item.unit==='kwh'?'Ex.: 0,2':'Ex.: 1'} value={item.quantity} onChange={e=>patch(index,{quantity:e.target.value})}/></label>
        <label>Valor por medida do recurso (R$)<input required type="number" min="0" max="999999999999" step="0.000001" inputMode="decimal" placeholder="Ex.: 1,25" value={item.unit_cost} onChange={e=>patch(index,{unit_cost:e.target.value})}/></label>
      </div><p className="!mt-4 text-right text-sm font-semibold">Custo do recurso: {money(d(item.quantity).mul(d(item.unit_cost)))}</p>
    </fieldset>)}
    <div className="flex flex-wrap gap-3">{(Object.keys(categories) as AdditionalCost['category'][]).map(category=><Button key={category} variant="outline" disabled={value.length>=100} onClick={()=>add(category)}><Plus size={15}/>Adicionar {categories[category].toLowerCase()}</Button>)}</div>
    <details className="notice"><summary className="cursor-pointer font-semibold">Como estimar energia e uso de equipamentos?</summary><div className="mt-3 space-y-2">
      <p>Energia: potência em kW × horas de uso = kWh. Multiplique pelo custo por kWh da sua conta. Exemplo ilustrativo: 1 kW × 0,5 hora = 0,5 kWh. Não conte os mesmos kWh novamente nas despesas operacionais.</p>
      <p>Equipamento: distribua o valor de compra menos o valor de revenda estimado pelas horas de vida útil previstas. Inclua manutenção por hora se ela ainda não estiver em outra despesa. Informe esse custo por hora e o tempo real de uso nesta ficha. Atualize as estimativas com os gastos observados.</p>
      <p>Outros gastos: para um rateio já calculado por atendimento ou lote, escolha Unidade / rateio, quantidade 1 e informe o valor correspondente. Evite incluir o mesmo gasto em produtos, mão de obra e despesas ao mesmo tempo.</p>
    </div></details>
  </div>;
}
