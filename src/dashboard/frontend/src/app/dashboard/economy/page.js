'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Coins,
  Save,
  RefreshCw,
  Trophy,
  Sliders,
  DollarSign,
  TrendingUp,
  Wallet,
  Building,
  Award
} from 'lucide-react';
import { toast } from 'sonner';

export default function EconomyDashboardPage() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get('guild');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Settings
  const [currency, setCurrency] = useState('🪙');
  const [dailyAmount, setDailyAmount] = useState(250);
  const [workMin, setWorkMin] = useState(50);
  const [workMax, setWorkMax] = useState(200);

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState([]);

  const fetchEconomyData = async () => {
    if (!guildId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/guild/${guildId}/economy`);
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setCurrency(data.settings.currency || '🪙');
          setDailyAmount(data.settings.dailyAmount || 250);
          setWorkMin(data.settings.workMin || 50);
          setWorkMax(data.settings.workMax || 200);
        }
        setLeaderboard(data.leaderboard || []);
      }
    } catch (err) {
      toast.error('Failed to load economy data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEconomyData();
  }, [guildId]);

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!guildId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/guild/${guildId}/economy/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currency,
          dailyAmount,
          workMin,
          workMax
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update settings');
      toast.success('Economy settings updated!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
          <span className="text-xs text-white/40">Loading server economy...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1f212d] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-amber-400">Social Economy</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white flex items-center gap-3">
            <Coins className="text-amber-400" size={32} />
            Server Economy & Currency
          </h1>
          <p className="text-xs sm:text-sm text-white/50 mt-1">
            Customize server money, configure daily rewards and job payouts, and view top wealth rankings.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchEconomyData}
            className="h-9 px-3.5 rounded-xl bg-[#181923] hover:bg-[#202230] border border-[#262838] text-xs font-semibold text-white/80 hover:text-white flex items-center gap-2 transition"
          >
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="h-9 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-xs font-bold text-black flex items-center gap-2 transition shadow-md shadow-amber-500/20"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            <span>Save Settings</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Configuration Card */}
        <div className="lg:col-span-1 rounded-2xl border border-[#232534] bg-[#161722] p-5 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Sliders size={16} className="text-amber-400" />
            Economy Parameters
          </h2>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-white/70">Custom Currency Symbol / Emoji</label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                maxLength={10}
                placeholder="🪙 or $"
                className="mt-1.5 w-full h-10 rounded-xl border border-[#262838] bg-[#101118] px-3.5 text-xs text-white outline-none focus:border-amber-500 transition"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-white/70">Daily Reward Base Amount</label>
              <input
                type="number"
                min={1}
                value={dailyAmount}
                onChange={(e) => setDailyAmount(parseInt(e.target.value, 10) || 1)}
                className="mt-1.5 w-full h-10 rounded-xl border border-[#262838] bg-[#101118] px-3.5 text-xs text-white outline-none focus:border-amber-500 transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-white/70">Work Min Payout</label>
                <input
                  type="number"
                  min={1}
                  value={workMin}
                  onChange={(e) => setWorkMin(parseInt(e.target.value, 10) || 1)}
                  className="mt-1.5 w-full h-10 rounded-xl border border-[#262838] bg-[#101118] px-3 text-xs text-white outline-none focus:border-amber-500 transition"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-white/70">Work Max Payout</label>
                <input
                  type="number"
                  min={1}
                  value={workMax}
                  onChange={(e) => setWorkMax(parseInt(e.target.value, 10) || 1)}
                  className="mt-1.5 w-full h-10 rounded-xl border border-[#262838] bg-[#101118] px-3 text-xs text-white outline-none focus:border-amber-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full h-10 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-xs font-bold text-black flex items-center justify-center gap-2 transition shadow-md shadow-amber-500/20"
            >
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              <span>Update Economy Rules</span>
            </button>
          </form>
        </div>

        {/* Wealth Leaderboard */}
        <div className="lg:col-span-2 rounded-2xl border border-[#232534] bg-[#161722] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Trophy size={16} className="text-amber-400" />
              Wealth & Net-Worth Leaderboard
            </h2>
            <span className="text-xs text-white/40">Top 15 Tycoons</span>
          </div>

          {leaderboard.length === 0 ? (
            <div className="py-12 text-center text-white/40 text-xs">
              No economy accounts registered yet. Members will appear here after using economy commands!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-white/70">
                <thead className="border-b border-[#232534] text-[11px] font-bold text-white/40 uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Rank</th>
                    <th className="py-2.5 px-3">Member</th>
                    <th className="py-2.5 px-3 text-right">Wallet</th>
                    <th className="py-2.5 px-3 text-right">Bank Vault</th>
                    <th className="py-2.5 px-3 text-right">Net Worth</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f212d]">
                  {leaderboard.map((user) => (
                    <tr key={user.userId} className="hover:bg-white/5 transition">
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full font-black text-xs ${
                          user.rank === 1
                            ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                            : user.rank === 2
                            ? 'bg-slate-300/20 text-slate-200 border border-slate-300/30'
                            : user.rank === 3
                            ? 'bg-amber-700/20 text-amber-500 border border-amber-700/30'
                            : 'text-white/40'
                        }`}>
                          {user.rank}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 font-semibold text-white flex items-center gap-2">
                        {user.avatar ? (
                          <img src={user.avatar} alt="" className="h-6 w-6 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-white/10 grid place-items-center text-[10px] text-white/60">
                            ?
                          </div>
                        )}
                        <span className="truncate">{user.username}</span>
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono text-emerald-400">
                        {currency} {user.wallet?.toLocaleString()}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono text-blue-400">
                        {currency} {user.bank?.toLocaleString()}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400">
                        {currency} {user.net?.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
