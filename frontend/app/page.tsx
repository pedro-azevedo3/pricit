import type { Metadata } from 'next';
import { LandingPage } from '@/components/landing-page';

export const metadata: Metadata = {
  title: 'pricit · Seu negócio merece preço certo',
  description: 'Organize os custos do seu negócio, valorize seu trabalho e precifique produtos e serviços com confiança.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'pricit',
    url: '/',
    title: 'pricit · Seu negócio merece preço certo',
    description: 'Conheça os custos do seu negócio, calcule o valor da sua hora e precifique produtos e serviços com mais clareza.',
    images: [{ url: '/share-business.jpg', width: 1200, height: 630, type: 'image/jpeg', alt: 'pricit — Seu negócio merece preço certo, com o mascote de óculos escuros.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'pricit · Seu negócio merece preço certo',
    description: 'Conheça os custos do seu negócio, calcule o valor da sua hora e precifique produtos e serviços com mais clareza.',
    images: [{ url: '/share-business.jpg', alt: 'pricit — Seu negócio merece preço certo.' }],
  },
};

export default function Home() { return <LandingPage />; }
