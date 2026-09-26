'use client';

import Link from 'next/link';
import { 
  ChevronLeft, 
  ShieldCheck, 
  Lock, 
  Database, 
  EyeOff, 
  Key, 
  FileCheck, 
  ExternalLink, 
  MessageSquare, 
  Trash2,
  Sparkles,
  CheckCircle2
} from 'lucide-react';

const SECTIONS = [
  { id: 'collection', title: '1. Data We Collect' },
  { id: 'usage', title: '2. How We Use Your Data' },
  { id: 'security', title: '3. Security & Architecture' },
  { id: 'oauth2', title: '4. OAuth2 & Identity' },
  { id: 'cookies', title: '5. Cookies & Storage' },
  { id: 'retention', title: '6. Retention & Deletion' },
  { id: 'third-party', title: '7. Third-Party Disclosures' },
  { id: 'contact', title: '8. Contact & Rights' }
];

export default function PrivacyPolicy() {
  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen">
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
              href="/tos" 
              className="text-xs font-semibold text-[var(--muted)] hover:text-rose-300 transition-colors"
            >
              Terms of Service
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
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-bold tracking-wide uppercase mb-4">
            <Lock size={13} />
            <span>Privacy & Data Protection</span>
          </div>
          <h1 className="lucent-title text-4xl sm:text-6xl font-bold tracking-tight text-white mb-4">
            Privacy Policy
          </h1>
          <p className="lucent-subtitle text-base sm:text-lg text-[var(--muted)] max-w-2xl leading-relaxed">
            Your trust is essential. Learn what data Uranium collects, how it is secured, and how you can exercise full control over your server records.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-[var(--quiet)]">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.04] border border-white/10 font-medium text-white/70">
              <Sparkles size={13} className="text-rose-400" />
              Effective: May 2026
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.04] border border-white/10 font-medium text-white/70">
              <EyeOff size={13} className="text-emerald-400" />
              Zero Third-Party Advertising
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.04] border border-white/10 font-medium text-white/70">
              GDPR & CCPA Aligned
            </span>
          </div>
        </div>

        {/* Table of Contents Navigator */}
        <div className="lucent-card rounded-2xl p-5 mb-12">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--quiet)] mb-3 flex items-center gap-2">
            <FileCheck size={14} className="text-rose-400" /> Quick Jump Navigator
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
          {/* 1. Data We Collect */}
          <section id="collection" className="lucent-card rounded-[1.8rem] p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-400/15 text-rose-300 ring-1 ring-rose-400/20">
                <Database size={20} />
              </span>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">1. Data We Collect</h2>
                <p className="text-xs text-[var(--muted)]">Minimalist data collection principle</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-white/80">
              Uranium operates under the principle of data minimization. We only collect and store technical information strictly necessary to provide bot features and dashboard management:
            </p>
            <div className="grid sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                <p className="text-xs font-bold text-rose-300">Discord IDs & Metadata</p>
                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  Discord User IDs, Guild IDs, Channel IDs, and Role IDs needed to check administrator privileges, execute moderation cases, and join voice nodes.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                <p className="text-xs font-bold text-rose-300">Server Configurations</p>
                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  Custom moderation settings, automod rules, reaction-role panel definitions, music volume/filter preferences, and bot language choices.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                <p className="text-xs font-bold text-rose-300">Moderation Infractions</p>
                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  Logged warn, mute, timeout, kick, and ban records (including target ID, moderator ID, reason, and timestamp) for server audit transparency.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                <p className="text-xs font-bold text-rose-300">Session Tokens</p>
                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  Temporary OAuth2 session tokens stored to verify your identity during browser sessions.
                </p>
              </div>
            </div>
          </section>

          {/* 2. How We Use Your Data */}
          <section id="usage" className="lucent-card rounded-[1.8rem] p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-400/15 text-rose-300 ring-1 ring-rose-400/20">
                <ShieldCheck size={20} />
              </span>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">2. How We Use Your Data</h2>
                <p className="text-xs text-[var(--muted)]">Direct operational purposes only</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-white/80">
              Collected data is utilized strictly to provide bot and dashboard functionality:
            </p>
            <ul className="space-y-2 text-sm text-white/80 pl-2">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-rose-400 shrink-0 mt-0.5" />
                <span>Enabling audio playback, audio filters, and queue management in your server voice channels.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-rose-400 shrink-0 mt-0.5" />
                <span>Enforcing server safety rules via automod keyword filters, anti-spam, and moderation logging.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-rose-400 shrink-0 mt-0.5" />
                <span>Verifying guild permissions so only authorized server administrators can alter bot settings.</span>
              </li>
            </ul>
            <div className="p-4 rounded-xl bg-rose-500/[0.08] border border-rose-500/20 text-xs leading-relaxed text-rose-100">
              <strong>Zero Commercial Sale:</strong> We never sell, rent, monetize, or disclose your server records or personal information to third-party advertisers, data brokers, or marketing syndicates.
            </div>
          </section>

          {/* 3. Security & Architecture */}
          <section id="security" className="lucent-card rounded-[1.8rem] p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-400/15 text-rose-300 ring-1 ring-rose-400/20">
                <Lock size={20} />
              </span>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">3. Security & Architecture</h2>
                <p className="text-xs text-[var(--muted)]">Encryption in transit and restricted access</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-white/80">
              All dashboard transmissions are encrypted end-to-end using TLS/HTTPS. Internal databases (SQLite and MongoDB) are secured with restricted firewall rules, automated backups, and parameterized queries to prevent SQL and NoSQL injection vulnerabilities.
            </p>
          </section>

          {/* 4. OAuth2 & Identity */}
          <section id="oauth2" className="lucent-card rounded-[1.8rem] p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-400/15 text-rose-300 ring-1 ring-rose-400/20">
                <Key size={20} />
              </span>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">4. OAuth2 & Identity</h2>
                <p className="text-xs text-[var(--muted)]">Zero password storage</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-white/80">
              Uranium utilizes Discord's official OAuth2 protocol. We never see, request, or store your Discord password or 2FA authentication codes. Authentication happens entirely on Discord's encrypted domain, returning a cryptographic token scoped strictly to identify your username and server permissions.
            </p>
          </section>

          {/* 5. Cookies & Storage */}
          <section id="cookies" className="lucent-card rounded-[1.8rem] p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-400/15 text-rose-300 ring-1 ring-rose-400/20">
                <EyeOff size={20} />
              </span>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">5. Cookies & Storage</h2>
                <p className="text-xs text-[var(--muted)]">Strictly functional session management</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-white/80">
              Our web dashboard utilizes lightweight cookies and browser local storage strictly for functional session persistence (keeping you logged in and remembering your selected Discord server). We do not deploy third-party advertising or cross-site tracking trackers.
            </p>
          </section>

          {/* 6. Retention & Deletion */}
          <section id="retention" className="lucent-card rounded-[1.8rem] p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-400/15 text-rose-300 ring-1 ring-rose-400/20">
                <Trash2 size={20} />
              </span>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">6. Retention & Deletion</h2>
                <p className="text-xs text-[var(--muted)]">Full rights to delete your server data</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-white/80">
              Server configurations are retained as long as Uranium remains in your Discord community. If you remove Uranium from a server, associated configuration files may be automatically purged after a 30-day grace period.
            </p>
            <p className="text-sm leading-relaxed text-white/80">
              You have the right to request immediate and total deletion of all records associated with your User ID or Guild ID at any time. You can instantly exercise your right to erasure directly inside Discord using the <code className="px-1.5 py-0.5 rounded bg-white/10 text-rose-300 font-mono text-xs">/privacy delete-my-data</code> command, or purge server configurations via <code className="px-1.5 py-0.5 rounded bg-white/10 text-rose-300 font-mono text-xs">/privacy delete-server-data</code>. You may also contact our support team on Discord.
            </p>
          </section>

          {/* 7. Third-Party Disclosures */}
          <section id="third-party" className="lucent-card rounded-[1.8rem] p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-400/15 text-rose-300 ring-1 ring-rose-400/20">
                <ExternalLink size={20} />
              </span>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">7. Third-Party Disclosures</h2>
                <p className="text-xs text-[var(--muted)]">Connected API ecosystems</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-white/80">
              When using audio search or playback features, search queries may be transmitted to external media APIs (YouTube, Spotify, SoundCloud, or Lavalink). Please refer to their respective privacy policies for details on their data handling practices.
            </p>
          </section>

          {/* 8. Contact & Rights */}
          <section id="contact" className="lucent-card rounded-[1.8rem] p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-400/15 text-rose-300 ring-1 ring-rose-400/20">
                <MessageSquare size={20} />
              </span>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">8. Contact & Data Subject Requests</h2>
                <p className="text-xs text-[var(--muted)]">Submit Subject Access Requests (SAR) or questions</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-white/80">
              To submit a formal Data Subject Request, request deletion of your server audit trails, or discuss any privacy matters, connect with us through our official Discord server.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <a
                href="https://discord.gg/26ThFyckFX"
                target="_blank"
                rel="noopener noreferrer"
                className="lucent-button lucent-button-primary h-11 px-5 rounded-xl text-xs font-bold gap-2 text-white shadow-lg shadow-rose-500/20 transition hover:scale-[1.02]"
              >
                <MessageSquare size={15} />
                <span>Contact via Discord Support</span>
              </a>
              <Link
                href="/tos"
                className="lucent-button h-11 px-5 rounded-xl text-xs font-semibold gap-2 text-rose-200 hover:text-white transition"
              >
                <FileCheck size={15} />
                <span>Read Terms of Service</span>
              </Link>
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--quiet)]">
          <p>© 2026 Uranium Bot • Developed by SHM. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <Link href="/" className="hover:text-rose-300 transition-colors">Home</Link>
            <Link href="/tos" className="hover:text-rose-300 transition-colors">Terms of Service</Link>
            <Link href="/dashboard" className="hover:text-rose-300 transition-colors">Dashboard</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
