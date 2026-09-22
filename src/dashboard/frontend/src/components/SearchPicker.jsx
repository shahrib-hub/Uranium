'use client';
import { useState } from 'react';
import { Search, Play, Clock, Music, Loader2, ListPlus, FastForward, AlertCircle, X } from 'lucide-react';
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
    <div className="space-y-4 min-w-0 w-full">
      <div className="relative group">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
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
          placeholder="Track title, artist, or URL…"
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-2.5 pl-10 pr-20 outline-none focus:border-rose-400/50 transition-all font-medium text-xs sm:text-sm text-white placeholder:text-[var(--quiet)]"
        />
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setResults([]); setError(null); }}
              className="p-1.5 text-[var(--muted)] hover:text-white transition rounded-lg hover:bg-white/10"
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
          <button 
            onClick={executeSearch}
            disabled={loading || !query.trim()}
            className="p-2 bg-rose-500 hover:bg-rose-400 text-white rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:hover:scale-100 shadow-md shadow-rose-500/20"
            title="Search"
          >
            <Search size={14} />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs">
          <AlertCircle size={15} className="shrink-0" />
          <span className="font-semibold truncate">{error}</span>
        </div>
      )}

      {results.length > 0 && (
        <div className="grid gap-2 max-h-[350px] overflow-y-auto overflow-x-hidden pr-1 w-full min-w-0">
          {results.map((track, i) => (
            <div 
              key={`${track.uri || i}-${i}`}
              className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.03] border border-white/5 hover:border-rose-500/30 hover:bg-rose-500/[0.06] transition-all min-w-0 overflow-hidden group"
            >
              {/* Thumbnail */}
              <div className="w-10 h-10 rounded-lg overflow-hidden relative shrink-0 bg-white/5">
                {track.thumbnail ? (
                  <img src={track.thumbnail} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/20">
                    <Music size={16} />
                  </div>
                )}
              </div>

              {/* Title, Artist, Duration */}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-xs text-white truncate" title={track.title}>
                  {track.title}
                </div>
                <div className="text-[11px] text-[var(--muted)] truncate flex items-center gap-1.5 mt-0.5">
                  <span className="truncate">{track.author || 'Unknown Artist'}</span>
                  <span className="text-[var(--quiet)] shrink-0">•</span>
                  <span className="shrink-0 font-mono text-[10px] text-[var(--quiet)] flex items-center gap-0.5">
                    <Clock size={10} />
                    {formatDuration(track.duration)}
                  </span>
                </div>
              </div>
              
              {/* Controls */}
              <div className="flex items-center gap-1 shrink-0 ml-1">
                <button 
                  onClick={() => performAction(track, 'play')}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-rose-500 hover:bg-rose-400 text-white grid place-items-center transition-all shadow-sm shadow-rose-500/20 active:scale-95 shrink-0"
                  title="Play Now"
                >
                  <Play size={12} fill="currentColor" />
                </button>
                <button 
                  onClick={() => performAction(track, 'next')}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/[0.08] hover:bg-white/[0.16] text-[var(--muted)] hover:text-white grid place-items-center transition-all active:scale-95 shrink-0"
                  title="Play Next"
                >
                  <FastForward size={12} />
                </button>
                <button 
                  onClick={() => performAction(track, 'queue')}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/[0.08] hover:bg-white/[0.16] text-[var(--muted)] hover:text-white grid place-items-center transition-all active:scale-95 shrink-0"
                  title="Add to Queue"
                >
                  <ListPlus size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {results.length === 0 && !loading && !error && (
        <div className="flex flex-col items-center justify-center text-center py-6 px-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.02]">
          <div className="h-9 w-9 rounded-xl bg-rose-400/10 text-rose-300 grid place-items-center mb-2">
            <Music size={16} />
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
