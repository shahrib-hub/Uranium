'use client';

import { useEffect, useState } from 'react';
import { Check, Globe2, RefreshCw, Settings2, UserRound } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

const LANGUAGES = [
  ['en', 'English', '🇺🇸'], ['hi', 'Hindi', '🇮🇳'], ['bn', 'Bangla', '🇧🇩'], ['es', 'Spanish', '🇪🇸'],
  ['fr', 'French', '🇫🇷'], ['de', 'German', '🇩🇪'], ['ru', 'Russian', '🇷🇺'], ['ja', 'Japanese', '🇯🇵'],
  ['ko', 'Korean', '🇰🇷'], ['ar', 'Arabic', '🇸🇦'], ['pt', 'Portuguese', '🇵🇹'], ['it', 'Italian', '🇮🇹'],
  ['tr', 'Turkish', '🇹🇷'], ['pl', 'Polish', '🇵🇱'], ['vi', 'Vietnamese', '🇻🇳'], ['nl', 'Dutch', '🇳🇱']
];

export default function BotSettingsPage() {
  const guildId = useSearchParams().get('guild');
  const [language, setLanguage] = useState('en');
  const [nickname, setNickname] = useState('');
  const [username, setUsername] = useState('Uranium');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');

  const load = async () => {
    if (!guildId) return;
    setLoading(true);
    try {
      const [languageResponse, nicknameResponse] = await Promise.all([
        fetch('/api/guild/' + guildId + '/settings/language'),
        fetch('/api/guild/' + guildId + '/settings/nickname')
      ]);
      if (languageResponse.ok) { const data = await languageResponse.json(); setLanguage(data.botLanguage || 'en'); }
      if (nicknameResponse.ok) { const data = await nicknameResponse.json(); setNickname(data.nickname || ''); setUsername(data.username || 'Uranium'); }
      else if (nicknameResponse.status === 403) toast.error('You do not have permission to edit this server.');
    } catch { toast.error('Could not load these settings.'); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [guildId]);

  const saveLanguage = async (next) => {
    setSaving('language');
    try {
      const response = await fetch('/api/guild/' + guildId + '/settings/language', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ botLanguage: next }) });
      if (!response.ok) throw new Error();
      setLanguage(next); toast.success('Language saved.');
    } catch { toast.error('Could not save the language.'); } finally { setSaving(''); }
  };
  const saveNickname = async () => {
    setSaving('nickname');
    try {
      const response = await fetch('/api/guild/' + guildId + '/settings/nickname', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nickname }) });
      if (!response.ok) throw new Error();
      toast.success('Nickname saved.');
    } catch { toast.error('Could not save the nickname.'); } finally { setSaving(''); }
  };

  if (!guildId) return <div className="lucent-page grid min-h-[70vh] place-items-center"><div className="lucent-card rounded-[1.5rem] p-8 text-center"><Settings2 className="mx-auto text-rose-200" /><h1 className="mt-4 text-xl font-semibold">Choose a server first</h1><p className="mt-2 text-sm text-[var(--muted)]">Pick a server from the sidebar to edit its settings.</p></div></div>;

  return <div className="lucent-page mx-auto max-w-5xl"><div className="flex items-start justify-between gap-4"><div><p className="lucent-kicker mb-3">Bot settings</p><h1 className="lucent-title text-4xl sm:text-5xl">Make it feel at home.</h1><p className="lucent-subtitle mt-4">These changes only affect the selected server.</p></div><button onClick={load} className="lucent-button h-10 w-10 rounded-xl p-0" aria-label="Refresh"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button></div>
    <div className="mt-8 grid gap-5 md:grid-cols-2">
      <section className="lucent-card rounded-[1.5rem] p-6"><span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-400/15 text-rose-100"><UserRound size={19} /></span><h2 className="mt-5 text-lg font-semibold">Bot nickname</h2><p className="mt-1 text-sm leading-6 text-[var(--muted)]">Choose how {username} appears in this server.</p><input disabled={loading} className="lucent-input mt-6 px-4 py-3 disabled:opacity-50" value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder={username} /><button disabled={loading || saving === 'nickname'} onClick={saveNickname} className="lucent-button lucent-button-primary mt-3 h-11 w-full rounded-xl text-sm font-semibold disabled:opacity-50">{saving === 'nickname' ? 'Saving…' : <><Check size={16} /> Save nickname</>}</button></section>
      <section className="lucent-card rounded-[1.5rem] p-6"><span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-400/15 text-rose-100"><Globe2 size={19} /></span><h2 className="mt-5 text-lg font-semibold">Language</h2><p className="mt-1 text-sm leading-6 text-[var(--muted)]">Choose the language this server uses for the bot.</p><select disabled={loading || saving === 'language'} className="lucent-input mt-6 px-4 py-3 disabled:opacity-50" value={language} onChange={(event) => saveLanguage(event.target.value)}>{LANGUAGES.map(([code, name, flag]) => <option key={code} value={code}>{flag} {name}</option>)}</select><p className="mt-3 text-xs text-[var(--quiet)]">{saving === 'language' ? 'Saving language…' : 'Changes are saved right away.'}</p></section>
    </div>
  </div>;
}
