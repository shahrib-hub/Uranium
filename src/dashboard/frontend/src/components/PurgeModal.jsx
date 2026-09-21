'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Trash2, X, Hash, Filter } from 'lucide-react';
import CustomSelect from './CustomSelect';

const FILTER_OPTIONS = [
  { value: 'all', label: 'All Messages', description: 'Purge any messages regardless of sender' },
  { value: 'bots', label: 'Bot Messages Only', description: 'Purge messages sent by bot integrations' },
  { value: 'users', label: 'User Messages Only', description: 'Purge messages from human members' },
  { value: 'links', label: 'Messages With Links', description: 'Purge messages containing URLs' },
  { value: 'attachments', label: 'Messages With Files', description: 'Purge messages containing image/files' }
];

export default function PurgeModal({
  isOpen,
  onClose,
  onSubmit,
  channels = [],
  currentChannelId = '',
  loading = false
}) {
  const [channelId, setChannelId] = useState(currentChannelId || channels[0]?.id || '');
  const [count, setCount] = useState(25);
  const [filter, setFilter] = useState('all');

  if (!isOpen) return null;

  const channelOptions = channels.map((c) => ({
    value: c.id,
    label: `#${c.name}`
  }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!channelId) return;
    onSubmit({ channelId, count, filter });
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
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30">
                <Trash2 size={22} />
              </span>
              <div>
                <h3 className="text-lg font-bold text-white">Bulk Purge Messages</h3>
                <p className="text-xs text-[var(--muted)]">Fast cleanup with customizable filters</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 text-[var(--muted)] hover:bg-white/10 hover:text-white transition"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {/* Channel Selection */}
            <div>
              <CustomSelect
                label="Target Text Channel"
                value={channelId}
                onChange={setChannelId}
                options={channelOptions}
                searchable
              />
            </div>

            {/* Message Count Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--quiet)]">
                  Message Count: <span className="text-rose-300 text-sm font-black">{count}</span>
                </label>
                <div className="flex gap-1.5">
                  {[10, 25, 50, 100].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCount(preset)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${
                        count === preset
                          ? 'bg-rose-500 text-white'
                          : 'bg-white/5 text-[var(--muted)] hover:bg-white/10'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="range"
                min={1}
                max={100}
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value) || 1)}
                className="w-full accent-rose-500 h-2 bg-white/10 rounded-lg cursor-pointer"
              />
            </div>

            {/* Message Filter */}
            <div>
              <CustomSelect
                label="Message Filter"
                value={filter}
                onChange={setFilter}
                options={FILTER_OPTIONS}
              />
            </div>

            {/* Notice */}
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 flex gap-3 text-xs text-amber-200/90 leading-relaxed">
              <AlertCircle size={18} className="shrink-0 text-amber-400 mt-0.5" />
              <span>
                Discord API restrictions only permit bulk deleting messages sent within the past 14 days. Older messages will be skipped automatically.
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-3 border-t border-white/10">
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
                disabled={loading || !channelId}
                className="flex-1 py-3.5 rounded-2xl lucent-button-primary text-sm font-semibold text-white disabled:opacity-50 transition shadow-lg shadow-rose-500/20"
              >
                {loading ? 'Purging Messages…' : `Purge ${count} Messages`}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
