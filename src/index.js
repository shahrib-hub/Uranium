// src/index.js
require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  Collection,
  REST,
  Routes,
  Events
} = require('discord.js');
const fs = require('fs');
const path = require('path');

// Initialize translations via prototype patching
require('./utils/patchDiscordjs');

const { registerPlayerEvents } = require('./music/playerEvents');
const { createMusicManager } = require('./music/manager');

const { startDashboard } = require('./dashboard/server');
const logger = require('./utils/logger');
const chalk = require('chalk');

// ---------- Initialize MongoDB ----------
const { connectToMongo, getDbStatus } = require('./database/mongoose');
const { useMongoDB } = require('./config/database');

(async () => {
  if (useMongoDB) {
    await connectToMongo();
    if (!getDbStatus()) {
      logger.error('USE_MONGODB is enabled but the connection to MongoDB failed.');
      logger.warn('Data persistence for major systems (Economy, Giveaways, Tickets, etc.) will NOT work.');
    }
  }

  // ---------- Initialize RR Storage ----------
  const rrStorage = require('./utils/rrStorage');
  await rrStorage.initStorage();

  // ---------- Database Cleanup (Remove MusicHub data) ----------
  try {
    const mongoose = require('mongoose');
    const collections = await mongoose.connection.db.listCollections({ name: 'musichubs' }).toArray();
    if (collections.length > 0) {
      await mongoose.connection.db.collection('musichubs').drop();
      logger.info(chalk.green('🧹 [Database] Central Music Hub data cleared.'));
    }
  } catch (e) {
    logger.warn('[Database] Failed to clear MusicHub data: %s', e?.message || e);
  }

  // ---------- Create client ----------
  const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: ['MESSAGE', 'CHANNEL', 'REACTION']
});

client.setMaxListeners(50);

// ---------- Robust global error handlers (do NOT exit on Lavlink errors) ----------
process.on('uncaughtException', (err) => {
  const msg = String(err?.message || err);
  if (msg.includes('/v4/info') || msg.includes('Lavalink Node') || msg.includes('undici') || msg.includes('TimeoutError')) {
    logger.debug('[Lavalink] Network hiccup (swallowed): %s', msg);
    return;
  }
  logger.error('[Uncaught Exception] %s', err.stack || err);
});

process.on('unhandledRejection', (reason) => {
  const msg = String(reason?.message || reason);
  if (msg.includes('/v4/info') || msg.includes('Lavalink Node') || msg.includes('undici') || msg.includes('TimeoutError')) {
    logger.debug('[Lavalink] Promise rejection (swallowed): %s', msg);
    return;
  }
  if (reason?.code === 10062 || msg.includes('Unknown interaction')) return;
  logger.error('[Unhandled Rejection] %s', reason.stack || reason);
});

// ---------- Music manager (Shoukaku) ----------
client.music = createMusicManager(client);

// ---------- Command & event loader (unchanged logic) ----------
client.commands = new Collection();
const globalCommands = [];
const devGuildCommands = [];
const commandsPath = path.join(__dirname, 'commands');

function loadCommandFiles(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) loadCommandFiles(fullPath);
    else if (file.isFile() && file.name.endsWith('.js')) {
      const disableMusic = false; // Re-enabled as requested
      if (disableMusic && fullPath.includes(path.join('commands', 'Music'))) {
        console.warn(`⚠️ Skipping music command ${file.name} because music system is temporarily disabled.`);
        continue;
      }

      const command = require(fullPath);
      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        if (command.devOnly) devGuildCommands.push(command.data.toJSON());
        else globalCommands.push(command.data.toJSON());
      } else {
        console.warn(`⚠️ Skipping ${file.name}: missing "data" or "execute".`);
      }
    }
  }
}

loadCommandFiles(commandsPath);

const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
  const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));
  for (const file of eventFiles) {
    const event = require(path.join(eventsPath, file));
    if (event.name && typeof event.execute === 'function') {
      if (event.once) client.once(event.name, (...args) => event.execute(...args, client));
      else client.on(event.name, (...args) => event.execute(...args, client));
    } else {
      console.warn(`⚠️ Skipping event ${file}: missing "name" or "execute".`);
    }
  }
}

// load listeners
try {
  const ytv = path.join(__dirname, 'listeners', 'messageCreateYtVerify.js');
  if (fs.existsSync(ytv)) require(ytv)(client);
} catch (e) {}

// ---------- REST for command registration ----------
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// ---------- Client ready ----------
client.once('clientReady', async () => {
  console.clear();
  logger.info(chalk.cyan.bold('╔══════════════════════════════════════════════════════════╗'));
  logger.info(chalk.cyan.bold('║ 🤖 Multi-Bot Discord v14                                 ║'));
  logger.info(chalk.cyan.bold('║ 🛠️ Made by Mynzz                                          ║'));
  logger.info(chalk.cyan.bold(`║ 📦 Commands loaded: ${client.commands.size.toString().padEnd(40)}║`));
  logger.info(chalk.cyan.bold('║ 🚀 Bot is now online and ready to serve!                 ║'));
  logger.info(chalk.cyan.bold('╚══════════════════════════════════════════════════════════╝'));

  // Register slash commands
  try {
    logger.info(chalk.blue('🌐 Registering global commands...'));
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: globalCommands });
    logger.info(chalk.green('✅ Global commands registered!'));
    if (process.env.DEV_GUILD_ID && devGuildCommands.length > 0) {
      logger.info(chalk.blue(`🛠️ Registering dev-only commands in guild ${process.env.DEV_GUILD_ID}...`));
      await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.DEV_GUILD_ID), { body: devGuildCommands });
      logger.info(chalk.green('✅ Dev-only commands registered!'));
    }
  } catch (err) {
    logger.error('❌ Failed to register commands: %s', err?.message || err);
  }

   // Init music events
   try {
     registerPlayerEvents(client);
     logger.info(chalk.magenta('🎧 Music system initialized (Shoukaku).'));
   } catch (e) {
     logger.error('❌ Failed to initialize music system: %s', e?.message || e);
   }

   // Init web dashboard
   try {
     startDashboard(client);
   } catch (e) {
     logger.error('❌ Failed to start dashboard: %s', e?.message || e);
   }
});

  // ---------- Login ----------
  client.login(process.env.DISCORD_TOKEN).catch(err => {
    logger.error('Failed to login: %s', err?.message || err);
  });
})();
