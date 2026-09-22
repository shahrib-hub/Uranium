'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  ShieldAlert,
  Music2,
  Users,
  Gift,
  Settings,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Plus,
  Crown,
  Sparkles,
  Database,
  ExternalLink,
  Check,
  Search,
  Server
} from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '@/store';

export default function Sidebar() {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const { guilds, setGuilds, sidebarOpen, setSidebarOpen } = useStore();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [serverSearch, setServerSearch] = useState('');
  const [essentialsOpen, setEssentialsOpen] = useState(true);
  const [premiumOpen, setPremiumOpen] = useState(true);

  const guildId = params.get('guild');

  useEffect(() => {
    if (guilds.length) return;
    fetch('/api/guilds')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setGuilds(data.filter((guild) => guild.isBotAdded));
      })
      .catch(() => null);
  }, [guilds.length, setGuilds]);

  const activeGuild = guilds.find((guild) => guild.id === guildId);
  const withGuild = (href) => (guildId ? `${href}?guild=${guildId}` : href);

  const chooseGuild = (id) => {
    setPickerOpen(false);
    setSidebarOpen(false);
    const targetPath = pathname.startsWith('/dashboard') ? pathname : '/dashboard';
    router.push(`${targetPath}?guild=${id}`);
  };

  const filteredGuilds = guilds.filter((g) =>
    g.name.toLowerCase().includes(serverSearch.toLowerCase())
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-14 bottom-0 left-0 z-40 flex w-64 flex-col border-r border-[#1e202c] bg-[#13141c] text-[#f3f4f6] transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top: MEE6-Style Server Switcher */}
        <div className="relative p-3 border-b border-[#1e202c]">
          <button
            type="button"
            onClick={() => setPickerOpen(!pickerOpen)}
            className="flex w-full items-center gap-2.5 rounded-xl border border-[#262838] bg-[#181923] hover:bg-[#1f212d] hover:border-[#35384d] p-2 text-left transition"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-rose-500/15 text-xs font-bold text-rose-300">
              {activeGuild?.icon ? (
                <img
                  className="h-full w-full object-cover"
                  alt=""
                  src={`https://cdn.discordapp.com/icons/${activeGuild.id}/${activeGuild.icon}.png`}
                />
              ) : (
                activeGuild?.name?.[0] || '?'
              )}
            </span>
            <span className="min-w-0 flex-1 truncate font-bold text-xs text-white">
              {activeGuild?.name || 'Choose Server'}
            </span>
            <ChevronDown
              size={15}
              className={`text-white/40 transition-transform duration-200 shrink-0 ${
                pickerOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Server Switcher Dropdown */}
          {pickerOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setPickerOpen(false)} />
              <div className="absolute inset-x-3 top-[calc(100%+4px)] z-50 rounded-xl border border-[#2a2c3d] bg-[#161722] p-2 shadow-2xl">
                {/* Search */}
                <div className="relative mb-2">
                  <Search size={13} className="absolute left-2.5 top-2.5 text-white/40" />
                  <input
                    type="text"
                    placeholder="Search servers..."
                    value={serverSearch}
                    onChange={(e) => setServerSearch(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-[#101118] border border-[#232534] text-xs text-white placeholder:text-white/40 outline-none focus:border-rose-500/50"
                  />
                </div>

                <div className="max-h-52 overflow-y-auto space-y-1">
                  {filteredGuilds.length > 0 ? (
                    filteredGuilds.map((guild) => {
                      const isSelected = guild.id === guildId;
                      return (
                        <button
                          key={guild.id}
                          type="button"
                          onClick={() => chooseGuild(guild.id)}
                          className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
                            isSelected
                              ? 'bg-rose-500/20 text-white font-bold'
                              : 'text-white/70 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <span className="grid h-6 w-6 shrink-0 place-items-center overflow-hidden rounded-md bg-white/10 text-[10px] font-bold">
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
                          <span className="min-w-0 flex-1 truncate">{guild.name}</span>
                          {isSelected && <Check size={13} className="text-rose-400 shrink-0" />}
                        </button>
                      );
                    })
                  ) : (
                    <p className="p-2 text-center text-xs text-white/40">No servers found</p>
                  )}
                </div>

                <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] px-1">
                  <Link
                    href="/servers"
                    onClick={() => {
                      setPickerOpen(false);
                      setSidebarOpen(false);
                    }}
                    className="text-rose-400 hover:text-rose-300 font-semibold"
                  >
                    View All Servers
                  </Link>
                  <a
                    href="https://discord.com/oauth2/authorize?client_id=932136827605905489&permissions=8&scope=bot%20applications.commands"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/40 hover:text-white flex items-center gap-1"
                  >
                    <Plus size={11} /> Add Bot
                  </a>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {/* Main Top Links */}
          <div className="space-y-0.5">
            <Link
              href={withGuild('/dashboard')}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                pathname === '/dashboard'
                  ? 'bg-[#222432] text-white'
                  : 'text-[#949ba4] hover:text-white hover:bg-[#1a1b24]'
              }`}
            >
              <LayoutDashboard size={16} className={pathname === '/dashboard' ? 'text-rose-400' : ''} />
              <span>Dashboard</span>
            </Link>

            <Link
              href={withGuild('/commands')}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                pathname === '/commands'
                  ? 'bg-[#222432] text-white'
                  : 'text-[#949ba4] hover:text-white hover:bg-[#1a1b24]'
              }`}
            >
              <BookOpen size={16} className={pathname === '/commands' ? 'text-rose-400' : ''} />
              <span>Commands</span>
            </Link>
          </div>

          {/* ESSENTIALS Group */}
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setEssentialsOpen(!essentialsOpen)}
              className="flex w-full items-center justify-between px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white/40 hover:text-white/70 transition"
            >
              <span>Essentials</span>
              <ChevronDown
                size={12}
                className={`transition-transform duration-150 ${
                  essentialsOpen ? 'rotate-0' : '-rotate-90'
                }`}
              />
            </button>

            {essentialsOpen && (
              <div className="space-y-0.5 pt-0.5">
                {[
                  { href: '/dashboard/moderation', label: 'Moderator & AutoMod', icon: ShieldAlert },
                  { href: '/dashboard/rr', label: 'Reaction Roles', icon: Users },
                  { href: '/dashboard/music', label: 'Music & Audio', icon: Music2 },
                  { href: '/dashboard/giveaways', label: 'Giveaways', icon: Gift },
                  { href: '/dashboard/settings', label: 'Bot Settings', icon: Settings }
                ].map(({ href, label, icon: Icon }) => {
                  const active = pathname === href;
                  return (
                    <Link
                      key={href}
                      href={withGuild(href)}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                        active
                          ? 'bg-[#222432] text-white'
                          : 'text-[#949ba4] hover:text-white hover:bg-[#1a1b24]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={16} className={active ? 'text-rose-400' : ''} />
                        <span>{label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* PREMIUM & ADVANCED Group */}
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setPremiumOpen(!premiumOpen)}
              className="flex w-full items-center justify-between px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-400/70 hover:text-amber-300 transition"
            >
              <span className="flex items-center gap-1.5">
                <Crown size={11} className="fill-amber-400 text-amber-400" />
                <span>Premium Perks</span>
              </span>
              <ChevronDown
                size={12}
                className={`transition-transform duration-150 ${
                  premiumOpen ? 'rotate-0' : '-rotate-90'
                }`}
              />
            </button>

            {premiumOpen && (
              <div className="space-y-0.5 pt-0.5">
                {[
                  {
                    href: withGuild('/commands') + '&search=ai',
                    label: 'AI Characters & Chat',
                    icon: Sparkles
                  },
                  {
                    href: withGuild('/commands') + '&search=ytverify',
                    label: 'YouTube Verification',
                    icon: Check
                  },
                  {
                    href: withGuild('/commands') + '&search=backup',
                    label: 'Server Backups',
                    icon: Database
                  },
                  {
                    href: 'https://discord.gg/26ThFyckFX',
                    label: 'Upgrade / Buy Code',
                    icon: Crown,
                    external: true
                  }
                ].map(({ href, label, icon: Icon, external }) => {
                  return (
                    <a
                      key={label}
                      href={href}
                      target={external ? '_blank' : undefined}
                      rel={external ? 'noopener noreferrer' : undefined}
                      onClick={() => setSidebarOpen(false)}
                      className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-[#949ba4] hover:text-white hover:bg-[#1a1b24] transition group"
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={16} className="text-amber-400/80 group-hover:text-amber-300" />
                        <span>{label}</span>
                      </div>
                      <Crown size={12} className="fill-amber-400 text-amber-400 shrink-0" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-[#1e202c] space-y-2">
          <a
            href="https://discord.gg/26ThFyckFX"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#181923] hover:bg-[#1e202d] border border-[#232534] text-xs font-semibold text-white/70 hover:text-white transition"
          >
            <span>Need Help? Support</span>
            <ExternalLink size={12} className="text-white/40" />
          </a>

          <div className="flex items-center justify-between px-2 text-[10px] text-white/30">
            <Link href="/tos" className="hover:text-white/60 transition">Terms</Link>
            <span>•</span>
            <Link href="/privacy" className="hover:text-white/60 transition">Privacy</Link>
            <span>•</span>
            <Link href="/docs" className="hover:text-white/60 transition">Docs</Link>
          </div>
        </div>
      </aside>
    </>
  );
}
