const { Client, GatewayIntentBits, Routes } = require('discord.js');
require('dotenv').config();

async function testEditMe() {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  
  await client.login(process.env.DISCORD_TOKEN);
  console.log('Logged in as:', client.user.tag);

  const guilds = Array.from(client.guilds.cache.values());
  console.log('Bot is in guilds:', guilds.map(g => ({ id: g.id, name: g.name })));

  if (guilds.length === 0) {
    console.log('No guilds found');
    await client.destroy();
    return;
  }

  const testGuild = guilds[0];
  console.log('Testing in guild:', testGuild.name, testGuild.id);

  const me = await testGuild.members.fetchMe();
  console.log('Current nickname:', me.nickname);
  console.log('Current guild avatar:', me.avatar);

  // Check what permissions the bot has
  console.log('Permissions: ChangeNickname:', me.permissions.has('ChangeNickname'), 'ManageNicknames:', me.permissions.has('ManageNicknames'));

  await client.destroy();
}

testEditMe().catch(err => {
  console.error('Error in testEditMe:', err);
  process.exit(1);
});
