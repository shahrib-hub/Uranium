'use client';

import Link from 'next/link';
import { 
  ArrowLeft, 
  Search, 
  X, 
  Crown, 
  Radio, 
  Headphones, 
  Sparkles, 
  Play, 
  Plus, 
  Loader2 
} from 'lucide-react';

export default function PlayerHeader({
  guildId,
  player,
  searchQuery,
  setSearchQuery,
  searchResults,
  setSearchResults,
  searching,
  handleSearch,
  playTrack,
  activeTab
}) {
  return (
    <header className="h-16 shrink-0 border-b border-[#181a24] bg-[#0c0d13]/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4 z-30 sticky top-0">
      {/* Left: Navigation & Branding */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        <Link
          href={`/dashboard/music${guildId ? `?guild=${guildId}` : ''}`}
          className="flex items-center gap-2 text-xs font-semibold text-[#8b91a7] hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] transition-all group"
          title="Return to Dashboard Overview"
        >
          <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform text-[#8b91a7] group-hover:text-white" />
          <span className="hidden sm:inline">Dashboard</span>
        </Link>

        <div className="h-4 w-px bg-white/10 hidden sm:block" />

        {/* Audio Engine Branding */}
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-rose-500/10 border border-rose-500/20 grid place-items-center text-rose-400">
            <Headphones size={15} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#f3f4f8] tracking-tight">
                Uranium <span className="text-rose-400 font-semibold">Audio</span>
              </span>
              <span className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-300 border border-rose-500/20">
                320kbps
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Center: Command Palette Style Search Input */}
      <div className="flex-1 max-w-xl relative">
        <form onSubmit={handleSearch} className="relative w-full">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#646a82]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tracks, artists, or paste Spotify / YouTube link..."
            className="w-full bg-[#12131d] border border-[#1e202c] hover:border-[#2b2e40] focus:border-rose-500/50 rounded-lg pl-9 pr-14 py-2 text-xs text-[#f1f3f9] placeholder:text-[#5a6078] outline-none transition-all shadow-inner"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {searching ? (
              <Loader2 size={13} className="text-rose-400 animate-spin" />
            ) : searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="text-[#646a82] hover:text-white p-0.5"
              >
                <X size={13} />
              </button>
            ) : (
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-[#5a6078] bg-[#1a1c28] border border-white/5 rounded">
                /
              </kbd>
            )}
          </div>
        </form>

        {/* Live Search Results Floating Dropdown / Popover */}
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#10111a] border border-[#222538] rounded-xl shadow-2xl p-2.5 z-50 max-h-[380px] overflow-y-auto space-y-1 backdrop-blur-xl">
            <div className="flex items-center justify-between px-2 py-1 text-[11px] font-medium text-[#7d849c]">
              <span>Results for "{searchQuery}"</span>
              <button
                type="button"
                onClick={() => setSearchResults([])}
                className="hover:text-white transition text-[10px]"
              >
                Close
              </button>
            </div>
            {searchResults.map((t, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-white/[0.05] transition group cursor-pointer"
                onClick={() => {
                  playTrack(t);
                  setSearchResults([]);
                  setSearchQuery('');
                }}
              >
                <img
                  src={t.thumbnail || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                  alt=""
                  className="h-9 w-9 rounded-md object-cover bg-black/40 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-[#f1f3f9] truncate group-hover:text-rose-300 transition">
                    {t.title}
                  </p>
                  <p className="text-[11px] text-[#7d849c] truncate">{t.author}</p>
                </div>
                <button
                  type="button"
                  className="h-7 w-7 rounded-md bg-rose-500/10 group-hover:bg-rose-600 text-rose-300 group-hover:text-white grid place-items-center shrink-0 transition"
                  title="Queue Track"
                >
                  <Play size={12} fill="currentColor" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: Discord Voice Session Indicator & Premium */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Connection status badge */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#12131d] border border-[#1c1d29] text-xs">
          <span className={`h-1.5 w-1.5 rounded-full ${player.active ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <span className="font-mono text-[11px] text-[#9ca3af]">18ms</span>
          <span className="text-[#3b3f54]">•</span>
          <span className="text-[#9ca3af] text-[11px] max-w-[110px] truncate hidden sm:inline">
            {player.active ? player.channelName : 'Voice Idle'}
          </span>
        </div>

        {/* Premium Badge Link */}
        <Link
          href={`/dashboard/premium${guildId ? `?guild=${guildId}` : ''}`}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 text-amber-300 text-xs font-semibold transition"
          title="Uranium Premium Tier"
        >
          <Crown size={12} className="fill-amber-400 text-amber-400" />
          <span className="hidden sm:inline">Premium</span>
        </Link>
      </div>
    </header>
  );
}
