'use client';
import { Play, Pause, SkipForward, SkipBack, Volume2, Repeat, Shuffle, Zap, Activity } from 'lucide-react';
import { useStore } from '@/store';
import PremiumButton from './PremiumButton';
import { useState, useEffect } from 'react';

export default function MusicControls() {
  const { player } = useStore();
  const [localVolume, setLocalVolume] = useState(player?.volume || 100);

  useEffect(() => {
    if (player?.volume !== undefined) setLocalVolume(player.volume);
  }, [player?.volume]);

  const handleAction = (action, body = {}) => {
    fetch(`/api/guild/${player.guildId}/player/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...body })
    });
  };

  const handleVolumeChange = (e) => {
    const vol = Math.min(100, Math.max(0, parseInt(e.target.value)));
    setLocalVolume(vol);
    handleAction('volume', { value: vol });
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
      <div className="glass p-12 rounded-[40px] flex flex-col items-center justify-center text-center space-y-6 ambient-red-border min-h-[300px]">
        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center animate-pulse">
          <Activity className="text-white/20" size={32} />
        </div>
        <div>
          <h3 className="text-2xl font-black text-white/40 uppercase">No Active Session</h3>
          <p className="text-sm text-white/20 font-medium">Join a voice channel node to initialize the Uranium player.</p>
        </div>
      </div>
    );
  }

  if (!player.current) {
    return (
      <div className="glass p-12 rounded-[40px] flex flex-col items-center justify-center text-center space-y-6 ambient-red-border min-h-[300px] border-green-500/20 bg-green-500/[0.01]">
        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
          <Zap className="text-green-500 animate-pulse" size={32} />
        </div>
        <div>
          <h3 className="text-2xl font-black text-green-500 uppercase italic">Uranium Standby</h3>
          <p className="text-sm text-white/40 font-medium">Synchronized with <span className="text-white">#{player.channelName || 'Voice Node'}</span>. Search for a track to begin playback.</p>
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
    <div className="glass p-10 rounded-[40px] ambient-red-border space-y-8">
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
          <h2 className="text-2xl sm:text-3xl font-black truncate tracking-tight mb-1">{player.current.title}</h2>
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

          <PremiumButton 
            variant={player.autoplay ? 'red' : 'ghost'} 
            className={`p-3 ${player.autoplay ? 'bg-red-500/10' : ''}`}
            onClick={() => handleAction('autoplay')}
          >
            <Zap size={20} fill={player.autoplay ? 'currentColor' : 'none'} />
          </PremiumButton>
        </div>

        <div className="w-full sm:w-auto flex items-center justify-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/10">
          <Volume2 size={16} className="text-white/20" />
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={localVolume}
            onChange={handleVolumeChange}
            className="w-full sm:w-24 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-red-500"
          />
        </div>
      </div>
    </div>
  );
}
