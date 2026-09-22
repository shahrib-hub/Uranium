'use client';

import './globals.css';
import { Suspense, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Toaster } from 'sonner';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { connectSocket } from '@/socket';
import { useStore } from '@/store';

function AppShell({ children }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setPlayer, setUser } = useStore();
  const guildId = searchParams.get('guild');
  const isFullMusicPlayer = pathname === '/dashboard/music/player' || pathname.startsWith('/dashboard/music/player');
  const dashboardArea = (pathname.startsWith('/dashboard') || pathname.startsWith('/commands')) && !isFullMusicPlayer;

  useEffect(() => {
    fetch('/api/me').then((response) => {
      if (response.ok) return response.json();
      const isPublicRoute = 
        pathname === '/' || 
        pathname.startsWith('/auth') || 
        pathname.startsWith('/tos') || 
        pathname.startsWith('/privacy') || 
        pathname.startsWith('/commands');
      if (!isPublicRoute) {
        window.location.href = '/auth/login?next=' + encodeURIComponent(window.location.pathname + window.location.search);
      }
      return null;
    }).then((user) => user?.id && setUser(user)).catch(() => null);
  }, [pathname, setUser]);

  useEffect(() => {
    if (!guildId) return;
    connectSocket(guildId);
    const syncPlayer = () => {
      fetch('/api/guild/' + guildId + '/player').then((response) => response.ok ? response.json() : null).then((data) => {
        if (data?.active !== undefined) setPlayer(data);
      }).catch(() => null);
    };
    syncPlayer();
    const interval = window.setInterval(syncPlayer, 3000);
    return () => window.clearInterval(interval);
  }, [guildId, setPlayer]);

  return (
    <div className="min-h-screen bg-[#0e0f15] text-[#f3f4f6]">
      {dashboardArea && <Header />}
      {dashboardArea && <Sidebar />}
      <main className={dashboardArea ? 'min-h-screen pt-14 lg:pl-64 bg-[#0e0f15]' : 'min-h-screen bg-[#0e0f15]'}>
        {children}
      </main>
    </div>
  );
}

export default function RootLayout({ children }) {
  return <html lang="en"><body><Suspense><AppShell>{children}</AppShell></Suspense><Toaster theme="dark" richColors position="top-right" /></body></html>;
}
