'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Crown,
  Sparkles,
  Lock,
  Save,
  RotateCcw,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  Bot
} from 'lucide-react';
import { toast } from 'sonner';

export default function BotPersonalizerPage() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get('guild');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [botUser, setBotUser] = useState({
    username: 'Uranium',
    tag: 'Uranium#0000',
    defaultAvatarUrl: 'https://cdn.discordapp.com/embed/avatars/0.png'
  });

  // Form states
  const [nickname, setNickname] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [bio, setBio] = useState('');

  // Initial loaded states for change tracking
  const [initialData, setInitialData] = useState({
    nickname: '',
    avatarUrl: '',
    bannerUrl: '',
    bio: ''
  });

  const [avatarError, setAvatarError] = useState(false);
  const [bannerError, setBannerError] = useState(false);

  useEffect(() => {
    if (!guildId) return;
    loadPersonalization();
  }, [guildId]);

  const loadPersonalization = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/guild/${guildId}/personalization`);
      if (!res.ok) {
        throw new Error('Failed to load bot personalization');
      }
      const data = await res.json();
      setIsPremium(!!data.isPremium);

      if (data.botUser) {
        setBotUser(data.botUser);
      }

      const pers = data.personalization || {};
      const loaded = {
        nickname: pers.nickname || '',
        avatarUrl: pers.avatarUrl || '',
        bannerUrl: pers.bannerUrl || '',
        bio: pers.bio || ''
      };

      setNickname(loaded.nickname);
      setAvatarUrl(loaded.avatarUrl);
      setBannerUrl(loaded.bannerUrl);
      setBio(loaded.bio);
      setInitialData(loaded);
    } catch (err) {
      console.error(err);
      toast.error('Could not load personalization data for this server.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!guildId) return;
    setSaving(true);
    try {
      const payload = {
        nickname: nickname.trim(),
        avatarUrl: isPremium ? avatarUrl.trim() : undefined,
        bannerUrl: isPremium ? bannerUrl.trim() : undefined,
        bio: isPremium ? bio.trim() : undefined
      };

      const res = await fetch(`/api/guild/${guildId}/personalization`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save changes');
      }

      if (data.notice) {
        toast.info(data.notice);
      } else {
        toast.success(data.message || 'Bot profile updated successfully for this server!');
      }

      setInitialData({
        nickname: nickname.trim(),
        avatarUrl: isPremium ? avatarUrl.trim() : '',
        bannerUrl: isPremium ? bannerUrl.trim() : '',
        bio: isPremium ? bio.trim() : ''
      });
    } catch (err) {
      toast.error(err.message || 'Error updating bot personalization.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setNickname(initialData.nickname);
    setAvatarUrl(initialData.avatarUrl);
    setBannerUrl(initialData.bannerUrl);
    setBio(initialData.bio);
    setAvatarError(false);
    setBannerError(false);
    toast.info('Form reverted to current settings');
  };

  const isModified =
    nickname !== initialData.nickname ||
    (isPremium && avatarUrl !== initialData.avatarUrl) ||
    (isPremium && bannerUrl !== initialData.bannerUrl) ||
    (isPremium && bio !== initialData.bio);

  const effectiveAvatar =
    !avatarError && avatarUrl.trim() ? avatarUrl.trim() : botUser.defaultAvatarUrl;

  const displayName = nickname.trim() || botUser.username;

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
        <p className="text-xs font-medium text-white/50">Loading Bot Personalizer...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#1e202c] pb-8 mb-8">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <div className="h-px w-12 bg-red-500" />
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-[4px] text-red-500">
              Identity Module
            </span>
            {isPremium ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <Crown size={11} className="fill-amber-400 text-amber-400" />
                Premium Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 text-white/70">
                Free Server
              </span>
            )}
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tighter uppercase italic text-white">
            Bot <span className="text-red-500">Personalizer</span>
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-white/50 max-w-xl leading-relaxed">
            Customize Uranium's per-server identity with custom nicknames, animated GIF avatars, profile banners, and bios.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleReset}
            disabled={!isModified || saving}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white/70 hover:text-white bg-[#181923] hover:bg-[#20222f] border border-[#262838] transition disabled:opacity-40 disabled:pointer-events-none"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!isModified || saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 active:scale-95 transition shadow-lg shadow-rose-600/20 disabled:opacity-40 disabled:pointer-events-none"
          >
            <Save size={14} />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form Controls (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Non-Premium Notice Banner */}
          {!isPremium && (
            <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-[#181923] to-[#181923] p-4 text-white">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <Crown size={16} className="fill-amber-400" />
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-amber-300">
                      Unlock Avatar, Banner & Bio with Premium
                    </h3>
                    <p className="text-[11px] text-white/60 mt-0.5 leading-relaxed">
                      Changing bot nickname is 100% free! Custom animated/static avatars, banners, and custom bios require server premium status.
                    </p>
                  </div>
                </div>

                <Link
                  href={`/dashboard/premium?guild=${guildId}`}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs transition shadow-md shadow-amber-500/20"
                >
                  <Crown size={12} className="fill-black" />
                  <span>Upgrade</span>
                </Link>
              </div>
            </div>
          )}

          {/* Section 1: Bot Nickname (Free feature) */}
          <div className="rounded-2xl border border-[#1e202c] bg-[#14151e] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white tracking-wide">
                Bot Nickname
              </span>
              <span className="text-xs text-white/40 font-mono">{nickname.length}/32</span>
            </div>

            <p className="text-xs text-white/50">
              Sets the bot’s display name strictly inside this server.
            </p>

            <div className="relative">
              <input
                type="text"
                maxLength={32}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder={botUser.username}
                className="w-full rounded-xl border border-[#262838] bg-[#101118] px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition"
              />
            </div>
            <p className="text-[11px] text-white/40">
              Leave blank to reset back to default bot username (<span className="text-white/70">{botUser.username}</span>).
            </p>
          </div>

          {/* Section 2: Bot Avatar (PREMIUM ONLY) */}
          <div
            className={`relative rounded-2xl border border-[#1e202c] bg-[#14151e] p-5 space-y-3 transition ${
              !isPremium ? 'opacity-85' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Server Bot Avatar
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                  <Crown size={10} className="fill-amber-400" />
                  Premium
                </span>
              </div>
              <span className="text-[11px] text-white/40">Image or Animated GIF</span>
            </div>

            <p className="text-xs text-white/50">
              Provide a direct URL to any PNG, JPG, WEBP, or animated GIF image.
            </p>

            <div className="flex gap-3 items-center">
              {/* Thumbnail Display */}
              <div className="h-12 w-12 shrink-0 rounded-xl overflow-hidden border border-[#262838] bg-[#101118] grid place-items-center relative">
                <img
                  src={effectiveAvatar}
                  alt="Avatar"
                  onError={() => setAvatarError(true)}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="relative flex-1">
                <input
                  type="url"
                  disabled={!isPremium}
                  value={avatarUrl}
                  onChange={(e) => {
                    setAvatarError(false);
                    setAvatarUrl(e.target.value);
                  }}
                  placeholder={
                    isPremium
                      ? 'https://example.com/avatar.gif or .png (leave blank to reset)'
                      : 'Upgrade to Premium to customize avatar'
                  }
                  className={`w-full rounded-xl border border-[#262838] bg-[#101118] px-3.5 py-2.5 text-xs text-white placeholder:text-white/30 outline-none transition ${
                    isPremium
                      ? 'focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/30'
                      : 'cursor-not-allowed text-white/40 bg-[#0d0e14]'
                  }`}
                />
              </div>
            </div>

            {/* Locked Action Overlay for Non-Premium */}
            {!isPremium && (
              <div className="pt-2 flex items-center justify-between border-t border-[#1e202c]">
                <div className="flex items-center gap-1.5 text-[11px] text-white/50">
                  <Lock size={12} className="text-amber-400" />
                  <span>Avatar customization is locked for free servers</span>
                </div>
                <Link
                  href={`/dashboard/premium?guild=${guildId}`}
                  className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                >
                  <span>Upgrade to Premium</span>
                  <ExternalLink size={11} />
                </Link>
              </div>
            )}
          </div>

          {/* Section 3: Bot Banner (PREMIUM ONLY) */}
          <div
            className={`relative rounded-2xl border border-[#1e202c] bg-[#14151e] p-5 space-y-3 transition ${
              !isPremium ? 'opacity-85' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Server Profile Banner
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                  <Crown size={10} className="fill-amber-400" />
                  Premium
                </span>
              </div>
              <span className="text-[11px] text-white/40">Image or Animated GIF</span>
            </div>

            <p className="text-xs text-white/50">
              Provide a direct image or GIF URL for the banner shown on the bot's server profile.
            </p>

            <div className="relative">
              <input
                type="url"
                disabled={!isPremium}
                value={bannerUrl}
                onChange={(e) => {
                  setBannerError(false);
                  setBannerUrl(e.target.value);
                }}
                placeholder={
                  isPremium
                    ? 'https://example.com/banner.gif or .png (leave blank to reset)'
                    : 'Upgrade to Premium to customize banner'
                }
                className={`w-full rounded-xl border border-[#262838] bg-[#101118] px-3.5 py-2.5 text-xs text-white placeholder:text-white/30 outline-none transition ${
                  isPremium
                    ? 'focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/30'
                    : 'cursor-not-allowed text-white/40 bg-[#0d0e14]'
                }`}
              />
            </div>

            {/* Locked Action Overlay for Non-Premium */}
            {!isPremium && (
              <div className="pt-2 flex items-center justify-between border-t border-[#1e202c]">
                <div className="flex items-center gap-1.5 text-[11px] text-white/50">
                  <Lock size={12} className="text-amber-400" />
                  <span>Banner customization is locked for free servers</span>
                </div>
                <Link
                  href={`/dashboard/premium?guild=${guildId}`}
                  className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                >
                  <span>Upgrade to Premium</span>
                  <ExternalLink size={11} />
                </Link>
              </div>
            )}
          </div>

          {/* Section 4: Bot Bio / Backstory (PREMIUM ONLY) */}
          <div
            className={`relative rounded-2xl border border-[#1e202c] bg-[#14151e] p-5 space-y-3 transition ${
              !isPremium ? 'opacity-85' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Server Bot Bio / About Me
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                  <Crown size={10} className="fill-amber-400" />
                  Premium
                </span>
              </div>
              <span className="text-[11px] text-white/40">{bio.length}/190</span>
            </div>

            <p className="text-xs text-white/50">
              Custom server bio displayed in Discord member profile and Uranium bot embeds.
            </p>

            <div className="relative">
              <textarea
                rows={3}
                maxLength={190}
                disabled={!isPremium}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={
                  isPremium
                    ? 'Write a custom bio or description for Uranium in this server...'
                    : 'Upgrade to Premium to set a custom server bio'
                }
                className={`w-full rounded-xl border border-[#262838] bg-[#101118] px-3.5 py-2.5 text-xs text-white placeholder:text-white/30 outline-none resize-none transition ${
                  isPremium
                    ? 'focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/30'
                    : 'cursor-not-allowed text-white/40 bg-[#0d0e14]'
                }`}
              />
            </div>

            {/* Locked Action Overlay for Non-Premium */}
            {!isPremium && (
              <div className="pt-2 flex items-center justify-between border-t border-[#1e202c]">
                <div className="flex items-center gap-1.5 text-[11px] text-white/50">
                  <Lock size={12} className="text-amber-400" />
                  <span>Bio customization is locked for free servers</span>
                </div>
                <Link
                  href={`/dashboard/premium?guild=${guildId}`}
                  className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                >
                  <span>Upgrade to Premium</span>
                  <ExternalLink size={11} />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Discord Previews (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-4 sticky top-20">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-white/70 uppercase tracking-wider">
                Live Discord Previews
              </h2>
              <span className="text-[11px] text-white/40">Real-time reactive</span>
            </div>

            {/* 1. Member List Preview */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-white/50">Member list preview</p>
              <div className="rounded-xl border border-[#222434] bg-[#1a1b26] p-2.5">
                <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg bg-[#202230] hover:bg-[#25283a] transition cursor-pointer">
                  {/* Avatar + Status Indicator */}
                  <div className="relative h-9 w-9 shrink-0">
                    <img
                      src={effectiveAvatar}
                      alt=""
                      className="h-full w-full rounded-full object-cover"
                    />
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-[#23a55a] border-2 border-[#202230]" />
                  </div>

                  {/* Name + Badge + Subtext */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white truncate max-w-[140px]">
                        {displayName}
                      </span>
                      <span className="px-1 py-0.2 rounded text-[9px] font-black bg-[#5865F2] text-white tracking-wider uppercase">
                        APP
                      </span>
                    </div>
                    <p className="text-[10px] text-white/50 truncate">
                      {bio.trim() ? bio.trim().slice(0, 30) + '...' : '/help'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Full Discord Profile Preview Card */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-white/50">Profile preview</p>
              <div className="rounded-2xl border border-[#222434] bg-[#11121a] overflow-hidden shadow-2xl">
                {/* Banner Section */}
                <div className="h-28 w-full relative bg-gradient-to-r from-[#5865F2] to-[#7289da]">
                  {!bannerError && bannerUrl.trim() && (
                    <img
                      src={bannerUrl.trim()}
                      alt="Banner"
                      onError={() => setBannerError(true)}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>

                {/* Profile Body with Avatar Overlap */}
                <div className="p-4 pt-0 relative bg-[#181923]">
                  {/* Protruding Avatar */}
                  <div className="relative -top-10 mb-[-32px] inline-block">
                    <div className="relative h-20 w-20 rounded-full border-[5px] border-[#181923] overflow-hidden bg-[#111218]">
                      <img
                        src={effectiveAvatar}
                        alt="Profile Avatar"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <span className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-[#23a55a] border-4 border-[#181923]" />
                  </div>

                  {/* User Info Box */}
                  <div className="space-y-3 pt-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-white">{displayName}</h3>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-[#5865F2] text-white tracking-wider uppercase">
                          APP
                        </span>
                      </div>
                      <p className="text-[11px] text-white/50">{botUser.tag || `${botUser.username}#0000`}</p>
                    </div>

                    <div className="h-px bg-white/5" />

                    {/* About Me / Bio */}
                    <div className="space-y-1">
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-white/40">
                        About Me
                      </h4>
                      <p className="text-xs text-white/80 leading-relaxed break-words whitespace-pre-wrap">
                        {bio.trim() || 'No custom bio set for this server yet.'}
                      </p>
                    </div>

                    {/* Activity Section */}
                    <div className="space-y-1 pt-1">
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-white/40">
                        Activity
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-white/80 bg-[#12131b] p-2.5 rounded-xl border border-white/5">
                        <Bot size={15} className="text-rose-400 shrink-0" />
                        <span className="truncate">Listening to <strong className="text-white">/help</strong></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Help Note */}
            <div className="rounded-xl border border-white/5 bg-[#14151e] p-3 text-[11px] text-white/50 flex items-center gap-2">
              <HelpCircle size={14} className="shrink-0 text-white/40" />
              <span>
                Changes reflect live in your server member list and Discord interactions once saved.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
