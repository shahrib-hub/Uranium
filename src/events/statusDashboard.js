// src/events/statusDashboard.js
const {
  Events,
  EmbedBuilder,
  version: djsVersion
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const STATUS_FILE = path.join(__dirname, '..', 'data', 'status_message.json');

function ensureDataDir() {
  const dir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadStatus() {
  try {
    if (fs.existsSync(STATUS_FILE)) {
      const raw = fs.readFileSync(STATUS_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('[StatusDashboard] Failed to load status file:', err);
  }
  return null;
}

function saveStatus(status) {
  try {
    ensureDataDir();
    fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
  } catch (err) {
    console.error('[StatusDashboard] Failed to save status file:', err);
  }
}

function formatDuration(ms) {
  if (!ms || ms < 0) return '0s';
  const sec = Math.floor(ms / 1000);
  const days = Math.floor(sec / 86400);
  const hours = Math.floor((sec % 86400) / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;

  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (seconds || !parts.length) parts.push(`${seconds}s`);

  return parts.join(' ');
}

function buildStatusEmbed(client, { mode } = { mode: 'online' }) {
  const guildCount = client.guilds.cache.size;

  // approximate unique users (sum of memberCount)
  let userCount = 0;
  for (const guild of client.guilds.cache.values()) {
    userCount += guild.memberCount || 0;
  }

  const voiceConnections = client.music?.connections?.size || 0;
  const ping = client.ws.ping ?? 0;
  const uptimeMs = client.uptime || (Date.now() - (client.readyTimestamp || Date.now()));
  const uptime = formatDuration(uptimeMs);

  const memory = process.memoryUsage();
  const heapUsed = (memory.heapUsed / 1024 / 1024).toFixed(1);
  const heapTotal = (memory.heapTotal / 1024 / 1024).toFixed(1);

  const nodeVersion = process.version;
  const statusText =
    mode === 'offline'
      ? '🔴 **Offline / Restarting...**'
      : '🟢 **Online & Operational**';

  const color = mode === 'offline' ? 0xef4444 : 0x0f172a;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle('📊 MULTi-Bot Status Dashboard')
    .setDescription(statusText)
    .addFields(
      {
        name: '🌐 Servers',
        value: `\`${guildCount}\``,
        inline: true
      },
      {
        name: '👥 Users (approx)',
        value: `\`${userCount}\``,
        inline: true
      },
      {
        name: '🔊 Music Players',
        value: `\`${voiceConnections}\` active`,
        inline: true
      },
      {
        name: '⏱ Uptime',
        value: `\`${uptime}\``,
        inline: true
      },
      {
        name: '📡 WebSocket Ping',
        value: `\`${ping} ms\``,
        inline: true
      },
      {
        name: '⚙️ Runtime',
        value: [
          `Node: \`${nodeVersion}\``,
          `discord.js: \`v${djsVersion}\``
        ].join('\n'),
        inline: true
      },
      {
        name: '🧩 Shards',
        value: `\`Shard ${client.shard ? client.shard.ids.join(', ') : 0}\``,
        inline: true
      },
      {
        name: '📌 Info',
        value: [
          '• Updated every **10 minutes**',
          '• Powered By SHM - MULTi-Bot',
          '• Check for important announcements if bot is offline for too long'
        ].join('\n'),
        inline: false
      }
    )
    .setFooter({
      text: 'MULTi-Bot • Live Status',
    })
    .setTimestamp();

  if (client.user?.displayAvatarURL) {
    embed.setThumbnail(client.user.displayAvatarURL({ size: 256 }));
  }

  return embed;
}

module.exports = {
  name: 'clientReady',
  once: true,

  /**
   * @param {import('discord.js').Client} readyClient
   * @param {import('discord.js').Client} client
   */
  async execute(readyClient, client) {
    const c = readyClient; // same as client, but staying consistent
    const channelId = process.env.SUPPORT_STATUS_CHANNEL_ID;

    if (!channelId) {
      console.warn('[StatusDashboard] SUPPORT_STATUS_CHANNEL_ID not set in .env, skipping status dashboard.');
      return;
    }

    let statusMsg = null;
    let status = loadStatus();

    // Small helper to always have a valid message
    async function ensureStatusMessage(forceRecreate = false) {
      let channel = c.channels.cache.get(channelId);
      if (!channel) {
        channel = await c.channels.fetch(channelId).catch(() => null);
      }
      if (!channel || !channel.isTextBased()) {
        console.warn('[StatusDashboard] Support status channel not found or not text-based.');
        return null;
      }

      if (!forceRecreate && status && status.channelId === channelId && status.messageId) {
        try {
          const msg = await channel.messages.fetch(status.messageId);
          return msg;
        } catch {
          // message not found (deleted)
        }
      }

      // Need to send a new one
      const embed = buildStatusEmbed(c, { mode: 'online' });
      const newMsg = await channel.send({ embeds: [embed] }).catch((err) => {
        console.error('[StatusDashboard] Failed to send status message:', err);
        return null;
      });

      if (newMsg) {
        status = { channelId, messageId: newMsg.id };
        saveStatus(status);
      }

      return newMsg;
    }

    async function updateStatus(mode = 'online') {
      try {
        if (!statusMsg) {
          statusMsg = await ensureStatusMessage();
          if (!statusMsg) return;
        }

        const embed = buildStatusEmbed(c, { mode });
        await statusMsg.edit({ embeds: [embed] }).catch(async (err) => {
          if (err.code === 50005 || err.code === 10008) {
            console.log('[StatusDashboard] Status message uneditable (50005/10008). Recreating...');
            statusMsg = await ensureStatusMessage(true);
            return;
          }
          console.error('[StatusDashboard] Failed to edit status message, trying to recreate:', err);
          statusMsg = await ensureStatusMessage(true);
          if (!statusMsg) return;
          await statusMsg.edit({ embeds: [embed] }).catch(() => { });
        });
      } catch (err) {
        if (err?.code !== 'ENOTFOUND') {
          console.error('[StatusDashboard] Error while updating status message:', err);
        }
      }
    }

    // Initial: ensure message exists + update immediately
    statusMsg = await ensureStatusMessage();
    if (statusMsg) {
      await updateStatus('online');
    }

    // Update every 10 minutes
    const TEN_MINUTES = 10 * 60 * 1000;
    const interval = setInterval(() => {
      updateStatus('online');
    }, TEN_MINUTES);

    // Store for potential cleanup if you ever want it
    c.statusDashboardInterval = interval;

    // 🧯 Shutdown hooks: try to mark as offline before process exits
    const shutdownHandler = async (signal) => {
      console.log(`[StatusDashboard] Received ${signal}, updating status to offline...`);
      try {
        await updateStatus('offline');
      } catch (err) {
        console.error('[StatusDashboard] Failed to update offline status:', err);
      } finally {
        // let the process actually exit
        process.exit(0);
      }
    };

    // Only bind once to avoid duplicate listeners when hot reload etc.
    if (!process._statusDashboardHooksBound) {
      process._statusDashboardHooksBound = true;
      process.once('SIGINT', shutdownHandler);
      process.once('SIGTERM', shutdownHandler);
    }

    console.log('[StatusDashboard] Status dashboard initialized.');
  }
};
