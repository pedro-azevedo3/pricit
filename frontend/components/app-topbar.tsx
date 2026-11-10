'use client';

import { Moon, UserRound } from 'lucide-react';
import { businessTabs, type AppTab } from '@/lib/navigation';
import { useBusiness } from './business-context';
import { AppLogo } from './app-logo';
import { ThemeToggle } from './theme-toggle';
import { Button } from './ui/button';

export function AppTopbar({ activeTab, onLogout, onProfile, preview = false }: {
  activeTab: AppTab; onLogout?: () => void; onProfile?: () => void; preview?: boolean;
}) {
  const { profile } = useBusiness();
  const appTabs = businessTabs(profile.business_type);
  return <header className="flex h-[78px] items-center justify-between gap-3 border-b border-[var(--border)] px-4 sm:px-5 md:px-10">
    <div className="flex min-w-0 items-center gap-2 text-xs text-[var(--muted)]">
      {!preview && <a href="/" aria-label="pricit — início" className="shrink-0 lg:hidden"><AppLogo mobile/></a>}
      <span className="hidden max-w-40 truncate sm:inline">{profile.business_name || 'Meu negócio'}</span><span>/</span><span className="min-w-0 truncate text-[var(--foreground)]">{activeTab==='profile'?'Perfil':appTabs.find(tab => tab.id === activeTab)?.name}</span>
    </div>
    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
      {preview ? <Button variant="outline" size="icon" aria-label="Ativar tema escuro"><Moon size={18}/></Button> : <ThemeToggle/>}
      <Button variant="outline" size="icon" onClick={onProfile} aria-label="Perfil do negócio" title="Perfil do negócio"
        aria-pressed={activeTab==='profile'} className={activeTab==='profile'?'brand-accent !bg-[var(--accent)]':undefined}><UserRound size={18}/></Button>
      <Button variant="ghost" onClick={onLogout}>Sair</Button>
    </div>
  </header>;
}
