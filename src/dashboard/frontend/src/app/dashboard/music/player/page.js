'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  Search,
  Plus,
  Trash2,
  ListMusic,
  Headphones,
  Radio,
  Sparkles,
  Crown,
  Heart,
  ExternalLink,
  ChevronRight,
  SlidersHorizontal,
  Flame,
  Clock,
  Compass,
  Check,
  X,
  ArrowLeft,
  Music2,
  Disc3,
  Globe2
} from 'lucide-react';
import { toast } from 'sonner';

export default function FullMusicPlayerPage() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get('guild');

  // Player state
  const [player, setPlayer] = useState({
    active: false,
    playing: false,
    paused: false,
    current: null,
    queue: [],
    queueSize: 0,
    volume: 100,
    position: 0,
    loop: 'none',
    filter: 'clear',
    autoplay: false,
    channelName: 'Voice Channel'
  });

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('queue'); // 'queue', 'explore', 'feed'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Playlists state
  const [playlists, setPlaylists] = useState([]);
  const [playlistQuota, setPlaylistQuota] = useState({ count: 0, max: 1, isPremium: false, canCreate: true });
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);

  // Discovery / Feed state
  const [feedData, setFeedData] = useState({
    popularToday: [],
    recentlyPlayed: [],
    genres: [],
    regions: []
  });
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [selectedRegion, setSelectedRegion] = useState('Global Top 50');

  // Local recommendations based on listening cookies/history
  const [recommendedTracks, setRecommendedTracks] = useState([]);

  // Seek position tracking
  const [seekPos, setSeekPos] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);

  // Instant volume tracking (0ms UI latency)
  const [localVolume, setLocalVolume] = useState(100);
  const isDraggingVolumeRef = useRef(false);
  const volumeDebounceTimerRef = useRef(null);

  // Sync volume from server only when not actively dragging
  useEffect(() => {
    if (!isDraggingVolumeRef.current && typeof player.volume === 'number') {
      setLocalVolume(player.volume);
    }
  }, [player.volume]);

  // Fetch initial player state
  const fetchPlayer = async () => {
    if (!guildId) return;
    try {
      const res = await fetch(`/api/guild/${guildId}/player`);
      if (res.ok) {
        const data = await res.json();
        setPlayer(data);
        if (!isSeeking) {
          setSeekPos(data.position || 0);
        }
        if (!isDraggingVolumeRef.current && typeof data.volume === 'number') {
          setLocalVolume(data.volume);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch playlists
  const fetchPlaylists = async () => {
    try {
      const res = await fetch('/api/playlists/me');
      if (res.ok) {
        const data = await res.json();
        setPlaylists(data.playlists || []);
        if (data.quota) setPlaylistQuota(data.quota);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch feed
  const fetchFeed = async () => {
    try {
      const res = await fetch('/api/music/feed');
      if (res.ok) {
        const data = await res.json();
        setFeedData(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchPlayer();
    fetchPlaylists();
    fetchFeed();

    // Load local history/cookies for recommendation feed
    try {
      const history = JSON.parse(localStorage.getItem('uranium_music_history') || '[]');
      if (history.length > 0) {
        setRecommendedTracks(history.slice(-8).reverse());
      }
    } catch {}

    const interval = setInterval(fetchPlayer, 4000);
    return () => clearInterval(interval);
  }, [guildId]);

  // Live progress ticker
  useEffect(() => {
    if (!player.playing || player.paused || isSeeking) return;
    const ticker = setInterval(() => {
      setSeekPos((prev) => {
        const dur = player.current?.duration || 0;
        if (dur > 0 && prev >= dur) return dur;
        return prev + 1000;
      });
    }, 1000);
    return () => clearInterval(ticker);
  }, [player.playing, player.paused, isSeeking, player.current]);

  // Execute Player Action
  const doAction = async (action, value = null) => {
    if (!guildId) return;
    try {
      const res = await fetch(`/api/guild/${guildId}/player/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, value })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Player action failed');
      } else {
        fetchPlayer();
      }
    } catch (err) {
      toast.error('Network error executing player action.');
    }
  };

  // Instant Volume Handlers (Zero UI latency with debounced network calls)
  const handleVolumeChange = (val) => {
    const numeric = Math.min(100, Math.max(0, parseInt(val) || 0));
    setLocalVolume(numeric);
    setPlayer((prev) => ({ ...prev, volume: numeric }));
    isDraggingVolumeRef.current = true;

    if (volumeDebounceTimerRef.current) {
      clearTimeout(volumeDebounceTimerRef.current);
    }
    volumeDebounceTimerRef.current = setTimeout(() => {
      isDraggingVolumeRef.current = false;
      doAction('volume', numeric);
    }, 120);
  };

  const handleVolumeToggle = () => {
    const target = localVolume > 0 ? 0 : 100;
    setLocalVolume(target);
    setPlayer((prev) => ({ ...prev, volume: target }));
    isDraggingVolumeRef.current = false;
    doAction('volume', target);
  };

  // Play a song from feed / search
  const playTrack = async (queryOrTrack) => {
    if (!guildId) return;
    const isObj = typeof queryOrTrack === 'object' && queryOrTrack !== null;
    const query = isObj ? (queryOrTrack.uri || `${queryOrTrack.title} ${queryOrTrack.author}`) : queryOrTrack;
    const trackName = isObj ? (queryOrTrack.title || 'Track') : String(queryOrTrack || 'Track');
    try {
      toast.info(`Adding "${trackName}" to queue...`);
      const res = await fetch(`/api/guild/${guildId}/search/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, track: isObj ? queryOrTrack : undefined })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to play track');
      } else {
        toast.success(`Queued: ${data.track?.title || trackName}`);
        // Save to local listening history
        if (isObj) {
          saveToHistory(queryOrTrack);
        }
        fetchPlayer();
      }
    } catch {
      toast.error('Could not queue track.');
    }
  };

  const saveToHistory = (track) => {
    try {
      const hist = JSON.parse(localStorage.getItem('uranium_music_history') || '[]');
      const filtered = hist.filter((t) => t.title !== track.title);
      const updated = [...filtered, track].slice(-15);
      localStorage.setItem('uranium_music_history', JSON.stringify(updated));
      setRecommendedTracks(updated.reverse());
    } catch {}
  };

  // Handle Search
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/music/search?q=${encodeURIComponent(searchQuery.trim())}`);
      if (res.ok) {
        const results = await res.json();
        setSearchResults(results);
      }
    } catch {
      toast.error('Search request failed.');
    } finally {
      setSearching(false);
    }
  };

  // Create Playlist
  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    try {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPlaylistName.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to create playlist');
      } else {
        toast.success(`Created playlist "${data.playlist.name}"!`);
        setNewPlaylistName('');
        setCreateModalOpen(false);
        fetchPlaylists();
      }
    } catch {
      toast.error('Network error creating playlist.');
    }
  };

  // Delete Playlist
  const handleDeletePlaylist = async (id, name) => {
    if (!confirm(`Delete playlist "${name}"?`)) return;
    try {
      const res = await fetch(`/api/playlists/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Playlist deleted');
        fetchPlaylists();
        if (selectedPlaylist?.id === id) setSelectedPlaylist(null);
      }
    } catch {
      toast.error('Failed to delete playlist.');
    }
  };

  // Play whole playlist into guild queue
  const playPlaylist = async (id) => {
    if (!guildId) return;
    try {
      toast.info('Loading playlist into queue...');
      const res = await fetch(`/api/guild/${guildId}/playlists/${id}/play`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to load playlist');
      } else {
        toast.success(`Loaded ${data.queuedCount} tracks from "${data.playlistName}"!`);
        fetchPlayer();
      }
    } catch {
      toast.error('Could not load playlist into server.');
    }
  };

  // Add current song to a playlist
  const addCurrentToPlaylist = async (playlistId) => {
    if (!player.current) {
      toast.error('No song currently playing.');
      return;
    }
    try {
      const res = await fetch(`/api/playlists/${playlistId}/tracks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ track: player.current })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to add song to playlist');
      } else {
        toast.success(`Added "${player.current.title}" to playlist!`);
        fetchPlaylists();
      }
    } catch {
      toast.error('Could not add track.');
    }
  };

  const formatTime = (ms) => {
    if (!ms || isNaN(ms)) return '0:00';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const remS = s % 60;
    return `${m}:${remS < 10 ? '0' : ''}${remS}`;
  };

  const currentDuration = player.current?.duration || 0;
  const progressPercent = currentDuration > 0 ? Math.min(100, (seekPos / currentDuration) * 100) : 0;

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#0e0f16] text-[#f3f4f6]">
      {/* ── TOP NAV BAR (Spotify Full Player Style) ───────────────────────────── */}
      <header className="h-16 shrink-0 border-b border-[#1c1d29] bg-[#12131d] px-4 sm:px-6 flex items-center justify-between gap-4 z-20 sticky top-0">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href={`/dashboard/music${guildId ? `?guild=${guildId}` : ''}`}
            className="flex items-center gap-2 text-xs font-bold text-white bg-rose-600/15 hover:bg-rose-600/25 border border-rose-500/30 text-rose-300 hover:text-white transition px-3.5 py-2 rounded-xl shadow-sm group"
            title="Return to Dashboard"
          >
            <ArrowLeft size={16} className="text-rose-400 group-hover:-translate-x-0.5 transition-transform" />
            <span>Return to Dashboard</span>
          </Link>

          <div className="h-4 w-px bg-white/10 hidden sm:block" />

          {/* Uranium Music Brand */}
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className="font-extrabold text-sm text-white tracking-wide flex items-center gap-1.5">
              <Headphones size={17} className="text-rose-500" />
              <span>Uranium Music</span>
            </span>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Live
            </span>
            <span className="text-white/30">›</span>
            <span className="text-white/60 capitalize font-medium">{activeTab}</span>
          </div>
        </div>

        {/* Global Search Input */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md relative hidden md:block">
          <Search size={14} className="absolute left-3.5 top-3 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search songs, artists, or paste URL..."
            className="w-full bg-[#181926] border border-[#26283a] rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder:text-white/40 outline-none focus:border-rose-500/50 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
              }}
              className="absolute right-3 top-3 text-white/40 hover:text-white"
            >
              <X size={13} />
            </button>
          )}
        </form>

        {/* Right Status Indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#181926] border border-[#242637] text-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-[11px] text-emerald-300 font-bold">18ms</span>
            <span className="text-white/30">•</span>
            <span className="text-white/70 truncate max-w-[120px]">
              {player.active ? player.channelName : 'Idle'}
            </span>
          </div>

          <Link
            href={`/dashboard/premium${guildId ? `?guild=${guildId}` : ''}`}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold hover:bg-amber-500/25 transition"
          >
            <Crown size={12} className="fill-amber-400" />
            <span>Premium</span>
          </Link>
        </div>
      </header>

      {/* ── MAIN WORKSPACE (Left Sidebar + Center Stage) ─────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Music Sidebar */}
        <aside className="w-64 shrink-0 border-r border-[#1c1d29] bg-[#12131d] flex flex-col p-4 space-y-5 hidden md:flex overflow-y-auto">
          {/* Voice Session Widget */}
          <div className="rounded-xl border border-[#242638] bg-[#161825] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                Voice Session
              </span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  player.active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/10 text-white/50'
                }`}
              >
                {player.active ? 'Connected' : 'Offline'}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-rose-500/15 text-rose-400 shrink-0">
                <Radio size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">
                  {player.active ? player.channelName : 'No Voice Channel'}
                </p>
                <p className="text-[10px] text-white/40 truncate">
                  {player.active ? `${player.queueSize} tracks queued` : 'Connect in Discord'}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setActiveTab('queue')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'queue'
                  ? 'bg-rose-500/20 text-white font-bold'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <ListMusic size={16} className={activeTab === 'queue' ? 'text-rose-400' : ''} />
              <span>Queue & Live Player</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('explore')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'explore'
                  ? 'bg-rose-500/20 text-white font-bold'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Compass size={16} className={activeTab === 'explore' ? 'text-rose-400' : ''} />
              <span>Explore & Trends</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('feed')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'feed'
                  ? 'bg-rose-500/20 text-white font-bold'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sparkles size={16} className={activeTab === 'feed' ? 'text-rose-400' : ''} />
              <span>Smart For-You Feed</span>
            </button>
          </div>

          {/* PLAYLISTS Section */}
          <div className="flex-1 space-y-3 pt-2 border-t border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                Playlists
              </span>
              <button
                type="button"
                onClick={() => setCreateModalOpen(true)}
                title="Create New Playlist"
                className="h-6 w-6 rounded-lg bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition"
              >
                <Plus size={13} />
              </button>
            </div>

            {/* Quota Badge */}
            <div className="flex items-center justify-between text-[11px] px-1">
              <span className="text-white/50">
                Quota: <strong className="text-white">{playlistQuota.count}/{playlistQuota.max}</strong>
              </span>
              {!playlistQuota.isPremium ? (
                <Link
                  href={`/dashboard/premium${guildId ? `?guild=${guildId}` : ''}`}
                  className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 text-[10px]"
                >
                  <Crown size={10} className="fill-amber-400" />
                  <span>20 Max</span>
                </Link>
              ) : (
                <span className="text-amber-400 font-bold text-[10px]">👑 Premium</span>
              )}
            </div>

            {/* Playlists List */}
            <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
              {playlists.length > 0 ? (
                playlists.map((pl) => (
                  <div
                    key={pl.id}
                    className="group flex items-center justify-between gap-2 p-2 rounded-xl hover:bg-white/5 transition cursor-pointer"
                  >
                    <div
                      className="flex items-center gap-2.5 min-w-0 flex-1"
                      onClick={() => setSelectedPlaylist(pl)}
                    >
                      <span className="grid h-8 w-8 place-items-center rounded-lg bg-purple-500/20 text-purple-300 text-xs font-bold shrink-0">
                        <Music2 size={14} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-white truncate">{pl.name}</p>
                        <p className="text-[10px] text-white/40">{pl.tracks?.length || 0} songs</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button
                        type="button"
                        onClick={() => playPlaylist(pl.id)}
                        title="Play in Discord"
                        className="p-1 rounded text-emerald-400 hover:bg-emerald-500/20"
                      >
                        <Play size={13} fill="currentColor" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePlaylist(pl.id, pl.name)}
                        title="Delete"
                        className="p-1 rounded text-rose-400 hover:bg-rose-500/20"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[11px] text-white/40 p-2 text-center">
                  No playlists created yet. Click + to create one!
                </p>
              )}
            </div>
          </div>
        </aside>

        {/* Center Stage Content */}
        <main className="flex-1 overflow-y-auto p-6 pb-32 space-y-8">
          {/* Search Results Display (if active) */}
          {searchResults.length > 0 && (
            <div className="rounded-2xl border border-rose-500/20 bg-[#161725] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Search Results for "{searchQuery}"
                </h3>
                <button
                  type="button"
                  onClick={() => setSearchResults([])}
                  className="text-xs text-white/40 hover:text-white"
                >
                  Close Results
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {searchResults.map((t, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-[#12131d] border border-white/5 hover:border-rose-500/30 transition group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <img
                        src={t.thumbnail || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                        alt=""
                        className="h-10 w-10 rounded-lg object-cover bg-black/40"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate">{t.title}</p>
                        <p className="text-[10px] text-white/50 truncate">{t.author}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => playTrack(t)}
                      className="h-8 w-8 rounded-lg bg-rose-600 hover:bg-rose-500 text-white grid place-items-center shrink-0 transition shadow-md"
                    >
                      <Play size={13} fill="currentColor" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB 1: QUEUE & LIVE CONTROLS ──────────────────────────────────── */}
          {activeTab === 'queue' && (
            <div className="space-y-6">
              {/* Now Playing Hero Header */}
              {player.current ? (
                <div className="rounded-2xl border border-[#222436] bg-gradient-to-r from-[#1c1d2e] via-[#161724] to-[#12131d] p-6 shadow-xl flex flex-col md:flex-row items-center gap-6">
                  <div className="relative h-28 w-28 shrink-0 rounded-2xl overflow-hidden shadow-2xl border border-white/10 group">
                    <img
                      src={player.current.thumbnail || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 grid place-items-center opacity-0 group-hover:opacity-100 transition">
                      <Disc3 size={32} className="text-white animate-spin" />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1 space-y-2 text-center md:text-left">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        NOW PLAYING
                      </span>
                      {player.autoplay && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          📻 Autoplay Active
                        </span>
                      )}
                      <span className="text-xs text-white/40">
                        {player.current.source || 'Direct Stream'}
                      </span>
                    </div>

                    <h1 className="text-xl sm:text-2xl font-black text-white truncate">
                      {player.current.title}
                    </h1>
                    <p className="text-xs text-white/60 font-medium truncate">
                      {player.current.author}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-[#141520] p-8 text-center space-y-2">
                  <p className="text-sm font-bold text-white">No song currently playing</p>
                  <p className="text-xs text-white/50">
                    Pick a track from below, search a song, or play one of your personal playlists.
                  </p>
                </div>
              )}

              {/* Queue List */}
              <div className="rounded-2xl border border-[#1e202e] bg-[#141520] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <ListMusic size={14} className="text-rose-400" />
                    <span>Up Next In Queue ({player.queue?.length || 0})</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => doAction('shuffle')}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-white/70 hover:text-white transition"
                    >
                      Shuffle
                    </button>
                    <button
                      type="button"
                      onClick={() => doAction('stop')}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-xs font-medium text-rose-300 transition"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {player.queue && player.queue.length > 0 ? (
                    player.queue.map((t, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-3 p-2 rounded-xl bg-[#181926] hover:bg-[#1f2130] transition group text-xs"
                      >
                        <span className="w-5 text-center font-mono text-white/40">{idx + 1}</span>
                        <img
                          src={t.thumbnail || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                          alt=""
                          className="h-8 w-8 rounded-lg object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-white truncate">{t.title}</p>
                          <p className="text-[10px] text-white/40 truncate">{t.author}</p>
                        </div>
                        <span className="font-mono text-[11px] text-white/40">
                          {formatTime(t.duration)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-white/40 text-center py-4">Queue is empty</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: EXPLORE & TRENDS ───────────────────────────────────────── */}
          {(activeTab === 'explore' || activeTab === 'feed') && (
            <div className="space-y-8">
              {/* Genre / Region Filter Bars */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {feedData.genres.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setSelectedGenre(g)}
                      className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
                        selectedGenre === g
                          ? 'bg-rose-600 text-white'
                          : 'bg-[#181926] text-white/60 hover:text-white border border-white/5'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Genre-Filtered Grid (When a specific genre is selected) */}
              {selectedGenre !== 'All' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Sparkles size={14} className="text-rose-400" />
                      <span>{selectedGenre} — Official Spotify Listings</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setSelectedGenre('All')}
                      className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold transition"
                    >
                      Show All Charts
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {(feedData.genreTracks?.[selectedGenre] || []).map((item) => (
                      <div
                        key={item.id}
                        onClick={() => playTrack(item)}
                        className="rounded-2xl bg-[#141520] border border-[#222436] p-3 space-y-2 hover:border-rose-500/40 hover:scale-[1.02] transition cursor-pointer group"
                      >
                        <div className="relative aspect-square rounded-xl overflow-hidden bg-black/40">
                          <img
                            src={item.thumbnail}
                            alt=""
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop';
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition grid place-items-center">
                            <Play size={20} fill="currentColor" className="text-white" />
                          </div>
                        </div>
                        <p className="text-xs font-bold text-white truncate">{item.title}</p>
                        <p className="text-[10px] text-white/40 truncate">{item.author}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trending on Spotify (Live Horizontal Carousel) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Clock size={14} className="text-rose-400" />
                    <span>Trending on Spotify</span>
                  </h3>
                  <span className="text-[11px] text-white/40">Official Spotify Listings</span>
                </div>

                <div className="flex gap-4 overflow-x-auto pb-3 pt-1">
                  {feedData.recentlyPlayed.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => playTrack(item)}
                      className="shrink-0 w-36 rounded-2xl bg-[#141520] border border-[#222436] p-3 space-y-2 hover:border-rose-500/40 hover:scale-[1.02] transition cursor-pointer group"
                    >
                      <div className="relative aspect-square rounded-xl overflow-hidden bg-black/40">
                        <img
                          src={item.thumbnail}
                          alt=""
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop';
                          }}
                        />
                        {item.timeAgo && (
                          <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/60 text-white/80 backdrop-blur-sm">
                            {item.timeAgo}
                          </span>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition grid place-items-center">
                          <Play size={20} fill="currentColor" className="text-white" />
                        </div>
                      </div>
                      <p className="text-xs font-bold text-white truncate">{item.title}</p>
                      <p className="text-[10px] text-white/40 truncate">{item.author}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Spotify Global Top 50 Horizontal Carousel */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Flame size={14} className="text-amber-400" />
                    <span>Spotify Global Top 50</span>
                  </h3>
                  <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Official Charts
                  </span>
                </div>

                <div className="flex gap-4 overflow-x-auto pb-3 pt-1">
                  {feedData.popularToday.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => playTrack(item)}
                      className="shrink-0 w-36 rounded-2xl bg-[#141520] border border-[#222436] p-3 space-y-2 hover:border-amber-500/40 hover:scale-[1.02] transition cursor-pointer group"
                    >
                      <div className="relative aspect-square rounded-xl overflow-hidden bg-black/40">
                        <img
                          src={item.thumbnail}
                          alt=""
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop';
                          }}
                        />
                        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-400 text-black">
                          #{item.rank}
                        </span>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition grid place-items-center">
                          <Play size={20} fill="currentColor" className="text-white" />
                        </div>
                      </div>
                      <p className="text-xs font-bold text-white truncate">{item.title}</p>
                      <p className="text-[10px] text-white/40 truncate">{item.author}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* For-You Suggestions Feed (Cookies / Taste Learned) */}
              {recommendedTracks.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Sparkles size={14} className="text-purple-400" />
                    <span>Recommended For You (Based on your history)</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {recommendedTracks.map((t, idx) => (
                      <div
                        key={idx}
                        onClick={() => playTrack(t)}
                        className="flex items-center gap-3 p-2.5 rounded-xl bg-[#141520] border border-white/5 hover:border-purple-500/30 transition cursor-pointer group"
                      >
                        <img
                          src={t.thumbnail || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                          alt=""
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white truncate">{t.title}</p>
                          <p className="text-[10px] text-white/50 truncate">{t.author}</p>
                        </div>
                        <Play size={13} fill="currentColor" className="text-white/40 group-hover:text-purple-400 shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ── PERSISTENT SPOTIFY-STYLE BOTTOM PLAYER BAR ───────────────────────── */}
      <footer className="fixed inset-x-0 bottom-0 h-24 bg-[#10111a] border-t border-[#1e202e] px-6 flex items-center justify-between gap-6 z-40">
        {/* Left Track Info */}
        <div className="flex items-center gap-3 w-1/4 min-w-[180px]">
          {player.current ? (
            <>
              <img
                src={player.current.thumbnail || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                alt=""
                className="h-12 w-12 rounded-xl object-cover bg-black/40 shadow-md shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">{player.current.title}</p>
                <p className="text-[10px] text-white/50 truncate">{player.current.author}</p>
              </div>

              {/* Add to Playlist button */}
              {playlists.length > 0 && (
                <button
                  type="button"
                  onClick={() => addCurrentToPlaylist(playlists[0].id)}
                  title={`Add to "${playlists[0].name}"`}
                  className="text-white/40 hover:text-rose-400 transition shrink-0 p-1"
                >
                  <Heart size={16} />
                </button>
              )}
            </>
          ) : (
            <div className="text-xs text-white/40">No track playing</div>
          )}
        </div>

        {/* Center Playback Controls + Seek Scrubber */}
        <div className="flex flex-col items-center gap-1.5 flex-1 max-w-xl">
          <div className="flex items-center gap-4">
            {/* Shuffle */}
            <button
              type="button"
              onClick={() => doAction('shuffle')}
              className="text-white/50 hover:text-white transition"
              title="Shuffle Queue"
            >
              <Shuffle size={15} />
            </button>

            {/* Previous */}
            <button
              type="button"
              onClick={() => doAction('previous')}
              className="text-white/70 hover:text-white transition"
              title="Previous Track"
            >
              <SkipBack size={17} />
            </button>

            {/* Play / Pause Primary Button */}
            <button
              type="button"
              onClick={() => doAction(player.playing && !player.paused ? 'pause' : 'resume')}
              className="h-10 w-10 rounded-full bg-white text-black hover:scale-105 active:scale-95 transition grid place-items-center shadow-lg shadow-white/10"
              title={player.playing && !player.paused ? 'Pause' : 'Play'}
            >
              {player.playing && !player.paused ? (
                <Pause size={17} fill="currentColor" />
              ) : (
                <Play size={17} fill="currentColor" className="ml-0.5" />
              )}
            </button>

            {/* Skip */}
            <button
              type="button"
              onClick={() => doAction('skip')}
              className="text-white/70 hover:text-white transition"
              title="Skip Track"
            >
              <SkipForward size={17} />
            </button>

            {/* Loop Mode */}
            <button
              type="button"
              onClick={() => doAction('loop')}
              className={`transition relative ${
                player.loop !== 'none' ? 'text-rose-400' : 'text-white/50 hover:text-white'
              }`}
              title={`Loop mode: ${player.loop}`}
            >
              <Repeat size={15} />
              {player.loop === 'track' && (
                <span className="absolute -top-1 -right-1 text-[8px] font-black">1</span>
              )}
            </button>

            {/* AUTOPLAY TOGGLE BUTTON (With Active Green Badge) */}
            <button
              type="button"
              onClick={() => doAction('autoplay')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider transition ${
                player.autoplay
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-white/5 text-white/40 hover:text-white'
              }`}
              title="Autoplay: Automatically queues related tracks when queue ends"
            >
              <Radio size={11} />
              <span>AUTO</span>
            </button>
          </div>

          {/* Scrubber Progress Bar */}
          <div className="w-full flex items-center gap-2.5 text-[10px] font-mono text-white/40">
            <span>{formatTime(seekPos)}</span>
            <div
              className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden relative cursor-pointer group"
              onClick={(e) => {
                if (!currentDuration) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                const targetMs = Math.floor(ratio * currentDuration);
                setSeekPos(targetMs);
                doAction('seek', targetMs);
              }}
            >
              <div
                className="h-full bg-rose-500 group-hover:bg-rose-400 transition-all rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span>{formatTime(currentDuration)}</span>
          </div>
        </div>

        {/* Right Volume & Filters */}
        <div className="flex items-center justify-end gap-3 w-1/4 min-w-[180px]">
          {/* DSP Filter Selector */}
          <select
            value={player.filter || 'clear'}
            onChange={(e) => doAction('filter', e.target.value)}
            className="bg-[#181926] border border-[#242637] text-[11px] font-semibold text-white/80 rounded-lg px-2 py-1 outline-none cursor-pointer"
          >
            <option value="clear">Filter: Normal</option>
            <option value="nightcore">Nightcore</option>
            <option value="bassboost">Bass Boost</option>
            <option value="vaporwave">Vaporwave</option>
            <option value="rotation">8D Audio</option>
            <option value="soft">Soft & Relaxing</option>
          </select>

          {/* Volume Slider (Instant 0ms Feedback) */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleVolumeToggle}
              className="text-white/50 hover:text-white transition"
              title={localVolume === 0 ? 'Unmute' : 'Mute'}
            >
              {localVolume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={localVolume}
              onPointerDown={() => { isDraggingVolumeRef.current = true; }}
              onPointerUp={() => { isDraggingVolumeRef.current = false; }}
              onChange={(e) => handleVolumeChange(e.target.value)}
              className="w-16 accent-rose-500 cursor-pointer"
            />
            <span className="text-[10px] font-mono text-white/50 w-6 text-right select-none">
              {localVolume}%
            </span>
          </div>
        </div>
      </footer>

      {/* ── CREATE PLAYLIST MODAL ────────────────────────────────────────────── */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[#242637] bg-[#161725] p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Music2 size={16} className="text-rose-400" />
                <span>Create New Playlist</span>
              </h3>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-white/40 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreatePlaylist} className="space-y-4">
              <input
                type="text"
                maxLength={50}
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="e.g. Late Night Vibe"
                className="w-full rounded-xl border border-[#2b2d40] bg-[#10111a] px-3.5 py-2.5 text-xs text-white placeholder:text-white/30 outline-none focus:border-rose-500/50"
                autoFocus
              />

              <div className="flex items-center justify-between text-[11px] text-white/50">
                <span>Quota: {playlistQuota.count}/{playlistQuota.max}</span>
                {!playlistQuota.isPremium && (
                  <span className="text-amber-400 font-semibold">Free User: 1 Max</span>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newPlaylistName.trim()}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/20 disabled:opacity-40"
                >
                  Create Playlist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
