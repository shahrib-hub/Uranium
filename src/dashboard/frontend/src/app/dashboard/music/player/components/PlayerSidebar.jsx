'use client';

import Link from 'next/link';
import { 
  ListMusic, 
  Compass, 
  Sparkles, 
  Plus, 
  Play, 
  Trash2, 
  Radio, 
  Crown, 
  Music2, 
  FolderPlus 
} from 'lucide-react';

export default function PlayerSidebar({
  guildId,
  player,
  activeTab,
  setActiveTab,
  playlists,
  playlistQuota,
  setCreateModalOpen,
  playPlaylist,
  handleDeletePlaylist,
  setSelectedPlaylist
}) {
  return (
    <aside className="w-60 shrink-0 border-r border-[#161722] bg-[#0b0c12] flex flex-col p-3.5 space-y-4 hidden md:flex overflow-y-auto select-none">
      {/* ── DISCORD VOICE SESSION CARD ────────────────────────────────────────── */}
      <div className="rounded-lg border border-[#1c1e2a] bg-[#11121b] p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#60667e]">
            Discord Session
          </span>
          <span
            className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
              player.active 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'bg-white/5 text-[#7c839b]'
            }`}
          >
            {player.active ? 'Streaming' : 'Standby'}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <div className={`h-8 w-8 rounded-lg grid place-items-center shrink-0 ${
            player.active 
              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
              : 'bg-white/5 text-[#5e647c] border border-white/5'
          }`}>
            <Radio size={14} className={player.active ? 'animate-pulse' : ''} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-[#f1f3f9] truncate">
              {player.active ? player.channelName : 'No Voice Channel'}
            </p>
            <p className="text-[10px] text-[#6b7289] truncate">
              {player.active ? `${player.queue?.length || 0} tracks queued` : 'Connect in Discord'}
            </p>
          </div>
        </div>
      </div>

      {/* ── MAIN PRODUCT NAVIGATION ───────────────────────────────────────────── */}
      <nav className="space-y-0.5">
        <button
          type="button"
          onClick={() => setActiveTab('queue')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-all ${
            activeTab === 'queue'
              ? 'bg-rose-500/[0.08] text-white border-l-2 border-rose-500 font-semibold'
              : 'text-[#8b91a7] hover:text-[#f1f3f9] hover:bg-white/[0.03]'
          }`}
        >
          <ListMusic size={15} className={activeTab === 'queue' ? 'text-rose-400' : 'text-[#6b7289]'} />
          <span>Queue & Player</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('explore')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-all ${
            activeTab === 'explore'
              ? 'bg-rose-500/[0.08] text-white border-l-2 border-rose-500 font-semibold'
              : 'text-[#8b91a7] hover:text-[#f1f3f9] hover:bg-white/[0.03]'
          }`}
        >
          <Compass size={15} className={activeTab === 'explore' ? 'text-rose-400' : 'text-[#6b7289]'} />
          <span>Explore & Charts</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('feed')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-all ${
            activeTab === 'feed'
              ? 'bg-rose-500/[0.08] text-white border-l-2 border-rose-500 font-semibold'
              : 'text-[#8b91a7] hover:text-[#f1f3f9] hover:bg-white/[0.03]'
          }`}
        >
          <Sparkles size={15} className={activeTab === 'feed' ? 'text-rose-400' : 'text-[#6b7289]'} />
          <span>Smart For-You</span>
        </button>
      </nav>

      {/* ── PLAYLISTS & LIBRARY ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 pt-3 border-t border-[#181924] space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#60667e]">
            Playlists
          </span>
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            title="Create Playlist"
            className="h-6 w-6 rounded-md bg-white/[0.04] hover:bg-rose-500/20 text-[#8b91a7] hover:text-rose-300 flex items-center justify-center transition"
          >
            <Plus size={13} />
          </button>
        </div>

        {/* Quota Bar */}
        <div className="flex items-center justify-between text-[11px] px-1 text-[#6b7289]">
          <span>
            Quota: <strong className="text-[#c3c7d6]">{playlistQuota.count}/{playlistQuota.max}</strong>
          </span>
          {!playlistQuota.isPremium ? (
            <Link
              href={`/dashboard/premium${guildId ? `?guild=${guildId}` : ''}`}
              className="text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 text-[10px]"
            >
              <Crown size={10} className="fill-amber-400" />
              <span>Upgrade</span>
            </Link>
          ) : (
            <span className="text-amber-400 font-medium text-[10px]">👑 Premium</span>
          )}
        </div>

        {/* Playlists List Container */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-1">
          {playlists.length > 0 ? (
            playlists.map((pl) => (
              <div
                key={pl.id}
                className="group flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-white/[0.04] transition cursor-pointer"
              >
                <div
                  className="flex items-center gap-2.5 min-w-0 flex-1"
                  onClick={() => setSelectedPlaylist(pl)}
                >
                  <span className="grid h-6 w-6 place-items-center rounded bg-purple-500/10 text-purple-300 text-xs shrink-0">
                    <Music2 size={12} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-[#e2e4ed] truncate group-hover:text-white transition">
                      {pl.name}
                    </p>
                    <p className="text-[10px] text-[#6b7289]">
                      {pl.tracks?.length || 0} tracks
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      playPlaylist(pl.id);
                    }}
                    title="Play in Discord"
                    className="p-1 rounded text-emerald-400 hover:bg-emerald-500/20"
                  >
                    <Play size={12} fill="currentColor" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePlaylist(pl.id, pl.name);
                    }}
                    title="Delete Playlist"
                    className="p-1 rounded text-rose-400 hover:bg-rose-500/20"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-6 px-2 text-center rounded-lg border border-dashed border-[#1c1d29] space-y-2 mt-2">
              <FolderPlus size={18} className="mx-auto text-[#4a4f66]" />
              <p className="text-[11px] text-[#6b7289] font-medium leading-relaxed">
                No personal playlists yet
              </p>
              <button
                type="button"
                onClick={() => setCreateModalOpen(true)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 hover:text-rose-300"
              >
                <Plus size={11} />
                <span>Create Playlist</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
