'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Ticket,
  Plus,
  Trash2,
  Save,
  Send,
  CheckCircle2,
  XCircle,
  FolderOpen,
  Hash,
  Shield,
  RefreshCw,
  ExternalLink,
  Layers,
  Archive,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

export default function TicketsDashboardPage() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get('guild');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('panels'); // 'panels' | 'config' | 'tickets'

  // Data states
  const [config, setConfig] = useState({
    setup_channel_id: '',
    transcript_channel_id: '',
    open_category_id: '',
    closed_category_id: '',
    archive_category_id: '',
    support_role_id: ''
  });
  const [panels, setPanels] = useState([]);
  const [ticketsList, setTicketsList] = useState([]);
  const [stats, setStats] = useState({ total: 0, open: 0, closed: 0 });
  const [channels, setChannels] = useState([]);
  const [categories, setCategories] = useState([]);
  const [roles, setRoles] = useState([]);

  // New panel modal state
  const [newPanel, setNewPanel] = useState({
    title: 'Support Ticket System',
    description: 'Need help from our team? Click the button below to open a private ticket.',
    buttonLabel: 'Create Ticket',
    buttonEmoji: '📩',
    buttonColor: 'Primary',
    channelId: '',
    categoryId: ''
  });
  const [deployingPanel, setDeployingPanel] = useState(false);

  const fetchTicketsData = async () => {
    if (!guildId) return;
    try {
      setLoading(true);
      const [ticketsRes, listRes] = await Promise.all([
        fetch(`/api/guild/${guildId}/tickets`),
        fetch(`/api/guild/${guildId}/tickets/list`)
      ]);

      if (ticketsRes.ok) {
        const data = await ticketsRes.json();
        setConfig({
          setup_channel_id: data.config?.setup_channel_id || '',
          transcript_channel_id: data.config?.transcript_channel_id || '',
          open_category_id: data.config?.open_category_id || '',
          closed_category_id: data.config?.closed_category_id || '',
          archive_category_id: data.config?.archive_category_id || '',
          support_role_id: data.config?.support_role_id || ''
        });
        setPanels(data.panels || []);
        setStats(data.stats || { total: 0, open: 0, closed: 0 });
        setChannels(data.channels || []);
        setCategories(data.categories || []);
        setRoles(data.roles || []);

        if (data.channels?.length && !newPanel.channelId) {
          setNewPanel(prev => ({ ...prev, channelId: data.channels[0].id }));
        }
      }

      if (listRes.ok) {
        const listData = await listRes.json();
        setTicketsList(listData.tickets || []);
      }
    } catch (err) {
      toast.error('Failed to load tickets configuration: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicketsData();
  }, [guildId]);

  const handleSaveConfig = async () => {
    if (!guildId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/guild/${guildId}/tickets/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update config');
      toast.success('Ticket configuration saved successfully!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeployPanel = async () => {
    if (!guildId || !newPanel.channelId) {
      toast.error('Please select a target Discord channel.');
      return;
    }
    setDeployingPanel(true);
    try {
      const res = await fetch(`/api/guild/${guildId}/tickets/panel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPanel)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to deploy panel');
      toast.success(data.message || 'Ticket panel deployed to channel!');
      await fetchTicketsData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeployingPanel(false);
    }
  };

  const handleDeletePanel = async (panelId) => {
    if (!confirm('Are you sure you want to delete this ticket panel?')) return;
    try {
      const res = await fetch(`/api/guild/${guildId}/tickets/panel/${panelId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete panel');
      toast.success('Panel removed.');
      setPanels(prev => prev.filter(p => p.id !== panelId));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleCloseTicket = async (ticketId) => {
    try {
      const res = await fetch(`/api/guild/${guildId}/tickets/close/${ticketId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Closed via Web Dashboard' })
      });
      if (!res.ok) throw new Error('Failed to close ticket');
      toast.success(`Ticket #${ticketId} closed.`);
      await fetchTicketsData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
          <span className="text-xs text-white/40">Loading ticket system...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1f212d] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-rose-500">Support Suite</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white flex items-center gap-3">
            <Ticket className="text-rose-500" size={32} />
            Ticket System
          </h1>
          <p className="text-xs sm:text-sm text-white/50 mt-1">
            Deploy interactive ticket panels, assign staff support roles, and manage private support channels.
          </p>
        </div>

        <button
          onClick={fetchTicketsData}
          className="self-start sm:self-auto h-9 px-3.5 rounded-xl bg-[#181923] hover:bg-[#202230] border border-[#262838] text-xs font-semibold text-white/80 hover:text-white flex items-center gap-2 transition"
        >
          <RefreshCw size={13} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats Counter */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[#232534] bg-[#161722] p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Total Tickets Created</p>
            <p className="text-2xl font-black text-white mt-1">{stats.total}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 grid place-items-center text-blue-400">
            <Ticket size={20} />
          </div>
        </div>

        <div className="rounded-2xl border border-[#232534] bg-[#161722] p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Currently Open</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">{stats.open}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 grid place-items-center text-emerald-400">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="rounded-2xl border border-[#232534] bg-[#161722] p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Archived & Closed</p>
            <p className="text-2xl font-black text-white/70 mt-1">{stats.closed}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 grid place-items-center text-purple-400">
            <Archive size={20} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#1f212d] pb-2">
        {[
          { id: 'panels', label: 'Ticket Panels & Deployment', icon: Layers },
          { id: 'config', label: 'Categories & Roles Setup', icon: Shield },
          { id: 'tickets', label: 'Live Tickets Stream', icon: Clock }
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
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

      {/* TAB 1: PANELS */}
      {activeTab === 'panels' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Creator Form */}
          <div className="lg:col-span-1 rounded-2xl border border-[#232534] bg-[#161722] p-5 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Plus size={16} className="text-rose-400" />
              Deploy New Panel
            </h2>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-white/60">Target Channel</label>
                <select
                  value={newPanel.channelId}
                  onChange={e => setNewPanel({ ...newPanel, channelId: e.target.value })}
                  className="mt-1 w-full h-9 rounded-xl border border-[#262838] bg-[#101118] px-3 text-xs text-white outline-none focus:border-rose-500 transition"
                >
                  <option value="">Select a channel...</option>
                  {channels.map(c => (
                    <option key={c.id} value={c.id}>#{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-white/60">Panel Embed Title</label>
                <input
                  type="text"
                  value={newPanel.title}
                  onChange={e => setNewPanel({ ...newPanel, title: e.target.value })}
                  placeholder="Need Support?"
                  className="mt-1 w-full h-9 rounded-xl border border-[#262838] bg-[#101118] px-3 text-xs text-white outline-none focus:border-rose-500 transition"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-white/60">Panel Description</label>
                <textarea
                  rows={3}
                  value={newPanel.description}
                  onChange={e => setNewPanel({ ...newPanel, description: e.target.value })}
                  placeholder="Click the button below to reach our staff team..."
                  className="mt-1 w-full rounded-xl border border-[#262838] bg-[#101118] p-3 text-xs text-white outline-none focus:border-rose-500 transition resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-white/60">Button Label</label>
                  <input
                    type="text"
                    value={newPanel.buttonLabel}
                    onChange={e => setNewPanel({ ...newPanel, buttonLabel: e.target.value })}
                    className="mt-1 w-full h-9 rounded-xl border border-[#262838] bg-[#101118] px-3 text-xs text-white outline-none focus:border-rose-500 transition"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-white/60">Button Emoji</label>
                  <input
                    type="text"
                    value={newPanel.buttonEmoji}
                    onChange={e => setNewPanel({ ...newPanel, buttonEmoji: e.target.value })}
                    className="mt-1 w-full h-9 rounded-xl border border-[#262838] bg-[#101118] px-3 text-xs text-white outline-none focus:border-rose-500 transition text-center"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-white/60">Button Theme</label>
                <select
                  value={newPanel.buttonColor}
                  onChange={e => setNewPanel({ ...newPanel, buttonColor: e.target.value })}
                  className="mt-1 w-full h-9 rounded-xl border border-[#262838] bg-[#101118] px-3 text-xs text-white outline-none focus:border-rose-500 transition"
                >
                  <option value="Primary">Blurple / Indigo (Primary)</option>
                  <option value="Success">Emerald Green (Success)</option>
                  <option value="Secondary">Steel Gray (Secondary)</option>
                  <option value="Danger">Crimson Red (Danger)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleDeployPanel}
                disabled={deployingPanel || !newPanel.channelId}
                className="w-full h-10 mt-2 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-xs font-bold text-white flex items-center justify-center gap-2 transition shadow-lg shadow-rose-500/20"
              >
                {deployingPanel ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                <span>Deploy Panel to Discord</span>
              </button>
            </div>
          </div>

          {/* Active Panels List */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers size={16} className="text-rose-400" />
              Active Panels ({panels.length})
            </h2>

            {panels.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#232534] bg-[#161722]/50 p-8 text-center text-white/40 space-y-2">
                <Ticket className="mx-auto h-8 w-8 opacity-40" />
                <p className="text-xs">No ticket panels deployed yet. Use the form on the left to deploy your first panel!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {panels.map(panel => {
                  const targetChannel = channels.find(c => c.id === panel.channel_id);
                  return (
                    <div key={panel.id} className="rounded-2xl border border-[#232534] bg-[#161722] p-4 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-bold text-white/70">
                            #{targetChannel?.name || panel.channel_id}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeletePanel(panel.id)}
                            className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <h3 className="text-sm font-bold text-white mt-2">{panel.title}</h3>
                        <p className="text-xs text-white/50 line-clamp-2 mt-1">{panel.description}</p>
                      </div>

                      <div className="pt-2 border-t border-[#1f212d] flex items-center justify-between text-[11px] text-white/40">
                        <span>Button: {panel.button_label}</span>
                        <span>ID #{panel.id}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CONFIGURATION */}
      {activeTab === 'config' && (
        <div className="max-w-2xl rounded-2xl border border-[#232534] bg-[#161722] p-6 space-y-5">
          <div>
            <h2 className="text-sm font-bold text-white">System Categories & Staff Permission</h2>
            <p className="text-xs text-white/50 mt-0.5">Define where tickets are created, archived, and who can access them.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-white/70 flex items-center gap-1.5">
                <FolderOpen size={14} className="text-rose-400" />
                Open Tickets Category
              </label>
              <select
                value={config.open_category_id}
                onChange={e => setConfig({ ...config, open_category_id: e.target.value })}
                className="mt-1.5 w-full h-10 rounded-xl border border-[#262838] bg-[#101118] px-3 text-xs text-white outline-none focus:border-rose-500 transition"
              >
                <option value="">None (Root Channel)</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>📂 {c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-white/70 flex items-center gap-1.5">
                <Archive size={14} className="text-purple-400" />
                Closed Tickets Category
              </label>
              <select
                value={config.closed_category_id}
                onChange={e => setConfig({ ...config, closed_category_id: e.target.value })}
                className="mt-1.5 w-full h-10 rounded-xl border border-[#262838] bg-[#101118] px-3 text-xs text-white outline-none focus:border-rose-500 transition"
              >
                <option value="">None</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>📂 {c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-white/70 flex items-center gap-1.5">
                <Hash size={14} className="text-blue-400" />
                Transcripts Log Channel
              </label>
              <select
                value={config.transcript_channel_id}
                onChange={e => setConfig({ ...config, transcript_channel_id: e.target.value })}
                className="mt-1.5 w-full h-10 rounded-xl border border-[#262838] bg-[#101118] px-3 text-xs text-white outline-none focus:border-rose-500 transition"
              >
                <option value="">None (Don't save transcripts)</option>
                {channels.map(c => (
                  <option key={c.id} value={c.id}>#{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-white/70 flex items-center gap-1.5">
                <Shield size={14} className="text-emerald-400" />
                Support Staff Role
              </label>
              <select
                value={config.support_role_id}
                onChange={e => setConfig({ ...config, support_role_id: e.target.value })}
                className="mt-1.5 w-full h-10 rounded-xl border border-[#262838] bg-[#101118] px-3 text-xs text-white outline-none focus:border-rose-500 transition"
              >
                <option value="">None (Server Admins Only)</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>@{r.name}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleSaveConfig}
              disabled={saving}
              className="h-10 px-6 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-xs font-bold text-white flex items-center gap-2 transition shadow-md shadow-rose-500/20"
            >
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              <span>Save System Settings</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: LIVE TICKETS */}
      {activeTab === 'tickets' && (
        <div className="rounded-2xl border border-[#232534] bg-[#161722] p-5 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock size={16} className="text-rose-400" />
            Server Tickets List ({ticketsList.length})
          </h2>

          {ticketsList.length === 0 ? (
            <div className="py-12 text-center text-white/40 text-xs">
              No tickets recorded for this server yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-white/70">
                <thead className="border-b border-[#232534] text-[11px] font-bold text-white/40 uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Ticket ID</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Creator User</th>
                    <th className="py-2.5 px-3">Channel ID</th>
                    <th className="py-2.5 px-3">Created Date</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f212d]">
                  {ticketsList.map(t => (
                    <tr key={t.id} className="hover:bg-white/5 transition">
                      <td className="py-2.5 px-3 font-mono font-bold text-white">#{t.id}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          t.status === 'open'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-white/5 text-white/50 border border-white/10'
                        }`}>
                          {t.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono">{t.user_id}</td>
                      <td className="py-2.5 px-3 font-mono text-white/50">{t.channel_id}</td>
                      <td className="py-2.5 px-3 text-white/50">
                        {new Date(t.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {t.status === 'open' && (
                          <button
                            type="button"
                            onClick={() => handleCloseTicket(t.id)}
                            className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[11px] font-bold transition"
                          >
                            Close Ticket
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
