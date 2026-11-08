import type { Metadata } from 'next';
import { LandingPage } from '@/components/landing-page';

export const metadata: Metadata = {
  title: 'pricit · Receita boa merece preço certo',
  description: 'Conheça seus custos, precifique suas receitas e planeje suas vendas. O pricit ajuda você a transformar ingredientes em decisões mais claras para o seu negócio.',
};

export default function Home() { return <LandingPage />; }
