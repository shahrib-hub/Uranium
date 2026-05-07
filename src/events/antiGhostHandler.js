// src/events/antiGhostHandler.js
const { Events } = require('discord.js');
const ghostStorage = require('../utils/ghostStorage');

// In-memory cache for recent mention messages
// messageId => { guildId, channelId, authorId, mentionedIds: [id...], timestamp }
const recentMentions = new Map();

// cleanup interval & thresholds
const CLEANUP_MS = 1000 * 60 * 10; // drop old entries after 10m
const GHOST_DETECTION_WINDOW = 30 * 1000; // treat deletions within 30s as potential ghostpings

let cleanupTimer = null;

function scheduleCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [mid, data] of recentMentions.entries()) {
      if (now - data.timestamp > CLEANUP_MS) recentMentions.delete(mid);
    }
  }, 60_000);
  cleanupTimer.unref?.();
}

module.exports = {
  name: 'clientReady',
  once: true,
  async execute(client) {
    // ensure DB
    await ghostStorage._readyPromise;

    scheduleCleanup();

    client.on('messageCreate', (message) => {
      try {
        if (!message.guild || message.author?.bot) return;

        // only handle if message mentions users (not everyone/here)
        const mentions = message.mentions?.users;
        if (!mentions || mentions.size === 0) return;

        const mentionedIds = Array.from(mentions.keys()).filter(id => id !== message.author.id);
        if (!mentionedIds.length) return;

        // we cache message info to check on deletion later
        recentMentions.set(message.id, {
          guildId: message.guild.id,
          channelId: message.channel.id,
          authorId: message.author.id,
          mentionedIds,
          timestamp: Date.now()
        });

        // auto-prune something older occasionally
        if (recentMentions.size > 5000) {
          // cheap prune of the oldest entries
          const keys = Array.from(recentMentions.keys()).slice(0, 1000);
          for (const k of keys) recentMentions.delete(k);
        }
      } catch (err) {
        // only log errors
        console.error('[antiGhost] messageCreate handler error', err);
      }
    });

    client.on('messageDelete', async (message) => {
      try {
        // message could be partial: it may have no author/mentions; we consult our cache first
        const cached = recentMentions.get(message.id);
        if (!cached) return; // no tracked mention -> ignore

        recentMentions.delete(message.id);

        // sanity checks
        const now = Date.now();
        if (now - cached.timestamp > GHOST_DETECTION_WINDOW) {
          // too old — ignore (user may have deleted long after)
          return;
        }

        // if message author not in guild or author is bot, ignore
        const guild = client.guilds.cache.get(String(cached.guildId));
        if (!guild) return;
        const authorMember = guild.members.cache.get(cached.authorId) || await guild.members.fetch(cached.authorId).catch(() => null);
        if (!authorMember || authorMember.user?.bot) return;

        // It's a ghostping: increment count and act according to config
        const newCount = await ghostStorage.incrementCount(cached.guildId, cached.authorId, 1);

        const settings = await ghostStorage.getSettings(cached.guildId);
        // prepare notification message
        const channel = guild.channels.cache.get(String(cached.channelId));
        if (!channel || !channel.isTextBased?.()) return;

        const mentionedPretty = cached.mentionedIds.map(id => `<@${id}>`).join(' ');
        const plural = newCount === 1 ? '' : 's';
        const baseMsg = `⚠️ Ghost ping detected: <@${cached.authorId}> mentioned ${mentionedPretty} and deleted the message. This is ghost ping #${newCount}.`;

        // always notify in channel (configurable to 'none' but we still store counts).
        if (settings.action === 'none') {
          // do minimal notify if you want — currently do nothing when none, but you could log to mod channel
          return;
        }

        if (settings.action === 'notify') {
          // notify in channel but don't take punitive action
          await channel.send({ content: baseMsg }).catch(() => {});
          return;
        }

        if (settings.action === 'timeout') {
          // attempt to timeout the member
          const durationMs = (settings.timeoutSeconds || 300) * 1000;
          try {
            // check bot permissions
            const me = guild.members.me;
            if (!me.permissions.has?.(1 << 24) /* Moderation? */) {
              // fallback: notify only
              await channel.send({ content: `${baseMsg}\n⚠️ I lack the Moderation permission to timeout the user.` }).catch(() => {});
              return;
            }

            // timeout user
            await authorMember.timeout(durationMs, 'Anti-ghostping enforcement').catch(async (err) => {
              // if timeout fails, fall back to notifying
              await channel.send({ content: `${baseMsg}\n⚠️ Failed to timeout — action fallback to notify.` }).catch(() => {});
            });

            await channel.send({ content: `${baseMsg}\n⏱️ Timed out for ${settings.timeoutSeconds}s.` }).catch(() => {});
            return;
          } catch (err) {
            // on unexpected error, send notification
            await channel.send({ content: `${baseMsg}\n⚠️ Action failed: ${String(err.message || err)}` }).catch(() => {});
            return;
          }
        }
      } catch (err) {
        console.error('[antiGhost] messageDelete handler error', err);
      }
    });

    // Optional: also handle messageUpdate deletions where content becomes empty? ignored.

    console.log('[antiGhost] listeners registered');
  }
};