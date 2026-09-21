'use client';

import { LogOut, UserRound } from 'lucide-react';
import { useStore } from '@/store';
import LucentSwitch from '@/components/LucentSwitch';

export default function Header() {
  const { user } = useStore();

  return (
    <header className="fixed inset-x-0 top-0 z-40 h-[4.7rem] px-3 pt-3 pl-16 sm:pl-16 lg:left-[17.5rem] lg:px-5 lg:pl-5">
      <div className="glass flex h-full items-center justify-between rounded-2xl px-3.5 sm:px-5">
        <div className="min-w-0 pr-2">
          <p className="text-sm font-semibold truncate text-white">Welcome back{user?.username ? ', ' + user.username : ''}</p>
          <p className="hidden text-xs text-[var(--muted)] sm:block truncate">Choose a server and manage it at your own pace.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <LucentSwitch compact />
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.045] p-1.5 pl-2">
            {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-7 w-7 rounded-lg object-cover" /> : <span className="grid h-7 w-7 place-items-center rounded-lg bg-rose-400/15 text-rose-200"><UserRound size={15} /></span>}
            <button onClick={() => { window.location.href = '/auth/logout'; }} className="lucent-button h-8 w-8 rounded-lg p-0 text-[var(--muted)]" aria-label="Sign out"><LogOut size={15} /></button>
          </div>
        </div>
      </div>
    </header>
  );
}
