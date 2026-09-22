'use client';
import { Play, Pause, SkipForward, SkipBack, Square, Volume2, Repeat, Shuffle, RefreshCw, Activity, Zap } from 'lucide-react';
import { useStore } from '@/store';
import PremiumButton from './PremiumButton';
import { useState, useEffect, useRef } from 'react';

export default function MusicControls() {
  const { player } = useStore();
  const [localVolume, setLocalVolume] = useState(player?.volume || 100);
  const isDraggingVolumeRef = useRef(false);
  const volumeDebounceRef = useRef(null);

  useEffect(() => {
    if (!isDraggingVolumeRef.current && player?.volume !== undefined) {
      setLocalVolume(player.volume);
    }
  }, [player?.volume]);

  const handleAction = (action, body = {}) => {
    fetch(`/api/guild/${player.guildId}/player/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...body })
    });
  };

  const handleVolumeChange = (e) => {
    const vol = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
    setLocalVolume(vol);
    isDraggingVolumeRef.current = true;
    if (volumeDebounceRef.current) clearTimeout(volumeDebounceRef.current);
    volumeDebounceRef.current = setTimeout(() => {
      isDraggingVolumeRef.current = false;
      handleAction('volume', { value: vol });
    }, 120);
  };

  const handleSeek = (e) => {
    const pos = parseInt(e.target.value);
    handleAction('seek', { value: pos });
  };

  const toggleLoop = () => {
    handleAction('loop');
  };

  if (!player?.active) {
    return (
      <div className="lucent-card p-8 rounded-[1.5rem] flex flex-col items-center justify-center text-center space-y-4 min-h-[220px]">
        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-rose-300 animate-pulse">
          <Activity size={24} />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white uppercase tracking-wider">No Active Music Session</h3>
          <p className="text-xs text-[var(--muted)] mt-1 max-w-sm">Join a voice channel in your Discord server to initialize playback with Uranium.</p>
        </div>
      </div>
    );
  }

  if (!player.current) {
    return (
      <div className="lucent-card p-8 rounded-[1.5rem] flex flex-col items-center justify-center text-center space-y-4 min-h-[220px]">
        <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center">
          <Zap size={24} className="animate-pulse" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-emerald-300 uppercase tracking-wider">Player Connected & Ready</h3>
          <p className="text-xs text-[var(--muted)] mt-1 max-w-sm">Synchronized with <span className="text-white font-medium">#{player.channelName || 'Voice Channel'}</span>. Search or queue a song to begin.</p>
        </div>
      </div>
    );
  }

  const formatTime = (ms) => {
    const sec = Math.floor(ms / 1000);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="lucent-card p-6 sm:p-7 rounded-[1.5rem] space-y-6">
      {/* Track Info */}
      <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-center sm:items-start text-center sm:text-left">
        <div className="w-40 h-40 sm:w-32 sm:h-32 rounded-3xl overflow-hidden shadow-2xl border border-white/10 group relative flex-shrink-0">
          <img src={player.current.thumbnail} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
          <div className="absolute inset-0 bg-red-500/10 mix-blend-overlay" />
        </div>
        <div className="flex-1 min-w-0 w-full">
          <div className="flex flex-col sm:flex-row items-center gap-3 mb-2">
            <span className="px-2 py-0.5 rounded-md bg-red-500 text-[10px] font-black text-black uppercase">Now Playing</span>
            <span className="text-[10px] font-bold text-white/20 tracking-widest uppercase">{player.current.source}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-1 leading-tight">{player.current.title}</h2>
          <p className="text-sm sm:text-base text-white/40 font-medium">by {player.current.author}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-3">
        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/40">
          <span>{formatTime(player.position)}</span>
          <span className="text-red-500">{formatTime(player.current.duration)}</span>
        </div>
        <input 
          type="range" 
          min="0" 
          max={player.current.duration} 
          value={player.position}
          onChange={handleSeek}
          className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-red-500 hover:accent-red-400 transition-all"
        />
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-4">
          <PremiumButton variant="ghost" className="p-3" onClick={() => handleAction('previous')}>
            <SkipBack size={20} />
          </PremiumButton>
          
          <PremiumButton 
            variant="red" 
            className="p-5 rounded-full shadow-[0_0_30px_rgba(239,68,68,0.3)]"
            onClick={() => handleAction(player.paused ? 'resume' : 'pause')}
          >
            {player.paused ? <Play fill="black" size={28} /> : <Pause fill="black" size={28} />}
          </PremiumButton>
          
          <PremiumButton variant="ghost" className="p-3" onClick={() => handleAction('skip')}>
            <SkipForward size={20} />
          </PremiumButton>

          <PremiumButton 
            variant="ghost" 
            className="p-3 text-white/50 hover:text-red-400 hover:bg-red-500/10" 
            title="Stop playback & disconnect"
            onClick={() => handleAction('stop')}
          >
            <Square size={18} />
          </PremiumButton>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <PremiumButton 
            variant={player.loop !== 'none' ? 'red' : 'ghost'} 
            className={`p-3 relative ${player.loop !== 'none' ? 'bg-red-500/10' : ''}`}
            onClick={toggleLoop}
          >
            <Repeat size={20} />
            {player.loop !== 'none' && (
              <span className="absolute -top-1 -right-1 text-[8px] font-black bg-red-500 text-black px-1 rounded-sm uppercase">
                {player.loop === 'track' ? '1' : 'All'}
              </span>
            )}
          </PremiumButton>
          
          <PremiumButton 
            variant="ghost" 
            className="p-3" 
            onClick={() => handleAction('shuffle')}
          >
            <Shuffle size={20} />
          </PremiumButton>

        </div>

        <div className="w-full sm:w-auto flex items-center justify-center gap-3 bg-white/5 px-3.5 py-2.5 rounded-2xl border border-white/10">
          <Volume2 size={16} className="text-white/40 shrink-0" />
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={localVolume}
            onPointerDown={() => { isDraggingVolumeRef.current = true; }}
            onPointerUp={() => { isDraggingVolumeRef.current = false; }}
            onChange={handleVolumeChange}
            className="w-full sm:w-24 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-red-500"
          />
          <span className="text-[11px] font-mono text-white/50 w-7 text-right select-none">
            {localVolume}%
          </span>
        </div>
      </div>
    </div>
  );
}
