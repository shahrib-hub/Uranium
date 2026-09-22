'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gift,
  Plus,
  RefreshCw,
  Search,
  Trophy,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Hash,
  Sparkles,
  RotateCcw,
  Square,
  Edit2,
  Trash2,
  ExternalLink,
  Flame,
  Shield
} from 'lucide-react';
import GiveawayCreateModal from '@/components/GiveawayCreateModal';
import GiveawayEditModal from '@/components/GiveawayEditModal';
import ConfirmModal from '@/components/ConfirmModal';
import Toast from '@/components/Toast';

export default function GiveawaysPage() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get('guild');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [giveaways, setGiveaways] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    ended: 0,
    totalParticipants: 0,
    totalWinnersAwarded: 0
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all', 'active', 'ended'
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGiveaway, setEditingGiveaway] = useState(null);

  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    confirmVariant: 'danger',
    onConfirm: () => {}
  });

  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchGiveaways = async (isManualRefresh = false) => {
    if (!guildId) return;
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch(`/api/guild/${guildId}/giveaways`);
      if (!res.ok) {
        throw new Error(`Failed to load giveaways (${res.status})`);
      }
      const data = await res.json();
      setGiveaways(data.giveaways || []);
      setStats(data.stats || { total: 0, active: 0, ended: 0, totalParticipants: 0, totalWinnersAwarded: 0 });
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to load giveaways', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchGiveaways();
  }, [guildId]);

  // Live countdown timer ticker (updates state every second so timers stay accurate)
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatRemainingTime = (endAt) => {
    const diff = endAt - Date.now();
    if (diff <= 0) return 'Ended';

    const sec = Math.floor(diff / 1000);
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;

    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  // Action Handlers
  const handleEndEarly = (giveaway) => {
    setConfirmState({
      isOpen: true,
      title: 'End Giveaway Early?',
      message: `Are you sure you want to end "${giveaway.prize}" right now? Winners will be selected and announced in #${giveaway.channelName} immediately.`,
      confirmText: 'End Now',
      confirmVariant: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/guild/${guildId}/giveaways/${giveaway.messageId}/end`, {
            method: 'POST'
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to end giveaway');
          showToast(`Giveaway ended! Announced ${data.winners?.length || 0} winner(s) on Discord.`, 'success');
          fetchGiveaways(true);
        } catch (err) {
          showToast(err.message, 'error');
        }
      }
    });
  };

  const handleReroll = (giveaway) => {
    setConfirmState({
      isOpen: true,
      title: 'Reroll Winners?',
      message: `Reroll new winner(s) for "${giveaway.prize}"? New winners will be picked from the ${giveaway.participantCount} entrants and announced in #${giveaway.channelName}.`,
      confirmText: 'Reroll',
      confirmVariant: 'primary',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/guild/${guildId}/giveaways/${giveaway.messageId}/reroll`, {
            method: 'POST'
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to reroll giveaway');
          showToast(`🎉 New winners announced in #${giveaway.channelName}!`, 'success');
          fetchGiveaways(true);
        } catch (err) {
          showToast(err.message, 'error');
        }
      }
    });
  };

  const handleDelete = (giveaway) => {
    setConfirmState({
      isOpen: true,
      title: 'Delete Giveaway?',
      message: `Permanently delete "${giveaway.prize}"? This deletes the database record and removes the Discord announcement.`,
      confirmText: 'Delete',
      confirmVariant: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/guild/${guildId}/giveaways/${giveaway.messageId}`, {
            method: 'DELETE'
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to delete giveaway');
          showToast('Giveaway deleted successfully.', 'success');
          fetchGiveaways(true);
        } catch (err) {
          showToast(err.message, 'error');
        }
      }
    });
  };

  const filteredGiveaways = giveaways.filter(g => {
    if (filterTab === 'active' && g.ended) return false;
    if (filterTab === 'ended' && !g.ended) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchPrize = g.prize?.toLowerCase().includes(q);
      const matchChannel = g.channelName?.toLowerCase().includes(q);
      const matchHost = g.creatorTag?.toLowerCase().includes(q);
      return matchPrize || matchChannel || matchHost;
    }
    return true;
  });

  if (!guildId) {
    return (
      <div className="lucent-page grid min-h-[70vh] place-items-center">
        <div className="lucent-card max-w-md rounded-[1.5rem] p-8 text-center space-y-4">
          <Gift className="mx-auto text-emerald-400" size={36} />
          <h1 className="text-xl font-semibold text-white">Select a Server</h1>
          <p className="text-sm text-[var(--muted)]">
            Choose a server from the sidebar to manage its Discord giveaways.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="lucent-page mx-auto max-w-7xl space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Hero Header */}
      <section className="lucent-card overflow-hidden rounded-[2rem] p-6 sm:p-8 relative">
        <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-emerald-400 ring-1 ring-emerald-500/30 shadow-lg shadow-emerald-500/10">
              <Gift size={32} />
            </span>
            <div>
              <span className="lucent-kicker mb-1 flex items-center gap-1.5 text-emerald-400">
                <Sparkles size={12} /> Interactive Giveaways
              </span>
              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Giveaways Command Center
              </h1>
              <p className="mt-1 text-sm text-[var(--muted)] max-w-xl">
                Launch, edit, and track live Discord giveaways with automated countdowns, random winner selection, and instant Discord synchronization.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchGiveaways(true)}
              disabled={refreshing}
              className="lucent-button h-11 rounded-xl px-4 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
              Sync
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="h-11 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-black text-xs font-black uppercase tracking-wider flex items-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-emerald-500/20"
            >
              <Plus size={16} />
              Launch Giveaway
            </button>
          </div>
        </div>
      </section>

      {/* Metric Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="lucent-card rounded-[1.4rem] p-5 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-bold tracking-wider text-[var(--muted)]">Active Giveaways</p>
            <p className="mt-2 text-3xl font-black text-emerald-400">{stats.active}</p>
            <p className="mt-1 text-[11px] text-[var(--quiet)]">Accepting live Discord entries</p>
          </div>
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Flame size={24} />
          </span>
        </article>

        <article className="lucent-card rounded-[1.4rem] p-5 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-bold tracking-wider text-[var(--muted)]">Total Entries</p>
            <p className="mt-2 text-3xl font-black text-white">{stats.totalParticipants}</p>
            <p className="mt-1 text-[11px] text-[var(--quiet)]">Discord member participations</p>
          </div>
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Users size={24} />
          </span>
        </article>

        <article className="lucent-card rounded-[1.4rem] p-5 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-bold tracking-wider text-[var(--muted)]">Winners Awarded</p>
            <p className="mt-2 text-3xl font-black text-amber-400">{stats.totalWinnersAwarded}</p>
            <p className="mt-1 text-[11px] text-[var(--quiet)]">Lucky members picked</p>
          </div>
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Trophy size={24} />
          </span>
        </article>

        <article className="lucent-card rounded-[1.4rem] p-5 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-bold tracking-wider text-[var(--muted)]">Completed</p>
            <p className="mt-2 text-3xl font-black text-white/80">{stats.ended}</p>
            <p className="mt-1 text-[11px] text-[var(--quiet)]">Past giveaway events</p>
          </div>
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/5 text-white/40 border border-white/10">
            <CheckCircle2 size={24} />
          </span>
        </article>
      </section>

      {/* Toolbar & Filter Tabs */}
      <section className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-black/40 border border-white/10 w-full sm:w-auto">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
              filterTab === 'all'
                ? 'bg-white/10 text-white shadow'
                : 'text-white/40 hover:text-white'
            }`}
          >
            All <span className="px-1.5 py-0.5 rounded-md bg-white/10 text-[10px]">{stats.total}</span>
          </button>
          <button
            onClick={() => setFilterTab('active')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
              filterTab === 'active'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-white/40 hover:text-emerald-300'
            }`}
          >
            Active <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-[10px] text-emerald-300">{stats.active}</span>
          </button>
          <button
            onClick={() => setFilterTab('ended')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
              filterTab === 'ended'
                ? 'bg-white/10 text-white shadow'
                : 'text-white/40 hover:text-white'
            }`}
          >
            Ended <span className="px-1.5 py-0.5 rounded-md bg-white/10 text-[10px]">{stats.ended}</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search prize, channel, host..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-medium text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
      </section>

      {/* Giveaways Grid */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-4">
          <RefreshCw className="animate-spin text-emerald-400" size={36} />
          <p className="text-xs uppercase font-bold tracking-widest text-[var(--muted)]">Synchronizing Discord Giveaways...</p>
        </div>
      ) : filteredGiveaways.length === 0 ? (
        <div className="lucent-card rounded-[2rem] p-12 text-center flex flex-col items-center justify-center space-y-4 min-h-[300px]">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Gift size={28} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">No Giveaways Found</h3>
            <p className="text-xs text-[var(--muted)] mt-1 max-w-sm">
              {searchQuery ? 'No giveaways match your active search filters.' : 'There are no giveaways in this category yet. Launch your first giveaway now!'}
            </p>
          </div>
          {!searchQuery && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-black text-xs font-bold uppercase tracking-wider hover:brightness-110 transition shadow-lg shadow-emerald-500/20"
            >
              + Launch Giveaway
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredGiveaways.map((giveaway) => {
            const isEnded = giveaway.ended;
            const remainingFormatted = formatRemainingTime(giveaway.endAt);
            const cfg = giveaway.config || {};
            const cardAccentColor = cfg.color || (isEnded ? '#4E5058' : '#57F287');

            return (
              <motion.div
                key={giveaway.messageId}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="lucent-card rounded-[1.8rem] overflow-hidden flex flex-col justify-between border border-white/10 hover:border-white/20 transition-all group relative"
                style={{ borderLeftColor: cardAccentColor, borderLeftWidth: 4 }}
              >
                {/* Optional Banner Header */}
                {cfg.image && (
                  <div className="w-full h-28 overflow-hidden relative border-b border-white/10">
                    <img
                      src={cfg.image}
                      alt="Giveaway banner"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#10080d] via-transparent to-transparent" />
                  </div>
                )}

                <div className="p-6 space-y-5 flex-1 flex flex-col justify-between">
                  {/* Card Top: Status & Channel */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isEnded ? (
                        <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                          <CheckCircle2 size={12} className="text-white/40" /> Ended
                        </span>
                      ) : (
                        <span
                          className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm"
                          style={{
                            backgroundColor: `${cardAccentColor}20`,
                            borderColor: `${cardAccentColor}40`,
                            color: cardAccentColor,
                            borderWidth: 1
                          }}
                        >
                          <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: cardAccentColor }} /> Live Giveaway
                        </span>
                      )}

                      {cfg.requiredRole && (
                        <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-white/60 font-semibold flex items-center gap-1">
                          <Shield size={10} className="text-emerald-400" /> Role Req
                        </span>
                      )}
                    </div>

                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 text-[11px] font-semibold text-white/70 shrink-0">
                      <Hash size={12} className="text-white/30" />
                      {giveaway.channelName}
                    </span>
                  </div>

                  {/* Prize Info & Optional Thumbnail */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      {cfg.title && cfg.title !== giveaway.prize && (
                        <p className="text-[11px] font-bold text-emerald-400/80 truncate">
                          {cfg.title}
                        </p>
                      )}
                      <h3 className="text-xl font-black text-white tracking-tight group-hover:text-emerald-300 transition-colors line-clamp-2">
                        {giveaway.prize}
                      </h3>
                      <p className="mt-1 text-xs text-[var(--muted)] flex items-center gap-1">
                        Hosted by <span className="text-white font-medium">@{giveaway.creatorTag}</span>
                      </p>
                    </div>

                    {cfg.thumbnail && (
                      <img
                        src={cfg.thumbnail}
                        alt="Thumbnail"
                        className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0 shadow"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                  </div>

                {/* Stat Counters & Time */}
                <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-black/30 border border-white/5">
                  <div className="text-center">
                    <div className="text-[9px] uppercase font-bold text-white/40">Entries</div>
                    <div className="text-sm font-black text-white mt-0.5 flex items-center justify-center gap-1">
                      <Users size={12} className="text-indigo-400" />
                      {giveaway.participantCount}
                    </div>
                  </div>
                  <div className="text-center border-x border-white/5">
                    <div className="text-[9px] uppercase font-bold text-white/40">Winners</div>
                    <div className="text-sm font-black text-white mt-0.5 flex items-center justify-center gap-1">
                      <Trophy size={12} className="text-amber-400" />
                      {giveaway.winners}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[9px] uppercase font-bold text-white/40">
                      {isEnded ? 'Status' : 'Remaining'}
                    </div>
                    <div className={`text-xs font-black mt-0.5 flex items-center justify-center gap-1 ${
                      isEnded ? 'text-white/40' : 'text-emerald-400'
                    }`}>
                      <Clock size={12} />
                      {remainingFormatted}
                    </div>
                  </div>
                </div>

                {/* Bottom Action Controls */}
                <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                  {!isEnded ? (
                    <>
                      <button
                        onClick={() => handleEndEarly(giveaway)}
                        className="flex-1 py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                        title="End giveaway right now and pick winners"
                      >
                        <Square size={13} fill="currentColor" />
                        End Early
                      </button>
                      <button
                        onClick={() => setEditingGiveaway(giveaway)}
                        className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 text-xs font-bold flex items-center gap-1.5 transition"
                        title="Edit prize or duration"
                      >
                        <Edit2 size={13} />
                        Edit
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleReroll(giveaway)}
                        className="flex-1 py-2 px-3 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                        title="Reroll new winners"
                      >
                        <RotateCcw size={13} />
                        Reroll Winners
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => handleDelete(giveaway)}
                    className="p-2 rounded-xl text-white/20 hover:text-red-400 hover:bg-red-500/10 transition"
                    title="Delete giveaway"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <GiveawayCreateModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          guildId={guildId}
          showToast={showToast}
          onSuccess={() => fetchGiveaways(true)}
        />
      )}

      {editingGiveaway && (
        <GiveawayEditModal
          isOpen={!!editingGiveaway}
          onClose={() => setEditingGiveaway(null)}
          guildId={guildId}
          giveaway={editingGiveaway}
          showToast={showToast}
          onSuccess={() => fetchGiveaways(true)}
        />
      )}

      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        confirmVariant={confirmState.confirmVariant}
      />
    </div>
  );
}
