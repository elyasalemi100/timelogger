import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProfileByUserId } from '@/lib/auth';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const profile = await getProfileByUserId(user.id);
  if (!profile || (profile.role !== 'owner' && profile.role !== 'admin')) {
    redirect('/auth/login');
  }

  const businessName = profile.businesses?.name ?? 'ShiftSnap';
  const userName = profile.name;

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <Header businessName={businessName} userName={userName} />
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
