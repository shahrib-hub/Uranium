'use client';
import { motion } from 'framer-motion';
import { Zap, Music, Shield, ChevronRight, Activity, Globe, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function LandingPage() {
  const [user, setUser] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [stats, setStats] = useState({ totalServers: '...', ping: '...', uptime: '...', memoryUsage: '...' });

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.ok ? r.json() : null)
      .then(setUser)
      .catch(() => null);

    fetch('/api/bot/stats')
      .then(r => r.ok ? r.json() : null)
      .then(data => data && setStats(data))
      .catch(() => null);
  }, []);

  return (
    <div className="bg-[#050505] text-white selection:bg-red-500 selection:text-black min-h-screen overflow-x-hidden">
      
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 px-8 py-6 flex items-center justify-between backdrop-blur-xl bg-black/20 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.3)]">
            <Zap fill="black" size={20} />
          </div>
          <span className="text-xl font-black tracking-tighter uppercase">Uranium</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-black uppercase tracking-widest text-white/40">
          <a href="#features" className="hover:text-red-500 transition-colors">Features</a>
          <a href="#stats" className="hover:text-red-500 transition-colors">Intelligence</a>
          {user ? (
            <Link href="/servers" className="px-6 py-2 bg-red-500 rounded-full text-black hover:scale-105 transition-all font-black">Dashboard</Link>
          ) : (
            <Link href="/auth/login" className="px-6 py-2 bg-white/5 rounded-full border border-white/10 hover:bg-white/10 transition-all text-white">Login</Link>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-3 rounded-xl bg-white/5 border border-white/10 text-white"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-full left-0 right-0 bg-[#050505] border-b border-white/5 p-8 flex flex-col gap-6 md:hidden z-50 shadow-2xl"
          >
            <a href="#features" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-black uppercase tracking-widest text-white/40 hover:text-red-500 transition-colors">Features</a>
            <a href="#stats" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-black uppercase tracking-widest text-white/40 hover:text-red-500 transition-colors">Intelligence</a>
            <div className="h-px bg-white/5" />
            {user ? (
              <Link href="/servers" className="px-6 py-4 bg-red-500 rounded-2xl text-black text-center font-black uppercase tracking-widest text-sm">Dashboard</Link>
            ) : (
              <Link href="/auth/login" className="px-6 py-4 bg-white/5 rounded-2xl border border-white/10 text-white text-center font-black uppercase tracking-widest text-sm">Login</Link>
            )}
          </motion.div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-48 pb-32 px-8 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-red-500/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-black uppercase tracking-[2px]"
              >
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_#ef4444]" />
                Next-Gen Discord Intelligence
              </motion.div>
              
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight leading-[0.9]"
              >
                The Future of <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">Bot Management.</span>
              </motion.h1>

              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-xl text-white/40 max-w-xl leading-relaxed"
              >
                Elevate your server with Uranium. Realtime music synchronization, military-grade moderation, and a stunning management console that feels like 2030.
              </motion.p>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Link href={user ? "/servers" : "/auth/login"} className="px-10 py-5 bg-red-500 text-black rounded-[24px] font-black uppercase tracking-widest text-sm hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 shadow-[0_20px_40px_rgba(239,68,68,0.2)]">
                  Launch Console <ChevronRight size={20} />
                </Link>
                <a href="#" className="px-10 py-5 bg-white/5 border border-white/10 text-white rounded-[24px] font-black uppercase tracking-widest text-sm hover:bg-white/10 transition-all flex items-center justify-center gap-3">
                  Add to Discord
                </a>
              </motion.div>
            </div>

            {/* Dashboard Mockup */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotateX: 20 }}
              animate={{ opacity: 1, scale: 1, rotateX: 0 }}
              transition={{ delay: 0.4, duration: 1 }}
              className="relative group hidden lg:block"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-red-500/20 to-blue-500/20 rounded-[40px] blur-2xl opacity-50 group-hover:opacity-100 transition duration-1000" />
              <div className="relative glass p-4 rounded-[40px] border border-white/10 overflow-hidden shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070&auto=format&fit=crop" 
                  className="w-full h-auto rounded-[32px] opacity-40 mix-blend-luminosity hover:opacity-100 transition-opacity duration-700" 
                  alt="Dashboard Preview" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
                
                <motion.div 
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="absolute top-12 -left-8 glass p-6 rounded-3xl border border-white/20 shadow-2xl"
                >
                  <Music className="text-red-500 mb-2" />
                  <div className="text-xs font-black uppercase tracking-widest opacity-40">Now Playing</div>
                  <div className="font-bold">After Hours</div>
                </motion.div>

                <motion.div 
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 5, repeat: Infinity }}
                  className="absolute bottom-24 -right-8 glass p-6 rounded-3xl border border-white/20 shadow-2xl"
                >
                  <Activity className="text-green-500 mb-2" />
                  <div className="text-xs font-black uppercase tracking-widest opacity-40">System Status</div>
                  <div className="font-bold">Ping: {stats.ping}</div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats/Social Proof */}
      <section id="stats" className="py-24 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-8 grid grid-cols-2 md:grid-cols-4 gap-12">
           {[
            { label: 'Total Servers', val: stats.totalServers, icon: Globe },
            { label: 'Latency', val: stats.ping, icon: Activity },
            { label: 'Uptime', val: stats.uptime, icon: Zap },
            { label: 'Memory', val: stats.memoryUsage, icon: Shield },
          ].map((s, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center space-y-2"
            >
              <div className="flex justify-center mb-4">
                <s.icon className="text-red-500/40" size={32} />
              </div>
              <div className="text-4xl font-black tracking-tighter">{s.val}</div>
              <div className="text-xs font-black uppercase tracking-widest text-white/20">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features Showcase */}
      <section id="features" className="py-32 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-4 mb-24">
            <h2 className="text-5xl font-black tracking-tight">Engineered for <span className="text-red-500">Excellence.</span></h2>
            <p className="text-white/40 text-xl max-w-2xl mx-auto">Every feature is built with a focus on performance, aesthetics, and deep Discord integration.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard icon={Music} title="Music Hub 2.0" desc="The most advanced music system on Discord. Audiophile-grade filters and realtime web sync." color="red" />
            <FeatureCard icon={Shield} title="Omni-Guard Mod" desc="Military-grade moderation. AI-powered automod and instant web management." color="blue" />
            <FeatureCard icon={Zap} title="Realtime Pulse" desc="No more refreshing. Our Socket.IO bridge ensures changes reflect instantly." color="orange" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-24 px-8 border-t border-white/5 text-center text-white/20">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center border border-white/10">
            <Zap size={14} />
          </div>
          <span className="font-black uppercase tracking-tighter text-white">Uranium</span>
        </div>
        <p className="text-[10px] font-black uppercase tracking-[5px]">© 2026 Uranium Project. All Rights Reserved.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc, color }) {
  const colors = {
    red: 'group-hover:bg-red-500/10 text-red-500 border-red-500/20',
    blue: 'group-hover:bg-blue-500/10 text-blue-500 border-blue-500/20',
    orange: 'group-hover:bg-orange-500/10 text-orange-500 border-orange-500/20',
  };

  return (
    <motion.div 
      whileHover={{ y: -10 }}
      className="group glass p-10 rounded-[48px] border border-white/5 hover:border-white/20 transition-all duration-500"
    >
      <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center mb-8 transition-all duration-500 border ${colors[color]}`}>
        <Icon size={32} />
      </div>
      <h3 className="text-2xl font-black tracking-tight mb-4">{title}</h3>
      <p className="text-white/40 leading-relaxed">{desc}</p>
    </motion.div>
  );
}
