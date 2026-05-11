'use client';
import { useStore } from '@/store';
import { useEffect } from 'react';
import { User, LogOut } from 'lucide-react';

export default function Header() {
  const { user } = useStore();


  const handleLogout = () => {
    window.location.href = '/auth/logout';
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-24 border-b border-white/5 bg-black/40 backdrop-blur-3xl z-40 px-6 md:px-12 flex items-center justify-between">
      <div />


      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4 group">
          <div className="hidden sm:block text-right">
            <div className="text-xs font-black tracking-tight leading-none mb-1">{user?.username || 'Resolving...'}</div>
            <div className="text-[10px] text-white/20 font-black uppercase tracking-widest text-right">System Operator</div>
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
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}
