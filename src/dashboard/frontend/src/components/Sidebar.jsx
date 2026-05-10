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
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function Sidebar() {
  const { player, guilds, setGuilds } = useStore();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const selectorRef = useRef(null);
  useEffect(() => {
    if (window.innerWidth > 1024) setIsOpen(true);

    const handleClickOutside = (e) => {
      if (selectorRef.current && !selectorRef.current.contains(e.target)) {
        setIsSelectorOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const [guildInfo, setGuildInfo] = useState(null);

  useEffect(() => {
    if (guilds.length === 0) {
      fetch('/api/guilds')
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) setGuilds(data.filter(g => g.isBotAdded));
        })
        .catch(() => null);
    }
  }, []);

  const handleServerSwitch = (newGuildId) => {
    setIsSelectorOpen(false);
    const newPath = pathname + `?guild=${newGuildId}`;
    router.push(newPath);
  };
  
  const guildId = searchParams.get('guild') || player.guildId;

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

        {/* Current Server Info / Selector */}
        <div className={`px-6 mb-6 transition-all duration-500 relative ${isOpen ? 'opacity-100' : 'opacity-0 scale-0 h-0 overflow-hidden'}`} ref={selectorRef}>
          {guildInfo ? (
            <>
              <button 
                onClick={() => setIsSelectorOpen(!isSelectorOpen)}
                className={`w-full flex items-center gap-4 p-4 rounded-3xl border transition-all ${isSelectorOpen ? 'bg-red-500/10 border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.1)]' : 'bg-red-500/[0.03] border-red-500/10 hover:border-red-500/30'}`}
              >
                {guildInfo.icon ? (
                  <img src={guildInfo.icon} className="w-10 h-10 rounded-xl shadow-lg" alt="" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                    <Server size={18} className="text-white/20" />
                  </div>
                )}
                <div className="flex-1 text-left">
                  <p className="text-[8px] font-black uppercase text-red-500/60 tracking-widest mb-0.5">Active Server</p>
                  <h3 className="font-bold text-sm leading-tight line-clamp-1">{guildInfo.name}</h3>
                </div>
                <ChevronDown size={14} className={`text-white/20 transition-transform duration-300 ${isSelectorOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {isSelectorOpen && (
                <div className="absolute top-full left-6 right-6 mt-2 bg-[#0A0A0A] border border-white/5 rounded-3xl shadow-2xl z-[70] overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="p-2 max-h-64 overflow-y-auto custom-scrollbar">
                    <div className="px-3 py-2">
                      <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Switch Server</span>
                    </div>
                    {guilds.length > 0 ? (
                      guilds.map(g => (
                        <button
                          key={g.id}
                          onClick={() => handleServerSwitch(g.id)}
                          className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all hover:bg-white/5 ${g.id === guildId ? 'bg-red-500/5 text-red-500' : 'text-white/60 hover:text-white'}`}
                        >
                          <div className="w-8 h-8 rounded-lg bg-white/5 overflow-hidden flex-shrink-0">
                            {g.icon ? (
                              <img src={`https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`} className="w-full h-full object-cover" alt="" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] font-bold">
                                {g.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <span className="text-xs font-bold truncate">{g.name}</span>
                          {g.id === guildId && <div className="w-1.5 h-1.5 bg-red-500 rounded-full ml-auto" />}
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-[10px] text-white/20 uppercase font-black">No servers synced</div>
                    )}
                  </div>
                  <div className="p-2 border-t border-white/5">
                    <Link 
                      href="/servers"
                      onClick={() => setIsSelectorOpen(false)}
                      className="flex items-center justify-center gap-2 p-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/5 transition-all"
                    >
                      <LayoutGrid size={12} />
                      View All Servers
                    </Link>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-4 rounded-3xl bg-white/5 border border-white/10 animate-pulse flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/10" />
              <div className="flex-1 space-y-2">
                <div className="h-2 w-12 bg-white/10 rounded" />
                <div className="h-3 w-24 bg-white/10 rounded" />
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
