'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, Plus, RefreshCw, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import LucentSwitch from '@/components/LucentSwitch';
import { useStore } from '@/store';

const CLIENT_ID = '932136827605905489';

export default function ServersPage() {
  const [guilds, setGuilds] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { resetPlayer } = useStore();

  const loadGuilds = async () => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/guilds');
      const data = await response.json();
      setGuilds(Array.isArray(data) ? data : []);
    } catch {
      setGuilds([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadGuilds(); }, []);
  const filtered = useMemo(() => guilds.filter((guild) => guild.name.toLowerCase().includes(search.toLowerCase())), [guilds, search]);
  const openServer = (id) => { resetPlayer(); router.push('/dashboard?guild=' + id); };

  return (
    <div className="lucent-page mx-auto max-w-7xl pt-28">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div><p className="lucent-kicker mb-4">Your servers</p><h1 className="lucent-title">Pick a place<br />to manage.</h1><p className="lucent-subtitle mt-5">Choose a Discord server where Uranium is already installed.</p></div>
        <LucentSwitch />
      </div>

      <div className="lucent-card mt-10 flex flex-col gap-3 rounded-[1.5rem] p-3 sm:flex-row sm:items-center">
        <label className="flex min-w-0 flex-1 items-center gap-3 px-3"><Search size={19} className="text-rose-200" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="lucent-input border-0 bg-transparent px-0 py-3 shadow-none focus:bg-transparent focus:shadow-none" placeholder="Search your servers" /></label>
        <button onClick={loadGuilds} disabled={refreshing} className="lucent-button h-11 rounded-xl px-4 text-sm font-semibold disabled:opacity-50"><RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />Refresh</button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading ? Array.from({ length: 6 }).map((_, index) => <div key={index} className="lucent-card h-64 animate-pulse rounded-[1.5rem]" />) : filtered.map((guild) => <ServerCard key={guild.id} guild={guild} onOpen={openServer} />)}
      </div>
      {!loading && !filtered.length && <div className="lucent-card mt-6 rounded-[1.5rem] p-12 text-center"><Sparkles className="mx-auto text-rose-200" /><h2 className="mt-5 text-lg font-semibold">No matching servers</h2><p className="mt-2 text-sm text-[var(--muted)]">Try a different name, or invite Uranium to a new server.</p></div>}
    </div>
  );
}

function ServerCard({ guild, onOpen }) {
  const icon = guild.icon ? 'https://cdn.discordapp.com/icons/' + guild.id + '/' + guild.icon + '.png' : null;
  const invite = 'https://discord.com/api/oauth2/authorize?client_id=' + CLIENT_ID + '&permissions=8&scope=bot%20applications.commands&guild_id=' + guild.id;
  return <article className={"lucent-card group rounded-[1.5rem] p-5 " + (guild.isBotAdded ? 'ambient-red-border' : '')}>
    <div className="flex items-start justify-between gap-3">
      <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-rose-400/15 text-xl font-semibold text-rose-100">{icon ? <img src={icon} className="h-full w-full object-cover" alt="" /> : guild.name[0]}</span>
      {guild.isBotAdded ? <span className="flex items-center gap-1 rounded-full bg-emerald-300/10 px-2.5 py-1 text-xs font-semibold text-emerald-200"><Check size={13} /> Ready</span> : <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-[var(--muted)]">Not added</span>}
    </div>
    <h2 className="mt-7 truncate text-xl font-semibold">{guild.name}</h2>
    <p className="mt-2 flex items-center gap-2 text-sm text-[var(--muted)]"><ShieldCheck size={15} className="text-rose-200" />{guild.isAdmin ? 'You can manage this server' : 'Limited access'}</p>
    {guild.isBotAdded ? <button onClick={() => onOpen(guild.id)} className="lucent-button lucent-button-primary mt-6 h-11 w-full rounded-xl text-sm font-semibold">Open dashboard <ArrowRight size={16} /></button> : <a href={invite} className="lucent-button mt-6 h-11 w-full rounded-xl text-sm font-semibold"><Plus size={16} /> Add Uranium</a>}
  </article>;
}
