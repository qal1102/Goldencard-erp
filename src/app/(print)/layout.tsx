import { verifySession } from '@/lib/auth/dal';

export default async function PrintGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await verifySession();

  return <>{children}</>;
}
