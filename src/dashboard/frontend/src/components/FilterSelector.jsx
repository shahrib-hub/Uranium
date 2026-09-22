'use client';
import { useStore } from '@/store';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles, Volume2 } from 'lucide-react';

const FILTER_META = {
  clear: { label: 'Normal', icon: '🎧', desc: 'Default EQ' },
  nightcore: { label: 'Nightcore', icon: '⚡', desc: 'Pitch & speed up' },
  bassboost: { label: 'Bass Boost', icon: '🔊', desc: 'Deep bass' },
  vaporwave: { label: 'Vaporwave', icon: '🌊', desc: 'Slowed reverb' },
  soft: { label: 'Soft', icon: '☁️', desc: 'Gentle audio' },
  karaoke: { label: 'Karaoke', icon: '🎤', desc: 'Voice filter' },
  rotation: { label: '8D Rotation', icon: '🔄', desc: 'Surround 360' },
  chipmunk: { label: 'Chipmunk', icon: '🐿️', desc: 'High pitch' },
  daycore: { label: 'Daycore', icon: '🌅', desc: 'Slow tempo' }
};

const DEFAULT_FILTERS = [
  'clear',
  'nightcore',
  'bassboost',
  'vaporwave',
  'soft',
  'karaoke',
  'rotation',
  'chipmunk',
  'daycore'
];

export default function FilterSelector() {
  const { player } = useStore();
  const [filters, setFilters] = useState([]);
  const [current, setCurrent] = useState('clear');

  useEffect(() => {
    if (player.guildId) {
      fetch(`/api/guild/${player.guildId}/filters`)
        .then(r => r.json())
        .then(data => {
          setFilters(data.available || []);
          setCurrent(data.current || 'clear');
        })
        .catch(() => null);
    }
  }, [player.guildId, player.filter]);

  const applyFilter = (f) => {
    setCurrent(f); // Optimistic UI
    fetch(`/api/guild/${player.guildId}/player/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'filter', value: f })
    }).catch(() => null);
  };

  const activeFilterList = filters.length > 0 
    ? Array.from(new Set(['clear', ...filters]))
    : DEFAULT_FILTERS;

  const isActive = !!player?.active;
  const activeMeta = FILTER_META[current] || { label: current, icon: '🎵' };

  return (
    <div className={`space-y-4 ${!isActive ? 'opacity-50 grayscale-[0.3]' : ''}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--quiet)] flex items-center gap-1.5">
          <Volume2 size={13} className="text-rose-400" />
          Sound Profile
        </span>
        {isActive && current !== 'clear' ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-500/20 text-rose-300 text-[10px] font-bold rounded-full uppercase ring-1 ring-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
            {activeMeta.label} Active
          </span>
        ) : (
          <span className="text-[10px] font-bold text-[var(--quiet)] uppercase tracking-wider">
            {isActive ? 'Standard Audio' : 'Standby'}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {activeFilterList.map((f) => {
          const meta = FILTER_META[f] || { label: f, icon: '🎵' };
          const isSelected = isActive && current === f;
          return (
            <motion.button
              key={f}
              whileHover={isActive ? { scale: 1.02 } : {}}
              whileTap={isActive ? { scale: 0.98 } : {}}
              onClick={() => isActive && applyFilter(f)}
              disabled={!isActive}
              className={`min-h-[2.85rem] px-3.5 py-2 rounded-xl border transition-all text-left flex items-center justify-between gap-2 text-xs font-semibold ${
                isSelected
                  ? 'bg-rose-500/20 border-rose-400/50 text-white shadow-md shadow-rose-500/10 ring-1 ring-rose-400/30'
                  : 'bg-white/5 border-white/10 hover:border-white/20 text-[var(--muted)] hover:text-white'
              } ${!isActive ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className="text-sm shrink-0">{meta.icon}</span>
                <span className="font-semibold text-white truncate text-xs sm:text-[13px]">{meta.label}</span>
              </span>
              {isSelected && (
                <Check size={14} className="text-rose-300 shrink-0 ml-1" />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
