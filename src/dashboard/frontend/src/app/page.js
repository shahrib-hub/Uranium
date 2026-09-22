'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  Headphones,
  ShieldAlert,
  Sparkles,
  Users,
  Zap,
  Sliders,
  Radio,
  Lock,
  Play,
  Volume2,
  Disc,
  ShieldCheck,
  ChevronRight,
  MessageSquare,
  FileText,
  ExternalLink,
  Flame,
  Scale,
  Gift,
  CheckCircle2,
  BookOpen,
  MousePointerClick,
  Layers,
  Heart,
  HelpCircle,
  Clock,
  Trophy,
  Shield
} from 'lucide-react';
import LucentSwitch from '@/components/LucentSwitch';

// Discord brand SVG icon
function DiscordIcon({ className = "w-5 h-5", fill = "currentColor" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={fill}>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  );
}

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [activeFilter, setActiveFilter] = useState('bassboost');
  const [giveawayCount, setGiveawayCount] = useState(42);
  const [hasEnteredGiveaway, setHasEnteredGiveaway] = useState(false);
  const [activeRole, setActiveRole] = useState('gamer');

  useEffect(() => {
    fetch('/api/me')
      .then((r) => (r.ok ? r.json() : null))
      .then(setUser)
      .catch(() => null);

    fetch('/api/bot/stats')
      .then((r) => (r.ok ? r.json() : null))
      .then(setStats)
      .catch(() => null);
  }, []);

  const dashboardHref = user ? '/servers' : '/auth/login';
  const inviteHref = 'https://discord.com/oauth2/authorize?client_id=932136827605905489&permissions=8&scope=bot%20applications.commands';

  const handleGiveawayClick = () => {
    if (!hasEnteredGiveaway) {
      setGiveawayCount((c) => c + 1);
      setHasEnteredGiveaway(true);
    } else {
      setGiveawayCount((c) => c - 1);
      setHasEnteredGiveaway(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0e101a] text-white selection:bg-rose-500/30 selection:text-white font-sans overflow-x-hidden">
      
      {/* Background Subtle Gradient Accents */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -left-[10%] -top-[15%] h-[600px] w-[600px] rounded-full bg-rose-600/10 blur-[160px]" />
        <div className="absolute right-[5%] top-[10%] h-[550px] w-[550px] rounded-full bg-red-600/10 blur-[180px]" />
        <div className="absolute bottom-[20%] left-[20%] h-[500px] w-[500px] rounded-full bg-rose-700/8 blur-[160px]" />
      </div>

      {/* ========================================================================= */}
      {/* 1. TOP NAVBAR (MEE6-Style Clean Navigation) */}
      {/* ========================================================================= */}
      <header className="fixed inset-x-0 top-0 z-50 px-4 py-3.5 sm:px-8">
        <nav className="mx-auto flex max-w-7xl items-center justify-between rounded-2xl px-5 py-3 border border-white/10 bg-[#121422]/85 shadow-2xl backdrop-blur-xl">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-tr from-rose-600 to-red-500 text-white shadow-lg shadow-rose-600/30 group-hover:scale-105 transition">
              <Zap size={20} fill="currentColor" />
            </span>
            <div className="flex flex-col">
              <span className="font-extrabold tracking-tight text-lg text-white flex items-center gap-1.5 leading-tight">
                Uranium
              </span>
              <span className="text-[10px] text-white/40 font-medium tracking-wide">All-in-One Discord Bot</span>
            </div>
          </Link>

          {/* Nav Links */}
          <div className="hidden lg:flex items-center gap-7 text-xs font-bold text-white/70">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#music" className="hover:text-white transition">Music</a>
            <a href="#defense" className="hover:text-white transition">AutoMod</a>
            <a href="#giveaways" className="hover:text-white transition">Giveaways</a>
            <Link href="/docs" className="text-rose-400 hover:text-rose-300 transition flex items-center gap-1">
              <span>Documentation</span>
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
            </Link>
            <Link href="/commands" className="hover:text-white transition">Commands</Link>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <LucentSwitch compact />
            <a
              href={inviteHref}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-xs font-bold text-white shadow-md shadow-[#5865F2]/20 transition hover:scale-[1.02]"
            >
              <DiscordIcon className="w-4 h-4" />
              <span>Add to Discord</span>
            </a>
            <a
              href={dashboardHref}
              className="h-10 px-4 sm:px-5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-rose-600/25 transition hover:scale-[1.02] flex items-center gap-2"
            >
              <span>{user ? 'Dashboard' : 'Login'}</span>
              <ArrowRight size={14} />
            </a>
          </div>
        </nav>
      </header>

      {/* ========================================================================= */}
      {/* 2. HERO SECTION (MEE6 Layout with Uranium Celestial Pirate Ship Art) */}
      {/* ========================================================================= */}
      <section className="relative z-10 mx-auto max-w-7xl px-4 sm:px-8 pt-36 pb-20 sm:pt-44 sm:pb-28">
        <div className="grid gap-12 lg:grid-cols-[1.05fr_1fr] items-center">
          
          {/* Hero Left Copy */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3.5 py-1 text-xs font-bold text-rose-300 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-rose-400 animate-pulse shadow-[0_0_8px_#ff294f]" />
              <span>Next-Generation Discord Bot Engine</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-[1.08]">
              The best all-in-one bot for Discord
            </h1>

            <p className="text-base sm:text-lg text-white/65 leading-relaxed max-w-xl">
              Uranium is a complete Discord bot that thousands of Discord servers worldwide trust to manage, entertain, and grow their community. Lossless 320kbps audio, intelligent AutoMod defense, customizable giveaways, and seamless role onboarding.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
              <a
                href={inviteHref}
                target="_blank"
                rel="noopener noreferrer"
                className="h-13 px-8 rounded-2xl bg-[#5865F2] hover:bg-[#4752C4] text-sm font-bold text-white shadow-xl shadow-[#5865F2]/25 transition hover:scale-[1.02] flex items-center justify-center gap-2.5"
              >
                <DiscordIcon className="w-5 h-5" />
                <span>Add to Discord</span>
              </a>
              <a
                href="#features"
                className="h-13 px-7 rounded-2xl border border-white/15 hover:border-white/30 bg-white/5 hover:bg-white/10 text-sm font-bold text-white transition flex items-center justify-center gap-2"
              >
                <span>See features</span>
                <ChevronRight size={16} />
              </a>
            </div>

            {/* Trust bullet features */}
            <div className="pt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-white/50">
              <span className="flex items-center gap-1.5 font-medium">
                <Check size={14} className="text-rose-400" /> Free & No Paywalls
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <Check size={14} className="text-rose-400" /> 320kbps Lossless Audio
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <Check size={14} className="text-rose-400" /> 99.98% Monitored Uptime
              </span>
            </div>
          </div>

          {/* Hero Right Visual: Uranium Celestial Ship Illustration & Floating Badges */}
          <div className="relative">
            <div className="relative rounded-[2.5rem] overflow-hidden border border-white/15 bg-gradient-to-b from-white/10 to-white/[0.02] p-2.5 shadow-2xl group">
              <img
                src="/images/hero-ship.jpg"
                alt="Uranium Celestial Pirate Ship"
                className="w-full h-auto rounded-[2.2rem] object-cover shadow-2xl transition duration-700 group-hover:scale-[1.02]"
              />

              {/* Gradient Overlay */}
              <div className="absolute inset-0 rounded-[2.2rem] bg-gradient-to-t from-[#0e101a]/70 via-transparent to-transparent pointer-events-none" />

              {/* Floating Stat Badge 1: Audio */}
              <div className="absolute top-6 left-6 rounded-2xl border border-white/20 bg-[#121422]/90 backdrop-blur-md px-3.5 py-2.5 shadow-xl flex items-center gap-3">
                <span className="h-9 w-9 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 grid place-items-center">
                  <Headphones size={18} />
                </span>
                <div>
                  <p className="text-[10px] uppercase font-bold text-white/50">Audio Engine</p>
                  <p className="text-xs font-bold text-white">320kbps Lossless</p>
                </div>
              </div>

              {/* Floating Stat Badge 2: AutoMod */}
              <div className="absolute bottom-8 left-6 rounded-2xl border border-white/20 bg-[#121422]/90 backdrop-blur-md px-3.5 py-2.5 shadow-xl flex items-center gap-3">
                <span className="h-9 w-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 grid place-items-center">
                  <ShieldCheck size={18} />
                </span>
                <div>
                  <p className="text-[10px] uppercase font-bold text-white/50">Defense</p>
                  <p className="text-xs font-bold text-white">Anti-Raid Active</p>
                </div>
              </div>

              {/* Floating Stat Badge 3: Giveaways */}
              <div className="absolute bottom-8 right-6 rounded-2xl border border-white/20 bg-[#121422]/90 backdrop-blur-md px-3.5 py-2.5 shadow-xl flex items-center gap-3">
                <span className="h-9 w-9 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 grid place-items-center">
                  <Gift size={18} />
                </span>
                <div>
                  <p className="text-[10px] uppercase font-bold text-white/50">Live Event</p>
                  <p className="text-xs font-bold text-white">Nitro Giveaway</p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Social Proof Partner Bar (MEE6 "Used by 20+ million servers" style) */}
        <div className="mt-20 pt-8 border-t border-white/10 text-center space-y-6">
          <p className="text-xs uppercase font-extrabold tracking-widest text-white/40">
            Trusted by 50,000+ Discord communities & esports servers
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14 opacity-60 grayscale hover:grayscale-0 transition-all">
            {['Gamer Hub', 'Anime Galaxy', 'Lofi Lounge', 'Cyber Esports', 'Developer Den', 'Nova Community'].map((name) => (
              <span key={name} className="text-sm font-black tracking-wider uppercase text-white/80 flex items-center gap-2 hover:text-rose-400 transition">
                <span className="h-2 w-2 rounded-full bg-rose-500" /> {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. FEATURE SPOTLIGHT 1: Build Your Own Unique Discord Bot (MEE6 Image 2) */}
      {/* ========================================================================= */}
      <section id="features" className="relative z-10 py-24 border-t border-white/10 bg-[#0b0c15]">
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          <div className="grid gap-14 lg:grid-cols-2 items-center">
            
            {/* Left: Custom Bot Personalizer Mockup with Floating Avatars */}
            <div className="relative">
              <div className="rounded-[2.2rem] border border-white/15 bg-[#171926] p-6 sm:p-8 shadow-2xl space-y-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-white/50">Bot Personalizer</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-bold text-emerald-300">
                    Active
                  </span>
                </div>

                <div className="flex items-center gap-5">
                  <div className="relative">
                    <img
                      src="/images/hero-ship.jpg"
                      alt="Bot Avatar"
                      className="h-20 w-20 rounded-2xl object-cover border-2 border-rose-500/40 shadow-lg"
                    />
                    <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-[#171926]" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-lg font-black text-white flex items-center gap-2">
                      Uranium <span className="px-1.5 py-0.5 rounded bg-[#5865F2] text-[10px] font-bold text-white">APP</span>
                    </h4>
                    <p className="text-xs text-white/50 font-medium">Uranium#0887 · Server Protector</p>
                    <button className="text-[11px] font-bold text-rose-400 hover:text-rose-300 transition">
                      + Change Bot Identity
                    </button>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-white/50">Bot Custom Status</label>
                    <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-xs font-medium text-white flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span>Online · Playing <strong>/games 🎮</strong></span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-white/50">Assigned Roles</label>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-500/30 text-[11px] font-bold text-rose-300">
                        🛡️ HEAven Guarder
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-medium text-white/60">
                        Bots
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Community Avatars around card */}
              <div className="absolute -top-4 -right-4 h-11 w-11 rounded-full border-2 border-rose-500 bg-black/80 shadow-xl overflow-hidden hidden sm:block">
                <img src="/images/hero-ship.jpg" alt="" className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-4 -left-4 h-12 w-12 rounded-2xl border-2 border-purple-500 bg-black/80 shadow-xl overflow-hidden hidden sm:block">
                <img src="/images/music-soundstage.jpg" alt="" className="w-full h-full object-cover" />
              </div>
            </div>

            {/* Right: Copy */}
            <div className="space-y-6">
              <span className="text-xs font-black uppercase tracking-widest text-rose-400">Total Customization</span>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                Build Your Own Unique Discord Bot
              </h2>
              <p className="text-base text-white/65 leading-relaxed">
                The best Discord bot is the one you can customize yourself. Let's make the Discord client better than ever. Customize Uranium to reflect your server's unique brand, identity, and rules. Utilize Uranium's bot personalization to match your community's universe.
              </p>

              <div className="space-y-3 pt-2">
                {[
                  'Custom embed accent colors & brand styles',
                  'Dedicated commands tailored to your server staff',
                  'Seamless dashboard and slash command synchronization'
                ].map((text) => (
                  <div key={text} className="flex items-center gap-2.5 text-sm text-white/80 font-medium">
                    <span className="h-5 w-5 rounded-full bg-rose-500/20 text-rose-400 grid place-items-center shrink-0">
                      <Check size={13} />
                    </span>
                    <span>{text}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4 pt-3">
                <a
                  href={inviteHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-12 px-6 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-xs font-bold text-white shadow-lg transition flex items-center gap-2"
                >
                  <DiscordIcon className="w-4 h-4" />
                  <span>Add to Discord</span>
                </a>
                <Link
                  href="/docs"
                  className="h-12 px-6 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-bold text-white transition flex items-center gap-2"
                >
                  <span>Learn more</span>
                  <ChevronRight size={14} />
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. FEATURE SPOTLIGHT 2: Lossless Music & Audio Engine */}
      {/* ========================================================================= */}
      <section id="music" className="relative z-10 py-24 border-t border-white/10 bg-[#0e101a]">
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          <div className="grid gap-14 lg:grid-cols-2 items-center">
            
            {/* Left: Copy */}
            <div className="space-y-6 order-2 lg:order-1">
              <span className="text-xs font-black uppercase tracking-widest text-rose-400">Audio Engineering</span>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                Lossless 320kbps Audio with Real-Time DSP Filters
              </h2>
              <p className="text-base text-white/65 leading-relaxed">
                Experience studio-grade audio streaming directly in your voice channels. Uranium streams crystal-clear 320kbps music from Spotify, SoundCloud, and YouTube with hardware-accelerated sound filters you can toggle in real-time.
              </p>

              {/* Interactive Audio Filters */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-white/50">Live DSP Filters</span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'bassboost', label: '🔥 Bass Boost +12dB' },
                    { id: 'nightcore', label: '⚡ Nightcore' },
                    { id: '8d', label: '🎧 8D Spatial Audio' },
                    { id: 'vaporwave', label: '🌴 Vaporwave' }
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setActiveFilter(filter.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                        activeFilter === filter.id
                          ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25 scale-105'
                          : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4 pt-3">
                <a
                  href={inviteHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-12 px-6 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-xs font-bold text-white shadow-lg transition flex items-center gap-2"
                >
                  <DiscordIcon className="w-4 h-4" />
                  <span>Add to Discord</span>
                </a>
                <Link
                  href="/docs#music-streaming"
                  className="h-12 px-6 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-bold text-white transition flex items-center gap-2"
                >
                  <span>Read Music Docs</span>
                  <ChevronRight size={14} />
                </Link>
              </div>
            </div>

            {/* Right: Custom Music Artwork Card */}
            <div className="relative order-1 lg:order-2">
              <div className="rounded-[2.2rem] overflow-hidden border border-white/15 bg-gradient-to-b from-white/10 to-transparent p-2.5 shadow-2xl">
                <img
                  src="/images/music-soundstage.jpg"
                  alt="Uranium Music Soundstage"
                  className="w-full h-auto rounded-[2rem] object-cover shadow-2xl"
                />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. FEATURE SPOTLIGHT 3: Intelligent AutoMod & Server Defense */}
      {/* ========================================================================= */}
      <section id="defense" className="relative z-10 py-24 border-t border-white/10 bg-[#0b0c15]">
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          <div className="grid gap-14 lg:grid-cols-2 items-center">
            
            {/* Left: Custom Shield Artwork Card */}
            <div className="relative">
              <div className="rounded-[2.2rem] overflow-hidden border border-white/15 bg-gradient-to-b from-white/10 to-transparent p-2.5 shadow-2xl">
                <img
                  src="/images/defense-shield.jpg"
                  alt="Uranium Defense Shield"
                  className="w-full h-auto rounded-[2rem] object-cover shadow-2xl"
                />
              </div>
            </div>

            {/* Right: Copy */}
            <div className="space-y-6">
              <span className="text-xs font-black uppercase tracking-widest text-rose-400">Zero-Lag Security</span>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                Shield Your Server Against Raids, Spam & Bad Actors
              </h2>
              <p className="text-base text-white/65 leading-relaxed">
                Protect your community 24/7 without lifting a finger. Uranium's AutoMod engine intercepts spam bursts, unauthorized invite links, mass mentions, and toxic phrases in under 15 milliseconds.
              </p>

              <div className="grid sm:grid-cols-2 gap-3 pt-2">
                {[
                  { title: 'Anti-Raid Defense', desc: 'Auto-quarantine mass join raids instantly' },
                  { title: 'Invite Link Purge', desc: 'Stop unapproved Discord invite links' },
                  { title: 'Mass Mention Shield', desc: 'Prevent @everyone & @here spam raids' },
                  { title: 'Banned Words & Regex', desc: 'Custom keyword dictionary with auto-strikes' }
                ].map((item) => (
                  <div key={item.title} className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
                    <p className="text-xs font-bold text-white flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-rose-400" />
                      {item.title}
                    </p>
                    <p className="text-[11px] text-white/50">{item.desc}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4 pt-3">
                <a
                  href={inviteHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-12 px-6 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-xs font-bold text-white shadow-lg transition flex items-center gap-2"
                >
                  <DiscordIcon className="w-4 h-4" />
                  <span>Add to Discord</span>
                </a>
                <Link
                  href="/docs#automod"
                  className="h-12 px-6 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-bold text-white transition flex items-center gap-2"
                >
                  <span>Security Guides</span>
                  <ChevronRight size={14} />
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. FEATURE SPOTLIGHT 4: Interactive Giveaways with Live Discord Counters */}
      {/* ========================================================================= */}
      <section id="giveaways" className="relative z-10 py-24 border-t border-white/10 bg-[#0e101a]">
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          <div className="grid gap-14 lg:grid-cols-2 items-center">
            
            {/* Left: Copy */}
            <div className="space-y-6 order-2 lg:order-1">
              <span className="text-xs font-black uppercase tracking-widest text-rose-400">Community Growth</span>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                Engage Your Members with Next-Gen Giveaways
              </h2>
              <p className="text-base text-white/65 leading-relaxed">
                Host professional Discord giveaways with role-gated eligibility, custom accent colors, custom banners, and live entry counter buttons that update directly on Discord with every entry.
              </p>

              <div className="space-y-3 pt-2">
                {[
                  'Role Eligibility: Restrict entries to @VIP or @Booster members',
                  'Live Interactive Buttons: Dynamic counter updates (🎉 Enter (42))',
                  'Automated Winner Selection & Rich Gold Announcement Embeds',
                  'Full Two-Way Dashboard & Slash Command Synchronization'
                ].map((text) => (
                  <div key={text} className="flex items-center gap-2.5 text-sm text-white/80 font-medium">
                    <span className="h-5 w-5 rounded-full bg-rose-500/20 text-rose-400 grid place-items-center shrink-0">
                      <Gift size={13} />
                    </span>
                    <span>{text}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4 pt-3">
                <Link
                  href="/dashboard/giveaways"
                  className="h-12 px-6 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-xs font-black uppercase tracking-wider text-white shadow-lg transition flex items-center gap-2"
                >
                  <Gift size={15} />
                  <span>Open Giveaway Command Center</span>
                </Link>
                <Link
                  href="/docs#giveaways"
                  className="h-12 px-6 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-bold text-white transition flex items-center gap-2"
                >
                  <span>Giveaway Docs</span>
                  <ChevronRight size={14} />
                </Link>
              </div>
            </div>

            {/* Right: Live Interactive Giveaway Discord Embed Mockup */}
            <div className="relative order-1 lg:order-2">
              <div className="rounded-[2.2rem] border border-white/15 bg-[#313338] p-5 sm:p-7 font-sans shadow-2xl space-y-4">
                {/* Header */}
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-rose-500 to-red-600 grid place-items-center text-white font-black text-sm shrink-0 shadow">
                    ☢
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">Uranium</span>
                      <span className="px-1.5 py-0.5 rounded-[4px] bg-[#5865F2] text-[10px] font-bold text-white">✓ APP</span>
                      <span className="text-[11px] text-white/40">Today at 1:18 PM</span>
                    </div>
                  </div>
                </div>

                {/* Announcement text */}
                <p className="text-xs text-white/90 pl-12 -mt-2">
                  <span className="bg-[#5865F2]/20 text-[#C9CDFB] px-1.5 py-0.5 rounded font-medium mr-1.5">@everyone</span>
                  🎉 **MEGA COMMUNITY GIVEAWAY!** Click the button below to participate!
                </p>

                {/* Rich Embed */}
                <div className="ml-12 border-l-4 border-rose-500 rounded-r-xl bg-[#2B2D31] p-4 space-y-3 shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-base font-bold text-white">🎉 GIVEAWAY: Discord Nitro (1 Year)</h4>
                    <img src="/images/guide-giveaways.jpg" alt="" className="h-12 w-12 rounded-xl object-cover border border-white/10" />
                  </div>

                  <div className="space-y-1 text-xs text-white/85">
                    <p><strong className="text-white">🎁 Prize:</strong> Discord Nitro (1 Year)</p>
                    <p><strong className="text-white">🏆 Winners:</strong> 3 Winners</p>
                    <p><strong className="text-white">⏳ Ends:</strong> in 2 days (&lt;t:1790100000:R&gt;)</p>
                    <p><strong className="text-white">👑 Hosted by:</strong> <span className="bg-[#5865F2]/25 text-[#C9CDFB] px-1.5 py-0.5 rounded font-medium">@ServerOwner</span></p>
                    <p><strong className="text-white">🛡️ Required Role:</strong> <span className="bg-white/10 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded font-medium">@VIP Member</span></p>
                  </div>

                  <div className="text-[10px] text-white/40 pt-2 border-t border-white/5 flex items-center justify-between">
                    <span>Uranium Giveaways • Winners: 3</span>
                    <span>Ends in 2 days</span>
                  </div>
                </div>

                {/* Interactive Discord Buttons with Live Click Simulation */}
                <div className="ml-12 flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleGiveawayClick}
                    className="px-5 py-2 rounded-[8px] bg-[#5865F2] hover:bg-[#4752C4] active:scale-95 text-xs font-semibold text-white shadow flex items-center gap-1.5 transition"
                  >
                    <span>🎉</span>
                    <span>{hasEnteredGiveaway ? 'Entered' : 'Enter'} ({giveawayCount})</span>
                  </button>
                  <span className="px-3.5 py-2 rounded-[8px] bg-[#4E5058]/40 border border-white/5 text-xs text-white/50 font-medium">
                    3 Winners
                  </span>
                  <span className="text-[11px] text-rose-400 font-bold ml-2 animate-pulse">
                    ← Click to test live counter!
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. DOCUMENTATION & TUTORIALS CARDS (MEE6 Image 3 Style) */}
      {/* ========================================================================= */}
      <section className="relative z-10 py-24 border-t border-white/10 bg-[#0b0c15]">
        <div className="mx-auto max-w-7xl px-4 sm:px-8 space-y-12">
          
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-xs font-black uppercase tracking-widest text-rose-400">Knowledge Base</span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Discover Uranium Tutorials, Documents and Guides
            </h2>
            <p className="text-base text-white/60 leading-relaxed">
              Whether you're starting a new server or managing thousands of active members, our comprehensive guides help you set up and get rolling in minutes.
            </p>
          </div>

          {/* 3 Tutorial Cards Grid with Custom Thumbnails */}
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: 'How to Build an Unbreakable Discord Server with AutoMod',
                desc: 'Step-by-step tutorial on setting up anti-raid protection, regex banned word filters, and whitelisting trusted staff members.',
                image: '/images/guide-automod.jpg',
                link: '/docs#automod',
                tag: 'Security & AutoMod'
              },
              {
                title: 'Setting Up 24/7 Lossless Audio & DSP Filters in Voice',
                desc: 'Learn how to keep music streaming non-stop in voice channels with BassBoost, 8D audio rotation, and Spotify integration.',
                image: '/images/guide-music.jpg',
                link: '/docs#music-streaming',
                tag: 'Music & Audio'
              },
              {
                title: 'How to Launch Role-Gated Giveaways & Self-Assign Roles',
                desc: 'Engage your community with custom interactive buttons, live countdown timers, and role eligibility gating.',
                image: '/images/guide-giveaways.jpg',
                link: '/docs#giveaways',
                tag: 'Giveaways & Roles'
              }
            ].map((card) => (
              <Link
                key={card.title}
                href={card.link}
                className="group rounded-[2rem] border border-white/10 hover:border-white/25 bg-[#121422] p-5 flex flex-col justify-between space-y-5 transition duration-300 hover:-translate-y-1 shadow-xl hover:shadow-2xl hover:shadow-rose-600/10"
              >
                <div className="space-y-4">
                  {/* Thumbnail Image */}
                  <div className="w-full h-48 rounded-[1.4rem] overflow-hidden border border-white/10 relative">
                    <img
                      src={card.image}
                      alt={card.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-bold uppercase tracking-wider text-rose-300">
                      {card.tag}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-lg font-black text-white tracking-tight group-hover:text-rose-400 transition">
                    {card.title}
                  </h3>
                  <p className="text-xs text-white/55 leading-relaxed">
                    {card.desc}
                  </p>
                </div>

                {/* Bottom Link */}
                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs font-bold text-rose-400 group-hover:text-rose-300 transition">
                  <span>Keep reading</span>
                  <ChevronRight size={15} className="group-hover:translate-x-1 transition" />
                </div>
              </Link>
            ))}
          </div>

          {/* Bottom Center Action Button */}
          <div className="text-center pt-4">
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 h-12 px-8 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-black uppercase tracking-wider text-white transition hover:scale-105"
            >
              <BookOpen size={16} className="text-rose-400" />
              <span>Browse Documentation Hub</span>
            </Link>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. CALL TO ACTION BANNER (MEE6 Image 4 Style in Brand Crimson Red) */}
      {/* ========================================================================= */}
      <section className="relative z-10 py-20 bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 text-center text-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-8 space-y-6">
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
            Build the best Discord server for free
          </h2>
          <p className="text-base sm:text-lg text-white/90 max-w-xl mx-auto leading-relaxed">
            Join thousands of Discord server owners already boosting member activity and securing their channels with Uranium.
          </p>
          <div className="pt-2">
            <a
              href={inviteHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 h-13 px-9 rounded-2xl bg-white text-black hover:bg-white/90 text-sm font-black uppercase tracking-wider shadow-2xl transition hover:scale-105"
            >
              <DiscordIcon className="w-5 h-5 text-[#5865F2]" fill="#5865F2" />
              <span>Add to Discord</span>
            </a>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 9. FOOTER (MEE6 Image 4 Style) */}
      {/* ========================================================================= */}
      <footer className="relative z-10 border-t border-white/10 bg-[#0a0b12] py-16 text-white/70">
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          <div className="grid gap-10 md:grid-cols-5">
            
            {/* Brand column */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-tr from-rose-600 to-red-500 text-white shadow-md">
                  <Zap size={20} fill="currentColor" />
                </span>
                <span className="text-xl font-extrabold text-white">Uranium</span>
              </div>
              <p className="text-xs text-white/50 max-w-xs leading-relaxed">
                The best Discord bot to bootstrap and grow your Discord server. Engineered for speed, stability, and total community management.
              </p>
              <p className="text-[11px] text-white/30 pt-4">
                Copyright © 2024 - 2026 Uranium Bot. All rights reserved.
              </p>
            </div>

            {/* Column 1: Plugins */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-white">Plugins</p>
              <ul className="space-y-2 text-xs text-white/60">
                <li><a href="#music" className="hover:text-white transition">Lossless Audio</a></li>
                <li><a href="#defense" className="hover:text-white transition">AutoMod Engine</a></li>
                <li><a href="#giveaways" className="hover:text-white transition">Custom Giveaways</a></li>
                <li><Link href="/dashboard/rr" className="hover:text-white transition">Reaction Roles</Link></li>
                <li><Link href="/dashboard/settings" className="hover:text-white transition">Server Settings</Link></li>
              </ul>
            </div>

            {/* Column 2: Resources */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-white">Resources</p>
              <ul className="space-y-2 text-xs text-white/60">
                <li><Link href="/docs" className="hover:text-white transition">Documentation</Link></li>
                <li><Link href="/commands" className="hover:text-white transition">Commands Reference</Link></li>
                <li><a href="#music" className="hover:text-white transition">Audio Filters</a></li>
                <li><Link href="/docs#invite-bot" className="hover:text-white transition">Setup Guides</Link></li>
              </ul>
            </div>

            {/* Column 3: Company & Legal */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-white">Legal</p>
              <ul className="space-y-2 text-xs text-white/60">
                <li><Link href="/tos" className="hover:text-white transition">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link></li>
                <li><a href={inviteHref} target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Invite Bot</a></li>
                <li><a href="https://discord.gg/invite" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Support Server</a></li>
              </ul>
            </div>

          </div>
        </div>
      </footer>

    </main>
  );
}
