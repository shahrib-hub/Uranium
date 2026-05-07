'use client';
import { motion } from 'framer-motion';
import MusicControls from '@/components/MusicControls';
import SearchPicker from '@/components/SearchPicker';
import QueueManager from '@/components/QueueManager';
import FilterSelector from '@/components/FilterSelector';
import VoiceSelector from '@/components/VoiceSelector';

import { Music, Terminal, Settings } from 'lucide-react';

export default function MusicPage() {
  return (
    <div className="p-6 lg:p-12 space-y-8 md:space-y-12 max-w-[1800px] mx-auto animate-in fade-in duration-500">
      <header>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-2"
        >
          <div className="h-px w-12 bg-red-500" />
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-[4px] text-red-500">Commands Registry</span>
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-4xl sm:text-6xl font-black tracking-tighter uppercase italic"
        >
          Uranium <span className="text-red-500">Music</span>
        </motion.h1>
      </header>

      <div className="grid grid-cols-12 gap-8">
        {/* Left Column: Live Control & Filters */}
        <div className="col-span-12 xl:col-span-8 space-y-8">
          <MusicControls />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FilterSelector />
            
            <div className="glass p-8 rounded-[40px] ambient-red-border">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                <Terminal className="text-red-500" size={24} />
                Commands
              </h3>
              <SearchPicker />
            </div>
          </div>
          

        </div>

        {/* Right Column: Status & Queue */}
        <div className="col-span-12 xl:col-span-4 space-y-8">
          <QueueManager />
          <VoiceSelector />
          
          <div className="glass p-8 rounded-[40px] border border-white/5 bg-red-500/[0.02]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Engine Status</span>
            </div>
            <p className="text-xs text-white/40 leading-relaxed font-medium">
              The Uranium Audio Engine is currently bridged via the Uranium Bot API. 
              Real-time synchronization is active for all dashboard nodes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
