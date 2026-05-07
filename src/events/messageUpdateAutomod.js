// src/events/messageUpdateAutomod.js
// Protective handler: re-run automod on edited messages so users can't bypass rules by editing content.
// Relies on automodEngine.evaluateMessage(...) which performs checks and actions (delete/timeout/etc.).

const automodEngine = require('../utils/automodEngine');

module.exports = {
  name: 'messageUpdate',
  once: false,
  /**
   * @param {import('discord.js').Message|import('discord.js').PartialMessage} oldMessage
   * @param {import('discord.js').Message|import('discord.js').PartialMessage} newMessage
   * @param {import('discord.js').Client} client
   */
  async execute(oldMessage, newMessage, client) {
    try {
      // If the update is a partial, try to fetch full message(s)
      if (oldMessage?.partial) {
        try { oldMessage = await oldMessage.fetch(); } catch { /* ignore fetch failures */ }
      }
      if (newMessage?.partial) {
        try { newMessage = await newMessage.fetch(); } catch { /* ignore fetch failures */ }
      }

      // Basic guards
      if (!newMessage) return;
      if (!newMessage.guild) return; // only guild messages
      if (!newMessage.author) return;
      if (newMessage.author.bot) return; // ignore bot edits

      // If content didn't change (only embed/attachments/flags changed), ignore
      const before = (oldMessage?.content ?? '').trim();
      const after = (newMessage?.content ?? '').trim();
      if (before === after) return;

      // Run automod evaluation on the new content.
      // evaluateMessage should perform actions itself (delete/timeout/etc.).
      await automodEngine.evaluateMessage(newMessage, client);
    } catch (err) {
      // only log errors to avoid console flooding
      console.error('[messageUpdateAutomod] error', err);
    }
  }
};