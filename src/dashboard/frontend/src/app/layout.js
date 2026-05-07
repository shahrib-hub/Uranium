'use client';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useSearchParams, usePathname } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { connectSocket } from '@/socket';

function LayoutContent({ children }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const guildId = searchParams.get('guild');

  useEffect(() => {
    if (guildId) connectSocket(guildId);
  }, [guildId]);

  const showSidebar = pathname.startsWith('/dashboard') || pathname.startsWith('/commands');

  return (
    <div className="flex min-h-screen w-full">
      {showSidebar && <Sidebar />}
      <div className="flex-1 flex flex-col bg-gradient-to-br from-[#050505] to-[#0a0505]">
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
      </body>
    </html>
  );
}
