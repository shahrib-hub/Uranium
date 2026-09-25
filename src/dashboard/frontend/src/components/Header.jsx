'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Crown, Bell, LogOut, UserRound, Menu, X, Zap, Server, AlertTriangle, Info, CheckCheck, Trash2, ExternalLink } from 'lucide-react';
import { useStore } from '@/store';

export default function Header() {
  const { user, sidebarOpen, setSidebarOpen } = useStore();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [readNotifIds, setReadNotifIds] = useState([]);
  const [selectedNotif, setSelectedNotif] = useState(null);

  const searchParams = useSearchParams();
  const guildId = searchParams.get('guild');
  const premiumHref = guildId ? `/dashboard/premium?guild=${guildId}` : '/dashboard/premium';

  // Load read notification IDs from localStorage
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('uranium_read_notifs') || '[]');
      if (Array.isArray(stored)) setReadNotifIds(stored);
    } catch {}
  }, []);

  // Fetch active notifications from server
  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(Array.isArray(data) ? data : []);
      }
    } catch {
      // Fallback empty
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = (id) => {
    setReadNotifIds((prev) => {
      if (prev.includes(id)) return prev;
      const updated = [...prev, id];
      try {
        localStorage.setItem('uranium_read_notifs', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const markAllAsRead = () => {
    const allIds = notifications.map((n) => n.id);
    setReadNotifIds(allIds);
    try {
      localStorage.setItem('uranium_read_notifs', JSON.stringify(allIds));
    } catch {}
  };

  const handleDeleteNotif = async (id, e) => {
    e.stopPropagation();
    try {
      await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (selectedNotif?.id === id) setSelectedNotif(null);
    } catch {}
  };

  const unreadCount = notifications.filter((n) => !readNotifIds.includes(n.id)).length;

  const formatDaysLeft = (expiresAt) => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const days = Math.ceil(diff / (24 * 60 * 60 * 1000));
    return `${days} ${days === 1 ? 'day' : 'days'} left`;
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-14 bg-[#111218] border-b border-[#1e202c] px-3 sm:px-6 flex items-center justify-between">
      {/* Left: Mobile menu toggle + Uranium Brand */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition"
          aria-label="Toggle navigation"
        >
          {sidebarOpen ? <X size={19} /> : <Menu size={19} />}
        </button>

        <Link href="/" className="flex items-center gap-2 group">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-tr from-rose-600 to-red-500 text-white shadow-md shadow-rose-600/20 group-hover:scale-105 transition">
            <Zap size={16} fill="currentColor" />
          </span>
          <span className="text-sm sm:text-base font-black text-white tracking-tight">
            Uranium
          </span>
        </Link>
      </div>

      {/* Right: Upgrade to Premium + Notifications + User Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Upgrade to Premium Button */}
        <Link
          href={premiumHref}
          className="inline-flex items-center gap-1.5 h-8 px-2 sm:px-3 rounded-lg bg-[#252014] hover:bg-[#322a19] border border-[#52411e] text-[11px] sm:text-xs font-bold text-amber-300 transition-all shadow-sm active:scale-95"
        >
          <Crown size={13} className="fill-amber-400 text-amber-400 shrink-0" />
          <span className="hidden xs:inline">
            <span className="hidden sm:inline">Upgrade to </span>Premium
          </span>
        </Link>

        {/* Real-Use Notification Panel */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setNotifOpen(!notifOpen);
              setProfileOpen(false);
            }}
            className="relative h-8 w-8 rounded-lg text-white/70 hover:text-white hover:bg-white/5 flex items-center justify-center transition"
            aria-label="Notifications"
            title="System Notifications"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white shadow-md shadow-rose-500/50 animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown Popover */}
          {notifOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 sm:right-0 mt-2 w-[calc(100vw-24px)] xs:w-80 sm:w-96 rounded-2xl bg-[#141520] border border-[#26283b] shadow-2xl z-50 text-xs overflow-hidden max-h-[85vh] flex flex-col">
                {/* Popover Header */}
                <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-[#11121c]">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllAsRead}
                      className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1 transition"
                    >
                      <CheckCheck size={13} />
                      <span>Mark read</span>
                    </button>
                  )}
                </div>

                {/* Notifications List */}
                <div className="overflow-y-auto p-2 space-y-2 max-h-[380px]">
                  {notifications.length > 0 ? (
                    notifications.map((notif) => {
                      const isRead = readNotifIds.includes(notif.id);
                      const isWarning = notif.type === 'warning' || notif.badge?.toLowerCase().includes('migration');
                      const timeLeft = formatDaysLeft(notif.expiresAt);

                      return (
                        <div
                          key={notif.id}
                          onClick={() => {
                            markAsRead(notif.id);
                            setSelectedNotif(selectedNotif?.id === notif.id ? null : notif);
                          }}
                          className={`p-3 rounded-xl border transition-all cursor-pointer relative group ${
                            isRead
                              ? 'bg-[#181926]/50 border-white/5 opacity-75 hover:opacity-100 hover:bg-[#181926]'
                              : isWarning
                              ? 'bg-amber-500/[0.08] border-amber-500/30 hover:bg-amber-500/[0.12]'
                              : 'bg-rose-500/[0.08] border-rose-500/30 hover:bg-rose-500/[0.12]'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <span
                              className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                                isWarning ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'
                              }`}
                            >
                              {isWarning ? <AlertTriangle size={15} /> : <Info size={15} />}
                            </span>

                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300/90 truncate">
                                  {notif.badge || 'Notice'}
                                </span>
                                {timeLeft && (
                                  <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-black/40 text-white/50 shrink-0">
                                    {timeLeft}
                                  </span>
                                )}
                              </div>

                              <p className={`font-bold leading-tight ${isRead ? 'text-white/80' : 'text-white'}`}>
                                {notif.title}
                              </p>

                              <p className="text-white/60 text-[11px] leading-relaxed line-clamp-2">
                                {notif.message}
                              </p>

                              {/* Expanded details when clicked */}
                              {selectedNotif?.id === notif.id && (
                                <div className="mt-2 pt-2 border-t border-white/10 space-y-2">
                                  <p className="text-white/80 text-xs leading-relaxed whitespace-pre-wrap">
                                    {notif.message}
                                  </p>

                                  <div className="flex items-center justify-between pt-1">
                                    {notif.link ? (
                                      <Link
                                        href={notif.link}
                                        onClick={() => setNotifOpen(false)}
                                        className="text-rose-400 hover:text-rose-300 text-xs font-semibold flex items-center gap-1 transition"
                                      >
                                        <span>{notif.linkText || 'Learn More'}</span>
                                        <ExternalLink size={12} />
                                      </Link>
                                    ) : <div />}

                                    <button
                                      type="button"
                                      onClick={(e) => handleDeleteNotif(notif.id, e)}
                                      className="text-white/40 hover:text-rose-400 text-[11px] flex items-center gap-1 transition"
                                      title="Dismiss notification"
                                    >
                                      <Trash2 size={12} />
                                      <span>Dismiss</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-8 text-center text-white/40 space-y-1">
                      <p className="text-xs font-semibold">No new notifications</p>
                      <p className="text-[10px] text-white/30">You are all caught up!</p>
                    </div>
                  )}
                </div>

                {/* Popover Footer: Live Status Page Link */}
                <div className="p-2.5 border-t border-white/5 bg-[#10111a] flex items-center justify-between text-[11px]">
                  <Link
                    href="/status"
                    onClick={() => setNotifOpen(false)}
                    className="text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1.5"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>View Live Status Page</span>
                  </Link>
                  <span className="text-white/30 text-[10px]">Uranium Watcher</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setProfileOpen(!profileOpen);
              setNotifOpen(false);
            }}
            className="flex items-center gap-1.5 p-1 rounded-full hover:ring-2 hover:ring-white/10 transition"
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                className="h-8 w-8 rounded-full object-cover border border-white/10"
              />
            ) : (
              <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white/70">
                <UserRound size={16} />
              </span>
            )}
          </button>

          {profileOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
              <div className="absolute right-0 mt-2 w-52 rounded-xl bg-[#181923] border border-[#262838] p-1.5 shadow-2xl z-50 text-xs">
                <div className="px-3 py-2 border-b border-white/5">
                  <p className="font-bold text-white truncate">{user?.username || 'Authenticated User'}</p>
                  <p className="text-[11px] text-white/40 truncate">Discord Connected</p>
                </div>
                <div className="py-1">
                  <Link
                    href="/servers"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition"
                  >
                    <Server size={14} />
                    <span>Switch Server</span>
                  </Link>
                  <Link
                    href="/status"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>System Status</span>
                  </Link>
                  <a
                    href="https://discord.gg/26ThFyckFX"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-amber-300 hover:bg-amber-500/10 transition"
                  >
                    <Crown size={14} className="fill-amber-400 text-amber-400" />
                    <span>Get Premium</span>
                  </a>
                </div>
                <div className="pt-1 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = '/auth/logout';
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition"
                  >
                    <LogOut size={14} />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
