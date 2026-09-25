// scratch/test_systems_integration.js — Full automated tests for Plugins, Autoresponse, Ranking, and Custom Commands
const assert = require('assert');

async function testPlugins() {
  console.log('\n--- 1. Testing Plugin System & Command Barring ---');
  const pluginStorage = require('../src/utils/pluginStorage');

  const testGuild = 'test_guild_plugins_999';

  // 1. Initial plugins list
  const plugins = await pluginStorage.getGuildPlugins(testGuild);
  assert.ok(Array.isArray(plugins), 'Plugins should be an array');
  assert.ok(plugins.length >= 10, 'Should have registered plugins');

  const familyPlugin = plugins.find(p => p.id === 'family');
  assert.ok(familyPlugin, 'Family plugin should be registered');
  assert.strictEqual(familyPlugin.hasDedicatedPage, false, 'Family should have no dedicated sidebar page');

  // 2. Default state should be enabled
  const defaultEnabled = await pluginStorage.isPluginEnabled(testGuild, 'family');
  assert.strictEqual(defaultEnabled, true, 'Plugins should be enabled by default');

  // 3. Toggle to disabled
  await pluginStorage.setPluginEnabled(testGuild, 'family', false);
  const nowDisabled = await pluginStorage.isPluginEnabled(testGuild, 'family');
  assert.strictEqual(nowDisabled, false, 'Plugin should be disabled after toggle');

  // 4. Command mapping check
  const mappedFamily = pluginStorage.getPluginForCommand('family');
  assert.strictEqual(mappedFamily, 'family');

  const mappedRank = pluginStorage.getPluginForCommand('rank');
  assert.strictEqual(mappedRank, 'ranking');

  const mappedCustom = pluginStorage.getPluginForCommand('customcommand');
  assert.strictEqual(mappedCustom, 'customcommands');

  const mappedLog = pluginStorage.getPluginForCommand('log');
  assert.strictEqual(mappedLog, 'logging');

  // Re-enable family for cleanliness
  await pluginStorage.setPluginEnabled(testGuild, 'family', true);
  console.log('✅ Plugin System & Command Barring passed');
}

async function testAutoresponse() {
  console.log('\n--- 2. Testing Auto-response System ---');
  const { addAutoResponse, getAutoResponse, removeAutoResponse, getAutoResponses } = require('../src/utils/autoresponse');

  const testGuild = 'test_guild_autoresponse_999';
  const trigger = 'pingtest123';
  const response = 'Pong! Hello {user}!';

  await addAutoResponse(testGuild, trigger, response, false);
  const fetched = await getAutoResponse(testGuild, trigger);
  assert.ok(fetched, 'Should fetch created autoresponse');
  assert.strictEqual(fetched.response, response);

  const all = await getAutoResponses(testGuild);
  assert.ok(all.some(a => a.trigger === trigger));

  await removeAutoResponse(testGuild, trigger);
  const deleted = await getAutoResponse(testGuild, trigger);
  assert.strictEqual(deleted, null, 'Autoresponse should be deleted');
  console.log('✅ Auto-response System passed');
}

async function testRanking() {
  console.log('\n--- 3. Testing Ranking System ---');
  const ranking = require('../src/utils/ranking');
  const testGuild = 'test_guild_ranking_999';

  const cfg = await ranking.getConfig(testGuild);
  assert.ok(cfg, 'Should fetch ranking config');

  const updatedCfg = await ranking.setConfig(testGuild, {
    announcement_channel: 'custom',
    custom_announcement_channel: '123456789012345678',
    announcement_message: 'Congrats {user}, you hit {level}!',
    xp_rate: 1.5,
    cooldown_seconds: 45
  });

  assert.strictEqual(updatedCfg.announcement_channel, 'custom');
  assert.strictEqual(updatedCfg.custom_announcement_channel, '123456789012345678');
  assert.strictEqual(updatedCfg.xp_rate, 1.5);
  assert.strictEqual(updatedCfg.cooldown_seconds, 45);

  // Role rewards
  await ranking.setRoleReward(testGuild, 5, '999888777666');
  const rewards = await ranking.listRoleRewards(testGuild);
  assert.ok(rewards.some(r => r.level === 5 && r.role_id === '999888777666'));

  await ranking.removeRoleReward(testGuild, 5);
  const rewardsAfter = await ranking.listRoleRewards(testGuild);
  assert.ok(!rewardsAfter.some(r => r.level === 5));

  console.log('✅ Ranking System passed');
}

async function testCustomCommands() {
  console.log('\n--- 4. Testing Custom Commands System & Quotas ---');
  const customCommandStorage = require('../src/utils/customCommandStorage');
  const testGuild = 'test_guild_custom_commands_999';

  // Clear previous test commands
  const initial = await customCommandStorage.getCustomCommands(testGuild);
  for (const c of initial) {
    await customCommandStorage.deleteCustomCommand(testGuild, c.name);
  }

  // 1. Create a command
  const saved = await customCommandStorage.saveCustomCommand(testGuild, {
    name: 'mcip',
    description: 'Minecraft server IP',
    message: 'Server IP: mc.uranium.gg',
    ephemeral: true,
    permissions: {
      allowedRoles: ['111222'],
      allowedChannels: ['333444']
    },
    cooldown: {
      type: 'user',
      seconds: 15
    }
  });

  assert.strictEqual(saved.name, 'mcip');
  assert.strictEqual(saved.data.ephemeral, true);
  assert.strictEqual(saved.data.cooldown.seconds, 15);

  const fetched = await customCommandStorage.getCustomCommand(testGuild, 'mcip');
  assert.ok(fetched);
  assert.strictEqual(fetched.description, 'Minecraft server IP');

  // 2. Test quota limit (Free tier max 10)
  for (let i = 1; i <= 9; i++) {
    await customCommandStorage.saveCustomCommand(testGuild, {
      name: `testcmd${i}`,
      message: `Response ${i}`
    });
  }

  const countAfter10 = await customCommandStorage.countCustomCommands(testGuild);
  assert.strictEqual(countAfter10, 10);

  // 11th should throw limit error on free tier
  let limitHit = false;
  try {
    await customCommandStorage.saveCustomCommand(testGuild, {
      name: 'testcmd11',
      message: 'This should fail on free tier'
    });
  } catch (err) {
    limitHit = true;
    assert.ok(err.message.includes('Command limit reached'));
  }
  assert.strictEqual(limitHit, true, 'Free tier must block creation past 10 commands');

  // Clean up
  for (let i = 1; i <= 9; i++) {
    await customCommandStorage.deleteCustomCommand(testGuild, `testcmd${i}`);
  }
  await customCommandStorage.deleteCustomCommand(testGuild, 'mcip');

  console.log('✅ Custom Commands System passed (Quotas and Limits verified)');
}

async function runAll() {
  console.log('🚀 Running Full Systems Integration Suite...');
  await testPlugins();
  await testAutoresponse();
  await testRanking();
  await testCustomCommands();
  console.log('\n🎉 ALL INTEGRATION TESTS PASSED PERFECTLY!');
}

runAll().catch((err) => {
  console.error('\n❌ Integration Test Error:', err);
  process.exit(1);
});
