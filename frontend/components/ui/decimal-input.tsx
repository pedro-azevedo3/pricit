'use client';

import { useState, type InputHTMLAttributes } from 'react';
import { d, displayDecimal } from '@/lib/calculations';

/** Two-place presentation without rewriting stored decimals when merely opening a form. */
export function DecimalInput({ value, onFocus, onBlur, onChange, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const raw = value == null ? '' : String(value);
  const displayed = raw === '' ? '' : displayDecimal(raw).toFixed(2);

  return <input {...props} type="number" inputMode="decimal" step="0.01"
    value={editing ? draft : displayed}
    onFocus={event => {
      setDraft(raw === '' ? '' : d(raw).toFixed(2));
      setEditing(true);
      onFocus?.(event);
    }}
    onChange={event => {
      setDraft(event.target.value);
      onChange?.(event);
    }}
    onBlur={event => {
      setEditing(false);
      onBlur?.(event);
    }}
  />;
}
