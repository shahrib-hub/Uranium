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

  const mainNode = {
    name: 'Main',
    url: lavalinkUrl(),
    auth: process.env.LAVALINK_PASSWORD || 'youshallnotpass',
    secure: boolEnv('LAVALINK_SECURE', false)
  };

  const secondaryNode = process.env.LAVALINK_HOST_SECONDARY ? {
    name: 'Secondary',
    url: `${process.env.LAVALINK_HOST_SECONDARY}:${process.env.LAVALINK_PORT_SECONDARY || 2333}`,
    auth: process.env.LAVALINK_PASSWORD_SECONDARY || 'youshallnotpass',
    secure: boolEnv('LAVALINK_SECURE_SECONDARY', false)
  } : null;

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
    [mainNode], // Start with only Main node
    {
      moveOnDisconnect: true,
      reconnectTries: Infinity, // Reconnect indefinitely
      reconnectInterval: 10000, // 10 seconds between attempts
      restTimeout: numberEnv('LAVALINK_REST_TIMEOUT', 10000),
      resumable: false,
      userAgent: 'UraniumBot/1.0.0 (DiscordBot)'
    }
  );

  client.musicConfig = {
    defaultSource,
    lavaSrc: boolEnv('LAVASRC', false),
    lavaSrcSource: process.env.LAVASRC_SOURCE || 'spsearch:',
    leaveTimeout: numberEnv('LEAVE_TIMEOUT', 120000),
    minVolume: numberEnv('MIN_VOLUME', 1),
    maxVolume: numberEnv('MAX_VOLUME', 100)
  };

  let secondaryAdded = false;
  let mainFailures = 0;

  kazagumo.shoukaku.on('ready', (name) => {
    console.log(`[music] Lavalink node ready: ${name}`);
    
    if (name === 'Main') {
      mainFailures = 0; // Reset on success
      
      if (secondaryAdded) {
        console.log(`[music] Main node restored. Falling back from secondary node...`);
        
        const players = Array.from(kazagumo.players.values());
        players.forEach(player => {
          if (player.node.name === 'Secondary') {
            player.moveNode('Main').catch(e => console.error(`[music] Failed to move player to Main:`, e));
          }
        });

        setTimeout(() => {
          if (secondaryAdded) {
            console.log(`[music] Deactivating secondary node.`);
            kazagumo.shoukaku.removeNode('Secondary');
            secondaryAdded = false;
          }
        }, 5000);
      }
    }
  });

  kazagumo.shoukaku.on('close', (name, code, reason) => {
    console.warn(`[music] Lavalink node ${name} closed. Code: ${code}, Reason: ${reason || 'None'}`);
    
    if (name === 'Main') {
      mainFailures++;
      console.log(`[music] Main node failure count: ${mainFailures}`);

      // Failover logic: After 5 failed attempts on Main, activate Secondary if available
      if (mainFailures >= 5 && secondaryNode && !secondaryAdded) {
        console.log(`[music] Main node failed 5 times. Activating secondary node: ${secondaryNode.name}`);
        kazagumo.shoukaku.addNode(secondaryNode);
        secondaryAdded = true;
      }
    }
  });

  kazagumo.shoukaku.on('error', (name, error) => {
    console.error(`[music] Lavalink node error (${name}):`, error?.message || error);
  });

  kazagumo.shoukaku.on('debug', (name, info) => {
    if (boolEnv('MUSIC_DEBUG', false)) console.log(`[music:shoukaku:debug] [${name}] ${info}`);
  });
  
  kazagumo.on('debug', (message) => {
    if (boolEnv('MUSIC_DEBUG', false)) console.log(`[music:kazagumo:debug] ${message}`);
  });

  return kazagumo;
};
