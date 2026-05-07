'use client';
import { useStore } from '@/store';
import { Trash2, GripVertical, ListX, Clock, Music } from 'lucide-react';
import { motion, Reorder } from 'framer-motion';
import { useState, useEffect } from 'react';

export default function QueueManager() {
  const { player } = useStore();
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    if (player?.queue) setQueue(player.queue);
  }, [player?.queue]);

  const handleRemove = (pos) => {
    fetch(`/api/guild/${player.guildId}/queue/remove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ position: pos })
    });
  };

  const handleClear = () => {
    fetch(`/api/guild/${player.guildId}/queue/clear`, {
      method: 'POST'
    });
  };

  const handleReorder = (newQueue) => {
    // Find what moved
    const oldQueue = queue;
    let from = -1;
    let to = -1;

    // This is a simplified check for a single item move
    for (let i = 0; i < newQueue.length; i++) {
      if (newQueue[i].uri !== oldQueue[i]?.uri) {
        // Find where the item at i in newQueue was in oldQueue
        const item = newQueue[i];
        from = oldQueue.findIndex(t => t.uri === item.uri && t.title === item.title);
        to = i;
        break;
      }
    }

    if (from !== -1 && to !== -1 && from !== to) {
      fetch(`/api/guild/${player.guildId}/queue/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to })
      });
    }
    
    setQueue(newQueue);
  };

  const formatTime = (ms) => {
    const sec = Math.floor(ms / 1000);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!player?.active || !queue.length) {
    return (
      <div className="glass p-8 rounded-3xl min-h-[400px] flex flex-col items-center justify-center text-center space-y-4">
        <div className="p-4 bg-white/5 rounded-2xl">
          <Music className="text-white/10" size={32} />
        </div>
        <p className="text-white/20 font-bold uppercase tracking-widest text-xs">Queue is Empty</p>
      </div>
    );
  }

  return (
    <div className="glass p-8 rounded-[40px] ambient-red-border space-y-6 flex flex-col h-full max-h-[600px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-black">Up Next</h3>
          <span className="px-2 py-1 bg-red-500/10 text-red-500 text-[10px] font-black rounded-md">{queue.length} Tracks</span>
        </div>
        <button 
          onClick={handleClear}
          className="p-2 hover:bg-red-500/10 text-white/20 hover:text-red-500 transition-all rounded-xl flex items-center gap-2 group"
        >
          <span className="text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Clear All</span>
          <ListX size={18} />
        </button>
      </div>

      <Reorder.Group 
        axis="y" 
        values={queue} 
        onReorder={handleReorder}
        className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar"
      >
        {queue.map((track, i) => (
          <Reorder.Item
            key={`${track.uri}-${track.position}-${i}`}
            value={track}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="group flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all cursor-grab active:cursor-grabbing bg-transparent"
          >
            <div className="text-xs font-mono text-white/10 w-4 flex items-center justify-center">
              <GripVertical size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/5 flex-shrink-0">
              <img src={track.thumbnail} className="w-full h-full object-cover" alt="" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm truncate group-hover:text-red-500 transition-colors">{track.title}</h4>
              <p className="text-[10px] text-white/40 truncate">{track.author}</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="hidden sm:block text-[10px] font-mono text-white/20">{formatTime(track.duration)}</span>
              <button 
                onClick={(e) => { e.stopPropagation(); handleRemove(track.position); }}
                className="p-2 text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all md:opacity-0 md:group-hover:opacity-100"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      <div className="pt-4 border-t border-white/5 flex items-center justify-between text-white/20">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
          <Clock size={12} />
          Total Time: {formatTime(queue.reduce((acc, t) => acc + t.duration, 0))}
        </div>
      </div>
    </div>
  );
}
