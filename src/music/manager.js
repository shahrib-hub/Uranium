const { Connectors } = require('shoukaku');
const { Kazagumo, Plugins } = require('kazagumo');

function boolEnv(name, fallback = false) {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return String(value).trim().toLowerCase() === 'true';
}

function numberEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

function lavalinkUrl() {
  if (process.env.LAVALINK_URL) return process.env.LAVALINK_URL.trim();

  const host = process.env.LAVALINK_HOST || 'localhost';
  const port = numberEnv('LAVALINK_PORT', 2333);
  return `${host}:${port}`;
}

function sendVoicePayload(client, guildId, payload) {
  const guild = client.guilds.cache.get(guildId);
  const shardId = guild?.shardId ?? 0;
  const shard = client.ws.shards.get(shardId);

  if (shard) {
    shard.send(payload);
    return;
  }

  if (guild?.shard?.send) guild.shard.send(payload);
}

module.exports.createMusicManager = function createMusicManager(client) {
  const defaultSource = process.env.DEFAULT_SOURCE || 'ytmsearch:';

  const nodes = [
    {
      name: process.env.LAVALINK_NAME || process.env.LAVALINK_ID || 'Main',
      url: lavalinkUrl(),
      auth: process.env.LAVALINK_PASSWORD || 'youshallnotpass',
      secure: boolEnv('LAVALINK_SECURE', false)
    }
  ];

  const kazagumo = new Kazagumo(
    {
      defaultSearchEngine: defaultSource.startsWith('ytm') ? 'youtube_music' : 'youtube',
      defaultSource,
      defaultYoutubeThumbnail: process.env.DEFAULT_YOUTUBE_THUMBNAIL || 'maxresdefault',
      plugins: [new Plugins.PlayerMoved(client)],
      send: (guildId, payload) => sendVoicePayload(client, guildId, payload),
      searchWithSameNode: true
    },
    new Connectors.DiscordJS(client),
    nodes,
    {
      moveOnDisconnect: true,
      reconnectTries: numberEnv('LAVALINK_RECONNECT_TRIES', 10),
      restTimeout: numberEnv('LAVALINK_REST_TIMEOUT', 10000),
      resumable: false
    }
  );

  client.musicConfig = {
    defaultSource,
    lavaSrc: boolEnv('LAVASRC', false),
    lavaSrcSource: process.env.LAVASRC_SOURCE || 'spsearch:',
    leaveTimeout: numberEnv('LEAVE_TIMEOUT', 60000),
    minVolume: numberEnv('MIN_VOLUME', 1),
    maxVolume: numberEnv('MAX_VOLUME', 100)
  };

  kazagumo.shoukaku.on('ready', (name) => console.log(`[music] Lavalink node ready: ${name}`));
  kazagumo.shoukaku.on('error', (name, error) => console.error(`[music] Lavalink node error (${name}):`, error?.message || error));
  kazagumo.shoukaku.on('close', (name, code, reason) => console.warn(`[music] Lavalink node closed: ${name}`, { code, reason }));
  kazagumo.on('debug', (message) => {
    if (boolEnv('MUSIC_DEBUG', false)) console.log(`[music:debug] ${message}`);
  });

  return kazagumo;
};
