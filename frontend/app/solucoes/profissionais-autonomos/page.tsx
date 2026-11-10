import type { Metadata } from 'next';
import { AutonomousLanding } from '@/components/autonomous-landing';

const title = 'pricit para profissionais autônomos · Seu tempo tem valor';
const description = 'Calcule o valor da sua hora, organize custos de serviços e projetos e gere orçamentos e contratos em PDF com o pricit.';
export const metadata: Metadata = {
  title, description,
  alternates: { canonical: '/solucoes/profissionais-autonomos' },
  openGraph: { type: 'website', locale: 'pt_BR', siteName: 'pricit', title, description, url: '/solucoes/profissionais-autonomos', images: [{ url: '/share-card.jpg', width: 1200, height: 630, alt: 'pricit — seu trabalho tem valor.' }] },
  twitter: { card: 'summary_large_image', title, description, images: ['/share-card.jpg'] },
};
export default function AutonomousPage() { return <AutonomousLanding/>; }
