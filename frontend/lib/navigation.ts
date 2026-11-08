import { Leaf, BookOpen, ChartNoAxesCombined } from 'lucide-react';

export type AppTab = 'ingredients' | 'recipes' | 'simulator';
export const appTabs = [
  {id:'ingredients' as AppTab,name:'Ingredientes',icon:Leaf,description:'Sua biblioteca'},
  {id:'recipes' as AppTab,name:'Receitas',icon:BookOpen,description:'Custos e precificação'},
  {id:'simulator' as AppTab,name:'Precificação',icon:ChartNoAxesCombined,description:'Planejamento de vendas'},
];
