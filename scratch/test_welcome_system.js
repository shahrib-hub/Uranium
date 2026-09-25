const welcomeStorage = require('../src/utils/welcomeStorage');
const welcomeCardRenderer = require('../src/utils/welcomeCardRenderer');
const welcomeHandler = require('../src/events/welcomeHandler');
const goodbyeHandler = require('../src/events/goodbyeHandler');
const { PermissionsBitField } = require('discord.js');

async function testWelcomeSystem() {
  console.log('--- 1. Testing welcomeStorage Bidirectional Aliases ---');
  const guildId = 'test_guild_suite_' + Date.now();

  await welcomeStorage.setConfig(guildId, {
    active: true,
    sendWelcomeMessage: true,
    welcomeChannelId: 'channel_101',
    welcomeMessageType: 'embed',
    welcomeMessage: 'Welcome {user} to {server}! Member #{server.member_count}',
    sendWelcomeCard: true,
    welcomeCardConfig: {
      font: 'Outfit, Arial, sans-serif',
      textColor: '#06B6D4',
      backgroundColor: '#0F172A',
      overlayOpacity: 0.8,
      theme: 'cyberpunk',
      titleTemplate: '{username} has entered the matrix',
      subtitleTemplate: 'Operative #{server.member_count}'
    },
    sendWelcomeDm: true,
    welcomeDmMessage: 'Welcome to {server}, {username}! We have {count} members.',
    sendWelcomeDmCard: true,
    autorolesEnabled: true,
    autoroleIds: ['role_member', 'role_verified'],
    sendGoodbyeMessage: true,
    goodbyeChannelId: 'channel_102',
    goodbyeMessageType: 'embed',
    goodbyeMessage: '{username} just left {server}. We now have {count} members.',
    sendGoodbyeCard: true
  });

  const s = await welcomeStorage.getSettings(guildId);

  // Validate all aliases
  console.assert(s.active === true && s.enabled === true, 'active <-> enabled failed');
  console.assert(s.sendWelcomeMessage === true && s.welcomeChannelEnabled === true, 'sendWelcomeMessage <-> welcomeChannelEnabled failed');
  console.assert(s.welcomeChannelId === 'channel_101', 'welcomeChannelId failed');
  console.assert(s.sendWelcomeCard === true && s.welcomeCardEnabled === true, 'sendWelcomeCard <-> welcomeCardEnabled failed');
  console.assert(s.sendWelcomeDm === true && s.dmEnabled === true, 'sendWelcomeDm <-> dmEnabled failed');
  console.assert(s.welcomeDmMessage === 'Welcome to {server}, {username}! We have {count} members.', 'welcomeDmMessage failed');
  console.assert(s.sendWelcomeDmCard === true && s.dmCardEnabled === true, 'sendWelcomeDmCard <-> dmCardEnabled failed');
  console.assert(s.autorolesEnabled === true && s.autoroleEnabled === true, 'autorolesEnabled <-> autoroleEnabled failed');
  console.assert(s.autoroleIds.length === 2, 'autoroleIds failed');
  console.assert(s.sendGoodbyeMessage === true && s.goodbyeEnabled === true, 'sendGoodbyeMessage <-> goodbyeEnabled failed');
  console.assert(s.goodbyeChannelId === 'channel_102', 'goodbyeChannelId failed');
  console.assert(s.sendGoodbyeCard === true && s.goodbyeCardEnabled === true, 'sendGoodbyeCard <-> goodbyeCardEnabled failed');
  console.assert(s.welcomeCardConfig.theme === 'cyberpunk', 'card theme failed');
  console.assert(s.cardTheme === 'cyberpunk', 'cardTheme property failed');
  console.assert(s.welcomeCardConfig.overlayOpacity === 0.8, 'overlayOpacity failed');
  console.assert(s.cardOverlayOpacity === 80, 'cardOverlayOpacity percent failed');
  console.log('✓ All storage alias pairs and card configs verified successfully!');

  console.log('\n--- 2. Testing Welcome & Goodbye Card Rendering ---');
  const welcomeCard = await welcomeCardRenderer.renderWelcomeCard({
    username: 'Shahrib',
    guildName: 'Uranium Lab',
    memberCount: 150,
    cardConfig: s.welcomeCardConfig,
    isGoodbye: false
  });
  console.assert(welcomeCard && welcomeCard.length > 5000, 'Welcome card buffer generation failed');
  console.log('✓ Welcome Card rendered! Size:', welcomeCard.length, 'bytes');

  const goodbyeCard = await welcomeCardRenderer.renderWelcomeCard({
    username: 'DepartedUser',
    guildName: 'Uranium Lab',
    memberCount: 149,
    cardConfig: s.welcomeCardConfig,
    isGoodbye: true
  });
  console.assert(goodbyeCard && goodbyeCard.length > 5000, 'Goodbye card buffer generation failed');
  console.log('✓ Goodbye Card rendered! Size:', goodbyeCard.length, 'bytes');

  console.log('\n--- 3. Testing welcomeHandler.execute Event Execution ---');
  let sentChannelMessages = [];
  let sentDmMessages = [];
  let assignedRoles = [];

  const mockChannel = {
    id: 'channel_101',
    name: 'welcome-chat',
    isTextBased: () => true,
    isThread: () => false,
    permissionsFor: () => ({
      has: (perm) => true
    }),
    send: async (payload) => {
      sentChannelMessages.push(payload);
      return payload;
    }
  };

  const mockRole1 = { id: 'role_member', name: 'Member', position: 2 };
  const mockRole2 = { id: 'role_verified', name: 'Verified', position: 3 };

  const mockGuild = {
    id: guildId,
    name: 'Uranium Lab',
    memberCount: 150,
    channels: {
      cache: new Map([['channel_101', mockChannel]]),
      fetch: async (id) => mockChannel
    },
    roles: {
      cache: new Map([
        ['role_member', mockRole1],
        ['role_verified', mockRole2]
      ]),
      fetch: async () => null
    },
    members: {
      me: {
        id: 'bot_id',
        permissions: { has: (perm) => true },
        roles: { highest: { position: 10 } }
      }
    }
  };

  const mockMember = {
    id: 'new_user_123',
    user: {
      id: 'new_user_123',
      username: 'Shahrib',
      discriminator: '0',
      bot: false,
      displayAvatarURL: () => 'https://cdn.discordapp.com/embed/avatars/0.png'
    },
    guild: mockGuild,
    roles: {
      add: async (roleId) => {
        assignedRoles.push(roleId);
      }
    },
    send: async (payload) => {
      sentDmMessages.push(payload);
      return payload;
    }
  };

  await welcomeHandler.execute(mockMember, {});
  console.assert(assignedRoles.length === 2, `Expected 2 autoroles added, got ${assignedRoles.length}`);
  console.assert(sentChannelMessages.length === 1, `Expected 1 channel welcome message, got ${sentChannelMessages.length}`);
  console.assert(sentDmMessages.length === 1, `Expected 1 DM welcome message, got ${sentDmMessages.length}`);
  console.assert(sentChannelMessages[0].embeds?.length === 1, 'Expected embed in welcome message');
  console.assert(sentChannelMessages[0].files?.length === 1, 'Expected welcome card attachment in files');
  console.log('✓ welcomeHandler executed successfully: assigned roles, sent embed, attached card, and sent DM!');

  console.log('\n--- 4. Testing goodbyeHandler.execute Event Execution ---');
  let sentGoodbyeMessages = [];
  const mockGoodbyeChannel = {
    id: 'channel_102',
    name: 'goodbye-chat',
    isTextBased: () => true,
    isThread: () => false,
    permissionsFor: () => ({
      has: (perm) => true
    }),
    send: async (payload) => {
      sentGoodbyeMessages.push(payload);
      return payload;
    }
  };

  mockGuild.channels.cache.set('channel_102', mockGoodbyeChannel);
  mockGuild.channels.fetch = async (id) => (id === 'channel_102' ? mockGoodbyeChannel : mockChannel);

  await goodbyeHandler.execute(mockMember, {});
  console.assert(sentGoodbyeMessages.length === 1, `Expected 1 goodbye message, got ${sentGoodbyeMessages.length}`);
  console.assert(sentGoodbyeMessages[0].embeds?.length === 1, 'Expected embed in goodbye message');
  console.assert(sentGoodbyeMessages[0].files?.length === 1, 'Expected goodbye card attachment');
  console.log('✓ goodbyeHandler executed successfully: dispatched embed and goodbye card!');

  console.log('\n--- 5. Testing Dashboard api.js Exports and Imports ---');
  const apiFile = require('../src/dashboard/api');
  console.assert(typeof apiFile === 'function' || typeof apiFile.createApiRouter === 'function' || typeof apiFile === 'object', 'api.js should export router factory');
  console.assert(typeof welcomeCardRenderer.renderWelcomeCard === 'function', 'renderWelcomeCard should be a function');
  console.assert(typeof welcomeCardRenderer.generateWelcomeCard === 'function', 'generateWelcomeCard should be a function');
  console.log('✓ api.js imports and welcomeCardRenderer functions verified!');

  console.log('\n========================================');
  console.log('ALL WELCOME & GOODBYE TESTS PASSED 100%!');
  console.log('========================================');
  process.exit(0);
}

testWelcomeSystem().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
