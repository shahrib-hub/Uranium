'use client';
import { useState, useEffect } from 'react';
import { Terminal, Search, ChevronRight, Hash, Star, ShieldCheck, Zap, Info, ChevronDown } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

export default function CommandsPage() {
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/commands')
      .then(r => r.json())
      .then(data => {
        setCategories(data);
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  const filtered = categories.map(cat => ({
    ...cat,
    commands: cat.commands.filter(cmd => 
      cmd.name.toLowerCase().includes(search.toLowerCase()) || 
      cmd.description.toLowerCase().includes(search.toLowerCase()) ||
      cmd.subcommands?.some(sub => sub.name.toLowerCase().includes(search.toLowerCase()))
    )
  })).filter(cat => cat.commands.length > 0);

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-red-500/30">
      <main className="min-h-screen transition-all duration-500">
        <div className="p-4 md:p-12 max-w-7xl mx-auto space-y-12">
          {/* Hero Section */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-red-500 to-orange-600 rounded-[40px] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
            <div className="relative glass p-12 rounded-[40px] border border-white/5 flex flex-col md:flex-row items-center justify-between gap-8 overflow-hidden">
              <div className="space-y-4 z-10 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                    <Terminal size={28} />
                  </div>
                  <h1 className="text-4xl font-black tracking-tighter uppercase italic">Commands Registry</h1>
                </div>
                <p className="text-white/40 font-medium max-w-xl text-lg leading-relaxed">
                  Deep introspection of the Uranium core. Every command, utility, and capability documented for maximum operational efficiency.
                </p>
              </div>
              
              <div className="relative z-10 w-full md:w-96">
                <div className="absolute left-6 top-1/2 -translate-y-1/2">
                  <Search className="text-white/20" size={20} />
                </div>
                <input 
                  type="text" 
                  placeholder="Filter commands..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-3xl py-6 pl-16 pr-8 outline-none focus:border-red-500/50 transition-all font-bold text-lg placeholder:text-white/10 shadow-2xl"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4 opacity-20">
              <div className="w-12 h-12 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
              <p className="font-black uppercase tracking-widest text-[10px]">Scanning core modules...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-20">
              {filtered.map((cat) => (
                <section key={cat.name} className="space-y-10">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-4 px-8 py-3 rounded-2xl bg-white/5 border border-white/10 shadow-lg relative overflow-hidden group/cat">
                      <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover/cat:opacity-100 transition-opacity" />
                      <Hash className="text-red-500" size={16} />
                      <h2 className="text-base font-black uppercase tracking-[6px] italic">{cat.name}</h2>
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-white/5 to-transparent" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                    {cat.commands.map((cmd) => (
                      <CommandCard key={cmd.name} cmd={cmd} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-32 space-y-8 glass rounded-[40px] border border-white/5">
              <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto text-white/10 border border-white/5">
                <Terminal size={48} />
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-black uppercase tracking-tighter italic">Data Fragment Not Found</h3>
                <p className="text-white/20 font-medium text-lg">Your search query did not match any operational protocols.</p>
              </div>
              <button 
                onClick={() => setSearch('')}
                className="px-10 py-5 bg-red-500 text-black font-black uppercase tracking-widest rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-red-500/20"
              >
                Reset Core Filter
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function CommandCard({ cmd }) {
  const [expanded, setExpanded] = useState(false);
  const hasSubs = cmd.subcommands && cmd.subcommands.length > 0;

  return (
    <div className="glass rounded-[32px] border border-white/5 hover:border-red-500/20 hover:bg-red-500/[0.01] transition-all group relative flex flex-col">
      <div className="p-8 space-y-6 flex-1">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-white/20 group-hover:text-red-500 group-hover:bg-red-500/10 group-hover:border-red-500/20 transition-all shadow-xl">
              <Zap size={22} />
            </div>
            <div className="font-black text-2xl tracking-tighter italic group-hover:text-red-500 transition-colors uppercase">/{cmd.name}</div>
          </div>
          {cmd.premium && (
            <div className="px-3 py-1.5 rounded-xl bg-yellow-500/10 text-yellow-500 border border-yellow-500/10 shadow-[0_0_15px_rgba(234,179,8,0.1)] flex items-center gap-1.5" title="Premium Feature">
              <Star size={12} fill="currentColor" />
              <span className="text-[10px] font-black uppercase tracking-widest">Premium</span>
            </div>
          )}
        </div>

        <p className="text-base text-white/40 font-medium leading-relaxed">
          {cmd.description}
        </p>

        {hasSubs && (
          <div className="space-y-3 pt-4">
            <button 
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[3px] text-red-500/60 hover:text-red-500 transition-colors group/btn"
            >
              <ChevronDown size={14} className={`transition-transform duration-500 ${expanded ? 'rotate-180' : ''}`} />
              {cmd.subcommands.length} Sub-Protocols
            </button>
            
            {expanded && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                {cmd.subcommands.map(sub => (
                  <div key={sub.name} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 group/sub">
                    <div className="font-black text-sm mb-1 group-hover/sub:text-red-500 transition-colors">/{cmd.name} {sub.name}</div>
                    <div className="text-xs text-white/20 font-medium">{sub.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-6 border-t border-white/5 bg-white/[0.01] rounded-b-[32px] flex items-center justify-between">
        <div className="flex items-center gap-2.5 text-[10px] font-black uppercase tracking-widest text-white/20 group-hover:text-red-500/40 transition-colors">
          <ShieldCheck size={14} />
          <span>System Authorized</span>
        </div>
        <div className="p-2 rounded-lg bg-white/5 opacity-0 group-hover:opacity-100 transition-all">
          <ChevronRight size={14} className="text-white/40 group-hover:text-red-500 translate-x-0 group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </div>
  );
}
