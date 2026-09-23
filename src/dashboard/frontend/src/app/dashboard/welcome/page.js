'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Save,
  RefreshCw,
  Send,
  MessageSquare,
  Mail,
  UserPlus,
  UserMinus,
  ShieldCheck,
  Palette,
  Layers,
  Type,
  Image as ImageIcon,
  Sliders,
  ChevronDown,
  ChevronUp,
  Hash,
  AlertCircle,
  CheckCircle2,
  X,
  Eye,
  Info
} from 'lucide-react';
import Toast from '@/components/Toast';

const PRESET_THEMES = [
  { id: 'modern_obsidian', name: 'Modern Obsidian', gradient: 'from-[#0f111a] via-[#161926] to-[#0a0c12]', border: '#f43f5e' },
  { id: 'cyberpunk', name: 'Cyberpunk Neon', gradient: 'from-[#05051a] via-[#1e0836] to-[#032030]', border: '#06b6d4' },
  { id: 'cosmic_aurora', name: 'Cosmic Aurora', gradient: 'from-[#0a0520] via-[#1d0b38] to-[#0a1f33]', border: '#a855f7' },
  { id: 'minimal_frosted', name: 'Minimal Frosted', gradient: 'from-[#14161f] via-[#1a1d29] to-[#12131c]', border: '#94a3b8' },
  { id: 'golden_royale', name: 'Golden Royale', gradient: 'from-[#141005] via-[#261d08] to-[#0d0a03]', border: '#f59e0b' },
  { id: 'emerald_horizon', name: 'Emerald Horizon', gradient: 'from-[#03140f] via-[#06261c] to-[#020d0a]', border: '#10b981' }
];

const PRESET_TEXT_COLORS = [
  '#FFFFFF', '#F8FAFC', '#06B6D4', '#F59E0B', '#F43F5E', '#10B981', '#A855F7', '#EC4899', '#3B82F6'
];

const PRESET_BG_COLORS = [
  '#0B0D14', '#0F172A', '#18181B', '#1E1B4B', '#2E1065', '#064E3B', '#1C1917', '#030712'
];

const FONT_OPTIONS = [
  { id: 'Segoe UI, Arial, sans-serif', name: 'Modern Clean (Segoe / Sans)' },
  { id: 'Outfit, Arial, sans-serif', name: 'Outfit (Sleek Rounded)' },
  { id: 'Georgia, serif', name: 'Editorial Serif (Georgia)' },
  { id: 'Courier New, monospace', name: 'Terminal Mono (Courier)' }
];

export default function WelcomeGoodbyePage() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get('guild');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('welcome'); // 'welcome' | 'goodbye' | 'card' | 'autorole'
  const [serverPreviewUrl, setServerPreviewUrl] = useState(null);
  const [renderingPreview, setRenderingPreview] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testType, setTestType] = useState('welcome');
  const [roleSearch, setRoleSearch] = useState('');
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  // Settings State matching MEE6
  const [settings, setSettings] = useState({
    active: true,
    // Join Message Section
    sendWelcomeMessage: true,
    welcomeChannelId: '',
    welcomeMessageType: 'text',
    welcomeMessage: 'Hey {user}, welcome to **{server}**! 🥰 Hope you enjoy your stay!\nWe now have {server.member_count} members.',
    sendWelcomeCard: true,
    welcomeEmbed: {
      title: 'Welcome to {server}!',
      description: 'Hey {user}, welcome to our server! Make sure to read the rules and have fun.',
      color: '#f43f5e'
    },
    // Welcome Card Customizer (100% Free)
    welcomeCardConfig: {
      font: 'Segoe UI, Arial, sans-serif',
      textColor: '#FFFFFF',
      backgroundColor: '#0B0D14',
      overlayOpacity: 0.75,
      theme: 'modern_obsidian',
      backgroundUrl: '',
      titleTemplate: '{user} just joined the server',
      subtitleTemplate: 'Member #{count}'
    },
    // Direct Message Section
    sendWelcomeDm: false,
    welcomeDmMessageType: 'text',
    welcomeDmMessage: 'Hey {username}, thank you for joining **{server}**! Enjoy your stay.',
    sendWelcomeDmCard: false,
    // Autorole Section
    autorolesEnabled: false,
    autoroleIds: [],
    // Goodbye Section
    sendGoodbyeMessage: false,
    goodbyeChannelId: '',
    goodbyeMessageType: 'text',
    goodbyeMessage: '**{username}** just left the server 😭 Hope it is a dream! We now have {server.member_count} members!',
    sendGoodbyeCard: false,
    goodbyeEmbed: {
      title: 'Goodbye!',
      description: '**{username}** has departed from **{server}**.',
      color: '#64748b'
    }
  });

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Load guild data and welcome settings
  const loadData = useCallback(async () => {
    if (!guildId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/guild/${guildId}/welcome-goodbye`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch configuration`);
      const data = await res.json();

      if (data.channels) setChannels(data.channels);
      if (data.roles) setRoles(data.roles);
      if (data.settings) {
        setSettings(prev => ({
          ...prev,
          ...data.settings,
          welcomeCardConfig: {
            ...prev.welcomeCardConfig,
            ...(data.settings.welcomeCardConfig || {})
          },
          welcomeEmbed: {
            ...prev.welcomeEmbed,
            ...(data.settings.welcomeEmbed || {})
          },
          goodbyeEmbed: {
            ...prev.goodbyeEmbed,
            ...(data.settings.goodbyeEmbed || {})
          }
        }));
      }
    } catch (err) {
      showToast(err.message || 'Error loading settings', 'error');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Request actual server-rendered canvas preview
  const fetchServerCanvasPreview = async (customConfig) => {
    if (!guildId) return;
    setRenderingPreview(true);
    try {
      const res = await fetch(`/api/guild/${guildId}/welcome-goodbye/render-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardConfig: customConfig || settings.welcomeCardConfig,
          isGoodbye: testType === 'goodbye'
        })
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setServerPreviewUrl(url);
      }
    } catch (err) {
      console.warn('Preview render error:', err);
    } finally {
      setRenderingPreview(false);
    }
  };

  // Save changes to backend
  const handleSave = async () => {
    if (!guildId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/guild/${guildId}/welcome-goodbye`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save configuration');
      showToast('Welcome & Goodbye configuration saved successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Error saving settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Trigger test message in Discord
  const handleSendTest = async (typeToTest) => {
    if (!guildId) return;
    setTesting(true);
    try {
      const res = await fetch(`/api/guild/${guildId}/welcome-goodbye/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: typeToTest,
          channelId: typeToTest === 'goodbye' ? settings.goodbyeChannelId : settings.welcomeChannelId
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send test message');
      showToast(data.message || `Test ${typeToTest} message dispatched!`, 'success');
      setShowTestModal(false);
    } catch (err) {
      showToast(err.message || 'Failed to trigger test message', 'error');
    } finally {
      setTesting(false);
    }
  };

  // Quick insertion of placeholder tags into textarea
  const insertTag = (field, tag) => {
    setSettings(prev => {
      const current = prev[field] || '';
      return { ...prev, [field]: current + tag };
    });
  };

  // Toggle role selection in autoroles
  const toggleRole = (roleId) => {
    setSettings(prev => {
      const current = prev.autoroleIds || [];
      if (current.includes(roleId)) {
        return { ...prev, autoroleIds: current.filter(id => id !== roleId) };
      } else {
        return { ...prev, autoroleIds: [...current, roleId] };
      }
    });
  };

  const cardCfg = settings.welcomeCardConfig;
  const currentTheme = PRESET_THEMES.find(t => t.id === cardCfg.theme) || PRESET_THEMES[0];

  // Filtered roles for autorole selector
  const filteredRoles = useMemo(() => {
    return roles.filter(r => r.name.toLowerCase().includes(roleSearch.toLowerCase()));
  }, [roles, roleSearch]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-rose-500" />
          <p className="text-sm font-semibold text-white/50">Loading Welcome & Goodbye Suite...</p>
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
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-rose-500/20 to-indigo-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <UserPlus size={20} />
              </div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
                Welcome & Goodbye
              </h1>
            </div>
            <p className="text-xs md:text-sm text-white/50 mt-1 max-w-2xl">
              Automatically send messages, render custom welcome cards, assign autoroles on join, and send departure notices when members leave.
            </p>
          </div>

          {/* Master Active Switch */}
          <div className="flex items-center gap-3 bg-[#181a24] border border-white/10 px-4 py-2.5 rounded-2xl shadow-lg">
            <span className="text-xs font-bold text-white/80">Active</span>
            <button
              type="button"
              onClick={() => setSettings(s => ({ ...s, active: !s.active }))}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.active ? 'bg-blue-500' : 'bg-white/20'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  settings.active ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`text-xs font-black uppercase ${settings.active ? 'text-blue-400' : 'text-white/40'}`}>
              {settings.active ? 'ON' : 'OFF'}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-6">

        {/* ========================================================================= */}
        {/* SECTION 1: Send a message when a user joins the server */}
        {/* ========================================================================= */}
        <div className="rounded-2xl border border-white/10 bg-[#13151f] p-5 md:p-6 shadow-md space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <MessageSquare size={19} />
              </div>
              <h2 className="text-base font-bold text-white">Send a message when a user joins the server</h2>
            </div>
            <button
              type="button"
              onClick={() => setSettings(s => ({ ...s, sendWelcomeMessage: !s.sendWelcomeMessage }))}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                settings.sendWelcomeMessage ? 'bg-blue-500' : 'bg-white/20'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                  settings.sendWelcomeMessage ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {settings.sendWelcomeMessage && (
            <div className="space-y-4 pt-2 border-t border-white/5">
              {/* Channel Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">
                  Welcome Message Channel <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={settings.welcomeChannelId || ''}
                    onChange={(e) => setSettings(s => ({ ...s, welcomeChannelId: e.target.value }))}
                    className="w-full bg-[#181a24] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500 appearance-none"
                  >
                    <option value="">Select a text channel...</option>
                    {channels.map(ch => (
                      <option key={ch.id} value={ch.id}>
                        # {ch.name}
                      </option>
                    ))}
                  </select>
                  <Hash size={16} className="absolute right-3.5 top-3.5 text-white/40 pointer-events-none" />
                </div>
              </div>

              {/* Mode Tabs: Text / Embed */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSettings(s => ({ ...s, welcomeMessageType: 'text' }))}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                    settings.welcomeMessageType === 'text'
                      ? 'bg-[#222533] text-white border border-white/20'
                      : 'text-white/50 hover:text-white bg-transparent'
                  }`}
                >
                  Text message
                </button>
                <button
                  type="button"
                  onClick={() => setSettings(s => ({ ...s, welcomeMessageType: 'embed' }))}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                    settings.welcomeMessageType === 'embed'
                      ? 'bg-[#222533] text-white border border-white/20'
                      : 'text-white/50 hover:text-white bg-transparent'
                  }`}
                >
                  Embed message
                </button>
              </div>

              {/* Textarea or Embed Fields */}
              {settings.welcomeMessageType === 'embed' ? (
                <div className="space-y-3 bg-[#181a24] p-4 rounded-xl border border-white/10">
                  <div>
                    <label className="text-xs font-semibold text-white/60">Embed Title</label>
                    <input
                      type="text"
                      value={settings.welcomeEmbed.title}
                      onChange={(e) => setSettings(s => ({ ...s, welcomeEmbed: { ...s.welcomeEmbed, title: e.target.value } }))}
                      className="w-full mt-1 bg-[#12141e] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                      placeholder="Welcome to {server}!"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-white/60">Embed Description</label>
                    <textarea
                      rows={3}
                      value={settings.welcomeEmbed.description}
                      onChange={(e) => setSettings(s => ({ ...s, welcomeEmbed: { ...s.welcomeEmbed, description: e.target.value } }))}
                      className="w-full mt-1 bg-[#12141e] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-semibold text-white/60">Color</label>
                    <input
                      type="color"
                      value={settings.welcomeEmbed.color || '#f43f5e'}
                      onChange={(e) => setSettings(s => ({ ...s, welcomeEmbed: { ...s.welcomeEmbed, color: e.target.value } }))}
                      className="h-8 w-14 rounded cursor-pointer bg-transparent border-0"
                    />
                    <span className="text-xs font-mono text-white/60">{settings.welcomeEmbed.color}</span>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="relative">
                    <textarea
                      rows={4}
                      value={settings.welcomeMessage}
                      maxLength={2000}
                      onChange={(e) => setSettings(s => ({ ...s, welcomeMessage: e.target.value }))}
                      className="w-full bg-[#181a24] border border-white/10 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-rose-500 font-sans"
                    />
                    <div className="absolute right-3 bottom-3 text-[11px] font-mono text-white/40">
                      {settings.welcomeMessage.length} / 2000
                    </div>
                  </div>

                  {/* Variable Helper Chips */}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-[11px] font-semibold text-white/40 mr-1">Insert Variable:</span>
                    {[
                      { tag: '{user}', label: '@user' },
                      { tag: '{username}', label: 'username' },
                      { tag: '{server}', label: 'server name' },
                      { tag: '{server.member_count}', label: 'member count' },
                      { tag: '{member_number_ordinal}', label: 'ordinal (50th)' }
                    ].map(v => (
                      <button
                        key={v.tag}
                        type="button"
                        onClick={() => insertTag('welcomeMessage', v.tag)}
                        className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 text-[11px] font-mono transition"
                      >
                        {v.tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Toggle: Send Welcome Card */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-semibold text-white/90">
                  Send a welcome card when a user joins the server
                </span>
                <button
                  type="button"
                  onClick={() => setSettings(s => ({ ...s, sendWelcomeCard: !s.sendWelcomeCard }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    settings.sendWelcomeCard ? 'bg-blue-500' : 'bg-white/20'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                      settings.sendWelcomeCard ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Card Preview Banner within Welcome Section */}
              {settings.sendWelcomeCard && (
                <div className="mt-3 rounded-xl border border-white/10 bg-[#0d0f17] p-4 flex flex-col items-center justify-center">
                  <div className="text-xs font-bold text-white/40 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                    <Eye size={13} /> Welcome Card Preview
                  </div>
                  {/* Visual Rendered Card Component */}
                  <div
                    className="relative w-full max-w-xl aspect-[1024/500] rounded-2xl overflow-hidden border shadow-2xl flex flex-col items-center justify-center p-6 text-center transition-all"
                    style={{
                      backgroundColor: cardCfg.backgroundColor || '#0B0D14',
                      borderColor: currentTheme.border,
                      fontFamily: cardCfg.font || 'Segoe UI, sans-serif',
                      color: cardCfg.textColor || '#FFFFFF'
                    }}
                  >
                    {/* Theme Background Gradient Layer */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${currentTheme.gradient}`} />

                    {/* Dark Overlay Opacity */}
                    <div
                      className="absolute inset-0 bg-black pointer-events-none"
                      style={{ opacity: 1 - (cardCfg.overlayOpacity ?? 0.75) }}
                    />

                    {/* Custom Image Layer if provided */}
                    {cardCfg.backgroundUrl && (
                      <div
                        className="absolute inset-0 bg-cover bg-center pointer-events-none"
                        style={{
                          backgroundImage: `url(${cardCfg.backgroundUrl})`,
                          opacity: cardCfg.overlayOpacity ?? 0.75
                        }}
                      />
                    )}

                    {/* Content Layer */}
                    <div className="relative z-10 flex flex-col items-center">
                      <div className="relative mb-3">
                        <div
                          className="h-20 w-20 md:h-24 md:w-24 rounded-full overflow-hidden border-4 shadow-xl"
                          style={{ borderColor: currentTheme.border }}
                        >
                          <img
                            src="https://cdn.discordapp.com/embed/avatars/0.png"
                            alt="avatar"
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-black" />
                      </div>

                      <h3 className="text-lg md:text-xl font-bold tracking-tight drop-shadow-md">
                        {cardCfg.titleTemplate
                          ?.replace('{user}', 'shahrib')
                          ?.replace('{username}', 'shahrib') || 'shahrib just joined the server'}
                      </h3>

                      <p className="text-xs md:text-sm font-semibold opacity-75 mt-1 drop-shadow">
                        {cardCfg.subtitleTemplate
                          ?.replace('{count}', '50')
                          ?.replace('{server}', 'Server') || 'Member #50'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* SECTION 2: Customize your welcome card (Unlocked 100% Free) */}
        {/* ========================================================================= */}
        <div className="rounded-2xl border border-white/10 bg-[#13151f] p-5 md:p-6 shadow-md space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-white/5 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Palette size={20} className="text-rose-400" />
                <h2 className="text-base font-bold text-white">Customize your welcome card</h2>
              </div>
              <p className="text-xs text-white/40 mt-0.5">
                Fine-tune fonts, color palettes, background themes, opacity, and template titles
              </p>
            </div>

            <button
              type="button"
              onClick={() => fetchServerCanvasPreview()}
              disabled={renderingPreview}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white/80 transition"
            >
              <RefreshCw size={13} className={renderingPreview ? 'animate-spin text-rose-400' : ''} />
              {renderingPreview ? 'Rendering...' : 'Render High-Res Canvas'}
            </button>
          </div>

          {/* Theme Presets Grid */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2.5">
              Card Theme Presets
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
              {PRESET_THEMES.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSettings(s => ({
                    ...s,
                    welcomeCardConfig: { ...s.welcomeCardConfig, theme: t.id }
                  }))}
                  className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-2 ${
                    cardCfg.theme === t.id
                      ? 'border-rose-500 bg-rose-500/10 shadow-lg scale-105'
                      : 'border-white/10 bg-[#171924] hover:border-white/20'
                  }`}
                >
                  <div className={`h-7 w-full rounded-lg bg-gradient-to-r ${t.gradient} border border-white/10`} />
                  <span className="text-[11px] font-bold text-white/80">{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Controls: Font, Text Color, Background Color, Opacity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Left Column: Font & Text Color */}
            <div className="space-y-4">
              {/* Font Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">
                  Typography / Font
                </label>
                <div className="relative">
                  <select
                    value={cardCfg.font}
                    onChange={(e) => setSettings(s => ({
                      ...s,
                      welcomeCardConfig: { ...s.welcomeCardConfig, font: e.target.value }
                    }))}
                    className="w-full bg-[#181a24] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500 appearance-none"
                  >
                    {FONT_OPTIONS.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                  <Type size={16} className="absolute right-3.5 top-3.5 text-white/40 pointer-events-none" />
                </div>
              </div>

              {/* Text Color Picker */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">
                  Text Color
                </label>
                <div className="flex items-center gap-2">
                  {PRESET_TEXT_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSettings(s => ({
                        ...s,
                        welcomeCardConfig: { ...s.welcomeCardConfig, textColor: c }
                      }))}
                      className={`h-7 w-7 rounded-full border border-white/20 transition ${
                        cardCfg.textColor === c ? 'ring-2 ring-rose-500 scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                  <input
                    type="color"
                    value={cardCfg.textColor || '#FFFFFF'}
                    onChange={(e) => setSettings(s => ({
                      ...s,
                      welcomeCardConfig: { ...s.welcomeCardConfig, textColor: e.target.value }
                    }))}
                    className="h-7 w-8 rounded cursor-pointer bg-transparent border-0"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Background Color & Overlay Opacity */}
            <div className="space-y-4">
              {/* Background Color Picker */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">
                  Background Base Color
                </label>
                <div className="flex items-center gap-2">
                  {PRESET_BG_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSettings(s => ({
                        ...s,
                        welcomeCardConfig: { ...s.welcomeCardConfig, backgroundColor: c }
                      }))}
                      className={`h-7 w-7 rounded-full border border-white/20 transition ${
                        cardCfg.backgroundColor === c ? 'ring-2 ring-rose-500 scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                  <input
                    type="color"
                    value={cardCfg.backgroundColor || '#0B0D14'}
                    onChange={(e) => setSettings(s => ({
                      ...s,
                      welcomeCardConfig: { ...s.welcomeCardConfig, backgroundColor: e.target.value }
                    }))}
                    className="h-7 w-8 rounded cursor-pointer bg-transparent border-0"
                  />
                </div>
              </div>

              {/* Overlay Opacity Slider */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-white/60">
                    Overlay Opacity
                  </label>
                  <span className="text-xs font-mono text-white/80">
                    {Math.round((cardCfg.overlayOpacity ?? 0.75) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={cardCfg.overlayOpacity ?? 0.75}
                  onChange={(e) => setSettings(s => ({
                    ...s,
                    welcomeCardConfig: { ...s.welcomeCardConfig, overlayOpacity: parseFloat(e.target.value) }
                  }))}
                  className="w-full accent-rose-500 h-2 bg-white/10 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Title & Subtitle Templates & Custom Image */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-1.5">
                Card Title Template
              </label>
              <input
                type="text"
                value={cardCfg.titleTemplate || ''}
                onChange={(e) => setSettings(s => ({
                  ...s,
                  welcomeCardConfig: { ...s.welcomeCardConfig, titleTemplate: e.target.value }
                }))}
                placeholder="{user} just joined the server"
                className="w-full bg-[#181a24] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-1.5">
                Card Subtitle Template
              </label>
              <input
                type="text"
                value={cardCfg.subtitleTemplate || ''}
                onChange={(e) => setSettings(s => ({
                  ...s,
                  welcomeCardConfig: { ...s.welcomeCardConfig, subtitleTemplate: e.target.value }
                }))}
                placeholder="Member #{count}"
                className="w-full bg-[#181a24] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-1.5">
                Custom Background Image URL
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={cardCfg.backgroundUrl || ''}
                  onChange={(e) => setSettings(s => ({
                    ...s,
                    welcomeCardConfig: { ...s.welcomeCardConfig, backgroundUrl: e.target.value }
                  }))}
                  placeholder="https://... image link"
                  className="w-full bg-[#181a24] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500"
                />
                <ImageIcon size={16} className="absolute right-3.5 top-3.5 text-white/40 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* High-Res Canvas Server Render Preview Box (if fetched) */}
          {serverPreviewUrl && (
            <div className="mt-4 p-4 rounded-xl border border-white/10 bg-[#0c0e15] flex flex-col items-center">
              <span className="text-xs font-bold text-emerald-400 mb-2 flex items-center gap-1.5">
                <CheckCircle2 size={13} /> Node-Canvas 1024x500 Render Output
              </span>
              <img
                src={serverPreviewUrl}
                alt="Canvas Render Preview"
                className="w-full max-w-xl rounded-xl shadow-2xl border border-white/10"
              />
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* SECTION 3: Send a private message to new users (DM) */}
        {/* ========================================================================= */}
        <div className="rounded-2xl border border-white/10 bg-[#13151f] p-5 md:p-6 shadow-md space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <Mail size={19} />
              </div>
              <h2 className="text-base font-bold text-white">Send a private message to new users</h2>
            </div>
            <button
              type="button"
              onClick={() => setSettings(s => ({ ...s, sendWelcomeDm: !s.sendWelcomeDm }))}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                settings.sendWelcomeDm ? 'bg-blue-500' : 'bg-white/20'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                  settings.sendWelcomeDm ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {settings.sendWelcomeDm && (
            <div className="space-y-4 pt-2 border-t border-white/5">
              {/* Mode Tabs */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSettings(s => ({ ...s, welcomeDmMessageType: 'text' }))}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                    settings.welcomeDmMessageType === 'text'
                      ? 'bg-[#222533] text-white border border-white/20'
                      : 'text-white/50 hover:text-white bg-transparent'
                  }`}
                >
                  Text message
                </button>
                <button
                  type="button"
                  onClick={() => setSettings(s => ({ ...s, welcomeDmMessageType: 'embed' }))}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                    settings.welcomeDmMessageType === 'embed'
                      ? 'bg-[#222533] text-white border border-white/20'
                      : 'text-white/50 hover:text-white bg-transparent'
                  }`}
                >
                  Embed message
                </button>
              </div>

              {/* Textarea */}
              <div className="relative">
                <textarea
                  rows={3}
                  value={settings.welcomeDmMessage}
                  maxLength={2000}
                  onChange={(e) => setSettings(s => ({ ...s, welcomeDmMessage: e.target.value }))}
                  className="w-full bg-[#181a24] border border-white/10 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-rose-500 font-sans"
                />
                <div className="absolute right-3 bottom-3 text-[11px] font-mono text-white/40">
                  {settings.welcomeDmMessage.length} / 2000
                </div>
              </div>

              {/* Quick tags */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[11px] font-semibold text-white/40 mr-1">Insert Variable:</span>
                {['{username}', '{server}', '{server.member_count}'].map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => insertTag('welcomeDmMessage', tag)}
                    className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 text-[11px] font-mono transition"
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {/* Toggle send card in DM */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-semibold text-white/80">
                  Send welcome card in private message
                </span>
                <button
                  type="button"
                  onClick={() => setSettings(s => ({ ...s, sendWelcomeDmCard: !s.sendWelcomeDmCard }))}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    settings.sendWelcomeDmCard ? 'bg-blue-500' : 'bg-white/20'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      settings.sendWelcomeDmCard ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* SECTION 4: Give a role to new users (Autoroles) */}
        {/* ========================================================================= */}
        <div className="rounded-2xl border border-white/10 bg-[#13151f] p-5 md:p-6 shadow-md space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <ShieldCheck size={19} />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Give a role to new users</h2>
                <p className="text-xs text-white/40">Roles are automatically assigned to new users when they join the server</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSettings(s => ({ ...s, autorolesEnabled: !s.autorolesEnabled }))}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                settings.autorolesEnabled ? 'bg-blue-500' : 'bg-white/20'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                  settings.autorolesEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {settings.autorolesEnabled && (
            <div className="space-y-3 pt-2 border-t border-white/5">
              <label className="block text-xs font-bold uppercase tracking-wider text-white/60">
                Roles to give
              </label>

              {/* Selected Role Badges */}
              <div className="flex flex-wrap items-center gap-2 min-h-11 p-2.5 rounded-xl border border-white/10 bg-[#181a24]">
                {(settings.autoroleIds || []).map(rId => {
                  const roleObj = roles.find(r => r.id === rId);
                  return (
                    <span
                      key={rId}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-[#232635] text-white border border-white/10 shadow-sm"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: roleObj?.color || '#a855f7' }}
                      />
                      <span>{roleObj?.name || rId}</span>
                      <button
                        type="button"
                        onClick={() => toggleRole(rId)}
                        className="text-white/40 hover:text-white ml-1"
                      >
                        <X size={13} />
                      </button>
                    </span>
                  );
                })}

                {/* Add Role Dropdown Button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-white/70 border border-dashed border-white/20 transition"
                  >
                    + Add Role
                  </button>

                  {roleDropdownOpen && (
                    <div className="absolute left-0 mt-2 z-50 w-64 rounded-xl border border-white/10 bg-[#1e202d] p-2 shadow-2xl space-y-2">
                      <input
                        type="text"
                        placeholder="Search roles..."
                        value={roleSearch}
                        onChange={(e) => setRoleSearch(e.target.value)}
                        className="w-full bg-[#12141d] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {filteredRoles.map(r => {
                          const isSelected = (settings.autoroleIds || []).includes(r.id);
                          return (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => toggleRole(r.id)}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left transition ${
                                isSelected ? 'bg-rose-500/20 text-rose-300' : 'hover:bg-white/5 text-white/80'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: r.color || '#94a3b8' }} />
                                <span className="truncate">{r.name}</span>
                              </div>
                              {isSelected && <X size={12} />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 flex items-center gap-2.5 text-xs text-blue-300">
                <Info size={15} className="shrink-0" />
                <span>Make sure Uranium's bot role is positioned higher than the assigned roles in your Discord Server Settings.</span>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* SECTION 5: Send a message when a user leaves the server (Goodbye) */}
        {/* ========================================================================= */}
        <div className="rounded-2xl border border-white/10 bg-[#13151f] p-5 md:p-6 shadow-md space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                <UserMinus size={19} />
              </div>
              <h2 className="text-base font-bold text-white">Send a message when a user leaves the server</h2>
            </div>
            <button
              type="button"
              onClick={() => setSettings(s => ({ ...s, sendGoodbyeMessage: !s.sendGoodbyeMessage }))}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                settings.sendGoodbyeMessage ? 'bg-blue-500' : 'bg-white/20'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                  settings.sendGoodbyeMessage ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {settings.sendGoodbyeMessage && (
            <div className="space-y-4 pt-2 border-t border-white/5">
              {/* Channel Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">
                  Goodbye Message Channel <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={settings.goodbyeChannelId || ''}
                    onChange={(e) => setSettings(s => ({ ...s, goodbyeChannelId: e.target.value }))}
                    className="w-full bg-[#181a24] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500 appearance-none"
                  >
                    <option value="">Select a text channel...</option>
                    {channels.map(ch => (
                      <option key={ch.id} value={ch.id}>
                        # {ch.name}
                      </option>
                    ))}
                  </select>
                  <Hash size={16} className="absolute right-3.5 top-3.5 text-white/40 pointer-events-none" />
                </div>
              </div>

              {/* Mode Tabs: Text / Embed */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSettings(s => ({ ...s, goodbyeMessageType: 'text' }))}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                    settings.goodbyeMessageType === 'text'
                      ? 'bg-[#222533] text-white border border-white/20'
                      : 'text-white/50 hover:text-white bg-transparent'
                  }`}
                >
                  Text message
                </button>
                <button
                  type="button"
                  onClick={() => setSettings(s => ({ ...s, goodbyeMessageType: 'embed' }))}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                    settings.goodbyeMessageType === 'embed'
                      ? 'bg-[#222533] text-white border border-white/20'
                      : 'text-white/50 hover:text-white bg-transparent'
                  }`}
                >
                  Embed message
                </button>
              </div>

              {/* Textarea */}
              <div className="relative">
                <textarea
                  rows={3}
                  value={settings.goodbyeMessage}
                  maxLength={2000}
                  onChange={(e) => setSettings(s => ({ ...s, goodbyeMessage: e.target.value }))}
                  className="w-full bg-[#181a24] border border-white/10 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-rose-500 font-sans"
                />
                <div className="absolute right-3 bottom-3 text-[11px] font-mono text-white/40">
                  {settings.goodbyeMessage.length} / 2000
                </div>
              </div>

              {/* Variable Chips */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[11px] font-semibold text-white/40 mr-1">Insert Variable:</span>
                {['{username}', '{server}', '{server.member_count}'].map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => insertTag('goodbyeMessage', tag)}
                    className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 text-[11px] font-mono transition"
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {/* Send Goodbye Card Toggle */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-semibold text-white/80">
                  Send a goodbye card when a user leaves the server
                </span>
                <button
                  type="button"
                  onClick={() => setSettings(s => ({ ...s, sendGoodbyeCard: !s.sendGoodbyeCard }))}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    settings.sendGoodbyeCard ? 'bg-blue-500' : 'bg-white/20'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      settings.sendGoodbyeCard ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Floating Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#10121a]/90 backdrop-blur-xl border-t border-white/10 py-3.5 px-6 shadow-2xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowTestModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white font-bold text-xs transition"
            >
              <Send size={14} className="text-blue-400" />
              <span>Send Test Message</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white font-bold text-xs shadow-lg shadow-rose-500/20 transition disabled:opacity-50"
            >
              <Save size={14} className={saving ? 'animate-spin' : ''} />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Test Message Modal */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md bg-[#161824] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Send size={16} className="text-blue-400" /> Send Test Message
              </h3>
              <button
                type="button"
                onClick={() => setShowTestModal(false)}
                className="text-white/40 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-white/50">
              Trigger a realistic test message directly into your designated Discord channels to verify formatting, cards, and embeds.
            </p>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => handleSendTest('welcome')}
                disabled={testing}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white transition"
              >
                <div className="flex items-center gap-3">
                  <UserPlus size={16} className="text-emerald-400" />
                  <div className="text-left">
                    <div className="text-xs font-bold">Test Welcome Channel Message</div>
                    <div className="text-[11px] text-white/40">Sends welcome text / embed / card</div>
                  </div>
                </div>
                <Send size={14} className="text-white/40" />
              </button>

              <button
                type="button"
                onClick={() => handleSendTest('goodbye')}
                disabled={testing}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white transition"
              >
                <div className="flex items-center gap-3">
                  <UserMinus size={16} className="text-rose-400" />
                  <div className="text-left">
                    <div className="text-xs font-bold">Test Goodbye Channel Message</div>
                    <div className="text-[11px] text-white/40">Sends departure notice / embed / card</div>
                  </div>
                </div>
                <Send size={14} className="text-white/40" />
              </button>
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setShowTestModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
