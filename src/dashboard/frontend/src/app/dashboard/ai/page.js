'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  Crown,
  Lock,
  Save,
  RefreshCw,
  Plus,
  Trash2,
  Hash,
  Bot,
  Sliders,
  CheckCircle2,
  Zap,
  Activity,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';

export default function AiDashboardPage() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get('guild');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  // AI settings
  const [model, setModel] = useState('llama-3.1-8b-instant');
  const [style, setStyle] = useState('default');
  const [autoReply, setAutoReply] = useState(true);
  const [enabledChannels, setEnabledChannels] = useState([]);
  const [textChannels, setTextChannels] = useState([]);
  const [promptsCount, setPromptsCount] = useState(0);

  // New channel selector
  const [newChannelId, setNewChannelId] = useState('');
  const [addingChannel, setAddingChannel] = useState(false);

  const fetchAiData = async () => {
    if (!guildId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/guild/${guildId}/ai`);
      if (res.ok) {
        const data = await res.json();
        setIsPremium(!!data.isPremium);
        if (data.isPremium) {
          setModel(data.settings?.model || 'llama-3.1-8b-instant');
          setStyle(data.settings?.style || 'default');
          setAutoReply(!!data.settings?.auto_reply);
          setEnabledChannels(data.enabledChannels || []);
          setTextChannels(data.textChannels || []);
          setPromptsCount(data.stats?.prompts || 0);

          if (data.textChannels?.length && !newChannelId) {
            setNewChannelId(data.textChannels[0].id);
          }
        }
      }
    } catch (err) {
      toast.error('Failed to load AI Studio: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAiData();
  }, [guildId]);

  const handleSaveSettings = async () => {
    if (!guildId || !isPremium) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/guild/${guildId}/ai/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, style, auto_reply: autoReply })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update settings');
      toast.success('AI Assistant settings updated!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddChannel = async () => {
    if (!guildId || !newChannelId) return;
    setAddingChannel(true);
    try {
      const res = await fetch(`/api/guild/${guildId}/ai/channel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: newChannelId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to bind AI channel');
      toast.success('AI channel bound!');
      setEnabledChannels(prev => [...new Set([...prev, newChannelId])]);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAddingChannel(false);
    }
  };

  const handleRemoveChannel = async (channelId) => {
    try {
      const res = await fetch(`/api/guild/${guildId}/ai/channel/${channelId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to unbind AI channel');
      toast.success('AI channel removed.');
      setEnabledChannels(prev => prev.filter(c => c !== channelId));
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          <span className="text-xs text-white/40">Loading AI Assistant Studio...</span>
        </div>
      </div>
    );
  }

  // ── PREMIUM PAYWALL LOCK SCREEN ──────────────────────────────────────────
  if (!isPremium) {
    return (
      <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-6">
        <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-b from-[#1c1626] via-[#14141e] to-[#0f1016] p-8 sm:p-12 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="mx-auto h-16 w-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 grid place-items-center text-amber-400 shadow-lg shadow-amber-500/20">
            <Crown size={36} className="fill-amber-400" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Premium Tier Exclusive
            </span>
            <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white mt-3">
              AI Assistant Studio
            </h1>
            <p className="text-xs sm:text-sm text-white/60 max-w-lg mx-auto leading-relaxed">
              Equip your Discord server with cutting-edge conversational artificial intelligence powered by Groq and Llama 3.3.
            </p>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left text-xs">
            <div className="rounded-2xl border border-white/5 bg-white/5 p-4 space-y-1.5">
              <Zap size={18} className="text-amber-400" />
              <h3 className="font-bold text-white">Ultra-Low Latency</h3>
              <p className="text-white/50 text-[11px]">Instant sub-second conversational stream processing.</p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-white/5 p-4 space-y-1.5">
              <Bot size={18} className="text-purple-400" />
              <h3 className="font-bold text-white">Custom Personas</h3>
              <p className="text-white/50 text-[11px]">Choose between sarcastic, witty, professional, or friendly bot styles.</p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-white/5 p-4 space-y-1.5">
              <Hash size={18} className="text-blue-400" />
              <h3 className="font-bold text-white">Dedicated Channels</h3>
              <p className="text-white/50 text-[11px]">Designate unlimited channels for hands-free autonomous AI chatting.</p>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={`/dashboard/premium?guild=${guildId}`}
              className="h-11 px-8 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-xs font-bold text-black flex items-center gap-2 transition shadow-xl shadow-amber-500/25"
            >
              <Crown size={16} className="fill-black" />
              <span>Upgrade Server to Premium</span>
            </Link>

            <a
              href="https://discord.gg/26ThFyckFX"
              target="_blank"
              rel="noopener noreferrer"
              className="h-11 px-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold text-white/80 hover:text-white flex items-center gap-2 transition"
            >
              <span>View Pricing & Tiers</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── ACTIVE STUDIO SCREEN (PREMIUM ONLY) ──────────────────────────────────
  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1f212d] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
              <Crown size={11} className="fill-amber-300" />
              PREMIUM MODULE
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white flex items-center gap-3">
            <Sparkles className="text-amber-400" size={32} />
            AI Assistant Studio
          </h1>
          <p className="text-xs sm:text-sm text-white/50 mt-1">
            Configure autonomous AI responses, select LLM engines, and bind dedicated chat rooms.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchAiData}
            className="h-9 px-3.5 rounded-xl bg-[#181923] hover:bg-[#202230] border border-[#262838] text-xs font-semibold text-white/80 hover:text-white flex items-center gap-2 transition"
          >
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="h-9 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-xs font-bold text-black flex items-center gap-2 transition shadow-md shadow-amber-500/20"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            <span>Save AI Engine</span>
          </button>
        </div>
      </div>

      {/* Stats Counter */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[#232534] bg-[#161722] p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Prompts Processed</p>
            <p className="text-2xl font-black text-amber-400 mt-1">{promptsCount}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 grid place-items-center text-amber-400">
            <MessageSquare size={20} />
          </div>
        </div>

        <div className="rounded-2xl border border-[#232534] bg-[#161722] p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Active Model</p>
            <p className="text-base font-bold text-white mt-1 truncate">{model}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 grid place-items-center text-purple-400">
            <Bot size={20} />
          </div>
        </div>

        <div className="rounded-2xl border border-[#232534] bg-[#161722] p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Bound AI Channels</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">{enabledChannels.length}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 grid place-items-center text-emerald-400">
            <Hash size={20} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Model & Personality Configuration */}
        <div className="lg:col-span-2 rounded-2xl border border-[#232534] bg-[#161722] p-6 space-y-5">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Sliders size={16} className="text-amber-400" />
            AI Persona & Engine Architecture
          </h2>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-white/70">Language Model Architecture</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="mt-1.5 w-full h-10 rounded-xl border border-[#262838] bg-[#101118] px-3.5 text-xs text-white outline-none focus:border-amber-500 transition"
              >
                <option value="llama-3.1-8b-instant">Llama 3.1 8B Instant (Ultra Fast, High Efficiency)</option>
                <option value="llama-3.3-70b-versatile">Llama 3.3 70B Versatile (Highest Reasoning & Depth)</option>
                <option value="mixtral-8x7b-32768">Mixtral 8x7B (32k Large Context Window)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-white/70">Conversation Personality & Tone</label>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="mt-1.5 w-full h-10 rounded-xl border border-[#262838] bg-[#101118] px-3.5 text-xs text-white outline-none focus:border-amber-500 transition"
              >
                <option value="default">Default Balanced (Helpful, polite & concise)</option>
                <option value="concise">Concise & Direct (Brief bulleted answers)</option>
                <option value="friendly">Warm & Welcoming (Community helper tone)</option>
                <option value="professional">Corporate & Professional (Enterprise support style)</option>
                <option value="sarcastic">Sarcastic & Witty (Humorous, playful banter)</option>
              </select>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-[#101118] p-4 border border-[#262838]">
              <div>
                <span className="text-xs font-bold text-white">Autonomous Reply on Mentions</span>
                <p className="text-[11px] text-white/40">When active, Uranium automatically replies when tagged or pinged.</p>
              </div>
              <input
                type="checkbox"
                checked={autoReply}
                onChange={(e) => setAutoReply(e.target.checked)}
                className="h-4 w-4 rounded border-gray-700 text-amber-500 focus:ring-0"
              />
            </div>
          </div>
        </div>

        {/* Bound AI Channels */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#232534] bg-[#161722] p-5 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Hash size={16} className="text-emerald-400" />
              Bind AI Channels
            </h2>
            <p className="text-[11px] text-white/50">
              In bound channels, the AI responds to any message sent without needing a prefix or tag.
            </p>

            <div className="flex gap-2">
              <select
                value={newChannelId}
                onChange={(e) => setNewChannelId(e.target.value)}
                className="flex-1 h-9 rounded-xl border border-[#262838] bg-[#101118] px-3 text-xs text-white outline-none focus:border-amber-500 transition"
              >
                {textChannels.map((c) => (
                  <option key={c.id} value={c.id}>#{c.name}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleAddChannel}
                disabled={addingChannel || !newChannelId}
                className="h-9 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-xs font-bold text-black flex items-center gap-1 transition shadow-sm"
              >
                <Plus size={14} />
                <span>Bind</span>
              </button>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {enabledChannels.length === 0 ? (
                <p className="text-xs text-white/30 text-center py-4">No dedicated AI channels bound yet.</p>
              ) : (
                enabledChannels.map((cId) => {
                  const ch = textChannels.find((c) => c.id === cId);
                  return (
                    <div
                      key={cId}
                      className="flex items-center justify-between p-2 rounded-xl bg-[#101118] border border-[#232534]"
                    >
                      <span className="text-xs font-semibold text-white truncate">
                        #{ch?.name || cId}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveChannel(cId)}
                        className="p-1 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
