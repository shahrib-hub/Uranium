'use client';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#050505] text-white p-8">
      <div className="max-w-4xl mx-auto pt-24">
        <Link href="/" className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-12 uppercase tracking-widest text-xs font-black">
          <ChevronLeft size={16} /> Back to Home
        </Link>
        <h1 className="text-5xl font-black mb-12">Privacy Policy</h1>
        <div className="space-y-12 text-white/70 leading-relaxed pb-32">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Data Collection</h2>
            <p>Uranium only collects data essential for its operation. This includes:</p>
            <ul className="list-disc ml-6 mt-4 space-y-2">
              <li><strong>Discord Identifiers:</strong> User IDs, Guild IDs, and Role IDs for permission checks.</li>
              <li><strong>Configuration Settings:</strong> Custom prefixes, moderation logs, and music preferences.</li>
              <li><strong>Usage Data:</strong> Basic statistics on command usage to improve bot performance.</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Data Usage & Security</h2>
            <p>Your data is used solely to provide and improve Uranium's features. We implement industry-standard security measures to protect your information. We will never sell or share your data with third parties for commercial gain.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Data Retention & Deletion</h2>
            <p>We store data as long as the bot is active in your server. If you remove Uranium, your server configuration may be archived for a limited period before being permanently deleted. You can request immediate data removal by contacting SHM through our support server.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Dashboard & OAuth2</h2>
            <p>Our dashboard uses Discord's official OAuth2 system. We do not see your password. We only receive a temporary token that allows us to verify which servers you manage so you can configure them through our web interface.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Cookies & Local Storage</h2>
            <p>The Uranium dashboard uses session cookies and local storage to keep you logged in and remember your preferences. These are essential for the web interface to function properly.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Third-Party Services</h2>
            <p>Uranium interacts with Discord's API and may use YouTube or Spotify APIs for music search results. These services have their own privacy policies which you should review.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. Changes to Policy</h2>
            <p>We reserve the right to update this privacy policy at any time. Continued use of the bot or dashboard signifies your agreement to any changes.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">8. Contact Information</h2>
            <p>If you have any questions about your privacy or data, please join our <a href="https://discord.gg/26ThFyckFX" className="text-red-500 hover:underline">Support Server</a> and speak with the developer (SHM).</p>
          </section>
        </div>

        <footer className="border-t border-white/5 pt-12 text-center text-white/20 text-sm italic">
          Made with love by SHM ❤️
        </footer>
      </div>
    </div>
  );
}
