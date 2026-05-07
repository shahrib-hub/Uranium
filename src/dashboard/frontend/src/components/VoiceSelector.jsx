'use client';
import { useStore } from '@/store';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Volume2, Users, Play } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

export default function VoiceSelector() {
  const { player } = useStore();
  const searchParams = useSearchParams();
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Use player guildId first, fallback to URL search params
  const guildId = player.guildId || searchParams.get('guild');

  useEffect(() => {
    if (guildId) {
      fetch(`/api/guild/${guildId}/voice-channels`)
        .then(r => r.json())
        .then(data => setChannels(Array.isArray(data) ? data : []))
        .catch(console.error);
    }
  }, [guildId, player.active]);

  const joinChannel = async (channelId) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/guild/${guildId}/player/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceId: channelId })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to join channel');
      }
    } catch (e) { 
      console.error(e);
      setError('A connection error occurred.');
    }
    setLoading(false);
  };

  return (
    <div className={`glass p-8 rounded-[40px] ambient-red-border space-y-6 transition-all duration-500 ${player.active ? 'opacity-50 grayscale-[0.5]' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-xl font-black flex items-center gap-3">
            <Volume2 className="text-red-500" size={24} />
            Voice Nodes
          </h3>
          {player.active && (
            <p className="text-[10px] text-red-500 font-bold uppercase tracking-tighter">
              Active Connection Lock Enabled
            </p>
          )}
        </div>
        <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">
          {player.active ? 'CONNECTED' : `Available: ${channels.length}`}
        </span>
      </div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold text-center"
        >
          {error}
        </motion.div>
      )}

      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
        {channels.length === 0 ? (
          <div className="text-center py-8 text-white/20 text-sm font-medium">
            {guildId ? 'Scanning for nodes...' : 'No server selected'}
          </div>
        ) : (
          channels.map((ch) => {
            const isCurrent = player.active && player.voiceId === ch.id;
            return (
              <motion.button
                key={ch.id}
                whileHover={!isCurrent && !player.active ? { x: 4 } : {}}
                onClick={() => !isCurrent && !player.active && joinChannel(ch.id)}
                disabled={loading || isCurrent || player.active}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all group ${
                  isCurrent 
                    ? 'bg-red-500 border-red-500 text-black' 
                    : 'bg-white/5 border-transparent hover:border-red-500/20 hover:bg-red-500/5'
                } ${player.active && !isCurrent ? 'cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <div className={isCurrent ? 'text-black' : 'text-white/40 group-hover:text-red-500'}>
                    <Users size={18} />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-sm">{ch.name}</div>
                    <div className={`text-[10px] uppercase font-black ${isCurrent ? 'text-black/60' : 'text-white/20'}`}>
                      {ch.userCount} Active Users
                    </div>
                  </div>
                </div>
                {!isCurrent && !player.active && (
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                    <Play size={14} fill="currentColor" />
                  </div>
                )}
              </motion.button>
            );
          })
        )}
      </div>

      <div className="pt-4 border-t border-white/5">
        <p className="text-[10px] text-white/20 font-medium leading-relaxed">
          {player.active 
            ? 'Uranium is currently synchronized with a node. Stop the player to switch channels.'
            : 'Initialize Uranium in any node. The bot will instantly synchronize with your selected voice channel.'
          }
        </p>
      </div>
    </div>
  );
}
