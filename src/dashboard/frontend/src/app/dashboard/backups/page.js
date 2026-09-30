'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Database,
  RefreshCw,
  Plus,
  RotateCcw,
  Trash2,
  Lock,
  Crown,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Shield,
  Hash,
  Users
} from 'lucide-react';
import { toast } from 'sonner';

export default function BackupsDashboardPage() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get('guild');

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    isPremium: false,
    limits: { maxSlots: 1, cooldownMs: 604800000, cooldownDays: 7 },
    lastCreatedAt: 0,
    cooldownRemainingMs: 0,
    canCreate: false,
    backups: []
  });

  const [creating, setCreating] = useState(false);
  const [restoringSlot, setRestoringSlot] = useState(null);
  const [backupName, setBackupName] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(1);
  const [confirmRestoreSlot, setConfirmRestoreSlot] = useState(null);

  const fetchBackups = async () => {
    if (!guildId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/guild/${guildId}/backups`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      toast.error('Failed to load server backups: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, [guildId]);

  const handleCreateBackup = async (slot) => {
    if (!guildId) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/guild/${guildId}/backups/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot: slot || selectedSlot,
          name: backupName || `Backup Slot ${slot || selectedSlot}`
        })
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || 'Failed to create backup');
      toast.success(resJson.message || 'Backup snapshot created successfully!');
      setBackupName('');
      await fetchBackups();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (slot) => {
    setRestoringSlot(slot);
    setConfirmRestoreSlot(null);
    try {
      const res = await fetch(`/api/guild/${guildId}/backups/restore/${slot}`, {
        method: 'POST'
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || 'Restoration failed');
      toast.success(resJson.message || `Backup #${slot} restored!`);
      await fetchBackups();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRestoringSlot(null);
    }
  };

  const handleDelete = async (slot) => {
    if (!confirm(`Are you sure you want to delete Backup Slot #${slot}?`)) return;
    try {
      const res = await fetch(`/api/guild/${guildId}/backups/${slot}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete backup');
      toast.success(`Backup #${slot} deleted.`);
      await fetchBackups();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const formatRemainingTime = (ms) => {
    if (ms <= 0) return 'Ready';
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h cooldown`;
    const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m cooldown`;
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
          <span className="text-xs text-white/40">Loading server snapshots...</span>
        </div>
      </div>
    );
  }

  const slots = [1, 2, 3];

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1f212d] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-emerald-400">Server Defense & Recovery</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white flex items-center gap-3">
            <Database className="text-rose-500" size={32} />
            Server Backups & Clones
          </h1>
          <p className="text-xs sm:text-sm text-white/50 mt-1">
            Capture exact snapshots of your server channels, permissions, and roles with seamless 1-click restore.
          </p>
        </div>

        <button
          onClick={fetchBackups}
          className="self-start sm:self-auto h-9 px-3.5 rounded-xl bg-[#181923] hover:bg-[#202230] border border-[#262838] text-xs font-semibold text-white/80 hover:text-white flex items-center gap-2 transition"
        >
          <RefreshCw size={13} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Tier Status Banner */}
      <div className={`rounded-2xl border p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
        data.isPremium
          ? 'border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-[#181923] to-[#14151e]'
          : 'border-[#232534] bg-[#161722]'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`h-11 w-11 rounded-xl grid place-items-center shrink-0 ${
            data.isPremium ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-white/50'
          }`}>
            {data.isPremium ? <Crown size={22} className="fill-amber-400" /> : <Database size={22} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">
                {data.isPremium ? 'Premium Tier Active' : 'Free Backup Tier'}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase ${
                data.isPremium
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-white/10 text-white/60'
              }`}>
                {data.isPremium ? '3 Slots • 24h Cooldown' : '1 Slot • 7-Day Cooldown'}
              </span>
            </div>
            <p className="text-xs text-white/50 mt-0.5">
              {data.isPremium
                ? 'Your server enjoys full access to 3 persistent backup slots with an ultra-short 1-day cooldown.'
                : 'Free servers have 1 slot and a 7-day cooldown. Upgrade to Premium for 3 snapshot slots and daily backups.'}
            </p>
          </div>
        </div>

        {!data.isPremium && (
          <Link
            href={`/dashboard/premium?guild=${guildId}`}
            className="h-9 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-xs font-bold text-black flex items-center gap-1.5 transition shadow-lg shadow-amber-500/20 shrink-0"
          >
            <Crown size={14} className="fill-black" />
            <span>Unlock 3 Slots</span>
          </Link>
        )}
      </div>

      {/* Snapshot Slots Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {slots.map((slotNum) => {
          const isSlotLocked = !data.isPremium && slotNum > 1;
          const backup = data.backups.find((b) => b.slot === slotNum);
          const isRestoring = restoringSlot === slotNum;

          if (isSlotLocked) {
            return (
              <div
                key={slotNum}
                className="rounded-2xl border border-dashed border-[#262838] bg-[#12131b]/60 p-6 flex flex-col justify-between space-y-4 opacity-70 relative overflow-hidden"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-white/30">
                      Slot #{slotNum}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-400 flex items-center gap-1">
                      <Lock size={11} />
                      PREMIUM
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white/40 mt-3">Locked Slot #{slotNum}</h3>
                  <p className="text-xs text-white/30 mt-1 leading-relaxed">
                    Exclusive to Uranium Premium servers. Store multiple snapshots to easily rollback server griefs or test role setups.
                  </p>
                </div>

                <Link
                  href={`/dashboard/premium?guild=${guildId}`}
                  className="w-full h-9 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-bold text-amber-300 flex items-center justify-center gap-1.5 transition"
                >
                  <Crown size={13} className="fill-amber-300" />
                  <span>Upgrade to Unlock</span>
                </Link>
              </div>
            );
          }

          return (
            <div
              key={slotNum}
              className={`rounded-2xl border p-5 flex flex-col justify-between space-y-4 transition ${
                backup
                  ? 'border-[#262838] bg-[#161722] hover:border-[#35384d]'
                  : 'border-dashed border-[#262838] bg-[#14151f]/50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-rose-400">
                    Slot #{slotNum}
                  </span>
                  {backup ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 size={11} />
                      STORED
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-white/30">EMPTY</span>
                  )}
                </div>

                {backup ? (
                  <div className="mt-3 space-y-3">
                    <h3 className="text-base font-bold text-white truncate">{backup.name}</h3>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-2 rounded-lg bg-[#101118] p-2 border border-[#232534]">
                        <Hash size={14} className="text-blue-400" />
                        <div>
                          <p className="text-[10px] text-white/40 font-semibold">Channels</p>
                          <p className="font-bold text-white">{backup.stats.channels}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 rounded-lg bg-[#101118] p-2 border border-[#232534]">
                        <Users size={14} className="text-purple-400" />
                        <div>
                          <p className="text-[10px] text-white/40 font-semibold">Roles</p>
                          <p className="font-bold text-white">{backup.stats.roles}</p>
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] text-white/40 space-y-0.5 pt-1">
                      <p>Created: {new Date(backup.created_at).toLocaleString()}</p>
                      <p>Saved By: {backup.created_by}</p>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center text-white/40 space-y-2">
                    <Database className="mx-auto h-8 w-8 opacity-30" />
                    <p className="text-xs">No snapshot saved in this slot.</p>
                  </div>
                )}
              </div>

              {backup ? (
                <div className="flex items-center gap-2 pt-2 border-t border-[#1f212d]">
                  <button
                    type="button"
                    onClick={() => setConfirmRestoreSlot(slotNum)}
                    disabled={isRestoring}
                    className="flex-1 h-9 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition shadow-sm"
                  >
                    {isRestoring ? <RefreshCw size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                    <span>Restore</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(slotNum)}
                    className="h-9 px-3 rounded-xl bg-[#1a1b24] hover:bg-red-500/10 hover:text-red-400 text-white/50 text-xs font-semibold transition border border-[#262838]"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleCreateBackup(slotNum)}
                  disabled={creating || !data.canCreate}
                  className="w-full h-9 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-40 border border-white/10 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition"
                >
                  <Plus size={14} />
                  <span>Save Snapshot Here</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Manual Creation Card */}
      <div className="rounded-2xl border border-[#232534] bg-[#161722] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Plus size={16} className="text-rose-400" />
              Capture New Snapshot
            </h2>
            <p className="text-xs text-white/50 mt-0.5">
              Instantly duplicate and freeze current server configuration.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
              data.canCreate
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}>
              <Clock size={12} />
              <span>{formatRemainingTime(data.cooldownRemainingMs)}</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <input
              type="text"
              value={backupName}
              onChange={(e) => setBackupName(e.target.value)}
              placeholder="Backup Name (e.g., Pre-Event Setup)"
              className="w-full h-10 rounded-xl border border-[#262838] bg-[#101118] px-3.5 text-xs text-white outline-none focus:border-rose-500 transition"
            />
          </div>

          <button
            type="button"
            onClick={() => handleCreateBackup(1)}
            disabled={creating || !data.canCreate}
            className="h-10 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-xs font-bold text-white flex items-center justify-center gap-2 transition shadow-lg shadow-rose-500/20"
          >
            {creating ? <RefreshCw size={14} className="animate-spin" /> : <Database size={14} />}
            <span>Capture Snapshot Now</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmRestoreSlot !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-w-md w-full rounded-2xl border border-red-500/30 bg-[#161722] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle size={24} />
              <h3 className="text-base font-bold text-white">Restore Backup #{confirmRestoreSlot}?</h3>
            </div>
            <p className="text-xs text-white/70 leading-relaxed">
              Restoring a backup will recreate missing server channels, reapply role permissions, and restore guild settings. This action cannot be automatically reversed.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmRestoreSlot(null)}
                className="h-9 px-4 rounded-xl text-xs font-semibold text-white/60 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRestore(confirmRestoreSlot)}
                className="h-9 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-bold text-white transition shadow-lg shadow-red-600/30"
              >
                Yes, Restore Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
