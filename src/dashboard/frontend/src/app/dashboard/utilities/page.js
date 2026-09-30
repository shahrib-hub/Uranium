'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Wrench,
  Mic,
  Pin,
  Ghost,
  BellRing,
  Cake,
  UserCheck,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  Hash,
  Sliders,
  FolderOpen,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

export default function UtilitiesDashboardPage() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get('guild');

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('jtc'); // 'jtc' | 'sticky' | 'ghostping' | 'joinping' | 'birthdays' | 'autoroles'

  // JTC State
  const [jtcSetup, setJtcSetup] = useState(null);
  const [jtcTriggerId, setJtcTriggerId] = useState('');
  const [jtcCategoryId, setJtcCategoryId] = useState('');
  const [jtcLimit, setJtcLimit] = useState(0);

  // Sticky State
  const [stickies, setStickies] = useState([]);
  const [stickyConfig, setStickyConfig] = useState({ repostDelaySeconds: 5, autoPinOnCreate: false });
  const [newStickyChannel, setNewStickyChannel] = useState('');
  const [newStickyContent, setNewStickyContent] = useState('');
  const [newStickyEmbed, setNewStickyEmbed] = useState(false);

  // Ghostping State
  const [ghostConfig, setGhostConfig] = useState({ enabled: false, action: 'notify', timeoutSeconds: 300 });

  // JoinPing State
  const [joinPings, setJoinPings] = useState([]);
  const [newJoinPingChannel, setNewJoinPingChannel] = useState('');

  // Birthdays State
  const [birthdays, setBirthdays] = useState([]);

  // AutoRoles State
  const [autoroleSets, setAutoroleSets] = useState([]);
  const [newSetName, setNewSetName] = useState('');
  const [newSetDelay, setNewSetDelay] = useState(0);
  const [newSetRoles, setNewSetRoles] = useState([]);

  // Shared metadata
  const [textChannels, setTextChannels] = useState([]);
  const [voiceChannels, setVoiceChannels] = useState([]);
  const [categories, setCategories] = useState([]);
  const [roles, setRoles] = useState([]);

  const fetchTab = async (tab) => {
    if (!guildId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/guild/${guildId}/utilities/${tab}`);
      if (res.ok) {
        const data = await res.json();
        if (data.textChannels) setTextChannels(data.textChannels);
        if (data.voiceChannels) setVoiceChannels(data.voiceChannels);
        if (data.categories) setCategories(data.categories);
        if (data.roles) setRoles(data.roles);

        if (tab === 'jtc') {
          setJtcSetup(data.setup);
          if (data.setup) {
            setJtcTriggerId(data.setup.trigger_voice_id || '');
            setJtcCategoryId(data.setup.target_category_id || '');
            setJtcLimit(data.setup.user_limit || 0);
          }
        } else if (tab === 'sticky') {
          setStickies(data.stickies || []);
          if (data.config) setStickyConfig(data.config);
        } else if (tab === 'ghostping') {
          if (data.settings) setGhostConfig(data.settings);
        } else if (tab === 'joinping') {
          setJoinPings(data.channels || []);
        } else if (tab === 'birthdays') {
          setBirthdays(data.birthdays || []);
        } else if (tab === 'autoroles') {
          setAutoroleSets(data.sets || []);
        }
      }
    } catch (err) {
      toast.error('Failed to load utility tab data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTab(activeTab);
  }, [guildId, activeTab]);

  // 1. JTC Actions
  const handleSaveJtc = async () => {
    if (!jtcTriggerId || !jtcCategoryId) {
      toast.error('Trigger voice channel and target category are required.');
      return;
    }
    try {
      const res = await fetch(`/api/guild/${guildId}/utilities/jtc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          triggerVoiceId: jtcTriggerId,
          targetCategoryId: jtcCategoryId,
          userLimit: jtcLimit
        })
      });
      if (!res.ok) throw new Error('Failed to save JTC setup');
      toast.success('Join-to-Create voice generator activated!');
      fetchTab('jtc');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteJtc = async () => {
    try {
      const res = await fetch(`/api/guild/${guildId}/utilities/jtc`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete JTC');
      toast.success('Join-to-Create removed.');
      setJtcSetup(null);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // 2. Sticky Actions
  const handleCreateSticky = async () => {
    if (!newStickyChannel || !newStickyContent.trim()) {
      toast.error('Select a channel and enter message content.');
      return;
    }
    try {
      const res = await fetch(`/api/guild/${guildId}/utilities/sticky`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: newStickyChannel,
          content: newStickyContent.trim(),
          embedFlag: newStickyEmbed
        })
      });
      if (!res.ok) throw new Error('Failed to create sticky');
      toast.success('Sticky message pinned!');
      setNewStickyContent('');
      fetchTab('sticky');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteSticky = async (id) => {
    try {
      const res = await fetch(`/api/guild/${guildId}/utilities/sticky/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete sticky');
      toast.success('Sticky removed.');
      setStickies(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      toast.error(err.message);
    }
  };

  // 3. Ghostping Action
  const handleSaveGhost = async () => {
    try {
      const res = await fetch(`/api/guild/${guildId}/utilities/ghostping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ghostConfig)
      });
      if (!res.ok) throw new Error('Failed to save ghostping config');
      toast.success('Anti-Ghostping configuration saved!');
    } catch (err) {
      toast.error(err.message);
    }
  };

  // 4. JoinPing Actions
  const handleAddJoinPing = async () => {
    if (!newJoinPingChannel) return;
    try {
      const res = await fetch(`/api/guild/${guildId}/utilities/joinping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: newJoinPingChannel })
      });
      if (!res.ok) throw new Error('Failed to add join-ping');
      toast.success('Join-ping channel added!');
      fetchTab('joinping');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleRemoveJoinPing = async (chId) => {
    try {
      const res = await fetch(`/api/guild/${guildId}/utilities/joinping/${chId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove join-ping');
      toast.success('Join-ping removed.');
      setJoinPings(prev => prev.filter(p => p.channelId !== chId));
    } catch (err) {
      toast.error(err.message);
    }
  };

  // 5. Birthday Action
  const handleRemoveBirthday = async (userId) => {
    try {
      const res = await fetch(`/api/guild/${guildId}/utilities/birthdays/${userId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete birthday');
      toast.success('Birthday record removed.');
      setBirthdays(prev => prev.filter(b => b.userId !== userId));
    } catch (err) {
      toast.error(err.message);
    }
  };

  // 6. AutoRoles Actions
  const handleCreateAutoRoleSet = async () => {
    if (!newSetName.trim()) {
      toast.error('Set name is required.');
      return;
    }
    try {
      const res = await fetch(`/api/guild/${guildId}/utilities/autoroles/set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSetName.trim(),
          delay_seconds: newSetDelay,
          roleIds: newSetRoles
        })
      });
      if (!res.ok) throw new Error('Failed to create auto-role set');
      toast.success('Auto-role set created!');
      setNewSetName('');
      setNewSetRoles([]);
      fetchTab('autoroles');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteAutoRoleSet = async (setId) => {
    try {
      const res = await fetch(`/api/guild/${guildId}/utilities/autoroles/set/${setId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete set');
      toast.success('Auto-role set deleted.');
      setAutoroleSets(prev => prev.filter(s => s.id !== setId));
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1f212d] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-blue-400">Server Administration</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white flex items-center gap-3">
            <Wrench className="text-rose-500" size={32} />
            Server Utilities & Tools
          </h1>
          <p className="text-xs sm:text-sm text-white/50 mt-1">
            Dynamic temporary voice rooms, persistent sticky messages, anti-ghostping shield, and auto-roles.
          </p>
        </div>

        <button
          onClick={() => fetchTab(activeTab)}
          className="self-start sm:self-auto h-9 px-3.5 rounded-xl bg-[#181923] hover:bg-[#202230] border border-[#262838] text-xs font-semibold text-white/80 hover:text-white flex items-center gap-2 transition"
        >
          <RefreshCw size={13} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#1f212d] pb-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'jtc', label: 'Join to Create (JTC)', icon: Mic },
          { id: 'sticky', label: 'Sticky Messages', icon: Pin },
          { id: 'ghostping', label: 'Anti-Ghostping', icon: Ghost },
          { id: 'joinping', label: 'Join Pings', icon: BellRing },
          { id: 'birthdays', label: 'Birthdays', icon: Cake },
          { id: 'autoroles', label: 'Auto-Roles', icon: UserCheck }
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                active
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                  : 'text-white/60 hover:text-white hover:bg-[#181923]'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: JOIN TO CREATE (JTC) ── */}
      {activeTab === 'jtc' && (
        <div className="max-w-2xl rounded-2xl border border-[#232534] bg-[#161722] p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Mic size={16} className="text-rose-400" />
                Join-to-Create Dynamic Voice Rooms
              </h2>
              <p className="text-xs text-white/50 mt-0.5">
                When members join the trigger channel, a private voice room is automatically created for them and deleted when empty.
              </p>
            </div>
            {jtcSetup && (
              <button
                type="button"
                onClick={handleDeleteJtc}
                className="px-3 py-1.5 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-xs font-bold text-red-300 transition"
              >
                Disable JTC
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-white/70">Trigger Voice Channel</label>
              <select
                value={jtcTriggerId}
                onChange={(e) => setJtcTriggerId(e.target.value)}
                className="mt-1.5 w-full h-10 rounded-xl border border-[#262838] bg-[#101118] px-3.5 text-xs text-white outline-none focus:border-rose-500 transition"
              >
                <option value="">Select voice channel...</option>
                {voiceChannels.map((vc) => (
                  <option key={vc.id} value={vc.id}>🔊 {vc.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-white/70">Target Category for Temp Channels</label>
              <select
                value={jtcCategoryId}
                onChange={(e) => setJtcCategoryId(e.target.value)}
                className="mt-1.5 w-full h-10 rounded-xl border border-[#262838] bg-[#101118] px-3.5 text-xs text-white outline-none focus:border-rose-500 transition"
              >
                <option value="">Select category...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>📂 {cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-white/70">Default User Limit (0 for unlimited)</label>
              <input
                type="number"
                min={0}
                max={99}
                value={jtcLimit}
                onChange={(e) => setJtcLimit(parseInt(e.target.value, 10) || 0)}
                className="mt-1.5 w-full h-10 rounded-xl border border-[#262838] bg-[#101118] px-3.5 text-xs text-white outline-none focus:border-rose-500 transition"
              />
            </div>

            <button
              type="button"
              onClick={handleSaveJtc}
              className="h-10 px-6 rounded-xl bg-rose-500 hover:bg-rose-600 text-xs font-bold text-white flex items-center gap-2 transition shadow-md shadow-rose-500/20"
            >
              <Save size={14} />
              <span>Save JTC Configuration</span>
            </button>
          </div>
        </div>
      )}

      {/* ── TAB 2: STICKY MESSAGES ── */}
      {activeTab === 'sticky' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 rounded-2xl border border-[#232534] bg-[#161722] p-5 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Plus size={16} className="text-rose-400" />
              Pin New Sticky Message
            </h2>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-white/60">Target Channel</label>
                <select
                  value={newStickyChannel}
                  onChange={(e) => setNewStickyChannel(e.target.value)}
                  className="mt-1 w-full h-9 rounded-xl border border-[#262838] bg-[#101118] px-3 text-xs text-white outline-none focus:border-rose-500 transition"
                >
                  <option value="">Select a channel...</option>
                  {textChannels.map((c) => (
                    <option key={c.id} value={c.id}>#{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-white/60">Sticky Message Content</label>
                <textarea
                  rows={4}
                  value={newStickyContent}
                  onChange={(e) => setNewStickyContent(e.target.value)}
                  placeholder="Remember to review server rules before chatting!"
                  className="mt-1 w-full rounded-xl border border-[#262838] bg-[#101118] p-3 text-xs text-white outline-none focus:border-rose-500 transition resize-none"
                />
              </div>

              <div className="flex items-center justify-between rounded-xl bg-[#101118] p-3 border border-[#262838]">
                <span className="text-xs font-semibold text-white">Send as Embed Card</span>
                <input
                  type="checkbox"
                  checked={newStickyEmbed}
                  onChange={(e) => setNewStickyEmbed(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-700 text-rose-500"
                />
              </div>

              <button
                type="button"
                onClick={handleCreateSticky}
                disabled={!newStickyChannel || !newStickyContent.trim()}
                className="w-full h-10 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-xs font-bold text-white flex items-center justify-center gap-2 transition shadow-md shadow-rose-500/20"
              >
                <Pin size={14} />
                <span>Pin Sticky Message</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Pin size={16} className="text-rose-400" />
              Active Sticky Messages ({stickies.length})
            </h2>

            {stickies.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#232534] bg-[#161722]/50 p-12 text-center text-white/40 space-y-2">
                <Pin className="mx-auto h-8 w-8 opacity-40" />
                <p className="text-xs">No active stickies pinned in this server.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stickies.map((s) => {
                  const ch = textChannels.find((c) => c.id === s.channelId);
                  return (
                    <div key={s.id} className="rounded-2xl border border-[#232534] bg-[#161722] p-4 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-bold text-white/70">
                            #{ch?.name || s.channelId}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteSticky(s.id)}
                            className="p-1 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <p className="text-xs text-white/80 mt-2 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                          {s.content}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: ANTI-GHOSTPING ── */}
      {activeTab === 'ghostping' && (
        <div className="max-w-2xl rounded-2xl border border-[#232534] bg-[#161722] p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Ghost size={16} className="text-rose-400" />
                Anti-Ghostping Protection
              </h2>
              <p className="text-xs text-white/50 mt-0.5">
                Automatically detects deleted messages containing user mentions and publicly exposes the perpetrator.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={ghostConfig.enabled}
                onChange={(e) => setGhostConfig({ ...ghostConfig, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#262838] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
            </label>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-white/70">Action upon Ghost Ping</label>
              <select
                value={ghostConfig.action}
                onChange={(e) => setGhostConfig({ ...ghostConfig, action: e.target.value })}
                className="mt-1.5 w-full h-10 rounded-xl border border-[#262838] bg-[#101118] px-3.5 text-xs text-white outline-none focus:border-rose-500 transition"
              >
                <option value="notify">Notify & Expose in Channel</option>
                <option value="timeout">Timeout Offending User</option>
                <option value="none">Log Silently</option>
              </select>
            </div>

            {ghostConfig.action === 'timeout' && (
              <div>
                <label className="text-xs font-semibold text-white/70">Timeout Duration (seconds)</label>
                <input
                  type="number"
                  min={10}
                  max={86400}
                  value={ghostConfig.timeoutSeconds}
                  onChange={(e) => setGhostConfig({ ...ghostConfig, timeoutSeconds: parseInt(e.target.value, 10) || 300 })}
                  className="mt-1.5 w-full h-10 rounded-xl border border-[#262838] bg-[#101118] px-3.5 text-xs text-white outline-none focus:border-rose-500 transition"
                />
              </div>
            )}

            <button
              type="button"
              onClick={handleSaveGhost}
              className="h-10 px-6 rounded-xl bg-rose-500 hover:bg-rose-600 text-xs font-bold text-white flex items-center gap-2 transition shadow-md shadow-rose-500/20"
            >
              <Save size={14} />
              <span>Save Ghostping Settings</span>
            </button>
          </div>
        </div>
      )}

      {/* ── TAB 4: JOIN PINGS ── */}
      {activeTab === 'joinping' && (
        <div className="max-w-2xl rounded-2xl border border-[#232534] bg-[#161722] p-6 space-y-5">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <BellRing size={16} className="text-rose-400" />
              Join Pings Configuration
            </h2>
            <p className="text-xs text-white/50 mt-0.5">
              Temporarily ghost-ping incoming members in specific channels so the channel pops up in their active server channels list.
            </p>
          </div>

          <div className="flex gap-2">
            <select
              value={newJoinPingChannel}
              onChange={(e) => setNewJoinPingChannel(e.target.value)}
              className="flex-1 h-10 rounded-xl border border-[#262838] bg-[#101118] px-3.5 text-xs text-white outline-none focus:border-rose-500 transition"
            >
              <option value="">Select a channel to ping in...</option>
              {textChannels.map((c) => (
                <option key={c.id} value={c.id}>#{c.name}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleAddJoinPing}
              disabled={!newJoinPingChannel}
              className="h-10 px-5 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-xs font-bold text-white flex items-center gap-1.5 transition shadow-sm"
            >
              <Plus size={14} />
              <span>Add</span>
            </button>
          </div>

          <div className="space-y-2 pt-2">
            {joinPings.length === 0 ? (
              <p className="text-xs text-white/30 text-center py-6">No join-ping channels configured.</p>
            ) : (
              joinPings.map((p) => {
                const ch = textChannels.find((c) => c.id === p.channelId);
                return (
                  <div key={p.channelId} className="flex items-center justify-between p-3 rounded-xl bg-[#101118] border border-[#232534]">
                    <span className="text-xs font-semibold text-white">#{ch?.name || p.channelId}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveJoinPing(p.channelId)}
                      className="p-1 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── TAB 5: BIRTHDAYS ── */}
      {activeTab === 'birthdays' && (
        <div className="rounded-2xl border border-[#232534] bg-[#161722] p-6 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Cake size={16} className="text-rose-400" />
            Registered Member Birthdays ({birthdays.length})
          </h2>

          {birthdays.length === 0 ? (
            <p className="text-xs text-white/40 text-center py-8">No member birthdays logged yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {birthdays.map((b) => (
                <div key={b.userId} className="flex items-center justify-between p-3 rounded-xl bg-[#101118] border border-[#232534]">
                  <div>
                    <p className="text-xs font-bold text-white">{b.username}</p>
                    <p className="text-[11px] text-white/50">Date: {b.month}/{b.day} {b.year ? `(${b.year})` : ''}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveBirthday(b.userId)}
                    className="p-1 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 6: AUTO-ROLES ── */}
      {activeTab === 'autoroles' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 rounded-2xl border border-[#232534] bg-[#161722] p-5 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Plus size={16} className="text-rose-400" />
              Create Auto-Role Set
            </h2>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-white/60">Set Name</label>
                <input
                  type="text"
                  value={newSetName}
                  onChange={(e) => setNewSetName(e.target.value)}
                  placeholder="e.g. Standard Member Roles"
                  className="mt-1 w-full h-9 rounded-xl border border-[#262838] bg-[#101118] px-3 text-xs text-white outline-none focus:border-rose-500 transition"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-white/60">Grant Delay (seconds)</label>
                <input
                  type="number"
                  min={0}
                  value={newSetDelay}
                  onChange={(e) => setNewSetDelay(parseInt(e.target.value, 10) || 0)}
                  className="mt-1 w-full h-9 rounded-xl border border-[#262838] bg-[#101118] px-3 text-xs text-white outline-none focus:border-rose-500 transition"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-white/60">Select Role to Grant</label>
                <select
                  onChange={(e) => {
                    if (e.target.value && !newSetRoles.includes(e.target.value)) {
                      setNewSetRoles([...newSetRoles, e.target.value]);
                    }
                  }}
                  className="mt-1 w-full h-9 rounded-xl border border-[#262838] bg-[#101118] px-3 text-xs text-white outline-none focus:border-rose-500 transition"
                >
                  <option value="">Choose a role...</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>@{r.name}</option>
                  ))}
                </select>
              </div>

              {newSetRoles.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {newSetRoles.map((rId) => {
                    const r = roles.find((role) => role.id === rId);
                    return (
                      <span key={rId} className="px-2 py-0.5 rounded-md bg-white/10 text-[11px] text-white flex items-center gap-1">
                        @{r?.name || rId}
                        <button
                          type="button"
                          onClick={() => setNewSetRoles(newSetRoles.filter((id) => id !== rId))}
                          className="hover:text-red-400"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              <button
                type="button"
                onClick={handleCreateAutoRoleSet}
                disabled={!newSetName.trim()}
                className="w-full h-10 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-xs font-bold text-white flex items-center justify-center gap-2 transition shadow-md shadow-rose-500/20"
              >
                <Plus size={14} />
                <span>Save Auto-Role Set</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <UserCheck size={16} className="text-rose-400" />
              Existing Auto-Role Sets ({autoroleSets.length})
            </h2>

            {autoroleSets.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#232534] bg-[#161722]/50 p-12 text-center text-white/40 space-y-2">
                <UserCheck className="mx-auto h-8 w-8 opacity-40" />
                <p className="text-xs">No auto-role sets created yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {autoroleSets.map((s) => (
                  <div key={s.id} className="rounded-2xl border border-[#232534] bg-[#161722] p-4 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{s.name}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteAutoRoleSet(s.id)}
                          className="p-1 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1 mt-3">
                        {s.items?.map((item) => (
                          <span
                            key={item.id}
                            className="px-2 py-0.5 rounded-md text-[10px] font-bold border"
                            style={{
                              backgroundColor: `${item.roleColor}15`,
                              borderColor: `${item.roleColor}40`,
                              color: item.roleColor
                            }}
                          >
                            @{item.roleName}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#1f212d] text-[10px] text-white/40">
                      Delay: {s.delay_seconds} seconds
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
