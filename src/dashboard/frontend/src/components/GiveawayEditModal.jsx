'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, Trophy, Clock, AlertCircle } from 'lucide-react';

export default function GiveawayEditModal({
  isOpen,
  onClose,
  guildId,
  giveaway,
  onSuccess,
  showToast
}) {
  const [loading, setLoading] = useState(false);
  const [prize, setPrize] = useState('');
  const [winners, setWinners] = useState(1);
  const [extendDuration, setExtendDuration] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && giveaway) {
      setPrize(giveaway.prize || '');
      setWinners(giveaway.winners || 1);
      setExtendDuration('');
      setError('');
    }
  }, [isOpen, giveaway]);

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
          duration: extendDuration.trim() || undefined
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
          className="relative w-full max-w-lg rounded-[2rem] border border-white/15 bg-[#10080d] p-6 sm:p-8 shadow-2xl z-10 my-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30">
                <Gift size={22} />
              </span>
              <div>
                <h3 className="text-lg font-bold text-white">Edit Giveaway</h3>
                <p className="text-xs text-[var(--muted)]">Updates live Discord embed immediately</p>
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
            {/* Prize Title */}
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
                  className="lucent-input px-4 py-3 text-sm font-medium"
                />
                <Gift size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/20" />
              </div>
            </div>

            {/* Winners Count */}
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

            {/* Extend Duration */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--quiet)] ml-1">
                Set New Duration from Now (Optional)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={extendDuration}
                  onChange={(e) => setExtendDuration(e.target.value)}
                  placeholder="e.g. 2d 12h, 1h (leave blank to keep current end time)"
                  className="lucent-input px-4 py-3 text-sm font-medium"
                />
                <Clock size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/20" />
              </div>
              <p className="text-[10px] text-white/40 ml-1">
                Leave empty to preserve the existing scheduled end time.
              </p>
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
                className="flex-1 py-3.5 rounded-2xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-bold disabled:opacity-50 transition shadow-lg shadow-blue-500/20"
              >
                {loading ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
