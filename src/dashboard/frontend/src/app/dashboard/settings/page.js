'use client';

import { useEffect, useState } from 'react';
import { Check, Globe2, RefreshCw, RotateCcw, Settings2, UserRound } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import CustomSelect from '@/components/CustomSelect';
import ConfirmModal from '@/components/ConfirmModal';

const LANGUAGES = [
  { value: 'en', label: 'English', icon: '🇺🇸', description: 'Default language' },
  { value: 'hi', label: 'Hindi', icon: '🇮🇳', description: 'हिंदी' },
  { value: 'bn', label: 'Bangla', icon: '🇧🇩', description: 'বাংলা' },
  { value: 'es', label: 'Spanish', icon: '🇪🇸', description: 'Español' },
  { value: 'fr', label: 'French', icon: '🇫🇷', description: 'Français' },
  { value: 'de', label: 'German', icon: '🇩🇪', description: 'Deutsch' },
  { value: 'ru', label: 'Russian', icon: '🇷🇺', description: 'Русский' },
  { value: 'ja', label: 'Japanese', icon: '🇯🇵', description: '日本語' },
  { value: 'ko', label: 'Korean', icon: '🇰🇷', description: '한국어' },
  { value: 'ar', label: 'Arabic', icon: '🇸🇦', description: 'العربية' },
  { value: 'pt', label: 'Portuguese', icon: '🇵🇹', description: 'Português' },
  { value: 'it', label: 'Italian', icon: '🇮🇹', description: 'Italiano' },
  { value: 'tr', label: 'Turkish', icon: '🇹🇷', description: 'Türkçe' },
  { value: 'pl', label: 'Polish', icon: '🇵🇱', description: 'Polski' },
  { value: 'vi', label: 'Vietnamese', icon: '🇻🇳', description: 'Tiếng Việt' },
  { value: 'nl', label: 'Dutch', icon: '🇳🇱', description: 'Nederlands' }
];

export default function BotSettingsPage() {
  const guildId = useSearchParams().get('guild');
  const [language, setLanguage] = useState('en');
  const [nickname, setNickname] = useState('');
  const [username, setUsername] = useState('Uranium');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [resetModalOpen, setResetModalOpen] = useState(false);

  const load = async () => {
    if (!guildId) return;
    setLoading(true);
    try {
      const [languageResponse, nicknameResponse] = await Promise.all([
        fetch('/api/guild/' + guildId + '/settings/language'),
        fetch('/api/guild/' + guildId + '/settings/nickname')
      ]);
      if (languageResponse.ok) {
        const data = await languageResponse.json();
        setLanguage(data.botLanguage || 'en');
      }
      if (nicknameResponse.ok) {
        const data = await nicknameResponse.json();
        setNickname(data.nickname || '');
        setUsername(data.username || 'Uranium');
      } else if (nicknameResponse.status === 403) {
        toast.error('You do not have permission to edit this server.');
      }
    } catch {
      toast.error('Could not load these settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [guildId]);

  const saveLanguage = async (next) => {
    setSaving('language');
    try {
      const response = await fetch('/api/guild/' + guildId + '/settings/language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botLanguage: next })
      });
      if (!response.ok) throw new Error();
      setLanguage(next);
      toast.success('Bot language saved successfully.');
    } catch {
      toast.error('Could not save the language.');
    } finally {
      setSaving('');
    }
  };

  const saveNickname = async () => {
    setSaving('nickname');
    try {
      const response = await fetch('/api/guild/' + guildId + '/settings/nickname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname })
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update nickname');
      }
      toast.success('Nickname updated successfully.');
    } catch (err) {
      toast.error(err.message || 'Could not save the nickname.');
    } finally {
      setSaving('');
    }
  };

  const resetNickname = async () => {
    setNickname('');
    setSaving('nickname');
    try {
      const response = await fetch('/api/guild/' + guildId + '/settings/nickname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: '' })
      });
      if (!response.ok) throw new Error();
      toast.success('Nickname reset to default.');
    } catch {
      toast.error('Could not reset the nickname.');
    } finally {
      setSaving('');
    }
  };

  if (!guildId) {
    return (
      <div className="lucent-page grid min-h-[70vh] place-items-center">
        <div className="lucent-card max-w-md rounded-[1.8rem] p-8 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-400/15 text-rose-200 ring-1 ring-rose-400/20">
            <Settings2 size={28} />
          </span>
          <h1 className="mt-5 text-xl font-bold tracking-tight text-white">Choose a server first</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Pick a server from the sidebar to customize its bot settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="lucent-page mx-auto max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <p className="lucent-kicker mb-2">Bot settings</p>
          <h1 className="lucent-title text-3xl sm:text-5xl">Make it feel at home.</h1>
          <p className="lucent-subtitle mt-3 text-sm sm:text-base">
            Configure how Uranium identifies and communicates in this server.
          </p>
        </div>
        <button
          onClick={load}
          className="lucent-button h-11 w-11 shrink-0 rounded-2xl p-0 self-start"
          aria-label="Refresh settings"
        >
          <RefreshCw size={17} className={loading ? 'animate-spin text-rose-300' : ''} />
        </button>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {/* Nickname Section */}
        <section className="lucent-card flex flex-col justify-between rounded-[1.8rem] p-6 sm:p-7">
          <div>
            <div className="flex items-center justify-between">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-rose-400/15 text-rose-100 ring-1 ring-rose-400/20">
                <UserRound size={20} />
              </span>
              {nickname && (
                <button
                  type="button"
                  onClick={() => setResetModalOpen(true)}
                  disabled={loading || saving === 'nickname'}
                  className="flex items-center gap-1.5 text-xs text-[var(--quiet)] hover:text-rose-300 transition"
                >
                  <RotateCcw size={12} /> Reset to default
                </button>
              )}
            </div>
            <h2 className="mt-5 text-lg font-bold text-white">Server Nickname</h2>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
              Choose the nickname {username} uses inside this server. Leave blank to use default.
            </p>
            <div className="mt-6 space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--quiet)] ml-1">
                Display Name
              </label>
              <input
                disabled={loading}
                className="lucent-input px-4 py-3.5 text-sm font-medium disabled:opacity-50"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                placeholder={username}
                maxLength={32}
              />
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10">
            <button
              disabled={loading || saving === 'nickname'}
              onClick={saveNickname}
              className="lucent-button lucent-button-primary h-12 w-full rounded-2xl text-sm font-semibold disabled:opacity-50"
            >
              {saving === 'nickname' ? (
                'Saving…'
              ) : (
                <>
                  <Check size={16} /> Save nickname
                </>
              )}
            </button>
          </div>
        </section>

        {/* Language Section */}
        <section className="lucent-card flex flex-col justify-between rounded-[1.8rem] p-6 sm:p-7">
          <div>
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-rose-400/15 text-rose-100 ring-1 ring-rose-400/20">
              <Globe2 size={20} />
            </span>
            <h2 className="mt-5 text-lg font-bold text-white">Server Language</h2>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
              Choose the primary language Uranium uses for responses and embeds in this server.
            </p>

            <div className="mt-6">
              <CustomSelect
                label="Selected Language"
                value={language}
                onChange={(val) => saveLanguage(val)}
                options={LANGUAGES}
                disabled={loading || saving === 'language'}
                searchable
              />
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-[var(--quiet)]">
            <span>Changes persist immediately</span>
            {saving === 'language' && <span className="text-rose-300 font-semibold animate-pulse">Saving…</span>}
          </div>
        </section>
      </div>

      {/* Confirmation Modal for Resetting Nickname */}
      <ConfirmModal
        isOpen={resetModalOpen}
        title="Reset Nickname"
        message={`Are you sure you want to reset the bot's nickname back to "${username}"?`}
        onConfirm={resetNickname}
        onCancel={() => setResetModalOpen(false)}
      />
    </div>
  );
}

