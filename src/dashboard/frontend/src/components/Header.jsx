'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Crown, Bell, LogOut, UserRound, Menu, X, Zap, ChevronDown, Server } from 'lucide-react';
import { useStore } from '@/store';

export default function Header() {
  const { user, sidebarOpen, setSidebarOpen } = useStore();
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-14 bg-[#111218] border-b border-[#1e202c] px-4 sm:px-6 flex items-center justify-between">
      {/* Left: Mobile menu toggle + Uranium Brand */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition"
          aria-label="Toggle navigation"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-tr from-rose-600 to-red-500 text-white shadow-md shadow-rose-600/20 group-hover:scale-105 transition">
            <Zap size={16} fill="currentColor" />
          </span>
          <span className="text-base font-black text-white tracking-tight">
            Uranium
          </span>
        </Link>
      </div>

      {/* Right: Upgrade to Premium + Bell + User Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        {/* Upgrade to Premium Button (MEE6 gold pill style) */}
        <a
          href="https://discord.gg/26ThFyckFX"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#252014] hover:bg-[#322a19] border border-[#52411e] text-xs font-bold text-amber-300 transition-all shadow-sm active:scale-95"
        >
          <span>Upgrade to Premium</span>
          <Crown size={13} className="fill-amber-400 text-amber-400" />
        </a>

        {/* Notifications */}
        <button
          type="button"
          className="h-8 w-8 rounded-lg text-white/60 hover:text-white hover:bg-white/5 flex items-center justify-center transition"
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell size={16} />
        </button>

        {/* User Profile */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-1.5 p-1 rounded-full hover:ring-2 hover:ring-white/10 transition"
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                className="h-8 w-8 rounded-full object-cover border border-white/10"
              />
            ) : (
              <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white/70">
                <UserRound size={16} />
              </span>
            )}
          </button>

          {profileOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
              <div className="absolute right-0 mt-2 w-52 rounded-xl bg-[#181923] border border-[#262838] p-1.5 shadow-2xl z-50 text-xs">
                <div className="px-3 py-2 border-b border-white/5">
                  <p className="font-bold text-white truncate">{user?.username || 'Authenticated User'}</p>
                  <p className="text-[11px] text-white/40 truncate">Discord Connected</p>
                </div>
                <div className="py-1">
                  <Link
                    href="/servers"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition"
                  >
                    <Server size={14} />
                    <span>Switch Server</span>
                  </Link>
                  <a
                    href="https://discord.gg/26ThFyckFX"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-amber-300 hover:bg-amber-500/10 transition"
                  >
                    <Crown size={14} className="fill-amber-400 text-amber-400" />
                    <span>Get Premium</span>
                  </a>
                </div>
                <div className="pt-1 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = '/auth/logout';
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition"
                  >
                    <LogOut size={14} />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
