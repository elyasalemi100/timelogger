'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Clock,
  Users,
  FileBarChart,
  Settings,
  CreditCard,
} from 'lucide-react';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/timesheets', label: 'Timesheets', icon: Clock },
  { href: '/employees', label: 'Employees', icon: Users },
  { href: '/reports', label: 'Reports', icon: FileBarChart },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/billing', label: 'Billing', icon: CreditCard },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 bg-white border-r border-slate-200/80 min-h-screen flex flex-col">
      <div className="p-5 border-b border-slate-100">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-lg font-semibold text-slate-800 hover:text-brand-600 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold text-sm">
            S
          </div>
          ShiftSnap
        </Link>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {nav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0 opacity-80" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
