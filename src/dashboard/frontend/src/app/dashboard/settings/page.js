'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Settings, RefreshCw, Globe } from 'lucide-react';
import { toast } from 'sonner';

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'bn', name: 'Bangla', flag: '🇧🇩' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱' },
  { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' }
];

export default function BotSettingsPage() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get('guild');

  const [botLanguage, setBotLanguage] = useState('en');
  const [botNickname, setBotNickname] = useState('');
  const [botUsername, setBotUsername] = useState('Uranium');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingLang, setIsSavingLang] = useState(false);
  const [isSavingNick, setIsSavingNick] = useState(false);

  useEffect(() => {
    if (guildId) {
      fetchSettings();
    }
  }, [guildId]);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const [langRes, nickRes] = await Promise.all([
        fetch(`/api/guild/${guildId}/settings/language`),
        fetch(`/api/guild/${guildId}/settings/nickname`)
      ]);
      
      const langData = await langRes.json();
      const nickData = await nickRes.json();

      if (langRes.ok && langData.botLanguage) {
        setBotLanguage(langData.botLanguage);
      }
      
      if (nickRes.ok) {
        setBotNickname(nickData.nickname || '');
        setBotUsername(nickData.username || 'Uranium');
      } else if (nickRes.status === 403) {
        toast.error('You do not have permission to view or edit settings for this server.');
      }
    } catch (err) {
      toast.error('Failed to load bot settings');
    } finally {
      setIsLoading(false);
    }
  };

  const saveLanguage = async (lang) => {
    setIsSavingLang(true);
    try {
      const res = await fetch(`/api/guild/${guildId}/settings/language`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botLanguage: lang })
      });
      const data = await res.json();
      if (res.ok) {
        setBotLanguage(lang);
        toast.success(`Language updated to ${LANGUAGES.find(l => l.code === lang)?.name}`);
      } else {
        toast.error(data.error || 'Failed to update language');
      }
    } catch (err) {
      toast.error('Failed to update language');
    } finally {
      setIsSavingLang(false);
    }
  };

  const saveNickname = async () => {
    setIsSavingNick(true);
    try {
      const res = await fetch(`/api/guild/${guildId}/settings/nickname`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: botNickname })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Nickname updated successfully`);
      } else {
        toast.error(data.error || 'Failed to update nickname');
      }
    } catch (err) {
      toast.error('Failed to update nickname');
    } finally {
      setIsSavingNick(false);
    }
  };

  const handleRefresh = () => {
    fetchSettings();
  };

  if (!guildId) {
    return (
      <div className="min-h-screen p-6 pt-24 lg:pt-6 flex flex-col items-center justify-center">
        <Settings size={48} className="text-white/10 mb-4" />
        <h2 className="text-xl font-bold text-white/40">Select a server</h2>
        <p className="text-sm text-white/20 mt-2">Please select a server to manage Bot Settings.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 pt-24 lg:pt-6 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2 relative">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <Settings className="text-purple-500" />
            Bot Settings
          </h1>
          <button 
            onClick={handleRefresh}
            disabled={isLoading || isSavingLang || isSavingNick}
            className="p-3 bg-white/5 hover:bg-purple-500 hover:text-black rounded-xl transition-all duration-300 disabled:opacity-50"
            title="Refresh Settings"
          >
            <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
        <p className="text-white/40 font-medium">Configure global bot preferences for your server.</p>
      </div>

      <div className="bg-[#0A0A0A] border border-white/5 rounded-3xl p-6 relative overflow-hidden group hover:border-purple-500/30 transition-all duration-500 space-y-10">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Globe size={120} />
        </div>
        
        <div className="relative z-10">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white mb-2">Bot Nickname</h2>
            <p className="text-sm text-white/40">Change {botUsername}&apos;s display name specifically for this server.</p>
          </div>

          <div className="max-w-md flex gap-3">
            {isLoading ? (
              <div className="h-12 w-full bg-white/5 rounded-xl animate-pulse"></div>
            ) : (
              <>
                <input
                  type="text"
                  placeholder={botUsername}
                  value={botNickname}
                  onChange={(e) => setBotNickname(e.target.value)}
                  disabled={isSavingNick}
                  className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all disabled:opacity-50"
                />
                <button
                  onClick={saveNickname}
                  disabled={isSavingNick || isLoading}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all disabled:opacity-50 whitespace-nowrap"
                >
                  {isSavingNick ? 'Saving...' : 'Save'}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="w-full h-px bg-white/5"></div>

        <div className="relative z-10">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white mb-2">Bot Language</h2>
            <p className="text-sm text-white/40">Change the default language of {botUsername} in your server.</p>
          </div>

          <div className="max-w-md">
            {isLoading ? (
              <div className="h-12 bg-white/5 rounded-xl animate-pulse"></div>
            ) : (
              <select
                value={botLanguage}
                onChange={(e) => saveLanguage(e.target.value)}
                disabled={isSavingLang}
                className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all appearance-none cursor-pointer disabled:opacity-50"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='rgba(255, 255, 255, 0.4)'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.2em' }}
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
            )}
            {isSavingLang && <p className="text-xs text-purple-500 mt-2 font-medium">Saving preferences...</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
