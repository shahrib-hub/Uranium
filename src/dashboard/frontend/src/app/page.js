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
  Scale
} from 'lucide-react';
import LucentSwitch from '@/components/LucentSwitch';

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [activeFilter, setActiveFilter] = useState('bassboost');

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

  return (
    <main className="min-h-screen bg-[var(--canvas)] text-white selection:bg-rose-500/30 selection:text-white">
      {/* Glow Orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-[10%] -top-[10%] h-[550px] w-[550px] rounded-full bg-rose-600/15 blur-[140px]" />
        <div className="absolute right-[5%] top-[20%] h-[480px] w-[480px] rounded-full bg-red-600/10 blur-[150px]" />
        <div className="absolute bottom-[10%] left-[30%] h-[400px] w-[400px] rounded-full bg-rose-500/10 blur-[130px]" />
      </div>

      {/* Floating Header Navigation */}
      <nav className="fixed inset-x-0 top-0 z-50 px-4 py-4 sm:px-8">
        <div className="glass mx-auto flex max-w-6xl items-center justify-between rounded-2xl px-5 py-3 border border-white/10 shadow-2xl shadow-black/50 backdrop-blur-xl">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-[0_0_20px_rgba(255,41,79,.4)] group-hover:scale-105 transition">
              <Zap size={18} fill="currentColor" />
            </span>
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-base sm:text-lg leading-tight text-white flex items-center gap-1.5">
                Uranium
                <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-rose-300 ring-1 ring-rose-500/30">v2.4</span>
              </span>
              <span className="text-[10px] text-[var(--quiet)] tracking-wide">Community Engine</span>
            </div>
          </Link>

          {/* Quick Links */}
          <div className="hidden md:flex items-center gap-6 text-xs font-semibold text-[var(--muted)]">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#music" className="hover:text-white transition">Audio Engine</a>
            <a href="#defense" className="hover:text-white transition">Moderation</a>
            <Link href="/commands" className="hover:text-white transition">Commands</Link>
            <Link href="/tos" className="hover:text-white transition">Terms</Link>
            <Link href="/privacy" className="hover:text-white transition">Privacy</Link>
          </div>

          {/* User / Theme Actions */}
          <div className="flex items-center gap-3">
            <LucentSwitch />
            <a
              href={dashboardHref}
              className="lucent-button lucent-button-primary h-10 px-4 sm:px-5 text-xs font-bold gap-2 text-white shadow-lg shadow-rose-500/20 hover:scale-[1.02] active:scale-[0.98] transition"
            >
              <span>{user ? 'Open Dashboard' : 'Sign in with Discord'}</span>
              <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative mx-auto max-w-6xl px-6 pt-36 pb-20 sm:px-10 sm:pt-44">
        {/* Status Pill */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3.5 py-1 text-xs font-bold text-rose-300 backdrop-blur-md">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
          <span>Online & Ready · Built for Discord Communities</span>
        </div>

        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-[1.05]">
              High-octane bot for <span className="bg-gradient-to-r from-white via-rose-100 to-rose-400 bg-clip-text text-transparent">real communities</span>.
            </h1>
            <p className="mt-6 text-base sm:text-lg text-[var(--muted)] leading-relaxed max-w-xl">
              Stream lossless 320kbps audio with real-time DSP filters, safeguard your channels with instant raid & automod defense, and assign roles effortlessly. No paywalls. No junk commands.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
              <a
                href={inviteHref}
                target="_blank"
                rel="noopener noreferrer"
                className="lucent-button lucent-button-primary h-13 px-7 text-sm font-bold gap-2 text-white shadow-xl shadow-rose-500/25 hover:scale-[1.02] transition"
              >
                <Zap size={17} fill="currentColor" />
                <span>Add Uranium to Server</span>
              </a>
              <a
                href={dashboardHref}
                className="lucent-button h-13 px-6 text-sm font-semibold gap-2 border-white/10 hover:border-white/25 text-white hover:bg-white/[0.08] transition"
              >
                <span>Manage via Dashboard</span>
                <ArrowRight size={16} />
              </a>
            </div>

            {/* Live Guarantee Bullet Points */}
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-2.5 text-xs text-[var(--muted)]">
              <span className="flex items-center gap-1.5 font-medium">
                <Check size={14} className="text-rose-400" /> 24/7 Shoukaku Audio
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <Check size={14} className="text-rose-400" /> Zero-Lag Moderation
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <Check size={14} className="text-rose-400" /> Free & Community Owned
              </span>
            </div>
          </div>

          {/* Hero Live Mock Interface */}
          <div className="relative">
            <div className="lucent-card rounded-[2rem] p-6 shadow-2xl border border-white/15 bg-black/40 backdrop-blur-2xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full bg-rose-500 shadow-[0_0_8px_#ff294f]" />
                  <span className="font-bold text-xs tracking-wider uppercase text-[var(--quiet)]">Uranium Console</span>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-emerald-300 ring-1 ring-emerald-500/30">
                  {stats?.ping ? `${stats.ping} latency` : 'Connected'}
                </span>
              </div>

              {/* Now Playing Interactive Mock Card */}
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center gap-3.5">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-rose-900 to-black p-0.5 ring-1 ring-white/20">
                    <div className="h-full w-full rounded-[10px] bg-black/40 flex items-center justify-center text-rose-300">
                      <Disc size={28} className="animate-spin-slow" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="inline-block rounded bg-rose-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-rose-300">
                      Lossless 320kbps
                    </span>
                    <h3 className="truncate text-sm font-bold text-white mt-1">Blinding Lights</h3>
                    <p className="truncate text-xs text-[var(--muted)]">The Weeknd • After Hours</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-[10px] font-mono text-[var(--quiet)] mb-1">
                    <span>1:42</span>
                    <span>3:20</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-[54%] rounded-full bg-gradient-to-r from-rose-500 to-rose-300 shadow-[0_0_12px_#ff294f]" />
                  </div>
                </div>

                {/* Active Filter Pills */}
                <div className="mt-3.5 flex items-center gap-1.5 overflow-x-auto pt-1">
                  {['Bass Boost', 'Nightcore', '8D Rotation', 'Vaporwave'].map((f) => {
                    const key = f.toLowerCase().replace(' ', '');
                    const isSelected = activeFilter === key;
                    return (
                      <button
                        key={f}
                        onClick={() => setActiveFilter(key)}
                        className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition ${
                          isSelected
                            ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/30'
                            : 'bg-white/5 text-[var(--muted)] hover:bg-white/10'
                        }`}
                      >
                        {f}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Metric Badges */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5 text-center">
                  <p className="text-[10px] font-bold uppercase text-[var(--quiet)]">Servers</p>
                  <p className="text-base font-black text-white mt-0.5">{stats?.totalServers ?? '36+'}</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5 text-center">
                  <p className="text-[10px] font-bold uppercase text-[var(--quiet)]">Uptime</p>
                  <p className="text-base font-black text-white mt-0.5">{stats?.uptime ?? '99.9%'}</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5 text-center">
                  <p className="text-[10px] font-bold uppercase text-[var(--quiet)]">Engine</p>
                  <p className="text-base font-black text-rose-300 mt-0.5">Shoukaku</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5 text-center">
                  <p className="text-[10px] font-bold uppercase text-[var(--quiet)]">Memory</p>
                  <p className="text-base font-black text-white mt-0.5">{stats?.memoryUsage ?? '56 MB'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CORE FEATURES SECTION */}
      <section id="features" className="relative mx-auto max-w-6xl px-6 py-20 sm:px-10 border-t border-white/10">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-xs font-bold uppercase tracking-widest text-rose-400 mb-2 flex items-center justify-center gap-1.5">
            <Flame size={14} /> Battle-Tested Modules
          </p>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            Built for server owners who care about quality.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[var(--muted)]">
            Everything your server needs to stay active, entertained, and safe from raids.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Card 1: Music */}
          <article id="music" className="lucent-card rounded-[1.8rem] p-7 flex flex-col justify-between hover:border-rose-400/40 transition-all duration-300 group">
            <div>
              <div className="h-12 w-12 rounded-2xl bg-rose-500/15 text-rose-300 grid place-items-center ring-1 ring-rose-500/30 mb-6 group-hover:scale-110 transition">
                <Headphones size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Lossless Music Engine</h3>
              <p className="text-sm text-[var(--muted)] leading-relaxed">
                Lag-free audio streaming with live queue management, Spotify/YouTube track resolution, and hardware-accelerated DSP filters like Nightcore, Bass Boost, and 8D.
              </p>
            </div>
            <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between text-xs font-semibold text-rose-300">
              <span>Explore Audio Controls</span>
              <ChevronRight size={16} />
            </div>
          </article>

          {/* Card 2: Moderation Defense */}
          <article id="defense" className="lucent-card rounded-[1.8rem] p-7 flex flex-col justify-between hover:border-rose-400/40 transition-all duration-300 group">
            <div>
              <div className="h-12 w-12 rounded-2xl bg-amber-500/15 text-amber-300 grid place-items-center ring-1 ring-amber-500/30 mb-6 group-hover:scale-110 transition">
                <ShieldAlert size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Automated Server Defense</h3>
              <p className="text-sm text-[var(--muted)] leading-relaxed">
                Full-featured moderation suite with live infractions audit log, anti-spam automod, channel slowmode control, emergency lockdown, and Discord ban synchronization.
              </p>
            </div>
            <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between text-xs font-semibold text-amber-300">
              <span>View Defense Tools</span>
              <ChevronRight size={16} />
            </div>
          </article>

          {/* Card 3: Reaction Roles & Community */}
          <article className="lucent-card rounded-[1.8rem] p-7 flex flex-col justify-between hover:border-rose-400/40 transition-all duration-300 group">
            <div>
              <div className="h-12 w-12 rounded-2xl bg-purple-500/15 text-purple-300 grid place-items-center ring-1 ring-purple-500/30 mb-6 group-hover:scale-110 transition">
                <Users size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Reaction Roles & Panels</h3>
              <p className="text-sm text-[var(--muted)] leading-relaxed">
                Build clean, clickable role selection panels without tedious bot syntax. Members click once to get notifications, access VIP channels, and self-assign roles.
              </p>
            </div>
            <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between text-xs font-semibold text-purple-300">
              <span>Setup Roles</span>
              <ChevronRight size={16} />
            </div>
          </article>
        </div>
      </section>

      {/* WHY URANIUM / HUMAN MANIFESTO */}
      <section className="relative mx-auto max-w-6xl px-6 py-16 sm:px-10">
        <div className="lucent-card rounded-[2rem] p-8 sm:p-12 border border-white/15 bg-gradient-to-br from-rose-950/20 via-black to-black">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-lg bg-rose-500/15 border border-rose-500/30 px-3 py-1 text-xs font-bold text-rose-300 uppercase mb-4">
                <Scale size={13} /> Community First Philosophy
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                No paywalled music.<br />No subscription nags.
              </h2>
              <p className="mt-4 text-sm sm:text-base text-[var(--muted)] leading-relaxed">
                We built Uranium because we were tired of bots that play 30 seconds of a song and demand $10/month, or crash the moment five servers join at once.
              </p>
              <p className="mt-3 text-sm sm:text-base text-[var(--muted)] leading-relaxed">
                Every feature—from high-bitrate playback to automated server defense—is engineered to be snappy, stable, and completely accessible to every server administrator.
              </p>
              <div className="mt-6 flex flex-wrap gap-4">
                <a
                  href={inviteHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lucent-button lucent-button-primary h-11 px-6 text-xs font-bold gap-2 text-white"
                >
                  <span>Invite to Discord</span>
                  <ArrowRight size={14} />
                </a>
                <a
                  href="https://discord.gg/26ThFyckFX"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lucent-button h-11 px-5 text-xs font-semibold gap-2 text-white border-white/10 hover:border-white/20"
                >
                  <MessageSquare size={14} />
                  <span>Join Support Guild</span>
                </a>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.03] flex items-start gap-4">
                <span className="p-2.5 rounded-xl bg-rose-500/15 text-rose-300 shrink-0 mt-0.5">
                  <Zap size={18} />
                </span>
                <div>
                  <h4 className="font-bold text-sm text-white">Always-On Voice Nodes</h4>
                  <p className="text-xs text-[var(--muted)] mt-1">Dedicated Lavalink audio backends provide smooth, jitter-free playback with zero 24/7 fees.</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.03] flex items-start gap-4">
                <span className="p-2.5 rounded-xl bg-amber-500/15 text-amber-300 shrink-0 mt-0.5">
                  <ShieldCheck size={18} />
                </span>
                <div>
                  <h4 className="font-bold text-sm text-white">Full Privacy Compliance</h4>
                  <p className="text-xs text-[var(--muted)] mt-1">We collect zero chat telemetry and do not sell user data. Check our open legal disclosures anytime.</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.03] flex items-start gap-4">
                <span className="p-2.5 rounded-xl bg-purple-500/15 text-purple-300 shrink-0 mt-0.5">
                  <Radio size={18} />
                </span>
                <div>
                  <h4 className="font-bold text-sm text-white">Real-Time Web Sync</h4>
                  <p className="text-xs text-[var(--muted)] mt-1">Changes made on your dashboard update directly on Discord within milliseconds over Socket.IO.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* RICH 4-COLUMN FOOTER */}
      <footer className="mt-20 border-t border-white/15 bg-black/60 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-6 py-14 sm:px-10">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:gap-12">
            {/* Column 1: Brand & Status */}
            <div className="col-span-2 md:col-span-1 space-y-4">
              <Link href="/" className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-rose-500 text-white shadow-md shadow-rose-500/30">
                  <Zap size={16} fill="currentColor" />
                </span>
                <span className="font-black text-lg text-white tracking-tight">Uranium</span>
              </Link>
              <p className="text-xs text-[var(--muted)] leading-relaxed">
                Free, multi-purpose Discord bot offering lossless music playback, real-time moderation, and role automation.
              </p>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>All Systems Operational</span>
              </div>
            </div>

            {/* Column 2: Product & Modules */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-white">Features</p>
              <ul className="space-y-2 text-xs text-[var(--muted)]">
                <li><a href="#music" className="hover:text-rose-300 transition-colors">Music Player</a></li>
                <li><a href="#defense" className="hover:text-rose-300 transition-colors">Moderation & Automod</a></li>
                <li><Link href="/dashboard/rr" className="hover:text-rose-300 transition-colors">Reaction Roles</Link></li>
                <li><Link href="/commands" className="hover:text-rose-300 transition-colors">Commands Directory</Link></li>
                <li><Link href="/servers" className="hover:text-rose-300 transition-colors">Server Manager</Link></li>
              </ul>
            </div>

            {/* Column 3: Community & Support */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-white">Community</p>
              <ul className="space-y-2 text-xs text-[var(--muted)]">
                <li>
                  <a href="https://discord.gg/26ThFyckFX" target="_blank" rel="noopener noreferrer" className="hover:text-rose-300 transition-colors flex items-center gap-1.5">
                    <span>Discord Support</span>
                    <ExternalLink size={11} className="text-rose-400" />
                  </a>
                </li>
                <li>
                  <a href={inviteHref} target="_blank" rel="noopener noreferrer" className="hover:text-rose-300 transition-colors flex items-center gap-1.5">
                    <span>Invite Uranium</span>
                    <ExternalLink size={11} className="text-rose-400" />
                  </a>
                </li>
                <li>
                  <a href="https://github.com/shahrib-hub/Uranium" target="_blank" rel="noopener noreferrer" className="hover:text-rose-300 transition-colors flex items-center gap-1.5">
                    <span>GitHub Repository</span>
                    <ExternalLink size={11} className="text-rose-400" />
                  </a>
                </li>
                <li><a href="https://discord.com" target="_blank" rel="noopener noreferrer" className="hover:text-rose-300 transition-colors">Discord Platform</a></li>
              </ul>
            </div>

            {/* Column 4: Legal & Policies (PROMINENT) */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                <Scale size={13} className="text-rose-400" />
                <span>Legal & Policies</span>
              </p>
              <ul className="space-y-2.5 text-xs">
                <li>
                  <Link 
                    href="/tos" 
                    className="inline-flex items-center gap-1.5 font-bold text-rose-300 hover:text-white hover:underline transition-colors"
                  >
                    <FileText size={13} />
                    <span>Terms of Service (TOS)</span>
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/privacy" 
                    className="inline-flex items-center gap-1.5 font-bold text-rose-300 hover:text-white hover:underline transition-colors"
                  >
                    <Lock size={13} />
                    <span>Privacy Policy</span>
                  </Link>
                </li>
                <li className="text-[11px] text-[var(--quiet)] pt-1">
                  GDPR & Discord Developer Terms Compliant.
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Copyright Row */}
          <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--quiet)]">
            <p>© 2026 Uranium Bot. Built with dedication by SHM & community contributors.</p>
            <div className="flex items-center gap-4">
              <Link href="/tos" className="hover:text-rose-300 transition-colors">Terms</Link>
              <span>•</span>
              <Link href="/privacy" className="hover:text-rose-300 transition-colors">Privacy</Link>
              <span>•</span>
              <a href="https://discord.gg/26ThFyckFX" target="_blank" rel="noopener noreferrer" className="hover:text-rose-300 transition-colors">Support</a>
              <span>•</span>
              <Link href="/commands" className="hover:text-rose-300 transition-colors">Commands</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
