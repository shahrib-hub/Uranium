// src/events/messageCreateAutomod.js
const automodEngine = require('../utils/automodEngine');

module.exports = {
  name: 'messageCreate',
  once: false,
  async execute(message, client) {
    try {
      if (!message.guild) return;
      // The engine handles ignore/author.bot checks internally.
      await automodEngine.evaluateMessage(message, client);
    } catch (err) {
      console.error('[messageCreateAutomod] error', err);
    }
  }
};