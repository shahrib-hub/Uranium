'use client';
import { useState } from 'react';
import { Search, Play, Clock, Music, Loader2, ListPlus, FastForward, AlertCircle } from 'lucide-react';
import { useStore } from '@/store';
import PremiumButton from './PremiumButton';

export default function SearchPicker() {
  const { player } = useStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const formatDuration = (ms) => {
    if (!ms) return '0:00';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
  };

  const executeSearch = async () => {
    const q = query.trim();
    if (!q) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/guild/${player.guildId}/search?query=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.tracks && data.tracks.length > 0) {
          setResults(data.tracks);
        } else {
          setResults([]);
          setError('No tracks found for this query.');
        }
      } else {
        setError('Search engine returned an error. Please try again.');
      }
    } catch (e) { 
      console.error(e); 
      setError('Connection failed. Please check your network.');
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') executeSearch();
  };

  const performAction = (track, mode = 'play') => {
    fetch(`/api/guild/${player.guildId}/play-track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ track, mode })
    }).then(res => {
      if (res.ok) {
        setResults([]);
        setQuery('');
      }
    }).catch(e => console.error(e));
  };

  return (
    <div className="space-y-4">
      <div className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
          {loading ? (
            <Loader2 className="text-rose-400 animate-spin" size={16} />
          ) : (
            <Search className="text-[var(--muted)] group-focus-within:text-rose-400 transition-colors" size={16} />
          )}
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Track title, artist, or audio URL…"
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-11 pr-12 outline-none focus:border-rose-400/50 transition-all font-medium text-sm text-white placeholder:text-[var(--quiet)]"
        />
        <button 
          onClick={executeSearch}
          disabled={loading || !query.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-rose-500 text-white rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 shadow-md shadow-rose-500/20"
        >
          <Search size={16} />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs">
          <AlertCircle size={15} className="shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {results.length > 0 && (
        <div className="grid gap-1.5 max-h-[340px] overflow-y-auto pr-1">
          {results.map((track, i) => (
            <div 
              key={`${track.uri || i}-${i}`}
              className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-rose-500/30 hover:bg-rose-500/[0.06] transition-all group"
            >
              <div className="w-11 h-11 rounded-lg overflow-hidden relative flex-shrink-0 bg-white/5">
                {track.thumbnail ? (
                  <img src={track.thumbnail} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/20">
                    <Music size={18} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-xs text-white truncate">{track.title}</div>
                <div className="text-[11px] text-[var(--muted)] truncate">by {track.author}</div>
              </div>
              
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-[var(--quiet)] mr-1">
                  <Clock size={11} />
                  {formatDuration(track.duration)}
                </span>
                <button 
                  onClick={() => performAction(track, 'play')}
                  className="p-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white transition-all shadow-sm shadow-rose-500/20 active:scale-95"
                  title="Play Now"
                >
                  <Play size={13} fill="currentColor" />
                </button>
                <button 
                  onClick={() => performAction(track, 'next')}
                  className="hidden sm:inline-flex p-2 rounded-xl bg-white/[0.07] hover:bg-white/[0.14] text-white transition-all active:scale-95"
                  title="Play Next"
                >
                  <FastForward size={13} />
                </button>
                <button 
                  onClick={() => performAction(track, 'queue')}
                  className="p-2 rounded-xl bg-white/[0.07] hover:bg-white/[0.14] text-white transition-all active:scale-95"
                  title="Add to Queue"
                >
                  <ListPlus size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {results.length === 0 && !loading && !error && (
        <div className="flex flex-col items-center justify-center text-center py-6 px-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.02]">
          <div className="h-10 w-10 rounded-2xl bg-rose-400/10 text-rose-300 grid place-items-center mb-2.5">
            <Music size={18} />
          </div>
          <p className="text-xs font-semibold text-white">Search Music or Paste URL</p>
          <p className="mt-1 text-[11px] text-[var(--muted)] max-w-xs">
            Type song titles, artists, or direct links to stream instantly in your voice channel.
          </p>
        </div>
      )}
    </div>
  );
}
