const { EmbedBuilder } = require('discord.js');

const sessions = new Map();

/**
 * Creates a new embed builder session for a user.
 * @param {string} userId - Discord user ID
 * @returns {object} session object
 */
function createSession(userId) {
  const embed = new EmbedBuilder();
  const session = {
    embed,
    fields: [],
    timestamp: false,
    timeout: null,
    channel: null,
    aiGenerated: false
  };
  sessions.set(userId, session);
  return session;
}

/**
 * Retrieves an existing session for a user.
 * @param {string} userId - Discord user ID
 * @returns {object|null} session object or null
 */
function getSession(userId) {
  return sessions.get(userId) || null;
}

/**
 * Clears a user's session.
 * @param {string} userId - Discord user ID
 */
function clearSession(userId) {
  sessions.delete(userId);
}

/**
 * Updates the embed preview with current session data.
 * @param {object} session - session object
 */
function updateEmbed(session) {
  const embed = new EmbedBuilder(session.embed.data);

  // Apply fields
  if (session.fields.length) {
    embed.setFields(session.fields);
  }

  // Apply timestamp
  if (session.timestamp) {
    embed.setTimestamp();
  }

  session.embed = embed;
}

module.exports = {
  createSession,
  getSession,
  clearSession,
  updateEmbed,
  sessions
};
