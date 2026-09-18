'use client';

import { useEffect, useState } from 'react';
import { Activity, CalendarDays, CheckCircle2, Headphones, Music2, RefreshCw, Server, Users } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useStore } from '@/store';

export default function DashboardPage() {
  const params = useSearchParams();
  const { player } = useStore();
  const guildId = player.guildId || params.get('guild');
  const [guild, setGuild] = useState(null);
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!guildId) return;
    const [guildResponse, statsResponse] = await Promise.all([
      fetch('/api/guild/' + guildId + '/info'),
      fetch('/api/bot/stats')
    ]);
    if (guildResponse.ok) setGuild(await guildResponse.json());
    if (statsResponse.ok) setStats(await statsResponse.json());
  };

  useEffect(() => { load().catch(() => null); }, [guildId]);

  const refresh = async () => {
    setRefreshing(true);
    await load().catch(() => null);
    setRefreshing(false);
  };

  if (!guildId) return <div className="lucent-page grid min-h-[70vh] place-items-center"><div className="lucent-card max-w-md rounded-[1.5rem] p-8 text-center"><Server className="mx-auto text-rose-200" /><h1 className="mt-5 text-xl font-semibold">Choose a server first</h1><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Use the server picker in the sidebar to open its dashboard.</p></div></div>;

  return (
    <div className="lucent-page mx-auto max-w-7xl">
      <section className="lucent-card overflow-hidden rounded-[1.8rem] p-6 sm:p-8">
        <div className="flex flex-col gap-7 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-[1.25rem] bg-rose-400/15 text-2xl font-semibold text-rose-100">{guild?.icon ? <img className="h-full w-full object-cover" src={guild.icon} alt="" /> : (guild?.name?.[0] || <Server />)}</span>
            <div className="min-w-0"><p className="lucent-kicker mb-2">Server overview</p><h1 className="truncate text-3xl font-semibold tracking-tight sm:text-4xl">{guild?.name || 'Loading your server'}</h1><p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--muted)]"><span className="flex items-center gap-1.5"><Users size={15} />{guild?.memberCount ?? '—'} members</span><span className="flex items-center gap-1.5"><CalendarDays size={15} />Created {guild?.createdAt ? new Date(guild.createdAt).toLocaleDateString() : '—'}</span></p></div>
          </div>
          <button onClick={refresh} disabled={refreshing} className="lucent-button h-11 rounded-xl px-4 text-sm font-semibold disabled:opacity-50"><RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />Refresh</button>
        </div>
      </section>

      <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<Users />} label="Members" value={guild?.memberCount ?? '—'} detail="People in this server" />
        <Metric icon={<Server />} label="Channels" value={guild?.channels?.total ?? '—'} detail={(guild?.channels?.text ?? 0) + ' text · ' + (guild?.channels?.voice ?? 0) + ' voice'} />
        <Metric icon={<Music2 />} label="Music" value={player.active ? 'Playing' : 'Idle'} detail={player.active ? (player.channelName || 'In a voice channel') : 'Nothing playing right now'} />
        <Metric icon={<Activity />} label="Bot response" value={stats?.ping ?? '—'} detail={stats?.uptime ? 'Up for ' + stats.uptime : 'Checking status'} />
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <div className="lucent-card rounded-[1.6rem] p-6">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-400/15 text-rose-100"><Headphones size={19} /></span><div><h2 className="font-semibold">Music right now</h2><p className="text-sm text-[var(--muted)]">A quick look at the current player.</p></div></div>
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/10 p-5">
            {player.active ? <><p className="text-lg font-semibold">{player.current?.title || 'Playing audio'}</p><p className="mt-1 text-sm text-[var(--muted)]">{player.current?.author || 'Unknown artist'} · {player.channelName || 'Voice channel'}</p><div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-300" style={{ width: player.current?.duration ? Math.min(100, (player.position / player.current.duration) * 100) + '%' : '0%' }} /></div></> : <p className="text-sm text-[var(--muted)]">Nothing is playing. Open Music when you are ready to start.</p>}
          </div>
        </div>
        <div className="lucent-card rounded-[1.6rem] p-6"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-300/10 text-emerald-200"><CheckCircle2 size={19} /></span><div><h2 className="font-semibold">Bot status</h2><p className="text-sm text-[var(--muted)]">Current details for this bot instance.</p></div></div><dl className="mt-6 space-y-4 text-sm"><Row label="Servers" value={stats?.totalServers ?? '—'} /><Row label="Memory in use" value={stats?.memoryUsage ?? '—'} /><Row label="Node version" value={stats?.nodeVersion ?? '—'} /><Row label="Shards" value={stats?.shards ?? '—'} /></dl></div>
      </section>
    </div>
  );
}

function Metric({ icon, label, value, detail }) { return <article className="lucent-card rounded-[1.35rem] p-5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-rose-400/15 text-rose-100">{icon}</span><p className="mt-5 text-sm text-[var(--muted)]">{label}</p><p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p><p className="mt-1 truncate text-xs text-[var(--quiet)]">{detail}</p></article>; }
function Row({ label, value }) { return <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3 last:border-0 last:pb-0"><dt className="text-[var(--muted)]">{label}</dt><dd className="font-medium">{value}</dd></div>; }
