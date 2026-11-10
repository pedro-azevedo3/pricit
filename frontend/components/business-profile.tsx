'use client';
import { useState } from 'react';
import { Save } from 'lucide-react';
import { api } from '@/lib/api';
import { businessProfiles, type BusinessProfile as Profile } from '@/lib/business';
import { useBusiness } from './business-context';
import { BusinessFields } from './business-fields';
import { Button } from './ui/button';
import { ErrorBox } from './shared';

export function BusinessProfile({ onSaved }: { onSaved: (profile: Profile) => void }) {
  const { profile } = useBusiness();
  const [draft, setDraft] = useState(profile), [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try { const saved = await api<Profile>('/profile', { method: 'PUT', body: JSON.stringify(draft) }); onSaved(saved); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  const selected = businessProfiles[draft.business_type];
  return <div className="max-w-3xl"><p className="eyebrow">Seu negócio, sua perspectiva</p><h1 className="mt-3 text-3xl font-semibold">Perfil do negócio</h1><p className="mt-4 text-sm leading-7 text-[var(--muted)]">Escolha seu segmento a qualquer momento. As telas e os novos cadastros se adaptam; seus dados e os formatos das fichas já salvas são preservados.</p>
    <form onSubmit={save} className="panel mt-7 space-y-6 p-5 sm:p-7"><BusinessFields value={draft} onChange={setDraft} disabled={busy}/>
      <div className="notice"><strong>{selected.label}</strong><p>{selected.costs}</p><p className="mt-2">{selected.service ? `Você verá ${selected.resources} e ${selected.offers}. Itens consumidos são opcionais; energia e equipamentos podem ser detalhados por ficha.` : `Você verá ${selected.resources} e ${selected.offers}. Detalhe sua composição, o rendimento por lote e os custos de estrutura.`}</p></div>
      <ErrorBox message={error}/><Button type="submit" disabled={busy}><Save size={16}/>{busy ? 'Salvando…' : 'Salvar perfil do negócio'}</Button>
    </form></div>;
}
