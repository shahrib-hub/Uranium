// src/dashboard/api.js — Backend API for Uranium Dashboard
const { Router } = require('express');
const { PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');

function createApiRouter(client) {
  const router = Router();

  const requireGuildAccess = (client) => async (req, res, next) => {
    const guildId = req.params.guildId || req.query.guild;
    if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!guildId) return res.status(400).json({ error: 'No guild ID provided' });

    try {
      const guild = await client.guilds.fetch(guildId).catch(() => null);
      if (!guild) return res.status(404).json({ error: 'Guild not found' });
      const member = await guild.members.fetch(req.session.user.id).catch(() => null);
      if (!member) return res.status(403).json({ error: 'Not a member' });

      // Strict Music Permissions Check
      if (!member.permissions.has([PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.SendMessages])) {
        return res.status(403).json({ error: 'Missing Permissions: You need "Connect" and "Send Messages" to use the music system.' });
      }

      req.guild = guild;
      req.member = member;
      next();
    } catch (err) { res.status(500).json({ error: err.message }); }
  };

  const requireGuildAdmin = (req, res, next) => {
    if (!req.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return res.status(403).json({ error: 'Missing Permissions' });
    }
    next();
  };

  router.get('/me', (req, res) => {
    if (!req.session?.user) return res.status(401).json({ authenticated: false });
    res.json(req.session.user);
  });

  router.get('/guilds', (req, res) => {
    if (!req.session?.user) return res.status(401).json({ error: 'Not authenticated' });
    const userGuilds = req.session.guilds || [];
    const botGuilds = client.guilds.cache;
    
    const mapped = userGuilds.map(g => ({
      ...g,
      isBotAdded: botGuilds.has(g.id),
      isAdmin: (BigInt(g.permissions) & PermissionsBitField.Flags.ManageGuild) === PermissionsBitField.Flags.ManageGuild
    }));

    mapped.sort((a, b) => (b.isBotAdded ? 1 : 0) - (a.isBotAdded ? 1 : 0));
    res.json(mapped);
  });

  router.get('/commands', (req, res) => {
    const categories = [];
    const commandsPath = path.join(__dirname, '..', 'commands');
    const dirs = fs.readdirSync(commandsPath).filter(f => fs.statSync(path.join(commandsPath, f)).isDirectory());
    
    for (const cat of dirs) {
      const catPath = path.join(commandsPath, cat);
      const files = fs.readdirSync(catPath).filter(f => f.endsWith('.js'));
      const cmds = [];
      for (const file of files) {
        try {
          const cmd = require(path.join(catPath, file));
          if (cmd.data) {
            const data = cmd.data.toJSON ? cmd.data.toJSON() : cmd.data;
            const commandEntry = { name: data.name, description: data.description, premium: cmd.premium || false, subcommands: [] };
            if (data.options) {
              data.options.forEach(opt => { if (opt.type === 1 || opt.type === 2) commandEntry.subcommands.push({ name: opt.name, description: opt.description }); });
            }
            cmds.push(commandEntry);
          }
        } catch (e) {}
      }
      if (cmds.length > 0) categories.push({ name: cat, commands: cmds });
    }
    res.json(categories);
  });

  router.get('/guild/:guildId/player', requireGuildAccess(client), (req, res) => {
    const player = client.music?.players?.get(req.params.guildId);
    res.json(serializePlayer(player, req.params.guildId));
  });

  router.post('/guild/:guildId/player/action', requireGuildAccess(client), async (req, res) => {
    const { action, value } = req.body;
    const guildId = req.params.guildId;
    const player = client.music?.players?.get(guildId);
    if (!player) return res.status(404).json({ error: 'No player' });

    // Check if user is in the same VC as the bot
    if (player.voiceId) {
      if (!req.member.voice.channel || req.member.voice.channel.id !== player.voiceId) {
        return res.status(403).json({ error: 'You must be in the same voice channel as the bot to use controls.' });
      }
    }

    // Check if paused by empty VC
    if (player.data.get('pausedByEmptyVC')) {
      return res.status(403).json({ error: 'Playback is paused because the voice channel is empty. Join the channel to resume and use controls.' });
    }

    try {
      const { applyFilter, updatePlayerMessage } = require('../music/service');
      switch (action) {
        case 'pause': await player.pause(true); break;
        case 'resume': await player.pause(false); break;
        case 'skip': await player.skip(); break;
        case 'stop': await player.destroy(); break;
        case 'shuffle': player.queue.shuffle(); break;
        case 'loop': 
          const modes = ['none', 'track', 'queue'];
          player.setLoop(modes[(modes.indexOf(player.loop || 'none') + 1) % modes.length]);
          break;
        case 'autoplay': player.autoplay = !player.autoplay; break;
        case 'volume': 
          const vol = Math.min(100, Math.max(0, parseInt(value)));
          player.setVolume(vol); 
          break;
        case 'seek': await player.seek(parseInt(value)); break;
        case 'filter': await applyFilter(player, value); break;
      }
      
      res.json({ success: true });
      
      setImmediate(async () => {
        client.dashboardBridge?.emitPlayerUpdate(player);
        await updatePlayerMessage(client, player).catch(() => null);
      });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.get('/guild/:guildId/filters', requireGuildAccess(client), (req, res) => {
    const player = client.music?.players?.get(req.params.guildId);
    res.json({ current: player?.data?.get('filter') || 'clear', available: ['nightcore', 'bassboost', 'vaporwave', 'soft', 'karaoke', 'rotation', 'chipmunk', 'daycore'] });
  });

  router.get('/guild/:guildId/queue', requireGuildAccess(client), (req, res) => {
    const player = client.music?.players?.get(req.params.guildId);
    if (!player) return res.json({ current: null, tracks: [], size: 0 });
    res.json({ current: serializeTrack(player.queue.current), tracks: Array.from(player.queue || []).map((t, i) => ({ ...serializeTrack(t), position: i })), size: player.queue.size });
  });

  router.get('/guild/:guildId/search', requireGuildAccess(client), async (req, res) => {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: 'No query' });
    try {
      const { searchTracks } = require('../music/service');
      const result = await searchTracks(client, query, { id: req.session.user.id });
      res.json({ type: result.type, tracks: (result.tracks || []).slice(0, 10).map(serializeTrack) });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/guild/:guildId/play-track', requireGuildAccess(client), async (req, res) => {
    const { track, mode } = req.body;
    const guildId = req.params.guildId;
    const player = client.music?.players?.get(guildId);
    if (!player) return res.status(400).json({ error: 'No player active. Please join a voice channel first.' });
    
    try {
      const { searchTracks } = require('../music/service');
      

      
      const query = track.uri || `${track.title} ${track.author}`;

      
      let result = await searchTracks(client, query, { id: req.session.user.id });
      if (!result.tracks?.length && track.uri) {
        const fallbackQuery = `${track.title} ${track.author}`;

        result = await searchTracks(client, fallbackQuery, { id: req.session.user.id });
      }

      if (!result.tracks?.length) {
        console.warn(`[API] Search failed to resolve track even with fallback. Query: ${query}`);
        return res.status(404).json({ error: 'Track could not be resolved.' });
      }
      
      const resolvedTrack = result.tracks[0];

      
      if (mode === 'next') {
        player.queue.unshift(resolvedTrack);
      } else if (mode === 'play') {
        player.queue.unshift(resolvedTrack);
        await player.skip();
      } else {
        player.queue.add(resolvedTrack);
      }
      
      if (!player.playing && !player.paused) {
        await player.play();
      }
      
      res.json({ success: true });
      setImmediate(async () => {
        client.dashboardBridge?.emitPlayerUpdate(player);
      });
    } catch (err) { 
      console.error('[API] PlayTrack error:', err);
      res.status(500).json({ error: err.message }); 
    }
  });



  router.get('/guild/:guildId/voice-channels', requireGuildAccess(client), (req, res) => {
    res.json(req.guild.channels.cache.filter(c => c.type === 2).map(c => ({ id: c.id, name: c.name, userCount: c.members.size })));
  });

  router.post('/guild/:guildId/player/join', requireGuildAccess(client), async (req, res) => {
    const { voiceId } = req.body;
    const guildId = req.params.guildId;
    
    try {
      const player = client.music?.players?.get(guildId);
      if (player) return res.status(400).json({ error: 'Bot is already connected to a voice channel. Please stop the player first to move it.' });

      const targetChannel = req.guild.channels.cache.get(voiceId);
      if (!targetChannel) return res.status(404).json({ error: 'Voice channel not found.' });

      // Check if user is in the channel
      const memberVoice = req.member.voice.channel;
      if (!memberVoice || memberVoice.id !== voiceId) {
        return res.status(403).json({ error: 'You must join the voice channel before trying to use that.' });
      }

      // Check if bot has permissions
      const botMember = req.guild.members.me;
      if (!targetChannel.permissionsFor(botMember).has([PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak])) {
        return res.status(403).json({ error: 'I do not have permission to join or speak in that channel.' });
      }

      const { createPlayer } = require('../music/service');
      const newPlayer = await createPlayer(client, guildId, voiceId, null);
      res.json(serializePlayer(newPlayer, guildId));
      
      setImmediate(() => {
        client.dashboardBridge?.emitPlayerUpdate(newPlayer);
      });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.get('/guild/:guildId/info', requireGuildAccess(client), async (req, res) => {
    try {
      const guild = req.guild;
      const owner = await guild.fetchOwner().catch(() => null);
      const player = client.music?.players?.get(guild.id);
      
      const stats = {
        id: guild.id,
        name: guild.name,
        icon: guild.iconURL({ size: 256 }),
        owner: owner ? { tag: owner.user.tag, id: owner.id } : { tag: 'Unknown', id: null },
        memberCount: guild.memberCount,
        channels: {
          total: guild.channels.cache.size,
          text: guild.channels.cache.filter(c => c.type === 0).size,
          voice: guild.channels.cache.filter(c => c.type === 2).size,
          categories: guild.channels.cache.filter(c => c.type === 4).size
        },
        roles: guild.roles.cache.size,
        createdAt: guild.createdAt,
        music: {
          active: !!player,
          channel: player ? guild.channels.cache.get(player.voiceId)?.name : null
        }
      };

      res.json(stats);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch full server details.' });
    }
  });

  router.get('/bot/stats', async (req, res) => {
    try {
      const os = require('os');
      const uptime = client.uptime || 0;
      const totalServers = client.guilds.cache.size;
      const ping = client.ws.ping;
      const nodeVersion = process.version;
      
      // Calculate CPU usage percentage
      const cpus = os.cpus();
      const load = os.loadavg()[0]; // 1 min load avg
      const cpuUsage = ((load / cpus.length) * 100).toFixed(1) + '%';
      
      // Memory
      const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1) + ' MB';

      res.json({
        totalServers,
        ping: ping + 'ms',
        uptime: formatUptime(uptime),
        nodeVersion,
        cpuUsage,
        memoryUsage,
        shards: client.shard ? client.shard.count : 1
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch bot stats' });
    }
  });

  function formatUptime(ms) {
    const days = Math.floor(ms / (24 * 60 * 60 * 1000));
    const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const mins = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
    return `${days}d ${hours}h ${mins}m`;
  }

  return router;
}

function serializeTrack(track) {
  if (!track) return null;
  // Robustly extract info regardless of structure (info, raw.info, or top-level)
  const info = track.info || (track.raw && track.raw.info) || track;
  const dur = info.length ?? info.duration ?? info.durationMs ?? track.length ?? track.duration ?? 0;
  
  return { 
    title: track.title || info.title || 'Unknown', 
    author: track.author || info.author || 'Unknown', 
    uri: track.uri || info.uri || info.url || null, 
    thumbnail: track.thumbnail || null, 
    duration: typeof dur === 'number' ? dur : parseInt(dur) || 0, 
    isStream: track.isStream || info.isStream || false, 
    source: track.sourceName || info.sourceName || 'unknown' 
  };
}

function serializePlayer(player, guildId) {
  if (!player) return { active: false, guildId: guildId || null };
  return { 
    active: true, 
    guildId: player.guildId, 
    voiceId: player.voiceId, 
    textId: player.textId, 
    playing: player.playing || false, 
    paused: player.paused || false, 
    pausedByEmptyVC: !!player.data.get('pausedByEmptyVC'),
    position: player.position || 0, 
    volume: player.volume ?? 100, 
    loop: player.loop || 'none', 
    filter: player.data?.get('filter') || 'clear', 
    autoplay: player.autoplay || false, 
    current: serializeTrack(player.queue?.current), 
    queueSize: player.queue?.size || 0, 
    queue: Array.from(player.queue || []).slice(0, 50).map((t, i) => ({ ...serializeTrack(t), position: i })) 
  };
}

module.exports = { createApiRouter, serializePlayer, serializeTrack };
