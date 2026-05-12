'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, LayoutGrid, ChevronRight, Zap, Shield, Search, ExternalLink, RefreshCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store';

export default function ServersPage() {
  const [guilds, setGuilds] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { resetPlayer } = useStore();

  const CLIENT_ID = "932136827605905489";

  const fetchGuilds = async () => {
    setRefreshing(true);
    try {
      const r = await fetch('/api/guilds');
      const data = await r.json();
      setGuilds(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchGuilds();
  }, []);

  const filtered = guilds.filter(g => g.name.toLowerCase().includes(search.toLowerCase()));

  const handleSelect = (guildId) => {
    resetPlayer();
    router.push(`/dashboard?guild=${guildId}`);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-red-500/30">
      <div className="p-6 sm:p-12 max-w-7xl mx-auto space-y-8 sm:space-y-12">
        <header className="space-y-4 text-center md:text-left">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center md:justify-start gap-4 mb-2"
          >
            <div className="h-px w-12 bg-red-500" />
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-[4px] text-red-500">Infrastructure</span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-4xl sm:text-7xl font-black tracking-tighter uppercase italic"
          >
            Server <span className="text-red-500">Selector</span>
          </motion.h1>
          <p className="text-white/40 text-sm sm:text-xl max-w-2xl font-medium leading-relaxed mx-auto md:mx-0">
            Connect to a server to begin real-time management. All authorized domains are synced below.
          </p>
        </header>

        {/* Search & Refresh */}
        <div className="flex flex-col md:flex-row gap-6">
          <div className="relative flex-1 group">
            <div className="absolute -inset-1 bg-gradient-to-r from-red-500 to-orange-600 rounded-[28px] blur opacity-10 group-focus-within:opacity-30 transition duration-500" />
            <div className="relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-red-500 transition-colors" size={24} />
              <input 
                type="text" 
                placeholder="Filter available servers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-[24px] py-7 pl-16 pr-8 outline-none focus:border-red-500/50 transition-all text-xl font-bold placeholder:text-white/10"
              />
            </div>
          </div>
          
          <button 
            onClick={fetchGuilds}
            disabled={refreshing}
            className="px-8 py-7 bg-white/5 border border-white/10 rounded-[24px] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-4 hover:bg-white/10 active:scale-95 transition-all disabled:opacity-50"
          >
            <RefreshCcw size={20} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Syncing...' : 'Refresh List'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading ? (
            [1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-64 bg-white/5 rounded-[40px] animate-pulse border border-white/5" />
            ))
          ) : (
            filtered.map((guild) => (
              <GuildCard 
                key={guild.id} 
                guild={guild} 
                clientId={CLIENT_ID}
                onClick={() => guild.isBotAdded && handleSelect(guild.id)}
              />
            ))
          )}
        </div>

        {!loading && filtered.length === 0 && (
          <div className="text-center py-32 space-y-6 glass rounded-[40px] border border-white/5">
            <LayoutGrid size={48} className="mx-auto text-white/10" />
            <div className="space-y-2">
              <h3 className="text-2xl font-black uppercase tracking-tight">No Servers Found</h3>
              <p className="text-white/20 font-medium">No servers match your current filter query.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GuildCard({ guild, onClick, clientId }) {
  const iconUrl = guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : null;

  return (
    <motion.div
      whileHover={guild.isBotAdded ? { y: -8, scale: 1.02 } : {}}
      onClick={onClick}
      className={`glass rounded-[32px] sm:rounded-[40px] p-6 sm:p-10 border transition-all relative overflow-hidden group ${
        guild.isBotAdded 
          ? 'cursor-pointer border-red-500/20 hover:border-red-500/50 ambient-red-border bg-gradient-to-br from-red-500/[0.03] to-transparent shadow-[0_0_40px_rgba(239,68,68,0.02)]' 
          : 'border-white/5 bg-white/[0.01]'
      }`}
    >
      {/* Background Decor */}
      {guild.isBotAdded && (
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-red-500/5 blur-[80px] rounded-full group-hover:bg-red-500/10 transition-colors duration-700" />
      )}

      <div className="flex flex-col h-full gap-6 sm:gap-8">
        <div className="flex justify-between items-start">
          <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-[24px] sm:rounded-[32px] overflow-hidden bg-white/5 border border-white/10 shadow-2xl relative">
            {iconUrl ? (
              <img src={iconUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700" alt="" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/20 font-black text-3xl uppercase bg-gradient-to-br from-white/5 to-white/[0.02]">
                {guild.name.charAt(0)}
              </div>
            )}
            {!guild.isBotAdded && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <Plus className="text-white/40" size={32} />
              </div>
            )}
          </div>
          
          {guild.isBotAdded ? (
            <div className="flex flex-col items-end gap-2">
              <div className="px-4 py-1.5 bg-red-500/10 text-red-500 text-[10px] font-black rounded-full uppercase border border-red-500/20 tracking-widest shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                Active Node
              </div>
              <div className="flex items-center gap-1.5 text-[8px] font-black text-green-500/60 uppercase tracking-widest">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Synchronized
              </div>
            </div>
          ) : (
            <div className="px-4 py-1.5 bg-white/5 text-white/40 text-[10px] font-black rounded-full uppercase tracking-widest border border-white/10">
              Inert Node
            </div>
          )}
        </div>

        <div className="flex-1 space-y-2">
          <h3 className="text-2xl sm:text-3xl font-black tracking-tight group-hover:text-red-500 transition-colors uppercase italic leading-tight">{guild.name}</h3>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-white/20 bg-white/5 px-3 py-1 rounded-lg border border-white/5">
              <Shield size={12} className="text-red-500/40" />
              {guild.isAdmin ? 'Full Access' : 'Operator'}
            </div>
          </div>
        </div>

        {guild.isBotAdded ? (
          <div className="pt-6 border-t border-white/5 flex items-center justify-between group/btn">
            <span className="text-[10px] font-black uppercase tracking-[4px] text-white/40 group-hover/btn:text-red-500 transition-colors">Enter Console</span>
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 group-hover:bg-red-500 group-hover:text-black transition-all">
              <ChevronRight size={24} />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
             <div className="h-px bg-white/5 w-full" />
             <a 
              href={`https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands&guild_id=${guild.id}`}
              onClick={(e) => e.stopPropagation()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-5 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[3px] text-white/40 hover:bg-white/10 hover:text-white hover:border-red-500/50 transition-all flex items-center justify-center gap-3 shadow-xl"
            >
              Deploy Uranium <ExternalLink size={14} />
            </a>
          </div>
        )}
      </div>
    </motion.div>
  );
}
