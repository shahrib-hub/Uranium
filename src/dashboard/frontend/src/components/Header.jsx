'use client';
import { useStore } from '@/store';
import { useEffect } from 'react';
import { User, LogOut } from 'lucide-react';

export default function Header() {
  const { user, setUser } = useStore();

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setUser(data);
      })
      .catch(e => console.error(e));
  }, []);

  const handleLogout = () => {
    window.location.href = '/auth/logout';
  };

  return (
    <header className="fixed top-0 left-80 right-0 h-24 border-b border-white/5 bg-black/40 backdrop-blur-3xl z-40 px-12 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]" />
        <span className="text-[10px] font-black uppercase tracking-[3px] text-white/40">Realtime Sync Active</span>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4 group">
          <div className="text-right">
            <div className="text-xs font-black tracking-tight">{user?.username || 'Resolving...'}</div>
            <div className="text-[10px] text-white/20 font-black uppercase tracking-widest text-right">Operator Node</div>
          </div>
          <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white/5 border border-white/10 group-hover:border-red-500/50 transition-all shadow-2xl">
            {user?.avatarUrl ? (
              <img 
                src={user.avatarUrl} 
                className="w-full h-full object-cover" 
                alt="" 
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-red-500/10 text-red-500">
                <User size={20} />
              </div>
            )}
          </div>
        </div>

        <div className="h-10 w-px bg-white/5" />

        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-red-500/50 hover:bg-red-500/10 transition-all group text-[10px] font-black uppercase tracking-widest"
        >
          <LogOut size={14} className="text-white/40 group-hover:text-red-500 transition-colors" />
          <span>Exit Node</span>
        </button>
      </div>
    </header>
  );
}
