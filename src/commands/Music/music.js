const { SlashCommandBuilder } = require('discord.js');
const { executeMusicAction } = require('../../music/service');

const filterChoices = [
  { name: 'Clear', value: 'clear' },
  { name: 'Nightcore', value: 'nightcore' },
  { name: 'Bassboost', value: 'bassboost' },
  { name: 'Vaporwave', value: 'vaporwave' },
  { name: 'Soft', value: 'soft' },
  { name: 'Karaoke', value: 'karaoke' },
  { name: '8D Rotation', value: 'rotation' },
  { name: 'Chipmunk', value: 'chipmunk' },
  { name: 'Daycore', value: 'daycore' }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('music')
    .setDescription('🎵 Premium music controls')
    .addSubcommand((sub) => sub.setName('play').setDescription('Play a song or playlist').addStringOption(opt => opt.setName('query').setDescription('Song name or URL').setRequired(true)))
    .addSubcommand((sub) => sub.setName('search').setDescription('Search and choose from results').addStringOption(opt => opt.setName('query').setDescription('Song name').setRequired(true)))
    .addSubcommand((sub) => sub.setName('join').setDescription('Join your voice channel'))
    .addSubcommand((sub) => sub.setName('leave').setDescription('Leave the voice channel'))
    .addSubcommand((sub) => sub.setName('pause').setDescription('Pause the current song'))
    .addSubcommand((sub) => sub.setName('resume').setDescription('Resume the current song'))
    .addSubcommand((sub) => sub.setName('skip').setDescription('Skip the current song'))
    .addSubcommand((sub) => sub.setName('previous').setDescription('Play the previous song'))
    .addSubcommand((sub) => sub.setName('stop').setDescription('Stop the player'))
    .addSubcommand((sub) => sub.setName('nowplaying').setDescription('Show the current song'))
    .addSubcommand((sub) => sub.setName('queue').setDescription('Show the queue list'))
    .addSubcommand((sub) => sub.setName('clear').setDescription('Clear the queue'))
    .addSubcommand((sub) => sub.setName('shuffle').setDescription('Shuffle the queue'))
    .addSubcommand((sub) =>
      sub.setName('remove')
        .setDescription('Remove a song from the queue')
        .addIntegerOption(opt => opt.setName('position').setDescription('Queue position').setRequired(true).setMinValue(1)))
    .addSubcommand((sub) =>
      sub.setName('seek')
        .setDescription('Seek the current song')
        .addIntegerOption(opt => opt.setName('seconds').setDescription('Position in seconds').setRequired(true).setMinValue(0)))
    .addSubcommand((sub) =>
      sub.setName('volume')
        .setDescription('Show or set the volume')
        .addIntegerOption(opt => opt.setName('value').setDescription('Volume percentage').setMinValue(1).setMaxValue(100)))
    .addSubcommand((sub) =>
      sub.setName('loop')
        .setDescription('Set loop mode')
        .addStringOption(opt =>
          opt.setName('mode')
            .setDescription('Loop mode')
            .setRequired(false)
            .addChoices(
              { name: 'Off', value: 'none' },
              { name: 'Song', value: 'track' },
              { name: 'Queue', value: 'queue' }
            )))
    .addSubcommand((sub) =>
      sub.setName('filter')
        .setDescription('Apply an audio filter')
        .addStringOption(opt =>
          opt.setName('mode')
            .setDescription('Filter preset')
            .setRequired(true)
            .addChoices(...filterChoices)))
    .addSubcommand((sub) => sub.setName('help').setDescription('Show music help menu')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const client = interaction.client;

    // ── HELP ───────────────────────────────────────────────────────────────────
    if (sub === 'help') {
      const { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
      const embed = new EmbedBuilder()
        .setColor(0xff4fd8)
        .setTitle('🎵 Uranium Music — Command Center')
        .setDescription('Premium music player with advanced controls.')
        .addFields(
          { name: '⚡ Quick Actions', value: '`/music play <query>` — Play any song\n`/music queue` — View playlist\n`/music skip` — Skip track\n`/music nowplaying` — Display current track', inline: false },
          { name: '🎛️ Audio Control', value: '`/music volume <1-100>` — Adjust volume\n`/music filter <preset>` — Nightcore, Bassboost & more\n`/music loop <mode>` — Loop song/queue', inline: false },
          { name: '🔗 Connection', value: '`/music join` — Join VC\n`/music leave` — Disconnect bot', inline: false },
          { name: '📦 Queue Management', value: '`/music search` — Browse results\n`/music shuffle` — Randomize queue\n`/music clear` — Remove all songs\n`/music remove` — Remove specific track', inline: false }
        )
        .setFooter({ text: 'Uranium Music 🎵 Premium Audio Experience' })
        .setTimestamp()
        .setThumbnail(client.user.displayAvatarURL({ size: 256 }));

      const select = new StringSelectMenuBuilder()
        .setCustomId('music_help_nav')
        .setPlaceholder('🎵 Choose a music category...')
        .addOptions([
          { label: '▶️ Playback', value: 'playback', description: 'Play, pause, skip, stop, seek', emoji: '▶️' },
          { label: '🎒 Queue', value: 'queue', description: 'Queue management commands', emoji: '🎒' },
          { label: '🎛️ Audio', value: 'audio', description: 'Volume, filters, loop', emoji: '🎛️' },
          { label: '🔗 Connection', value: 'connection', description: 'Join and leave voice', emoji: '🔗' },
          { label: 'ℹ️ Now Playing', value: 'nowplaying', description: 'Display current track & player info', emoji: 'ℹ️' }
        ]);

      const row = new ActionRowBuilder().addComponents(select);
      return interaction.reply({ embeds: [embed], components: [row] });
    }

    return executeMusicAction(interaction);
  }
};
