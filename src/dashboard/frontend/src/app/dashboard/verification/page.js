'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ShieldCheck,
  Save,
  Send,
  RefreshCw,
  Hash,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Palette,
  Check,
  Layers,
  Lock,
  UserCheck,
  UserX,
  Mail,
  Sliders,
  X
} from 'lucide-react';
import Toast from '@/components/Toast';

const PRESET_COLORS = [
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'Blurple', hex: '#5865f2' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Cyan', hex: '#06b6d4' },
  { name: 'Violet', hex: '#8b5cf6' }
];

export default function VerificationDashboardPage() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get('guild');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [toast, setToast] = useState(null);

  // Guild metadata
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [verifiedCount, setVerifiedCount] = useState(0);

  // Settings State
  const [config, setConfig] = useState({
    guild_id: guildId || '',
    channel_id: '',
    role_id: '',
    unverified_role_id: '',
    log_channel_id: '',
    embed_title: 'Verify Yourself',
    embed_message: 'Click the button below to verify yourself and gain access to the server.',
    embed_color: '#10b981',
    embed_image: '',
    embed_footer: 'Uranium Security Verification',
    type: 'button', // 'button' | 'otp'
    button_label: 'Verify',
    button_style: 'Success', // 'Success' | 'Primary' | 'Secondary' | 'Danger'
    button_emoji: '✅',
    send_dm: false,
    dm_message: 'You have been successfully verified in **{server}**!',
    enabled: true
  });

  // Interactive preview simulation states
  const [simulatedState, setSimulatedState] = useState('idle'); // 'idle' | 'verified' | 'otp_modal'
  const [simulatedOtp, setSimulatedOtp] = useState('');
  const [manualUserId, setManualUserId] = useState('');
  const [manualLoading, setManualLoading] = useState(false);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = useCallback(async () => {
    if (!guildId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/guild/${guildId}/verification`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to load verification config`);
      const data = await res.json();

      if (data.channels) setChannels(data.channels);
      if (data.roles) setRoles(data.roles);
      if (data.verifiedCount !== undefined) setVerifiedCount(data.verifiedCount);
      if (data.config) {
        setConfig(prev => ({
          ...prev,
          ...data.config,
          guild_id: guildId
        }));
      }
    } catch (err) {
      showToast(err.message || 'Error loading verification settings', 'error');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    if (!guildId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/guild/${guildId}/verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings');
      showToast('Verification settings saved successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Error saving settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!guildId) return;
    if (!config.channel_id) {
      showToast('Please select a target verification channel first.', 'error');
      return;
    }
    setPublishing(true);
    try {
      const res = await fetch(`/api/guild/${guildId}/verification/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to publish verification gate');
      showToast(data.message || 'Verification message published to channel!', 'success');
    } catch (err) {
      showToast(err.message || 'Error publishing verification message', 'error');
    } finally {
      setPublishing(false);
    }
  };

  const handleManualAction = async (action) => {
    if (!guildId || !manualUserId.trim()) {
      showToast('Enter a valid user ID first.', 'error');
      return;
    }
    setManualLoading(true);
    try {
      const res = await fetch(`/api/guild/${guildId}/verification/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: manualUserId.trim(), action })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user');
      showToast(data.message, 'success');
      setManualUserId('');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setManualLoading(false);
    }
  };

  const selectedRole = roles.find(r => r.id === config.role_id);
  const selectedUnverifiedRole = roles.find(r => r.id === config.unverified_role_id);
  const selectedChannel = channels.find(c => c.id === config.channel_id);

  // Button style class mapper for preview
  const getButtonClass = () => {
    switch (config.button_style) {
      case 'Primary':
        return 'bg-[#5865F2] hover:bg-[#4752c4] text-white';
      case 'Secondary':
        return 'bg-[#4e5058] hover:bg-[#6d6f78] text-white';
      case 'Danger':
        return 'bg-[#da373c] hover:bg-[#a12829] text-white';
      case 'Success':
      default:
        return 'bg-[#248046] hover:bg-[#1a6334] text-white';
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-rose-500" />
          <p className="text-sm font-semibold text-white/50">Loading Verification Center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e1017] text-[#f3f4f6] pb-32">
      {/* Toast Alert */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Top Header */}
      <div className="border-b border-white/5 bg-[#12141d]/80 backdrop-blur-md sticky top-0 z-30 px-6 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <ShieldCheck size={20} />
              </div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
                Server Verification
              </h1>
            </div>
            <p className="text-xs md:text-sm text-white/50 mt-1 max-w-2xl">
              Protect your community against bot raids and spam accounts with interactive 1-click or 2FA direct message OTP gates.
            </p>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePublish}
              disabled={publishing || !config.channel_id}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs transition shadow-lg shadow-emerald-600/25 disabled:opacity-40 disabled:pointer-events-none"
            >
              <Send size={14} className={publishing ? 'animate-spin' : ''} />
              <span>{publishing ? 'Publishing...' : 'Publish to Discord'}</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-bold text-xs transition shadow-lg shadow-rose-600/25 disabled:opacity-40 disabled:pointer-events-none"
            >
              <Save size={14} className={saving ? 'animate-spin' : ''} />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-8">
        {/* Main 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Form Controls (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Section 1: Verification Method */}
            <div className="rounded-2xl border border-white/10 bg-[#13151f] p-5 md:p-6 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2.5">
                  <KeyRound size={18} className="text-emerald-400" />
                  <h2 className="text-sm font-bold text-white">Verification Security Method</h2>
                </div>
                <span className="text-xs text-white/40">Select gate mechanism</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Method 1: Instant Button */}
                <button
                  type="button"
                  onClick={() => setConfig(c => ({ ...c, type: 'button' }))}
                  className={`text-left p-4 rounded-xl border transition ${
                    config.type === 'button'
                      ? 'border-emerald-500 bg-emerald-500/10 shadow-sm'
                      : 'border-white/5 bg-[#181a24] hover:bg-[#1d202e]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-white">One-Click Button</span>
                    {config.type === 'button' && <CheckCircle2 size={16} className="text-emerald-400" />}
                  </div>
                  <p className="text-[11px] text-white/50 leading-relaxed">
                    Users click a single verified button in the channel to immediately receive the member role.
                  </p>
                </button>

                {/* Method 2: OTP Challenge */}
                <button
                  type="button"
                  onClick={() => setConfig(c => ({ ...c, type: 'otp' }))}
                  className={`text-left p-4 rounded-xl border transition ${
                    config.type === 'otp'
                      ? 'border-emerald-500 bg-emerald-500/10 shadow-sm'
                      : 'border-white/5 bg-[#181a24] hover:bg-[#1d202e]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-white">2FA Direct Message OTP</span>
                    {config.type === 'otp' && <CheckCircle2 size={16} className="text-emerald-400" />}
                  </div>
                  <p className="text-[11px] text-white/50 leading-relaxed">
                    The bot sends a 5-character OTP code to member DMs. The member enters the code into a modal to prevent raid bots.
                  </p>
                </button>
              </div>
            </div>

            {/* Section 2: Channel Placement & Roles */}
            <div className="rounded-2xl border border-white/10 bg-[#13151f] p-5 md:p-6 shadow-md space-y-4">
              <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
                <Sliders size={18} className="text-emerald-400" />
                <h2 className="text-sm font-bold text-white">Channel & Role Assignment</h2>
              </div>

              <div className="space-y-4 pt-1">
                {/* Target Channel */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">
                    Verification Channel <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={config.channel_id || ''}
                      onChange={(e) => setConfig(c => ({ ...c, channel_id: e.target.value }))}
                      className="w-full bg-[#181a24] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 appearance-none"
                    >
                      <option value="">Select a text channel...</option>
                      {channels.map(ch => (
                        <option key={ch.id} value={ch.id}>
                          # {ch.name}
                        </option>
                      ))}
                    </select>
                    <Hash size={15} className="absolute right-3.5 top-3 text-white/40 pointer-events-none" />
                  </div>
                  <p className="text-[11px] text-white/40 mt-1">
                    The channel where Uranium will dispatch the interactive verification embed.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Verified Role */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">
                      Verified Role (Grant) <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={config.role_id || ''}
                      onChange={(e) => setConfig(c => ({ ...c, role_id: e.target.value }))}
                      className="w-full bg-[#181a24] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">Select verified role...</option>
                      {roles.map(r => (
                        <option key={r.id} value={r.id}>
                          @{r.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-white/40 mt-1">
                      Role assigned when the member passes verification.
                    </p>
                  </div>

                  {/* Unverified Role (Remove) */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">
                      Unverified Role (Remove)
                    </label>
                    <select
                      value={config.unverified_role_id || ''}
                      onChange={(e) => setConfig(c => ({ ...c, unverified_role_id: e.target.value }))}
                      className="w-full bg-[#181a24] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">None (Optional)</option>
                      {roles.map(r => (
                        <option key={r.id} value={r.id}>
                          @{r.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-white/40 mt-1">
                      Role automatically stripped once verified.
                    </p>
                  </div>
                </div>

                {/* Audit Log Channel */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">
                    Staff Audit Log Channel
                  </label>
                  <div className="relative">
                    <select
                      value={config.log_channel_id || ''}
                      onChange={(e) => setConfig(c => ({ ...c, log_channel_id: e.target.value }))}
                      className="w-full bg-[#181a24] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 appearance-none"
                    >
                      <option value="">None (Don't log)</option>
                      {channels.map(ch => (
                        <option key={ch.id} value={ch.id}>
                          # {ch.name}
                        </option>
                      ))}
                    </select>
                    <Hash size={15} className="absolute right-3.5 top-3 text-white/40 pointer-events-none" />
                  </div>
                  <p className="text-[11px] text-white/40 mt-1">
                    Logs member verifications, timestamps, and staff bypasses.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 3: Embed Customizer */}
            <div className="rounded-2xl border border-white/10 bg-[#13151f] p-5 md:p-6 shadow-md space-y-4">
              <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
                <Palette size={18} className="text-emerald-400" />
                <h2 className="text-sm font-bold text-white">Embed Appearance</h2>
              </div>

              <div className="space-y-4 pt-1">
                {/* Embed Title */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">
                    Embed Title
                  </label>
                  <input
                    type="text"
                    value={config.embed_title}
                    onChange={(e) => setConfig(c => ({ ...c, embed_title: e.target.value }))}
                    placeholder="Verify Yourself"
                    className="w-full bg-[#181a24] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Embed Message Description */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-white/60">
                      Embed Description
                    </label>
                    <span className="text-[11px] text-white/40">Markdown supported</span>
                  </div>
                  <textarea
                    rows={3}
                    value={config.embed_message}
                    onChange={(e) => setConfig(c => ({ ...c, embed_message: e.target.value }))}
                    placeholder="Click the button below to verify yourself and gain access to the server."
                    className="w-full bg-[#181a24] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>

                {/* Accent Color Palette */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">
                    Accent Color
                  </label>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {PRESET_COLORS.map(col => (
                      <button
                        key={col.hex}
                        type="button"
                        onClick={() => setConfig(c => ({ ...c, embed_color: col.hex }))}
                        className={`h-7 px-2.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition ${
                          config.embed_color?.toLowerCase() === col.hex.toLowerCase()
                            ? 'border-white text-white'
                            : 'border-white/10 text-white/60 hover:text-white'
                        }`}
                      >
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: col.hex }} />
                        <span>{col.name}</span>
                      </button>
                    ))}
                    <div className="flex items-center gap-2 bg-[#181a24] border border-white/10 rounded-lg px-2.5 py-1">
                      <input
                        type="color"
                        value={config.embed_color || '#10b981'}
                        onChange={(e) => setConfig(c => ({ ...c, embed_color: e.target.value }))}
                        className="h-5 w-5 bg-transparent border-0 cursor-pointer rounded"
                      />
                      <span className="text-xs font-mono text-white/70">{config.embed_color}</span>
                    </div>
                  </div>
                </div>

                {/* Embed Banner Image URL */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">
                    Banner Image URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={config.embed_image || ''}
                    onChange={(e) => setConfig(c => ({ ...c, embed_image: e.target.value }))}
                    placeholder="https://example.com/banner.png"
                    className="w-full bg-[#181a24] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Footer Text */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">
                    Footer Text
                  </label>
                  <input
                    type="text"
                    value={config.embed_footer || ''}
                    onChange={(e) => setConfig(c => ({ ...c, embed_footer: e.target.value }))}
                    placeholder="Uranium Security Verification"
                    className="w-full bg-[#181a24] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Action Button Customizer */}
            <div className="rounded-2xl border border-white/10 bg-[#13151f] p-5 md:p-6 shadow-md space-y-4">
              <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
                <Layers size={18} className="text-emerald-400" />
                <h2 className="text-sm font-bold text-white">Action Button Style</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                {/* Button Label */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">
                    Button Label
                  </label>
                  <input
                    type="text"
                    maxLength={30}
                    value={config.button_label}
                    onChange={(e) => setConfig(c => ({ ...c, button_label: e.target.value }))}
                    placeholder="Verify"
                    className="w-full bg-[#181a24] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Button Emoji */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">
                    Emoji
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={config.button_emoji}
                    onChange={(e) => setConfig(c => ({ ...c, button_emoji: e.target.value }))}
                    placeholder="✅"
                    className="w-full bg-[#181a24] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Button Style */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">
                    Color Style
                  </label>
                  <select
                    value={config.button_style}
                    onChange={(e) => setConfig(c => ({ ...c, button_style: e.target.value }))}
                    className="w-full bg-[#181a24] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Success">Success (Green)</option>
                    <option value="Primary">Primary (Blurple)</option>
                    <option value="Secondary">Secondary (Slate)</option>
                    <option value="Danger">Danger (Red)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 5: Direct Message Confirmation */}
            <div className="rounded-2xl border border-white/10 bg-[#13151f] p-5 md:p-6 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2.5">
                  <Mail size={18} className="text-emerald-400" />
                  <h2 className="text-sm font-bold text-white">Post-Verification Direct Message</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setConfig(c => ({ ...c, send_dm: !c.send_dm }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    config.send_dm ? 'bg-emerald-500' : 'bg-white/20'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                      config.send_dm ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {config.send_dm && (
                <div className="space-y-2 pt-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/60">
                    DM Message Text
                  </label>
                  <textarea
                    rows={2}
                    value={config.dm_message}
                    onChange={(e) => setConfig(c => ({ ...c, dm_message: e.target.value }))}
                    placeholder="You have been successfully verified in **{server}**!"
                    className="w-full bg-[#181a24] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
                  />
                  <p className="text-[11px] text-white/40">
                    Supports <span className="text-white/70">{'{server}'}</span>, <span className="text-white/70">{'{user}'}</span>, and <span className="text-white/70">{'{username}'}</span>.
                  </p>
                </div>
              )}
            </div>

            {/* Section 6: Staff Manual Actions */}
            <div className="rounded-2xl border border-white/10 bg-[#13151f] p-5 md:p-6 shadow-md space-y-4">
              <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
                <Shield size={18} className="text-emerald-400" />
                <h2 className="text-sm font-bold text-white">Staff Member Bypass & Revoke</h2>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                <input
                  type="text"
                  value={manualUserId}
                  onChange={(e) => setManualUserId(e.target.value)}
                  placeholder="Enter User Discord ID (e.g. 1234567890)"
                  className="flex-1 w-full bg-[#181a24] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleManualAction('verify')}
                    disabled={manualLoading || !manualUserId.trim()}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-bold text-xs transition disabled:opacity-40"
                  >
                    <UserCheck size={14} />
                    <span>Verify User</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleManualAction('unverify')}
                    disabled={manualLoading || !manualUserId.trim()}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 font-bold text-xs transition disabled:opacity-40"
                  >
                    <UserX size={14} />
                    <span>Revoke</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Interactive Discord Preview (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="sticky top-24 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-bold text-white/70 uppercase tracking-wider">
                    Live Discord Chat Preview
                  </h2>
                  <p className="text-[11px] text-white/40">Real-time reactive visual verification gate</p>
                </div>
                {simulatedState !== 'idle' && (
                  <button
                    type="button"
                    onClick={() => setSimulatedState('idle')}
                    className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1"
                  >
                    <X size={12} /> Reset Preview
                  </button>
                )}
              </div>

              {/* Discord Chat Box Frame */}
              <div className="rounded-2xl border border-[#232538] bg-[#1e1f29] overflow-hidden shadow-2xl">
                {/* Channel Header */}
                <div className="px-4 py-3 bg-[#181924] border-b border-[#292c3f] flex items-center gap-2 text-xs font-bold text-white/80">
                  <Hash size={15} className="text-white/40" />
                  <span>{selectedChannel?.name || 'verification-gate'}</span>
                </div>

                {/* Message Body */}
                <div className="p-4 space-y-3">
                  {/* Bot Header Row */}
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 shrink-0 rounded-full bg-rose-500 flex items-center justify-center text-white font-bold text-xs">
                      U
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">Uranium</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-[#5865F2] text-white tracking-wider uppercase">
                          APP
                        </span>
                        <span className="text-[10px] text-white/40">Today at 12:00 PM</span>
                      </div>

                      {/* Embed Container */}
                      <div
                        className="mt-2.5 rounded-lg border-l-4 bg-[#14151e] p-4 space-y-3 shadow-md"
                        style={{ borderLeftColor: config.embed_color || '#10b981' }}
                      >
                        {/* Embed Title */}
                        <h3 className="text-sm font-bold text-white tracking-tight">
                          {config.embed_title || 'Verify Yourself'}
                        </h3>

                        {/* Embed Description */}
                        <p className="text-xs text-white/70 whitespace-pre-wrap leading-relaxed">
                          {config.embed_message || 'Click the button below to verify yourself and gain access to the server.'}
                        </p>

                        {/* Optional Banner Image */}
                        {config.embed_image && config.embed_image.trim() && (
                          <div className="rounded-lg overflow-hidden border border-white/10 max-h-48 bg-[#0c0d13]">
                            <img
                              src={config.embed_image.trim()}
                              alt="Embed visual"
                              className="w-full h-full object-cover"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          </div>
                        )}

                        {/* Embed Footer */}
                        <div className="flex items-center gap-1.5 text-[10px] text-white/40 pt-1 border-t border-white/5">
                          <ShieldCheck size={11} className="text-emerald-400" />
                          <span>{config.embed_footer || 'Uranium Security Verification'}</span>
                        </div>
                      </div>

                      {/* Action Row Component */}
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (config.type === 'otp') {
                              setSimulatedState('otp_modal');
                            } else {
                              setSimulatedState('verified');
                            }
                          }}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition shadow-sm active:scale-95 ${getButtonClass()}`}
                        >
                          {config.button_emoji && <span>{config.button_emoji}</span>}
                          <span>{config.button_label || 'Verify'}</span>
                        </button>
                      </div>

                      {/* Interactive Simulation Feedback Alerts */}
                      {simulatedState === 'verified' && (
                        <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                            <span>
                              <strong>Simulated Member:</strong> You have been verified! Added{' '}
                              <span className="font-mono text-white">@{selectedRole?.name || 'Verified Member'}</span> role.
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSimulatedState('idle')}
                            className="text-emerald-400 hover:text-white ml-2"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}

                      {simulatedState === 'otp_modal' && (
                        <div className="mt-3 rounded-xl border border-blue-500/30 bg-[#161827] p-4 text-xs space-y-3 shadow-xl">
                          <div className="flex items-center justify-between border-b border-white/10 pb-2">
                            <span className="font-bold text-white flex items-center gap-1.5">
                              <KeyRound size={14} className="text-blue-400" /> Enter 5-Character OTP
                            </span>
                            <button
                              type="button"
                              onClick={() => setSimulatedState('idle')}
                              className="text-white/40 hover:text-white"
                            >
                              <X size={14} />
                            </button>
                          </div>
                          <p className="text-[11px] text-white/60">
                            Check your direct messages from Uranium for your 5-digit code (e.g. <code>A7X92</code>).
                          </p>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              maxLength={5}
                              value={simulatedOtp}
                              onChange={(e) => setSimulatedOtp(e.target.value.toUpperCase())}
                              placeholder="A7X92"
                              className="w-32 bg-[#0e1017] border border-white/15 rounded-lg px-3 py-1.5 font-mono text-center text-sm font-bold text-white tracking-widest uppercase outline-none focus:border-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setSimulatedState('verified');
                                setSimulatedOtp('');
                              }}
                              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
                            >
                              Submit
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Status & Diagnostics Card */}
              <div className="rounded-2xl border border-white/10 bg-[#13151f] p-4 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-white/50">Verified Role Target</span>
                  <span className="font-bold text-white">
                    {selectedRole ? `@${selectedRole.name}` : 'Not Selected'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/50">Channel Gate Destination</span>
                  <span className="font-bold text-white">
                    {selectedChannel ? `#${selectedChannel.name}` : 'Not Selected'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/50">Protection Mechanism</span>
                  <span className="font-bold text-emerald-400">
                    {config.type === 'otp' ? '2FA DM OTP Challenge' : 'One-Click Fast Pass'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
