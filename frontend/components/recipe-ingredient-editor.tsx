'use client';

import { useState } from 'react';
import { baseUnit, compatibleUnits, costLabel, measurementOptions, type MeasurementUnit } from '@/lib/measurements';
import { Ingredient } from '@/lib/types';
import { api } from '@/lib/api';
import { money, perBaseUnit } from '@/lib/calculations';
import { DecimalInput } from './ui/decimal-input';
import { Button } from './ui/button';
import { ErrorBox, Modal } from './shared';
import { useBusiness } from './business-context';

export function RecipeIngredientEditor({ ingredient, onClose, onSaved }: {
  ingredient: Ingredient;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { business }=useBusiness();
  const [form, setForm] = useState({
    name: ingredient.name,
    measurement_unit: ingredient.measurement_unit,
    package_quantity: ingredient.package_quantity,
    package_price: ingredient.package_price,
    is_active: ingredient.is_active,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api(`/ingredients/${ingredient.id}`, { method: 'PUT', body: JSON.stringify(form) });
      await onSaved();
      onClose();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return <Modal open onClose={() => !busy && onClose()} title={`Editar ${business.resource}`}
    description="As alterações serão salvas na biblioteca e atualizarão todas as fichas que usam este item. O histórico de precificações será preservado.">
    <form onSubmit={save}>
      <div className="space-y-4">
        <label>Nome do {business.resource}
          <input required maxLength={200} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        </label>
        <div className="field-grid">
          <label>Quantidade da embalagem
            <DecimalInput required type="number" min="0.01" step="0.01" value={form.package_quantity} onChange={e => setForm({ ...form, package_quantity: e.target.value })} />
          </label>
          <label>Unidade de medida
            <select value={form.measurement_unit} onChange={e => setForm({ ...form, measurement_unit: e.target.value as MeasurementUnit })}>
              {measurementOptions.filter(option=>compatibleUnits(ingredient.measurement_unit).includes(option.value)).map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>
        <label>Valor pago pela embalagem (R$)
          <DecimalInput required type="number" min="0" step="0.01" value={form.package_price} onChange={e => setForm({ ...form, package_price: e.target.value })} />
        </label>
        <div className="notice">{costLabel(form.measurement_unit)}: <strong>{money(perBaseUnit(form))}</strong>{baseUnit(form.measurement_unit)==='g'&&<><br />Custo por quilograma: <strong>{money(perBaseUnit(form).mul(1000))}</strong></>}</div>
      </div>
      <ErrorBox message={error} />
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="outline" disabled={busy} onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={busy}>{busy ? 'Salvando…' : `Salvar ${business.resource}`}</Button>
      </div>
    </form>
  </Modal>;
}
