'use client';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#050505] text-white p-8">
      <div className="max-w-4xl mx-auto pt-24">
        <Link href="/" className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-12 uppercase tracking-widest text-xs font-black">
          <ChevronLeft size={16} /> Back to Home
        </Link>
        <h1 className="text-5xl font-black mb-12">Terms of Service</h1>
        <div className="space-y-12 text-white/70 leading-relaxed pb-32">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
            <p>By inviting Uranium to your Discord server or using our dashboard at uraniumbot.vercel.app, you agree to these Terms of Service. These terms constitute a legally binding agreement between you and the Uranium development team (SHM).</p>
          </section>
          
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Service Usage & Restrictions</h2>
            <p>Uranium provides moderation, music, and utility features. You agree not to:</p>
            <ul className="list-disc ml-6 mt-4 space-y-2">
              <li>Abuse bot features to harass or disrupt Discord communities.</li>
              <li>Attempt to reverse engineer, decompile, or bypass any security features of the bot or dashboard.</li>
              <li>Use the bot for illegal purposes or in violation of Discord's Terms of Service and Developer Guidelines.</li>
              <li>Automate requests to the Uranium API outside of provided bot interactions.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Uptime, Availability & Liability</h2>
            <p>While we strive for 100% uptime, Uranium is provided "as is" and "as available". SHM is not liable for any damages, data loss, or service interruptions. We reserve the right to modify or terminate the service at any time without prior notice.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. User Content & Responsibilities</h2>
            <p>You are solely responsible for the content, configurations, and settings applied to your server. SHM does not monitor all server activities but reserves the right to blacklist servers or users who violate these terms.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Intellectual Property</h2>
            <p>The Uranium name, logo, and codebase are the property of SHM. You may not use our branding without explicit permission.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Indemnification</h2>
            <p>You agree to indemnify and hold SHM harmless from any claims, losses, or damages arising out of your use of Uranium or your violation of these terms.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. Termination</h2>
            <p>We may suspend or terminate your access to Uranium at our discretion, especially in cases of repeated policy violations or abuse of our systems.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">8. Contact & Support</h2>
            <p>For any questions regarding these terms, please join our official <a href="https://discord.gg/26ThFyckFX" className="text-red-500 hover:underline">Support Server</a>.</p>
          </section>
        </div>
        
        <footer className="border-t border-white/5 pt-12 text-center text-white/20 text-sm italic">
          Made with love by SHM ❤️
        </footer>
      </div>
    </div>
  );
}
