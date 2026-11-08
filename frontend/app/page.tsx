import type { Metadata } from 'next';
import { LandingPage } from '@/components/landing-page';

export const metadata: Metadata = {
  title: 'pricit · Receita boa merece preço certo',
  description: 'Conheça seus custos, precifique suas receitas e planeje suas vendas. O pricit ajuda você a transformar ingredientes em decisões mais claras para o seu negócio.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'pricit',
    url: '/',
    title: 'pricit · Receita boa merece preço certo',
    description: 'Conheça seus custos, precifique suas receitas e planeje suas vendas.',
    images: [{ url: '/share-card.jpg', width: 1200, height: 630, type: 'image/jpeg', alt: 'pricit — Receita boa merece preço certo, com o mascote de óculos escuros.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'pricit · Receita boa merece preço certo',
    description: 'Conheça seus custos, precifique suas receitas e planeje suas vendas.',
    images: [{ url: '/share-card.jpg', alt: 'pricit — Receita boa merece preço certo.' }],
  },
};

export default function Home() { return <LandingPage />; }
