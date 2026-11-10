'use client';

import { Moon } from 'lucide-react';
import { businessTabs, type AppTab } from '@/lib/navigation';
import { useBusiness } from './business-context';
import { AppLogo } from './app-logo';
import { ThemeToggle } from './theme-toggle';
import { Button } from './ui/button';

export function AppTopbar({ activeTab, onLogout, preview = false }: {
  activeTab: AppTab; onLogout?: () => void; preview?: boolean;
}) {
  const { profile } = useBusiness();
  const appTabs = businessTabs(profile.business_type);
  return <header className="flex h-[78px] items-center justify-between border-b border-[var(--border)] px-5 md:px-10">
    <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
      {!preview && <a href="/" aria-label="pricit — início" className="lg:hidden"><AppLogo mobile/></a>}
      <span className="hidden max-w-40 truncate sm:inline">{profile.business_name || 'Meu negócio'}</span><span>/</span><span className="text-[var(--foreground)]">{appTabs.find(tab => tab.id === activeTab)?.name}</span>
    </div>
    <div className="flex items-center gap-3">
      {preview ? <Button variant="outline" size="icon" aria-label="Ativar tema escuro"><Moon size={18}/></Button> : <ThemeToggle/>}
      <Button variant="ghost" onClick={onLogout}>Sair</Button>
    </div>
  </header>;
}
