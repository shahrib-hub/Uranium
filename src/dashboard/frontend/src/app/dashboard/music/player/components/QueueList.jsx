'use client';

import { 
  ListMusic, 
  Shuffle, 
  Trash2, 
  GripVertical, 
  Play, 
  Clock, 
  Music, 
  PlusCircle, 
  Disc 
} from 'lucide-react';

export default function QueueList({
  queue = [],
  currentTrack,
  doAction,
  formatTime,
  playTrack,
  setActiveTab
}) {
  const queueLength = queue?.length || 0;
  
  // Calculate total remaining queue duration
  const totalDurationMs = queue.reduce((acc, t) => acc + (t.duration || 0), 0);

  return (
    <div className="space-y-3">
      {/* ── QUEUE HEADER & ACTIONS ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-[#f1f3f9] flex items-center gap-1.5">
            <ListMusic size={14} className="text-rose-400" />
            <span>Up Next in Queue</span>
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/[0.06] text-[#9ca3af]">
            {queueLength} {queueLength === 1 ? 'track' : 'tracks'}
          </span>
          {totalDurationMs > 0 && (
            <span className="text-[11px] font-mono text-[#636a82] hidden sm:inline">
              • {formatTime(totalDurationMs)} playtime
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => doAction('shuffle')}
            disabled={queueLength < 2}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-[#8b91a7] hover:text-white bg-white/[0.03] hover:bg-white/[0.08] transition disabled:opacity-30 disabled:pointer-events-none"
            title="Shuffle Upcoming Tracks"
          >
            <Shuffle size={12} />
            <span>Shuffle</span>
          </button>

          <button
            type="button"
            onClick={() => doAction('stop')}
            disabled={queueLength === 0 && !currentTrack}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-rose-300/80 hover:text-rose-200 bg-rose-500/[0.06] hover:bg-rose-500/[0.15] transition disabled:opacity-30 disabled:pointer-events-none"
            title="Clear Queue"
          >
            <Trash2 size={12} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* ── QUEUE TRACKS LIST ──────────────────────────────────────────────── */}
      {queueLength > 0 ? (
        <div className="rounded-xl border border-[#161724] bg-[#0c0d14] overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[32px_1fr_55px] sm:grid-cols-[40px_1fr_120px_80px_60px] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#585e75] border-b border-[#161724] select-none">
            <span className="text-center">#</span>
            <span>Title</span>
            <span className="hidden sm:block">Source</span>
            <span className="text-right">Duration</span>
            <span className="text-right hidden sm:block">Action</span>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-[#131420] max-h-[460px] overflow-y-auto">
            {queue.map((t, idx) => (
              <div
                key={idx}
                className="grid grid-cols-[32px_1fr_55px] sm:grid-cols-[40px_1fr_120px_80px_60px] items-center px-3 py-2 text-xs hover:bg-white/[0.03] transition group"
              >
                {/* Index / Grip Affordance */}
                <div className="text-center flex items-center justify-center text-[#585e75] group-hover:text-[#9ca3af]">
                  <span className="group-hover:hidden font-mono text-[11px]">{idx + 1}</span>
                  <GripVertical size={13} className="hidden group-hover:block text-[#717892] cursor-grab" />
                </div>

                {/* Title & Artist */}
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <img
                    src={t.thumbnail || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                    alt=""
                    className="h-8 w-8 rounded object-cover bg-black/40 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[#e2e5f0] group-hover:text-white truncate transition">
                      {t.title}
                    </p>
                    <p className="text-[11px] text-[#6b7289] truncate">{t.author}</p>
                  </div>
                </div>

                {/* Source Badge */}
                <div className="hidden sm:block">
                  <span className="text-[10px] text-[#717892] px-1.5 py-0.5 rounded bg-white/[0.03] border border-white/[0.04]">
                    {t.source || 'Stream'}
                  </span>
                </div>

                {/* Duration */}
                <div className="text-right font-mono text-[11px] text-[#717892]">
                  {formatTime(t.duration)}
                </div>

                {/* Quick Actions */}
                <div className="text-right hidden sm:flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => playTrack(t)}
                    title="Skip to this track"
                    className="p-1 rounded text-[#717892] hover:text-rose-400 hover:bg-rose-500/10 transition opacity-0 group-hover:opacity-100"
                  >
                    <Play size={12} fill="currentColor" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Refined Empty Queue Message */
        <div className="rounded-xl border border-dashed border-[#1a1c27] bg-[#0c0d14]/50 py-8 px-4 text-center space-y-2">
          <Disc size={22} className="mx-auto text-[#484e68]" />
          <p className="text-xs font-semibold text-[#8b91a7]">Queue is currently empty</p>
          <p className="text-[11px] text-[#585e75] max-w-sm mx-auto">
            Use the search field above or choose from recommendations below to add tracks to your server.
          </p>
          <button
            type="button"
            onClick={() => setActiveTab('explore')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 pt-1"
          >
            <span>Browse Trending Music</span>
            <span>→</span>
          </button>
        </div>
      )}
    </div>
  );
}
