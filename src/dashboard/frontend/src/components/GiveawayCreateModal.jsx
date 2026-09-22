'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, Sparkles, Clock, Trophy, Hash, MessageSquare, AlertCircle } from 'lucide-react';
import CustomSelect from './CustomSelect';

const DURATION_PRESETS = [
  { label: '1 Hour', value: '1h' },
  { label: '12 Hours', value: '12h' },
  { label: '1 Day', value: '1d' },
  { label: '3 Days', value: '3d' },
  { label: '7 Days', value: '7d' },
  { label: 'Custom', value: 'custom' }
];

export default function GiveawayCreateModal({
  isOpen,
  onClose,
  guildId,
  onSuccess,
  showToast
}) {
  const [loading, setLoading] = useState(false);
  const [channels, setChannels] = useState([]);
  const [channelId, setChannelId] = useState('');
  const [prize, setPrize] = useState('');
  const [winners, setWinners] = useState(1);
  const [durationPreset, setDurationPreset] = useState('1d');
  const [customDuration, setCustomDuration] = useState('');
  const [content, setContent] = useState('🎉 **GIVEAWAY TIME!** React with 🎉 or press Enter to participate!');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && guildId) {
      fetchChannels();
      // Reset form
      setPrize('');
      setWinners(1);
      setDurationPreset('1d');
      setCustomDuration('');
      setContent('🎉 **GIVEAWAY TIME!** React with 🎉 or press Enter to participate!');
      setError('');
    }
  }, [isOpen, guildId]);

  const fetchChannels = async () => {
    try {
      const res = await fetch(`/api/guild/${guildId}/channels`);
      if (res.ok) {
        const data = await res.json();
        const textChannels = (data.text || []).map(ch => ({
          value: ch.id,
          label: `#${ch.name}`
        }));
        setChannels(textChannels);
        if (textChannels.length > 0 && !channelId) {
          setChannelId(textChannels[0].value);
        }
      }
    } catch (err) {
      console.error('Failed to fetch channels:', err);
    }
  };

  if (!isOpen) return null;

  const finalDuration = durationPreset === 'custom' ? customDuration.trim() : durationPreset;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!channelId) {
      setError('Please select a target channel.');
      return;
    }
    if (!prize.trim()) {
      setError('Please enter a prize name.');
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
          content: content.trim()
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
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
          onClick={onClose}
        />

        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="relative w-full max-w-2xl rounded-[2rem] border border-white/15 bg-[#10080d] p-6 sm:p-8 shadow-2xl z-10 my-auto custom-scrollbar max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30">
                <Gift size={22} />
              </span>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  Launch Giveaway <Sparkles size={16} className="text-emerald-400" />
                </h3>
                <p className="text-xs text-[var(--muted)]">Post a live interactive giveaway into Discord</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 text-[var(--muted)] hover:bg-white/10 hover:text-white transition"
            >
              <X size={18} />
            </button>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
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
            <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--quiet)] ml-1">
                  Prize Title
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={prize}
                    onChange={(e) => setPrize(e.target.value)}
                    placeholder="e.g. Discord Nitro (1 Month)"
                    className="lucent-input px-4 py-3 text-sm font-medium"
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
                    className="lucent-input px-4 py-3 text-sm font-medium"
                  />
                  <Trophy size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/20" />
                </div>
              </div>
            </div>

            {/* Duration Selector */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--quiet)] ml-1">
                Giveaway Duration
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {DURATION_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setDurationPreset(preset.value)}
                    className={`py-2.5 px-2 rounded-xl text-xs font-semibold border transition-all ${
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
                    className="lucent-input px-4 py-2.5 text-sm font-medium"
                    required
                  />
                  <p className="text-[10px] text-white/40 mt-1 ml-1">
                    Units: d (days), h (hours), m (minutes), s (seconds).
                  </p>
                </div>
              )}
            </div>

            {/* Optional Announcement Content */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--quiet)] ml-1">
                Discord Announcement Text (Optional)
              </label>
              <input
                type="text"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Message that pings or introduces the giveaway..."
                className="lucent-input px-4 py-2.5 text-sm font-medium"
              />
            </div>

            {/* Live Discord Embed Mockup Preview */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <span className="text-[10px] font-black uppercase tracking-wider text-white/40 ml-1">
                Live Discord Embed Preview
              </span>
              <div className="rounded-2xl border border-white/10 bg-[#2B2D31]/90 p-4 font-sans text-white/90 shadow-xl space-y-3">
                {content && (
                  <p className="text-xs text-white/80 font-normal leading-relaxed">{content}</p>
                )}
                <div className="flex border-l-4 border-emerald-500 bg-[#1E1F22] rounded-r-xl p-3.5 space-y-2 flex-col">
                  <div className="text-base font-bold text-white flex items-center gap-2">
                    🎉 Giveaway
                  </div>
                  <div className="text-xs text-white/80 space-y-1 leading-relaxed">
                    <p>
                      <strong className="text-white">Prize:</strong> {prize || 'Discord Nitro (Preview)'}
                    </p>
                    <p>
                      <strong className="text-white">Ends:</strong> in {finalDuration || '1 day'}
                    </p>
                    <p>
                      <strong className="text-white">Hosted by:</strong> <span className="text-emerald-400">@You</span>
                    </p>
                  </div>
                  <div className="text-[10px] text-white/40 pt-1 border-t border-white/5 flex items-center justify-between">
                    <span>Winners: {winners}</span>
                    <span className="text-white/20">Uranium Giveaways</span>
                  </div>
                </div>

                {/* Button Mockup */}
                <div className="flex items-center gap-2 pt-1">
                  <div className="px-4 py-1.5 rounded-md bg-[#4E5058]/40 border border-white/5 text-xs text-white/40 font-medium">
                    Giveaway
                  </div>
                  <div className="px-5 py-1.5 rounded-md bg-[#5865F2] hover:bg-[#4752C4] text-xs font-semibold text-white shadow">
                    🎉 Enter
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-3.5 rounded-2xl border border-white/10 bg-white/5 text-sm font-semibold text-white hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !prize.trim()}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-black text-sm font-bold disabled:opacity-50 transition shadow-lg shadow-emerald-500/20 hover:brightness-110"
              >
                {loading ? 'Posting to Discord…' : 'Launch Giveaway'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
