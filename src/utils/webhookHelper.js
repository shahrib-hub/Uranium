// src/utils/webhookHelper.js
const { WebhookClient } = require('discord.js');
const logStorage = require('./logStorage');

/**
 * Attempts to create a webhook in the given channel and persist its id/token to logStorage.
 * Returns an object: { id, token, url } on success, or throws on failure.
 *
 * @param {Client} client - the Discord client instance
 * @param {string} guildId
 * @param {string} channelId
 * @param {string} name - webhook display name
 * @returns {Promise<{id: string|null, token: string|null, url: string|null}>}
 */
async function createAndSaveWebhook(client, guildId, channelId, name = 'Guild Logger') {
  // ensure storage ready
  await logStorage.init?.();

  const guild = client.guilds.cache.get(guildId);
  if (!guild) throw new Error('Guild not cached on client');

  const channel = guild.channels.cache.get(channelId);
  if (!channel || !channel.isTextBased?.()) throw new Error('Invalid text channel');

  // permission check
  const me = guild.members.me;
  if (!me) throw new Error('Bot member not available');
  if (!me.permissionsIn(channel).has('ManageWebhooks')) {
    throw new Error('Missing Manage Webhooks permission in target channel');
  }

  try {
    // create webhook
    const webhook = await channel.createWebhook({
      name: name?.slice(0, 80) || 'Guild Logger',
      reason: 'Auto-created webhook for guild logging'
    });

    // webhook may or may not expose token depending on the environment; try to extract
    // If token not present, we still save the id and rely on fetch/delete via guild webhooks.
    const token = webhook.token ?? null;
    const id = webhook.id ?? null;
    const url = token && id ? `https://discord.com/api/webhooks/${id}/${token}` : null;

    await logStorage.setWebhook(guildId, id, token);
    return { id, token, url };
  } catch (err) {
    // bubble a clear error
    throw new Error(`Failed to create webhook: ${err.message || String(err)}`);
  }
}

/**
 * Removes saved webhook credentials from DB and attempts to delete the actual webhook.
 * Returns true if deletion attempted (even if the webhook couldn't be deleted).
 *
 * @param {Client} client
 * @param {string} guildId
 * @returns {Promise<boolean>}
 */
async function removeSavedWebhook(client, guildId) {
  await logStorage.init?.();

  const saved = await logStorage.getWebhook(guildId);
  // saved = { id, token } or null
  const guild = client.guilds.cache.get(guildId);

  // clear from DB first — best-effort
  await logStorage.setWebhook(guildId, null, null);

  if (!saved) return true;

  const { id: webhookId, token } = saved;

  // Attempt to delete via token if available
  if (webhookId && token) {
    try {
      const wc = new WebhookClient({ id: webhookId, token });
      await wc.delete().catch(() => {});
      return true;
    } catch {
      // fallthrough to guild webhooks deletion attempt
    }
  }

  // If token not available or deletion failed, try to find webhook in guild and delete
  if (guild) {
    try {
      const hooks = await guild.fetchWebhooks();
      const hook = hooks.get(webhookId);
      if (hook) {
        await hook.delete('Removing saved logging webhook').catch(() => {});
      }
    } catch {
      // ignore — nothing else to do
    }
  }

  return true;
}

/**
 * Try to send via saved webhook: returns true if message was sent via webhook, false otherwise.
 * Accepts an object payload similar to WebhookClient#send (embeds, content, username, avatarURL).
 *
 * @param {string} guildId
 * @param {object} payload
 * @returns {Promise<boolean>}
 */
async function sendViaWebhookIfConfigured(client, guildId, payload) {
  await logStorage.init?.();
  const saved = await logStorage.getWebhook(guildId);
  if (!saved || !saved.id) return false;

  // If token exists we can use WebhookClient directly
  if (saved.token) {
    try {
      const wc = new WebhookClient({ id: saved.id, token: saved.token });
      await wc.send(payload).catch(() => { throw new Error('webhook-send-failed'); });
      return true;
    } catch (err) {
      // try guild fetch fallback
    }
  }

  // fallback: attempt to fetch webhook from guild and use it (requires the bot to have ManageWebhooks and the webhook to be present)
  const guilds = client.guilds.cache;
  for (const [, guild] of guilds) {
    if (guild.id !== String(guildId)) continue;
    try {
      const hooks = await guild.fetchWebhooks();
      const hook = hooks.get(saved.id);
      if (hook) {
        await hook.send(payload).catch(() => { throw new Error('webhook-send-failed-2'); });
        return true;
      }
    } catch {
      // ignore and return false
    }
  }

  return false;
}

module.exports = {
  createAndSaveWebhook,
  removeSavedWebhook,
  sendViaWebhookIfConfigured
};