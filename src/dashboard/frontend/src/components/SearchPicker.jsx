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
    <div className="space-y-6">
      <div className="relative group">
        <div className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
          {loading ? (
            <Loader2 className="text-red-500 animate-spin" size={20} />
          ) : (
            <Search className="text-white/20 group-focus-within:text-red-500 transition-colors" size={20} />
          )}
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Track title, artist or URL..."
          className="w-full bg-white/5 border border-white/10 rounded-[24px] py-5 pl-14 pr-16 outline-none focus:border-red-500/50 transition-all font-medium text-lg placeholder:text-white/10"
        />
        <button 
          onClick={executeSearch}
          disabled={loading || !query.trim()}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-red-500 text-black rounded-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 shadow-lg shadow-red-500/20"
        >
          <Search size={20} />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm animate-in fade-in zoom-in duration-300">
          <AlertCircle size={18} />
          <span className="font-bold">{error}</span>
        </div>
      )}

      {results.length > 0 && (
        <div className="grid gap-2 animate-in fade-in slide-in-from-top-4 duration-500 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {results.map((track, i) => (
            <div 
              key={`${track.uri || i}-${i}`}
              className="flex items-center gap-4 p-3 rounded-2xl bg-white/[0.02] border border-transparent hover:border-red-500/20 hover:bg-red-500/[0.05] transition-all group"
            >
              <div className="w-14 h-14 rounded-xl overflow-hidden relative flex-shrink-0 bg-white/5">
                {track.thumbnail ? (
                  <img src={track.thumbnail} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/10">
                    <Music size={24} />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="font-bold line-clamp-1">{track.title}</div>
                <div className="text-sm text-white/40 line-clamp-1">by {track.author}</div>
              </div>
              
              <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-all">
                <button 
                  onClick={() => performAction(track, 'play')}
                  className="p-2 sm:p-3 rounded-xl bg-red-500 text-black hover:scale-110 transition-all shadow-lg shadow-red-500/20"
                  title="Play Now"
                >
                  <Play size={14} sm:size={16} fill="currentColor" />
                </button>
                <button 
                  onClick={() => performAction(track, 'next')}
                  className="hidden sm:block p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
                  title="Play Next"
                >
                  <FastForward size={16} />
                </button>
                <button 
                  onClick={() => performAction(track, 'queue')}
                  className="p-2 sm:p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
                  title="Add to Queue"
                >
                  <ListPlus size={14} sm:size={16} />
                </button>
              </div>

              <div className="flex items-center gap-2 text-white/20 font-mono text-xs ml-2">
                <Clock size={12} />
                {formatDuration(track.duration)}
              </div>
            </div>
          ))}
        </div>
      )}

      {results.length === 0 && !loading && !error && (
        <div className="text-center py-12 opacity-20">
          <Music size={48} className="mx-auto mb-4" />
          <p className="font-medium text-sm uppercase tracking-widest">Search the Uranium network</p>
        </div>
      )}
    </div>
  );
}
