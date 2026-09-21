// src/dashboard/api.js — Backend API for Uranium Dashboard
const { Router } = require('express');
const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const ms = require('ms');
const rrStorage = require('../utils/rrStorage');
const modStorage = require('../utils/modStorage');
const automodStorage = require('../utils/automodStorage');
const { createSocketToken } = require('./socketAuth');

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

      req.guild = guild;
      req.member = member;
      next();
    } catch (err) { res.status(500).json({ error: err.message }); }
  };

  const requireMusicAccess = (req, res, next) => {
    if (!req.member.permissions.has([PermissionFlagsBits.Connect, PermissionFlagsBits.SendMessages])) {
      return res.status(403).json({ error: 'Missing Permissions: You need "Connect" and "Send Messages" to control music.' });
    }
    next();
  };

  const requireGuildAdmin = (req, res, next) => {
    if (!req.member.permissions.has(PermissionFlagsBits.ManageGuild) && !req.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return res.status(403).json({ error: 'Missing Permissions: Manage Server permission required.' });
    }
    next();
  };

  const requireGuildMod = (req, res, next) => {
    const p = req.member.permissions;
    if (
      !p.has(PermissionFlagsBits.Administrator) &&
      !p.has(PermissionFlagsBits.ManageGuild) &&
      !p.has(PermissionFlagsBits.KickMembers) &&
      !p.has(PermissionFlagsBits.BanMembers) &&
      !p.has(PermissionFlagsBits.ModerateMembers)
    ) {
      return res.status(403).json({ error: 'Missing Permissions: You need moderation permissions in this server.' });
    }
    next();
  };

  async function sendModLogEmbed(guild, embed) {
    try {
      const logChannelId = await modStorage.getLogChannel(guild.id);
      if (!logChannelId) return;
      const channel = await guild.channels.fetch(logChannelId).catch(() => null);
      if (channel && channel.isTextBased()) {
        await channel.send({ embeds: [embed] }).catch(() => null);
      }
    } catch (e) {
      console.warn('[Moderation API] Failed to send log embed:', e.message);
    }
  }

  function generateCaseId(guildId) {
    return `CASE-${guildId}-${Date.now().toString(36).toUpperCase()}`;
  }

  router.get('/me', (req, res) => {
    if (!req.session?.user) return res.status(401).json({ authenticated: false });
    res.json(req.session.user);
  });

  // The dashboard is hosted on Vercel while Socket.IO runs on Wispbyte. Vercel
  // rewrites do not proxy WebSocket upgrades, so authenticate the direct socket
  // connection with a short-lived token instead of a cross-site session cookie.
  router.get('/socket-token', (req, res) => {
    if (!req.session?.user) return res.status(401).json({ error: 'Not authenticated' });
    res.set('Cache-Control', 'no-store');
    res.json({ token: createSocketToken(req.session) });
  });

  router.get('/guilds', (req, res) => {
    if (!req.session?.user) return res.status(401).json({ error: 'Not authenticated' });
    const userGuilds = req.session.guilds || [];
    const botGuilds = client.guilds.cache;
    
    const mapped = userGuilds.map(g => ({
      ...g,
      isBotAdded: botGuilds.has(g.id),
      isAdmin: (BigInt(g.permissions) & PermissionFlagsBits.ManageGuild) === PermissionFlagsBits.ManageGuild
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

  router.post('/guild/:guildId/player/action', requireGuildAccess(client), requireMusicAccess, async (req, res) => {
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
  
  router.post('/guild/:guildId/queue/clear', requireGuildAccess(client), requireMusicAccess, async (req, res) => {
    const player = client.music?.players?.get(req.params.guildId);
    if (!player) return res.status(404).json({ error: 'No player' });
    player.queue.clear();
    res.json({ success: true });
    client.dashboardBridge?.emitPlayerUpdate(player);
  });

  router.post('/guild/:guildId/queue/remove', requireGuildAccess(client), requireMusicAccess, async (req, res) => {
    const { position } = req.body;
    const player = client.music?.players?.get(req.params.guildId);
    if (!player) return res.status(404).json({ error: 'No player' });
    if (typeof position !== 'number') return res.status(400).json({ error: 'Invalid position' });
    
    player.queue.remove(position);
    res.json({ success: true });
    client.dashboardBridge?.emitPlayerUpdate(player);
  });

  router.post('/guild/:guildId/queue/reorder', requireGuildAccess(client), requireMusicAccess, async (req, res) => {
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

  router.post('/guild/:guildId/play-track', requireGuildAccess(client), requireMusicAccess, async (req, res) => {
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

  // Server roles for role selector
  router.get('/guild/:guildId/roles', requireGuildAccess(client), async (req, res) => {
    const guild = req.guild;
    await guild.roles.fetch();

    const roles = guild.roles.cache
      .filter(role => role.id !== guild.id && !role.managed)
      .map(role => ({
        id: role.id,
        name: role.name,
        color: role.hexColor,
        position: role.position
      }))
      .sort((a, b) => b.position - a.position);

    res.json(roles);
  });

  router.post('/guild/:guildId/player/join', requireGuildAccess(client), requireMusicAccess, async (req, res) => {
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
      if (!targetChannel.permissionsFor(botMember).has([PermissionFlagsBits.Connect, PermissionFlagsBits.Speak])) {
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

  router.get(['/bot/stats', '/stats'], async (req, res) => {
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
      if (!setup || setup.guild_id !== req.params.guildId) return res.status(404).json({ error: 'Setup not found' });
      
      const items = await rrStorage.listItems(setup.id);
      const stats = await rrStorage.getSetupStats(setup.id);
      
      res.json({ setup, items, stats });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Update setup config/metadata
  router.patch('/guild/:guildId/rr/setups/:setupId', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const { title, description, config } = req.body;
      const setup = await rrStorage.getSetupById(req.params.setupId);
      if (!setup || setup.guild_id !== req.params.guildId) return res.status(404).json({ error: 'Setup not found' });

      await rrStorage.updateSetupConfig(setup.id, { title, description, config });
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Delete setup
  router.delete('/guild/:guildId/rr/setups/:setupId', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const setup = await rrStorage.getSetupById(req.params.setupId);
      if (!setup || setup.guild_id !== req.params.guildId) return res.status(404).json({ error: 'Setup not found' });

      // Attempt to delete from Discord
      if (setup.channel_id && setup.message_id) {
        try {
          const channel = await client.channels.fetch(setup.channel_id).catch(() => null);
          if (channel && channel.isTextBased()) {
            const msg = await channel.messages.fetch(setup.message_id).catch(() => null);
            if (msg) await msg.delete().catch(() => null);
          }
        } catch (err) {
          console.error('[RR API] Failed to delete message from Discord:', err.message);
        }
      }

      await rrStorage.deleteSetup(setup.id);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Regen panel (delete old + repost)
  router.post('/guild/:guildId/rr/setups/:setupId/regen', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const setup = await rrStorage.getSetupById(req.params.setupId);
      if (!setup || setup.guild_id !== req.params.guildId) return res.status(404).json({ error: 'Setup not found' });

      const channel = await client.channels.fetch(setup.channel_id).catch(() => null);
      if (!channel) return res.status(404).json({ error: 'Channel not found' });

      // Delete old message if exists
      if (setup.message_id) {
        try {
          const oldMsg = await channel.messages.fetch(setup.message_id).catch(() => null);
          if (oldMsg) await oldMsg.delete().catch(() => null);
        } catch (err) { console.error('[RR API] Regen delete failed:', err.message); }
      }

      // Important: clear message_id so sendOrUpdatePanel sends a fresh one
      const tempSetup = { ...setup, message_id: null };
      const items = await rrStorage.listItems(setup.id);
      
      const { sendOrUpdatePanel } = require('../commands/Utility/rr');
      await sendOrUpdatePanel(channel, tempSetup, items, { client, user: { id: req.session.user.id } });
      
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Sync panel (edit message & sync reactions if needed)
  router.post('/guild/:guildId/rr/setups/:setupId/sync', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const setup = await rrStorage.getSetupById(req.params.setupId);
      if (!setup || setup.guild_id !== req.params.guildId) return res.status(404).json({ error: 'Setup not found' });

      const items = await rrStorage.listItems(setup.id);
      const channel = await client.channels.fetch(setup.channel_id).catch(() => null);
      if (!channel) return res.status(404).json({ error: 'Channel not found' });

      const { sendOrUpdatePanel } = require('../commands/Utility/rr');
      await sendOrUpdatePanel(channel, setup, items, { client, user: { id: req.session.user.id } });
      
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
      if (!setup || setup.guild_id !== req.params.guildId) return res.status(404).json({ error: 'Setup not found' });

      await rrStorage.clearAllItems(setup.id);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ---------- BOT SETTINGS API ----------
  router.get('/guild/:guildId/settings/nickname', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const guild = await client.guilds.fetch(req.params.guildId).catch(() => null);
      if (!guild) return res.status(404).json({ error: 'Guild not found' });
      const nickname = guild.members.me?.nickname || '';
      res.json({ nickname, username: client.user.username });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/guild/:guildId/settings/nickname', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const { nickname } = req.body;
      const guild = await client.guilds.fetch(req.params.guildId).catch(() => null);
      if (!guild) return res.status(404).json({ error: 'Guild not found' });
      
      if (!guild.members.me.permissions.has(PermissionFlagsBits.ChangeNickname)) {
        return res.status(403).json({ error: 'Bot is missing the Change Nickname permission in this server.' });
      }

      await guild.members.me.setNickname(nickname === '' ? null : nickname);
      res.json({ success: true, nickname: guild.members.me.nickname || '' });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.get('/guild/:guildId/settings/language', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const { getServerSettings } = require('../database/settings');
      const settings = await getServerSettings(req.params.guildId);
      res.json({ botLanguage: settings.botLanguage || 'en' });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  router.post('/guild/:guildId/settings/language', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const { botLanguage } = req.body;
      const { setBotLanguage } = require('../database/settings');
      await setBotLanguage(req.params.guildId, botLanguage);
      res.json({ success: true, botLanguage });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ---------- MODERATION SUITE API ----------

  // Moderation overview stats
  router.get('/guild/:guildId/moderation/overview', requireGuildAccess(client), requireGuildMod, async (req, res) => {
    try {
      const guild = req.guild;
      const stats = await modStorage.getModerationStats(guild.id);
      const automodCfg = await automodStorage.getConfig(guild.id);
      const bans = await guild.bans.fetch().catch(() => new Map());
      const logChannelId = await modStorage.getLogChannel(guild.id);
      const logChannel = logChannelId ? guild.channels.cache.get(logChannelId) : null;
      
      const activeAutomodRules = Object.entries(automodCfg || {}).filter(([k, v]) => v && v.enabled).length;

      res.json({
        stats,
        banCount: bans.size,
        activeAutomodRules,
        logChannel: logChannel ? { id: logChannel.id, name: logChannel.name } : null,
        serverName: guild.name,
        memberCount: guild.memberCount
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Moderation cases (paginated, filterable, searchable)
  router.get('/guild/:guildId/moderation/cases', requireGuildAccess(client), requireGuildMod, async (req, res) => {
    try {
      const { page = 1, limit = 20, action, search } = req.query;
      const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
      const result = await modStorage.getCasesByGuild(req.params.guildId, {
        limit: Math.min(100, Math.max(1, parseInt(limit))),
        offset,
        action: action && action !== 'all' ? action : null,
        search: search ? search.trim() : null
      });

      const enrichedCases = await Promise.all(result.cases.map(async (c) => {
        let targetTag = c.targetId;
        let moderatorTag = c.moderatorId;
        try {
          const targetUser = await client.users.fetch(c.targetId).catch(() => null);
          if (targetUser) targetTag = targetUser.tag || targetUser.username;
        } catch {}
        try {
          const modUser = await client.users.fetch(c.moderatorId).catch(() => null);
          if (modUser) moderatorTag = modUser.tag || modUser.username;
        } catch {}
        return {
          ...c,
          targetTag,
          moderatorTag
        };
      }));

      res.json({
        total: result.total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(result.total / parseInt(limit)),
        cases: enrichedCases
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Direct Live Moderation Action
  router.post('/guild/:guildId/moderation/action', requireGuildAccess(client), requireGuildMod, async (req, res) => {
    const { action, targetId, reason = 'No reason provided', duration, deleteMessageSeconds, nickname, roleId, roleAction, text } = req.body;
    const guild = req.guild;
    const moderator = req.session.user;

    if (!targetId && action !== 'purge') {
      return res.status(400).json({ error: 'Target ID is required' });
    }

    try {
      const caseId = generateCaseId(guild.id);
      let logEmbed = null;

      switch (action) {
        case 'warn': {
          await modStorage.saveCase({
            caseId,
            guildId: guild.id,
            moderatorId: moderator.id,
            targetId,
            action: 'warn',
            reason,
            duration: null,
            timestamp: Date.now()
          });

          logEmbed = new EmbedBuilder()
            .setTitle('⚠️ Warning Issued (Dashboard)')
            .setColor(0xFEE75C)
            .addFields(
              { name: 'Target', value: `<@${targetId}> (${targetId})`, inline: true },
              { name: 'Moderator', value: `<@${moderator.id}>`, inline: true },
              { name: 'Reason', value: reason }
            )
            .setFooter({ text: `Case ID: ${caseId}` })
            .setTimestamp();
          break;
        }

        case 'kick': {
          const targetMember = await guild.members.fetch(targetId).catch(() => null);
          if (!targetMember) return res.status(404).json({ error: 'Member not found in this server.' });
          if (!targetMember.kickable) {
            return res.status(403).json({ error: 'Cannot kick this member: they have higher or equal role hierarchy than the bot.' });
          }

          await targetMember.kick(`[Dashboard by ${moderator.username}] ${reason}`);
          await modStorage.saveCase({
            caseId,
            guildId: guild.id,
            moderatorId: moderator.id,
            targetId,
            action: 'kick',
            reason,
            duration: null,
            timestamp: Date.now()
          });

          logEmbed = new EmbedBuilder()
            .setTitle('👢 Member Kicked (Dashboard)')
            .setColor(0xED4245)
            .addFields(
              { name: 'Target', value: `<@${targetId}> (${targetId})`, inline: true },
              { name: 'Moderator', value: `<@${moderator.id}>`, inline: true },
              { name: 'Reason', value: reason }
            )
            .setFooter({ text: `Case ID: ${caseId}` })
            .setTimestamp();
          break;
        }

        case 'ban':
        case 'tempban': {
          const targetMember = await guild.members.fetch(targetId).catch(() => null);
          if (targetMember && !targetMember.bannable) {
            return res.status(403).json({ error: 'Cannot ban this member: they have higher or equal role hierarchy than the bot.' });
          }

          const parsedDuration = duration ? (typeof duration === 'number' ? duration : ms(duration)) : null;
          const delSec = Math.min(604800, Math.max(0, parseInt(deleteMessageSeconds) || 0));

          await guild.members.ban(targetId, {
            reason: `[Dashboard by ${moderator.username}] ${reason}`,
            deleteMessageSeconds: delSec
          });

          if (parsedDuration && parsedDuration > 0) {
            await modStorage.saveScheduledTask({
              guildId: guild.id,
              userId: targetId,
              action: 'unban',
              expiresAt: Date.now() + parsedDuration,
              caseId
            });
          }

          await modStorage.saveCase({
            caseId,
            guildId: guild.id,
            moderatorId: moderator.id,
            targetId,
            action: parsedDuration ? 'tempban' : 'ban',
            reason,
            duration: parsedDuration || null,
            timestamp: Date.now()
          });

          logEmbed = new EmbedBuilder()
            .setTitle(parsedDuration ? '⏳ Member Temporarily Banned (Dashboard)' : '🔨 Member Banned (Dashboard)')
            .setColor(0xED4245)
            .addFields(
              { name: 'Target', value: `<@${targetId}> (${targetId})`, inline: true },
              { name: 'Moderator', value: `<@${moderator.id}>`, inline: true },
              { name: 'Reason', value: reason },
              ...(parsedDuration ? [{ name: 'Duration', value: ms(parsedDuration, { long: true }), inline: true }] : [])
            )
            .setFooter({ text: `Case ID: ${caseId}` })
            .setTimestamp();
          break;
        }

        case 'unban': {
          await guild.members.unban(targetId, `[Dashboard by ${moderator.username}] ${reason}`);
          await modStorage.saveCase({
            caseId,
            guildId: guild.id,
            moderatorId: moderator.id,
            targetId,
            action: 'unban',
            reason,
            duration: null,
            timestamp: Date.now()
          });

          logEmbed = new EmbedBuilder()
            .setTitle('🔓 Member Unbanned (Dashboard)')
            .setColor(0x57F287)
            .addFields(
              { name: 'Target', value: `<@${targetId}> (${targetId})`, inline: true },
              { name: 'Moderator', value: `<@${moderator.id}>`, inline: true },
              { name: 'Reason', value: reason }
            )
            .setFooter({ text: `Case ID: ${caseId}` })
            .setTimestamp();
          break;
        }

        case 'timeout':
        case 'mute': {
          const targetMember = await guild.members.fetch(targetId).catch(() => null);
          if (!targetMember) return res.status(404).json({ error: 'Member not found in this server.' });
          if (!targetMember.moderatable) {
            return res.status(403).json({ error: 'Cannot timeout this member: they have higher or equal role hierarchy than the bot.' });
          }

          const parsedMs = duration ? (typeof duration === 'number' ? duration : ms(duration)) : (10 * 60 * 1000);
          if (!parsedMs || parsedMs < 1000 || parsedMs > 28 * 86400 * 1000) {
            return res.status(400).json({ error: 'Invalid duration. Must be between 1 second and 28 days.' });
          }

          await targetMember.timeout(parsedMs, `[Dashboard by ${moderator.username}] ${reason}`);
          await modStorage.saveCase({
            caseId,
            guildId: guild.id,
            moderatorId: moderator.id,
            targetId,
            action: 'timeout',
            reason,
            duration: parsedMs,
            timestamp: Date.now()
          });

          logEmbed = new EmbedBuilder()
            .setTitle('⏳ Member Timed Out (Dashboard)')
            .setColor(0xE67E22)
            .addFields(
              { name: 'Target', value: `<@${targetId}> (${targetId})`, inline: true },
              { name: 'Moderator', value: `<@${moderator.id}>`, inline: true },
              { name: 'Duration', value: ms(parsedMs, { long: true }), inline: true },
              { name: 'Reason', value: reason }
            )
            .setFooter({ text: `Case ID: ${caseId}` })
            .setTimestamp();
          break;
        }

        case 'unmute': {
          const targetMember = await guild.members.fetch(targetId).catch(() => null);
          if (!targetMember) return res.status(404).json({ error: 'Member not found in this server.' });
          if (!targetMember.moderatable) {
            return res.status(403).json({ error: 'Cannot remove timeout: role hierarchy too high.' });
          }

          await targetMember.timeout(null, `[Dashboard by ${moderator.username}] ${reason}`);
          await modStorage.saveCase({
            caseId,
            guildId: guild.id,
            moderatorId: moderator.id,
            targetId,
            action: 'unmute',
            reason,
            duration: null,
            timestamp: Date.now()
          });

          logEmbed = new EmbedBuilder()
            .setTitle('🔊 Timeout Removed (Dashboard)')
            .setColor(0x57F287)
            .addFields(
              { name: 'Target', value: `<@${targetId}> (${targetId})`, inline: true },
              { name: 'Moderator', value: `<@${moderator.id}>`, inline: true },
              { name: 'Reason', value: reason }
            )
            .setFooter({ text: `Case ID: ${caseId}` })
            .setTimestamp();
          break;
        }

        case 'softban': {
          const targetMember = await guild.members.fetch(targetId).catch(() => null);
          if (targetMember && !targetMember.bannable) {
            return res.status(403).json({ error: 'Cannot softban this member: higher or equal role hierarchy.' });
          }

          await guild.members.ban(targetId, {
            reason: `[Softban by ${moderator.username}] ${reason}`,
            deleteMessageSeconds: 7 * 86400
          });
          await guild.members.unban(targetId, 'Softban cleanup unban');

          await modStorage.saveCase({
            caseId,
            guildId: guild.id,
            moderatorId: moderator.id,
            targetId,
            action: 'softban',
            reason,
            duration: null,
            timestamp: Date.now()
          });

          logEmbed = new EmbedBuilder()
            .setTitle('🧹 Member Softbanned (Dashboard)')
            .setColor(0x9B59B6)
            .addFields(
              { name: 'Target', value: `<@${targetId}> (${targetId})`, inline: true },
              { name: 'Moderator', value: `<@${moderator.id}>`, inline: true },
              { name: 'Reason', value: reason }
            )
            .setFooter({ text: `Case ID: ${caseId}` })
            .setTimestamp();
          break;
        }

        case 'nickname': {
          const targetMember = await guild.members.fetch(targetId).catch(() => null);
          if (!targetMember) return res.status(404).json({ error: 'Member not found in this server.' });
          if (!targetMember.manageable) {
            return res.status(403).json({ error: 'Cannot change nickname: member has higher or equal role hierarchy than the bot.' });
          }

          const oldNick = targetMember.nickname || targetMember.user.username;
          await targetMember.setNickname(nickname || null, `[Dashboard by ${moderator.username}] ${reason}`);
          
          await modStorage.saveCase({
            caseId,
            guildId: guild.id,
            moderatorId: moderator.id,
            targetId,
            action: 'nickname',
            reason: `${reason} (Old: "${oldNick}" → New: "${nickname || 'Reset'}")`,
            duration: null,
            timestamp: Date.now()
          });

          logEmbed = new EmbedBuilder()
            .setTitle('📝 Nickname Changed (Dashboard)')
            .setColor(0x3498DB)
            .addFields(
              { name: 'Target', value: `<@${targetId}> (${targetId})`, inline: true },
              { name: 'Moderator', value: `<@${moderator.id}>`, inline: true },
              { name: 'Old Nickname', value: oldNick, inline: true },
              { name: 'New Nickname', value: nickname || 'Reset to Username', inline: true },
              { name: 'Reason', value: reason }
            )
            .setFooter({ text: `Case ID: ${caseId}` })
            .setTimestamp();
          break;
        }

        case 'role': {
          const targetMember = await guild.members.fetch(targetId).catch(() => null);
          if (!targetMember) return res.status(404).json({ error: 'Member not found in this server.' });
          if (!roleId) return res.status(400).json({ error: 'Role ID required' });
          const role = guild.roles.cache.get(roleId);
          if (!role) return res.status(404).json({ error: 'Role not found' });
          if (role.position >= guild.members.me.roles.highest.position) {
            return res.status(403).json({ error: 'Bot cannot manage this role: role is equal to or higher than bot highest role.' });
          }

          if (roleAction === 'remove') {
            await targetMember.roles.remove(roleId, `[Dashboard by ${moderator.username}] ${reason}`);
          } else {
            await targetMember.roles.add(roleId, `[Dashboard by ${moderator.username}] ${reason}`);
          }

          await modStorage.saveCase({
            caseId,
            guildId: guild.id,
            moderatorId: moderator.id,
            targetId,
            action: roleAction === 'remove' ? 'role-remove' : 'role-add',
            reason: `${reason} (Role: @${role.name})`,
            duration: null,
            timestamp: Date.now()
          });

          logEmbed = new EmbedBuilder()
            .setTitle(`🏷️ Role ${roleAction === 'remove' ? 'Removed' : 'Added'} (Dashboard)`)
            .setColor(0x3498DB)
            .addFields(
              { name: 'Target', value: `<@${targetId}> (${targetId})`, inline: true },
              { name: 'Moderator', value: `<@${moderator.id}>`, inline: true },
              { name: 'Role', value: `<@&${roleId}> (${role.name})`, inline: true },
              { name: 'Reason', value: reason }
            )
            .setFooter({ text: `Case ID: ${caseId}` })
            .setTimestamp();
          break;
        }

        case 'note': {
          await modStorage.saveCase({
            caseId,
            guildId: guild.id,
            moderatorId: moderator.id,
            targetId,
            action: 'note',
            reason: text || reason,
            duration: null,
            timestamp: Date.now()
          });

          logEmbed = new EmbedBuilder()
            .setTitle('📋 Moderator Note Added (Dashboard)')
            .setColor(0x7289DA)
            .addFields(
              { name: 'Target', value: `<@${targetId}> (${targetId})`, inline: true },
              { name: 'Moderator', value: `<@${moderator.id}>`, inline: true },
              { name: 'Note', value: text || reason }
            )
            .setFooter({ text: `Case ID: ${caseId}` })
            .setTimestamp();
          break;
        }

        default:
          return res.status(400).json({ error: `Unknown moderation action: ${action}` });
      }

      if (logEmbed) {
        await sendModLogEmbed(guild, logEmbed);
      }

      res.json({ success: true, caseId, action });
    } catch (err) {
      console.error('[Moderation API] Action error:', err);
      res.status(500).json({ error: err.message || 'Failed to execute moderation action' });
    }
  });

  // Channel Moderation Action (Purge, Lockdown, Unlock, Slowmode)
  router.post('/guild/:guildId/moderation/channel-action', requireGuildAccess(client), requireGuildMod, async (req, res) => {
    const { action, channelId, count, filter = 'all', reason = 'Dashboard channel action', seconds } = req.body;
    const guild = req.guild;
    const moderator = req.session.user;

    const channel = guild.channels.cache.get(channelId);
    if (!channel || !channel.isTextBased()) {
      return res.status(404).json({ error: 'Text channel not found' });
    }

    try {
      switch (action) {
        case 'purge': {
          const deleteCount = Math.min(100, Math.max(1, parseInt(count) || 10));
          const messages = await channel.messages.fetch({ limit: deleteCount });
          
          let toDelete = messages;
          if (filter === 'bots') toDelete = messages.filter(m => m.author.bot);
          else if (filter === 'users') toDelete = messages.filter(m => !m.author.bot);
          else if (filter === 'links') toDelete = messages.filter(m => /(https?:\/\/[^\s]+)/g.test(m.content));
          else if (filter === 'attachments') toDelete = messages.filter(m => m.attachments.size > 0);

          const now = Date.now();
          const validMessages = toDelete.filter(m => now - m.createdTimestamp < 14 * 86400 * 1000);

          const deleted = await channel.bulkDelete(validMessages, true);
          
          const embed = new EmbedBuilder()
            .setTitle('🧹 Messages Purged (Dashboard)')
            .setColor(0xE67E22)
            .addFields(
              { name: 'Channel', value: `<#${channel.id}>`, inline: true },
              { name: 'Moderator', value: `<@${moderator.id}>`, inline: true },
              { name: 'Count', value: `${deleted.size} messages`, inline: true },
              { name: 'Filter', value: filter, inline: true }
            )
            .setTimestamp();
          await sendModLogEmbed(guild, embed);

          return res.json({ success: true, deleted: deleted.size });
        }

        case 'lockdown': {
          await channel.permissionOverwrites.edit(guild.roles.everyone, {
            SendMessages: false,
            SendMessagesInThreads: false
          }, { reason: `[Lockdown by ${moderator.username}] ${reason}` });

          const embed = new EmbedBuilder()
            .setTitle('🔒 Channel Locked Down (Dashboard)')
            .setColor(0xED4245)
            .addFields(
              { name: 'Channel', value: `<#${channel.id}>`, inline: true },
              { name: 'Moderator', value: `<@${moderator.id}>`, inline: true },
              { name: 'Reason', value: reason }
            )
            .setTimestamp();
          await sendModLogEmbed(guild, embed);

          return res.json({ success: true, locked: true });
        }

        case 'unlock': {
          await channel.permissionOverwrites.edit(guild.roles.everyone, {
            SendMessages: null,
            SendMessagesInThreads: null
          }, { reason: `[Unlock by ${moderator.username}] ${reason}` });

          const embed = new EmbedBuilder()
            .setTitle('🔓 Channel Unlocked (Dashboard)')
            .setColor(0x57F287)
            .addFields(
              { name: 'Channel', value: `<#${channel.id}>`, inline: true },
              { name: 'Moderator', value: `<@${moderator.id}>`, inline: true },
              { name: 'Reason', value: reason }
            )
            .setTimestamp();
          await sendModLogEmbed(guild, embed);

          return res.json({ success: true, locked: false });
        }

        case 'slowmode': {
          const sec = Math.min(21600, Math.max(0, parseInt(seconds) || 0));
          await channel.setRateLimitPerUser(sec, `[Dashboard Slowmode by ${moderator.username}]`);

          return res.json({ success: true, slowmode: sec });
        }

        default:
          return res.status(400).json({ error: `Unknown channel action: ${action}` });
      }
    } catch (err) {
      res.status(500).json({ error: err.message || 'Channel action failed' });
    }
  });

  // Delete Case / Unwarn
  router.delete('/guild/:guildId/moderation/cases/:caseId', requireGuildAccess(client), requireGuildMod, async (req, res) => {
    try {
      const deleted = await modStorage.deleteCase(req.params.guildId, req.params.caseId);
      if (!deleted) return res.status(404).json({ error: 'Case not found' });

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update Case Reason
  router.patch('/guild/:guildId/moderation/cases/:caseId', requireGuildAccess(client), requireGuildMod, async (req, res) => {
    try {
      const { reason } = req.body;
      if (!reason) return res.status(400).json({ error: 'Reason is required' });

      await modStorage.updateCase(req.params.guildId, req.params.caseId, { reason });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Active Discord Bans list
  router.get('/guild/:guildId/moderation/bans', requireGuildAccess(client), requireGuildMod, async (req, res) => {
    try {
      const bans = await req.guild.bans.fetch().catch(() => new Map());
      const mapped = Array.from(bans.values()).map(b => ({
        user: {
          id: b.user.id,
          username: b.user.username,
          tag: b.user.tag || b.user.username,
          avatar: b.user.displayAvatarURL ? b.user.displayAvatarURL({ size: 64 }) : null
        },
        reason: b.reason || 'No reason specified'
      }));
      res.json(mapped);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Search server members
  router.get('/guild/:guildId/moderation/search-members', requireGuildAccess(client), requireGuildMod, async (req, res) => {
    try {
      const query = (req.query.q || '').trim();
      let members;
      if (query.length > 0) {
        members = await req.guild.members.search({ query, limit: 25 }).catch(() => new Map());
      } else {
        members = req.guild.members.cache.first(25);
      }

      const list = Array.from(members.values ? members.values() : (Array.isArray(members) ? members : [])).map(m => ({
        id: m.id,
        username: m.user.username,
        displayName: m.displayName,
        tag: m.user.tag || m.user.username,
        avatar: m.displayAvatarURL({ size: 64 }),
        bot: m.user.bot,
        roles: m.roles.cache.filter(r => r.id !== req.guild.id).map(r => ({ id: r.id, name: r.name, color: r.hexColor }))
      }));

      res.json(list);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Automod Settings API
  router.get('/guild/:guildId/moderation/automod', requireGuildAccess(client), requireGuildMod, async (req, res) => {
    try {
      const cfg = await automodStorage.getConfig(req.params.guildId);
      res.json(cfg);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/guild/:guildId/moderation/automod', requireGuildAccess(client), requireGuildMod, async (req, res) => {
    try {
      await automodStorage.setConfig(req.params.guildId, req.body);
      const updated = await automodStorage.getConfig(req.params.guildId);
      res.json({ success: true, config: updated });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Moderation General Settings (Log Channel, Mod Roles, Muted Role)
  router.get('/guild/:guildId/moderation/settings', requireGuildAccess(client), requireGuildMod, async (req, res) => {
    try {
      const guildId = req.params.guildId;
      const [logChannel, mutedRole, modRoles] = await Promise.all([
        modStorage.getLogChannel(guildId),
        modStorage.getMutedRoleId(guildId),
        modStorage.getModRoles(guildId)
      ]);
      res.json({ logChannel, mutedRole, modRoles });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/guild/:guildId/moderation/settings', requireGuildAccess(client), requireGuildMod, async (req, res) => {
    try {
      const guildId = req.params.guildId;
      const { logChannel, mutedRole, modRoles } = req.body;
      
      if (logChannel !== undefined) {
        await modStorage.setLogChannel(guildId, logChannel || null);
      }
      if (mutedRole !== undefined) {
        await modStorage.setMutedRoleId(guildId, mutedRole || null);
      }
      if (Array.isArray(modRoles)) {
        const current = await modStorage.getModRoles(guildId);
        for (const r of current) {
          if (!modRoles.includes(r)) await modStorage.removeModRole(guildId, r);
        }
        for (const r of modRoles) {
          if (!current.includes(r)) await modStorage.addModRole(guildId, r);
        }
      }

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
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
  const guild = client?.guilds?.cache?.get(player.guildId);
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
