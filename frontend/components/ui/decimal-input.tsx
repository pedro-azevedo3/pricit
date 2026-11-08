'use client';

import { useState, type InputHTMLAttributes } from 'react';
import { displayDecimal } from '@/lib/calculations';

/** Two-place presentation without rewriting stored decimals when merely opening a form. */
export function DecimalInput({ value, onFocus, onBlur, onChange, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const raw = value == null ? '' : String(value);
  const displayed = raw === '' ? '' : displayDecimal(raw).toFixed(2);

  return <input {...props} type="number" inputMode="decimal" step="0.01"
    value={editing ? draft : displayed}
    onFocus={event => {
      // Keep the visible value on focus: rewriting it can reset the browser's
      // selection and append new digits instead of replacing the field.
      // The original decimal still stays in the parent until onChange fires.
      setDraft(event.currentTarget.value);
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
