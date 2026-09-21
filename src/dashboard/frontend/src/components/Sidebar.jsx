'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight, Home, Menu, Music2, Settings, ShieldAlert, Sparkles, Users, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '@/store';

const links = [
  { href: '/dashboard', label: 'Overview', icon: Home },
  { href: '/dashboard/moderation', label: 'Moderation', icon: ShieldAlert },
  { href: '/dashboard/music', label: 'Music', icon: Music2 },
  { href: '/dashboard/rr', label: 'Reaction roles', icon: Users },
  { href: '/dashboard/settings', label: 'Bot settings', icon: Settings },
  { href: '/commands', label: 'Commands', icon: BookOpen }
];

export default function Sidebar() {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const { guilds, setGuilds } = useStore();
  const [open, setOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const guildId = params.get('guild');

  useEffect(() => {
    if (guilds.length) return;
    fetch('/api/guilds').then((r) => r.ok ? r.json() : []).then((data) => {
      if (Array.isArray(data)) setGuilds(data.filter((guild) => guild.isBotAdded));
    }).catch(() => null);
  }, [guilds.length, setGuilds]);

  const activeGuild = guilds.find((guild) => guild.id === guildId);
  const withGuild = (href) => guildId ? href + '?guild=' + guildId : href;
  const chooseGuild = (id) => {
    setPickerOpen(false);
    setOpen(false);
    const targetPath = pathname.startsWith('/dashboard') ? pathname : '/dashboard';
    router.push(targetPath + '?guild=' + id);
  };

  return (
    <>
      <button
        className="fixed left-3.5 top-3.5 z-[70] grid h-11 w-11 place-items-center rounded-2xl border border-white/15 bg-black/60 text-white backdrop-blur-xl transition hover:bg-black/80 lg:hidden shadow-lg"
        onClick={() => setOpen(!open)}
        aria-label="Open navigation"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && (
        <button
          className="fixed inset-0 z-[50] bg-black/70 backdrop-blur-sm lg:hidden transition-opacity"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}

      <aside className={"fixed inset-y-0 left-0 z-[60] flex w-[17.5rem] flex-col border-r border-white/10 bg-[#090507]/95 px-4 py-5 backdrop-blur-2xl transition-transform duration-300 lg:translate-x-0 " + (open ? 'translate-x-0' : '-translate-x-full')}>
        <Link href="/" className="flex items-center gap-3 px-3 py-2">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#ff294f] to-[#ff8499] text-white shadow-[0_10px_26px_rgba(255,45,79,.3)]">
            <Sparkles size={18} />
          </span>
          <span className="min-w-0">
            <strong className="block text-base tracking-tight text-white">Uranium</strong>
            <small className="text-xs text-[var(--muted)]">Discord dashboard</small>
          </span>
        </Link>

        {/* Server Selector */}
        <div className="relative mt-7">
          <button
            onClick={() => setPickerOpen(!pickerOpen)}
            className="glass relative z-10 flex w-full items-center gap-3 rounded-2xl p-3 text-left transition hover:border-rose-400/30"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-rose-400/15 text-sm font-semibold text-rose-100 ring-1 ring-white/10">
              {activeGuild?.icon ? (
                <img
                  className="h-full w-full object-cover"
                  alt=""
                  src={`https://cdn.discordapp.com/icons/${activeGuild.id}/${activeGuild.icon}.png`}
                />
              ) : (
                activeGuild?.name?.[0] || <Sparkles size={16} />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <small className="block text-[10px] font-bold uppercase tracking-[.12em] text-[var(--quiet)]">Selected server</small>
              <strong className="block truncate text-sm font-semibold text-white">{activeGuild?.name || 'Choose a server'}</strong>
            </span>
            <ChevronDown size={16} className={`text-[var(--muted)] transition-transform duration-200 ${pickerOpen ? 'rotate-180' : ''}`} />
          </button>

          {pickerOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setPickerOpen(false)} />
              <div className="absolute inset-x-0 top-[calc(100%+.5rem)] z-50 max-h-72 overflow-y-auto rounded-2xl border border-white/15 bg-[#12080f] p-2 shadow-2xl backdrop-blur-3xl ring-1 ring-black/40">
                <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--quiet)]">Available Servers ({guilds.length})</p>
                {guilds.length ? (
                  <div className="space-y-1 mt-1">
                    {guilds.map((guild) => {
                      const isSelected = guild.id === guildId;
                      return (
                        <button
                          key={guild.id}
                          onClick={() => chooseGuild(guild.id)}
                          className={"flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm transition " + (isSelected ? 'bg-rose-500/20 text-rose-100 ring-1 ring-rose-400/30' : 'text-[var(--muted)] hover:bg-white/[.08] hover:text-white')}
                        >
                          <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/10 text-xs font-semibold ring-1 ring-white/10">
                            {guild.icon ? (
                              <img
                                className="h-full w-full object-cover"
                                alt=""
                                src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                              />
                            ) : (
                              guild.name?.[0] || '?'
                            )}
                          </span>
                          <span className="min-w-0 flex-1 truncate font-medium">{guild.name}</span>
                          {isSelected && <span className="h-2 w-2 rounded-full bg-rose-400 shrink-0 shadow-[0_0_8px_#ff4f71]" />}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="p-3 text-sm text-[var(--muted)]">No servers are available yet.</p>
                )}
                <div className="mt-2 border-t border-white/10 pt-2">
                  <Link
                    onClick={() => { setPickerOpen(false); setOpen(false); }}
                    href="/servers"
                    className="flex items-center justify-center rounded-xl py-2 text-xs font-semibold text-rose-300 hover:bg-rose-400/10 transition"
                  >
                    View all servers →
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="mt-7 space-y-1.5 overflow-y-auto">
          {links.map(({ href, label, icon: Icon }) => {
            const selected = pathname === href;
            return (
              <Link
                key={href}
                href={withGuild(href)}
                onClick={() => setOpen(false)}
                className={"group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition " + (selected ? 'bg-rose-400/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.1)] ring-1 ring-rose-400/20' : 'text-[var(--muted)] hover:bg-white/[.06] hover:text-white')}
              >
                <Icon size={18} className={selected ? 'text-rose-300' : 'group-hover:text-rose-300 transition-colors'} />
                <span className="flex-1 truncate">{label}</span>
                {selected && <ChevronRight size={15} className="text-rose-300 shrink-0" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Card */}
        <div className="mt-auto rounded-2xl border border-white/10 bg-white/[.035] p-4">
          <p className="text-sm font-semibold text-white">Need another server?</p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Open your server list to choose one or invite Uranium somewhere new.</p>
          <Link href="/servers" className="lucent-button mt-3.5 h-9 w-full rounded-xl text-xs font-semibold">
            Manage servers
          </Link>
        </div>
      </aside>
    </>
  );
}

