'use client';

import { Music2, X, Play, Trash2, Disc } from 'lucide-react';

export default function PlaylistDrawer({
  playlist,
  onClose,
  playPlaylist,
  playTrack,
  formatTime
}) {
  if (!playlist) return null;

  const tracks = playlist.tracks || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-[#222538] bg-[#11121d] p-5 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1b1c2b]">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-rose-500/10 text-rose-400 shrink-0">
              <Music2 size={16} />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-[#f1f3f9] truncate">
                {playlist.name}
              </h3>
              <p className="text-[11px] text-[#6b7289]">
                {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => playPlaylist(playlist.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition"
              title="Load entire playlist to Discord voice queue"
            >
              <Play size={12} fill="currentColor" />
              <span>Play All</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-[#6b7289] hover:text-white transition p-1.5"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Tracks List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-1 divide-y divide-[#171826]">
          {tracks.length > 0 ? (
            tracks.map((t, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-3 py-2 px-1 hover:bg-white/[0.03] rounded-md transition group"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="w-5 text-center font-mono text-[11px] text-[#585e75]">
                    {idx + 1}
                  </span>
                  <img
                    src={t.thumbnail || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                    alt=""
                    className="h-8 w-8 rounded object-cover bg-black/40 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-[#e2e5f0] truncate group-hover:text-white transition">
                      {t.title}
                    </p>
                    <p className="text-[10px] text-[#6b7289] truncate">{t.author}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {t.duration && (
                    <span className="font-mono text-[11px] text-[#6b7289]">
                      {formatTime(t.duration)}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => playTrack(t)}
                    title="Play track"
                    className="p-1 rounded text-[#717892] hover:text-rose-400 transition"
                  >
                    <Play size={13} fill="currentColor" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center space-y-2">
              <Disc size={20} className="mx-auto text-[#484e68]" />
              <p className="text-xs text-[#8b91a7]">This playlist is empty</p>
              <p className="text-[11px] text-[#585e75]">
                Click the heart icon on any currently playing song to save it here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
