'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  Headphones,
  Music2,
  RefreshCw,
  Server,
  Users,
  ShieldAlert,
  Gift,
  ArrowRight,
  Sparkles,
  Sliders,
  Crown
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useStore } from '@/store';

export default function DashboardPage() {
  const params = useSearchParams();
  const { player } = useStore();
  const guildId = player.guildId || params.get('guild');
  const [guild, setGuild] = useState(null);
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const load = async () => {
    if (!guildId) return;
    const [guildResponse, statsResponse] = await Promise.all([
      fetch('/api/guild/' + guildId + '/info'),
      fetch('/api/bot/stats')
    ]);
    if (guildResponse.ok) setGuild(await guildResponse.json());
    if (statsResponse.ok) setStats(await statsResponse.json());
  };

  useEffect(() => {
    load().catch(() => null);
  }, [guildId]);

  const refresh = async () => {
    setRefreshing(true);
    await load().catch(() => null);
    setRefreshing(false);
  };

  if (!guildId) {
    return (
      <div className="p-8 sm:p-12 flex min-h-[70vh] items-center justify-center">
        <div className="w-full max-w-md rounded-2xl border border-[#232534] bg-[#161722] p-8 text-center space-y-4">
          <Server className="mx-auto text-rose-400 h-10 w-10" />
          <h1 className="text-xl font-bold text-white">Choose a server first</h1>
          <p className="text-xs text-white/50 leading-relaxed">
            Select a server from the server switcher in the sidebar to open its configuration center.
          </p>
          <Link
            href="/servers"
            className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-rose-500 hover:bg-rose-600 text-xs font-bold text-white uppercase tracking-wider transition"
          >
            <span>Browse Servers</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-10 max-w-7xl mx-auto space-y-8">
      {/* Page Title & Subtitle (MEE6 style) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {guild?.name || 'Server Overview'}
          </h1>
          <p className="text-xs sm:text-sm text-white/50">
            Configure bot modules, manage member roles, and monitor live server performance.
          </p>
        </div>

        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          className="self-start sm:self-auto h-9 px-3.5 rounded-xl bg-[#1a1b26] hover:bg-[#222433] border border-[#2a2c3d] text-xs font-semibold text-white/80 hover:text-white flex items-center gap-2 transition disabled:opacity-50"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Minimalist Tabs (MEE6 style with active underline indicator) */}
      <div className="flex items-center gap-6 border-b border-[#232534] text-xs font-bold">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'plugins', label: 'Enabled Modules' },
          { id: 'stats', label: 'Bot Diagnostics' }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 transition relative cursor-pointer ${
              activeTab === tab.id
                ? 'text-white font-black'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            <span>{tab.label}</span>
            {activeTab === tab.id && (
              <span className="absolute bottom-0 inset-x-0 h-0.5 bg-rose-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Metrics Row */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              icon={<Users size={18} className="text-rose-400" />}
              label="Total Members"
              value={guild?.memberCount ?? '—'}
              detail="Registered community members"
            />
            <Metric
              icon={<Server size={18} className="text-blue-400" />}
              label="Channels"
              value={guild?.channels?.total ?? '—'}
              detail={`${guild?.channels?.text ?? 0} text · ${guild?.channels?.voice ?? 0} voice`}
            />
            <Metric
              icon={<Music2 size={18} className="text-emerald-400" />}
              label="Audio Engine"
              value={player.active ? 'Streaming' : 'Idle'}
              detail={player.active ? (player.channelName || 'Voice channel') : 'Ready to play'}
            />
            <Metric
              icon={<Activity size={18} className="text-amber-400" />}
              label="Bot Ping"
              value={stats?.ping ? `${stats.ping}ms` : '—'}
              detail={stats?.uptime ? `Up ${stats.uptime}` : 'Online'}
            />
          </div>

          {/* 2-Column Section */}
          <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
            {/* Music Player Status Card */}
            <div className="rounded-2xl border border-[#232534] bg-[#161722] p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-rose-500/15 text-rose-300">
                    <Headphones size={16} />
                  </span>
                  <h2 className="text-sm font-bold text-white">Voice Audio Player</h2>
                </div>
                <Link
                  href={`/dashboard/music?guild=${guildId}`}
                  className="text-xs font-bold text-rose-400 hover:text-rose-300 transition"
                >
                  Open Controls →
                </Link>
              </div>

              <div className="rounded-xl border border-[#232534] bg-[#101118] p-4">
                {player.active ? (
                  <div className="space-y-3">
                    <p className="text-sm font-bold text-white truncate">
                      {player.current?.title || 'Playing track'}
                    </p>
                    <p className="text-xs text-white/50 truncate">
                      {player.current?.author || 'Unknown artist'} • {player.channelName || 'Voice channel'}
                    </p>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-rose-500"
                        style={{
                          width: player.current?.duration
                            ? Math.min(100, (player.position / player.current.duration) * 100) + '%'
                            : '0%'
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-white/50">
                    Nothing is currently streaming. Open the Music Studio to enqueue 320kbps audio.
                  </p>
                )}
              </div>
            </div>

            {/* Quick Bot System Details */}
            <div className="rounded-2xl border border-[#232534] bg-[#161722] p-6 space-y-4">
              <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/15 text-emerald-300">
                  <CheckCircle2 size={16} />
                </span>
                <h2 className="text-sm font-bold text-white">System Diagnostics</h2>
              </div>

              <div className="space-y-3 text-xs">
                <Row label="Connected Shard" value={stats?.shards ?? 'Shard #0'} />
                <Row label="Node Runtime" value={stats?.nodeVersion ?? 'Node.js'} />
                <Row label="RAM Consumption" value={stats?.memoryUsage ?? '—'} />
                <Row label="Total Servers" value={stats?.totalServers ?? '—'} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Plugins / Modules */}
      {activeTab === 'plugins' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: 'Moderator & AutoMod',
              desc: 'Anti-raid, anti-spam, link purges, and automatic strikes.',
              href: `/dashboard/moderation?guild=${guildId}`,
              icon: ShieldAlert
            },
            {
              title: 'Music & Audio Studio',
              desc: 'Lossless 320kbps audio with BassBoost and 8D filters.',
              href: `/dashboard/music?guild=${guildId}`,
              icon: Music2
            },
            {
              title: 'Reaction Roles',
              desc: 'Interactive role self-assignment buttons and dropdowns.',
              href: `/dashboard/rr?guild=${guildId}`,
              icon: Users
            },
            {
              title: 'Custom Giveaways',
              desc: 'Role-gated giveaways with real-time button counters.',
              href: `/dashboard/giveaways?guild=${guildId}`,
              icon: Gift
            },
            {
              title: 'Server Settings',
              desc: 'Custom command prefixes, log channels, and permissions.',
              href: `/dashboard/settings?guild=${guildId}`,
              icon: Sliders
            },
            {
              title: 'AI Characters & Backstory',
              desc: 'Intelligent AI assistant and custom server persona.',
              href: `/commands?guild=${guildId}&search=ai`,
              icon: Sparkles,
              isPremium: true
            }
          ].map((plugin) => {
            const Icon = plugin.icon;
            return (
              <Link
                key={plugin.title}
                href={plugin.href}
                className="group rounded-2xl border border-[#232534] hover:border-[#373a4e] bg-[#161722] p-5 flex flex-col justify-between space-y-4 transition"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 text-rose-400 group-hover:bg-rose-500/10 transition">
                      <Icon size={18} />
                    </span>
                    {plugin.isPremium && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-[10px] font-bold text-amber-300">
                        <Crown size={11} className="fill-amber-400 text-amber-400" />
                        <span>Premium</span>
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-rose-300 transition">
                    {plugin.title}
                  </h3>
                  <p className="text-xs text-white/50 leading-relaxed">{plugin.desc}</p>
                </div>

                <span className="text-xs font-bold text-rose-400 group-hover:text-rose-300 flex items-center gap-1 pt-2 border-t border-white/5">
                  Configure <ArrowRight size={13} />
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Tab 3: Diagnostics */}
      {activeTab === 'stats' && (
        <div className="rounded-2xl border border-[#232534] bg-[#161722] p-6 space-y-4">
          <h2 className="text-sm font-bold text-white">Full Bot Diagnostics</h2>
          <div className="divide-y divide-white/5 text-xs">
            <Row label="Server Name" value={guild?.name || '—'} />
            <Row label="Server ID" value={guildId} />
            <Row label="Total Members" value={guild?.memberCount ?? '—'} />
            <Row label="Text Channels" value={guild?.channels?.text ?? 0} />
            <Row label="Voice Channels" value={guild?.channels?.voice ?? 0} />
            <Row label="Gateway Ping" value={stats?.ping ? `${stats.ping} ms` : '—'} />
            <Row label="Bot Uptime" value={stats?.uptime ?? '—'} />
            <Row label="Memory Usage" value={stats?.memoryUsage ?? '—'} />
          </div>
        </div>
      )}

      {/* MEE6 Minimalist Tip Banner at Bottom */}
      <div className="rounded-xl border border-[#232534] bg-[#161722] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-black uppercase text-white shrink-0">
            Tip
          </span>
          <p className="text-xs text-white/70">
            Need faster commands? You can control moderation filters, 320kbps lossless audio, and role assignment directly from Discord slash commands.
          </p>
        </div>
        <Link
          href={`/commands?guild=${guildId}`}
          className="h-8 px-3.5 rounded-lg bg-white text-black hover:bg-neutral-200 text-xs font-bold flex items-center gap-1.5 transition shrink-0"
        >
          <span>See all commands</span>
          <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}

function Metric({ icon, label, value, detail }) {
  return (
    <article className="rounded-2xl border border-[#232534] bg-[#161722] p-5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-white/50">{label}</span>
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/5">{icon}</span>
      </div>
      <div>
        <p className="text-2xl font-black text-white tracking-tight">{value}</p>
        <p className="text-xs text-white/40 truncate mt-0.5">{detail}</p>
      </div>
    </article>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-white/50">{label}</span>
      <span className="font-mono text-white font-medium">{value}</span>
    </div>
  );
}
