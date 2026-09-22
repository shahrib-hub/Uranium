const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { isMongoReady } = require('../database/dbUtils');
const { UserPlaylist } = require('../database/mongoose');

const dbPath = path.resolve(__dirname, '..', 'data', 'user_playlists.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS user_playlists (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    tracks_json TEXT NOT NULL
  )`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_user_playlists_uid ON user_playlists (user_id)`);
});

function safeParseTracks(jsonStr) {
  try {
    const parsed = JSON.parse(jsonStr || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function getUserPlaylists(userId) {
  if (!userId) return [];

  if (isMongoReady() && UserPlaylist) {
    try {
      const docs = await UserPlaylist.find({ userId }).sort({ createdAt: 1 });
      return docs.map(d => ({
        id: d.id,
        name: d.name,
        createdAt: d.createdAt ? d.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: d.updatedAt ? d.updatedAt.toISOString() : new Date().toISOString(),
        tracks: safeParseTracks(d.tracksJson)
      }));
    } catch (err) {
      console.warn('[PlaylistStorage] Mongo read failed, using SQLite:', err.message);
    }
  }

  return new Promise((resolve) => {
    db.all(
      'SELECT id, name, created_at as createdAt, updated_at as updatedAt, tracks_json as tracksJson FROM user_playlists WHERE user_id = ? ORDER BY created_at ASC',
      [userId],
      (err, rows) => {
        if (err || !rows) return resolve([]);
        const result = rows.map(r => ({
          id: r.id,
          name: r.name,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          tracks: safeParseTracks(r.tracksJson)
        }));
        resolve(result);
      }
    );
  });
}

async function getUserPlaylistQuota(userId, isUserPremium = false) {
  const playlists = await getUserPlaylists(userId);
  const max = isUserPremium ? 20 : 1;
  return {
    count: playlists.length,
    max,
    isPremium: !!isUserPremium,
    canCreate: playlists.length < max
  };
}

async function getPlaylist(userId, playlistIdOrName) {
  if (!userId || !playlistIdOrName) return null;
  const playlists = await getUserPlaylists(userId);
  const query = String(playlistIdOrName || '').toLowerCase().trim();
  return (
    playlists.find(
      (p) => p.id === playlistIdOrName || p.name.toLowerCase().trim() === query
    ) || null
  );
}

async function createPlaylist(userId, name, isUserPremium = false) {
  if (!userId) return { success: false, error: 'User ID is required.' };
  const cleanName = String(name || '').trim();
  if (!cleanName) return { success: false, error: 'Playlist name cannot be empty.' };
  if (cleanName.length > 50) return { success: false, error: 'Playlist name must be 50 characters or less.' };

  const currentPlaylists = await getUserPlaylists(userId);
  const max = isUserPremium ? 20 : 1;

  if (currentPlaylists.length >= max) {
    return {
      success: false,
      error: isUserPremium
        ? 'You have reached the maximum limit of 20 playlists.'
        : 'Free users can only create 1 playlist. Upgrade to Premium to create up to 20 playlists!'
    };
  }

  if (currentPlaylists.some(p => p.name.toLowerCase() === cleanName.toLowerCase())) {
    return { success: false, error: `You already have a playlist named "${cleanName}".` };
  }

  const id = `pl_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const tracksJson = '[]';

  if (isMongoReady() && UserPlaylist) {
    try {
      await UserPlaylist.create({
        id,
        userId,
        name: cleanName,
        createdAt: new Date(),
        updatedAt: new Date(),
        tracksJson
      });
    } catch (err) {
      console.warn('[PlaylistStorage] Mongo create failed, falling back to SQLite:', err.message);
    }
  }

  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO user_playlists (id, user_id, name, created_at, updated_at, tracks_json) VALUES (?, ?, ?, ?, ?, ?)',
      [id, userId, cleanName, now, now, tracksJson],
      function (err) {
        if (err) {
          console.error('[PlaylistStorage] SQLite insert error:', err.message);
          return reject(err);
        }
        resolve({
          success: true,
          playlist: {
            id,
            name: cleanName,
            createdAt: now,
            updatedAt: now,
            tracks: []
          }
        });
      }
    );
  });
}

async function deletePlaylist(userId, playlistIdOrName) {
  if (!userId || !playlistIdOrName) return { success: false, error: 'Invalid parameters.' };
  const existing = await getPlaylist(userId, playlistIdOrName);
  if (!existing) return { success: false, error: 'Playlist not found.' };

  if (isMongoReady() && UserPlaylist) {
    try {
      await UserPlaylist.deleteOne({ id: existing.id, userId });
    } catch (err) {
      console.warn('[PlaylistStorage] Mongo delete error:', err.message);
    }
  }

  return new Promise((resolve, reject) => {
    db.run(
      'DELETE FROM user_playlists WHERE id = ? AND user_id = ?',
      [existing.id, userId],
      function (err) {
        if (err) return reject(err);
        resolve({ success: true, playlist: existing });
      }
    );
  });
}

async function addTrackToPlaylist(userId, playlistIdOrName, track) {
  if (!userId || !playlistIdOrName || !track) return { success: false, error: 'Invalid arguments.' };
  const existing = await getPlaylist(userId, playlistIdOrName);
  if (!existing) return { success: false, error: 'Playlist not found.' };

  const cleanTrack = {
    title: String(track.title || 'Unknown Title').slice(0, 150),
    author: String(track.author || 'Unknown Artist').slice(0, 100),
    uri: track.uri || track.url || '',
    duration: typeof track.duration === 'number' ? track.duration : parseInt(track.duration) || 0,
    thumbnail: track.thumbnail || null,
    addedAt: new Date().toISOString()
  };

  const updatedTracks = [...existing.tracks, cleanTrack];
  const now = new Date().toISOString();
  const tracksJson = JSON.stringify(updatedTracks);

  if (isMongoReady() && UserPlaylist) {
    try {
      await UserPlaylist.updateOne(
        { id: existing.id, userId },
        { tracksJson, updatedAt: new Date() }
      );
    } catch (err) {
      console.warn('[PlaylistStorage] Mongo update error:', err.message);
    }
  }

  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE user_playlists SET tracks_json = ?, updated_at = ? WHERE id = ? AND user_id = ?',
      [tracksJson, now, existing.id, userId],
      function (err) {
        if (err) return reject(err);
        existing.tracks = updatedTracks;
        existing.updatedAt = now;
        resolve({ success: true, playlist: existing, track: cleanTrack });
      }
    );
  });
}

async function removeTrackFromPlaylist(userId, playlistIdOrName, trackIndex) {
  if (!userId || !playlistIdOrName) return { success: false, error: 'Invalid parameters.' };
  const existing = await getPlaylist(userId, playlistIdOrName);
  if (!existing) return { success: false, error: 'Playlist not found.' };

  const idx = parseInt(trackIndex, 10);
  if (isNaN(idx) || idx < 0 || idx >= existing.tracks.length) {
    return { success: false, error: 'Invalid track index.' };
  }

  const removed = existing.tracks[idx];
  const updatedTracks = existing.tracks.filter((_, i) => i !== idx);
  const now = new Date().toISOString();
  const tracksJson = JSON.stringify(updatedTracks);

  if (isMongoReady() && UserPlaylist) {
    try {
      await UserPlaylist.updateOne(
        { id: existing.id, userId },
        { tracksJson, updatedAt: new Date() }
      );
    } catch (err) {
      console.warn('[PlaylistStorage] Mongo update error:', err.message);
    }
  }

  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE user_playlists SET tracks_json = ?, updated_at = ? WHERE id = ? AND user_id = ?',
      [tracksJson, now, existing.id, userId],
      function (err) {
        if (err) return reject(err);
        existing.tracks = updatedTracks;
        existing.updatedAt = now;
        resolve({ success: true, playlist: existing, removedTrack: removed });
      }
    );
  });
}

module.exports = {
  getUserPlaylists,
  getUserPlaylistQuota,
  getPlaylist,
  createPlaylist,
  deletePlaylist,
  addTrackToPlaylist,
  removeTrackFromPlaylist
};
