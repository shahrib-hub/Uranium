'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import PlayerHeader from './components/PlayerHeader';
import PlayerSidebar from './components/PlayerSidebar';
import NowPlayingHero from './components/NowPlayingHero';
import EmptyPlayerDeck from './components/EmptyPlayerDeck';
import QueueList from './components/QueueList';
import BottomPlayerBar from './components/BottomPlayerBar';
import ExploreFeedView from './components/ExploreFeedView';
import PlaylistModal from './components/PlaylistModal';
import PlaylistDrawer from './components/PlaylistDrawer';
import { ListMusic, Compass, Sparkles, FolderPlus } from 'lucide-react';

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
    regions: [],
    genreTracks: {}
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

  return (
    <div className="flex flex-col h-screen w-full bg-[#08090e] text-[#f1f3f9] overflow-hidden">
      {/* ── TOP NAV BAR ──────────────────────────────────────────────────────── */}
      <PlayerHeader
        guildId={guildId}
        player={player}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchResults={searchResults}
        setSearchResults={setSearchResults}
        searching={searching}
        handleSearch={handleSearch}
        playTrack={playTrack}
        activeTab={activeTab}
      />

      {/* ── MAIN WORKSPACE (Left Sidebar + Center Content) ────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Music Sidebar */}
        <PlayerSidebar
          guildId={guildId}
          player={player}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          playlists={playlists}
          playlistQuota={playlistQuota}
          setCreateModalOpen={setCreateModalOpen}
          playPlaylist={playPlaylist}
          handleDeletePlaylist={handleDeletePlaylist}
          setSelectedPlaylist={setSelectedPlaylist}
        />

        {/* Center Stage Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Mobile Tab Switcher */}
          <div className="md:hidden flex items-center gap-1.5 px-3 py-2 border-b border-[#161722] bg-[#0b0c12]/95 backdrop-blur-md overflow-x-auto shrink-0 no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('queue')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'queue'
                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  : 'text-[#8b92a8] hover:text-white bg-white/5 border border-transparent'
              }`}
            >
              <ListMusic size={14} />
              <span>Queue</span>
              {player.queue?.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold">
                  {player.queue.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('explore')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'explore'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-[#8b92a8] hover:text-white bg-white/5 border border-transparent'
              }`}
            >
              <Compass size={14} />
              <span>Explore</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('feed')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'feed'
                  ? 'bg-violet-500/15 text-violet-400 border border-violet-500/30'
                  : 'text-[#8b92a8] hover:text-white bg-white/5 border border-transparent'
              }`}
            >
              <Sparkles size={14} />
              <span>For You</span>
            </button>
            {playlists.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedPlaylist(playlists[0])}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap text-[#8b92a8] hover:text-white bg-white/5 border border-transparent"
              >
                <FolderPlus size={14} />
                <span>Playlists ({playlists.length})</span>
              </button>
            )}
          </div>

          <main className="flex-1 overflow-y-auto p-3 sm:p-6 pb-28 space-y-6">
            {/* TAB 1: QUEUE & LIVE CONTROLS */}
            {activeTab === 'queue' && (
              <div className="space-y-6 max-w-5xl mx-auto">
                {/* Active Hero Deck or Empty Standby State */}
                {player.current ? (
                  <NowPlayingHero
                    player={player}
                    doAction={doAction}
                    playlists={playlists}
                    addCurrentToPlaylist={addCurrentToPlaylist}
                    formatTime={formatTime}
                    seekPos={seekPos}
                  />
                ) : (
                  <EmptyPlayerDeck
                    player={player}
                    setActiveTab={setActiveTab}
                    recommendedTracks={recommendedTracks}
                    popularTracks={feedData.popularToday}
                    playTrack={playTrack}
                  />
                )}

                {/* Queue List Table */}
                <QueueList
                  queue={player.queue}
                  currentTrack={player.current}
                  doAction={doAction}
                  formatTime={formatTime}
                  playTrack={playTrack}
                  setActiveTab={setActiveTab}
                />
              </div>
            )}

            {/* TAB 2: EXPLORE & TRENDS / TAB 3: SMART FOR-YOU */}
            {(activeTab === 'explore' || activeTab === 'feed') && (
              <div className="max-w-6xl mx-auto">
                <ExploreFeedView
                  feedData={feedData}
                  selectedGenre={selectedGenre}
                  setSelectedGenre={setSelectedGenre}
                  recommendedTracks={recommendedTracks}
                  playTrack={playTrack}
                  activeTab={activeTab}
                />
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ── PERSISTENT INTEGRATED BOTTOM PLAYER BAR ──────────────────────────── */}
      <BottomPlayerBar
        player={player}
        doAction={doAction}
        seekPos={seekPos}
        setSeekPos={setSeekPos}
        localVolume={localVolume}
        handleVolumeChange={handleVolumeChange}
        handleVolumeToggle={handleVolumeToggle}
        isDraggingVolumeRef={isDraggingVolumeRef}
        formatTime={formatTime}
        playlists={playlists}
        addCurrentToPlaylist={addCurrentToPlaylist}
      />

      {/* ── CREATE PLAYLIST MODAL ────────────────────────────────────────────── */}
      <PlaylistModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        playlistName={newPlaylistName}
        setPlaylistName={setNewPlaylistName}
        onSubmit={handleCreatePlaylist}
        quota={playlistQuota}
      />

      {/* ── PLAYLIST TRACKS DRAWER / VIEWER ─────────────────────────────────── */}
      <PlaylistDrawer
        playlist={selectedPlaylist}
        onClose={() => setSelectedPlaylist(null)}
        playPlaylist={playPlaylist}
        playTrack={playTrack}
        formatTime={formatTime}
      />
    </div>
  );
}
