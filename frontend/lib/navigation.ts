import { Leaf, BookOpen, ChartNoAxesCombined, GraduationCap, Package, FileSignature, ShoppingBasket } from 'lucide-react';
import { businessProfiles, type BusinessType } from './business';
import { businessOfferIcon } from './business-icons';

export type AppTab = 'ingredients' | 'recipes' | 'simulator' | 'guide' | 'profile' | 'documents' | 'shopping';
export const appTabs = [
  {id:'ingredients' as AppTab,name:'Ingredientes',icon:Leaf,description:'Sua biblioteca'},
  {id:'recipes' as AppTab,name:'Receitas',icon:BookOpen,description:'Custos e precificação'},
  {id:'simulator' as AppTab,name:'Precificação',icon:ChartNoAxesCombined,description:'Planejamento de vendas'},
  {id:'shopping' as AppTab,name:'Compras',icon:ShoppingBasket,description:'Suas listas de compras'},
  {id:'guide' as AppTab,name:'Guia',icon:GraduationCap,description:'Hora, custos e lucro'},
  {id:'documents' as AppTab,name:'Documentos',icon:FileSignature,description:'Contratos e orçamentos'},
];
export function businessTabs(type: BusinessType) {
  const business = businessProfiles[type];
  return appTabs.map(tab => tab.id === 'ingredients' ? { ...tab, name: business.resources, icon: business.service ? Package : Leaf } : tab.id === 'recipes' ? { ...tab, name: business.offers, icon: businessOfferIcon(type) } : tab);
}
