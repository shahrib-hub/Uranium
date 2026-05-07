// src/utils/automodEngine.js
const AutomodStorage = require('./automodStorage');
const automodCache = require('./automodCache');
const automodActions = require('./automodActions');
const { formatMember } = (() => {
  try { return require('./logFormatter'); } catch { return { formatMember: (m)=> m?.user?.tag || m?.id || 'Unknown'}; }
})();

const urlRx = /https?:\/\/[^\s]+/i;
const inviteRx = /(discord(?:\.gg|app\.com\/invite)\/[^\s/]+)/i;

function domainFromUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

// tokenize lower-case words (basic)
function tokenizeContent(text) {
  return (text || '').toLowerCase().match(/\b[\p{L}\d'-]{2,}\b/giu) || [];
}

module.exports = {
  async shouldIgnoreMessage(message, cfg) {
    if (!message.guild) return true;
    if (message.author?.bot) return true;
    if (!cfg) cfg = await AutomodStorage.getConfig(message.guild.id);

    // channel ignore
    if (cfg.IgnoredChannels && cfg.IgnoredChannels.includes(String(message.channel.id))) return true;

    // role ignore
    if (cfg.IgnoredRoles && message.member) {
      for (const r of message.member.roles.cache.keys()) {
        if (cfg.IgnoredRoles.includes(r)) return true;
      }
    }
    return false;
  },

  // Primary enforcement for a single message. Returns { triggered: boolean, reason, action }
  async evaluateMessage(message, client) {
    const guildId = message.guild?.id;
    if (!guildId) return { triggered: false };

    const cfg = await AutomodStorage.getConfig(guildId);
    if (!cfg) return { triggered: false };

    if (await this.shouldIgnoreMessage(message, cfg)) return { triggered: false };

    const content = message.content || '';
    const lower = content.toLowerCase();

    // 1) Banned words
    if (cfg.BannedWords?.enabled && Array.isArray(cfg.BannedWords.words) && cfg.BannedWords.words.length) {
      const tokens = tokenizeContent(content);
      const bannedHit = cfg.BannedWords.words.find(w => tokens.includes(w.toLowerCase()));
      if (bannedHit) {
        const embed = {
          title: 'Automod: Banned word detected',
          description: `User ${message.author.tag} (${message.author.id}) used banned word \`${bannedHit}\` in ${message.channel.toString()}`,
        };
        await automodActions.performAction(cfg.BannedWords.action || 'delete', {
          message, member: message.member, guild: message.guild, user: message.author, client, embedForLog: embed
        });
        return { triggered: true, reason: `banned-word:${bannedHit}`, action: cfg.BannedWords.action };
      }
    }

    // 2) Invite links
    const inv = inviteRx.exec(content);
    if (cfg.AntiInvite?.enabled && inv) {
      // check if whitelisted: if any whitelisted domain matches invite host (rare)
      const domain = domainFromUrl(inv[0]) || '';
      const whitelisted = cfg.AntiLink?.whitelistedDomains?.some(d => domain.endsWith(d));
      if (!whitelisted) {
        const embed = { title: 'Automod: Invite detected', description: `${message.author.tag} posted an invite in ${message.channel}` };
        await automodActions.performAction(cfg.AntiInvite.action || 'delete', { message, member: message.member, guild: message.guild, user: message.author, client, embedForLog: embed });
        return { triggered: true, reason: 'invite', action: cfg.AntiInvite.action };
      }
    }

    // 3) Links (AntiLink)
    const url = urlRx.exec(content);
    if (cfg.AntiLink?.enabled && url) {
      const domain = domainFromUrl(url[0]) || '';
      const whitelisted = cfg.AntiLink.whitelistedDomains?.some(d => domain.endsWith(d));
      if (!whitelisted) {
        const embed = { title: 'Automod: Link detected', description: `${message.author.tag} posted a link in ${message.channel}` };
        await automodActions.performAction(cfg.AntiLink.action || 'delete', { message, member: message.member, guild: message.guild, user: message.author, client, embedForLog: embed });
        return { triggered: true, reason: 'link', action: cfg.AntiLink.action };
      }
    }

    // 4) Caps
    if (cfg.AntiCaps?.enabled) {
      const letters = (content.match(/[A-Z]/g) || []).length;
      const totalLetters = (content.match(/[A-Za-z]/g) || []).length;
      if (totalLetters > 5) {
        const pct = Math.round((letters / totalLetters) * 100);
        if (pct >= (cfg.AntiCaps.percentage || 70)) {
          const embed = { title: 'Automod: Excessive caps', description: `${message.author.tag} used ${pct}% CAPS in ${message.channel}` };
          await automodActions.performAction(cfg.AntiCaps.action || 'delete', { message, member: message.member, guild: message.guild, user: message.author, client, embedForLog: embed });
          return { triggered: true, reason: 'caps', action: cfg.AntiCaps.action };
        }
      }
    }

    // 5) Mention spam
    if (cfg.AntiMentionSpam?.enabled) {
      const mentionCount = (message.mentions?.users?.size || 0) + (message.mentions?.roles?.size || 0);
      if (mentionCount > (cfg.AntiMentionSpam.maxMentions || 6)) {
        const embed = { title: 'Automod: Mention spam', description: `${message.author.tag} mentioned ${mentionCount} targets in ${message.channel}` };
        await automodActions.performAction(cfg.AntiMentionSpam.action || 'delete', { message, member: message.member, guild: message.guild, user: message.author, client, embedForLog: embed });
        return { triggered: true, reason: 'mentions', action: cfg.AntiMentionSpam.action };
      }
    }

    // 6) Anti-spam (rate)
    if (cfg.AntiSpam?.enabled) {
      const windowS = Math.max(1, cfg.AntiSpam.timeWindow || 5);
      const maxMsgs = Math.max(1, cfg.AntiSpam.maxMessages || 5);
      automodCache.addMessageTimestamp(message.guild.id, message.author.id, Date.now());
      const arr = automodCache.getMessageTimestamps(message.guild.id, message.author.id);
      const cutoff = Date.now() - (windowS * 1000);
      const recent = arr.filter(t => t >= cutoff);
      if (recent.length >= maxMsgs) {
        const embed = { title: 'Automod: Anti-spam triggered', description: `${message.author.tag} sent ${recent.length} messages in ${windowS}s in ${message.channel}` };
        await automodActions.performAction(cfg.AntiSpam.action || 'delete', { message, member: message.member, guild: message.guild, user: message.author, client, embedForLog: embed });
        // clear timestamps for this user for a small cooldown
        automodCache.pruneMessageTimestamps(message.guild.id, windowS * 1000);
        return { triggered: true, reason: 'spam', action: cfg.AntiSpam.action };
      }
    }

    return { triggered: false };
  }
};