'use client';
import { useStore } from '@/store';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Zap } from 'lucide-react';

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

  const FILTER_LABELS = {
    clear: 'Normal',
    nightcore: 'Nightcore',
    bassboost: 'Bass Boost',
    vaporwave: 'Vaporwave',
    soft: 'Soft',
    karaoke: 'Karaoke',
    rotation: '8D Rotation',
    chipmunk: 'Chipmunk',
    daycore: 'Daycore'
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

  const activeFilterList = filters.length > 0 
    ? Array.from(new Set(['clear', ...filters]))
    : DEFAULT_FILTERS;

  const isActive = !!player?.active;

  return (
    <div className={`space-y-3.5 ${!isActive ? 'opacity-50 grayscale-[0.3]' : ''}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--quiet)]">Sound Profile</span>
        {isActive && current !== 'clear' ? (
          <span className="px-2.5 py-0.5 bg-rose-500/20 text-rose-300 text-[10px] font-bold rounded-full uppercase ring-1 ring-rose-500/30">
            {FILTER_LABELS[current] || current} Active
          </span>
        ) : (
          <span className="text-[10px] font-bold text-[var(--quiet)] uppercase tracking-wider">
            {isActive ? 'Standard Audio' : 'Standby'}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {activeFilterList.map((f) => {
          const isSelected = isActive && current === f;
          return (
            <motion.button
              key={f}
              whileHover={isActive ? { scale: 1.02 } : {}}
              whileTap={isActive ? { scale: 0.98 } : {}}
              onClick={() => isActive && applyFilter(f)}
              disabled={!isActive}
              className={`h-10 px-3 rounded-xl border transition-all text-left flex items-center justify-between text-xs font-semibold ${
                isSelected
                  ? 'bg-rose-500/20 border-rose-400/50 text-white shadow-md shadow-rose-500/10 ring-1 ring-rose-400/30'
                  : 'bg-white/5 border-white/10 hover:border-white/20 text-[var(--muted)] hover:text-white'
              } ${!isActive ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span className="truncate">{FILTER_LABELS[f] || f}</span>
              {isSelected ? <Check size={13} className="text-rose-300 shrink-0 ml-1" /> : null}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
