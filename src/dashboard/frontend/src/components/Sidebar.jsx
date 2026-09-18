'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight, Headphones, Home, Menu, Music2, Settings, Sparkles, Users, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '@/store';

const links = [
  { href: '/dashboard', label: 'Overview', icon: Home },
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
    router.push('/dashboard?guild=' + id);
  };

  return (
    <>
      <button className="fixed left-4 top-4 z-[70] grid h-11 w-11 place-items-center rounded-2xl border border-white/15 bg-black/35 text-white backdrop-blur-xl lg:hidden" onClick={() => setOpen(!open)} aria-label="Open navigation">{open ? <X size={20} /> : <Menu size={20} />}</button>
      {open && <button className="fixed inset-0 z-[50] bg-black/55 lg:hidden" aria-label="Close navigation" onClick={() => setOpen(false)} />}
      <aside className={"fixed inset-y-0 left-0 z-[60] flex w-[17.5rem] flex-col border-r border-white/10 bg-[color:var(--canvas-deep)]/75 px-4 py-5 backdrop-blur-2xl transition-transform duration-300 lg:translate-x-0 " + (open ? 'translate-x-0' : '-translate-x-full')}>
        <Link href="/" className="flex items-center gap-3 px-3 py-2">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-[#ff294f] to-[#ff8499] text-white shadow-[0_10px_26px_rgba(255,45,79,.3)]"><Sparkles size={18} /></span>
          <span><strong className="block text-base">Uranium</strong><small className="text-xs text-[var(--muted)]">Discord dashboard</small></span>
        </Link>

        <div className="relative mt-8">
          <button onClick={() => setPickerOpen(!pickerOpen)} className="glass flex w-full items-center gap-3 rounded-2xl p-3 text-left">
            <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-rose-400/15 text-sm font-semibold text-rose-100">{activeGuild?.icon ? <img className="h-full w-full object-cover" alt="" src={'https://cdn.discordapp.com/icons/' + activeGuild.id + '/' + activeGuild.icon + '.png'} /> : (activeGuild?.name?.[0] || <Headphones size={16} />)}</span>
            <span className="min-w-0 flex-1"><small className="block text-[10px] font-semibold uppercase tracking-[.12em] text-[var(--quiet)]">Selected server</small><strong className="block truncate text-sm">{activeGuild?.name || 'Choose a server'}</strong></span>
            <ChevronDown size={16} className="text-[var(--muted)]" />
          </button>
          {pickerOpen && <div className="glass absolute inset-x-0 top-[calc(100%+.5rem)] max-h-64 overflow-auto rounded-2xl p-2">
            {guilds.length ? guilds.map((guild) => <button key={guild.id} onClick={() => chooseGuild(guild.id)} className={"flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-white/10 " + (guild.id === guildId ? 'bg-rose-400/15 text-rose-100' : 'text-[var(--muted)]')}>
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 text-xs">{guild.name[0]}</span><span className="truncate">{guild.name}</span>
            </button>) : <p className="p-3 text-sm text-[var(--muted)]">No servers are available yet.</p>}
            <Link onClick={() => setOpen(false)} href="/servers" className="mt-1 flex items-center justify-center rounded-xl py-2 text-sm text-rose-200 hover:bg-rose-400/10">View all servers</Link>
          </div>}
        </div>

        <nav className="mt-7 space-y-1">
          {links.map(({ href, label, icon: Icon }) => {
            const selected = pathname === href;
            return <Link key={href} href={withGuild(href)} onClick={() => setOpen(false)} className={"group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition " + (selected ? 'bg-rose-400/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.1)]' : 'text-[var(--muted)] hover:bg-white/[.06] hover:text-white')}>
              <Icon size={18} className={selected ? 'text-rose-200' : 'group-hover:text-rose-200'} /><span>{label}</span>{selected && <ChevronRight size={15} className="ml-auto text-rose-200" />}
            </Link>;
          })}
        </nav>

        <div className="mt-auto rounded-2xl border border-white/10 bg-white/[.035] p-4">
          <p className="text-sm font-semibold">Need another server?</p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Open your server list to choose one or invite Uranium somewhere new.</p>
          <Link href="/servers" className="lucent-button mt-4 h-10 w-full rounded-xl text-sm">Manage servers</Link>
        </div>
      </aside>
    </>
  );
}
