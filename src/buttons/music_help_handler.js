// src/buttons/music_help_handler.js — Premium Music Category Display
const { EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');

const COMMANDS = {
  playback: [
    { cmd: '/music play <query>', desc: 'Play a song from search term or URL' },
    { cmd: '/music search <query>', desc: 'Search and choose from results' },
    { cmd: '/music pause', desc: 'Pause the currently playing track' },
    { cmd: '/music resume', desc: 'Resume playback' },
    { cmd: '/music skip', desc: 'Skip to next track in queue' },
    { cmd: '/music stop', desc: 'Stop player and clear queue' },
    { cmd: '/music seek <seconds>', desc: 'Jump to position in current track' },
    { cmd: '/music previous', desc: 'Play the previous song' }
  ],
  queue: [
    { cmd: '/music queue', desc: 'Display the upcoming tracks' },
    { cmd: '/music clear', desc: 'Remove all songs from queue' },
    { cmd: '/music shuffle', desc: 'Randomize queue order' },
    { cmd: '/music remove <position>', desc: 'Remove track at specified position' }
  ],
  audio: [
    { cmd: '/music volume <1-100>', desc: 'Set player volume' },
    { cmd: '/music loop <mode>', desc: 'Toggle loop: off / track / queue' },
    { cmd: '/music filter <preset>', desc: 'Apply audio filter: Nightcore, Bassboost, Vaporwave, Soft, Karaoke, 8D Rotation, Chipmunk, Daycore' },
    { cmd: '/music autoplay [mode]', desc: 'Toggle or set automatic recommended queue playback' }
  ],
  connection: [
    { cmd: '/music join', desc: 'Bot joins your voice channel' },
    { cmd: '/music leave', desc: 'Disconnect bot from voice' }
  ],
  nowplaying: [
    { cmd: '/music nowplaying', desc: 'Show current track with full player controls (seek, volume, loop, filter)' }
  ],

};

const TITLES = {
  playback: '<:u_resume:1502240481818443896> Playback Controls',
  queue: '🎒 Queue Management',
  audio: '<:u_filters:1502243103774474240> Audio Effects',
  connection: '🔗 Voice Connection',
  nowplaying: 'ℹ️ Track Info',

};

module.exports = async (interaction) => {
  const value = interaction.values?.[0];
  if (!value) return;

  const commands = COMMANDS[value] || [];
  const botUser = interaction.client?.user;

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`${TITLES[value] || 'Music Commands'}`)
    .setDescription([
      `> **${commands.length}** command${commands.length === 1 ? '' : 's'} available`,
      '',
      '✦ **Command Usage:** Type the command as shown in chat',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
    ].join('\n'));

  if (botUser) {
    embed.setThumbnail(botUser.displayAvatarURL({ size: 256 }));
  }

  embed.addFields(
    ...commands.map((c, i) => ({
      name: `${(i + 1).toString().padStart(2, '0')}. ${c.cmd}`,
      value: `> ${c.desc}`,
      inline: false
    }))
  )
  .setFooter({ text: 'Uranium Music 🎵' })
  .setTimestamp();

  const select = new StringSelectMenuBuilder()
    .setCustomId('music_help_nav')
    .setPlaceholder('🎵 Choose a music category...')
    .addOptions([
      { label: 'Playback', value: 'playback', description: 'Play, pause, skip, stop, seek', emoji: { name: 'u_resume', id: '1502240481818443896' } },
      { label: '🎒 Queue', value: 'queue', description: 'Queue management commands', emoji: '🎒' },
      { label: 'Audio', value: 'audio', description: 'Volume, filters, loop', emoji: { name: 'u_filters', id: '1502243103774474240' } },
      { label: '🔗 Connection', value: 'connection', description: 'Join and leave voice', emoji: '🔗' },
      { label: 'ℹ️ Now Playing', value: 'nowplaying', description: 'Display current track & player info', emoji: 'ℹ️' }
    ]);

  const row = new ActionRowBuilder().addComponents(select);
  await interaction.update({ embeds: [embed], components: [row] });
};