import type { Metadata } from 'next';
import { AuthScreen } from '@/components/auth-screen';

export const metadata: Metadata = { title: 'Registre-se · pricit', robots: { index: false, follow: false } };
export default function RegisterPage() { return <AuthScreen mode="register" />; }
