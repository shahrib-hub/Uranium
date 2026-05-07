'use client';
import { useStore } from '@/store';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sliders, Check, Zap } from 'lucide-react';

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
        });
    }
  }, [player.guildId, player.filter]);

  const applyFilter = (f) => {
    setCurrent(f); // Optimistic UI
    fetch(`/api/guild/${player.guildId}/player/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'filter', value: f })
    });
  };

  const FILTER_LABELS = {
    clear: 'Normal / Clear',
    nightcore: 'Nightcore',
    bassboost: 'Bassboost',
    vaporwave: 'Vaporwave',
    soft: 'Soft',
    karaoke: 'Karaoke',
    rotation: '8D Rotation',
    chipmunk: 'Chipmunk',
    daycore: 'Daycore'
  };

  const isActive = !!player?.active;

  return (
    <div className={`glass p-8 rounded-[40px] ambient-red-border space-y-6 transition-all duration-500 ${!isActive ? 'opacity-40 grayscale-[0.5] cursor-not-allowed' : ''}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black flex items-center gap-3">
          <Sliders className={isActive ? 'text-red-500' : 'text-white/20'} size={24} />
          Audio Filters
        </h3>
        {isActive && current !== 'clear' && (
          <span className="px-3 py-1 bg-red-500/20 text-red-500 text-[10px] font-black rounded-full uppercase animate-pulse">
            {FILTER_LABELS[current] || current} Active
          </span>
        )}
        {!isActive && (
          <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">
            Player Required
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {['clear', ...filters].map((f) => (
          <motion.button
            key={f}
            whileHover={isActive ? { scale: 1.02 } : {}}
            whileTap={isActive ? { scale: 0.98 } : {}}
            onClick={() => isActive && applyFilter(f)}
            disabled={!isActive}
            className={`p-4 rounded-2xl border transition-all text-left flex items-center justify-between group ${
              isActive && current === f 
                ? 'bg-red-500 border-red-500 text-black font-black' 
                : 'bg-white/5 border-white/5 hover:border-white/20 text-white/40 hover:text-white'
            } ${!isActive ? 'pointer-events-none' : ''}`}
          >
            <span className="text-xs uppercase tracking-widest font-bold">
              {FILTER_LABELS[f] || f}
            </span>
            {isActive && current === f ? <Check size={16} /> : <Zap size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
