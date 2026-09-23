'use client';

import { 
  Play, 
  Pause, 
  SkipForward, 
  Repeat, 
  Heart, 
  Radio, 
  Sparkles, 
  SlidersHorizontal,
  ExternalLink,
  Disc3,
  Music
} from 'lucide-react';

export default function NowPlayingHero({
  player,
  doAction,
  playlists,
  addCurrentToPlaylist,
  formatTime,
  seekPos
}) {
  const current = player.current;
  if (!current) return null;

  const duration = current.duration || 0;
  const progressPercent = duration > 0 ? Math.min(100, (seekPos / duration) * 100) : 0;

  return (
    <div className="relative overflow-hidden rounded-xl border border-[#1d1f2c] bg-gradient-to-br from-[#131520] via-[#0f1018] to-[#0c0d14] p-5 sm:p-6 shadow-xl">
      {/* Subtle background ambient blur */}
      <div 
        className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-rose-600/[0.07] blur-3xl pointer-events-none" 
      />

      <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-5 sm:gap-6">
        {/* Album Artwork with Vinyl Frame & Visualizer Overlay */}
        <div className="relative h-32 w-32 sm:h-36 sm:w-36 shrink-0 rounded-lg overflow-hidden border border-white/10 shadow-2xl group bg-black/60">
          <img
            src={current.thumbnail || 'https://cdn.discordapp.com/embed/avatars/0.png'}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* Equalizer bars indicator on top of artwork when playing */}
          <div className="absolute bottom-2 right-2 flex items-end gap-0.5 h-4 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm">
            {player.playing && !player.paused ? (
              <>
                <span className="w-0.5 bg-rose-400 rounded-full eq-bar-1" />
                <span className="w-0.5 bg-rose-400 rounded-full eq-bar-2" />
                <span className="w-0.5 bg-rose-400 rounded-full eq-bar-3" />
                <span className="w-0.5 bg-rose-400 rounded-full eq-bar-4" />
                <span className="w-0.5 bg-rose-400 rounded-full eq-bar-5" />
              </>
            ) : (
              <span className="text-[9px] font-bold text-white/60">PAUSED</span>
            )}
          </div>
        </div>

        {/* Track Metadata & Quick Controls */}
        <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch text-center md:text-left space-y-3">
          <div>
            {/* Badges Bar */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-rose-500/10 text-rose-300 border border-rose-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
                Now Streaming
              </span>

              {player.autoplay && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Autoplay
                </span>
              )}

              {player.filter && player.filter !== 'clear' && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-300 border border-purple-500/20">
                  DSP: {player.filter}
                </span>
              )}

              <span className="text-[11px] font-medium text-[#7d849c]">
                {current.source || 'Discord Lossless'}
              </span>
            </div>

            {/* Song Title */}
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-[#f1f3f9] tracking-tight truncate leading-tight">
              {current.title}
            </h1>

            {/* Artist */}
            <p className="text-xs sm:text-sm font-medium text-[#8b91a7] truncate mt-0.5">
              {current.author}
            </p>
          </div>

          {/* Quick Hero Actions & Progress Summary */}
          <div className="pt-1 flex flex-wrap items-center justify-center md:justify-between gap-3 border-t border-white/[0.06]">
            {/* Timeline Progress */}
            <div className="flex items-center gap-2 text-xs font-mono text-[#7d849c]">
              <span className="text-[#f1f3f9] font-medium">{formatTime(seekPos)}</span>
              <span>/</span>
              <span>{formatTime(duration)}</span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5">
              {playlists.length > 0 && (
                <button
                  type="button"
                  onClick={() => addCurrentToPlaylist(playlists[0].id)}
                  title={`Save to "${playlists[0].name}"`}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-[#8b91a7] hover:text-white transition"
                >
                  <Heart size={13} className="text-rose-400" />
                  <span className="hidden sm:inline">Favorite</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => doAction(player.playing && !player.paused ? 'pause' : 'resume')}
                className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition shadow-sm"
              >
                {player.playing && !player.paused ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
                <span>{player.playing && !player.paused ? 'Pause' : 'Resume'}</span>
              </button>

              <button
                type="button"
                onClick={() => doAction('skip')}
                className="p-1.5 rounded-md text-[#8b91a7] hover:text-white hover:bg-white/[0.04] transition"
                title="Skip Track"
              >
                <SkipForward size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
