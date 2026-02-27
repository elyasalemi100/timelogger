'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function Header({ businessName, userName }: { businessName: string; userName: string }) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  }

  return (
    <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6">
      <div>
        <span className="font-medium text-slate-800">{businessName}</span>
        <span className="text-slate-400 mx-2">·</span>
        <span className="text-slate-500 text-sm">{userName}</span>
      </div>
      <button
        onClick={signOut}
        className="text-sm text-slate-500 hover:text-slate-700"
      >
        Sign out
      </button>
    </header>
  );
}
