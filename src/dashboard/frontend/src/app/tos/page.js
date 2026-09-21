'use client';

import Link from 'next/link';
import { 
  ChevronLeft, 
  ShieldCheck, 
  Scale, 
  FileText, 
  Headphones, 
  AlertTriangle, 
  ExternalLink, 
  MessageSquare, 
  Lock, 
  Server, 
  Flame, 
  HelpCircle,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

const SECTIONS = [
  { id: 'agreement', title: '1. Agreement to Terms' },
  { id: 'license', title: '2. License & Acceptable Use' },
  { id: 'bot-operations', title: '3. Bot Operations & Availability' },
  { id: 'music-streaming', title: '4. Audio & Media Streaming' },
  { id: 'moderation', title: '5. Moderation & Server Governance' },
  { id: 'privacy-data', title: '6. Privacy & Data Handling' },
  { id: 'third-party', title: '7. Third-Party Integrations' },
  { id: 'liability', title: '8. Limitation of Liability' },
  { id: 'modifications', title: '9. Changes & Termination' },
  { id: 'contact', title: '10. Contact & Support' }
];

export default function TermsOfService() {
  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen">
      {/* Background glow effects */}
      <div className="lucent-page mx-auto max-w-5xl py-8 sm:py-16">
        {/* Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <Link 
            href="/" 
            className="lucent-button h-10 px-4 rounded-xl text-xs font-semibold gap-2 text-rose-200 hover:text-white transition"
          >
            <ChevronLeft size={16} />
            <span>Back to Home</span>
          </Link>
          
          <div className="flex items-center gap-3">
            <Link 
              href="/privacy" 
              className="text-xs font-semibold text-[var(--muted)] hover:text-rose-300 transition-colors"
            >
              Privacy Policy
            </Link>
            <span className="text-white/20">•</span>
            <Link 
              href="/dashboard" 
              className="lucent-button lucent-button-primary h-10 px-4 rounded-xl text-xs font-bold gap-2 text-white transition shadow-md shadow-rose-500/20"
            >
              <span>Open Dashboard</span>
            </Link>
          </div>
        </div>

        {/* Hero Header */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-bold tracking-wide uppercase mb-4">
            <Scale size={13} />
            <span>Legal & Compliance</span>
          </div>
          <h1 className="lucent-title text-4xl sm:text-6xl font-bold tracking-tight text-white mb-4">
            Terms of Service
          </h1>
          <p className="lucent-subtitle text-base sm:text-lg text-[var(--muted)] max-w-2xl leading-relaxed">
            Please read these terms carefully before connecting Uranium to your Discord server or utilizing our dashboard services.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-[var(--quiet)]">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.04] border border-white/10 font-medium text-white/70">
              <Sparkles size={13} className="text-rose-400" />
              Effective: May 2026
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.04] border border-white/10 font-medium text-white/70">
              <ShieldCheck size={13} className="text-emerald-400" />
              Discord Developer TOS Compliant
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.04] border border-white/10 font-medium text-white/70">
              Version 2.4
            </span>
          </div>
        </div>

        {/* Table of Contents Navigator */}
        <div className="lucent-card rounded-2xl p-5 mb-12">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--quiet)] mb-3 flex items-center gap-2">
            <FileText size={14} className="text-rose-400" /> Quick Jump Navigator
          </p>
          <div className="flex flex-wrap gap-2">
            {SECTIONS.map((sec) => (
              <button
                key={sec.id}
                onClick={() => scrollToSection(sec.id)}
                className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-rose-500/15 hover:border-rose-500/30 border border-white/10 text-xs text-white/80 hover:text-white transition-all cursor-pointer"
              >
                {sec.title}
              </button>
            ))}
          </div>
        </div>

        {/* Legal Sections */}
        <div className="space-y-8">
          {/* 1. Agreement to Terms */}
          <section id="agreement" className="lucent-card rounded-[1.8rem] p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-400/15 text-rose-300 ring-1 ring-rose-400/20">
                <Scale size={20} />
              </span>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">1. Agreement to Terms</h2>
                <p className="text-xs text-[var(--muted)]">Binding mutual relationship</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-white/80">
              By adding the Uranium Discord Bot to any server, authenticating with your Discord account on our web portal (<code className="px-2 py-0.5 rounded bg-white/10 text-rose-300 font-mono text-xs">uraniumbot.vercel.app</code> or custom domains), or issuing bot commands, you acknowledge that you have read, understood, and agreed to be legally bound by these Terms of Service.
            </p>
            <p className="text-sm leading-relaxed text-white/80">
              These terms constitute a legally binding agreement between you (the user or server administrator) and the Uranium Development Team (SHM). If you do not consent to any part of these terms, you must immediately remove the bot from your Discord servers and discontinue use of the dashboard.
            </p>
          </section>

          {/* 2. License & Acceptable Use */}
          <section id="license" className="lucent-card rounded-[1.8rem] p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-400/15 text-rose-300 ring-1 ring-rose-400/20">
                <ShieldCheck size={20} />
              </span>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">2. License & Acceptable Use</h2>
                <p className="text-xs text-[var(--muted)]">Permitted usage and operational boundaries</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-white/80">
              Subject to these terms, Uranium grants you a revocable, non-exclusive, non-transferable, and royalty-free license to use the bot and associated web interface for community management, moderation, and media entertainment in personal or public Discord communities.
            </p>
            <p className="text-sm font-semibold text-white mt-2">You explicitly covenant and agree that you will not:</p>
            <div className="grid sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                <div className="flex items-center gap-2 text-rose-300 text-xs font-bold">
                  <AlertTriangle size={14} /> No Abuse or Harassment
                </div>
                <p className="text-xs text-[var(--muted)] leading-5">
                  Use Uranium to facilitate hate speech, targeted harassment, raids, spam campaigns, or violation of applicable regional laws.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                <div className="flex items-center gap-2 text-rose-300 text-xs font-bold">
                  <AlertTriangle size={14} /> No Rate-Limit Bypasses
                </div>
                <p className="text-xs text-[var(--muted)] leading-5">
                  Distribute automated scripts, scraping spiders, or distributed bots designed to flood or overwhelm the Uranium API or Discord gateways.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                <div className="flex items-center gap-2 text-rose-300 text-xs font-bold">
                  <AlertTriangle size={14} /> No Exploitation or Reverse Engineering
                </div>
                <p className="text-xs text-[var(--muted)] leading-5">
                  Attempt to decompile, inject unauthorized payloads, or bypass security tokens, guild permission checks, or privilege controls.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                <div className="flex items-center gap-2 text-rose-300 text-xs font-bold">
                  <AlertTriangle size={14} /> No Misrepresentation
                </div>
                <p className="text-xs text-[var(--muted)] leading-5">
                  Impersonate official Uranium developers, support team members, or misrepresent server affiliations.
                </p>
              </div>
            </div>
          </section>

          {/* 3. Bot Operations & Availability */}
          <section id="bot-operations" className="lucent-card rounded-[1.8rem] p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-400/15 text-rose-300 ring-1 ring-rose-400/20">
                <Server size={20} />
              </span>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">3. Bot Operations & Availability</h2>
                <p className="text-xs text-[var(--muted)]">Service performance & maintenance policies</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-white/80">
              Uranium operates on cloud infrastructure engineered for maximum reliability and uptime. However, the service is provided strictly on an <strong>"AS IS"</strong> and <strong>"AS AVAILABLE"</strong> basis.
            </p>
            <p className="text-sm leading-relaxed text-white/80">
              We do not warrant or guarantee that operation of the bot or dashboard will be uninterrupted, bug-free, or compatible with future third-party software updates. Maintenance, database upgrades, and API changes may require temporary downtime, which we strive to schedule during low-traffic periods.
            </p>
          </section>

          {/* 4. Audio & Media Streaming */}
          <section id="music-streaming" className="lucent-card rounded-[1.8rem] p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-400/15 text-rose-300 ring-1 ring-rose-400/20">
                <Headphones size={20} />
              </span>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">4. Audio & Media Streaming</h2>
                <p className="text-xs text-[var(--muted)]">Voice node streaming & fair use</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-white/80">
              The music engine provided by Uranium streams publicly available audio onto Discord voice nodes on behalf of connected listeners. By requesting tracks, you confirm that:
            </p>
            <ul className="space-y-2 text-sm text-white/80 pl-2">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-rose-400 shrink-0 mt-0.5" />
                <span>You will not queue or stream content that infringes upon copyright licenses or contains malicious audio frequencies designed to damage hardware or hearing.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-rose-400 shrink-0 mt-0.5" />
                <span>Audio stream availability depends on external upstream media providers (YouTube, Spotify, SoundCloud) and may vary based on regional restrictions.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-rose-400 shrink-0 mt-0.5" />
                <span>Uranium reserves the right to disconnect from inactive voice channels or apply reasonable concurrency limits during peak traffic.</span>
              </li>
            </ul>
          </section>

          {/* 5. Moderation & Server Governance */}
          <section id="moderation" className="lucent-card rounded-[1.8rem] p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-400/15 text-rose-300 ring-1 ring-rose-400/20">
                <Flame size={20} />
              </span>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">5. Moderation & Server Governance</h2>
                <p className="text-xs text-[var(--muted)]">Admin responsibilities & automated enforcement</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-white/80">
              Uranium offers automated and manual moderation tools including warns, timeouts, kicks, bans, message purges, automod filters, and channel lockouts.
            </p>
            <div className="p-4 rounded-xl bg-rose-500/[0.08] border border-rose-500/20 text-xs leading-relaxed text-rose-100">
              <strong>Server Administrator Responsibility:</strong> Guild owners and authorized moderators hold 100% legal and operational accountability for all disciplinary actions, bans, and message purges dispatched through Uranium. The Uranium Development Team does not intervene in internal guild disputes or overturn server-specific moderation actions.
            </div>
          </section>

          {/* 6. Privacy & Data Handling */}
          <section id="privacy-data" className="lucent-card rounded-[1.8rem] p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-400/15 text-rose-300 ring-1 ring-rose-400/20">
                <Lock size={20} />
              </span>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">6. Privacy & Data Handling</h2>
                <p className="text-xs text-[var(--muted)]">Storage of guild settings and identifiers</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-white/80">
              We respect your digital privacy. Uranium stores only non-sensitive metadata strictly required for feature execution (e.g. Discord Guild IDs, Channel IDs, Role IDs, Moderation Case logs, Reaction-Role panels, and temporary OAuth2 authentication tokens).
            </p>
            <p className="text-sm leading-relaxed text-white/80">
              We never sell or distribute your server configuration or member lists to third parties. For full specifics on data encryption, retention periods, and deletion requests, please consult our <Link href="/privacy" className="text-rose-300 underline font-semibold hover:text-rose-200">Privacy Policy</Link>.
            </p>
          </section>

          {/* 7. Third-Party Integrations */}
          <section id="third-party" className="lucent-card rounded-[1.8rem] p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-400/15 text-rose-300 ring-1 ring-rose-400/20">
                <ExternalLink size={20} />
              </span>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">7. Third-Party Integrations</h2>
                <p className="text-xs text-[var(--muted)]">Discord, Spotify, YouTube & Lavalink</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-white/80">
              Uranium interacts extensively with external APIs and services. By using Uranium, you agree to comply with:
            </p>
            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              <a 
                href="https://discord.com/terms" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-rose-400/40 hover:bg-rose-500/5 transition flex items-center justify-between text-white"
              >
                <span>Discord Terms of Service</span>
                <ExternalLink size={13} className="text-rose-300" />
              </a>
              <a 
                href="https://discord.com/guidelines" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-rose-400/40 hover:bg-rose-500/5 transition flex items-center justify-between text-white"
              >
                <span>Discord Community Guidelines</span>
                <ExternalLink size={13} className="text-rose-300" />
              </a>
              <a 
                href="https://www.youtube.com/t/terms" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-rose-400/40 hover:bg-rose-500/5 transition flex items-center justify-between text-white"
              >
                <span>YouTube Terms of Service</span>
                <ExternalLink size={13} className="text-rose-300" />
              </a>
              <a 
                href="https://www.spotify.com/legal/end-user-agreement/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-rose-400/40 hover:bg-rose-500/5 transition flex items-center justify-between text-white"
              >
                <span>Spotify Terms of Use</span>
                <ExternalLink size={13} className="text-rose-300" />
              </a>
            </div>
          </section>

          {/* 8. Limitation of Liability */}
          <section id="liability" className="lucent-card rounded-[1.8rem] p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-400/15 text-rose-300 ring-1 ring-rose-400/20">
                <AlertTriangle size={20} />
              </span>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">8. Limitation of Liability</h2>
                <p className="text-xs text-[var(--muted)]">Scope of damages & indemnification</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-white/80">
              Under no circumstances shall the Uranium Development Team, its lead maintainers, contributors, or host providers be liable for any direct, indirect, incidental, punitive, or consequential damages resulting from:
            </p>
            <ul className="space-y-2 text-sm text-white/80 pl-2">
              <li className="flex items-start gap-2.5">
                <span className="text-rose-400 font-bold">•</span>
                <span>The loss of server data, message history, roles, or configuration files due to unauthorized user commands or third-party outages.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-rose-400 font-bold">•</span>
                <span>Actions taken by server administrators or automod configurations resulting in user bans or channel locks.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-rose-400 font-bold">•</span>
                <span>Unavailability or rate-limiting enforced by Discord's official gateway or Lavalink providers.</span>
              </li>
            </ul>
          </section>

          {/* 9. Changes & Termination */}
          <section id="modifications" className="lucent-card rounded-[1.8rem] p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-400/15 text-rose-300 ring-1 ring-rose-400/20">
                <HelpCircle size={20} />
              </span>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">9. Changes & Termination</h2>
                <p className="text-xs text-[var(--muted)]">Updates to policies and access revocation</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-white/80">
              We reserve the right to revise or update these Terms of Service at any time. When modifications occur, we will update the "Effective Date" at the top of this page. Your continued use of Uranium after any modifications constitutes explicit acceptance of the revised terms.
            </p>
            <p className="text-sm leading-relaxed text-white/80">
              Uranium reserves the right to terminate or restrict access to the bot or web dashboard for any server or user found in breach of these terms or Discord's Community Guidelines.
            </p>
          </section>

          {/* 10. Contact & Community Support */}
          <section id="contact" className="lucent-card rounded-[1.8rem] p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-400/15 text-rose-300 ring-1 ring-rose-400/20">
                <MessageSquare size={20} />
              </span>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">10. Contact & Community Support</h2>
                <p className="text-xs text-[var(--muted)]">Questions, reports, or legal inquiries</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-white/80">
              If you have any questions, legal notices, or feedback regarding these Terms of Service, please reach out directly through our official Discord support server or contact the lead developers.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <a
                href="https://discord.gg/26ThFyckFX"
                target="_blank"
                rel="noopener noreferrer"
                className="lucent-button lucent-button-primary h-11 px-5 rounded-xl text-xs font-bold gap-2 text-white shadow-lg shadow-rose-500/20 transition hover:scale-[1.02]"
              >
                <MessageSquare size={15} />
                <span>Join Official Support Server</span>
              </a>
              <Link
                href="/privacy"
                className="lucent-button h-11 px-5 rounded-xl text-xs font-semibold gap-2 text-rose-200 hover:text-white transition"
              >
                <Lock size={15} />
                <span>Read Privacy Policy</span>
              </Link>
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--quiet)]">
          <p>© 2026 Uranium Bot • Developed by SHM. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <Link href="/" className="hover:text-rose-300 transition-colors">Home</Link>
            <Link href="/privacy" className="hover:text-rose-300 transition-colors">Privacy Policy</Link>
            <Link href="/dashboard" className="hover:text-rose-300 transition-colors">Dashboard</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
