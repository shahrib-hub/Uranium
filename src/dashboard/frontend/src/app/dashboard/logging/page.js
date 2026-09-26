'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  Save,
  CheckCircle2,
  AlertCircle,
  Hash,
  Webhook,
  Send,
  ShieldAlert,
  EyeOff,
  Filter,
  Layers,
  Sparkles,
  Check,
  X,
  Plus,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

export default function LoggingDashboardPage() {
  const params = useSearchParams();
  const guildId = params.get('guild');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // Channels
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [hasWebhook, setHasWebhook] = useState(false);
  const [webhookActionLoading, setWebhookActionLoading] = useState(false);

  // Events configuration
  const [events, setEvents] = useState({});
  const [availableEvents, setAvailableEvents] = useState([]);
  const [ignoredChannels, setIgnoredChannels] = useState([]);
  const [selectedIgnoredChannel, setSelectedIgnoredChannel] = useState('');
  const [channelFilter, setChannelFilter] = useState('');

  // Active category filter tab
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (!guildId) return;
    loadLoggingData();
  }, [guildId]);

  const loadLoggingData = async () => {
    setLoading(true);
    try {
      const [logRes, chRes] = await Promise.all([
        fetch(`/api/guild/${guildId}/logging`),
        fetch(`/api/guild/${guildId}/channels`)
      ]);

      if (chRes.ok) {
        const chData = await chRes.json();
        const list = Array.isArray(chData) ? chData : (chData.channels || chData.text || []);
        const textChs = list.filter((c) => c.type === 0 || c.type === 5 || c.isText || !c.isVoice);
        setChannels(textChs);
      }

      if (logRes.ok) {
        const data = await logRes.json();
        setSelectedChannel(data.logChannel || '');
        setHasWebhook(!!data.hasWebhook);
        setEvents(data.events || {});
        setIgnoredChannels(data.ignoredChannels || []);
        setAvailableEvents(data.availableEvents || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load logging settings');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEvent = (eventId) => {
    setEvents((prev) => ({
      ...prev,
      [eventId]: !prev[eventId]
    }));
  };

  const handleBulkToggle = (enable) => {
    const updated = {};
    availableEvents.forEach((ev) => {
      updated[ev.id] = enable;
    });
    setEvents(updated);
    toast.info(enable ? 'All logging events enabled' : 'All logging events disabled');
  };

  const handleToggleIgnoredChannel = (chId) => {
    setIgnoredChannels((prev) =>
      prev.includes(chId) ? prev.filter((id) => id !== chId) : [...prev, chId]
    );
  };

  const handleAddIgnoredChannel = (e) => {
    e?.preventDefault();
    if (!selectedIgnoredChannel) return toast.warning('Please select a channel first');
    if (ignoredChannels.includes(selectedIgnoredChannel)) return toast.info('Channel is already ignored');
    setIgnoredChannels((prev) => [...prev, selectedIgnoredChannel]);
    setSelectedIgnoredChannel('');
    toast.success('Channel added to ignored list');
  };

  const handleRemoveIgnoredChannel = (chId) => {
    setIgnoredChannels((prev) => prev.filter((id) => id !== chId));
  };

  const handleSave = async () => {
    if (!guildId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/guild/${guildId}/logging`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logChannel: selectedChannel || null,
          events,
          ignoredChannels
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save configuration');

      toast.success(data.message || 'Logging settings saved successfully!');
    } catch (err) {
      toast.error(err.message || 'Error saving logging configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleWebhookToggle = async () => {
    if (!selectedChannel) {
      return toast.warning('Please select a logging channel first');
    }
    setWebhookActionLoading(true);
    try {
      const action = hasWebhook ? 'delete' : 'create';
      const res = await fetch(`/api/guild/${guildId}/logging/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, channelId: selectedChannel })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Webhook operation failed');

      setHasWebhook(action === 'create');
      toast.success(data.message || 'Webhook updated');
    } catch (err) {
      toast.error(err.message || 'Webhook error');
    } finally {
      setWebhookActionLoading(false);
    }
  };

  const handleSendTestLog = async () => {
    if (!selectedChannel) {
      return toast.warning('Configure and save a log channel first before testing');
    }
    setTesting(true);
    try {
      const res = await fetch(`/api/guild/${guildId}/logging/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Test failed');

      toast.success(data.message || 'Test log dispatched to Discord!');
    } catch (err) {
      toast.error(err.message || 'Failed to dispatch test log');
    } finally {
      setTesting(false);
    }
  };

  const categories = ['all', 'Messages', 'Members', 'Roles', 'Channels', 'Server', 'Voice'];
  const filteredEvents = availableEvents.filter(
    (e) => activeTab === 'all' || e.category.toLowerCase() === activeTab.toLowerCase()
  );

  const enabledCount = Object.values(events).filter(Boolean).length;

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
        <p className="text-xs text-white/50">Loading Logging Configuration...</p>
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
              Audit Engine
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tighter uppercase italic text-white">
            Server <span className="text-red-500">Logging</span>
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-white/50 max-w-xl leading-relaxed">
            Record comprehensive audit trails for message edits, deletions, member joins/leaves, role changes, and voice activity with webhook acceleration.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSendTestLog}
            disabled={testing || !selectedChannel}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-white/80 hover:text-white bg-[#181923] hover:bg-[#20222f] border border-[#262838] transition disabled:opacity-40"
          >
            <Send size={14} className={testing ? 'animate-pulse text-rose-400' : ''} />
            <span>{testing ? 'Sending...' : 'Send Test Log'}</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 active:scale-95 transition shadow-lg shadow-rose-600/20 disabled:opacity-40"
          >
            <Save size={14} />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* ── Main 2-Column Workspace ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (8 cols): Channel Setup & Event Toggles */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card 1: Channel & Webhook Setup */}
          <div className="rounded-2xl border border-[#1e202c] bg-[#14151e] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hash size={18} className="text-rose-400" />
                <h2 className="text-sm font-bold text-white">Log Channel Destination</h2>
              </div>
              <span className="text-xs text-white/40">Where audit logs are sent</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Channel Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-white/60">
                  Target Discord Channel
                </label>
                <select
                  value={selectedChannel}
                  onChange={(e) => setSelectedChannel(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#262838] bg-[#101118] text-xs text-white outline-none focus:border-rose-500/50 transition"
                >
                  <option value="">Select a text channel...</option>
                  {channels.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Webhook Acceleration Option */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-white/60 flex items-center justify-between">
                  <span>High-Speed Webhook</span>
                  <span className={hasWebhook ? 'text-emerald-400 font-bold' : 'text-zinc-500'}>
                    {hasWebhook ? '● Active' : '○ Disabled'}
                  </span>
                </label>
                <button
                  type="button"
                  disabled={webhookActionLoading || !selectedChannel}
                  onClick={handleWebhookToggle}
                  className={`w-full h-10 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                    hasWebhook
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                      : 'border-[#262838] bg-[#101118] text-white/70 hover:text-white hover:bg-[#1a1b26]'
                  } disabled:opacity-40`}
                >
                  <Webhook size={14} />
                  <span>
                    {webhookActionLoading
                      ? 'Updating...'
                      : hasWebhook
                      ? 'Disconnect Webhook'
                      : 'Create High-Speed Webhook'}
                  </span>
                </button>
              </div>
            </div>
            <p className="text-[11px] text-white/40">
              Webhooks bypass standard bot route rate limits and render custom Uranium avatars on every audit embed.
            </p>
          </div>

          {/* Card 2: Logging Events Toggles */}
          <div className="rounded-2xl border border-[#1e202c] bg-[#14151e] p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers size={18} className="text-rose-400" />
                  <span>Audit Event Triggers</span>
                </h2>
                <p className="text-xs text-white/40 mt-0.5">
                  {enabledCount} of {availableEvents.length} events currently active
                </p>
              </div>

              {/* Quick Enable/Disable All */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleBulkToggle(true)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 font-bold text-[11px] transition"
                >
                  Enable All
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkToggle(false)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-white/60 font-bold text-[11px] transition"
                >
                  Disable All
                </button>
              </div>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-white/5 pb-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveTab(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition ${
                    activeTab.toLowerCase() === cat.toLowerCase()
                      ? 'bg-rose-600 text-white font-bold'
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Event Toggle List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredEvents.map((ev) => {
                const isEnabled = !!events[ev.id];
                return (
                  <div
                    key={ev.id}
                    onClick={() => handleToggleEvent(ev.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start justify-between gap-3 ${
                      isEnabled
                        ? 'border-rose-500/30 bg-rose-500/5 hover:border-rose-500/50'
                        : 'border-[#262838] bg-[#101118] hover:border-[#383b4e]'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{ev.label}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/5 text-white/40 uppercase font-mono">
                          {ev.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/40 leading-snug">{ev.desc}</p>
                    </div>

                    <div
                      className={`h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-150 relative ${
                        isEnabled ? 'bg-emerald-500' : 'bg-zinc-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 rounded-full bg-white transition duration-150 ${
                          isEnabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 3: Ignored / Blacklisted Channels */}
          <div className="rounded-2xl border border-[#1e202c] bg-[#14151e] p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-4">
              <div className="flex items-center gap-2.5">
                <EyeOff size={20} className="text-amber-400" />
                <div>
                  <h2 className="text-sm font-bold text-white">Ignored / Blacklisted Channels</h2>
                  <p className="text-xs text-white/50">
                    Events originating from these selected channels will never trigger audit log entries (useful for staff chat or bot spam channels).
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  {ignoredChannels.length} ignored
                </span>
                {ignoredChannels.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIgnoredChannels([])}
                    className="text-xs text-white/40 hover:text-amber-400 transition"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {/* Dedicated Option to Add Ignored Channel */}
            <div className="rounded-xl border border-white/5 bg-[#101118] p-4 space-y-3">
              <label className="text-xs font-bold text-white/80 uppercase tracking-wider flex items-center gap-1.5">
                <Plus size={13} className="text-amber-400" />
                <span>Add Channel to Ignored List</span>
              </label>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <select
                  value={selectedIgnoredChannel}
                  onChange={(e) => setSelectedIgnoredChannel(e.target.value)}
                  className="flex-1 h-10 px-3 rounded-xl border border-[#262838] bg-[#14151e] text-xs text-white outline-none focus:border-amber-500/50 transition cursor-pointer"
                >
                  <option value="">Select a channel to ignore...</option>
                  {channels
                    .filter((c) => !ignoredChannels.includes(c.id))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        #{c.name}
                      </option>
                    ))}
                </select>

                <button
                  type="button"
                  onClick={handleAddIgnoredChannel}
                  disabled={!selectedIgnoredChannel}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:hover:bg-amber-600 text-xs font-bold text-white transition flex items-center justify-center gap-1.5 shrink-0 shadow-lg shadow-amber-600/20"
                >
                  <Plus size={14} />
                  <span>Add to Ignored</span>
                </button>
              </div>
            </div>

            {/* Currently Ignored Channels Chips */}
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[1px] text-white/40 block">
                Currently Ignored Channels
              </span>

              {ignoredChannels.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-white/10 text-center">
                  <p className="text-xs text-white/40">
                    No channels ignored. All server channel events are currently monitored and logged.
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
                  {ignoredChannels.map((chId) => {
                    const ch = channels.find((c) => c.id === chId);
                    return (
                      <div
                        key={chId}
                        className="px-3 py-1.5 rounded-xl text-xs font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-2 group transition"
                      >
                        <span className="text-amber-400 font-bold">#</span>
                        <span>{ch ? ch.name : chId}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveIgnoredChannel(chId)}
                          className="text-white/40 hover:text-white ml-1 transition"
                          title="Remove from ignored list"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Browse / Toggle from All Server Channels */}
            {channels.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                    Quick Toggle Channels ({channels.length} available)
                  </span>
                  <input
                    type="text"
                    value={channelFilter}
                    onChange={(e) => setChannelFilter(e.target.value)}
                    placeholder="Filter channels..."
                    className="w-36 h-7 px-2.5 text-[11px] rounded-lg border border-white/10 bg-[#101118] text-white placeholder:text-white/30 outline-none focus:border-amber-500/50 transition"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {channels
                    .filter((c) => !channelFilter || c.name.toLowerCase().includes(channelFilter.toLowerCase()))
                    .map((c) => {
                      const isIgnored = ignoredChannels.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleToggleIgnoredChannel(c.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition flex items-center gap-1.5 ${
                            isIgnored
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-[#101118] text-white/50 border border-[#262838] hover:text-white hover:border-white/20'
                          }`}
                        >
                          <span>#{c.name}</span>
                          {isIgnored && <span className="text-[9px] font-bold text-amber-400">🚫</span>}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4 cols): Live Discord Preview */}
        <div className="lg:col-span-4 space-y-6">
          <div className="sticky top-20 space-y-4">
            <h3 className="text-xs font-bold text-white/70 uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={14} className="text-rose-400" />
              <span>Live Discord Log Preview</span>
            </h3>

            {/* Preview Embed Card */}
            <div className="rounded-2xl border border-[#232534] bg-[#161722] p-4 space-y-3 shadow-2xl">
              {/* Bot Header */}
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-rose-600 grid place-items-center text-white font-black text-xs">
                  U
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">Uranium Logger</span>
                    <span className="px-1 py-0.2 rounded text-[9px] font-black bg-[#5865F2] text-white uppercase">
                      APP
                    </span>
                  </div>
                  <span className="text-[10px] text-white/40">Today at 1:45 PM</span>
                </div>
              </div>

              {/* Log Embed Mockup */}
              <div className="rounded-xl border-l-4 border-l-rose-500 bg-[#101118] p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between font-bold text-rose-400 text-xs">
                  <span>Message Deleted</span>
                  <span className="text-[10px] font-mono text-white/30">#general</span>
                </div>
                <div className="space-y-1 text-white/80">
                  <p className="text-[11px] text-white/50">
                    <strong>Author:</strong> @member (ID: 4892837192)
                  </p>
                  <div className="p-2 rounded-lg bg-black/40 text-[11px] font-mono text-white/70 border border-white/5">
                    "Hey guys check out this link: discord.gg/example..."
                  </div>
                </div>
                <div className="pt-1 text-[10px] text-white/40 flex items-center justify-between border-t border-white/5">
                  <span>Channel: #general</span>
                  <span>Uranium Audit Log</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/5 bg-[#14151e] p-3 text-[11px] text-white/50 space-y-1">
              <span className="font-semibold text-white/70">Discord Slash Command:</span>
              <p className="font-mono text-rose-400">/log set-channel &nbsp;|&nbsp; /log enable</p>
              <p>Everything configured here syncs instantly with Discord in real time.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
