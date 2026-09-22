'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Gift,
  Trophy,
  Clock,
  Palette,
  Shield,
  Image as ImageIcon,
  MousePointerClick,
  Check,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import CustomSelect from './CustomSelect';

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

export default function GiveawayEditModal({
  isOpen,
  onClose,
  guildId,
  giveaway,
  onSuccess,
  showToast
}) {
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState([]);

  const [prize, setPrize] = useState('');
  const [winners, setWinners] = useState(1);
  const [extendDuration, setExtendDuration] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#5865F2');
  const [thumbnail, setThumbnail] = useState('');
  const [image, setImage] = useState('');
  const [requiredRole, setRequiredRole] = useState('');
  const [buttonLabel, setButtonLabel] = useState('Enter');
  const [buttonEmoji, setButtonEmoji] = useState('🎉');

  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && giveaway) {
      const cfg = giveaway.config || {};
      setPrize(giveaway.prize || '');
      setWinners(giveaway.winners || 1);
      setExtendDuration('');
      setTitle(cfg.title || '');
      setDescription(cfg.description || '');
      setColor(cfg.color || '#5865F2');
      setThumbnail(cfg.thumbnail || '');
      setImage(cfg.image || '');
      setRequiredRole(cfg.requiredRole || '');
      setButtonLabel(cfg.buttonLabel || 'Enter');
      setButtonEmoji(cfg.buttonEmoji || '🎉');
      setError('');
      fetchRoles();
    }
  }, [isOpen, giveaway]);

  const fetchRoles = async () => {
    try {
      const res = await fetch(`/api/guild/${guildId}/roles`);
      if (res.ok) {
        const rolesData = await res.json();
        setRoles([
          { value: '', label: 'None (Open to Everyone)' },
          ...rolesData.map((r) => ({ value: r.id, label: `@${r.name}` }))
        ]);
      }
    } catch {}
  };

  if (!isOpen || !giveaway) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!prize.trim()) {
      setError('Prize title cannot be empty.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/guild/${guildId}/giveaways/${giveaway.messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prize: prize.trim(),
          winners: parseInt(winners) || 1,
          duration: extendDuration.trim() || undefined,
          title: title.trim() || undefined,
          description: description.trim() || undefined,
          color: color || '#5865F2',
          thumbnail: thumbnail.trim() || undefined,
          image: image.trim() || undefined,
          requiredRole: requiredRole || undefined,
          buttonLabel: buttonLabel.trim() || 'Enter',
          buttonEmoji: buttonEmoji.trim() || '🎉'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update giveaway');
      }

      showToast('Giveaway updated successfully and synced with Discord.', 'success');
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update giveaway');
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
          className="relative w-full max-w-2xl rounded-[2.2rem] border border-white/15 bg-[#0f0910] p-6 sm:p-8 shadow-2xl z-10 my-auto max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30">
                <Gift size={22} />
              </span>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  Edit Giveaway <Sparkles size={16} className="text-blue-400" />
                </h3>
                <p className="text-xs text-[var(--muted)]">Updates live Discord message embed immediately</p>
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

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {/* Prize Title & Winners */}
            <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
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

            {/* Extend Duration */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--quiet)] ml-1">
                Extend / Reset Duration from Now (Optional)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={extendDuration}
                  onChange={(e) => setExtendDuration(e.target.value)}
                  placeholder="e.g. 2d 12h, 1h (leave blank to keep current end time)"
                  className="lucent-input px-4 py-2.5 text-xs font-medium"
                />
                <Clock size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/20" />
              </div>
              <p className="text-[10px] text-white/40 ml-1">
                Leave empty to preserve existing scheduled end time.
              </p>
            </div>

            {/* Accent Color */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--quiet)] ml-1 flex items-center justify-between">
                <span>Embed Accent Color</span>
                <span className="font-mono text-xs text-white/60">{color}</span>
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => setColor(preset.hex)}
                    className="h-7 w-7 rounded-lg border border-white/20 flex items-center justify-center transition hover:scale-110"
                    style={{ backgroundColor: preset.hex }}
                  >
                    {color.toLowerCase() === preset.hex.toLowerCase() && (
                      <Check size={12} className="text-black drop-shadow" />
                    )}
                  </button>
                ))}
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-7 w-7 rounded-lg bg-transparent border border-white/20 cursor-pointer"
                />
              </div>
            </div>

            {/* Custom Title & Description */}
            <div className="space-y-2">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--quiet)] ml-1">
                  Custom Embed Title (Optional)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Custom embed title"
                  className="lucent-input px-4 py-2 text-xs font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--quiet)] ml-1">
                  Custom Description / Rules (Optional)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Extra description or terms..."
                  className="lucent-input px-4 py-2 text-xs font-medium resize-none"
                />
              </div>
            </div>

            {/* Media: Thumbnail & Banner */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--quiet)] ml-1">
                  Thumbnail URL
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
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--quiet)] ml-1">
                  Banner Image URL
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

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t border-white/10">
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
                className="flex-1 py-3 rounded-2xl bg-blue-500 hover:bg-blue-400 text-white text-xs font-black uppercase tracking-wider disabled:opacity-50 transition shadow-lg shadow-blue-500/20"
              >
                {loading ? 'Saving Changes…' : 'Save & Sync Discord'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

