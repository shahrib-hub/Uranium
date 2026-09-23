'use client';

import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Shuffle, 
  Repeat, 
  Volume2, 
  VolumeX, 
  Heart, 
  Radio, 
  Music, 
  SlidersHorizontal 
} from 'lucide-react';

export default function BottomPlayerBar({
  player,
  doAction,
  seekPos,
  setSeekPos,
  localVolume,
  handleVolumeChange,
  handleVolumeToggle,
  isDraggingVolumeRef,
  formatTime,
  playlists = [],
  addCurrentToPlaylist
}) {
  const current = player.current;
  const currentDuration = current?.duration || 0;
  const progressPercent = currentDuration > 0 ? Math.min(100, (seekPos / currentDuration) * 100) : 0;

  return (
    <footer className="fixed inset-x-0 bottom-0 h-20 bg-[#090a10]/95 backdrop-blur-xl border-t border-[#161722] px-4 sm:px-6 flex items-center justify-between gap-4 z-40 select-none">
      {/* ── LEFT: CURRENT TRACK SNAPSHOT ────────────────────────────────────── */}
      <div className="flex items-center gap-3 w-1/4 min-w-[160px] max-w-[260px]">
        {current ? (
          <>
            <img
              src={current.thumbnail || 'https://cdn.discordapp.com/embed/avatars/0.png'}
              alt=""
              className="h-11 w-11 rounded-md object-cover bg-black/40 border border-white/10 shadow shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[#f1f3f9] truncate hover:text-rose-300 transition cursor-default">
                {current.title}
              </p>
              <p className="text-[11px] text-[#717892] truncate">{current.author}</p>
            </div>

            {/* Favorite / Playlist Shortcut */}
            {playlists.length > 0 && (
              <button
                type="button"
                onClick={() => addCurrentToPlaylist(playlists[0].id)}
                title={`Add to "${playlists[0].name}"`}
                className="text-[#646a82] hover:text-rose-400 transition shrink-0 p-1 hidden sm:block"
              >
                <Heart size={15} />
              </button>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2.5 text-[#585e75]">
            <div className="h-9 w-9 rounded-md bg-white/[0.03] border border-white/[0.04] grid place-items-center">
              <Music size={14} />
            </div>
            <span className="text-xs font-medium">No track playing</span>
          </div>
        )}
      </div>

      {/* ── CENTER: PLAYBACK CONTROLS & TIMELINE SCRUBBER ────────────────────── */}
      <div className="flex flex-col items-center gap-1.5 flex-1 max-w-lg">
        {/* Buttons Row */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Shuffle */}
          <button
            type="button"
            onClick={() => doAction('shuffle')}
            className="text-[#6b7289] hover:text-white transition p-1"
            title="Shuffle Upcoming Queue"
          >
            <Shuffle size={14} />
          </button>

          {/* Previous Track */}
          <button
            type="button"
            onClick={() => doAction('previous')}
            className="text-[#8b91a7] hover:text-white transition p-1"
            title="Previous Track"
          >
            <SkipBack size={16} />
          </button>

          {/* Primary Play/Pause Button */}
          <button
            type="button"
            onClick={() => doAction(player.playing && !player.paused ? 'pause' : 'resume')}
            className="h-9 w-9 rounded-full bg-white text-black hover:scale-105 active:scale-95 transition grid place-items-center shadow-md shadow-white/10"
            title={player.playing && !player.paused ? 'Pause' : 'Play'}
          >
            {player.playing && !player.paused ? (
              <Pause size={15} fill="currentColor" />
            ) : (
              <Play size={15} fill="currentColor" className="ml-0.5" />
            )}
          </button>

          {/* Skip Next */}
          <button
            type="button"
            onClick={() => doAction('skip')}
            className="text-[#8b91a7] hover:text-white transition p-1"
            title="Skip Track"
          >
            <SkipForward size={16} />
          </button>

          {/* Repeat / Loop Mode */}
          <button
            type="button"
            onClick={() => doAction('loop')}
            className={`transition relative p-1 ${
              player.loop !== 'none' ? 'text-rose-400' : 'text-[#6b7289] hover:text-white'
            }`}
            title={`Loop Mode: ${player.loop}`}
          >
            <Repeat size={14} />
            {player.loop === 'track' && (
              <span className="absolute -top-1 -right-1 text-[8px] font-bold">1</span>
            )}
          </button>

          {/* Autoplay Toggle */}
          <button
            type="button"
            onClick={() => doAction('autoplay')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold tracking-wider transition ${
              player.autoplay
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-white/[0.04] text-[#6b7289] hover:text-white border border-white/[0.04]'
            }`}
            title="Autoplay similar music when queue ends"
          >
            <Radio size={10} />
            <span>AUTO</span>
          </button>
        </div>

        {/* Timeline Scrubber */}
        <div className="w-full flex items-center gap-2 text-[11px] font-mono text-[#636a82]">
          <span className="w-9 text-right select-none">{formatTime(seekPos)}</span>
          <div
            className="flex-1 h-1.5 bg-white/[0.08] hover:h-2 rounded-full overflow-hidden relative cursor-pointer transition-all group"
            onClick={(e) => {
              if (!currentDuration) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const ratio = Math.max(0, Math.min(1, clickX / rect.width));
              const targetMs = Math.floor(ratio * currentDuration);
              setSeekPos(targetMs);
              doAction('seek', targetMs);
            }}
          >
            <div
              className="h-full bg-rose-500 group-hover:bg-rose-400 rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="w-9 select-none">{formatTime(currentDuration)}</span>
        </div>
      </div>

      {/* ── RIGHT: AUDIO FILTER, HQ BADGE & VOLUME ──────────────────────────── */}
      <div className="flex items-center justify-end gap-3 w-1/4 min-w-[180px]">
        {/* DSP Sound Filter Dropdown */}
        <div className="relative hidden md:block">
          <select
            value={player.filter || 'clear'}
            onChange={(e) => doAction('filter', e.target.value)}
            className="bg-[#12131e] border border-[#202232] hover:border-[#2e3148] text-[11px] font-medium text-[#c3c7d6] rounded-md px-2 py-1 outline-none cursor-pointer transition"
          >
            <option value="clear">DSP: Normal</option>
            <option value="nightcore">DSP: Nightcore</option>
            <option value="bassboost">DSP: Bass Boost</option>
            <option value="vaporwave">DSP: Vaporwave</option>
            <option value="rotation">DSP: 8D Audio</option>
            <option value="soft">DSP: Soft Audio</option>
          </select>
        </div>

        {/* Volume Controls (0ms instant feedback) */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleVolumeToggle}
            className="text-[#717892] hover:text-white transition p-1"
            title={localVolume === 0 ? 'Unmute' : 'Mute'}
          >
            {localVolume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
          <input
            type="range"
            min="0"
            max="100"
            value={localVolume}
            onPointerDown={() => { isDraggingVolumeRef.current = true; }}
            onPointerUp={() => { isDraggingVolumeRef.current = false; }}
            onChange={(e) => handleVolumeChange(e.target.value)}
            className="w-16 player-range accent-rose-500 cursor-pointer"
          />
          <span className="text-[10px] font-mono text-[#717892] w-6 text-right select-none">
            {localVolume}%
          </span>
        </div>
      </div>
    </footer>
  );
}
