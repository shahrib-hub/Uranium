'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Plus, RefreshCw, Search, ShieldCheck, Zap, Crown, UserRound, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store';

const CLIENT_ID = '932136827605905489';

export default function ServersPage() {
  const [guilds, setGuilds] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { user, resetPlayer } = useStore();

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

  useEffect(() => {
    loadGuilds();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return guilds.filter((g) => g.name.toLowerCase().includes(q));
  }, [guilds, search]);

  const openServer = (id) => {
    resetPlayer();
    router.push(`/dashboard?guild=${id}`);
  };

  return (
    <div className="min-h-screen bg-[#0e0f15] text-[#f3f4f6]">
      {/* Top Bar */}
      <header className="fixed inset-x-0 top-0 z-50 h-14 bg-[#111218] border-b border-[#1e202c] px-3 sm:px-8 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 sm:gap-2.5 group">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-tr from-rose-600 to-red-500 text-white shadow-md shadow-rose-600/20 group-hover:scale-105 transition">
            <Zap size={16} fill="currentColor" />
          </span>
          <span className="text-sm sm:text-base font-black text-white tracking-tight">
            Uranium
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/status"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-white/70 hover:text-white transition"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Status</span>
          </Link>

          <a
            href="https://discord.gg/26ThFyckFX"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-8 px-2 sm:px-3 rounded-lg bg-[#252014] hover:bg-[#322a19] border border-[#52411e] text-[11px] sm:text-xs font-bold text-amber-300 transition-all shadow-sm active:scale-95"
          >
            <Crown size={13} className="fill-amber-400 text-amber-400 shrink-0" />
            <span className="hidden xs:inline">
              <span className="hidden sm:inline">Upgrade to </span>Premium
            </span>
          </a>

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
        </div>
      </header>

      {/* Main Server Selection View */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-24 pb-16 space-y-8">
        {/* Header Section */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Select a Server
          </h1>
          <p className="text-sm text-white/60 leading-relaxed">
            Choose a Discord server below to configure Uranium's moderation, lossless music, giveaways, and automated reaction roles.
          </p>
        </div>

        {/* Minimalist Search & Refresh Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3 max-w-2xl mx-auto">
          <div className="relative flex-1 w-full">
            <Search size={16} className="absolute left-3.5 top-3.5 text-white/40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your servers by name..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#14151e] border border-[#222432] text-sm text-white placeholder:text-white/40 outline-none focus:border-rose-500/50 transition"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-3 text-xs text-white/40 hover:text-white transition"
              >
                Clear
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={loadGuilds}
            disabled={refreshing}
            className="w-full sm:w-auto h-10 px-4 rounded-xl bg-[#161722] hover:bg-[#1e202c] border border-[#232534] text-xs font-semibold text-white/80 hover:text-white flex items-center justify-center gap-2 transition disabled:opacity-50 shrink-0"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Server Cards Grid */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-52 rounded-2xl bg-[#14151e] border border-[#20222c] animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((guild) => (
              <ServerCard key={guild.id} guild={guild} onOpen={openServer} />
            ))}
          </div>
        ) : (
          <div className="max-w-md mx-auto rounded-2xl border border-[#222432] bg-[#14151e] p-10 text-center space-y-3">
            <Sparkles size={24} className="mx-auto text-rose-400" />
            <h3 className="text-base font-bold text-white">No servers found</h3>
            <p className="text-xs text-white/50">
              {search
                ? `No server matches "${search}". Try clearing your search query.`
                : 'No Discord servers where you have Manage Server permissions were detected.'}
            </p>
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-xs font-bold text-white transition"
              >
                Reset Search
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function ServerCard({ guild, onOpen }) {
  const icon = guild.icon
    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
    : null;
  const invite = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&permissions=8&scope=bot%20applications.commands&guild_id=${guild.id}`;

  return (
    <article className="group rounded-2xl border border-[#222432] hover:border-[#323547] bg-[#14151e] p-4 sm:p-5 flex flex-col justify-between space-y-4 sm:space-y-5 transition-all duration-200">
      <div className="space-y-3 sm:space-y-4">
        {/* Top: Icon + Status */}
        <div className="flex items-start justify-between gap-3">
          <span className="grid h-12 w-12 sm:h-14 sm:w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-rose-500/10 text-base sm:text-lg font-black text-rose-300 border border-white/5">
            {icon ? (
              <img src={icon} className="h-full w-full object-cover" alt="" />
            ) : (
              guild.name[0] || '?'
            )}
          </span>

          {guild.isBotAdded ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
              <Check size={12} />
              <span>Ready</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-white/40 text-xs font-medium">
              Not Added
            </span>
          )}
        </div>

        {/* Server Details */}
        <div>
          <h2 className="text-base font-bold text-white truncate group-hover:text-rose-300 transition">
            {guild.name}
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-white/50">
            <ShieldCheck size={13} className="text-rose-400 shrink-0" />
            <span>{guild.isAdmin ? 'Server Administrator' : 'Limited Access'}</span>
          </p>
        </div>
      </div>

      {/* Action Button */}
      <div>
        {guild.isBotAdded ? (
          <button
            type="button"
            onClick={() => onOpen(guild.id)}
            className="w-full h-10 rounded-xl bg-rose-500 hover:bg-rose-600 active:scale-95 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-sm shadow-rose-500/20"
          >
            <span>Go to Dashboard</span>
            <ArrowRight size={14} />
          </button>
        ) : (
          <a
            href={invite}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-10 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 active:scale-95 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition"
          >
            <Plus size={14} />
            <span>Set Up Uranium</span>
          </a>
        )}
      </div>
    </article>
  );
}
