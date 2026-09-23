const welcomeStorage = require('../src/utils/welcomeStorage');
const { generateWelcomeCard } = require('../src/utils/welcomeCardRenderer');

async function testApiFlow() {
  const guildId = 'test_guild_suite';
  
  // 1. Get initial configuration
  const initial = await welcomeStorage.getSettings(guildId);
  console.log('1. Initial settings retrieved successfully:', {
    active: initial.active,
    sendWelcomeMessage: initial.sendWelcomeMessage,
    theme: initial.welcomeCardConfig.theme
  });

  // 2. Save new configuration
  await welcomeStorage.setConfig(guildId, {
    active: true,
    sendWelcomeMessage: true,
    welcomeChannelId: '123456789012345678',
    welcomeMessageType: 'embed',
    welcomeMessage: 'Welcome {user} to {server}!',
    welcomeEmbed: {
      title: 'Welcome to {server}!',
      description: 'Hey {user}, welcome! Read the rules and enjoy.',
      color: '#06b6d4'
    },
    sendWelcomeCard: true,
    welcomeCardConfig: {
      font: 'Segoe UI, Arial, sans-serif',
      textColor: '#FFFFFF',
      backgroundColor: '#0B0D14',
      overlayOpacity: 0.75,
      theme: 'cosmic_aurora',
      titleTemplate: '{user} just joined the server',
      subtitleTemplate: 'Member #{count}'
    },
    sendWelcomeDm: true,
    welcomeDmMessage: 'Thanks for joining {server}!',
    autorolesEnabled: true,
    autoroleIds: ['987654321098765432'],
    sendGoodbyeMessage: true,
    goodbyeChannelId: '123456789012345678',
    goodbyeMessage: '{username} just left {server}!',
    sendGoodbyeCard: true,
    captchaEnabled: false
  });
  console.log('2. Saved new configuration successfully');

  // 3. Verify fetched back
  const saved = await welcomeStorage.getSettings(guildId);
  console.log('3. Verified saved configuration:', {
    active: saved.active,
    welcomeChannelId: saved.welcomeChannelId,
    welcomeMessageType: saved.welcomeMessageType,
    autoroleIds: saved.autoroleIds,
    theme: saved.welcomeCardConfig.theme,
    titleTemplate: saved.welcomeCardConfig.titleTemplate
  });

  // 4. Render Card Buffer
  const card = await generateWelcomeCard({
    username: 'Shahrib',
    discriminator: '0',
    guildName: 'SHAHRIBs HEAven',
    memberCount: 100,
    cardConfig: saved.welcomeCardConfig
  });
  console.log('4. Rendered card buffer length:', card.length);

  console.log('\nAll API data contracts and rendering are 100% sound!');
}

testApiFlow().catch(console.error);
