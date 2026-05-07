const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  EmbedBuilder
} = require('discord.js');
const {
  COLORS,
  buildControlButtons,
  buildFilterMenu,
  currentFilterLabel,
  buildQueueEmbed,
  buildSearchEmbed,
  buildNowPlayingEmbed,
  errorEmbed,
  formatTimeMs,
  getDurationMs,
  successEmbed,
  simpleEmbed,
  trackDisplay,
  trackDuration,
  trackTitle,
  limit,
  trackAuthor
} = require('./ui');

const SEARCH_TIMEOUT = 10000;
const FILTER_PRESETS = {
  clear: {},
  none: {},
  nightcore: { timescale: { speed: 1.2, pitch: 1.2, rate: 1.0 } },
  bassboost: { equalizer: [{ band: 0, gain: 0.25 }, { band: 1, gain: 0.25 }, { band: 2, gain: 0.25 }] },
  vaporwave: { timescale: { speed: 0.85, pitch: 0.8 } },
  soft: { lowPass: { smoothing: 20.0 } },
  karaoke: { karaoke: { level: 1.0, monoLevel: 1.0, filterBand: 220.0, filterWidth: 100.0 } },
  rotation: { rotation: { rotationHz: 0.2 } },
  chipmunk: { timescale: { speed: 1.05, pitch: 1.35 } },
  daycore: { timescale: { speed: 0.85, pitch: 0.85 } }
};

function musicConfig(client) {
  return {
    defaultSource: client.musicConfig?.defaultSource || process.env.DEFAULT_SOURCE || 'ytmsearch:',
    lavaSrc: client.musicConfig?.lavaSrc || String(process.env.LAVASRC || 'false').toLowerCase() === 'true',
    lavaSrcSource: client.musicConfig?.lavaSrcSource || process.env.LAVASRC_SOURCE || 'spsearch:',
    minVolume: client.musicConfig?.minVolume ?? 1,
    maxVolume: client.musicConfig?.maxVolume ?? 100
  };
}
function getCurrentFilter(player) {
  return String(player?.data?.get('filter') || 'clear');
}


function searchSources(client) {
  const config = musicConfig(client);
  const sources = [];
  sources.push('ytmsearch:', 'ytsearch:');
  if (config.lavaSrc) sources.push(config.lavaSrcSource);
  sources.push('scsearch:');
  sources.push(''); 
  return [...new Set(sources.filter(s => s !== undefined))];
}

function withTimeout(promise, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out`)), SEARCH_TIMEOUT);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Robust track search with fallback mechanisms.
 * Fix: Explicitly handles URLs to prevent 'phantom' redirects by avoiding search prefixes on links.
 */
async function searchTracks(client, query, requester) {
  if (!query) return { tracks: [], type: 'SEARCH' };
  const q = String(query).trim();
  
  // 1. URL DETECTOR - If it's a URL, search it RAW without ANY prefixes.
  const isUrl = /^https?:\/\//.test(q);
  if (isUrl) {
    try {

      const result = await withTimeout(client.music.search(q, { requester }), 'URL Resolution');
      const tracks = result.tracks || result.data || [];
      if (tracks.length > 0) {

        result.tracks = tracks;
        return result;
      }
    } catch (e) {

    }
    // If it was a URL and it failed/returned nothing, do NOT fallback to fuzzy search as it leads to 'phantom' tracks.
    return { tracks: [], type: 'SEARCH', error: 'Failed to resolve link.' };
  }

  // 2. FUZZY SEARCH - For text queries, try multiple sources.
  let lastError = null;
  const sources = searchSources(client);
  for (const source of sources) {
    try {
      const searchQuery = source ? `${source}${q}` : q;

      const result = await withTimeout(client.music.search(searchQuery, { requester }), `Search with ${source || 'direct'}`);
      const tracks = result.tracks || result.data || [];
      if (tracks.length > 0) {
        result.tracks = tracks;
        result.usedSource = source || 'direct';
        return result;
      }
    } catch (error) {
      lastError = error;
    }
  }

  return { tracks: [], type: 'SEARCH', error: lastError?.message || 'No results found.' };
}

async function createPlayer(client, guildId, voiceId, textId) {
  if (!client.music) throw new Error('Music core not ready');
  let player = client.music.players.get(guildId);
  if (player) {
    if (player.voiceId !== voiceId) await player.setVoiceChannel(voiceId);
    if (textId) player.textId = textId;
    return player;
  }
  const guild = await client.guilds.fetch(guildId);
  player = await client.music.createPlayer({
    guildId,
    voiceId,
    textId: textId || null,
    shardId: guild.shardId ?? 0,
    volume: 100,
    deaf: true
  });
  if (!player.data.get('filter')) player.data.set('filter', 'clear');
  return player;
}

async function applyFilter(player, preset) {
  const normalized = String(preset || 'clear').toLowerCase();
  const filterData = FILTER_PRESETS[normalized] || {};
  if (normalized === 'clear' || normalized === 'none') {
    await player.shoukaku.clearFilters();
    player.data.set('filter', 'clear');
    return 'clear';
  }
  await player.shoukaku.setFilters(filterData);
  player.data.set('filter', normalized);
  return normalized;
}

async function updatePlayerMessage(client, player) {
  if (!player?.message || !player?.queue?.current) return null;
  return player.message.edit({
    embeds: [buildNowPlayingEmbed(player.queue.current, player, client)],
    components: buildControlButtons(player.guildId, player.paused)
  }).catch(() => null);
}

async function addTracksAndPlay(player, tracks) {
  player.queue.add(tracks);
  if (!player.playing && !player.paused) await player.play();
}

async function executeMusicAction(interaction) {
  const { client, guildId, member, options } = interaction;
  const sub = options.getSubcommand();


  let player = client.music?.players?.get(guildId);
  await interaction.deferReply({ flags: 64 }).catch(() => null);

  try {
    switch (sub) {
      case 'play': {
        const query = options.getString('query');
        if (!member.voice.channelId) return interaction.editReply('❌ Join a voice channel first.');
        if (player && player.voiceId !== member.voice.channelId) return interaction.editReply('❌ You must be in the same voice channel.');
        
        player = await createPlayer(client, guildId, member.voice.channelId, interaction.channelId);
        const res = await searchTracks(client, query, member);
        if (!res.tracks?.length) return interaction.editReply('❌ No results found.');
        
        await addTracksAndPlay(player, res.type === 'PLAYLIST' ? res.tracks : res.tracks[0]);
        await interaction.editReply(`✅ Added **${res.type === 'PLAYLIST' ? `${res.tracks.length} tracks` : res.tracks[0].title}** to queue.`);
        break;
      }

      case 'join': {
        if (!member.voice.channelId) return interaction.editReply('❌ Join a voice channel first.');
        player = await createPlayer(client, guildId, member.voice.channelId, interaction.channelId);
        await interaction.editReply(`✅ Joined <#${member.voice.channelId}>`);
        break;
      }

      case 'leave': {
        if (!player) return interaction.editReply('❌ No player active.');
        await player.destroy();
        await interaction.editReply('✅ Disconnected from voice.');
        break;
      }

      case 'pause': {
        if (!player) return interaction.editReply('❌ No player active.');
        await player.pause(true);
        await interaction.editReply('✅ Paused playback.');
        break;
      }

      case 'resume': {
        if (!player) return interaction.editReply('❌ No player active.');
        await player.pause(false);
        await interaction.editReply('✅ Resumed playback.');
        break;
      }

      case 'skip': {
        if (!player) return interaction.editReply('❌ No player active.');
        await player.skip();
        await interaction.editReply('✅ Skipped to next track.');
        break;
      }

      case 'stop': {
        if (!player) return interaction.editReply('❌ No player active.');
        await player.destroy();
        await interaction.editReply('✅ Stopped and cleared queue.');
        break;
      }

      case 'volume': {
        if (!player) return interaction.editReply('❌ No player active.');
        const vol = options.getInteger('value');
        if (vol === null) return interaction.editReply(`🔊 Current volume: \`${player.volume}%\``);
        player.setVolume(vol);
        await interaction.editReply(`✅ Volume set to \`${vol}%\``);
        break;
      }

      case 'queue': {
        if (!player) return interaction.editReply('❌ No player active.');
        await interaction.editReply({ embeds: [buildQueueEmbed(player)] });
        return; 
      }

      case 'nowplaying': {
        if (!player?.queue?.current) return interaction.editReply('❌ Nothing playing.');
        await interaction.editReply({ embeds: [buildNowPlayingEmbed(player.queue.current, player, client)] });
        return;
      }

      case 'filter': {
        if (!player) return interaction.editReply('❌ No player active.');
        const f = options.getString('mode');
        await applyFilter(player, f);
        await interaction.editReply(`✅ Applied filter: \`${f}\``);
        break;
      }

      case 'shuffle': {
        if (!player) return interaction.editReply('❌ No player active.');
        player.queue.shuffle();
        await interaction.editReply('✅ Shuffled the queue.');
        break;
      }

      case 'clear': {
        if (!player) return interaction.editReply('❌ No player active.');
        player.queue.clear();
        await interaction.editReply('✅ Cleared the queue.');
        break;
      }

      case 'search': {
        const query = options.getString('query');
        if (!member.voice.channelId) return interaction.editReply('❌ Join a voice channel first.');
        if (player && player.voiceId !== member.voice.channelId) return interaction.editReply('❌ You must be in the same voice channel.');
        
        player = await createPlayer(client, guildId, member.voice.channelId, interaction.channelId);
        const res = await searchTracks(client, query, member);
        if (!res.tracks?.length) return interaction.editReply('❌ No results found.');
        
        const tracks = res.tracks.slice(0, 10);
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId(`music_search_select:${guildId}`)
          .setPlaceholder('Select a track to play')
          .addOptions(tracks.map((t, i) => ({
            label: limit(trackDisplay(t, 50, 25), 100),
            description: `${trackDuration(t)} • ${limit(trackAuthor(t), 30)}`,
            value: String(i)
          })));
        
        await interaction.editReply({
          embeds: [buildSearchEmbed(query, tracks)],
          components: [new ActionRowBuilder().addComponents(selectMenu)]
        });
        
        const collector = interaction.channel.createMessageComponentCollector({
          time: 60000,
          filter: i => i.user.id === member.id && i.customId.startsWith('music_search_select:')
        });
        
        collector.on('collect', async i => {
          const idx = Number(i.values[0]);
          const selected = tracks[idx];
          if (!selected) return i.reply({ content: '❌ Invalid selection.', flags: 64 });
          
          await i.deferUpdate();
          await addTracksAndPlay(player, selected);
          await i.editReply({
            content: `✅ Added **${selected.title}** to queue.`,
            embeds: [],
            components: []
          });
          collector.stop();
        });
        
        collector.on('end', async (_, reason) => {
          if (reason !== 'messageDelete') {
            await interaction.editReply({ components: [] }).catch(() => {});
          }
        });
        return;
      }

      case 'loop': {
        if (!player) return interaction.editReply('❌ No player active.');
        const mode = options.getString('mode');
        if (!mode) {
           const modes = ['none', 'track', 'queue'];
           const next = modes[(modes.indexOf(player.loop || 'none') + 1) % 3];
           player.setLoop(next);
           await interaction.editReply(`✅ Loop mode set to \`${next}\``);
        } else {
           player.setLoop(mode);
           await interaction.editReply(`✅ Loop mode set to \`${mode}\``);
        }
        break;
      }
    }

    if (player) {
      setImmediate(() => {
        client.dashboardBridge?.emitPlayerUpdate(player);
      });
    }

  } catch (err) {
    console.error('[MusicAction] Error:', err);
    await interaction.editReply(`❌ Error: ${err.message}`).catch(() => null);
  }
}

module.exports = {
  applyFilter,
  createPlayer,
  addTracksAndPlay,
  executeMusicAction,
  searchTracks,
  updatePlayerMessage,
  formatTimeMs,
  musicConfig,
  getCurrentFilter
};
