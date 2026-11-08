'use client';

import { CircleHelp, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { appTabs, type AppTab } from '@/lib/navigation';
import { AppLogo } from './app-logo';
import { Mascot } from './mascot';

export function AppSidebar({ activeTab, collapsed = false, onNavigate, onToggle, onHelp, preview = false }: {
  activeTab: AppTab;
  collapsed?: boolean;
  onNavigate: (tab: AppTab) => void;
  onToggle?: () => void;
  onHelp: () => void;
  preview?: boolean;
}) {
  const toggleLabel = collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral';
  return <aside data-collapsed={collapsed} aria-label="Menu lateral" className={`brand-sidebar app-sidebar ${preview ? 'absolute inset-y-0 left-0 flex' : 'fixed inset-y-0 left-0 z-20 hidden lg:flex'}`}>
    <div className={`sidebar-heading ${collapsed ? 'sidebar-heading-collapsed' : ''}`}>
      <a href="/" aria-label="pricit — início"><AppLogo/></a>
      <button type="button" className="sidebar-toggle" onClick={onToggle} aria-label={toggleLabel} title={toggleLabel}
        aria-expanded={!collapsed} aria-controls={preview ? undefined : 'desktop-sidebar-navigation'}>
        {collapsed ? <PanelLeftOpen size={18}/> : <PanelLeftClose size={18}/>}
      </button>
    </div>
    {!collapsed && <p className="eyebrow mb-7 px-3">Seu espaço de gestão</p>}
    <nav id={preview ? undefined : 'desktop-sidebar-navigation'} className="space-y-2" aria-label="Navegação principal">
      {appTabs.map(tab => <button key={tab.id} type="button" onClick={() => onNavigate(tab.id)} aria-label={tab.name}
        title={collapsed ? tab.name : undefined} aria-current={activeTab === tab.id ? 'page' : undefined}
        className={`sidebar-item ${collapsed ? 'sidebar-item-collapsed' : ''} ${activeTab === tab.id ? 'bg-[var(--accent)] text-[var(--brand-text)]' : 'text-[var(--muted)] hover:bg-[var(--accent)]'}`}>
        <tab.icon size={19} className="shrink-0"/>
        {!collapsed && <><span><span className="block text-[13px] font-semibold">{tab.name}</span><span className="mt-1 block text-[10px] text-[var(--muted)]">{tab.description}</span></span>{activeTab === tab.id && <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand)]"/>}</>}
      </button>)}
    </nav>
    <button type="button" onClick={onHelp} aria-label="Como funciona" title={collapsed ? 'Como funciona' : undefined}
      className={`mascot-help sidebar-help ${collapsed ? 'sidebar-help-collapsed' : ''}`}>
      {!collapsed && <Mascot pose="cool" size={104}/>}
      <span className="flex items-center justify-center gap-2"><CircleHelp size={18}/>{!collapsed && 'Como funciona'}</span>
    </button>
    {!collapsed && <p className="mt-6 px-3 text-[10px] text-[var(--muted)]">pricit · SEU NEGÓCIO CRESCENDO</p>}
  </aside>;
}
