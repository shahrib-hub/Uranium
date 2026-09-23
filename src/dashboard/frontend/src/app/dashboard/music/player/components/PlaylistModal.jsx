'use client';

import { Music2, X, Plus } from 'lucide-react';

export default function PlaylistModal({
  isOpen,
  onClose,
  playlistName,
  setPlaylistName,
  onSubmit,
  quota
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl border border-[#222538] bg-[#11121d] p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#f1f3f9] flex items-center gap-2">
            <Music2 size={16} className="text-rose-400" />
            <span>Create New Playlist</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[#6b7289] hover:text-white transition p-1"
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[#8b91a7]">
              Playlist Name
            </label>
            <input
              type="text"
              maxLength={50}
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              placeholder="e.g. Synthwave Night Drive"
              className="w-full rounded-lg border border-[#222538] bg-[#0c0d14] px-3.5 py-2 text-xs text-white placeholder:text-[#4d536b] outline-none focus:border-rose-500/50 transition"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#6b7289] pt-1">
            <span>Quota usage: {quota.count}/{quota.max}</span>
            {!quota.isPremium && !quota.canCreate && (
              <span className="text-amber-400 font-medium text-[10px]">Quota Reached</span>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-[#8b91a7] hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!playlistName.trim()}
              className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-md shadow-rose-600/20 disabled:opacity-40 transition"
            >
              Create Playlist
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
