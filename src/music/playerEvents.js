// src/music/playerEvents.js — Event handlers with Hub integration
const { buildControlButtons, buildNowPlayingEmbed, errorEmbed, simpleEmbed } = require('./ui');
const { getCurrentFilter } = require('./service');

const registeredClients = new WeakSet();
const messageRefreshIntervals = new Map();

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
    await player.message.edit({
      embeds: [buildNowPlayingEmbed(player.queue.current, player, client)],
      components: buildControlButtons(player.guildId, player.paused)
    }).catch(() => null);
  }, 15000);
  messageRefreshIntervals.set(player.guildId, timer);
}

async function updateVoiceChannelStatus(client, player, track, isPlaying = true) {
  try {
    if (!player?.voiceId) return;
    
    const voiceChannel = client.channels.cache.get(player.voiceId);
    if (!voiceChannel || voiceChannel.type !== 2 || !voiceChannel.setStatus) return; 

    // Check for permissions (SetVoiceChannelStatus is 1n << 48n)
    const me = voiceChannel.guild.members.me;
    if (!voiceChannel.permissionsFor(me).has('SetVoiceChannelStatus')) {
      console.warn(`[music] Missing 'SetVoiceChannelStatus' permission in ${voiceChannel.guild.name}`);
      return;
    }
    
    if (isPlaying && track) {
      const title = track.title || 'Unknown Track';
      const author = track.author || track.info?.author || '';
      const status = author 
        ? `🎤 Playing ${title} - ${author}` 
        : `🎤 Playing ${title}`;
      
      console.log(`[music] Updating VC Status: ${status}`);
      await voiceChannel.setStatus(status).catch(err => {
        console.error(`[music] Failed to set VC status: ${err.message}`);
      });
    } else {
      await voiceChannel.setStatus("").catch(() => {});
    }
  } catch (e) {
    console.error(`[music] VC Status error:`, e.message);
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
      if (!player.data.get('filter')) player.data.set('filter', getCurrentFilter(player));
      await disableOldMessage(player);
      const msg = await sendToPlayerChannel(client, player, {
        embeds: [buildNowPlayingEmbed(track, player, client)],
        components: buildControlButtons(player.guildId, player.paused)
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
      await disableOldMessage(player);
      await sendToPlayerChannel(client, player, { embeds: [simpleEmbed('The queue is empty. Add more songs.')] });
      await player.destroy().catch(() => null);
      client.dashboardIO?.to(`guild:${guildId}`).emit('playerUpdate', { active: false });
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
