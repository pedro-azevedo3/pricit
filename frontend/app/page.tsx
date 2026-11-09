import type { Metadata } from 'next';
import { LandingPage } from '@/components/landing-page';

export const metadata: Metadata = {
  title: 'pricit · Receita boa merece preço certo',
  description: 'Conheça seus custos, precifique receitas e planeje vendas. Com o Guia do pricit, estude o valor da sua hora, a mão de obra e o equilíbrio entre preço e lucro.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'pricit',
    url: '/',
    title: 'pricit · Receita boa merece preço certo',
    description: 'Precifique receitas, planeje vendas e aprenda a calcular sua hora e mão de obra com o Guia do pricit.',
    images: [{ url: '/share-card.jpg', width: 1200, height: 630, type: 'image/jpeg', alt: 'pricit — Receita boa merece preço certo, com o mascote de óculos escuros.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'pricit · Receita boa merece preço certo',
    description: 'Precifique receitas, planeje vendas e aprenda a calcular sua hora e mão de obra com o Guia do pricit.',
    images: [{ url: '/share-card.jpg', alt: 'pricit — Receita boa merece preço certo.' }],
  },
};

export default function Home() { return <LandingPage />; }
