// src/music/playerEvents.js — Event handlers with Hub integration
const { buildControlButtons, buildNowPlayingEmbed, errorEmbed, simpleEmbed } = require('./ui');
const { getCurrentFilter } = require('./service');

const registeredClients = new WeakSet();
const messageRefreshIntervals = new Map();
const leaveTimers = new Map(); // guildId -> Timeout

function clearLeaveTimer(guildId) {
  const timer = leaveTimers.get(guildId);
  if (timer) {
    clearTimeout(timer);
    leaveTimers.delete(guildId);
  }
}

function isYouTubeAuthError(message) {
  const text = String(message || '').toLowerCase();
  return text.includes('requires login') || text.includes('sign in to confirm') || text.includes('not a bot');
}

async function disableOldMessage(player) {
  if (!player?.message) return;
  const msg = player.message;
  player.message = null;
  await msg.delete().catch(() => msg.edit({ components: [] }).catch(() => null));
}

async function sendToPlayerChannel(client, player, payload) {
  const ch = client.channels.cache.get(player.textId);
  if (!ch?.send) return null;
  return ch.send(payload).catch(() => null);
}

function stopMessageRefresh(guildId) {
  const t = messageRefreshIntervals.get(guildId);
  if (t) clearInterval(t);
  messageRefreshIntervals.delete(guildId);
}

function startMessageRefresh(client, player) {
  stopMessageRefresh(player.guildId);
  const timer = setInterval(async () => {
    if (!player?.message || !player?.queue?.current || player.paused) return;
    const autoplay = player.data.get('autoplay') || false;
    await player.message.edit({
      embeds: [buildNowPlayingEmbed(player.queue.current, player, client)],
      components: buildControlButtons(player.guildId, player.paused, autoplay)
    }).catch(() => null);
  }, 15000);
  messageRefreshIntervals.set(player.guildId, timer);
}

async function fetchRelatedTracks(client, track, count = 5) {
  try {
    if (!client.music) return [];
    
    // Using "radio" or "mix" in search is far more effective for YouTube's clustering algorithm
    // than "related", which just matches words in titles.
    const query = `${track.title} ${track.author} radio`;
    const result = await client.music.search({ 
      query: `ytmsearch:${query}` 
    });
    let tracks = result.tracks || [];
    
    // Fallback to standard search if YTM returns nothing
    if (tracks.length === 0) {
      const fallbackResult = await client.music.search({ query: `ytsearch:${track.title} ${track.author} mix` });
      tracks = fallbackResult.tracks || [];
    }

    // Filter out current track and prioritize same author/language vibe
    const filtered = tracks.filter(t => t.identifier !== track.identifier && t.uri !== track.uri);
    
    return filtered.slice(0, count);
  } catch (e) {
    console.error('[Autoplay] Failed to fetch related tracks:', e.message);
    return [];
  }
}

async function updateVoiceChannelStatus(client, player, track, isPlaying = true) {
  try {
    if (!player?.voiceId) return;
    
    let voiceChannel = client.channels.cache.get(player.voiceId);
    if (!voiceChannel) {
      voiceChannel = await client.channels.fetch(player.voiceId).catch(() => null);
    }
    if (!voiceChannel) return;

    const updateStatus = async (status) => {
      try {
        if (voiceChannel.setStatus) {
          await voiceChannel.setStatus(status);
        } else {
          await client.rest.put(`/channels/${voiceChannel.id}/voice-status`, {
            body: { status: status || "" }
          });
        }
        return true;
      } catch (err) {
        console.error(`[music] Failed to set VC status: ${err.message}`);
        return false;
      }
    };

    const me = voiceChannel.guild.members.me;
    if (!me) return;

    const perms = voiceChannel.permissionsFor(me);
    if (!perms || !perms.has('SetVoiceChannelStatus')) return;
    
    if (isPlaying && track) {
      const title = track.title || 'Unknown Track';
      const author = track.author || track.info?.author || '';
      const status = `🎤 Playing ${title}${author ? ` - ${author}` : ''}`;
      await updateStatus(status);
    } else {
      await updateStatus("");
    }
  } catch (e) {
    // Silently handle unexpected errors in background status updates
  }
}

async function updateBotPresence(client, track, isPlaying = true) {
  try {
    const title = track?.title || 'Unknown Track';
    const author = track?.author || track?.info?.author || '';
    
    if (isPlaying && track) {
      await client.user.setActivity(
        author ? `${title} - ${author}` : title,
        { type: 'LISTENING', name: 'Spotify' }
      );
    } else {
      await client.user.setActivity(null);
    }
  } catch (e) {
    // Silently fail
  }
}

module.exports.registerPlayerEvents = function registerPlayerEvents(client) {
  const kazagumo = client.music;
  if (!kazagumo) {
    console.warn('[music] registerPlayerEvents called before manager was ready.');
    return;
  }

  if (registeredClients.has(client)) return;
  registeredClients.add(client);

  kazagumo.on('playerStart', async (player, track) => {
    try {
      player.data.set('lastTrack', track);
      clearLeaveTimer(player.guildId);
      if (!player.data.get('filter')) player.data.set('filter', getCurrentFilter(player));
      await disableOldMessage(player);
      const autoplay = player.data.get('autoplay') || false;
      const msg = await sendToPlayerChannel(client, player, {
        embeds: [buildNowPlayingEmbed(track, player, client)],
        components: buildControlButtons(player.guildId, player.paused, autoplay)
      });
      if (msg) {
        player.message = msg;
        startMessageRefresh(client, player);
      }
      // Set voice channel status and bot presence
      await updateVoiceChannelStatus(client, player, track, true);
      await updateBotPresence(client, track, true);
      // Emit to web dashboard
      client.dashboardBridge?.emitPlayerUpdate(player);
    } catch (err) {
      console.error('[music] playerStart failed:', err);
    }
  });

  kazagumo.on('playerEnd', async (player) => {
    try {
      stopMessageRefresh(player.guildId);
      // Clear status if no more tracks
      if (!player.queue?.length) {
        await updateVoiceChannelStatus(client, player, null, false);
        await updateBotPresence(client, null, false);
      }
      await disableOldMessage(player);
      client.dashboardBridge?.emitPlayerUpdate(player);
    } catch (err) {
      console.error('[music] playerEnd cleanup failed:', err);
    }
});

  kazagumo.on('playerEmpty', async (player) => {
    try {
      stopMessageRefresh(player.guildId);
      const guildId = player.guildId;
      await updateVoiceChannelStatus(client, player, null, false);
      await updateBotPresence(client, null, false);
      
      const autoplayEnabled = player.data.get('autoplay');
      if (autoplayEnabled) {
        const currentTrack = player.queue?.current || player.data.get('lastTrack');
        if (currentTrack) {
          const relatedTracks = await fetchRelatedTracks(client, currentTrack, 5);
          if (relatedTracks.length > 0) {
            player.queue.add(relatedTracks);
            await player.play();
            await sendToPlayerChannel(client, player, {
              embeds: [simpleEmbed(`🎵 Autoplay: Added ${relatedTracks.length} related tracks to queue.`)]
            });
            clearLeaveTimer(guildId);
            return;
          }
        }
      }
      
      await disableOldMessage(player);

      const timeoutMs = client.musicConfig?.leaveTimeout || 120000;
      await sendToPlayerChannel(client, player, { 
        embeds: [simpleEmbed(`The queue is empty. I will leave the channel in <t:${Math.floor((Date.now() + timeoutMs) / 1000)}:R> if no new songs are added.`)] 
      });

      clearLeaveTimer(guildId);
      const timer = setTimeout(async () => {
        const p = kazagumo.players.get(guildId);
        if (p && (!p.queue.current)) {
          await p.destroy().catch(() => null);
          client.dashboardIO?.to(`guild:${guildId}`).emit('playerUpdate', { active: false });
        }
        leaveTimers.delete(guildId);
      }, timeoutMs);
      
      leaveTimers.set(guildId, timer);
    } catch (err) {
      console.error('[music] playerEmpty failed:', err);
    }
  });

  kazagumo.on('playerException', async (player, data) => {
    const msg = data?.exception?.message || data?.error || 'Playback error.';
    console.error(`[music] playerException in ${player.guildId}:`, msg);
    const embed = isYouTubeAuthError(msg)
      ? errorEmbed('YouTube blocked this track. Try another.')
      : errorEmbed(`Error: \`${String(msg).slice(0, 900)}\``);
    await sendToPlayerChannel(client, player, { embeds: [embed] });
  });

  kazagumo.on('playerStuck', async (player, data) => {
    const threshold = data?.thresholdMs ? `${data.thresholdMs}ms` : 'threshold';
    console.warn(`[music] playerStuck in ${player.guildId}:`, data);
    const embed = errorEmbed(`Track stuck after ${threshold}. Skipping...`);
    await sendToPlayerChannel(client, player, { embeds: [embed] });
    player.skip();
  });

  kazagumo.on('playerResolveError', async (player, track, message) => {
    console.warn(`[music] playerResolveError in ${player.guildId}:`, message);
    const embed = errorEmbed(`Could not resolve **${track?.title || 'track'}**: \`${String(message || 'No results').slice(0, 800)}\``);
    await sendToPlayerChannel(client, player, { embeds: [embed] });
  });

  kazagumo.on('playerClosed', async (player, data) => {
    stopMessageRefresh(player.guildId);
    console.warn(`[music] playerClosed in ${player.guildId}:`, data);
  });
};
