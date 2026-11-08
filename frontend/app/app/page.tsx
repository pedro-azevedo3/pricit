import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Dashboard from '@/components/dashboard';

// Validate every direct request on the server before rendering the dashboard.
export const dynamic = 'force-dynamic';

export default async function AppPage() {
  const session = (await cookies()).get('pricit_session');
  if (!session?.value) redirect('/login');

  const response = await fetch(
    `${process.env.API_URL || 'http://127.0.0.1:8000'}/api/v1/auth/me`,
    {
      headers: { Cookie: `pricit_session=${encodeURIComponent(session.value)}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    },
  );
  if (response.status === 401 || response.status === 403) redirect('/login');
  if (!response.ok) throw new Error('Não foi possível validar sua sessão. Tente novamente.');

  return <Dashboard/>;
}
