'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Gift,
  Sparkles,
  Clock,
  Trophy,
  Hash,
  Palette,
  Shield,
  Bell,
  Image as ImageIcon,
  MousePointerClick,
  Check,
  AlertCircle,
  Layers
} from 'lucide-react';
import CustomSelect from './CustomSelect';
import { useStore } from '@/store';

const DURATION_PRESETS = [
  { label: '1 Hour', value: '1h' },
  { label: '12 Hours', value: '12h' },
  { label: '1 Day', value: '1d' },
  { label: '3 Days', value: '3d' },
  { label: '7 Days', value: '7d' },
  { label: 'Custom', value: 'custom' }
];

const COLOR_PRESETS = [
  { name: 'Emerald', hex: '#57F287' },
  { name: 'Blurple', hex: '#5865F2' },
  { name: 'Gold', hex: '#F1C40F' },
  { name: 'Crimson', hex: '#ED4245' },
  { name: 'Fuchsia', hex: '#EB459E' },
  { name: 'Amethyst', hex: '#9B59B6' },
  { name: 'Mint', hex: '#00D26A' },
  { name: 'Dark Slate', hex: '#34495E' }
];

const EMOJI_PRESETS = ['🎉', '🎁', '🚀', '💎', '🎟️', '⭐', '🔥', '🍀'];

export default function GiveawayCreateModal({
  isOpen,
  onClose,
  guildId,
  onSuccess,
  showToast
}) {
  const { user } = useStore();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basics'); // 'basics' | 'styling' | 'requirements'

  // Channels & Roles data
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);

  // Form State - Basics
  const [channelId, setChannelId] = useState('');
  const [prize, setPrize] = useState('');
  const [winners, setWinners] = useState(1);
  const [durationPreset, setDurationPreset] = useState('1d');
  const [customDuration, setCustomDuration] = useState('');
  const [ping, setPing] = useState('none');
  const [content, setContent] = useState('🎉 **GIVEAWAY TIME!** React or click below to enter!');

  // Form State - Styling & Media
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#5865F2');
  const [thumbnail, setThumbnail] = useState('');
  const [image, setImage] = useState('');

  // Form State - Requirements & Buttons
  const [requiredRole, setRequiredRole] = useState('');
  const [buttonLabel, setButtonLabel] = useState('Enter');
  const [buttonEmoji, setButtonEmoji] = useState('🎉');

  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && guildId) {
      fetchChannelsAndRoles();
      // Reset form
      setActiveTab('basics');
      setPrize('');
      setWinners(1);
      setDurationPreset('1d');
      setCustomDuration('');
      setPing('none');
      setContent('🎉 **GIVEAWAY TIME!** React or click below to enter!');
      setTitle('');
      setDescription('');
      setColor('#5865F2');
      setThumbnail('');
      setImage('');
      setRequiredRole('');
      setButtonLabel('Enter');
      setButtonEmoji('🎉');
      setError('');
    }
  }, [isOpen, guildId]);

  const fetchChannelsAndRoles = async () => {
    try {
      const [chRes, rolesRes] = await Promise.all([
        fetch(`/api/guild/${guildId}/channels`),
        fetch(`/api/guild/${guildId}/roles`)
      ]);

      if (chRes.ok) {
        const data = await chRes.json();
        const textChannels = (data.text || []).map((ch) => ({
          value: ch.id,
          label: `#${ch.name}`
        }));
        setChannels(textChannels);
        if (textChannels.length > 0 && !channelId) {
          setChannelId(textChannels[0].value);
        }
      }

      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        const roleOptions = [
          { value: '', label: 'None (Open to Everyone)' },
          ...rolesData.map((r) => ({
            value: r.id,
            label: `@${r.name}`
          }))
        ];
        setRoles(roleOptions);
      }
    } catch (err) {
      console.error('Failed to fetch guild channels or roles:', err);
    }
  };

  if (!isOpen) return null;

  const finalDuration = durationPreset === 'custom' ? customDuration.trim() : durationPreset;
  const hostDisplayName = user?.username ? `@${user.username}` : '@You';
  const selectedRoleObj = roles.find((r) => r.value === requiredRole && r.value !== '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!channelId) {
      setError('Please select a target channel.');
      return;
    }
    if (!prize.trim()) {
      setError('Please enter a prize title.');
      return;
    }
    if (!finalDuration) {
      setError('Please specify a valid duration.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/guild/${guildId}/giveaways`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId,
          prize: prize.trim(),
          winners: parseInt(winners) || 1,
          duration: finalDuration,
          content: content.trim(),
          title: title.trim() || undefined,
          description: description.trim() || undefined,
          color: color || '#5865F2',
          thumbnail: thumbnail.trim() || undefined,
          image: image.trim() || undefined,
          requiredRole: requiredRole || undefined,
          buttonLabel: buttonLabel.trim() || 'Enter',
          buttonEmoji: buttonEmoji.trim() || '🎉',
          ping: ping || 'none'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start giveaway');
      }

      showToast('🎉 Giveaway successfully launched on Discord!', 'success');
      onSuccess?.(data.giveaway);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to start giveaway');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
          onClick={onClose}
        />

        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 15 }}
          className="relative w-full max-w-5xl rounded-[2.2rem] border border-white/15 bg-[#0f0910] p-5 sm:p-7 shadow-2xl z-10 my-auto max-h-[92vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30">
                <Gift size={22} />
              </span>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  Launch Custom Giveaway <Sparkles size={16} className="text-emerald-400" />
                </h3>
                <p className="text-xs text-[var(--muted)]">
                  Configure professional embeds, custom colors, role requirements, and live Discord buttons
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 text-[var(--muted)] hover:bg-white/10 hover:text-white transition"
            >
              <X size={18} />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 pt-3 pb-1 shrink-0 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('basics')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'basics'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow'
                  : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white border border-transparent'
              }`}
            >
              <Layers size={14} />
              1. Basic Details
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('styling')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'styling'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow'
                  : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white border border-transparent'
              }`}
            >
              <Palette size={14} />
              2. Embed Styling & Media
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('requirements')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'requirements'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow'
                  : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white border border-transparent'
              }`}
            >
              <Shield size={14} />
              3. Requirements & Button
            </button>
          </div>

          {error && (
            <div className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 shrink-0">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Split Body: Configuration Form (Left) & Real Discord Live Preview (Right) */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto mt-3 pr-1">
            <div className="grid lg:grid-cols-[1.1fr_1fr] gap-6 items-start">
              
              {/* Left Column: Form Tab Contents */}
              <div className="space-y-4">
                {activeTab === 'basics' && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4"
                  >
                    {/* Target Channel */}
                    <div>
                      <CustomSelect
                        label="Target Discord Channel"
                        value={channelId}
                        onChange={setChannelId}
                        options={channels}
                        searchable
                      />
                    </div>

                    {/* Prize & Winners */}
                    <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--quiet)] ml-1">
                          Prize Title *
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            value={prize}
                            onChange={(e) => setPrize(e.target.value)}
                            placeholder="e.g. Discord Nitro (1 Month)"
                            className="lucent-input px-4 py-2.5 text-sm font-medium"
                          />
                          <Gift size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/20" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--quiet)] ml-1">
                          Winners Count
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            max="50"
                            required
                            value={winners}
                            onChange={(e) => setWinners(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                            className="lucent-input px-4 py-2.5 text-sm font-medium"
                          />
                          <Trophy size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/20" />
                        </div>
                      </div>
                    </div>

                    {/* Duration Selector */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--quiet)] ml-1">
                        Giveaway Duration *
                      </label>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {DURATION_PRESETS.map((preset) => (
                          <button
                            key={preset.value}
                            type="button"
                            onClick={() => setDurationPreset(preset.value)}
                            className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all ${
                              durationPreset === preset.value
                                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-md shadow-emerald-500/10'
                                : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>

                      {durationPreset === 'custom' && (
                        <div className="mt-2">
                          <input
                            type="text"
                            value={customDuration}
                            onChange={(e) => setCustomDuration(e.target.value)}
                            placeholder="e.g. 2d 6h, 30m, 45m"
                            className="lucent-input px-4 py-2 text-sm font-medium"
                            required
                          />
                          <p className="text-[10px] text-white/40 mt-1 ml-1">
                            Units: d (days), h (hours), m (minutes), s (seconds).
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Announcement Ping Option */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--quiet)] ml-1 flex items-center gap-1.5">
                        <Bell size={13} className="text-emerald-400" /> Ping Notification
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: 'No Ping', value: 'none' },
                          { label: '@everyone', value: 'everyone' },
                          { label: '@here', value: 'here' }
                        ].map((item) => (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => setPing(item.value)}
                            className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all ${
                              ping === item.value
                                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                                : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Announcement Message Content */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--quiet)] ml-1">
                        Announcement Text (Above Embed)
                      </label>
                      <input
                        type="text"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Message that introduces the giveaway..."
                        className="lucent-input px-4 py-2.5 text-xs font-medium"
                      />
                    </div>
                  </motion.div>
                )}

                {activeTab === 'styling' && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4"
                  >
                    {/* Accent Hex Color */}
                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--quiet)] ml-1 flex items-center justify-between">
                        <span>Accent Embed Color</span>
                        <span className="font-mono text-xs text-white/70">{color}</span>
                      </label>
                      <div className="flex flex-wrap items-center gap-2">
                        {COLOR_PRESETS.map((preset) => (
                          <button
                            key={preset.hex}
                            type="button"
                            onClick={() => setColor(preset.hex)}
                            className="relative h-8 w-8 rounded-xl border border-white/20 transition-transform hover:scale-110 flex items-center justify-center shadow-md"
                            style={{ backgroundColor: preset.hex }}
                            title={preset.name}
                          >
                            {color.toLowerCase() === preset.hex.toLowerCase() && (
                              <Check size={14} className="text-black drop-shadow" />
                            )}
                          </button>
                        ))}
                        {/* Custom Hex Input */}
                        <div className="flex items-center gap-1.5 ml-1">
                          <input
                            type="color"
                            value={color}
                            onChange={(e) => setColor(e.target.value)}
                            className="h-8 w-8 rounded-xl bg-transparent border border-white/20 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={color}
                            onChange={(e) => setColor(e.target.value)}
                            placeholder="#5865F2"
                            className="lucent-input w-24 py-1.5 px-2.5 text-xs font-mono font-medium"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Custom Title */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--quiet)] ml-1">
                        Custom Embed Title (Optional)
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={`Defaults to "🎉 GIVEAWAY: ${prize || 'Prize'}"`}
                        className="lucent-input px-4 py-2.5 text-xs font-medium"
                      />
                    </div>

                    {/* Custom Description / Rules */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--quiet)] ml-1">
                        Custom Description / Rules (Optional)
                      </label>
                      <textarea
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Add custom giveaway instructions, terms, or rules..."
                        className="lucent-input px-4 py-2 text-xs font-medium resize-none"
                      />
                    </div>

                    {/* Media: Thumbnail & Banner Image URLs */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--quiet)] ml-1 flex items-center gap-1.5">
                          <ImageIcon size={13} className="text-emerald-400" /> Thumbnail URL
                        </label>
                        <input
                          type="url"
                          value={thumbnail}
                          onChange={(e) => setThumbnail(e.target.value)}
                          placeholder="https://.../icon.png"
                          className="lucent-input px-4 py-2 text-xs font-medium"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--quiet)] ml-1 flex items-center gap-1.5">
                          <ImageIcon size={13} className="text-emerald-400" /> Banner Image URL
                        </label>
                        <input
                          type="url"
                          value={image}
                          onChange={(e) => setImage(e.target.value)}
                          placeholder="https://.../banner.png"
                          className="lucent-input px-4 py-2 text-xs font-medium"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'requirements' && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4"
                  >
                    {/* Role Requirement Selector */}
                    <div className="space-y-1.5">
                      <CustomSelect
                        label="Required Role Eligibility"
                        value={requiredRole}
                        onChange={setRequiredRole}
                        options={roles}
                        searchable
                      />
                      <p className="text-[11px] text-[var(--muted)] ml-1">
                        Only Discord members with this role will be permitted to enter the giveaway.
                      </p>
                    </div>

                    {/* Button Label & Emoji */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--quiet)] ml-1 flex items-center gap-1.5">
                          <MousePointerClick size={13} className="text-emerald-400" /> Button Label
                        </label>
                        <input
                          type="text"
                          value={buttonLabel}
                          onChange={(e) => setButtonLabel(e.target.value)}
                          placeholder="Enter"
                          className="lucent-input px-4 py-2 text-xs font-medium"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--quiet)] ml-1">
                          Button Emoji
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={buttonEmoji}
                            onChange={(e) => setButtonEmoji(e.target.value)}
                            placeholder="🎉"
                            className="lucent-input w-16 py-2 px-3 text-center text-sm font-medium"
                          />
                          <div className="flex items-center gap-1 overflow-x-auto">
                            {EMOJI_PRESETS.map((em) => (
                              <button
                                key={em}
                                type="button"
                                onClick={() => setButtonEmoji(em)}
                                className={`h-8 w-8 rounded-lg text-sm grid place-items-center transition ${
                                  buttonEmoji === em
                                    ? 'bg-emerald-500/20 border border-emerald-500/40'
                                    : 'bg-white/5 hover:bg-white/10'
                                }`}
                              >
                                {em}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Right Column: High-Fidelity Discord Mockup Live Preview */}
              <div className="space-y-2 sticky top-0">
                <div className="flex items-center justify-between ml-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Sparkles size={13} /> Live Discord Embed Preview
                  </span>
                  <span className="text-[10px] text-white/40">Real-time update</span>
                </div>

                {/* Discord Client Box */}
                <div className="rounded-[1.4rem] border border-white/10 bg-[#313338] p-4 font-sans text-white/90 shadow-2xl space-y-3 select-none">
                  {/* Message Header (Bot Avatar, Name, App Tag, Time) */}
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 grid place-items-center text-black font-black text-sm shrink-0 shadow">
                      ☢
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white hover:underline cursor-pointer">
                        Uranium
                      </span>
                      <span className="px-1.5 py-0.5 rounded-[4px] bg-[#5865F2] text-[10px] font-bold text-white tracking-wide flex items-center gap-0.5">
                        <span>✓</span> APP
                      </span>
                      <span className="text-[11px] text-white/40 font-normal">
                        Today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {/* Announcement Text / Ping */}
                  <div className="text-xs text-white/90 font-normal leading-relaxed pl-12 -mt-1 space-y-1">
                    <p>
                      {ping === 'everyone' && (
                        <span className="bg-[#5865F2]/20 text-[#C9CDFB] px-1.5 py-0.5 rounded font-medium mr-1.5">
                          @everyone
                        </span>
                      )}
                      {ping === 'here' && (
                        <span className="bg-[#5865F2]/20 text-[#C9CDFB] px-1.5 py-0.5 rounded font-medium mr-1.5">
                          @here
                        </span>
                      )}
                      {content}
                    </p>
                  </div>

                  {/* Discord Rich Embed Container */}
                  <div
                    className="ml-12 border-l-[4px] rounded-r-xl bg-[#2B2D31] p-4 space-y-3 relative overflow-hidden transition-all shadow-md"
                    style={{ borderLeftColor: color || '#5865F2' }}
                  >
                    {/* Top row: Title and optional top-right thumbnail */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <h4 className="text-sm font-bold text-white tracking-tight hover:underline cursor-pointer">
                          {title.trim() || `🎉 GIVEAWAY: ${prize.trim() || 'Discord Nitro (1 Month)'}`}
                        </h4>
                        {description.trim() && (
                          <p className="text-xs text-white/80 whitespace-pre-line leading-relaxed border-l-2 border-white/20 pl-2 my-1 text-[11px]">
                            {description.trim()}
                          </p>
                        )}
                      </div>

                      {thumbnail && (
                        <img
                          src={thumbnail}
                          alt="Thumbnail preview"
                          onError={(e) => { e.target.style.display = 'none'; }}
                          className="h-16 w-16 rounded-lg object-cover shrink-0 border border-white/10"
                        />
                      )}
                    </div>

                    {/* Embed Key-Value Fields */}
                    <div className="space-y-1 text-xs text-white/85 leading-relaxed pt-1">
                      <p>
                        <strong className="text-white">🎁 Prize:</strong>{' '}
                        <span className="text-white font-semibold">
                          {prize.trim() || 'Discord Nitro (1 Month)'}
                        </span>
                      </p>
                      <p>
                        <strong className="text-white">🏆 Winners:</strong>{' '}
                        <span className="text-white/90">
                          {winners} {winners === 1 ? 'Winner' : 'Winners'}
                        </span>
                      </p>
                      <p>
                        <strong className="text-white">⏳ Ends:</strong> in {finalDuration || '1 day'}
                      </p>
                      <p>
                        <strong className="text-white">👑 Hosted by:</strong>{' '}
                        <span className="bg-[#5865F2]/25 text-[#C9CDFB] px-1.5 py-0.5 rounded font-medium hover:bg-[#5865F2]/40 transition">
                          {hostDisplayName}
                        </span>
                      </p>
                      {selectedRoleObj && (
                        <p>
                          <strong className="text-white">🛡️ Required Role:</strong>{' '}
                          <span className="bg-white/10 text-emerald-300 border border-emerald-500/20 px-1.5 py-0.5 rounded font-medium">
                            {selectedRoleObj.label}
                          </span>
                        </p>
                      )}
                    </div>

                    {/* Banner Image Preview */}
                    {image && (
                      <div className="pt-2">
                        <img
                          src={image}
                          alt="Banner preview"
                          onError={(e) => { e.target.style.display = 'none'; }}
                          className="w-full max-h-40 rounded-xl object-cover border border-white/10"
                        />
                      </div>
                    )}

                    {/* Embed Footer */}
                    <div className="text-[10px] text-white/40 pt-2 border-t border-white/5 flex items-center justify-between">
                      <span>Uranium Giveaways • Winners: {winners}</span>
                      <span>Concludes in {finalDuration || '1d'}</span>
                    </div>
                  </div>

                  {/* Interactive Button Mockup */}
                  <div className="ml-12 flex items-center gap-2 pt-1">
                    <div className="px-4 py-2 rounded-[8px] bg-[#5865F2] hover:bg-[#4752C4] text-xs font-semibold text-white shadow flex items-center gap-1.5 cursor-pointer">
                      <span>{buttonEmoji || '🎉'}</span>
                      <span>{buttonLabel || 'Enter'} (0)</span>
                    </div>
                    <div className="px-3.5 py-2 rounded-[8px] bg-[#4E5058]/40 border border-white/5 text-xs text-white/50 font-medium cursor-not-allowed">
                      {winners} {winners === 1 ? 'Winner' : 'Winners'}
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Bottom Actions */}
            <div className="flex items-center gap-3 pt-5 border-t border-white/10 mt-6 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-3 rounded-2xl border border-white/10 bg-white/5 text-xs font-bold uppercase tracking-wider text-white hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !prize.trim()}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-black text-xs font-black uppercase tracking-wider disabled:opacity-50 transition shadow-lg shadow-emerald-500/20 hover:brightness-110 flex items-center justify-center gap-2"
              >
                <Sparkles size={15} />
                {loading ? 'Launching to Discord…' : 'Launch Giveaway'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

