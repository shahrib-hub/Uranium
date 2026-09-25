'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import MusicControls from '@/components/MusicControls';
import SearchPicker from '@/components/SearchPicker';
import QueueManager from '@/components/QueueManager';
import FilterSelector from '@/components/FilterSelector';
import VoiceSelector from '@/components/VoiceSelector';
import { Headphones, ListMusic, SlidersHorizontal, Sparkles, ExternalLink } from 'lucide-react';

export default function MusicPage() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get('guild');

  return (
    <div className="lucent-page mx-auto max-w-7xl pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <div className="h-px w-12 bg-red-500" />
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-[4px] text-red-500">
              Audio System
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tighter uppercase italic text-white">
            Music <span className="text-red-500">Center</span>
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-white/50 max-w-xl leading-relaxed">
            Lossless 320kbps audio playback, queue management, studio audio filters, and live voice channel synchronization.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link
            href={`/dashboard/music/player${guildId ? `?guild=${guildId}` : ''}`}
            className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-red-500 hover:bg-red-600 active:scale-95 text-white font-black uppercase tracking-wider text-xs shadow-lg shadow-red-500/20 transition-all w-full sm:w-auto"
          >
            <Headphones size={16} />
            <span>Open Web Player</span>
          </Link>
        </div>
      </header>

      {/* Full Web Music Player Promo Banner */}
      <div className="mb-6 rounded-2xl border border-rose-500/25 bg-gradient-to-r from-rose-950/40 via-[#181923] to-[#181923] p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-rose-600 to-red-500 text-white shadow-lg shadow-rose-600/30">
            <Headphones size={22} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">Experience the Full Web Music Player</h2>
            </div>
            <p className="text-xs text-white/60 mt-0.5 max-w-xl leading-relaxed">
              Full-screen Spotify-style player with personal playlists, autoplay, genre & region filters, and trending music feeds.
            </p>
          </div>
        </div>

        <Link
          href={`/dashboard/music/player${guildId ? `?guild=${guildId}` : ''}`}
          className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-bold text-xs transition shadow-lg shadow-rose-600/25"
        >
          <span>Open Full Web Player</span>
          <ExternalLink size={13} />
        </Link>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <div className="space-y-5">
          <MusicControls />
          <div className="grid gap-5 md:grid-cols-2 items-stretch min-w-0">
            <section className="lucent-card rounded-[1.5rem] p-5 sm:p-6 flex flex-col justify-start min-w-0 overflow-hidden">
              <div className="mb-4 flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-rose-400/15 text-rose-100 shrink-0">
                  <SlidersHorizontal size={18} />
                </span>
                <div>
                  <h2 className="font-semibold text-white">Sound Filters</h2>
                  <p className="text-xs text-[var(--muted)]">Apply audio DSP effects to playback.</p>
                </div>
              </div>
              <FilterSelector />
            </section>

            <section className="lucent-card rounded-[1.5rem] p-5 sm:p-6 flex flex-col justify-start min-w-0 overflow-hidden">
              <div className="mb-4 flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-rose-400/15 text-rose-100 shrink-0">
                  <Headphones size={18} />
                </span>
                <div>
                  <h2 className="font-semibold text-white">Sound Search</h2>
                  <p className="text-xs text-[var(--muted)]">Find tracks and add them to queue.</p>
                </div>
              </div>
              <SearchPicker />
            </section>
          </div>
        </div>
        <div className="space-y-5">
          <QueueManager />
          <section className="lucent-card rounded-[1.5rem] p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-rose-400/15 text-rose-100">
                <ListMusic size={18} />
              </span>
              <div>
                <h2 className="font-semibold">Voice channel</h2>
                <p className="text-sm text-[var(--muted)]">Choose where the bot should join.</p>
              </div>
            </div>
            <VoiceSelector />
          </section>
        </div>
      </div>
    </div>
  );
}
