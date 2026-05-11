'use client';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#050505] text-white p-8 font-sans">
      <div className="max-w-4xl mx-auto pt-24">
        <Link href="/" className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-12 uppercase tracking-widest text-xs font-black">
          <ChevronLeft size={16} /> Back to Home
        </Link>
        <h1 className="text-6xl font-black mb-12 tracking-tighter">Terms of Service</h1>
        <p className="text-white/40 mb-12 uppercase tracking-[3px] text-xs font-bold">Last Updated: May 11, 2026</p>
        
        <div className="space-y-16 text-white/70 leading-relaxed pb-32">
          <section>
            <h2 className="text-3xl font-black text-white mb-6 tracking-tight">1. Agreement to Terms</h2>
            <p>By accessing or using the Uranium Discord Bot and its associated website (uraniumbot.vercel.app), you agree to be bound by these Terms of Service. These terms constitute a legally binding agreement between you and the Uranium Development Team (SHM). If you do not agree to these terms, you are prohibited from using the service and must remove the bot from your server immediately.</p>
          </section>
          
          <section>
            <h2 className="text-3xl font-black text-white mb-6 tracking-tight">2. Use License & Restrictions</h2>
            <p>Uranium grants you a limited, non-exclusive, non-transferable license to use the bot and dashboard for personal or community management purposes. You explicitly agree not to:</p>
            <ul className="list-disc ml-8 mt-6 space-y-4 text-white/50">
              <li>Use the bot to facilitate any form of illegal activity, harassment, or hate speech.</li>
              <li>Attempt to circumvent any rate limits, security measures, or paywalls (if applicable).</li>
              <li>Use automated scripts, crawlers, or "bots" to interact with the Uranium dashboard API.</li>
              <li>Impersonate Uranium staff or official support representatives.</li>
              <li>Redistribute, sell, or lease any part of the Uranium service or its underlying intellectual property.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-3xl font-black text-white mb-6 tracking-tight">3. Service Availability & Disclaimer</h2>
            <p>Uranium is provided on an "AS IS" and "AS AVAILABLE" basis. SHM makes no warranties, expressed or implied, regarding the reliability, uptime, or suitability of the bot for any particular purpose. We do not guarantee that the service will be uninterrupted, secure, or error-free. You use Uranium at your own risk.</p>
          </section>

          <section>
            <h2 className="text-3xl font-black text-white mb-6 tracking-tight">4. Limitation of Liability</h2>
            <p>In no event shall SHM or its contributors be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use Uranium, even if an authorized representative has been notified of the possibility of such damage.</p>
          </section>

          <section>
            <h2 className="text-3xl font-black text-white mb-6 tracking-tight">5. User Accountability</h2>
            <p>Server owners and administrators are responsible for how Uranium is configured within their communities. Any moderation actions, music playback, or configuration changes performed through Uranium are the sole responsibility of the user who initiated them.</p>
          </section>

          <section>
            <h2 className="text-3xl font-black text-white mb-6 tracking-tight">6. Third-Party Integrations</h2>
            <p>Uranium utilizes third-party APIs including Discord, YouTube, and Spotify. By using Uranium, you also agree to abide by the terms of service of these respective platforms. SHM is not responsible for any changes or service interruptions caused by these third parties.</p>
          </section>

          <section>
            <h2 className="text-3xl font-black text-white mb-6 tracking-tight">7. Modifications to Service</h2>
            <p>SHM reserves the right to modify, suspend, or discontinue any part of the Uranium service at any time without notice. We also reserve the right to update these Terms of Service. Continued use of Uranium after changes are posted signifies your acceptance of the updated terms.</p>
          </section>

          <section>
            <h2 className="text-3xl font-black text-white mb-6 tracking-tight">8. Governing Law</h2>
            <p>Any claim relating to Uranium shall be governed by the laws of the developer's jurisdiction without regard to its conflict of law provisions.</p>
          </section>

          <section>
            <h2 className="text-3xl font-black text-white mb-6 tracking-tight">9. Contact</h2>
            <p>Questions about the Terms of Service should be sent to us through the official <a href="https://discord.gg/26ThFyckFX" className="text-red-500 hover:underline font-bold">Support Server</a>.</p>
          </section>
        </div>
        
        <footer className="border-t border-white/5 pt-12 text-center text-white/20 text-sm italic pb-12">
          Made with love by SHM ❤️
        </footer>
      </div>
    </div>
  );
}
