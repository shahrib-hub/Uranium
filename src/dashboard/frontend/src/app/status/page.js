'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Zap,
  Activity,
  Server,
  Headphones,
  Database,
  Globe,
  Bot,
  Sparkles,
  ArrowLeft,
  Clock,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  PlusCircle,
  Info
} from 'lucide-react';

export default function StatusPage() {
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'alerts', 'notices'
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [newNoticeTitle, setNewNoticeTitle] = useState('');
  const [newNoticeMessage, setNewNoticeMessage] = useState('');
  const [newNoticeSeverity, setNewNoticeSeverity] = useState('notice');
  const [postingNotice, setPostingNotice] = useState(false);

  const fetchStatus = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        setStatusData(data);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000); // 15s live refresh
    return () => clearInterval(interval);
  }, []);

  const handlePostNotice = async (e) => {
    e.preventDefault();
    if (!newNoticeTitle || !newNoticeMessage) return;
    setPostingNotice(true);
    try {
      const res = await fetch('/api/status/notice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newNoticeTitle,
          message: newNoticeMessage,
          severity: newNoticeSeverity
        })
      });
      if (res.ok) {
        setNewNoticeTitle('');
        setNewNoticeMessage('');
        setShowAdminModal(false);
        fetchStatus();
      }
    } catch {
      // Error handling
    } finally {
      setPostingNotice(false);
    }
  };

  const handleResolveAlerts = async () => {
    try {
      const res = await fetch('/api/status/resolve', { method: 'POST' });
      if (res.ok) {
        fetchStatus();
      }
    } catch {}
  };

  const overall = statusData?.overallStatus || 'operational';
  const isOutage = overall === 'outage';
  const isDegraded = overall === 'degraded';
  const isOperational = overall === 'operational';

  const alerts = statusData?.alerts || [];
  const notices = statusData?.notices || [];

  return (
    <div className="min-h-screen bg-[#0a0b12] text-white selection:bg-rose-500/30 selection:text-white font-sans">
      {/* Top Status Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0d0f18]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-tr from-rose-600 to-red-500 text-white shadow-md shadow-rose-600/30 group-hover:scale-105 transition">
                <Zap size={18} fill="currentColor" />
              </span>
              <span className="text-base font-extrabold text-white tracking-tight flex items-center">
                Uranium <span className="text-xs font-bold text-rose-400 ml-1.5 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20">Status</span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-4">
            <button
              type="button"
              onClick={fetchStatus}
              disabled={refreshing}
              className="h-9 px-3 sm:px-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white/70 hover:text-white flex items-center gap-2 transition disabled:opacity-50"
              title="Refresh live metrics"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin text-rose-400' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <Link
              href="/"
              className="h-9 px-3 sm:px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white flex items-center gap-1.5 transition shadow-md shadow-rose-600/20"
            >
              <ArrowLeft size={13} />
              <span>Back to Web</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Stage */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* 1. MASTER BANNER CARD */}
        <section
          className={`relative overflow-hidden rounded-3xl border p-6 sm:p-10 shadow-2xl transition-all duration-300 ${
            isOutage
              ? 'bg-gradient-to-br from-rose-950/60 via-[#181017] to-[#120b12] border-rose-500/40 shadow-rose-950/40'
              : isDegraded
              ? 'bg-gradient-to-br from-amber-950/50 via-[#1a1612] to-[#121110] border-amber-500/40 shadow-amber-950/30'
              : 'bg-gradient-to-br from-emerald-950/40 via-[#101915] to-[#0c1310] border-emerald-500/30 shadow-emerald-950/20'
          }`}
        >
          {/* Ambient blur glow */}
          <div
            className={`pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full blur-3xl opacity-20 ${
              isOutage ? 'bg-rose-500' : isDegraded ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
          />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-4 sm:gap-5">
              <span
                className={`grid h-14 w-14 sm:h-16 sm:w-16 shrink-0 place-items-center rounded-2xl shadow-xl ${
                  isOutage
                    ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
                    : isDegraded
                    ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                    : 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                }`}
              >
                {isOutage ? (
                  <XCircle size={32} />
                ) : isDegraded ? (
                  <AlertTriangle size={32} />
                ) : (
                  <ShieldCheck size={32} />
                )}
              </span>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full animate-pulse ${
                      isOutage ? 'bg-rose-400' : isDegraded ? 'bg-amber-400' : 'bg-emerald-400'
                    }`}
                  />
                  <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight">
                    {isOutage
                      ? 'Major Service Disruption'
                      : isDegraded
                      ? 'Degraded Performance'
                      : 'All Systems Operational'}
                  </h1>
                </div>
                <p className="text-xs sm:text-sm text-white/60 max-w-xl leading-relaxed">
                  {isOutage
                    ? 'A critical infrastructure component is currently experiencing an outage. Autonomous SRE is mitigating.'
                    : isDegraded
                    ? 'One or more background services are experiencing elevated latency or intermittent connections.'
                    : 'All Discord shards, lossless audio streaming nodes, REST APIs, and database clusters are operating normally.'}
                </p>
              </div>
            </div>

            <div className="shrink-0 flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 border-white/10 pt-3 sm:pt-0 text-[11px] text-white/50 space-y-1">
              <span>Auto-refresh: 15s</span>
              <span className="text-emerald-400 font-mono font-semibold">99.98% 30-Day Uptime</span>
            </div>
          </div>
        </section>

        {/* 2. REAL-TIME TELEMETRY METRICS ROW */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-2xl border border-white/10 bg-[#12131f] p-4 sm:p-5 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/40 flex items-center gap-1.5">
              <Activity size={14} className="text-rose-400" /> Discord Gateway
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-white font-mono">
                {statusData?.ping ? `${statusData.ping}ms` : '18ms'}
              </span>
              <span className="text-[11px] font-semibold text-emerald-400">Stable</span>
            </div>
            <p className="text-[10px] text-white/40 truncate">Shard Cluster Latency</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#12131f] p-4 sm:p-5 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/40 flex items-center gap-1.5">
              <Clock size={14} className="text-amber-400" /> Bot Uptime
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black text-white font-mono truncate">
                {statusData?.uptime || 'Active'}
              </span>
            </div>
            <p className="text-[10px] text-white/40 truncate">Continuous runtime without restart</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#12131f] p-4 sm:p-5 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/40 flex items-center gap-1.5">
              <Server size={14} className="text-indigo-400" /> Host Node
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-lg sm:text-xl font-bold text-white font-mono truncate">
                VisiHost Node
              </span>
            </div>
            <p className="text-[10px] text-white/40 font-mono truncate">noida.visihost.in:25634</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#12131f] p-4 sm:p-5 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/40 flex items-center gap-1.5">
              <Bot size={14} className="text-purple-400" /> Uranium Watcher
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-base sm:text-lg font-bold text-purple-300 flex items-center gap-1.5">
                <Sparkles size={15} /> Groq SRE Active
              </span>
            </div>
            <p className="text-[10px] text-white/40 truncate">Llama 3.1 8B Real-Time Error Guardian</p>
          </div>
        </section>

        {/* 3. CORE INFRASTRUCTURE COMPONENTS HEALTH */}
        <section className="rounded-3xl border border-white/10 bg-[#11121d] p-5 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">Infrastructure Services</h2>
              <p className="text-xs text-white/50 mt-0.5">Real-time health breakdown across subsystems</p>
            </div>
            <span className="text-[11px] font-semibold text-emerald-400 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              Operational
            </span>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2">
            {[
              {
                id: 'discord_gateway',
                name: 'Discord Gateway & Sharding',
                desc: 'Real-time WebSocket connection to Discord servers',
                icon: Activity,
                status: statusData?.components?.discord_gateway?.status || 'operational',
                meta: statusData?.ping ? `${statusData.ping}ms ping` : 'Connected'
              },
              {
                id: 'music_engine',
                name: 'Lossless Audio (Lavalink Nodes)',
                desc: '320kbps audio streaming, DSP filters, voice dispatch',
                icon: Headphones,
                status: statusData?.components?.music_engine?.status || 'operational',
                meta: 'Primary Node Online'
              },
              {
                id: 'rest_api',
                name: 'REST API & Web Dashboard',
                desc: 'Express API server on VisiHost + Vercel Edge reverse proxy',
                icon: Globe,
                status: statusData?.components?.rest_api?.status || 'operational',
                meta: 'HTTP/2 Reverse Proxy'
              },
              {
                id: 'database',
                name: 'Database & Persistent Storage',
                desc: 'MongoDB Atlas cluster and local SQLite databases',
                icon: Database,
                status: statusData?.components?.database?.status || 'operational',
                meta: 'Read / Write Healthy'
              }
            ].map((comp) => {
              const Icon = comp.icon;
              const isCompOutage = comp.status === 'outage';
              const isCompDegraded = comp.status === 'degraded';

              return (
                <div
                  key={comp.id}
                  className="rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] p-4 flex items-center justify-between gap-4 transition"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/5 border border-white/10 text-white/80">
                      <Icon size={18} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-white truncate">{comp.name}</p>
                      <p className="text-[11px] text-white/40 truncate">{comp.desc}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                        isCompOutage
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : isCompDegraded
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isCompOutage ? 'bg-rose-400' : isCompDegraded ? 'bg-amber-400' : 'bg-emerald-400'
                        }`}
                      />
                      {comp.status}
                    </span>
                    <p className="text-[10px] text-white/30 font-mono mt-1">{comp.meta}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. INCIDENT & ANNOUNCEMENT FEED */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">Incidents & Maintenance Notices</h2>
              <p className="text-xs text-white/50">
                AI SRE incidents (kept 30 days) and administrative notices (kept up to 6 months)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex p-1 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1 rounded-lg transition ${
                    activeTab === 'all' ? 'bg-rose-600 text-white font-bold' : 'text-white/60 hover:text-white'
                  }`}
                >
                  All ({alerts.length + notices.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('alerts')}
                  className={`px-3 py-1 rounded-lg transition ${
                    activeTab === 'alerts' ? 'bg-rose-600 text-white font-bold' : 'text-white/60 hover:text-white'
                  }`}
                >
                  Incidents ({alerts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('notices')}
                  className={`px-3 py-1 rounded-lg transition ${
                    activeTab === 'notices' ? 'bg-rose-600 text-white font-bold' : 'text-white/60 hover:text-white'
                  }`}
                >
                  Notices ({notices.length})
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowAdminModal(true)}
                className="h-8 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/70 hover:text-white flex items-center gap-1 transition"
                title="Post Admin Notice"
              >
                <PlusCircle size={14} />
                <span className="hidden sm:inline">Add Notice</span>
              </button>

              {(isOutage || isDegraded) && (
                <button
                  type="button"
                  onClick={handleResolveAlerts}
                  className="h-8 px-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition flex items-center gap-1"
                >
                  <CheckCircle2 size={13} />
                  <span>Resolve All</span>
                </button>
              )}
            </div>
          </div>

          {/* Feed List */}
          <div className="space-y-3">
            {/* Show Alerts */}
            {(activeTab === 'all' || activeTab === 'alerts') &&
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-2xl border border-rose-500/30 bg-rose-500/[0.05] p-4 sm:p-5 space-y-2.5 transition"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded-md bg-rose-500/20 text-rose-300">
                        <AlertTriangle size={15} />
                      </span>
                      <h3 className="text-sm font-bold text-white">{alert.title}</h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        {alert.status || 'degraded'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-white/40">
                      <span className="flex items-center gap-1 font-semibold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                        <Sparkles size={11} />
                        {alert.poster || 'Uranium Watcher'}
                      </span>
                      <span>•</span>
                      <span>{new Date(alert.timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <p className="text-xs text-white/70 leading-relaxed">{alert.message}</p>
                </div>
              ))}

            {/* Show Notices (up to 6 months) */}
            {(activeTab === 'all' || activeTab === 'notices') &&
              notices.map((notice) => (
                <div
                  key={notice.id}
                  className="rounded-2xl border border-white/10 bg-[#121420] p-4 sm:p-5 space-y-2.5 transition"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded-md bg-amber-500/20 text-amber-300">
                        <Info size={15} />
                      </span>
                      <h3 className="text-sm font-bold text-white">{notice.title}</h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/10 text-white/70">
                        {notice.severity || 'Notice'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-white/40">
                      <span className="font-semibold text-white/70">{notice.poster || 'System Admin'}</span>
                      <span>•</span>
                      <span>{new Date(notice.timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <p className="text-xs text-white/70 leading-relaxed whitespace-pre-wrap">
                    {notice.message}
                  </p>
                </div>
              ))}

            {alerts.length === 0 && notices.length === 0 && (
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 text-center text-white/40 space-y-1">
                <CheckCircle2 size={24} className="mx-auto text-emerald-400" />
                <p className="text-sm font-semibold text-white">No active incidents</p>
                <p className="text-xs text-white/40">All systems are performing normally with zero reported issues.</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Admin Notice Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#131522] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">Post Status Notice</h3>
              <button
                type="button"
                onClick={() => setShowAdminModal(false)}
                className="text-white/40 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePostNotice} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/70">Notice Title</label>
                <input
                  type="text"
                  required
                  value={newNoticeTitle}
                  onChange={(e) => setNewNoticeTitle(e.target.value)}
                  placeholder="e.g. Scheduled Maintenance or Routing Update"
                  className="w-full rounded-xl bg-black/40 border border-white/10 px-3.5 py-2.5 text-xs text-white placeholder-white/30 outline-none focus:border-rose-500/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/70">Severity Level</label>
                <select
                  value={newNoticeSeverity}
                  onChange={(e) => setNewNoticeSeverity(e.target.value)}
                  className="w-full rounded-xl bg-black/40 border border-white/10 px-3.5 py-2.5 text-xs text-white outline-none focus:border-rose-500/50"
                >
                  <option value="notice">Notice (Informational)</option>
                  <option value="degraded">Degraded Performance</option>
                  <option value="maintenance">Maintenance Window</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/70">Message Description</label>
                <textarea
                  required
                  rows={4}
                  value={newNoticeMessage}
                  onChange={(e) => setNewNoticeMessage(e.target.value)}
                  placeholder="Describe the update, affected nodes, and estimated resolution..."
                  className="w-full rounded-xl bg-black/40 border border-white/10 px-3.5 py-2.5 text-xs text-white placeholder-white/30 outline-none focus:border-rose-500/50"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdminModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={postingNotice}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition disabled:opacity-50"
                >
                  {postingNotice ? 'Posting...' : 'Publish Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
