import { Leaf, BookOpen, ChartNoAxesCombined, GraduationCap } from 'lucide-react';

export type AppTab = 'ingredients' | 'recipes' | 'simulator' | 'guide';
export const appTabs = [
  {id:'ingredients' as AppTab,name:'Ingredientes',icon:Leaf,description:'Sua biblioteca'},
  {id:'recipes' as AppTab,name:'Receitas',icon:BookOpen,description:'Custos e precificação'},
  {id:'simulator' as AppTab,name:'Precificação',icon:ChartNoAxesCombined,description:'Planejamento de vendas'},
  {id:'guide' as AppTab,name:'Guia',icon:GraduationCap,description:'Hora, custos e lucro'},
];
