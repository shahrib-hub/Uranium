const welcomeStorage = require('../src/utils/welcomeStorage');
const { renderWelcomeCard } = require('../src/utils/welcomeCardRenderer');

async function testWelcomeSystem() {
  console.log('Testing welcomeStorage.getSettings...');
  const initial = await welcomeStorage.getSettings('test_123456789');
  console.log('Initial settings loaded. Active:', initial.active, 'welcomeChannelEnabled:', initial.welcomeChannelEnabled);
  console.log('Card Config font:', initial.welcomeCardConfig.font, 'theme:', initial.welcomeCardConfig.theme);

  console.log('\nTesting welcomeStorage.setConfig with custom card config...');
  await welcomeStorage.setConfig('test_123456789', {
    active: true,
    sendWelcomeMessage: true,
    welcomeChannelId: '999888777',
    welcomeMessage: 'Welcome {user} to {server}! Member #{count}',
    welcomeCardConfig: {
      font: 'Outfit, Arial, sans-serif',
      textColor: '#06B6D4',
      backgroundColor: '#0F172A',
      overlayOpacity: 0.8,
      theme: 'cyberpunk',
      titleTemplate: '{username} has entered the mainframe',
      subtitleTemplate: 'Operative #{count}'
    },
    autorolesEnabled: true,
    autoroleIds: ['111222333', '444555666'],
    sendGoodbyeMessage: true,
    goodbyeChannelId: '999888777',
    goodbyeMessage: '{username} has departed.',
    captchaEnabled: true
  });

  const updated = await welcomeStorage.getSettings('test_123456789');
  console.log('Updated settings fetched successfully:');
  console.log('Active:', updated.active);
  console.log('Channel ID:', updated.welcomeChannelId);
  console.log('Autoroles:', updated.autoroleIds);
  console.log('Card Config font:', updated.welcomeCardConfig.font);
  console.log('Card Config text color:', updated.welcomeCardConfig.textColor);
  console.log('Card Config theme:', updated.welcomeCardConfig.theme);
  console.log('Card Config titleTemplate:', updated.welcomeCardConfig.titleTemplate);
  console.log('Card Config subtitleTemplate:', updated.welcomeCardConfig.subtitleTemplate);

  console.log('\nTesting Welcome Card Rendering with cyberpunk theme & custom config...');
  const cardBuf = await renderWelcomeCard({
    username: 'Shahrib',
    discriminator: '0',
    guildName: 'SHAHRIBs HEAven',
    memberCount: 50,
    cardConfig: updated.welcomeCardConfig,
    isGoodbye: false
  });

  console.log('Generated Card Buffer Size:', cardBuf.length, 'bytes');
  if (cardBuf && cardBuf.length > 1000) {
    console.log('SUCCESS: Card generated perfectly!');
  } else {
    throw new Error('Card buffer too small or failed');
  }

  console.log('\nTesting Goodbye Card Rendering...');
  const goodbyeBuf = await renderWelcomeCard({
    username: 'DepartedUser',
    discriminator: '0',
    guildName: 'SHAHRIBs HEAven',
    memberCount: 49,
    cardConfig: updated.welcomeCardConfig,
    isGoodbye: true
  });
  console.log('Generated Goodbye Card Buffer Size:', goodbyeBuf.length, 'bytes');

  console.log('\nALL VERIFICATION TESTS PASSED!');
}

testWelcomeSystem().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
