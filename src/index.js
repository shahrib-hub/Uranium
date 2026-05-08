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
const { registerPlayerEvents } = require('./music/playerEvents');
const { createMusicManager } = require('./music/manager');

const { startDashboard } = require('./dashboard/server');

// ---------- Initialize MongoDB ----------
const { connectToMongo, getDbStatus } = require('./database/mongoose');
const { useMongoDB } = require('./config/database');

(async () => {
  if (useMongoDB) {
    await connectToMongo();
    if (!getDbStatus()) {
      console.error('❌ [CRITICAL] USE_MONGODB is enabled but the connection to MongoDB failed.');
      console.error('⚠️ Data persistence for major systems (Economy, Giveaways, Tickets, etc.) will NOT work.');
      console.error('💡 Please check your MONGODB_URI and IP whitelist in MongoDB Atlas.');
    }
  }

  // ---------- Database Cleanup (Remove MusicHub data) ----------
  try {
    const mongoose = require('mongoose');
    const collections = await mongoose.connection.db.listCollections({ name: 'musichubs' }).toArray();
    if (collections.length > 0) {
      await mongoose.connection.db.collection('musichubs').drop();
      console.log('🧹 [DATABASE] Central Music Hub data cleared from MongoDB.');
    }
  } catch (e) {
    console.warn('⚠️ [DATABASE] Failed to clear MusicHub data:', e?.message || e);
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

// ---------- Robust global error handlers (do NOT exit on Lavlink errors) ----------
process.on('uncaughtException', (err) => {
  try {
    const msg = String(err?.message || err);
    // If it's a lavalink/undici timeout or /v4/info problem, log and continue.
    if (msg.includes('/v4/info') || msg.includes('Lavalink Node') || msg.includes('undici') || msg.includes('TimeoutError') || msg.includes('ON-OPEN-FETCH')) {
      console.error('[UNCAUGHT] Lavalink-related error (swallowed):', msg);
      return;
    }
  } catch (e) {
    // fallthrough to general logging
  }
  // For non-lavalink critical exceptions, still log them but don't exit (you can change to process.exit if desired)
  console.error('[UNCAUGHT EXCEPTION] (non-lavalink) — logged for visibility:', err);
});

process.on('unhandledRejection', (reason) => {
  try {
    const msg = String(reason?.message || reason);
    const code = reason?.code;
    // Swallow harmless errors: Lavalink connectivity + expired Discord interactions (10062)
    if (msg.includes('/v4/info') || msg.includes('Lavalink Node') || msg.includes('undici') || msg.includes('TimeoutError') || msg.includes('ON-OPEN-FETCH')) {
      console.error('[UNHANDLED REJECTION] Lavalink-related (swallowed):', msg);
      return;
    }
    if (code === 10062 || msg.includes('Unknown interaction')) {
      // Interaction expired before bot could respond — harmless, ignore silently
      return;
    }
  } catch (e) {}
  console.error('[UNHANDLED REJECTION] (non-lavalink) — logged for visibility:', reason);
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

// load listeners if present
try {
  const ytv = path.join(__dirname, 'listeners', 'messageCreateYtVerify.js');
  if (fs.existsSync(ytv)) require(ytv)(client);
} catch (e) {
  console.warn('[listeners] messageCreateYtVerify failed to load:', e?.message || e);
}

// ---------- REST for command registration ----------
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// ---------- Client ready ----------
client.once('clientReady', async () => {
  console.clear();
  console.log(`
╔══════════════════════════════════════════════════════════╗
║ 🤖 Multi-Bot Discord v14                                 ║
║ 🛠️ Made by Mynzz                                          ║
║ 📦 Commands loaded: ${client.commands.size.toString().padEnd(40)}║
║ 🚀 Bot is now online and ready to serve!                 ║
╚══════════════════════════════════════════════════════════╝
  `);

  // Register slash commands
  try {
    console.log('🌐 Registering global commands...');
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: globalCommands });
    console.log('✅ Global commands registered!');
    if (process.env.DEV_GUILD_ID && devGuildCommands.length > 0) {
      console.log(`🛠️ Registering dev-only commands in guild ${process.env.DEV_GUILD_ID}...`);
      await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.DEV_GUILD_ID), { body: devGuildCommands });
      console.log('✅ Dev-only commands registered!');
    }
  } catch (err) {
    console.error('❌ Failed to register commands:', err?.message || err);
  }

   // Init music events
   try {
     registerPlayerEvents(client);
     console.log('🎧 Music system initialized (Shoukaku).');
   } catch (e) {
     console.error('❌ Failed to initialize music system:', e?.message || e);
   }

   // Init web dashboard
   try {
     startDashboard(client);
   } catch (e) {
     console.error('❌ Failed to start dashboard:', e?.message || e);
   }
});

  // ---------- Login ----------
  client.login(process.env.DISCORD_TOKEN).catch(err => {
    console.error('Failed to login:', err?.message || err);
  });
})();
