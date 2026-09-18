'use client';

import MusicControls from '@/components/MusicControls';
import SearchPicker from '@/components/SearchPicker';
import QueueManager from '@/components/QueueManager';
import FilterSelector from '@/components/FilterSelector';
import VoiceSelector from '@/components/VoiceSelector';
import { Headphones, ListMusic, SlidersHorizontal } from 'lucide-react';

export default function MusicPage() {
  return <div className="lucent-page mx-auto max-w-7xl">
    <header className="mb-7"><p className="lucent-kicker mb-3">Music</p><h1 className="lucent-title text-4xl sm:text-5xl">Listen together.</h1><p className="lucent-subtitle mt-4">Control music for the selected server. You need to be in the same voice channel as the bot to make changes.</p></header>
    <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
      <div className="space-y-5">
        <MusicControls />
        <div className="grid gap-5 md:grid-cols-2">
          <section className="lucent-card rounded-[1.5rem] p-6"><div className="mb-5 flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-rose-400/15 text-rose-100"><SlidersHorizontal size={18} /></span><div><h2 className="font-semibold">Sound options</h2><p className="text-sm text-[var(--muted)]">Choose a sound effect for the current player.</p></div></div><FilterSelector /></section>
          <section className="lucent-card rounded-[1.5rem] p-6"><div className="mb-5 flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-rose-400/15 text-rose-100"><Headphones size={18} /></span><div><h2 className="font-semibold">Find music</h2><p className="text-sm text-[var(--muted)]">Search and add something to the queue.</p></div></div><SearchPicker /></section>
        </div>
      </div>
      <div className="space-y-5"><QueueManager /><section className="lucent-card rounded-[1.5rem] p-6"><div className="mb-5 flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-rose-400/15 text-rose-100"><ListMusic size={18} /></span><div><h2 className="font-semibold">Voice channel</h2><p className="text-sm text-[var(--muted)]">Choose where the bot should join.</p></div></div><VoiceSelector /></section></div>
    </div>
  </div>;
}
