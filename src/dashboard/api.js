// src/dashboard/api.js — Backend API for Uranium Dashboard
const { Router } = require('express');
const { PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');
const rrStorage = require('../utils/rrStorage');

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
    try {
      const helpPath = path.join(__dirname, '..', 'components', 'help.json');
      if (!fs.existsSync(helpPath)) return res.json([]);
      
      const helpData = JSON.parse(fs.readFileSync(helpPath, 'utf8'));
      
      // SPECIFIC DEV COMMAND BLACKLIST
      const devBlacklist = ['/ecoconfig', '/premiumadmin', '/notificationtesting', '/dbmigrate'];
      
      const publicCategories = (helpData.categories || [])
        .map(cat => ({
          name: cat.id,
          emoji: cat.emoji,
          commands: (cat.commands || [])
            .filter(cmdStr => {
              const cmdName = cmdStr.split(' — ')[0].trim().toLowerCase();
              return !devBlacklist.some(dev => cmdName.includes(dev.toLowerCase()));
            })
            .map(cmdStr => {
              const [name, desc] = cmdStr.split(' — ');
              return { name: (name || '').trim(), description: (desc || '').trim() };
            })
        }))
        .filter(cat => cat.commands.length > 0);
        
      res.json(publicCategories);
    } catch (e) {
      res.status(500).json({ error: 'Failed to load command list' });
    }
  });

  router.get('/guild/:guildId/player', requireGuildAccess(client), (req, res) => {
    const player = client.music?.players?.get(req.params.guildId);
    res.json(serializePlayer(player, client, req.params.guildId));
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
  
  router.post('/guild/:guildId/queue/clear', requireGuildAccess(client), (req, res) => {
    const player = client.music?.players?.get(req.params.guildId);
    if (!player) return res.status(404).json({ error: 'No player' });
    player.queue.clear();
    res.json({ success: true });
    client.dashboardBridge?.emitPlayerUpdate(player);
  });

  router.post('/guild/:guildId/queue/remove', requireGuildAccess(client), (req, res) => {
    const { position } = req.body;
    const player = client.music?.players?.get(req.params.guildId);
    if (!player) return res.status(404).json({ error: 'No player' });
    if (typeof position !== 'number') return res.status(400).json({ error: 'Invalid position' });
    
    player.queue.remove(position);
    res.json({ success: true });
    client.dashboardBridge?.emitPlayerUpdate(player);
  });

  router.post('/guild/:guildId/queue/reorder', requireGuildAccess(client), (req, res) => {
    const { from, to } = req.body;
    const player = client.music?.players?.get(req.params.guildId);
    if (!player) return res.status(404).json({ error: 'No player' });
    
    // Kazagumo queue doesn't have a direct 'move' method usually, but we can splice
    const tracks = Array.from(player.queue);
    const [moved] = tracks.splice(from, 1);
    tracks.splice(to, 0, moved);
    
    player.queue.clear();
    player.queue.add(tracks);
    
    res.json({ success: true });
    client.dashboardBridge?.emitPlayerUpdate(player);
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

  // Text channels only for channel selector
  router.get('/guild/:guildId/channels', requireGuildAccess(client), (req, res) => {
    const channels = {
      text: []
    };

    for (const [id, channel] of req.guild.channels.cache) {
      if (channel.type === 0) {
        channels.text.push({ id: channel.id, name: channel.name, categoryId: channel.parentId });
      }
    }

    res.json(channels);
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
      res.json(serializePlayer(newPlayer, client, guildId));
      
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

  // ---------- REACTION ROLES API ----------
  
  // List setups
  router.get('/guild/:guildId/rr/setups', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const setups = await rrStorage.listSetupsForGuild(req.params.guildId);
      res.json(setups);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Create setup
  router.post('/guild/:guildId/rr/setups', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const {
        channelId,
        mode,
        title,
        description,
        config = {},
        maxPerUser = 0,
        exclusive = false,
        cooldownSeconds = 0,
        // Embed customization
        embedColor,
        embedTitle,
        embedDescription,
        embedFooter,
        embedThumbnail,
        embedAuthorName,
        embedAuthorIcon,
        embedAuthorUrl,
        embedImage
      } = req.body;

      // Convert hex color to number
      const parseColor = (hex) => {
        if (!hex) return null;
        if (typeof hex === 'number') return hex;
        if (typeof hex === 'string' && hex.startsWith('#')) {
          return parseInt(hex.slice(1), 16);
        }
        return null;
      };

      // Build full config
      const fullConfig = {
        maxPerUser,
        allowMultiple: !exclusive,
        exclusiveGroups: exclusive ? { default: [] } : {},
        requiredRoles: {},
        blockedRoles: [],
        cooldownSeconds,
        // Embed options
        color: parseColor(embedColor),
        customTitle: embedTitle || null,
        customDescription: embedDescription || null,
        footerText: embedFooter || null,
        thumbnail: embedThumbnail || null,
        authorName: embedAuthorName || null,
        authorIcon: embedAuthorIcon || null,
        authorUrl: embedAuthorUrl || null,
        image: embedImage || null,
        ...config
      };

      const setupId = await rrStorage.createSetup({
        guildId: req.params.guildId,
        channelId,
        mode,
        title,
        description,
        creatorId: req.session.user.id,
        config: fullConfig
      });

      // Send panel to Discord channel
      try {
        const { sendOrUpdatePanel } = require('../commands/Utility/rr');
        const channel = await client.channels.fetch(channelId).catch(() => null);
        if (channel && channel.isTextBased()) {
          const setup = await rrStorage.getSetupById(setupId);
          const items = await rrStorage.listItems(setupId);
          await sendOrUpdatePanel(channel, setup, items, { client, user: req.session.user });
        }
      } catch (err) {
        console.error('[RR API] Failed to send panel to Discord:', err.message);
      }

      res.json({ success: true, setupId });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Get setup details + items + stats
  router.get('/guild/:guildId/rr/setups/:setupId', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const setup = await rrStorage.getSetupById(req.params.setupId);
      if (!setup || setup.guildId !== req.params.guildId) return res.status(404).json({ error: 'Setup not found' });
      
      const items = await rrStorage.listItems(setup._id);
      const stats = await rrStorage.getSetupStats(setup._id);
      
      res.json({ setup, items, stats });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Update setup config/metadata
  router.patch('/guild/:guildId/rr/setups/:setupId', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const { title, description, config } = req.body;
      const setup = await rrStorage.getSetupById(req.params.setupId);
      if (!setup || setup.guildId !== req.params.guildId) return res.status(404).json({ error: 'Setup not found' });

      await rrStorage.updateSetupConfig(setup._id, { title, description, config });
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Delete setup
  router.delete('/guild/:guildId/rr/setups/:setupId', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const setup = await rrStorage.getSetupById(req.params.setupId);
      if (!setup || setup.guildId !== req.params.guildId) return res.status(404).json({ error: 'Setup not found' });

      await rrStorage.deleteSetup(setup._id);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Regen panel (repost message)
  router.post('/guild/:guildId/rr/setups/:setupId/regen', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const setup = await rrStorage.getSetupById(req.params.setupId);
      if (!setup || setup.guildId !== req.params.guildId) return res.status(404).json({ error: 'Setup not found' });

      const items = await rrStorage.listItems(setup._id);
      const channel = await client.channels.fetch(setup.channelId).catch(() => null);
      if (!channel) return res.status(404).json({ error: 'Channel not found' });

      const { sendOrUpdatePanel } = require('../commands/Utility/rr');
      await sendOrUpdatePanel(channel, setup, items, { client, user: { id: req.session.user.id } });
      
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Sync reactions
  router.post('/guild/:guildId/rr/setups/:setupId/sync', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const setup = await rrStorage.getSetupById(req.params.setupId);
      if (!setup || setup.guildId !== req.params.guildId) return res.status(404).json({ error: 'Setup not found' });

      const items = await rrStorage.listItems(setup._id);
      const channel = await client.channels.fetch(setup.channelId).catch(() => null);
      if (!channel) return res.status(404).json({ error: 'Channel not found' });

      const { syncReactions } = require('../commands/Utility/rr');
      await syncReactions(channel, setup, items);
      
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Add Item
  router.post('/guild/:guildId/rr/setups/:setupId/items', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const { emoji, emojiIdentifier, label, roleId, style, description } = req.body;
      const itemId = await rrStorage.addItem({
        setupId: req.params.setupId,
        emoji, emojiIdentifier, label, roleId, style, description
      });

      // Refresh panel in Discord
      try {
        const setup = await rrStorage.getSetupById(req.params.setupId);
        if (setup && setup.channel_id) {
          const { sendOrUpdatePanel } = require('../commands/Utility/rr');
          const channel = await client.channels.fetch(setup.channel_id).catch(() => null);
          if (channel && channel.isTextBased()) {
            const items = await rrStorage.listItems(req.params.setupId);
            await sendOrUpdatePanel(channel, setup, items, { client, user: req.session.user });
          }
        }
      } catch (err) {
        console.error('[RR API] Failed to refresh panel after add:', err.message);
      }

      res.json({ success: true, itemId });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Update Item
  router.patch('/guild/:guildId/rr/items/:itemId', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const { label, style, description, position } = req.body;
      await rrStorage.updateItem(req.params.itemId, { label, style, description, position });
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Delete Item
  router.delete('/guild/:guildId/rr/items/:itemId', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const item = await rrStorage.findItemById(req.params.itemId);
      const setupId = item?.setup_id;
      await rrStorage.removeItem(req.params.itemId);

      // Refresh panel in Discord if setup exists
      if (setupId) {
        try {
          const setup = await rrStorage.getSetupById(setupId);
          if (setup && setup.channel_id) {
            const { sendOrUpdatePanel } = require('../commands/Utility/rr');
            const channel = await client.channels.fetch(setup.channel_id).catch(() => null);
            if (channel && channel.isTextBased()) {
              const items = await rrStorage.listItems(setupId);
              await sendOrUpdatePanel(channel, setup, items, { client, user: req.session.user });
            }
          }
        } catch (err) {
          console.error('[RR API] Failed to refresh panel after delete:', err.message);
        }
      }

      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Clear all items in setup
  router.delete('/guild/:guildId/rr/setups/:setupId/items', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const setup = await rrStorage.getSetupById(req.params.setupId);
      if (!setup || setup.guildId !== req.params.guildId) return res.status(404).json({ error: 'Setup not found' });

      await rrStorage.clearAllItems(setup._id);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

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

function serializePlayer(player, client, guildId) {
  if (!player) return { active: false, guildId: guildId || null };
  
  // Try to get channel name from client cache
  const guild = client.guilds.cache.get(player.guildId);
  const channel = guild?.channels?.cache?.get(player.voiceId);

  return { 
    active: true, 
    guildId: player.guildId, 
    voiceId: player.voiceId, 
    channelName: channel?.name || 'Voice Channel',
    textId: player.textId, 
    playing: player.playing || false, 
    paused: player.paused || false, 
    pausedByEmptyVC: !!player.data?.get?.('pausedByEmptyVC'),
    position: player.position || 0, 
    volume: player.volume ?? 100, 
    loop: player.loop || 'none', 
    filter: player.data?.get?.('filter') || 'clear', 
    current: serializeTrack(player.queue?.current), 
    queueSize: player.queue?.size || 0, 
    queue: (Array.from(player.queue || [])).slice(0, 50).map((t, i) => ({ ...serializeTrack(t), position: i })) 
  };
}

module.exports = { createApiRouter, serializePlayer, serializeTrack };
