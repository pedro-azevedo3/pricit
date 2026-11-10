import type { Metadata } from 'next';
import { AuthScreen } from '@/components/auth-screen';
import { businessProfiles, type BusinessType } from '@/lib/business';

export const metadata: Metadata = { title: 'Registre-se · pricit', robots: { index: false, follow: false } };
export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ perfil?: string | string[] }> }) {
  const { perfil } = await searchParams;
  const initialBusinessType = typeof perfil === 'string' && Object.hasOwn(businessProfiles, perfil) ? perfil as BusinessType : undefined;
  return <AuthScreen mode="register" initialBusinessType={initialBusinessType}/>;
}
