'use client';

import { 
  Sparkles, 
  Flame, 
  Clock, 
  Play, 
  TrendingUp, 
  Compass, 
  Disc,
  ArrowRight
} from 'lucide-react';

export default function ExploreFeedView({
  feedData = { popularToday: [], recentlyPlayed: [], genres: [], regions: [], genreTracks: {} },
  selectedGenre,
  setSelectedGenre,
  recommendedTracks = [],
  playTrack,
  activeTab
}) {
  return (
    <div className="space-y-8 select-none">
      {/* ── GENRE FILTER PILL CHIPS ────────────────────────────────────────── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#6b7289] flex items-center gap-1.5">
            <Compass size={13} className="text-rose-400" />
            <span>Browse Categories & Moods</span>
          </span>
          {selectedGenre !== 'All' && (
            <button
              type="button"
              onClick={() => setSelectedGenre('All')}
              className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold"
            >
              Reset to All
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {feedData.genres?.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setSelectedGenre(g)}
              className={`shrink-0 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                selectedGenre === g
                  ? 'bg-rose-600 text-white font-semibold shadow-sm'
                  : 'bg-[#12131e] text-[#8b91a7] hover:text-white border border-[#1d1f2e] hover:border-[#2a2d42]'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* ── GENRE-FILTERED TRACK GRID (When a specific genre is selected) ─── */}
      {selectedGenre !== 'All' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#f1f3f9] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} className="text-rose-400" />
              <span>{selectedGenre} Chart Tracks</span>
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {(feedData.genreTracks?.[selectedGenre] || []).map((item) => (
              <div
                key={item.id}
                onClick={() => playTrack(item)}
                className="rounded-lg bg-[#0f1018] border border-[#1c1d29] p-2.5 space-y-2 hover:border-rose-500/40 hover:bg-[#141522] transition group cursor-pointer"
              >
                <div className="relative aspect-square rounded-md overflow-hidden bg-black/40">
                  <img
                    src={item.thumbnail}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition grid place-items-center">
                    <div className="h-8 w-8 rounded-full bg-rose-600 text-white grid place-items-center shadow-lg">
                      <Play size={14} fill="currentColor" className="ml-0.5" />
                    </div>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#f1f3f9] truncate group-hover:text-rose-300 transition">
                    {item.title}
                  </p>
                  <p className="text-[10px] text-[#717892] truncate">{item.author}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SPOTIFY GLOBAL TOP 50 CAROUSEL ─────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-[#f1f3f9] uppercase tracking-wider flex items-center gap-1.5">
              <Flame size={14} className="text-amber-400" />
              <span>Spotify Global Top 50</span>
            </h3>
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Official
            </span>
          </div>
          <span className="text-[11px] text-[#636a82]">Updated Daily</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {feedData.popularToday?.slice(0, 12).map((item) => (
            <div
              key={item.id}
              onClick={() => playTrack(item)}
              className="rounded-lg bg-[#0e0f17] border border-[#191a27] p-2.5 space-y-2 hover:border-amber-500/30 hover:bg-[#141522] transition group cursor-pointer"
            >
              <div className="relative aspect-square rounded-md overflow-hidden bg-black/40">
                <img
                  src={item.thumbnail}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop';
                  }}
                />
                <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-400 text-black shadow-sm">
                  #{item.rank}
                </span>
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition grid place-items-center">
                  <div className="h-8 w-8 rounded-full bg-white text-black grid place-items-center shadow-lg">
                    <Play size={13} fill="currentColor" className="ml-0.5" />
                  </div>
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#f1f3f9] truncate group-hover:text-amber-300 transition">
                  {item.title}
                </p>
                <p className="text-[10px] text-[#717892] truncate">{item.author}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── TRENDING ON SPOTIFY ────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#f1f3f9] uppercase tracking-wider flex items-center gap-1.5">
            <Clock size={14} className="text-rose-400" />
            <span>Trending Velocity</span>
          </h3>
          <span className="text-[11px] text-[#636a82]">High Play Count</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {feedData.recentlyPlayed?.slice(0, 12).map((item) => (
            <div
              key={item.id}
              onClick={() => playTrack(item)}
              className="rounded-lg bg-[#0e0f17] border border-[#191a27] p-2.5 space-y-2 hover:border-rose-500/30 hover:bg-[#141522] transition group cursor-pointer"
            >
              <div className="relative aspect-square rounded-md overflow-hidden bg-black/40">
                <img
                  src={item.thumbnail}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop';
                  }}
                />
                {item.timeAgo && (
                  <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/70 text-[#cbd0e2] backdrop-blur-sm">
                    {item.timeAgo}
                  </span>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition grid place-items-center">
                  <div className="h-8 w-8 rounded-full bg-rose-600 text-white grid place-items-center shadow-lg">
                    <Play size={13} fill="currentColor" className="ml-0.5" />
                  </div>
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#f1f3f9] truncate group-hover:text-rose-300 transition">
                  {item.title}
                </p>
                <p className="text-[10px] text-[#717892] truncate">{item.author}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FOR-YOU SMART SUGGESTIONS (History Learned) ─────────────────────── */}
      {recommendedTracks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#f1f3f9] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} className="text-purple-400" />
              <span>Personalized Recommendations (Based on your history)</span>
            </h3>
            <span className="text-[11px] text-[#636a82]">Learned Taste</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {recommendedTracks.map((t, idx) => (
              <div
                key={idx}
                onClick={() => playTrack(t)}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-[#0e0f17] border border-[#191a27] hover:border-purple-500/30 hover:bg-[#141522] transition cursor-pointer group"
              >
                <img
                  src={t.thumbnail || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                  alt=""
                  className="h-10 w-10 rounded-md object-cover bg-black/40 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-[#f1f3f9] truncate group-hover:text-purple-300 transition">
                    {t.title}
                  </p>
                  <p className="text-[10px] text-[#717892] truncate">{t.author}</p>
                </div>
                <Play size={12} fill="currentColor" className="text-[#585e75] group-hover:text-purple-400 shrink-0 transition" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
