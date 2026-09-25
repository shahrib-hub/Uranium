'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  Radio,
  Server,
  Hash,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  Trophy,
  FileText,
  Terminal,
  MessageSquare,
  HeartHandshake,
  Gift,
  Music2,
  Gamepad2,
  Coins,
  Sparkles,
  RefreshCw,
  ArrowRight,
  ExternalLink,
  Search,
  CheckCircle2,
  XCircle,
  Settings,
  Sliders,
  AlertTriangle,
  Lock,
  ChevronRight
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useStore } from '@/store';
import { toast } from 'sonner';

// Map icon names from backend registry to Lucide React components
const ICON_MAP = {
  UserPlus,
  Trophy,
  FileText,
  Terminal,
  MessageSquare,
  HeartHandshake,
  ShieldAlert,
  ShieldCheck,
  Users,
  Gift,
  Music2,
  Gamepad2,
  Coins,
  Sparkles,
  Settings
};

export default function DashboardPage() {
  const params = useSearchParams();
  const { player } = useStore();
  const guildId = player.guildId || params.get('guild');

  const [guild, setGuild] = useState(null);
  const [plugins, setPlugins] = useState([]);
  const [loadingPlugins, setLoadingPlugins] = useState(true);
  const [togglingPlugin, setTogglingPlugin] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [familyModalOpen, setFamilyModalOpen] = useState(false);

  const load = async () => {
    if (!guildId) return;
    try {
      const [guildRes, pluginsRes] = await Promise.all([
        fetch('/api/guild/' + guildId + '/info'),
        fetch('/api/guild/' + guildId + '/plugins')
      ]);

      if (guildRes.ok) setGuild(await guildRes.json());
      if (pluginsRes.ok) {
        const pData = await pluginsRes.json();
        setPlugins(pData.plugins || []);
      }
    } catch (err) {
      console.error('[Dashboard load error]:', err);
    } finally {
      setLoadingPlugins(false);
    }
  };

  useEffect(() => {
    load().catch(() => null);
  }, [guildId]);

  const refresh = async () => {
    setRefreshing(true);
    await load().catch(() => null);
    setRefreshing(false);
    toast.success('Server statistics and plugins refreshed.');
  };

  const handleTogglePlugin = async (pluginId, currentEnabled) => {
    if (togglingPlugin) return;
    setTogglingPlugin(pluginId);

    const nextState = !currentEnabled;

    // Optimistic UI update
    setPlugins((prev) =>
      prev.map((p) => (p.id === pluginId ? { ...p, enabled: nextState } : p))
    );

    try {
      const res = await fetch(`/api/guild/${guildId}/plugins/${pluginId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextState })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to toggle plugin');
      }

      if (nextState) {
        toast.success(`Enabled ${data.pluginId || pluginId} system. Commands are active!`);
      } else {
        toast.warning(
          `Disabled ${data.pluginId || pluginId} system. Its commands are now barred from execution in Discord.`
        );
      }
    } catch (err) {
      // Revert optimistic update
      setPlugins((prev) =>
        prev.map((p) => (p.id === pluginId ? { ...p, enabled: currentEnabled } : p))
      );
      toast.error(err.message || 'Error updating plugin state');
    } finally {
      setTogglingPlugin(null);
    }
  };

  // Filter plugins based on category and search
  const filteredPlugins = useMemo(() => {
    return plugins.filter((p) => {
      const matchesCategory =
        categoryFilter === 'all' ||
        p.category.toLowerCase().replace(/[^a-z]/g, '') ===
          categoryFilter.toLowerCase().replace(/[^a-z]/g, '');

      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.commands && p.commands.some((c) => c.toLowerCase().includes(q)));

      return matchesCategory && matchesSearch;
    });
  }, [plugins, categoryFilter, searchQuery]);

  const activePluginsCount = plugins.filter((p) => p.enabled).length;

  if (!guildId) {
    return (
      <div className="p-8 sm:p-12 flex min-h-[70vh] items-center justify-center">
        <div className="w-full max-w-md rounded-2xl border border-[#232534] bg-[#161722] p-8 text-center space-y-4 shadow-2xl">
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
    <div className="p-3.5 sm:p-8 md:p-10 max-w-7xl mx-auto space-y-8">
      {/* ── Top Header Section ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 sm:gap-6 border-b border-[#1f212d] pb-6">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <div className="h-px w-12 bg-red-500" />
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-[4px] text-red-500">
              Server Overview
            </span>
          </div>
          <h1 className="text-2xl sm:text-5xl lg:text-6xl font-black tracking-tighter uppercase italic text-white break-words">
            {guild?.name ? (
              <>
                {guild.name.split(' ').slice(0, -1).join(' ')}{' '}
                <span className="text-red-500">{guild.name.split(' ').slice(-1)[0]}</span>
              </>
            ) : (
              <>
                Server <span className="text-red-500">Command Center</span>
              </>
            )}
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-white/50 max-w-2xl leading-relaxed">
            Monitor real-time member presence, manage core bot systems, and selectively enable or bar command usage across your community.
          </p>
        </div>

        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          className="self-start sm:self-auto h-10 px-4 rounded-xl bg-[#161722] hover:bg-[#1f212e] border border-[#262838] text-xs font-bold text-white/80 hover:text-white flex items-center gap-2 transition disabled:opacity-50 active:scale-95 shadow-md"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin text-red-500' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ── PRIMARY SERVER STATS (Reduced bot stats, focused on server stats) ── */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Online Members */}
        <div className="rounded-2xl border border-[#232534] bg-[#14151e] p-5 space-y-2 relative overflow-hidden group hover:border-emerald-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">
              Currently Online
            </span>
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white tracking-tight">
              {guild?.onlineCount !== undefined ? guild.onlineCount.toLocaleString() : '—'}
            </span>
            <span className="text-xs text-emerald-400 font-semibold">Active now</span>
          </div>
          <p className="text-[11px] text-white/40">
            Members online, idle, or in Do Not Disturb
          </p>
        </div>

        {/* 2. Offline Members */}
        <div className="rounded-2xl border border-[#232534] bg-[#14151e] p-5 space-y-2 relative overflow-hidden group hover:border-[#383b4e] transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">
              Currently Offline
            </span>
            <span className="h-3 w-3 rounded-full bg-zinc-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white/80 tracking-tight">
              {guild?.offlineCount !== undefined ? guild.offlineCount.toLocaleString() : '—'}
            </span>
            <span className="text-xs text-zinc-400 font-medium">Inactive</span>
          </div>
          <p className="text-[11px] text-white/40">
            Registered members currently disconnected
          </p>
        </div>

        {/* 3. Total Members Breakdown */}
        <div className="rounded-2xl border border-[#232534] bg-[#14151e] p-5 space-y-2 relative overflow-hidden group hover:border-blue-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">
              Total Community
            </span>
            <Users size={16} className="text-blue-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white tracking-tight">
              {guild?.memberCount !== undefined ? guild.memberCount.toLocaleString() : '—'}
            </span>
            <span className="text-xs text-blue-400 font-semibold">Members</span>
          </div>
          <p className="text-[11px] text-white/40">
            {guild?.humanCount ?? 0} Humans · {guild?.botCount ?? 0} Bots
          </p>
        </div>

        {/* 4. Server Channels & Roles */}
        <div className="rounded-2xl border border-[#232534] bg-[#14151e] p-5 space-y-2 relative overflow-hidden group hover:border-rose-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">
              Channels & Roles
            </span>
            <Hash size={16} className="text-rose-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white tracking-tight">
              {guild?.channels?.total ?? '—'}
            </span>
            <span className="text-xs text-rose-400 font-semibold">Channels</span>
          </div>
          <p className="text-[11px] text-white/40">
            {guild?.channels?.text ?? 0} Text · {guild?.channels?.voice ?? 0} Voice · {guild?.roles ?? 0} Roles
          </p>
        </div>
      </div>

      {/* ── PLUGINS SYSTEM SECTION ────────────────────────────────────────── */}
      <div className="space-y-6 pt-2">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2.5">
                <Sliders size={20} className="text-rose-500" />
                <span>Plugin Command & Feature Systems</span>
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/10 text-white/80 border border-white/10">
                {activePluginsCount}/{plugins.length} Active
              </span>
            </div>
            <p className="text-xs text-white/50 mt-1 max-w-2xl leading-relaxed">
              Toggle any module below to grant or completely bar usage of its commands and events in this Discord server.
            </p>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-64">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search plugins or commands..."
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-[#262838] bg-[#101118] text-xs text-white placeholder:text-white/30 outline-none focus:border-rose-500/50 transition"
            />
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs">
          {[
            { id: 'all', label: 'All Modules' },
            { id: 'essentials', label: 'Essentials' },
            { id: 'servermanagement', label: 'Server Management' },
            { id: 'utilities', label: 'Utilities' },
            { id: 'socialengagement', label: 'Social & Engagement' }
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
                categoryFilter === cat.id
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'
                  : 'bg-[#161722] text-white/60 hover:text-white border border-[#232534] hover:bg-[#1d1f2c]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Plugin Cards Grid */}
        {loadingPlugins ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
            <p className="text-xs text-white/40">Loading server plugins...</p>
          </div>
        ) : filteredPlugins.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center space-y-3">
            <Sliders className="mx-auto text-white/20 h-10 w-10" />
            <h3 className="text-sm font-bold text-white">No matching plugins found</h3>
            <p className="text-xs text-white/40">Try adjusting your search query or category filter.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPlugins.map((plugin) => {
              const Icon = ICON_MAP[plugin.icon] || Sliders;
              const isEnabled = !!plugin.enabled;
              const isToggling = togglingPlugin === plugin.id;

              return (
                <div
                  key={plugin.id}
                  className={`rounded-2xl border p-5 flex flex-col justify-between space-y-4 transition duration-200 relative overflow-hidden ${
                    isEnabled
                      ? 'border-[#262838] bg-[#14151e] hover:border-[#383b4e] shadow-lg shadow-black/20'
                      : 'border-red-950/40 bg-[#111218]/90 opacity-80 hover:opacity-100'
                  }`}
                >
                  {/* Top Row: Icon + Category Badge + Toggle Switch */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-10 w-10 rounded-xl grid place-items-center transition ${
                          isEnabled
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-white/5 text-white/30 border border-white/5'
                        }`}
                      >
                        <Icon size={20} />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-white/40 block">
                          {plugin.category}
                        </span>
                        <h3 className="text-sm font-bold text-white tracking-wide">
                          {plugin.name}
                        </h3>
                      </div>
                    </div>

                    {/* Interactive Toggle Switch */}
                    <button
                      type="button"
                      disabled={isToggling}
                      onClick={() => handleTogglePlugin(plugin.id, isEnabled)}
                      title={isEnabled ? 'Click to disable module' : 'Click to enable module'}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isEnabled ? 'bg-emerald-500' : 'bg-zinc-700'
                      } ${isToggling ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          isEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-white/50 leading-relaxed min-h-[36px]">
                    {plugin.description}
                  </p>

                  {/* Commands / Barred Notice */}
                  {!isEnabled ? (
                    <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-300 flex items-center gap-2">
                      <AlertTriangle size={13} className="shrink-0 text-rose-400" />
                      <span className="font-semibold">Barred from usage in Discord</span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {plugin.commands?.slice(0, 3).map((cmd) => (
                        <span
                          key={cmd}
                          className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-white/5 text-white/60 border border-white/5"
                        >
                          /{cmd}
                        </span>
                      ))}
                      {plugin.commands?.length > 3 && (
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] text-white/40">
                          +{plugin.commands.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Bottom Action Footer */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <span
                      className={`text-[11px] font-bold flex items-center gap-1 ${
                        isEnabled ? 'text-emerald-400' : 'text-zinc-500'
                      }`}
                    >
                      {isEnabled ? (
                        <>
                          <CheckCircle2 size={12} />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <XCircle size={12} />
                          <span>Disabled</span>
                        </>
                      )}
                    </span>

                    {/* Configure or Settings Redirect */}
                    {plugin.hasDedicatedPage && plugin.href ? (
                      <Link
                        href={`${plugin.href}?guild=${guildId}`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-400 hover:text-rose-300 transition group"
                      >
                        <span>Configure</span>
                        <ChevronRight size={14} className="group-hover:translate-x-0.5 transition" />
                      </Link>
                    ) : plugin.id === 'family' ? (
                      <button
                        type="button"
                        onClick={() => setFamilyModalOpen(true)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-400 hover:text-rose-300 transition"
                      >
                        <Settings size={12} />
                        <span>Settings</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-white/30 font-medium">Built-in Slash Commands</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Family System Modal (Since it has no sidebar page, inline settings) ── */}
      {familyModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#232534] bg-[#161722] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <HeartHandshake className="text-rose-400" size={20} />
                <h3 className="text-base font-bold text-white">Family System Settings</h3>
              </div>
              <button
                type="button"
                onClick={() => setFamilyModalOpen(false)}
                className="text-white/40 hover:text-white text-xs font-bold"
              >
                ✕ Close
              </button>
            </div>
            <p className="text-xs text-white/60 leading-relaxed">
              The Family System lets members marry, adopt children, build family trees, and manage relationships using <code>/family</code> commands.
            </p>
            <div className="space-y-3 pt-2 text-xs text-white/70">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#101118] border border-white/5">
                <span>Slash Commands Available</span>
                <span className="font-mono text-emerald-400">/family (8 subcommands)</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#101118] border border-white/5">
                <span>Interactive Proposal Buttons</span>
                <span className="font-mono text-emerald-400">Enabled</span>
              </div>
            </div>
            <div className="pt-3">
              <button
                type="button"
                onClick={() => setFamilyModalOpen(false)}
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 font-bold text-xs text-white transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
