// src/dashboard/api.js — Backend API for Uranium Dashboard
const { Router } = require('express');
const { PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const ms = require('ms');
const rrStorage = require('../utils/rrStorage');
const modStorage = require('../utils/modStorage');
const automodStorage = require('../utils/automodStorage');
const welcomeStorage = require('../utils/welcomeStorage');
const { generateWelcomeCard } = require('../utils/welcomeCardRenderer');
const personalizationStorage = require('../utils/personalizationStorage');
const playlistStorage = require('../utils/playlistStorage');
const { isPremiumGuild, isPremiumUser, redeemCode, listPremiumGuilds } = require('../utils/premium');
const verificationUtils = require('../utils/verification');
const { createSocketToken } = require('./socketAuth');
const notificationsManager = require('../utils/notificationsManager');
const statusWatcher = require('../utils/statusWatcher');

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
    if (req.guild.ownerId === req.member.id) return next();
    if (!req.member.permissions.has(PermissionFlagsBits.ManageGuild) && !req.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return res.status(403).json({ error: 'Missing Permissions: Manage Server permission required.' });
    }
    next();
  };

  const requireGuildMod = (req, res, next) => {
    if (req.guild.ownerId === req.member.id) return next();
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

  // Ping endpoint to verify moderation API availability
  router.get('/moderation/ping', (req, res) => {
    res.json({ ok: true, module: 'moderation', timestamp: Date.now() });
  });

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

  // The dashboard is hosted on Vercel while the bot backend and Socket.IO run on
  // the bot host (VisiHost). Authenticate socket connections with a short-lived signed
  // token instead of relying on cross-site session cookies.
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

      const isPremiumCmd = (cmdName) => {
        const lower = cmdName.toLowerCase();
        // Fully premium-based commands only (/backup is free)
        if (lower.startsWith('/ytverify')) return true;
        if (lower.startsWith('/ai') && !lower.includes('help')) return true;
        return false;
      };
      
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
              const cleanName = (name || '').trim();
              return { 
                name: cleanName, 
                description: (desc || '').trim(),
                isPremium: isPremiumCmd(cleanName)
              };
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
        case 'previous': {
          const previous = player.getPrevious?.(true) || player.queue.previous?.shift();
          if (previous) {
            if (player.queue.current) player.queue.unshift(player.queue.current);
            player.queue.unshift(previous);
            await player.skip();
          }
          break;
        }
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
        case 'autoplay': {
          const cur = !!player.data.get('autoplay');
          player.data.set('autoplay', !cur);
          break;
        }
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

  const playRoutePaths = [
    '/guild/:guildId/play-track',
    '/guild/:guildId/play-track/',
    '/guild/:guildId/search/play',
    '/guild/:guildId/search/play/',
    '/guild/:guildId/play',
    '/guild/:guildId/play/'
  ];

  router.post(playRoutePaths, requireGuildAccess(client), requireMusicAccess, async (req, res) => {
    const guildId = req.params.guildId;
    const { track, mode } = req.body;
    const query = req.body.query || (track ? (track.uri || `${track.title || ''} ${track.author || ''}`.trim()) : null);

    if (!query) {
      return res.status(400).json({ error: 'No track or search query provided.' });
    }

    // Check or auto-join player
    let player = client.music?.players?.get(guildId);
    if (!player) {
      const voiceChannelId = req.member.voice?.channelId;
      if (!voiceChannelId) {
        return res.status(400).json({ 
          error: 'Please join a voice channel in Discord first so Uranium knows where to play!' 
        });
      }

      const targetChannel = req.guild.channels.cache.get(voiceChannelId);
      if (targetChannel) {
        const botMember = req.guild.members.me;
        if (!targetChannel.permissionsFor(botMember)?.has([PermissionFlagsBits.Connect, PermissionFlagsBits.Speak])) {
          return res.status(403).json({ error: 'I do not have permission to join or speak in your voice channel.' });
        }
      }

      const { createPlayer } = require('../music/service');
      player = await createPlayer(client, guildId, voiceChannelId, req.body.textChannelId || null);
    } else {
      // If player already active in a voice channel, verify user isn't in a different voice channel
      const userVoiceId = req.member.voice?.channelId;
      if (player.voiceId && userVoiceId && player.voiceId !== userVoiceId) {
        return res.status(403).json({ error: 'You must be in the same voice channel as Uranium to queue music.' });
      }
    }

    try {
      const { searchTracks } = require('../music/service');
      
      let result = await searchTracks(client, query, { id: req.session.user.id });

      // If direct query resolution returned no tracks and a track object was provided, try searching by title + author
      if (!result.tracks?.length && track && (track.title || track.author)) {
        const fallbackQuery = `${track.title || ''} ${track.author || ''}`.trim();
        if (fallbackQuery && fallbackQuery !== query) {
          result = await searchTracks(client, fallbackQuery, { id: req.session.user.id });
        }
      }

      if (!result.tracks?.length) {
        console.warn(`[API] Search failed to resolve track: ${query}`);
        return res.status(404).json({ error: 'Track could not be resolved. Please try a different song or query.' });
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

      res.json({ success: true, track: serializeTrack(resolvedTrack) });
      setImmediate(async () => {
        client.dashboardBridge?.emitPlayerUpdate(player);
      });
    } catch (err) {
      console.error('[API] PlayTrack error:', err);
      res.status(500).json({ error: err.message || 'An error occurred while queueing the track.' });
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
        ping: typeof ping === 'number' && ping >= 0 ? Math.round(ping) : 0,
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

  // ---------- NOTIFICATIONS API (Header Notification Panel) ----------
  router.get('/notifications', (req, res) => {
    try {
      const items = notificationsManager.getNotifications();
      res.json(items);
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  });

  router.post('/notifications', (req, res) => {
    try {
      const { title, message, type, badge, durationDays, link, linkText } = req.body;
      if (!title || !message) {
        return res.status(400).json({ error: 'Title and message are required' });
      }
      const item = notificationsManager.addNotification({
        title,
        message,
        type: type || 'info',
        badge: badge || 'Notice',
        durationDays: durationDays ? parseInt(durationDays) : 14,
        link,
        linkText
      });
      res.json({ success: true, notification: item });
    } catch (e) {
      res.status(500).json({ error: 'Failed to create notification' });
    }
  });

  router.delete('/notifications/:id', (req, res) => {
    try {
      const deleted = notificationsManager.deleteNotification(req.params.id);
      res.json({ success: deleted });
    } catch (e) {
      res.status(500).json({ error: 'Failed to delete notification' });
    }
  });

  // ---------- REAL-TIME STATUS & ALERTS API (Uranium Watcher) ----------
  router.get('/status', (req, res) => {
    try {
      statusWatcher.updateTelemetry(client);
      const data = statusWatcher.getStatusData();
      const uptimeMs = client.uptime || 0;
      const ping = typeof client.ws?.ping === 'number' && client.ws.ping >= 0 ? Math.round(client.ws.ping) : 0;

      res.json({
        overallStatus: data.overallStatus || 'operational',
        lastUpdated: data.lastUpdated,
        components: data.components,
        alerts: data.alerts || [],     // automatically pruned to < 30 days
        notices: data.notices || [],   // automatically pruned to < 6 months
        uptime: formatUptime(uptimeMs),
        uptimeSeconds: Math.floor(uptimeMs / 1000),
        servers: client.guilds.cache.size,
        ping
      });
    } catch (e) {
      res.status(500).json({ error: 'Failed to load status telemetry' });
    }
  });

  router.post('/status/notice', (req, res) => {
    try {
      const { title, message, severity, poster } = req.body;
      if (!title || !message) {
        return res.status(400).json({ error: 'Title and message required' });
      }
      const notice = statusWatcher.addManualNotice({
        title,
        message,
        severity: severity || 'notice',
        poster: poster || req.session?.user?.username || 'System Admin',
        type: 'manual'
      });
      res.json({ success: true, notice });
    } catch (e) {
      res.status(500).json({ error: 'Failed to create status notice' });
    }
  });

  router.post('/status/resolve', (req, res) => {
    try {
      const poster = req.session?.user?.username || 'System Admin';
      const updated = statusWatcher.resolveAllAlerts(poster);
      res.json({ success: true, status: updated });
    } catch (e) {
      res.status(500).json({ error: 'Failed to resolve incidents' });
    }
  });

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

  // Helper to convert image URL or data URI to base64 Data URI for Discord API
  async function resolveImageToDataUri(input) {
    if (!input || typeof input !== 'string') return null;
    const trimmed = input.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('data:')) return trimmed;

    try {
      const axios = require('axios');
      const response = await axios.get(trimmed, {
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) UraniumBot/1.0'
        }
      });

      const contentType = (response.headers['content-type'] || 'image/png').split(';')[0].trim();
      const base64 = Buffer.from(response.data).toString('base64');
      return `data:${contentType};base64,${base64}`;
    } catch (err) {
      throw new Error(`Failed to download image from URL: ${err.message}`);
    }
  }

  // ---------- BOT PERSONALIZER API (PER-SERVER PROFILE) ----------
  router.get('/guild/:guildId/personalization', requireGuildAccess(client), async (req, res) => {
    try {
      const guildId = req.params.guildId;
      const guild = await client.guilds.fetch(guildId).catch(() => null);
      if (!guild) return res.status(404).json({ error: 'Guild not found' });

      const isPremium = !!isPremiumGuild(guildId);
      const personalization = await personalizationStorage.getPersonalization(guildId);
      const me = await guild.members.fetchMe().catch(() => null);

      const currentNickname = me?.nickname || personalization.nickname || '';
      const currentAvatarUrl = me?.avatar ? me.avatarURL({ dynamic: true, size: 512 }) : (personalization.avatarUrl || '');
      const currentBannerUrl = me?.banner ? me.bannerURL({ dynamic: true, size: 1024 }) : (personalization.bannerUrl || '');

      res.json({
        personalization: {
          ...personalization,
          nickname: currentNickname,
          avatarUrl: currentAvatarUrl,
          bannerUrl: currentBannerUrl
        },
        isPremium,
        botUser: {
          username: client.user.username,
          tag: client.user.tag || `${client.user.username}#0000`,
          defaultAvatarUrl: client.user.displayAvatarURL({ dynamic: true, size: 256 })
        }
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/guild/:guildId/personalization', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const guildId = req.params.guildId;
      const guild = await client.guilds.fetch(guildId).catch(() => null);
      if (!guild) return res.status(404).json({ error: 'Guild not found' });

      const isPremium = !!isPremiumGuild(guildId);
      const { nickname, avatarUrl, bannerUrl, bio } = req.body;
      const currentPers = await personalizationStorage.getPersonalization(guildId);
      const me = await guild.members.fetchMe().catch(() => null);

      const isAlteringAvatar = typeof avatarUrl === 'string' && avatarUrl.trim() !== (currentPers.avatarUrl || '');
      const isAlteringBanner = typeof bannerUrl === 'string' && bannerUrl.trim() !== (currentPers.bannerUrl || '');
      const isAlteringBio = typeof bio === 'string' && bio.trim() !== (currentPers.bio || '');

      // Premium restriction check:
      // Only the nickname set feature is free. Avatar, banner, and bio require active server premium status.
      if (!isPremium && (isAlteringAvatar || isAlteringBanner || isAlteringBio)) {
        return res.status(403).json({
          error: 'Avatar, banner, and bio customizations are exclusive to servers with an active Premium subscription. Upgrading unlocks all personalization perks!'
        });
      }

      // Build Discord PATCH /guilds/{guild.id}/members/@me payload
      const discordPatchBody = {};

      // 1. Server Nickname (Free feature)
      if (typeof nickname === 'string') {
        discordPatchBody.nick = nickname.trim() === '' ? null : nickname.trim().slice(0, 32);
      }

      // 2. Server Avatar (per-server only, Premium feature)
      if (isPremium && typeof avatarUrl === 'string') {
        const trimmedAvatar = avatarUrl.trim();
        if (trimmedAvatar === '') {
          discordPatchBody.avatar = null; // Revert to default bot avatar
        } else {
          discordPatchBody.avatar = await resolveImageToDataUri(trimmedAvatar);
        }
      }

      // 3. Server Banner (per-server only, Premium feature)
      if (isPremium && typeof bannerUrl === 'string') {
        const trimmedBanner = bannerUrl.trim();
        if (trimmedBanner === '') {
          discordPatchBody.banner = null;
        } else {
          discordPatchBody.banner = await resolveImageToDataUri(trimmedBanner);
        }
      }

      // Apply to Discord Guild Member Profile
      let discordNotice = null;
      if (Object.keys(discordPatchBody).length > 0) {
        try {
          await client.rest.patch(Routes.guildMember(guildId, '@me'), {
            body: discordPatchBody,
            reason: 'Uranium Bot Server Personalizer'
          });
        } catch (discordErr) {
          console.warn('[Personalization API] Discord patch error:', discordErr.message);

          // If Discord rejects banner (which requires Server Boost Level 2), retry without banner
          if (discordPatchBody.banner && (discordErr.message.includes('banner') || discordErr.status === 400 || discordErr.code === 50035)) {
            const retryBody = { ...discordPatchBody };
            delete retryBody.banner;
            try {
              if (Object.keys(retryBody).length > 0) {
                await client.rest.patch(Routes.guildMember(guildId, '@me'), {
                  body: retryBody,
                  reason: 'Uranium Bot Server Personalizer'
                });
              }
              discordNotice = 'Server nickname and avatar updated in Discord! (Note: Server banner could not be applied by Discord because guild banners require Server Boost Level 2).';
            } catch (retryErr) {
              throw new Error(`Failed to update server profile in Discord: ${retryErr.message}`);
            }
          } else {
            throw new Error(`Failed to update server profile in Discord: ${discordErr.message}`);
          }
        }
      }

      // Save to personalization storage (avatar, banner, bio require active premium)
      const updated = await personalizationStorage.setPersonalization(guildId, {
        nickname: typeof nickname === 'string' ? nickname.trim() : currentPers.nickname,
        avatarUrl: isPremium && typeof avatarUrl === 'string' ? avatarUrl.trim() : (isPremium ? currentPers.avatarUrl : ''),
        bannerUrl: isPremium && typeof bannerUrl === 'string' ? bannerUrl.trim() : (isPremium ? currentPers.bannerUrl : ''),
        bio: isPremium && typeof bio === 'string' ? bio.trim() : (isPremium ? currentPers.bio : '')
      });

      res.json({
        success: true,
        personalization: updated,
        notice: discordNotice,
        message: discordNotice || 'Server profile updated successfully in Discord!'
      });
    } catch (err) {
      console.error('[Personalization API] Error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ---------- PREMIUM STATUS & REDEEM API ----------
  router.get('/guild/:guildId/premium', requireGuildAccess(client), async (req, res) => {
    try {
      const guildId = req.params.guildId;
      const isPremium = !!isPremiumGuild(guildId);
      const allGuilds = listPremiumGuilds();
      const entry = allGuilds[guildId] || null;

      res.json({
        isPremium,
        expiresAt: entry ? entry.expiresAt : null,
        addedAt: entry ? entry.addedAt : null,
        addedBy: entry ? entry.addedBy : null,
        guildName: req.guild?.name || 'Selected Server'
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/guild/:guildId/premium/redeem', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const guildId = req.params.guildId;
      const { code } = req.body;
      if (!code || typeof code !== 'string') {
        return res.status(400).json({ success: false, reason: 'Please enter a valid code.' });
      }

      const userId = req.session.user.id;
      const result = redeemCode(code.trim(), guildId, userId);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json({
        success: true,
        expiresAt: result.expiresAt,
        message: 'Premium has been successfully activated for this server!'
      });
    } catch (err) {
      res.status(500).json({ success: false, reason: err.message });
    }
  });

  // ---------- USER PLAYLISTS API ----------
  router.get('/playlists/me', async (req, res) => {
    if (!req.session?.user) return res.status(401).json({ error: 'Not authenticated' });
    try {
      const userId = req.session.user.id;
      const isPremium = isPremiumUser(userId);
      const playlists = await playlistStorage.getUserPlaylists(userId);
      const quota = await playlistStorage.getUserPlaylistQuota(userId, isPremium);
      res.json({ playlists, quota });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/playlists', async (req, res) => {
    if (!req.session?.user) return res.status(401).json({ error: 'Not authenticated' });
    try {
      const userId = req.session.user.id;
      const { name } = req.body;
      const isPremium = isPremiumUser(userId);
      const result = await playlistStorage.createPlaylist(userId, name, isPremium);
      if (!result.success) return res.status(400).json(result);
      const quota = await playlistStorage.getUserPlaylistQuota(userId, isPremium);
      res.json({ success: true, playlist: result.playlist, quota });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.delete('/playlists/:playlistId', async (req, res) => {
    if (!req.session?.user) return res.status(401).json({ error: 'Not authenticated' });
    try {
      const userId = req.session.user.id;
      const result = await playlistStorage.deletePlaylist(userId, req.params.playlistId);
      if (!result.success) return res.status(404).json(result);
      const isPremium = isPremiumUser(userId);
      const quota = await playlistStorage.getUserPlaylistQuota(userId, isPremium);
      res.json({ success: true, deleted: result.playlist, quota });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/playlists/:playlistId/tracks', async (req, res) => {
    if (!req.session?.user) return res.status(401).json({ error: 'Not authenticated' });
    try {
      const userId = req.session.user.id;
      const { track, query } = req.body;
      let targetTrack = track;
      if (!targetTrack && query) {
        const { searchTracks } = require('../music/service');
        const searchRes = await searchTracks(client, query, req.session.user);
        if (!searchRes.tracks?.length) return res.status(404).json({ error: 'No tracks found for search query.' });
        targetTrack = searchRes.tracks[0];
      }
      if (!targetTrack) return res.status(400).json({ error: 'No track data provided.' });
      const result = await playlistStorage.addTrackToPlaylist(userId, req.params.playlistId, targetTrack);
      if (!result.success) return res.status(400).json(result);
      res.json({ success: true, playlist: result.playlist, track: result.track });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.delete('/playlists/:playlistId/tracks/:trackIndex', async (req, res) => {
    if (!req.session?.user) return res.status(401).json({ error: 'Not authenticated' });
    try {
      const userId = req.session.user.id;
      const result = await playlistStorage.removeTrackFromPlaylist(userId, req.params.playlistId, req.params.trackIndex);
      if (!result.success) return res.status(400).json(result);
      res.json({ success: true, playlist: result.playlist, removed: result.removedTrack });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/guild/:guildId/playlists/:playlistId/play', requireGuildAccess(client), requireMusicAccess, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const pl = await playlistStorage.getPlaylist(userId, req.params.playlistId);
      if (!pl) return res.status(404).json({ error: 'Playlist not found.' });
      if (!pl.tracks?.length) return res.status(400).json({ error: 'Playlist is empty.' });

      const { createPlayer, searchTracks } = require('../music/service');
      const voiceChannelId = req.member.voice.channelId;
      if (!voiceChannelId) return res.status(400).json({ error: 'Join a voice channel first.' });

      let player = client.music?.players?.get(req.params.guildId);
      player = await createPlayer(client, req.params.guildId, voiceChannelId, req.body.textChannelId || null);

      let queued = 0;
      for (const t of pl.tracks) {
        try {
          const resSearch = await searchTracks(client, t.uri || `${t.title} ${t.author}`, req.member);
          if (resSearch.tracks?.length) {
            player.queue.add(resSearch.tracks[0]);
            queued++;
          }
        } catch { }
      }

      if (queued > 0 && !player.playing && !player.paused) {
        await player.play();
      }

      client.dashboardBridge?.emitPlayerUpdate(player);
      res.json({ success: true, queuedCount: queued, playlistName: pl.name });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ---------- MUSIC FEED & DISCOVERY API ----------
  const spotifyFeed = require('./data/spotifyFeed');
  router.get('/music/feed', async (req, res) => {
    try {
      res.json({
        popularToday: spotifyFeed.popularToday,
        recentlyPlayed: spotifyFeed.recentlyPlayed,
        genreTracks: spotifyFeed.genreTracks,
        genres: spotifyFeed.genres,
        regions: spotifyFeed.regions
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/music/search', async (req, res) => {
    try {
      const q = String(req.query.q || '').trim();
      if (!q) return res.json([]);
      const { searchTracks } = require('../music/service');
      const searchRes = await searchTracks(client, q, req.session?.user || null);
      const results = (searchRes.tracks || []).slice(0, 15).map(t => serializeTrack(t));
      res.json(results);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ---------- GIVEAWAYS API ----------
  const giveawayService = require('../listeners/giveawayService');

  function parseGiveawayDuration(input) {
    if (typeof input === 'number') return input;
    if (!input || typeof input !== 'string') return null;
    const regex = /(\d+)\s*([dhms])/gi;
    const units = { d: 86400000, h: 3600000, m: 60000, s: 1000 };
    let total = 0, match;
    while ((match = regex.exec(input)) !== null) {
      const value = parseInt(match[1], 10);
      const unit = match[2].toLowerCase();
      if (units[unit] && !Number.isNaN(value)) total += value * units[unit];
    }
    if (total > 0) return total;
    try {
      const parsed = ms(input);
      return typeof parsed === 'number' && parsed > 0 ? parsed : null;
    } catch {
      return null;
    }
  }

  // List all giveaways for a guild
  router.get('/guild/:guildId/giveaways', requireGuildAccess(client), requireGuildMod, async (req, res) => {
    try {
      const guildId = req.params.guildId;
      const guild = req.guild;
      const rawList = await giveawayService.listAllGiveaways(guildId);

      const now = Date.now();
      let activeCount = 0;
      let endedCount = 0;
      let totalParticipants = 0;
      let totalWinnersAwarded = 0;

      const giveaways = await Promise.all(rawList.map(async (g) => {
        const isEnded = Boolean(g.ended) || g.end_at <= now;
        if (isEnded) endedCount++;
        else activeCount++;

        let participantsList = [];
        try {
          participantsList = JSON.parse(g.participants || '[]');
        } catch {}
        totalParticipants += participantsList.length;

        if (isEnded) {
          totalWinnersAwarded += Math.min(participantsList.length, g.winners || 1);
        }

        let config = {};
        try {
          config = JSON.parse(g.config || '{}');
        } catch {}

        const channel = guild.channels.cache.get(g.channel_id);
        let creatorTag = g.created_by;
        try {
          const u = await client.users.fetch(g.created_by).catch(() => null);
          if (u) creatorTag = u.tag || u.username;
        } catch {}

        return {
          messageId: g.message_id,
          guildId: g.guild_id,
          channelId: g.channel_id,
          channelName: channel ? channel.name : 'unknown-channel',
          prize: g.prize,
          winners: g.winners,
          endAt: g.end_at,
          timeLeftMs: Math.max(0, g.end_at - now),
          createdBy: g.created_by,
          creatorTag,
          ended: isEnded,
          status: isEnded ? 'ended' : 'active',
          participantCount: participantsList.length,
          participants: participantsList,
          config
        };
      }));

      res.json({
        stats: {
          total: rawList.length,
          active: activeCount,
          ended: endedCount,
          totalParticipants,
          totalWinnersAwarded
        },
        giveaways
      });
    } catch (err) {
      console.error('[Giveaways API] list error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Start a new giveaway
  router.post('/guild/:guildId/giveaways', requireGuildAccess(client), requireGuildMod, async (req, res) => {
    try {
      const guild = req.guild;
      const moderator = req.session.user;
      const {
        channelId,
        prize,
        winners,
        duration,
        content = '🎉 **GIVEAWAY TIME!** React or click below to enter!',
        title,
        description,
        color = '#5865F2',
        thumbnail,
        image,
        requiredRole,
        buttonLabel = 'Enter',
        buttonEmoji = '🎉',
        ping = 'none'
      } = req.body;

      if (!channelId || !prize) {
        return res.status(400).json({ error: 'Channel and prize are required.' });
      }

      const channel = guild.channels.cache.get(channelId);
      if (!channel || !channel.isTextBased()) {
        return res.status(404).json({ error: 'Valid text channel not found in this server.' });
      }

      const botMember = guild.members.me;
      if (!channel.permissionsFor(botMember).has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
        return res.status(403).json({ error: 'Bot is missing Send Messages or Embed Links permissions in that channel.' });
      }

      const parsedWinners = Math.max(1, Math.min(50, parseInt(winners) || 1));
      const durationMs = parseGiveawayDuration(duration);
      if (!durationMs || durationMs < 10000 || durationMs > 30 * 86400 * 1000) {
        return res.status(400).json({ error: 'Invalid duration. Must be between 10 seconds and 30 days.' });
      }

      const endAt = Date.now() + durationMs;

      const config = {
        title: title?.trim() || undefined,
        description: description?.trim() || undefined,
        color: color?.trim() || '#5865F2',
        thumbnail: thumbnail?.trim() || undefined,
        image: image?.trim() || undefined,
        requiredRole: requiredRole || undefined,
        buttonLabel: buttonLabel?.trim() || 'Enter',
        buttonEmoji: buttonEmoji?.trim() || '🎉',
        ping: ping || 'none'
      };

      const giveawayEmbed = giveawayService.buildGiveawayEmbed({
        prize: prize.trim(),
        winners: parsedWinners,
        endAt,
        hostId: moderator.id,
        config
      });

      const initialRow = giveawayService.buildGiveawayRow({
        messageId: 'PLACEHOLDER',
        winners: parsedWinners,
        config,
        participantCount: 0
      });

      const announcement = giveawayService.formatAnnouncementContent(content, ping);
      const sent = await channel.send({ content: announcement, embeds: [giveawayEmbed], components: [initialRow] });

      const fixedRow = giveawayService.buildGiveawayRow({
        messageId: sent.id,
        winners: parsedWinners,
        config,
        participantCount: 0
      });
      await sent.edit({ components: [fixedRow] });

      await giveawayService.createGiveaway({
        messageId: sent.id,
        guildId: guild.id,
        channelId: channel.id,
        prize: prize.trim(),
        winners: parsedWinners,
        endAt,
        createdBy: moderator.id,
        participants: JSON.stringify([]),
        config
      });

      giveawayService.scheduleGiveawayEnd(client, {
        messageId: sent.id,
        channelId: channel.id,
        prize: prize.trim(),
        winners: parsedWinners,
        endAt
      });

      res.json({
        success: true,
        giveaway: {
          messageId: sent.id,
          guildId: guild.id,
          channelId: channel.id,
          prize: prize.trim(),
          winners: parsedWinners,
          endAt,
          createdBy: moderator.id,
          config
        }
      });
    } catch (err) {
      console.error('[Giveaways API] create error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // End giveaway early
  router.post('/guild/:guildId/giveaways/:messageId/end', requireGuildAccess(client), requireGuildMod, async (req, res) => {
    try {
      const result = await giveawayService.finalizeGiveaway(req.params.messageId, client);
      if (!result.success) {
        return res.status(400).json({ error: result.error || 'Failed to end giveaway' });
      }
      res.json({ success: true, winners: result.winners || [] });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Reroll giveaway winners
  router.post('/guild/:guildId/giveaways/:messageId/reroll', requireGuildAccess(client), requireGuildMod, async (req, res) => {
    try {
      const messageId = req.params.messageId;
      const giveaway = await giveawayService.getGiveawayByMessageId(messageId);
      if (!giveaway) {
        return res.status(404).json({ error: 'Giveaway not found' });
      }

      let participants = [];
      try { participants = JSON.parse(giveaway.participants || '[]'); } catch {}

      if (participants.length === 0) {
        return res.status(400).json({ error: 'No participants available to reroll' });
      }

      const shuffled = [...participants].sort(() => 0.5 - Math.random());
      const count = Math.min(giveaway.winners || 1, participants.length);
      const newWinners = shuffled.slice(0, count);
      const winnerMentions = newWinners.map(id => `<@${id}>`).join(' ');

      const channel = await client.channels.fetch(giveaway.channel_id).catch(() => null);
      if (channel) {
        const rerollEmbed = new EmbedBuilder()
          .setColor(0xF1C40F)
          .setTitle('🎉 GIVEAWAY REROLL: NEW WINNER(S)! 🎉')
          .setDescription(`Congratulations to the new lucky winner(s)!\n\n${newWinners.map((w, idx) => `🏆 **${idx + 1}.** <@${w}>`).join('\n')}`)
          .addFields(
            { name: '🎁 Prize', value: `**${giveaway.prize}**`, inline: true },
            { name: '👥 Total Entries', value: `\`${participants.length}\``, inline: true },
            { name: '👑 Hosted by', value: `<@${giveaway.created_by}>`, inline: true },
            { name: '🔗 Original Giveaway', value: `[Jump to Giveaway Post](https://discord.com/channels/${giveaway.guild_id}/${giveaway.channel_id}/${messageId})`, inline: false }
          )
          .setFooter({ text: 'Uranium Giveaways • Reroll Completed' })
          .setTimestamp();

        await channel.send({
          content: `🎉 Congratulations ${winnerMentions}! You won **${giveaway.prize}** in the reroll!`,
          embeds: [rerollEmbed]
        }).catch(() => null);
      }

      res.json({ success: true, winners: newWinners, mentions: winnerMentions });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Edit giveaway details
  router.patch('/guild/:guildId/giveaways/:messageId', requireGuildAccess(client), requireGuildMod, async (req, res) => {
    try {
      const messageId = req.params.messageId;
      const {
        prize,
        winners,
        duration,
        title,
        description,
        color,
        thumbnail,
        image,
        requiredRole,
        buttonLabel,
        buttonEmoji
      } = req.body;

      const giveaway = await giveawayService.getGiveawayByMessageId(messageId);
      if (!giveaway) return res.status(404).json({ error: 'Giveaway not found' });
      if (giveaway.ended) return res.status(400).json({ error: 'Cannot edit an ended giveaway' });

      const updates = {};
      if (prize) updates.prize = prize.trim();
      if (winners) updates.winners = Math.max(1, Math.min(50, parseInt(winners) || 1));

      let newEndAt = giveaway.end_at;
      if (duration) {
        const durationMs = parseGiveawayDuration(duration);
        if (durationMs) {
          newEndAt = Date.now() + durationMs;
          updates.end_at = newEndAt;
        }
      }

      let currentConfig = {};
      try { currentConfig = JSON.parse(giveaway.config || '{}'); } catch {}

      const updatedConfig = { ...currentConfig };
      if (title !== undefined) updatedConfig.title = title.trim();
      if (description !== undefined) updatedConfig.description = description.trim();
      if (color !== undefined) updatedConfig.color = color.trim();
      if (thumbnail !== undefined) updatedConfig.thumbnail = thumbnail.trim();
      if (image !== undefined) updatedConfig.image = image.trim();
      if (requiredRole !== undefined) updatedConfig.requiredRole = requiredRole;
      if (buttonLabel !== undefined) updatedConfig.buttonLabel = buttonLabel.trim();
      if (buttonEmoji !== undefined) updatedConfig.buttonEmoji = buttonEmoji.trim();
      updates.config = updatedConfig;

      await giveawayService.updateGiveaway(messageId, updates);

      // Edit Discord Message Embed & Component Row
      const channel = await client.channels.fetch(giveaway.channel_id).catch(() => null);
      if (channel) {
        const msg = await channel.messages.fetch(messageId).catch(() => null);
        if (msg) {
          let participants = [];
          try { participants = JSON.parse(giveaway.participants || '[]'); } catch {}

          const finalPrize = updates.prize || giveaway.prize;
          const finalWinners = updates.winners || giveaway.winners;

          const updatedEmbed = giveawayService.buildGiveawayEmbed({
            prize: finalPrize,
            winners: finalWinners,
            endAt: newEndAt,
            hostId: giveaway.created_by,
            config: updatedConfig
          });

          const updatedRow = giveawayService.buildGiveawayRow({
            messageId,
            winners: finalWinners,
            config: updatedConfig,
            participantCount: participants.length
          });

          await msg.edit({ embeds: [updatedEmbed], components: [updatedRow] }).catch(() => null);
        }
      }

      // If endAt changed, reschedule timer
      if (updates.end_at) {
        if (client?.giveawayTimers?.has(messageId)) {
          clearTimeout(client.giveawayTimers.get(messageId));
        }
        giveawayService.scheduleGiveawayEnd(client, {
          messageId,
          channelId: giveaway.channel_id,
          prize: updates.prize || giveaway.prize,
          winners: updates.winners || giveaway.winners,
          endAt: newEndAt
        });
      }

      res.json({ success: true, updates });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete giveaway
  router.delete('/guild/:guildId/giveaways/:messageId', requireGuildAccess(client), requireGuildMod, async (req, res) => {
    try {
      const messageId = req.params.messageId;
      const giveaway = await giveawayService.getGiveawayByMessageId(messageId);
      if (!giveaway) return res.status(404).json({ error: 'Giveaway not found' });

      if (client?.giveawayTimers?.has(messageId)) {
        clearTimeout(client.giveawayTimers.get(messageId));
        client.giveawayTimers.delete(messageId);
      }

      // Delete message from Discord channel if available
      try {
        const channel = await client.channels.fetch(giveaway.channel_id).catch(() => null);
        if (channel) {
          const msg = await channel.messages.fetch(messageId).catch(() => null);
          if (msg) await msg.delete().catch(() => null);
        }
      } catch {}

      await giveawayService.deleteGiveaway(messageId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
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

        case 'clear-roles': {
          const targetMember = await guild.members.fetch(targetId).catch(() => null);
          if (!targetMember) return res.status(404).json({ error: 'Member not found in this server.' });
          if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return res.status(403).json({ error: 'Bot is missing Manage Roles permission.' });
          }

          const preserve = req.body.preserveRoles || '';
          const preserveIds = Array.isArray(preserve)
            ? preserve
            : (typeof preserve === 'string' && preserve ? preserve.split(',').map(r => r.trim()) : []);

          const botHighest = guild.members.me.roles.highest.position;
          const rolesToRemove = targetMember.roles.cache
            .filter((r) => r.id !== guild.id && !preserveIds.includes(r.id) && !r.managed && r.position < botHighest)
            .map((r) => r.id);

          if (rolesToRemove.length > 0) {
            await targetMember.roles.remove(rolesToRemove, `[Dashboard Clear Roles by ${moderator.username}] ${reason}`);
          }

          await modStorage.saveCase({
            caseId,
            guildId: guild.id,
            moderatorId: moderator.id,
            targetId,
            action: 'clear-roles',
            reason: `${reason} (Preserved: ${preserveIds.length}, Removed: ${rolesToRemove.length})`,
            duration: null,
            timestamp: Date.now()
          });

          logEmbed = new EmbedBuilder()
            .setTitle('🧼 Member Roles Cleared (Dashboard)')
            .setColor(0x3498DB)
            .addFields(
              { name: 'Target', value: `<@${targetId}> (${targetId})`, inline: true },
              { name: 'Moderator', value: `<@${moderator.id}>`, inline: true },
              { name: 'Roles Removed', value: String(rolesToRemove.length), inline: true },
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

  // ---------- WELCOME & GOODBYE API ----------
  router.get('/guild/:guildId/welcome-goodbye', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const guildId = req.params.guildId;
      const settings = await welcomeStorage.getSettings(guildId);
      
      const channels = [];
      for (const [id, channel] of req.guild.channels.cache) {
        if (channel.type === 0) {
          channels.push({ id: channel.id, name: channel.name, categoryId: channel.parentId });
        }
      }

      await req.guild.roles.fetch().catch(() => null);
      const roles = req.guild.roles.cache
        .filter(r => r.id !== req.guild.id && !r.managed)
        .map(r => ({ id: r.id, name: r.name, color: r.hexColor, position: r.position }))
        .sort((a, b) => b.position - a.position);

      res.json({ settings, channels, roles });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/guild/:guildId/welcome-goodbye', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const guildId = req.params.guildId;
      await welcomeStorage.setConfig(guildId, req.body);
      const updated = await welcomeStorage.getSettings(guildId);
      res.json({ success: true, settings: updated });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/guild/:guildId/welcome-goodbye/test', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const guild = req.guild;
      const guildId = guild.id;
      const { type = 'welcome', channelId } = req.body;
      const settings = await welcomeStorage.getSettings(guildId);

      const targetId = channelId || (type === 'goodbye' ? settings.goodbyeChannelId : settings.welcomeChannelId);
      if (!targetId) {
        return res.status(400).json({ error: 'No target channel configured or selected for test message.' });
      }

      const channel = guild.channels.cache.get(targetId);
      if (!channel || !channel.isTextBased()) {
        return res.status(404).json({ error: 'Target text channel not found.' });
      }

      const member = req.member;
      const memberCount = guild.memberCount || 1;
      const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 512 });

      const formatPlaceholders = (template) => {
        if (!template) return '';
        return template
          .replace(/{user}/gi, `<@${member.id}>`)
          .replace(/{username}/gi, member.user.username)
          .replace(/{server}/gi, guild.name)
          .replace(/{guild}/gi, guild.name)
          .replace(/{server\.member_count}/gi, String(memberCount))
          .replace(/{count}/gi, String(memberCount));
      };

      const isGoodbye = type === 'goodbye';
      const cardEnabled = isGoodbye ? settings.goodbyeCardEnabled : settings.welcomeCardEnabled;
      const messageType = isGoodbye ? settings.goodbyeMessageType : settings.welcomeMessageType;
      const rawMessage = isGoodbye ? settings.goodbyeMessage : settings.welcomeMessage;
      const embConfig = isGoodbye ? (settings.goodbyeEmbed || {}) : (settings.welcomeEmbed || {});

      const files = [];
      if (cardEnabled) {
        try {
          const cardBuf = await generateWelcomeCard({
            username: member.user.username,
            discriminator: member.user.discriminator || '0',
            avatarUrl,
            guildName: guild.name,
            memberCount,
            cardTheme: settings.cardTheme || 'modern_obsidian',
            cardFont: settings.cardFont || 'Inter',
            cardTextColor: settings.cardTextColor,
            cardBgColor: settings.cardBgColor,
            cardOverlayOpacity: settings.cardOverlayOpacity,
            cardBgImage: settings.cardBgImage,
            cardTitle: settings.cardTitle,
            cardSubtitle: settings.cardSubtitle,
            isGoodbye
          });
          if (cardBuf) {
            files.push(new AttachmentBuilder(cardBuf, { name: isGoodbye ? 'goodbye.png' : 'welcome.png' }));
          }
        } catch (cardErr) {
          console.warn('[welcome-goodbye test] Card render error:', cardErr.message);
        }
      }

      const parsedText = formatPlaceholders(rawMessage);
      if (messageType === 'embed') {
        const embed = new EmbedBuilder()
          .setTitle(formatPlaceholders(embConfig.title || (isGoodbye ? 'Goodbye!' : `Welcome to ${guild.name}!`)))
          .setDescription(parsedText || formatPlaceholders(embConfig.description || 'Welcome!'))
          .setColor(embConfig.color ? parseInt(embConfig.color.replace('#', ''), 16) || 0xf43f5e : 0xf43f5e)
          .setTimestamp();

        if (files.length > 0) {
          embed.setImage(`attachment://${isGoodbye ? 'goodbye.png' : 'welcome.png'}`);
        }
        await channel.send({ embeds: [embed], files });
      } else {
        await channel.send({ content: parsedText || `Test ${type} message!`, files });
      }

      res.json({ success: true, message: `Test ${type} message sent to #${channel.name}!` });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/guild/:guildId/welcome-goodbye/render-preview', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const guild = req.guild;
      const { cardConfig = {}, isGoodbye = false } = req.body;
      const cardBuf = await welcomeCardRenderer.renderWelcomeCard({
        avatarUrl: req.session?.user?.id ? `https://cdn.discordapp.com/avatars/${req.session.user.id}/${req.session.user.avatar}.png` : (client.user?.displayAvatarURL({ extension: 'png', size: 256 }) || null),
        username: req.session?.user?.username || 'shahrib',
        discriminator: req.session?.user?.discriminator || '0',
        guildName: guild.name || 'Community Server',
        memberCount: guild.memberCount || 50,
        cardConfig,
        isGoodbye
      });

      if (!cardBuf) {
        return res.status(500).json({ error: 'Failed to generate card' });
      }

      res.set('Content-Type', 'image/png');
      res.send(cardBuf);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // VERIFICATION MODULE API
  // ─────────────────────────────────────────────────────────────────────────────
  router.get('/guild/:guildId/verification', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const guild = req.guild;
      const guildId = req.params.guildId;

      const [config, verifiedCount] = await Promise.all([
        verificationUtils.getVerificationConfig(guildId),
        verificationUtils.getVerifiedUsersCount(guildId)
      ]);

      const channels = guild.channels.cache
        .filter(c => c.isTextBased() && !c.isThread() && !c.isVoiceBased())
        .map(c => ({ id: c.id, name: c.name, type: c.type }))
        .sort((a, b) => a.name.localeCompare(b.name));

      const botMember = guild.members.me;
      const roles = guild.roles.cache
        .filter(r => !r.managed && r.id !== guild.id)
        .map(r => ({
          id: r.id,
          name: r.name,
          color: r.hexColor !== '#000000' ? r.hexColor : '#94a3b8',
          position: r.position,
          assignable: botMember ? botMember.roles.highest.position > r.position : true
        }))
        .sort((a, b) => b.position - a.position);

      res.json({
        config: config || {
          guild_id: guildId,
          channel_id: '',
          message_id: null,
          role_id: '',
          unverified_role_id: '',
          log_channel_id: '',
          embed_title: 'Verify Yourself',
          embed_message: 'Click the button below to verify yourself and gain access to the server.',
          embed_color: '#10b981',
          embed_image: '',
          embed_footer: 'Uranium Security Verification',
          type: 'button',
          button_label: 'Verify',
          button_style: 'Success',
          button_emoji: '✅',
          send_dm: false,
          dm_message: 'You have been successfully verified in **{server}**!',
          enabled: true
        },
        channels,
        roles,
        verifiedCount: verifiedCount || 0
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/guild/:guildId/verification', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const guildId = req.params.guildId;
      await verificationUtils.saveVerificationConfig(guildId, req.body);
      res.json({ success: true, message: 'Verification settings saved successfully!' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/guild/:guildId/verification/publish', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const guild = req.guild;
      const guildId = req.params.guildId;
      const body = req.body || {};

      const channelId = body.channel_id;
      if (!channelId) {
        return res.status(400).json({ error: 'Please choose a target channel to publish the verification message.' });
      }

      const channel = guild.channels.cache.get(channelId);
      if (!channel || !channel.isTextBased()) {
        return res.status(400).json({ error: 'Target verification channel not found or not a text channel.' });
      }

      // If a previous verification embed exists, clean it up from Discord so embeds never duplicate or linger forever
      const existingConfig = await verificationUtils.getVerificationConfig(guildId);
      if (existingConfig && existingConfig.channel_id && existingConfig.message_id) {
        await verificationUtils.deleteDiscordVerificationMessage(client, guild, existingConfig.channel_id, existingConfig.message_id);
      }

      // Map button style
      let btnStyle = ButtonStyle.Success;
      if (body.button_style === 'Primary') btnStyle = ButtonStyle.Primary;
      else if (body.button_style === 'Secondary') btnStyle = ButtonStyle.Secondary;
      else if (body.button_style === 'Danger') btnStyle = ButtonStyle.Danger;

      const embed = new EmbedBuilder()
        .setTitle(body.embed_title || 'Verify Yourself')
        .setDescription(
          (body.embed_message || 'Click the button below to verify yourself and gain access to the server.')
            .replace(/{server}/gi, guild.name)
        )
        .setColor(body.embed_color || '#10b981');

      if (body.embed_image && body.embed_image.trim()) {
        embed.setImage(body.embed_image.trim());
      }
      if (body.embed_footer && body.embed_footer.trim()) {
        embed.setFooter({ text: body.embed_footer.trim(), iconURL: client.user.displayAvatarURL() });
      } else {
        embed.setFooter({ text: 'Uranium Security Verification', iconURL: client.user.displayAvatarURL() });
      }

      const button = new ButtonBuilder()
        .setCustomId('verify_button')
        .setLabel(body.button_label || 'Verify')
        .setStyle(btnStyle);

      if (body.button_emoji && body.button_emoji.trim()) {
        const emojiStr = body.button_emoji.trim();
        const customEmojiMatch = emojiStr.match(/<a?:(\w+):(\d+)>/);
        if (customEmojiMatch) {
          button.setEmoji(customEmojiMatch[2]);
        } else {
          button.setEmoji(emojiStr);
        }
      }

      const row = new ActionRowBuilder().addComponents(button);

      const sentMsg = await channel.send({ embeds: [embed], components: [row] });

      // Save settings with updated message_id and enabled = true
      body.message_id = sentMsg.id;
      body.enabled = true;
      await verificationUtils.saveVerificationConfig(guildId, body);

      res.json({
        success: true,
        message: `Verification gate published directly to #${channel.name}!`,
        message_id: sentMsg.id
      });
    } catch (err) {
      console.error('[verification/publish error]:', err);
      res.status(500).json({ error: err.message || 'Failed to dispatch verification embed' });
    }
  });

  router.post('/guild/:guildId/verification/unpublish', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const guild = req.guild;
      const guildId = req.params.guildId;
      const config = await verificationUtils.getVerificationConfig(guildId);

      let deletedDiscordMessage = false;
      if (config && config.channel_id && config.message_id) {
        deletedDiscordMessage = await verificationUtils.deleteDiscordVerificationMessage(client, guild, config.channel_id, config.message_id);
      }

      if (config) {
        config.message_id = null;
        await verificationUtils.saveVerificationConfig(guildId, config);
      }

      res.json({
        success: true,
        message: deletedDiscordMessage
          ? 'Verification gate deleted from Discord channel successfully.'
          : 'Verification embed unpublished.'
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.delete('/guild/:guildId/verification', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const guild = req.guild;
      const guildId = req.params.guildId;
      const config = await verificationUtils.getVerificationConfig(guildId);

      let deletedDiscordMessage = false;
      if (config && config.channel_id && config.message_id) {
        deletedDiscordMessage = await verificationUtils.deleteDiscordVerificationMessage(client, guild, config.channel_id, config.message_id);
      }

      await verificationUtils.deleteVerificationConfig(guildId);

      res.json({
        success: true,
        message: deletedDiscordMessage
          ? 'Verification system removed and Discord embed deleted successfully.'
          : 'Verification system settings reset successfully.'
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/guild/:guildId/verification/manual', requireGuildAccess(client), requireGuildAdmin, async (req, res) => {
    try {
      const guild = req.guild;
      const guildId = req.params.guildId;
      const { userId, action } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      const config = await verificationUtils.getVerificationConfig(guildId);
      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member) {
        return res.status(404).json({ error: 'Member not found in this server.' });
      }

      if (action === 'unverify') {
        if (config?.role_id) {
          await member.roles.remove(config.role_id).catch(() => null);
        }
        if (config?.unverified_role_id) {
          await member.roles.add(config.unverified_role_id).catch(() => null);
        }
        await verificationUtils.removeUserVerification(guildId, userId);
        return res.json({ success: true, message: `Removed verification from ${member.user.tag}` });
      } else {
        if (config?.role_id) {
          await member.roles.add(config.role_id).catch(() => null);
        }
        if (config?.unverified_role_id) {
          await member.roles.remove(config.unverified_role_id).catch(() => null);
        }
        await verificationUtils.markUserVerified(guildId, userId);
        return res.json({ success: true, message: `Manually verified ${member.user.tag}` });
      }
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
    autoplay: !!player.data?.get?.('autoplay'),
    filter: player.data?.get?.('filter') || 'clear', 
    current: serializeTrack(player.queue?.current), 
    queueSize: player.queue?.size || 0, 
    queue: (Array.from(player.queue || [])).slice(0, 50).map((t, i) => ({ ...serializeTrack(t), position: i })) 
  };
}

module.exports = { createApiRouter, serializePlayer, serializeTrack };
