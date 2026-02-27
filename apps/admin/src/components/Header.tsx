'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LogOut, User } from 'lucide-react';

export function Header({ businessName, userName }: { businessName: string; userName: string }) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  }

  return (
    <header className="h-14 border-b border-slate-200/80 bg-white/95 backdrop-blur flex items-center justify-between px-6">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-slate-800">{businessName}</span>
        <span className="text-slate-300">|</span>
        <span className="flex items-center gap-1.5 text-slate-500 text-sm">
          <User className="w-3.5 h-3.5" />
          {userName}
        </span>
      </div>
      <button
        onClick={signOut}
        className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
      >
        <LogOut className="w-4 h-4" />
        Sign out
      </button>
    </header>
  );
}
