'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  MessageSquare,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  Sparkles,
  Layers,
  HelpCircle,
  Check,
  Send
} from 'lucide-react';
import { toast } from 'sonner';

export default function AutoresponderDashboardPage() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get('guild');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [responses, setResponses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [trigger, setTrigger] = useState('');
  const [response, setResponse] = useState('');
  const [isEmbed, setIsEmbed] = useState(false);

  const fetchResponses = async () => {
    if (!guildId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/guild/${guildId}/autoresponder`);
      if (res.ok) {
        const data = await res.json();
        setResponses(data.responses || []);
      }
    } catch (err) {
      toast.error('Failed to load auto-responses: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResponses();
  }, [guildId]);

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!trigger.trim() || !response.trim()) {
      toast.error('Trigger phrase and response message are required.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/guild/${guildId}/autoresponder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trigger: trigger.trim(),
          response: response.trim(),
          embed: isEmbed
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save auto-response');
      toast.success(`Auto-response for "${trigger}" saved!`);
      setTrigger('');
      setResponse('');
      setIsEmbed(false);
      await fetchResponses();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (triggerKey) => {
    if (!confirm(`Delete auto-response for "${triggerKey}"?`)) return;
    try {
      const res = await fetch(`/api/guild/${guildId}/autoresponder/${encodeURIComponent(triggerKey)}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete trigger');
      toast.success(`Auto-response for "${triggerKey}" removed.`);
      setResponses((prev) => prev.filter((r) => r.trigger !== triggerKey));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return responses;
    return responses.filter(
      (r) => r.trigger.toLowerCase().includes(q) || r.response.toLowerCase().includes(q)
    );
  }, [responses, searchQuery]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
          <span className="text-xs text-white/40">Loading auto-responder...</span>
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
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-blue-400">Chat Automation</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white flex items-center gap-3">
            <MessageSquare className="text-rose-500" size={32} />
            Auto-Responder Triggers
          </h1>
          <p className="text-xs sm:text-sm text-white/50 mt-1">
            Program instantaneous bot responses to common keywords, FAQ phrases, or server greetings.
          </p>
        </div>

        <button
          onClick={fetchResponses}
          className="self-start sm:self-auto h-9 px-3.5 rounded-xl bg-[#181923] hover:bg-[#202230] border border-[#262838] text-xs font-semibold text-white/80 hover:text-white flex items-center gap-2 transition"
        >
          <RefreshCw size={13} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Creator Form */}
        <div className="lg:col-span-1 rounded-2xl border border-[#232534] bg-[#161722] p-5 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Plus size={16} className="text-rose-400" />
            Create Auto-Response
          </h2>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="text-[11px] font-semibold text-white/60">Trigger Keyword / Phrase</label>
              <input
                type="text"
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
                placeholder="e.g. !website or how to verify"
                className="mt-1.5 w-full h-10 rounded-xl border border-[#262838] bg-[#101118] px-3.5 text-xs text-white outline-none focus:border-rose-500 transition"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-white/60">Automated Bot Response</label>
              <textarea
                rows={4}
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Check out our official portal at https://uraniumbot.com! Feel free to ask..."
                className="mt-1.5 w-full rounded-xl border border-[#262838] bg-[#101118] p-3 text-xs text-white outline-none focus:border-rose-500 transition resize-none"
              />
            </div>

            <div className="flex items-center justify-between rounded-xl bg-[#101118] p-3 border border-[#262838]">
              <div>
                <span className="text-xs font-bold text-white">Send as Rich Embed</span>
                <p className="text-[10px] text-white/40">Wrap response in sleek dark card</p>
              </div>
              <input
                type="checkbox"
                checked={isEmbed}
                onChange={(e) => setIsEmbed(e.target.checked)}
                className="h-4 w-4 rounded border-gray-700 text-rose-500 focus:ring-0"
              />
            </div>

            {/* Variable Tips */}
            <div className="rounded-xl border border-white/5 bg-[#101118] p-3 text-[11px] text-white/50 space-y-1">
              <span className="font-bold text-white/70 flex items-center gap-1">
                <HelpCircle size={12} className="text-rose-400" />
                Variables Supported
              </span>
              <p><code className="text-rose-300 font-mono text-[10px]">{'{user}'}</code> — Mentions speaker</p>
              <p><code className="text-rose-300 font-mono text-[10px]">{'{server}'}</code> — Server title</p>
            </div>

            <button
              type="submit"
              disabled={saving || !trigger.trim() || !response.trim()}
              className="w-full h-10 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-xs font-bold text-white flex items-center justify-center gap-2 transition shadow-lg shadow-rose-500/20"
            >
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
              <span>Save Trigger</span>
            </button>
          </form>
        </div>

        {/* Existing Triggers List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers size={16} className="text-rose-400" />
              Active Triggers ({responses.length})
            </h2>

            <div className="relative w-full sm:w-60">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search triggers..."
                className="w-full h-9 pl-9 pr-3 rounded-xl border border-[#262838] bg-[#101118] text-xs text-white placeholder:text-white/30 outline-none focus:border-rose-500 transition"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#232534] bg-[#161722]/50 p-12 text-center text-white/40 space-y-2">
              <MessageSquare className="mx-auto h-8 w-8 opacity-40" />
              <p className="text-xs">No auto-responses match your criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((item) => (
                <div
                  key={item.trigger}
                  className="rounded-2xl border border-[#232534] bg-[#161722] p-4 flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-[11px] font-mono font-bold text-rose-300">
                        {item.trigger}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.trigger)}
                        className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <p className="text-xs text-white/70 mt-3 whitespace-pre-wrap line-clamp-3 leading-relaxed">
                      {item.response}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#1f212d] flex items-center justify-between text-[11px] text-white/40">
                    <span>{item.embed ? 'Rich Embed Format' : 'Plain Text Message'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
