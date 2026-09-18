'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Headphones, Heart, ShieldCheck, Sparkles, Users, Zap } from 'lucide-react';
import LucentSwitch from '@/components/LucentSwitch';

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch('/api/me').then((r) => r.ok ? r.json() : null).then(setUser).catch(() => null);
    fetch('/api/bot/stats').then((r) => r.ok ? r.json() : null).then(setStats).catch(() => null);
  }, []);

  const dashboardHref = user ? '/servers' : '/auth/login';

  return (
    <main className="min-h-screen overflow-hidden">
      <nav className="fixed inset-x-0 top-0 z-50 px-4 py-4 sm:px-7">
        <div className="glass mx-auto flex max-w-6xl items-center justify-between rounded-[1.45rem] px-4 py-3 sm:px-5">
          <Link href="/" className="flex items-center gap-3 font-bold tracking-tight">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-[#ff294f] to-[#ff8499] text-white shadow-[0_10px_26px_rgba(255,45,79,.32)]"><Zap size={19} fill="currentColor" /></span>
            <span className="text-lg">Uranium</span>
          </Link>
          <div className="flex items-center gap-2">
            <LucentSwitch />
            <a href={dashboardHref} className="lucent-button lucent-button-primary min-h-10 px-4 text-sm font-semibold sm:px-5">
              {user ? 'Open dashboard' : 'Sign in'} <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </nav>

      <section className="relative mx-auto flex min-h-[760px] max-w-7xl items-center px-6 pb-20 pt-40 sm:px-10">
        <div className="absolute left-[5%] top-32 h-72 w-72 rounded-full bg-rose-500/20 blur-[115px]" />
        <div className="absolute right-0 top-44 h-80 w-80 rounded-full bg-red-400/10 blur-[130px]" />
        <div className="relative grid w-full gap-14 lg:grid-cols-[1.08fr_.92fr] lg:items-center">
          <div>
            <p className="lucent-kicker mb-6 flex items-center gap-2"><Sparkles size={14} /> Made for communities</p>
            <h1 className="lucent-title max-w-3xl">A better home<br />for your Discord server.</h1>
            <p className="lucent-subtitle mt-7">Manage music, server settings, and reaction roles from one calm, clear dashboard. No clutter. No confusing language.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a href={dashboardHref} className="lucent-button lucent-button-primary h-14 px-7 font-semibold">Get started <ArrowRight size={18} /></a>
              <a href="https://discord.com/oauth2/authorize?client_id=932136827605905489&permissions=8&scope=bot%20applications.commands" className="lucent-button h-14 px-7 font-semibold">Add Uranium to Discord</a>
            </div>
            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm text-[var(--muted)]">
              <span className="flex items-center gap-2"><Check size={16} className="text-rose-300" /> Manage the servers you own</span>
              <span className="flex items-center gap-2"><Check size={16} className="text-rose-300" /> Keep music in sync</span>
            </div>
          </div>

          <div className="lucent-card animate-float rounded-[2rem] p-4 sm:p-6">
            <div className="rounded-[1.5rem] border border-white/10 bg-black/15 p-5 sm:p-7">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Your server, at a glance</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">Everything you need is in one place.</p>
                </div>
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-rose-400/15 text-rose-200"><Heart size={20} fill="currentColor" /></span>
              </div>
              <div className="mt-7 grid grid-cols-2 gap-3">
                <Stat label="Servers" value={stats?.totalServers ?? '—'} icon={<Users size={17} />} />
                <Stat label="Response time" value={stats?.ping ?? '—'} icon={<Zap size={17} />} />
                <Stat label="Uptime" value={stats?.uptime ?? '—'} icon={<ShieldCheck size={17} />} />
                <Stat label="Memory" value={stats?.memoryUsage ?? '—'} icon={<Headphones size={17} />} />
              </div>
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[.045] p-4">
                <div className="flex items-center justify-between text-sm"><span className="text-[var(--muted)]">Music</span><span className="rounded-full bg-rose-400/15 px-2.5 py-1 text-xs font-semibold text-rose-100">Ready when you are</span></div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[68%] rounded-full bg-gradient-to-r from-rose-500 to-rose-300 shadow-[0_0_14px_rgba(255,79,113,.8)]" /></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-24 sm:grid-cols-3 sm:px-10">
        <Feature icon={<Headphones />} title="Music that stays simple" copy="Search, play, queue, and adjust playback without leaving the dashboard." />
        <Feature icon={<ShieldCheck />} title="Settings you can understand" copy="Update your bot's name and language with straightforward controls." />
        <Feature icon={<Users />} title="A place for your community" copy="Build reaction-role panels and keep your server organised." />
      </section>

      <footer className="border-t border-white/10 px-6 py-8 text-center text-sm text-[var(--quiet)]">Uranium • Made for Discord communities</footer>
    </main>
  );
}

function Stat({ label, value, icon }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[.045] p-4"><div className="flex items-center gap-2 text-xs text-[var(--muted)]">{icon}{label}</div><div className="mt-3 text-2xl font-semibold tracking-tight">{value}</div></div>;
}
function Feature({ icon, title, copy }) {
  return <article className="lucent-card rounded-[1.5rem] p-6"><span className="mb-5 grid h-10 w-10 place-items-center rounded-2xl bg-rose-400/15 text-rose-200">{icon}</span><h2 className="text-lg font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{copy}</p></article>;
}
