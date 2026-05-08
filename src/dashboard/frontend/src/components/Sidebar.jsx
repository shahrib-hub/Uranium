'use client';
import { useStore } from '@/store';
import { 
  Music, 
  Shield, 
  Terminal, 
  ChevronRight,
  Database,
  ArrowLeft,
  Menu,
  X,
  ChevronLeft,
  Server,
  Activity,
  Settings,
  Tag,
  ChevronDown
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Sidebar() {
  const { player } = useStore();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    if (window.innerWidth > 1024) setIsOpen(true);
  }, []);
  const [guildInfo, setGuildInfo] = useState(null);
  
  const guildId = player.guildId || searchParams.get('guild');

  useEffect(() => {
    if (guildId) {
      fetch(`/api/guild/${guildId}/info`)
        .then(r => r.json())
        .then(data => setGuildInfo(data))
        .catch(() => null);
    } else {
      setGuildInfo(null);
    }
  }, [guildId]);

  const menuItems = [
    { 
      name: 'System Overview', 
      icon: Activity, 
      path: '/dashboard', 
      color: 'text-red-500',
      activeOn: ['/dashboard']
    },
    { 
      name: 'Music Engine', 
      icon: Music, 
      path: '/dashboard/music', 
      color: 'text-red-500',
      activeOn: ['/dashboard/music']
    },
    { 
      name: 'Essentials', 
      icon: Settings, 
      color: 'text-blue-500',
      children: [
        { name: 'Reaction Roles', icon: Tag, path: '/dashboard/rr', activeOn: ['/dashboard/rr'] }
      ]
    },
    { name: 'Moderation', icon: Shield, path: '/dashboard/mod', color: 'text-green-500', badge: 'Soon' },
    { name: 'Commands', icon: Terminal, path: '/commands', color: 'text-yellow-500' },
  ];

  const [expandedGroups, setExpandedGroups] = useState(['Essentials']);

  const toggleGroup = (name) => {
    setExpandedGroups(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] lg:hidden animate-in fade-in duration-300"
        />
      )}

      {/* Mobile Toggle */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-6 left-6 z-[60] p-3 rounded-xl bg-red-500 text-black shadow-lg shadow-red-500/20 lg:hidden hover:scale-105 active:scale-95 transition-all"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar Container */}
      <div className={`fixed top-0 bottom-0 bg-[#050505] border-r border-white/5 flex flex-col z-50 transition-all duration-500 
        ${isOpen ? 'translate-x-0 w-80' : '-translate-x-full lg:translate-x-0 w-80 lg:w-20'}`}>
        
        {/* Toggle Button (Desktop) */}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="absolute -right-3 top-24 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-black shadow-lg z-[60] hover:scale-110 transition-all hidden lg:flex"
        >
          {isOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>

        <div className={`p-8 mb-4 transition-all duration-500 ${isOpen ? 'opacity-100' : 'opacity-0 scale-0 h-0 overflow-hidden'}`}>
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.4)] group-hover:scale-110 transition-all">
              <Database className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter">URANIUM</h1>
              <p className="text-[10px] font-black text-white/20 uppercase tracking-[3px]">Dashboard v3</p>
            </div>
          </Link>
        </div>

        {/* Back to Servers / Selection */}
        <div className="px-6 mb-6">
          <Link 
            href="/servers"
            className="flex items-center gap-4 p-4 rounded-3xl bg-white/5 border border-white/10 hover:border-red-500/50 hover:bg-red-500/5 transition-all group shadow-2xl"
          >
            <div className="w-10 h-10 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 group-hover:bg-red-500 group-hover:text-black transition-all">
              <ArrowLeft size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-red-500 tracking-widest leading-none mb-1">Exit Console</span>
              <span className="text-xs font-black uppercase tracking-tight">Servers List</span>
            </div>
          </Link>
        </div>

        {/* Current Server Info */}
        <div className={`px-6 mb-6 transition-all duration-500 ${isOpen ? 'opacity-100' : 'opacity-0 scale-0 h-0 overflow-hidden'}`}>
          {guildInfo && (
            <div className="flex items-center gap-4 p-4 rounded-3xl bg-red-500/[0.03] border border-red-500/10">
              {guildInfo.icon ? (
                <img src={guildInfo.icon} className="w-10 h-10 rounded-xl shadow-lg" alt="" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                  <Server size={18} className="text-white/20" />
                </div>
              )}
              <div className="flex-1">
                <p className="text-[8px] font-black uppercase text-red-500/60 tracking-widest mb-0.5">Active Server</p>
                <h3 className="font-bold text-sm leading-tight">{guildInfo.name}</h3>
              </div>
            </div>
          )}
        </div>

        {/* Small Icons for collapsed state */}
        {!isOpen && (
          <div className="flex flex-col items-center py-8 gap-8">
            <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/20">
              <Database className="text-white" size={20} />
            </div>
            <Link href="/servers" className="p-3 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-red-500 hover:border-red-500/50 transition-all">
              <ArrowLeft size={20} />
            </Link>
          </div>
        )}

        <nav className={`flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar transition-all duration-500 ${!isOpen ? 'items-center flex flex-col' : ''}`}>
          {isOpen && (
            <div className="px-4 mb-2">
              <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Control Protocols</span>
            </div>
          )}
          
          {menuItems.map((item) => {
            const isActive = item.activeOn ? item.activeOn.some(p => pathname === p) : (item.path && pathname === item.path);
            const isExpanded = expandedGroups.includes(item.name);
            
            if (!isOpen) {
              return (
                <Link 
                  key={item.name} 
                  href={(item.path || item.children?.[0]?.path) + (guildId ? `?guild=${guildId}` : '')}
                  className={`p-4 rounded-2xl transition-all group ${isActive ? 'bg-red-500/10 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'text-white/20 hover:text-red-500'}`}
                >
                  <item.icon size={24} />
                </Link>
              );
            }

            if (item.children) {
              return (
                <div key={item.name} className="space-y-1">
                  <button 
                    onClick={() => toggleGroup(item.name)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all group hover:bg-white/5 ${isExpanded ? 'text-white' : 'text-white/40'}`}
                  >
                    <div className="flex items-center gap-4">
                      <item.icon size={20} className={isExpanded ? 'text-blue-500' : 'group-hover:text-blue-500 transition-colors'} />
                      <span className="font-bold text-sm">{item.name}</span>
                    </div>
                    <ChevronDown size={14} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {isExpanded && (
                    <div className="ml-4 pl-4 border-l border-white/5 space-y-1 mt-1 animate-in slide-in-from-top-2 duration-300">
                      {item.children.map(child => {
                        const isChildActive = child.activeOn ? child.activeOn.some(p => pathname === p) : pathname === child.path;
                        return (
                          <Link 
                            key={child.path}
                            href={child.path + (guildId ? `?guild=${guildId}` : '')}
                            className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isChildActive ? 'bg-blue-500/10 text-blue-400' : 'text-white/30 hover:text-white hover:bg-white/5'}`}
                          >
                            <child.icon size={16} />
                            <span className="font-bold text-xs">{child.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div key={item.name} className="space-y-1">
                <Link 
                  href={item.path + (guildId ? `?guild=${guildId}` : '')}
                  className={`flex items-center justify-between p-4 rounded-2xl transition-all group ${
                    isActive 
                    ? 'bg-red-500/10 border border-red-500/20 text-white shadow-[inset_0_0_20px_rgba(239,68,68,0.05)]' 
                    : 'hover:bg-white/5 text-white/40 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <item.icon size={20} className={isActive ? 'text-red-500' : 'group-hover:text-red-500 transition-colors'} />
                    <span className="font-bold text-sm">{item.name}</span>
                  </div>
                  {item.badge ? (
                    <span className="text-[8px] font-black bg-white/5 px-2 py-1 rounded-md uppercase text-white/40">{item.badge}</span>
                  ) : (
                    <ChevronRight size={14} className={`opacity-0 group-hover:opacity-100 transition-all ${isActive ? 'opacity-100 text-red-500' : ''}`} />
                  )}
                </Link>
              </div>
            );
          })}
        </nav>

        <div className={`p-6 border-t border-white/5 space-y-4 transition-all duration-500 ${!isOpen ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
          <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black uppercase text-red-500">Core Online</span>
            </div>
            <p className="text-[10px] text-white/40 font-medium leading-relaxed">
              Uranium Bot API is stable and Operational.
            </p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        main {
          padding-left: 0 !important;
          transition: padding-left 0.5s ease-in-out;
        }
        header {
          left: 0 !important;
          transition: left 0.5s ease-in-out;
        }
        @media (min-width: 1024px) {
          main {
            padding-left: ${isOpen ? '20rem' : '5rem'} !important;
          }
          header {
            left: ${isOpen ? '20rem' : '5rem'} !important;
          }
        }
      `}</style>
    </>
  );
}
