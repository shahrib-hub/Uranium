'use client';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Toaster } from 'sonner';
import { useSearchParams, usePathname } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { connectSocket } from '@/socket';
import { useStore } from '@/store';

function LayoutContent({ children }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { player, setPlayer } = useStore();
  
  // Get Guild ID from URL or Store (URL takes precedence)
  const urlGuildId = searchParams.get('guild');
  const effectiveGuildId = urlGuildId; // Do not fallback to store for effective sync to avoid stickiness

  useEffect(() => {
    if (effectiveGuildId) {
      // Connect/reconnect socket
      connectSocket(effectiveGuildId);

      // Force Sync Function: Manual check-in with bot every 3 seconds
      const forceSync = async () => {
        try {
          const res = await fetch(`/api/guild/${effectiveGuildId}/player`);
          const data = await res.json();
          if (data && data.active !== undefined) {
             setPlayer(data);
          }
        } catch (e) {
          console.error('[SYNC] Sync failed:', e);
        }
      };

      forceSync();
      const interval = setInterval(forceSync, 3000); // More frequent sync (3s)
      return () => clearInterval(interval);
    }
  }, [effectiveGuildId]);

  const showSidebar = pathname.startsWith('/dashboard') || pathname.startsWith('/commands');

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden">
      {showSidebar && <Sidebar />}
      <div className="flex-1 flex flex-col bg-[#050505]">
        {showSidebar && <Header />}
        <main className={`flex-1 ${showSidebar ? 'pt-24' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Suspense>
          <LayoutContent>{children}</LayoutContent>
        </Suspense>
        <Toaster theme="dark" richColors position="top-right" />
      </body>
    </html>
  );
}
