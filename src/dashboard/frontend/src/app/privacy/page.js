'use client';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#050505] text-white p-8 font-sans">
      <div className="max-w-4xl mx-auto pt-24">
        <Link href="/" className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-12 uppercase tracking-widest text-xs font-black">
          <ChevronLeft size={16} /> Back to Home
        </Link>
        <h1 className="text-6xl font-black mb-12 tracking-tighter">Privacy Policy</h1>
        <p className="text-white/40 mb-12 uppercase tracking-[3px] text-xs font-bold">Last Updated: May 11, 2026</p>
        
        <div className="space-y-16 text-white/70 leading-relaxed pb-32">
          <section>
            <h2 className="text-3xl font-black text-white mb-6 tracking-tight">1. Data We Collect</h2>
            <p>Uranium collects only the minimum amount of data necessary to provide its core services. This data includes:</p>
            <ul className="list-disc ml-8 mt-6 space-y-4 text-white/50">
              <li><strong>Discord Metadata:</strong> User IDs, Server IDs, Channel IDs, and Role IDs required for command execution and permission management.</li>
              <li><strong>Server Configurations:</strong> Custom settings you apply, such as moderation filters, welcome messages, and music preferences.</li>
              <li><strong>Interaction Logs:</strong> Temporary logs of commands executed to assist with troubleshooting and system optimization.</li>
              <li><strong>Dashboard Sessions:</strong> When using our website, we store your Discord ID and a temporary OAuth2 token to verify your identity.</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-3xl font-black text-white mb-6 tracking-tight">2. How We Use Your Data</h2>
            <p>Collected data is used strictly for the following purposes:</p>
            <ul className="list-disc ml-8 mt-6 space-y-4 text-white/50">
              <li>Facilitating bot features (e.g., moderation logging, music playback).</li>
              <li>Securing the dashboard and ensuring you only manage servers you have permissions for.</li>
              <li>Analyzing aggregated, non-identifiable usage statistics to improve Uranium's performance.</li>
            </ul>
            <p className="mt-6">We do <strong>not</strong> sell, trade, or share your personal information with third-party advertisers or data brokers.</p>
          </section>

          <section>
            <h2 className="text-3xl font-black text-white mb-6 tracking-tight">3. Data Security & Storage</h2>
            <p>We employ modern encryption and security protocols to protect your data. All database entries are stored on secure servers with restricted access. While we strive to protect your information, no method of electronic storage is 100% secure, and we cannot guarantee absolute security.</p>
          </section>

          <section>
            <h2 className="text-3xl font-black text-white mb-6 tracking-tight">4. OAuth2 & Authentication</h2>
            <p>Our dashboard uses Discord's official OAuth2 protocol. This means we never see or store your Discord password. The authentication process happens entirely on Discord's servers, and we only receive a cryptographic token to verify your identity.</p>
          </section>

          <section>
            <h2 className="text-3xl font-black text-white mb-6 tracking-tight">5. Cookies & Tracking</h2>
            <p>We use essential cookies and local storage to maintain your login session on uraniumbot.vercel.app. We do not use third-party tracking cookies for advertising purposes.</p>
          </section>

          <section>
            <h2 className="text-3xl font-black text-white mb-6 tracking-tight">6. Data Retention & Deletion</h2>
            <p>Data is retained as long as Uranium is a member of your Discord server. If Uranium is removed from a server, associated configuration data may be deleted automatically after a grace period. You may request immediate deletion of all data associated with your User ID or Server ID by contacting SHM via our support server.</p>
          </section>

          <section>
            <h2 className="text-3xl font-black text-white mb-6 tracking-tight">7. Third-Party API Disclosure</h2>
            <p>Uranium integrates with external services like YouTube and Spotify. Use of these features is subject to their respective privacy policies. We encourage you to review them to understand how they handle your data.</p>
          </section>

          <section>
            <h2 className="text-3xl font-black text-white mb-6 tracking-tight">8. Contact & Data Requests</h2>
            <p>For any questions regarding your privacy, or to submit a formal Data Access Request (SAR) or Deletion Request, please join our <a href="https://discord.gg/26ThFyckFX" className="text-red-500 hover:underline font-bold">Support Server</a> and contact the Lead Developer (SHM).</p>
          </section>
        </div>

        <footer className="border-t border-white/5 pt-12 text-center text-white/20 text-sm italic pb-12">
          Made with love by SHM ❤️
        </footer>
      </div>
    </div>
  );
}
