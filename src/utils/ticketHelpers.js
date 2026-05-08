// src/utils/ticketHelpers.js
const { 
  getConfig: getDbConfig, 
  setConfig: setDbConfig,
  getPanels,
  getPanelById,
  createPanel,
  removePanel: removeDbPanel,
  getTicketByChannel: getDbTicket
} = require('./ticketDb');
const { useMongoDB } = require('../config/database');

async function getConfig(guildId) {
  return await getDbConfig(guildId);
}

async function setConfig(guildId, config) {
  return await setDbConfig(guildId, config);
}

async function getPanelsForGuild(guildId) {
  const panels = await getPanels(guildId);
  return panels.map(p => ({
    ...p,
    types: p.types || '[]' // Ensure types is a string if it's not already
  }));
}

async function getPanel(panelId) {
  return await getPanelById(panelId);
}

async function createOrUpdatePanel(panelId, guildId, channelId, name, types = [], premiumOnly = false) {
  return await createPanel({
    panel_id: panelId,
    guild_id: guildId,
    channel_id: channelId,
    name: name,
    is_premium_only: premiumOnly ? 1 : 0,
    types: JSON.stringify(types || [])
  });
}

async function removePanel(panelId) {
  return await removeDbPanel(panelId);
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
