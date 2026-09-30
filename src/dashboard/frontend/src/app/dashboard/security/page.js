'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Save,
  RefreshCw,
  UserPlus,
  Trash2,
  Hash,
  AlertTriangle,
  Activity,
  UserCheck,
  Sliders,
  Check,
  X
} from 'lucide-react';
import { toast } from 'sonner';

export default function SecurityDashboardPage() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get('guild');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newWhitelistId, setNewWhitelistId] = useState('');
  const [addingWhitelist, setAddingWhitelist] = useState(false);

  const [config, setConfig] = useState({
    enabled: false,
    punishment: 'ban',
    action_limit: 3,
    autorecovery: true,
    log_channel: null,
    features: {}
  });

  const [availableFeatures, setAvailableFeatures] = useState([]);
  const [whitelist, setWhitelist] = useState([]);
  const [recoveryLogs, setRecoveryLogs] = useState([]);
  const [textChannels, setTextChannels] = useState([]);

  const fetchSecurityData = async () => {
    if (!guildId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/guild/${guildId}/security`);
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config || {});
        setAvailableFeatures(data.availableFeatures || []);
        setWhitelist(data.whitelist || []);
        setRecoveryLogs(data.recoveryLogs || []);
        setTextChannels(data.textChannels || []);
      }
    } catch (err) {
      toast.error('Failed to load security settings: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, [guildId]);

  const handleSaveSettings = async () => {
    if (!guildId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/guild/${guildId}/security/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update settings');
      toast.success('Anti-Nuke settings saved successfully!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFeature = async (featureId, nextState) => {
    // Optimistic
    setConfig(prev => ({
      ...prev,
      features: { ...prev.features, [featureId]: nextState ? 1 : 0 }
    }));

    try {
      const res = await fetch(`/api/guild/${guildId}/security/feature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature: featureId, enabled: nextState })
      });
      if (!res.ok) throw new Error('Failed to toggle shield');
      toast.success(`${featureId.replace('_', ' ')} ${nextState ? 'enabled' : 'disabled'}.`);
    } catch (err) {
      toast.error(err.message);
      // Revert
      fetchSecurityData();
    }
  };

  const handleAddWhitelist = async () => {
    if (!newWhitelistId || !/^\d{17,20}$/.test(newWhitelistId)) {
      toast.error('Please enter a valid 17-20 digit Discord User ID.');
      return;
    }
    setAddingWhitelist(true);
    try {
      const res = await fetch(`/api/guild/${guildId}/security/whitelist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: newWhitelistId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add whitelist user');
      toast.success('User added to whitelist.');
      setNewWhitelistId('');
      await fetchSecurityData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAddingWhitelist(false);
    }
  };

  const handleRemoveWhitelist = async (userId) => {
    try {
      const res = await fetch(`/api/guild/${guildId}/security/whitelist/${userId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to remove whitelist user');
      toast.success('User removed from whitelist.');
      setWhitelist(prev => prev.filter(w => w.id !== userId));
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
          <span className="text-xs text-white/40">Loading server shields...</span>
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
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-red-500">Maximum Security</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white flex items-center gap-3">
            <Shield className="text-rose-500" size={32} />
            Anti-Nuke & Server Shield
          </h1>
          <p className="text-xs sm:text-sm text-white/50 mt-1">
            Defend against rogue staff, mass deletions, raid bots, and unauthorized server modifications.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchSecurityData}
            className="h-9 px-3.5 rounded-xl bg-[#181923] hover:bg-[#202230] border border-[#262838] text-xs font-semibold text-white/80 hover:text-white flex items-center gap-2 transition"
          >
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="h-9 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-xs font-bold text-white flex items-center gap-2 transition shadow-md shadow-rose-500/20"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            <span>Save Settings</span>
          </button>
        </div>
      </div>

      {/* Master Toggle Banner */}
      <div className={`rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
        config.enabled
          ? 'border-emerald-500/30 bg-emerald-500/10'
          : 'border-[#232534] bg-[#161722]'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`h-11 w-11 rounded-xl grid place-items-center shrink-0 ${
            config.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/40'
          }`}>
            <ShieldAlert size={22} />
          </div>
          <div>
            <span className="text-sm font-bold text-white">
              Anti-Nuke Master Defense {config.enabled ? 'Active' : 'Disabled'}
            </span>
            <p className="text-xs text-white/50 mt-0.5">
              {config.enabled
                ? 'High-speed monitoring active. Rogue actions exceeding limit will be instantly punished.'
                : 'Server is currently vulnerable to rogue administrator actions.'}
            </p>
          </div>
        </div>

        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={!!config.enabled}
            onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-12 h-6 bg-[#262838] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
        </label>
      </div>

      {/* Main Settings Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* General Config Card */}
          <div className="rounded-2xl border border-[#232534] bg-[#161722] p-5 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders size={16} className="text-rose-400" />
              Response & Punishment Rules
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-white/60">Punishment on Breach</label>
                <select
                  value={config.punishment}
                  onChange={(e) => setConfig({ ...config, punishment: e.target.value })}
                  className="mt-1.5 w-full h-10 rounded-xl border border-[#262838] bg-[#101118] px-3 text-xs text-white outline-none focus:border-rose-500 transition"
                >
                  <option value="ban">Instant Ban from Server</option>
                  <option value="kick">Kick from Server</option>
                  <option value="strip_roles">Strip All Roles & Permissions</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-white/60">
                  Action Threshold Limit ({config.action_limit} actions / 10s)
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={config.action_limit}
                  onChange={(e) => setConfig({ ...config, action_limit: parseInt(e.target.value, 10) || 3 })}
                  className="mt-1.5 w-full h-10 rounded-xl border border-[#262838] bg-[#101118] px-3 text-xs text-white outline-none focus:border-rose-500 transition"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-white/60 flex items-center gap-1.5">
                  <Hash size={13} className="text-blue-400" />
                  Security Alert Channel
                </label>
                <select
                  value={config.log_channel || ''}
                  onChange={(e) => setConfig({ ...config, log_channel: e.target.value || null })}
                  className="mt-1.5 w-full h-10 rounded-xl border border-[#262838] bg-[#101118] px-3 text-xs text-white outline-none focus:border-rose-500 transition"
                >
                  <option value="">None (Don't send alerts)</option>
                  {textChannels.map((c) => (
                    <option key={c.id} value={c.id}>#{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-[#101118] p-3 border border-[#262838] mt-auto">
                <div>
                  <span className="text-xs font-bold text-white">Auto-Recovery System</span>
                  <p className="text-[10px] text-white/40">Recreates deleted channels and roles automatically</p>
                </div>
                <input
                  type="checkbox"
                  checked={!!config.autorecovery}
                  onChange={(e) => setConfig({ ...config, autorecovery: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-700 text-rose-500 focus:ring-0"
                />
              </div>
            </div>
          </div>

          {/* Shields Grid */}
          <div className="rounded-2xl border border-[#232534] bg-[#161722] p-5 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-400" />
              Active Shield Protections
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableFeatures.map((feat) => {
                const isEnabled = config.features && (config.features[feat.id] === 1 || config.features[feat.id] === true);
                return (
                  <div
                    key={feat.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-[#232534] bg-[#101118] hover:border-[#2d3042] transition"
                  >
                    <div className="pr-3">
                      <p className="text-xs font-bold text-white">{feat.name}</p>
                      <p className="text-[10px] text-white/40 mt-0.5 line-clamp-1">{feat.description}</p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={!!isEnabled}
                        onChange={(e) => handleToggleFeature(feat.id, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-[#262838] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500" />
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Whitelist & Recovery Logs */}
        <div className="space-y-6">
          {/* Whitelist Card */}
          <div className="rounded-2xl border border-[#232534] bg-[#161722] p-5 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <UserCheck size={16} className="text-blue-400" />
              Immune Whitelist ({whitelist.length})
            </h2>
            <p className="text-[11px] text-white/50">
              Users on this list bypass all Anti-Nuke checks. Server owner is permanently immune.
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                value={newWhitelistId}
                onChange={(e) => setNewWhitelistId(e.target.value)}
                placeholder="User ID (e.g. 123456789...)"
                className="flex-1 h-9 rounded-xl border border-[#262838] bg-[#101118] px-3 text-xs text-white outline-none focus:border-rose-500 transition"
              />
              <button
                type="button"
                onClick={handleAddWhitelist}
                disabled={addingWhitelist}
                className="h-9 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-xs font-bold text-white flex items-center gap-1 transition shadow-sm"
              >
                <UserPlus size={13} />
                <span>Add</span>
              </button>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {whitelist.length === 0 ? (
                <p className="text-xs text-white/30 text-center py-4">No users whitelisted.</p>
              ) : (
                whitelist.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-[#101118] border border-[#232534]"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {w.avatar ? (
                        <img src={w.avatar} alt="" className="h-6 w-6 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-white/10 grid place-items-center text-[10px] text-white/60">
                          ?
                        </div>
                      )}
                      <div className="truncate">
                        <p className="text-xs font-semibold text-white truncate">{w.displayName || w.username}</p>
                        <p className="text-[10px] text-white/40 font-mono">{w.id}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveWhitelist(w.id)}
                      className="p-1 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recovery Logs */}
          <div className="rounded-2xl border border-[#232534] bg-[#161722] p-5 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity size={16} className="text-rose-400" />
              Recent Incidents & Recovery
            </h2>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 text-xs text-white/70">
              {recoveryLogs.length === 0 ? (
                <p className="text-xs text-white/30 text-center py-4">No recent security incidents logged.</p>
              ) : (
                recoveryLogs.map((log, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-[#101118] border border-[#232534] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-red-400 uppercase text-[10px] tracking-wider">
                        {log.action}
                      </span>
                      <span className="text-[10px] text-white/40">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-white/60 font-mono">Target: {log.target_id || 'System'}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
