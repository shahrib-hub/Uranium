'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Trophy,
  Save,
  MessageSquare,
  Award,
  Sliders,
  ShieldAlert,
  RotateCcw,
  Plus,
  Trash2,
  Users,
  Eye,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  Flame,
  Zap,
  Hash
} from 'lucide-react';
import { toast } from 'sonner';

export default function RankingDashboardPage() {
  const params = useSearchParams();
  const guildId = params.get('guild');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);

  // Config states
  const [enabled, setEnabled] = useState(true);
  const [cooldownSeconds, setCooldownSeconds] = useState(60);
  const [minChars, setMinChars] = useState(5);
  const [announcementChannel, setAnnouncementChannel] = useState('current');
  const [customAnnouncementChannel, setCustomAnnouncementChannel] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState(
    '🎉 GG {user}, you just advanced to **Level {level}**!'
  );
  const [xpRate, setXpRate] = useState(1.0);
  const [blacklist, setBlacklist] = useState([]);

  // Role rewards
  const [roleRewards, setRoleRewards] = useState([]);
  const [newRewardLevel, setNewRewardLevel] = useState('');
  const [newRewardRole, setNewRewardRole] = useState('');

  // Top leaderboard preview
  const [topUsers, setTopUsers] = useState([]);

  useEffect(() => {
    if (!guildId) return;
    loadRankingData();
  }, [guildId]);

  const loadRankingData = async () => {
    setLoading(true);
    try {
      const [rankRes, chRes, rolesRes] = await Promise.all([
        fetch(`/api/guild/${guildId}/ranking`),
        fetch(`/api/guild/${guildId}/channels`),
        fetch(`/api/guild/${guildId}/roles`)
      ]);

      if (chRes.ok) {
        const cData = await chRes.json();
        setChannels(Array.isArray(cData) ? cData : cData.channels || []);
      }

      if (rolesRes.ok) {
        const rData = await rolesRes.json();
        setRoles(Array.isArray(rData) ? rData : rData.roles || []);
      }

      if (rankRes.ok) {
        const data = await rankRes.json();
        const cfg = data.config || {};
        setEnabled(cfg.enabled !== undefined ? !!cfg.enabled : true);
        setCooldownSeconds(cfg.cooldown_seconds ?? 60);
        setMinChars(cfg.min_chars ?? 5);
        setAnnouncementChannel(cfg.announcement_channel || 'current');
        setCustomAnnouncementChannel(cfg.custom_announcement_channel || '');
        setAnnouncementMessage(
          cfg.announcement_message || '🎉 GG {user}, you just advanced to **Level {level}**!'
        );
        setXpRate(cfg.xp_rate ?? 1.0);
        setBlacklist(Array.isArray(cfg.blacklist) ? cfg.blacklist : []);
        setRoleRewards(data.roleRewards || []);
        setTopUsers(data.topUsers || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load ranking settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!guildId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/guild/${guildId}/ranking/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          cooldown_seconds: Number(cooldownSeconds),
          min_chars: Number(minChars),
          announcement_channel: announcementChannel,
          custom_announcement_channel: customAnnouncementChannel || null,
          announcement_message: announcementMessage,
          xp_rate: Number(xpRate),
          blacklist
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save ranking configuration');

      toast.success(data.message || 'Ranking configuration updated successfully!');
    } catch (err) {
      toast.error(err.message || 'Error updating ranking config');
    } finally {
      setSaving(false);
    }
  };

  const handleAddRoleReward = async (e) => {
    e.preventDefault();
    if (!newRewardLevel || !newRewardRole) {
      return toast.warning('Select both a level and a role');
    }

    try {
      const res = await fetch(`/api/guild/${guildId}/ranking/rewards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: Number(newRewardLevel),
          roleId: newRewardRole
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add reward');

      toast.success(data.message || 'Role reward added!');
      setRoleRewards((prev) => [
        ...prev.filter((r) => r.level !== Number(newRewardLevel)),
        { level: Number(newRewardLevel), role_id: newRewardRole }
      ]);
      setNewRewardLevel('');
      setNewRewardRole('');
    } catch (err) {
      toast.error(err.message || 'Error adding role reward');
    }
  };

  const handleRemoveRoleReward = async (level) => {
    try {
      const res = await fetch(`/api/guild/${guildId}/ranking/rewards/${level}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove reward');

      toast.success(data.message || 'Role reward removed');
      setRoleRewards((prev) => prev.filter((r) => r.level !== level));
    } catch (err) {
      toast.error(err.message || 'Error removing reward');
    }
  };

  const handleResetLeaderboard = async () => {
    if (!confirm('Are you sure you want to completely RESET all XP and rankings for this server? This action cannot be undone!')) {
      return;
    }

    try {
      const res = await fetch(`/api/guild/${guildId}/ranking/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'all' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset leaderboard');

      toast.success(data.message || 'Leaderboard reset.');
      setTopUsers([]);
    } catch (err) {
      toast.error(err.message || 'Error resetting leaderboard');
    }
  };

  const handleToggleBlacklist = (chId) => {
    setBlacklist((prev) =>
      prev.includes(chId) ? prev.filter((id) => id !== chId) : [...prev, chId]
    );
  };

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
        <p className="text-xs text-white/50">Loading Levels & Ranking Engine...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#1e202c] pb-8">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <div className="h-px w-12 bg-red-500" />
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-[4px] text-red-500">
              Progression Engine
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tighter uppercase italic text-white">
            Levels & <span className="text-red-500">Ranking</span>
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-white/50 max-w-xl leading-relaxed">
            Gamify your community with active chat XP, automated level-up announcements, role rewards, and server leaderboards.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleResetLeaderboard}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition"
          >
            <RotateCcw size={13} />
            <span>Reset Leaderboard</span>
          </button>

          <button
            type="button"
            onClick={handleSaveConfig}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 active:scale-95 transition shadow-lg shadow-rose-600/20 disabled:opacity-40"
          >
            <Save size={14} />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      {/* ── 2-Column Grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (8 cols): Level Announcements, XP Rates, Role Rewards */}
        <div className="lg:col-span-8 space-y-6">
          {/* Section 1: Level Up Announcements */}
          <div className="rounded-2xl border border-[#1e202c] bg-[#14151e] p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare size={18} className="text-rose-400" />
                <h2 className="text-sm font-bold text-white">Level-Up Announcements</h2>
              </div>
              <span className="text-xs text-white/40">Alert members when they advance</span>
            </div>

            {/* Announcement Mode Radio */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: 'current', label: 'Current Channel', desc: 'Where member typed' },
                { id: 'custom', label: 'Custom Channel', desc: 'Designated room' },
                { id: 'dm', label: 'Direct Message', desc: 'Private to user' },
                { id: 'none', label: 'Disabled', desc: 'No announcements' }
              ].map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setAnnouncementChannel(mode.id)}
                  className={`p-3 rounded-xl border text-left transition ${
                    announcementChannel === mode.id
                      ? 'border-rose-500/50 bg-rose-500/10 text-white'
                      : 'border-[#262838] bg-[#101118] text-white/60 hover:text-white'
                  }`}
                >
                  <span className="text-xs font-bold block">{mode.label}</span>
                  <span className="text-[10px] text-white/40">{mode.desc}</span>
                </button>
              ))}
            </div>

            {/* If Custom Channel selected */}
            {announcementChannel === 'custom' && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-white/60">
                  Select Announcement Text Channel
                </label>
                <select
                  value={customAnnouncementChannel}
                  onChange={(e) => setCustomAnnouncementChannel(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#262838] bg-[#101118] text-xs text-white outline-none focus:border-rose-500/50 transition"
                >
                  <option value="">Select a channel...</option>
                  {channels.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Custom Template Textarea */}
            {announcementChannel !== 'none' && (
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-white/60 flex items-center justify-between">
                  <span>Custom Announcement Message</span>
                  <span className="text-white/40 font-mono text-[10px]">Markdown Supported</span>
                </label>
                <textarea
                  rows={2}
                  value={announcementMessage}
                  onChange={(e) => setAnnouncementMessage(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#262838] bg-[#101118] text-xs text-white outline-none focus:border-rose-500/50 transition resize-none"
                />
                <div className="flex flex-wrap gap-1.5 text-[10px] text-white/40">
                  <span className="px-2 py-0.5 rounded bg-white/5 font-mono">{'{user}'}</span>
                  <span className="px-2 py-0.5 rounded bg-white/5 font-mono">{'{username}'}</span>
                  <span className="px-2 py-0.5 rounded bg-white/5 font-mono">{'{level}'}</span>
                  <span className="px-2 py-0.5 rounded bg-white/5 font-mono">{'{xp}'}</span>
                  <span className="px-2 py-0.5 rounded bg-white/5 font-mono">{'{server}'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: XP Rates & Anti-Spam Controls */}
          <div className="rounded-2xl border border-[#1e202c] bg-[#14151e] p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Zap size={18} className="text-amber-400" />
              <h2 className="text-sm font-bold text-white">XP Rates & Cooldown Controls</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Message Cooldown */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-white/60">
                  Message Cooldown (Seconds)
                </label>
                <input
                  type="number"
                  min={5}
                  max={300}
                  value={cooldownSeconds}
                  onChange={(e) => setCooldownSeconds(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#262838] bg-[#101118] text-xs text-white outline-none focus:border-rose-500/50 transition"
                />
                <span className="text-[10px] text-white/40 block">Prevents fast spamming</span>
              </div>

              {/* XP Multiplier */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-white/60">
                  XP Rate Multiplier
                </label>
                <select
                  value={xpRate}
                  onChange={(e) => setXpRate(parseFloat(e.target.value))}
                  className="w-full h-10 px-3 rounded-xl border border-[#262838] bg-[#101118] text-xs text-white outline-none focus:border-rose-500/50 transition"
                >
                  <option value={1.0}>1.0x (Standard)</option>
                  <option value={1.5}>1.5x (Boosted)</option>
                  <option value={2.0}>2.0x (Double XP)</option>
                  <option value={3.0}>3.0x (Triple XP)</option>
                </select>
                <span className="text-[10px] text-white/40 block">Multiplier applied to all messages</span>
              </div>

              {/* Minimum Characters */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-white/60">
                  Minimum Message Length
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={minChars}
                  onChange={(e) => setMinChars(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#262838] bg-[#101118] text-xs text-white outline-none focus:border-rose-500/50 transition"
                />
                <span className="text-[10px] text-white/40 block">Ignores messages shorter than this</span>
              </div>
            </div>
          </div>

          {/* Section 3: Role Rewards Manager */}
          <div className="rounded-2xl border border-[#1e202c] bg-[#14151e] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award size={18} className="text-emerald-400" />
                <h2 className="text-sm font-bold text-white">Automated Level Role Rewards</h2>
              </div>
              <span className="text-xs text-white/40">
                {roleRewards.length} reward{roleRewards.length === 1 ? '' : 's'} active
              </span>
            </div>

            <p className="text-xs text-white/50">
              When a member achieves a specific level milestone, Uranium will automatically grant them the corresponding Discord role.
            </p>

            {/* Add Role Reward Form */}
            <form onSubmit={handleAddRoleReward} className="flex flex-col sm:flex-row gap-3 pt-1">
              <div className="w-full sm:w-32">
                <input
                  type="number"
                  min={1}
                  max={200}
                  placeholder="Level #"
                  value={newRewardLevel}
                  onChange={(e) => setNewRewardLevel(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#262838] bg-[#101118] text-xs text-white outline-none focus:border-rose-500/50 transition"
                />
              </div>

              <div className="flex-1">
                <select
                  value={newRewardRole}
                  onChange={(e) => setNewRewardRole(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#262838] bg-[#101118] text-xs text-white outline-none focus:border-rose-500/50 transition"
                >
                  <option value="">Select a role to reward...</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      @{r.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition shrink-0"
              >
                <Plus size={14} />
                <span>Add Reward</span>
              </button>
            </form>

            {/* Role Rewards List */}
            {roleRewards.length === 0 ? (
              <p className="text-xs text-white/30 italic pt-2">No role rewards configured yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                {roleRewards
                  .sort((a, b) => a.level - b.level)
                  .map((r) => {
                    const role = roles.find((rl) => rl.id === r.role_id);
                    return (
                      <div
                        key={r.level}
                        className="flex items-center justify-between p-3 rounded-xl border border-[#262838] bg-[#101118]"
                      >
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-black text-xs border border-emerald-500/20">
                            Lvl {r.level}
                          </span>
                          <span className="text-xs font-semibold text-white">
                            @{role?.name || `Role (${r.role_id.slice(-4)})`}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveRoleReward(r.level)}
                          className="text-white/40 hover:text-rose-400 transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Section 4: Channel Blacklist */}
          <div className="rounded-2xl border border-[#1e202c] bg-[#14151e] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert size={18} className="text-amber-400" />
                <h2 className="text-sm font-bold text-white">No-XP Blacklisted Channels</h2>
              </div>
              <span className="text-xs text-white/40">
                {blacklist.length} channel{blacklist.length === 1 ? '' : 's'} blacklisted
              </span>
            </div>
            <p className="text-xs text-white/50">
              Messages sent in these channels will not award any XP to members.
            </p>

            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
              {channels.map((c) => {
                const isBlacklisted = blacklist.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleToggleBlacklist(c.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono transition flex items-center gap-1.5 ${
                      isBlacklisted
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-[#101118] text-white/50 border border-[#262838] hover:text-white'
                    }`}
                  >
                    <span>#{c.name}</span>
                    {isBlacklisted && <span className="text-[10px] font-bold">🚫</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Live Leaderboard Preview */}
        <div className="lg:col-span-4 space-y-6">
          <div className="sticky top-20 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white/70 uppercase tracking-wider flex items-center gap-2">
                <Trophy size={14} className="text-amber-400" />
                <span>Server Leaderboard</span>
              </h3>
              <span className="text-[10px] text-white/40">Top Active</span>
            </div>

            {/* Leaderboard Preview Card */}
            <div className="rounded-2xl border border-[#232534] bg-[#161722] p-4 space-y-3 shadow-2xl">
              {topUsers.length === 0 ? (
                <p className="text-xs text-white/40 text-center py-8">
                  No members have gained XP yet. Chat in server channels to start leveling up!
                </p>
              ) : (
                <div className="space-y-2">
                  {topUsers.map((u, i) => (
                    <div
                      key={u.userId}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-[#111218] border border-white/5 hover:border-white/10 transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`font-black text-xs w-4 text-center ${
                            i === 0
                              ? 'text-amber-400'
                              : i === 1
                              ? 'text-zinc-300'
                              : i === 2
                              ? 'text-amber-600'
                              : 'text-white/40'
                          }`}
                        >
                          #{u.rank}
                        </span>

                        <img
                          src={u.avatar}
                          alt="Avatar"
                          className="h-7 w-7 rounded-full object-cover shrink-0"
                        />

                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate max-w-[120px]">
                            {u.username}
                          </p>
                          <span className="text-[10px] text-white/40">
                            {u.xp.toLocaleString()} XP
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 font-black text-xs border border-rose-500/20">
                          Lvl {u.level}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-white/5 bg-[#14151e] p-3 text-[11px] text-white/50 space-y-1">
              <span className="font-semibold text-white/70">Discord Slash Commands:</span>
              <p className="font-mono text-rose-400">/rank user rank &nbsp;|&nbsp; /rank user card</p>
              <p>Rank cards and leaderboards generate dynamically in Discord using your configured settings.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
