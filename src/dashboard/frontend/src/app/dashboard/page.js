'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/store';
import { useSearchParams } from 'next/navigation';
import MusicControls from '@/components/MusicControls';
import SearchPicker from '@/components/SearchPicker';

import QueueManager from '@/components/QueueManager';
import FilterSelector from '@/components/FilterSelector';
import VoiceSelector from '@/components/VoiceSelector';
import { Code, LayoutGrid, Terminal, Shield, Calendar, Zap, Activity, Users, Globe } from 'lucide-react';

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const { player } = useStore();
  const effectiveGuildId = player.guildId || searchParams.get('guild');
  
  const [guildInfo, setGuildInfo] = useState(null);
  const [botStats, setBotStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    if (!effectiveGuildId) return;
    
    // Fetch Guild Info
    fetch(`/api/guild/${effectiveGuildId}/info`)
      .then(r => r.json())
      .then(data => setGuildInfo(data))
      .catch(console.error);

    // Fetch Global Bot Stats
    fetch('/api/bot/stats')
      .then(r => r.json())
      .then(data => setBotStats(data))
      .catch(console.error);
  };

  useEffect(() => {
    if (effectiveGuildId) {
      setLoading(true);
      fetchData().finally(() => setLoading(false));
    }
  }, [effectiveGuildId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setTimeout(() => setRefreshing(false), 600);
  };

  if (!effectiveGuildId) return (
    <div className="flex items-center justify-center h-[80vh] text-white/20 font-black uppercase tracking-[10px]">
      Select a server to initialize
    </div>
  );

  return (
    <div className="p-8 lg:p-12 space-y-12 max-w-[1800px] mx-auto animate-in fade-in duration-700">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mb-4"
          >
            <div className="h-px w-8 bg-red-500" />
            <span className="text-[10px] font-black uppercase tracking-[4px] text-red-500">System Overview</span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-6xl font-black tracking-tight mb-4 flex items-center gap-6"
          >
            {guildInfo?.icon && <img src={guildInfo.icon} className="w-16 h-16 rounded-3xl shadow-2xl" alt="" />}
            {guildInfo?.name || 'Loading Node...'}
          </motion.h1>
          <div className="flex items-center gap-6 text-white/40 font-medium">
             <div className="flex items-center gap-2">
               <Shield size={16} className="text-red-500" />
               Owner: <span className="text-white font-bold">{guildInfo?.owner?.tag || '...'}</span>
             </div>
             <div className="flex items-center gap-2">
               <Calendar size={16} className="text-red-500" />
               Created: <span className="text-white font-bold">{guildInfo?.createdAt ? new Date(guildInfo.createdAt).toLocaleDateString() : '...'}</span>
             </div>
          </div>
        </div>
        
        <div className="flex gap-4">
           <button 
             onClick={handleRefresh}
             disabled={refreshing}
             className="px-6 py-3 bg-red-500 text-black font-black rounded-2xl flex items-center gap-3 hover:scale-105 transition-all shadow-lg shadow-red-500/20 uppercase italic tracking-tighter disabled:opacity-50"
           >
             <Zap size={18} className={refreshing ? 'animate-spin' : ''} fill="currentColor" />
             {refreshing ? 'Refreshing...' : 'Re-Sync Stats'}
           </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard 
          icon={<Users size={24} className="text-red-500" />} 
          label="Total Members" 
          value={guildInfo?.memberCount || '0'} 
          subtext="Verified Identities"
        />
        <StatCard 
          icon={<LayoutGrid size={24} className="text-red-500" />} 
          label="Channels" 
          value={guildInfo?.channels?.total || '0'} 
          subtext={`${guildInfo?.channels?.text || 0} Text • ${guildInfo?.channels?.voice || 0} Voice`}
        />
        <StatCard 
          icon={<Terminal size={24} className="text-red-500" />} 
          label="Music Status" 
          value={guildInfo?.music?.active ? 'ACTIVE' : 'IDLE'} 
          subtext={guildInfo?.music?.active ? `Playing in #${guildInfo.music.channel}` : 'No active streams'}
          color={guildInfo?.music?.active ? 'text-green-500' : 'text-white/20'}
        />
        <StatCard 
          icon={<Globe size={24} className="text-red-500" />} 
          label="Total Servers" 
          value={botStats?.totalServers || '0'} 
          subtext="Global Infrastructure"
        />
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Real Resource Monitor */}
        <div className="col-span-12 xl:col-span-8 space-y-8">
          <div className="glass p-12 rounded-[50px] border border-white/5 relative overflow-hidden bg-gradient-to-br from-white/[0.02] to-transparent">
             <div className="relative z-10 space-y-10">
                <div className="flex justify-between items-end">
                  <h3 className="text-3xl font-black flex items-center gap-4 italic uppercase">
                    <Activity size={32} className="text-red-500" />
                    Resource Monitor
                  </h3>
                  <span className="text-[10px] font-black text-white/20 uppercase tracking-[4px]">Live Telemetry</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <ResourceItem label="CPU Usage" value={botStats?.cpuUsage || '0%'} />
                  <ResourceItem label="Memory Heap" value={botStats?.memoryUsage || '0 MB'} />
                  <ResourceItem label="Node.js" value={botStats?.nodeVersion || 'v...'} />
                </div>

                <div className="p-8 bg-black/40 border border-white/5 rounded-[32px] space-y-4">
                   <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/20">
                      <span>Thread Priority</span>
                      <span className="text-green-500">OPTIMIZED</span>
                   </div>
                   <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        className="h-full bg-gradient-to-r from-red-500 to-orange-500" 
                      />
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Bot Status */}
        <div className="col-span-12 xl:col-span-4 space-y-8">
          <div className="glass p-8 rounded-[40px] border border-white/5 space-y-6">
             <div className="flex items-center justify-between">
                <h3 className="text-xl font-black italic uppercase">Bot Instance</h3>
                <div className="px-3 py-1 bg-green-500/10 text-green-500 text-[8px] font-black rounded-lg border border-green-500/20">STABLE</div>
             </div>
             <div className="space-y-4">
                <StatusItem label="API Latency" value={botStats?.ping || '0ms'} color="text-green-500" animate />
                <StatusItem label="Total Shards" value={`Active [1/${botStats?.shards || 1}]`} />
                <StatusItem label="System Uptime" value={botStats?.uptime || '0d 0h 0m'} />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, subtext, color = 'text-white' }) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="glass p-8 rounded-[40px] border border-white/5 relative overflow-hidden group"
    >
      <div className="relative z-10">
        <div className="mb-4">{icon}</div>
        <div className="text-[10px] font-black text-white/20 uppercase tracking-[2px] mb-1">{label}</div>
        <div className={`text-4xl font-black ${color} tracking-tighter mb-2`}>{value}</div>
        <div className="text-[10px] text-white/40 font-bold uppercase">{subtext}</div>
      </div>
      <div className="absolute -right-4 -bottom-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
        {icon}
      </div>
    </motion.div>
  );
}

function ResourceItem({ label, value }) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] font-black text-white/20 uppercase tracking-widest">{label}</div>
      <div className="text-2xl font-black text-white italic">{value}</div>
    </div>
  );
}

function StatusItem({ label, value, color = 'text-white', animate = false }) {
  return (
    <div className="flex justify-between items-center p-4 bg-white/[0.03] rounded-2xl border border-white/5">
       <span className="text-xs text-white/40 font-bold uppercase">{label}</span>
       <span className={`${color} font-black tracking-widest text-sm ${animate ? 'animate-pulse' : ''}`}>{value}</span>
    </div>
  );
}

