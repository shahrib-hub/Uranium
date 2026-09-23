'use client';

import { 
  Disc3, 
  Search, 
  Sparkles, 
  Compass, 
  Play, 
  Radio, 
  Flame,
  Music
} from 'lucide-react';

export default function EmptyPlayerDeck({
  player,
  setActiveTab,
  recommendedTracks = [],
  popularTracks = [],
  playTrack
}) {
  const quickTracks = (recommendedTracks.length > 0 ? recommendedTracks : popularTracks).slice(0, 4);

  return (
    <div className="rounded-xl border border-[#1a1c28] bg-[#0e0f17] p-6 space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Left Standby Branding & Instructions */}
        <div className="flex items-center gap-4 text-center md:text-left">
          <div className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-xl bg-gradient-to-tr from-[#161725] to-[#1e2033] border border-[#2b2e42] grid place-items-center shrink-0 shadow-lg group">
            <Disc3 size={32} className="text-rose-500/70 group-hover:rotate-45 transition-transform duration-700" />
            <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-[#0e0f17]" />
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                Playback Standby
              </span>
              <span className="text-[11px] text-[#7d849c]">
                {player.active ? `Connected: ${player.channelName}` : 'Lossless Engine Ready'}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[#f1f3f9] tracking-tight">
              No song currently playing
            </h2>
            <p className="text-xs text-[#7d849c] max-w-md">
              Start streaming high-fidelity audio to Discord. Search any track or choose from trending charts.
            </p>
          </div>
        </div>

        {/* Action Triggers */}
        <div className="flex flex-wrap items-center justify-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('explore')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#161826] hover:bg-[#1f2235] border border-[#26293d] text-xs font-semibold text-[#f1f3f9] transition"
          >
            <Compass size={14} className="text-rose-400" />
            <span>Top 50 Charts</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('feed')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-600/15 hover:bg-rose-600/25 border border-rose-500/30 text-xs font-semibold text-rose-300 transition"
          >
            <Sparkles size={14} />
            <span>Smart Recommendations</span>
          </button>
        </div>
      </div>

      {/* Suggested Quick-Play Track Row */}
      {quickTracks.length > 0 && (
        <div className="pt-4 border-t border-[#181a26] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#636a82] flex items-center gap-1.5">
              <Flame size={13} className="text-amber-400" />
              <span>Quick Start Recommendations</span>
            </span>
            <span className="text-[11px] text-[#636a82]">Click to queue instantly</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {quickTracks.map((t, idx) => (
              <div
                key={idx}
                onClick={() => playTrack(t)}
                className="group flex items-center justify-between gap-3 p-2 rounded-lg bg-[#12131e] border border-[#1d1f2e] hover:border-rose-500/30 hover:bg-[#171928] transition cursor-pointer"
              >
                <img
                  src={t.thumbnail || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                  alt=""
                  className="h-9 w-9 rounded-md object-cover bg-black/40 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-[#e2e5f0] group-hover:text-white truncate transition">
                    {t.title}
                  </p>
                  <p className="text-[10px] text-[#717892] truncate">{t.author}</p>
                </div>
                <button
                  type="button"
                  className="h-7 w-7 rounded-md bg-white/[0.04] group-hover:bg-rose-600 text-[#717892] group-hover:text-white grid place-items-center shrink-0 transition"
                  title="Play Track"
                >
                  <Play size={11} fill="currentColor" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
