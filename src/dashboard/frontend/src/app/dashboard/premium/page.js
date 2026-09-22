'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Crown,
  Sparkles,
  Gift,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  ShieldCheck,
  Zap,
  ExternalLink,
  Bot,
  Database,
  Users,
  Palette,
  MessageSquare,
  FileCode2,
  HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';

export default function PremiumDashboardPage() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get('guild');

  const [loading, setLoading] = useState(true);
  const [premiumData, setPremiumData] = useState({
    isPremium: false,
    expiresAt: null,
    addedAt: null,
    addedBy: null,
    guildName: 'Selected Server'
  });

  // Code redemption state
  const [code, setCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [redeemResult, setRedeemResult] = useState(null); // { success: boolean, message: string, expiresAt?: string }

  useEffect(() => {
    if (!guildId) return;
    loadPremiumStatus();
  }, [guildId]);

  const loadPremiumStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/guild/${guildId}/premium`);
      if (!res.ok) {
        throw new Error('Failed to fetch server premium status');
      }
      const data = await res.json();
      setPremiumData(data);
    } catch (err) {
      console.error(err);
      toast.error('Could not load premium status.');
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (e) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error('Please enter a premium code.');
      return;
    }

    setRedeeming(true);
    setRedeemResult(null);

    try {
      const res = await fetch(`/api/guild/${guildId}/premium/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setRedeemResult({
          success: false,
          message: data.reason || data.error || 'Failed to redeem code. Please verify the code and try again.'
        });
        toast.error(data.reason || 'Code redemption failed.');
      } else {
        setRedeemResult({
          success: true,
          message: 'Premium successfully activated for this server!',
          expiresAt: data.expiresAt
        });
        toast.success('Premium successfully activated!');
        setCode('');
        // Update local state immediately
        setPremiumData((prev) => ({
          ...prev,
          isPremium: true,
          expiresAt: data.expiresAt
        }));
      }
    } catch (err) {
      setRedeemResult({
        success: false,
        message: err.message || 'An unexpected error occurred while redeeming.'
      });
      toast.error('An unexpected error occurred.');
    } finally {
      setRedeeming(false);
    }
  };

  const formatExpiry = (dateStr) => {
    if (!dateStr) return 'Lifetime / Permanent';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const getDaysRemaining = (dateStr) => {
    if (!dateStr) return null;
    const diff = new Date(dateStr).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return `${days} day${days === 1 ? '' : 's'} remaining`;
  };

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        <p className="text-xs font-medium text-white/50">Loading Premium Status...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Top Header */}
      <div className="border-b border-[#1e202c] pb-5">
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-bold text-white tracking-tight">Premium & Code Redemption</h1>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Crown size={12} className="fill-amber-400 text-amber-400" />
            Server License
          </span>
        </div>
        <p className="text-xs text-white/60 mt-1">
          Manage your server's premium subscription, redeem access codes, and view all unlocked perks.
        </p>
      </div>

      {/* Status Hero Card */}
      <div
        className={`rounded-2xl border p-6 transition-all ${
          premiumData.isPremium
            ? 'border-amber-500/30 bg-gradient-to-br from-[#1f1a12] via-[#161722] to-[#12131b] shadow-xl shadow-amber-500/5'
            : 'border-[#262838] bg-[#14151e]'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span
                className={`grid h-10 w-10 place-items-center rounded-xl border ${
                  premiumData.isPremium
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-white/10 text-white/60 border-white/10'
                }`}
              >
                <Crown
                  size={20}
                  className={premiumData.isPremium ? 'fill-amber-400 text-amber-400' : ''}
                />
              </span>
              <div>
                <span className="text-[11px] font-bold tracking-wider uppercase text-white/40">
                  Current Server Status
                </span>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <span>{premiumData.guildName}</span>
                  {premiumData.isPremium ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      Active
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/10 text-white/60">
                      Free Plan
                    </span>
                  )}
                </h2>
              </div>
            </div>

            <p className="text-xs text-white/60 max-w-xl">
              {premiumData.isPremium
                ? 'Your server enjoys full access to animated bot personalization, YouTube verification, AI assistant tools, and expanded limits.'
                : 'This server is currently on the free tier. Redeem a code below or upgrade to unlock per-server avatars, banners, bios, and advanced tools.'}
            </p>
          </div>

          {/* Right Info Pill */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-[#101118]/80 border border-white/5 p-4 rounded-xl">
            {premiumData.isPremium ? (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-white/50">
                  <Calendar size={13} className="text-amber-400" />
                  <span>Subscription Expiration</span>
                </div>
                <p className="text-xs font-bold text-white">
                  {formatExpiry(premiumData.expiresAt)}
                </p>
                {getDaysRemaining(premiumData.expiresAt) && (
                  <p className="text-[10px] font-semibold text-amber-400">
                    {getDaysRemaining(premiumData.expiresAt)}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-xs font-bold text-white">Unlock All Perks</p>
                <p className="text-[11px] text-white/50">Codes can be redeemed at any time</p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Link
                href={`/dashboard/personalize?guild=${guildId}`}
                className="px-3 py-2 rounded-lg bg-[#1e202d] hover:bg-[#252839] border border-[#2d3043] text-xs font-semibold text-white transition flex items-center gap-1.5"
              >
                <Palette size={13} className="text-rose-400" />
                <span>Personalizer</span>
              </Link>

              <a
                href="https://discord.gg/26ThFyckFX"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-amber-500/20"
              >
                <span>Get Code / Support</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Redeem Code Section */}
      <div className="rounded-2xl border border-[#1e202c] bg-[#14151e] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/20">
              <Gift size={16} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-white">Redeem Premium Code</h2>
              <p className="text-xs text-white/50">
                Enter your code to instantly activate premium status for this server.
              </p>
            </div>
          </div>
          <span className="text-[11px] text-white/40">One-time per-server code</span>
        </div>

        {/* Status Alerts */}
        {redeemResult && (
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 text-xs transition-all ${
              redeemResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {redeemResult.success ? (
              <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
            ) : (
              <XCircle size={18} className="shrink-0 text-rose-400" />
            )}
            <div className="space-y-1">
              <p className="font-bold">{redeemResult.message}</p>
              {redeemResult.expiresAt && (
                <p className="text-[11px] text-emerald-400/80">
                  New Expiry Date: <strong>{formatExpiry(redeemResult.expiresAt)}</strong>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleRedeem} className="flex flex-col sm:flex-row gap-3 pt-1">
          <div className="relative flex-1">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. URANIUM-PREM-XXXX-XXXX"
              className="w-full rounded-xl border border-[#262838] bg-[#101118] px-4 py-2.5 text-xs font-mono tracking-wider text-white placeholder:text-white/30 outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition uppercase"
            />
          </div>

          <button
            type="submit"
            disabled={redeeming || !code.trim()}
            className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-black font-bold text-xs transition shadow-lg shadow-amber-500/20 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
          >
            <Crown size={14} className="fill-black" />
            <span>{redeeming ? 'Verifying Code...' : 'Redeem for Server'}</span>
          </button>
        </form>

        <p className="text-[11px] text-white/40 flex items-center gap-1.5">
          <AlertCircle size={12} className="text-white/40" />
          <span>
            Redeemed codes apply directly to <strong>{premiumData.guildName}</strong> and cannot be transferred once consumed.
          </span>
        </p>
      </div>

      {/* Perks Showcase Grid */}
      <div className="space-y-4">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Unlocked Premium Perks
          </h2>
          <p className="text-xs text-white/50 mt-0.5">
            Everything included with an active Uranium server subscription.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              title: 'Bot Personalizer',
              desc: 'Custom per-server avatar (Image or animated GIF), custom banner, and custom bio for your server.',
              icon: Palette,
              highlight: 'GIF & Image support',
              color: 'text-pink-400',
              bg: 'bg-pink-500/10'
            },
            {
              title: 'Full AI Assistant Suite',
              desc: 'Unlimited AI chat, drawing generation, character roleplay, and conversational commands.',
              icon: Sparkles,
              highlight: 'Zero rate-limits',
              color: 'text-amber-400',
              bg: 'bg-amber-500/10'
            },
            {
              title: 'YouTube Verification',
              desc: 'Automated `/ytverify` subscription verification with instant Discord role assignment for fans.',
              icon: ShieldCheck,
              highlight: 'Automated verification',
              color: 'text-red-400',
              bg: 'bg-red-500/10'
            },
            {
              title: 'Expanded Server Backups',
              desc: 'Unlock +2 extra backup slots (up to 5 total) with a rapid 24-hour restore cooldown.',
              icon: Database,
              highlight: '5 backup slots',
              color: 'text-blue-400',
              bg: 'bg-blue-500/10'
            },
            {
              title: 'Advanced Ticket Panels',
              desc: 'Multiple interactive ticket panels with custom drop-down selectors and transcript exports.',
              icon: MessageSquare,
              highlight: 'Unlimited panels',
              color: 'text-emerald-400',
              bg: 'bg-emerald-500/10'
            },
            {
              title: '20 Embed Templates',
              desc: 'Create, save, and reuse up to 20 rich embed templates in the dashboard (free tier: 3).',
              icon: FileCode2,
              highlight: '20 saved templates',
              color: 'text-purple-400',
              bg: 'bg-purple-500/10'
            }
          ].map(({ title, desc, icon: Icon, highlight, color, bg }) => (
            <div
              key={title}
              className="rounded-2xl border border-[#1e202c] bg-[#14151e] p-5 space-y-3 hover:border-[#2a2c3e] transition"
            >
              <div className="flex items-center justify-between">
                <span className={`grid h-9 w-9 place-items-center rounded-xl ${bg} ${color}`}>
                  <Icon size={18} />
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-white/60">
                  {highlight}
                </span>
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">{title}</h3>
                <p className="text-[11px] text-white/50 mt-1 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Support & Community Card */}
      <div className="rounded-2xl border border-[#1e202c] bg-gradient-to-r from-[#181923] via-[#14151e] to-[#181923] p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="text-sm font-bold text-white">Need a code or have questions?</h3>
          <p className="text-xs text-white/50">
            Join the official Uranium support server to participate in community giveaways, report issues, or purchase codes.
          </p>
        </div>

        <a
          href="https://discord.gg/26ThFyckFX"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#222434] hover:bg-[#2c2f44] border border-[#35384f] text-xs font-bold text-white transition"
        >
          <span>Join Support Discord</span>
          <ExternalLink size={13} />
        </a>
      </div>
    </div>
  );
}
