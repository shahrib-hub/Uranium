// src/utils/ticketHelpers.js
const { get, run, all, getConfig: getDbConfig, setConfig: setDbConfig } = require('./ticketDb');
const { useMongoDB } = require('../config/database');
const { TicketPanel } = require('../database/mongoose');

async function getConfig(guildId) {
  return await getDbConfig(guildId);
}

async function setConfig(guildId, config) {
  return await setDbConfig(guildId, config);
}

async function getPanelsForGuild(guildId) {
  if (useMongoDB) {
    const docs = await TicketPanel.find({ guildId });
    return docs.map(doc => ({
      panel_id: doc.panelId,
      guild_id: doc.guildId,
      channel_id: doc.channelId,
      name: doc.name,
      is_premium_only: doc.isPremiumOnly ? 1 : 0,
      types: JSON.stringify(doc.types || [])
    }));
  }

  return await all(`SELECT * FROM ticket_panels WHERE guild_id = ?`, [guildId]);
}

async function getPanel(panelId) {
  if (useMongoDB) {
    const doc = await TicketPanel.findOne({ panelId });
    if (!doc) return undefined;
    return {
      panel_id: doc.panelId,
      guild_id: doc.guildId,
      channel_id: doc.channelId,
      name: doc.name,
      is_premium_only: doc.isPremiumOnly ? 1 : 0,
      types: JSON.stringify(doc.types || [])
    };
  }

  return await get(`SELECT * FROM ticket_panels WHERE panel_id = ?`, [panelId]);
}

async function createOrUpdatePanel(panelId, guildId, channelId, name, types = [], premiumOnly = false) {
  if (useMongoDB) {
    await TicketPanel.findOneAndUpdate(
      { panelId },
      { guildId, channelId, name, types: types || [], isPremiumOnly: premiumOnly },
      { upsert: true }
    );
    return;
  }

  const typesStr = JSON.stringify(types || []);
  return await run(
    `INSERT OR REPLACE INTO ticket_panels (panel_id, guild_id, channel_id, name, is_premium_only, types)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [panelId, guildId, channelId, name, premiumOnly ? 1 : 0, typesStr]
  );
}

async function removePanel(panelId) {
  if (useMongoDB) {
    await TicketPanel.deleteOne({ panelId });
    return;
  }

  return await run(`DELETE FROM ticket_panels WHERE panel_id = ?`, [panelId]);
}

function isTicketChannel(channelName) {
  return /^ticket-\d+$/.test(channelName);
}

function isSupport(interaction, supportRoleId) {
  // allow the support role OR ManageGuild permission
  try {
    return (
      (interaction.member && interaction.member.roles && interaction.member.roles.cache.has(supportRoleId)) ||
      (interaction.member && interaction.member.permissions && interaction.member.permissions.has && interaction.member.permissions.has('ManageGuild'))
    );
  } catch (e) {
    return false;
  }
}

// Premium util: try to require your existing premium util, fallback to false
let premiumUtil = null;
try {
  // Path used in your example ytverify file
  premiumUtil = require('../../utils/premium');
} catch (e) {
  try {
    premiumUtil = require('./premium');
  } catch (e2) {
    premiumUtil = null;
  }
}

function isPremiumGuild(guildId) {
  if (!premiumUtil) return false;
  try {
    if (typeof premiumUtil.isPremiumGuild === 'function') return premiumUtil.isPremiumGuild(guildId);
    if (typeof premiumUtil.getGuild === 'function') {
      const g = premiumUtil.getGuild(guildId);
      return !!g;
    }
    return false;
  } catch (e) {
    return false;
  }
}

module.exports = {
  getConfig,
  setConfig,
  getPanelsForGuild,
  getPanel,
  createOrUpdatePanel,
  removePanel,
  isTicketChannel,
  isSupport,
  isPremiumGuild
};
