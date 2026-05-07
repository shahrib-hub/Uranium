const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require('discord.js');

const COLORS = {
  DARK: 0x19061b,
  ACCENT: 0xff4fd8,
  SUCCESS: 0x57f287,
  ERROR: 0xed4245,
  MUTED: 0x7b486f,
  PLAYING: 0x00d9ff,
  PAUSED: 0xffa500
};

function clean(value, fallback = 'Unknown') {
  const text = String(value || '').trim();
  if (!text || /^unknown$/i.test(text)) return fallback;
  return text.replace(/\s+-\s+Topic$/i, '').trim() || fallback;
}

function limit(value, max) {
  const text = String(value || '');
  return text.length > max ? `${text.slice(0, Math.max(0, max - 3))}...` : text;
}

function getDurationMs(track) {
  if (!track) return null;
  const info = track.info || track.raw?.info || track;
  const value = info.length ?? info.duration ?? info.durationMs ?? track.length ?? track.duration;

  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
  if (typeof value === 'string' && /^\d{1,2}:\d{2}(:\d{2})?$/.test(value)) {
    const parts = value.split(':').map(Number);
    if (parts.length === 2) return (parts[0] * 60 + parts[1]) * 1000;
    return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
  }

  return null;
}

function formatTimeMs(ms) {
  if (ms === null || ms === undefined || Number.isNaN(Number(ms))) return 'Unknown';
  if (ms === 0) return 'LIVE';

  const totalSeconds = Math.floor(Number(ms) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function trackTitle(track) {
  return clean(track?.title || track?.info?.title, 'Unknown Title');
}

function trackAuthor(track) {
  return clean(track?.author || track?.info?.author, '');
}

function trackDisplay(track, maxTitle = 45, maxAuthor = 30) {
  const title = limit(trackTitle(track), maxTitle);
  const author = limit(trackAuthor(track), maxAuthor);
  return author ? `${title} - ${author}` : title;
}

function trackDuration(track) {
  return track?.isStream || track?.info?.isStream ? 'LIVE' : formatTimeMs(getDurationMs(track));
}

function sourceName(track) {
  const source = clean(track?.sourceName || track?.raw?.info?.sourceName || track?.info?.sourceName, 'Unknown');
  return source.charAt(0).toUpperCase() + source.slice(1);
}

function requesterMention(requester) {
  if (!requester) return 'Unknown';
  if (requester.user?.id) return `<@${requester.user.id}>`;
  if (requester.id) return `<@${requester.id}>`;
  return String(requester);
}

function currentFilterLabel(player) {
  const filter = String(player?.data?.get('filter') || 'clear');
  const labels = {
    clear: 'Off',
    none: 'Off',
    nightcore: 'Nightcore',
    bassboost: 'Bassboost',
    vaporwave: 'Vaporwave',
    soft: 'Soft',
    karaoke: 'Karaoke',
    rotation: '8D Rotation',
    chipmunk: 'Chipmunk',
    daycore: 'Daycore'
  };

  return labels[filter] || clean(filter, 'Off');
}

function progressBar(position, duration) {
  if (!duration || duration <= 0) return '`◐ LIVE`';

  const clamped = Math.max(0, Math.min(position || 0, duration));
  const percentage = clamped / duration;
  const segments = 20;
  const filled = Math.max(0, Math.min(segments, Math.round(percentage * segments)));
  
  const empty = '░'.repeat(segments);
  const bar = '█'.repeat(filled) + '▓' + '░'.repeat(Math.max(0, segments - filled - 1));
  
  return `\`[${formatTimeMs(clamped)} / ${formatTimeMs(duration)}]\`\n\`${bar}\``;
}

function baseEmbed(color = COLORS.ACCENT) {
  return new EmbedBuilder().setColor(color).setTimestamp();
}

function simpleEmbed(description, color = COLORS.ACCENT) {
  return baseEmbed(color).setDescription(description);
}

function errorEmbed(description) {
  return simpleEmbed(description, COLORS.ERROR);
}

function successEmbed(description) {
  return simpleEmbed(description, COLORS.SUCCESS);
}

function buildNowPlayingEmbed(track, player, client) {
  const url = track?.uri;
  const display = trackDisplay(track, 55, 35);
  const title = url ? `[${display}](${url})` : display;
  const requester = requesterMention(track?.requester);
  const duration = getDurationMs(track);
  const position = Number(player?.position || 0);
  const queueCount = player?.queue?.size ?? player?.queue?.length ?? 0;
  const loopLabel = String(player?.loop || 'none');
  const filterLabel = currentFilterLabel(player);
  const autoplay = player?.data?.get('autoplay') || false;
  const isPaused = player?.paused;
  const statusEmoji = isPaused ? '⏸️' : '▶️';
  const accentColor = isPaused ? COLORS.PAUSED : COLORS.PLAYING;

  const embed = baseEmbed(accentColor)
    .setAuthor({
      name: `${statusEmoji} Now Playing`,
      iconURL: client?.user?.displayAvatarURL?.() || undefined
    })
    .setDescription([
      `## ${title}`,
      '',
      progressBar(position, duration),
      '',
      '`━━━━━━━━━━━━━━━━━━━━━━━━━━━━`'
    ].join('\n'))
    .addFields(
      { name: '🎤 Artist', value: clean(trackAuthor(track), 'Unknown Artist'), inline: true },
      { name: '⏱️ Duration', value: `\`${trackDuration(track)}\``, inline: true },
      { name: '🎧 Source', value: sourceName(track), inline: true },
      { name: '👤 Requested by', value: requester, inline: true },
      { name: '🔊 Volume', value: `\`${player?.volume ?? 100}%\``, inline: true },
      { name: '📋 Queue', value: `\`${queueCount} upcoming\``, inline: true },
      { name: '🔁 Loop', value: `\`${loopLabel}\``, inline: true },
      { name: '🎛️ Filter', value: `\`${filterLabel}\``, inline: true },
      { name: '🎵 Autoplay', value: autoplay ? '`ON ✅`' : '`OFF`', inline: true }
    )
    .setFooter({ text: 'Uranium • Premium Music Experience' });

  if (track?.thumbnail) embed.setThumbnail(track.thumbnail);
  return embed;
}

function buildQueueEmbed(player, client) {
  const current = player?.queue?.current;
  const upcoming = Array.from(player?.queue || []);
  const currentLine = current ? `▶️ **Now Playing:** ${trackDisplay(current, 45, 25)}` : '⏹️ Nothing playing';
  const lines = upcoming.slice(0, 10).map((track, index) => {
    const url = track?.uri;
    const display = trackDisplay(track, 42, 24);
    const linked = url ? `[${display}](${url})` : display;
    return `**${index + 1}.** ${linked} • \`${trackDuration(track)}\``;
  });

  return baseEmbed(COLORS.ACCENT)
    .setAuthor({
      name: '📋 Queue List',
      iconURL: client?.user?.displayAvatarURL?.() || undefined
    })
    .setDescription(`${currentLine}\n\n${lines.length ? lines.join('\n') : '*No upcoming tracks.*'}`)
    .setFooter({
      text: `Total Songs: ${upcoming.length} | Total Duration: ${formatTimeMs(player?.queue?.durationLength || 0)}`
    });
}

function buildSearchEmbed(query, tracks) {
  const lines = tracks.map((track, index) => {
    const url = track?.uri;
    const display = trackDisplay(track, 45, 24);
    const linked = url ? `[${display}](${url})` : display;
    return `**${index + 1}.** ${linked} • \`${trackDuration(track)}\``;
  });

  return baseEmbed(COLORS.ACCENT)
    .setAuthor({ name: `🎵 Search Results: ${limit(query, 45)}` })
    .setDescription(lines.join('\n') || '*No results found.*')
    .setFooter({ text: `${tracks.length} results • Select a track below` });
}

function buildControlButtons(guildId, paused = false, autoplay = false) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`music_ctrl:previous:${guildId}`)
        .setEmoji('⏮️')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`music_ctrl:pause:${guildId}`)
        .setEmoji(paused ? '▶️' : '⏸️')
        .setStyle(paused ? ButtonStyle.Success : ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`music_ctrl:skip:${guildId}`)
        .setEmoji('⏭️')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`music_ctrl:stop:${guildId}`)
        .setEmoji('⏹️')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`music_ctrl:shuffle:${guildId}`)
        .setEmoji('🔀')
        .setStyle(ButtonStyle.Secondary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`music_ctrl:vol_down:${guildId}`).setEmoji('🔉').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`music_ctrl:vol_up:${guildId}`).setEmoji('🔊').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`music_ctrl:loop:${guildId}`).setEmoji('🔁').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`music_ctrl:filters:${guildId}`).setEmoji('🎛️').setStyle(ButtonStyle.Secondary),
new ButtonBuilder()
            .setCustomId(`music_ctrl:autoplay:${guildId}`)
            .setEmoji('🔄')
            .setStyle(autoplay ? ButtonStyle.Success : ButtonStyle.Secondary)
    )
  ];
}

function buildFilterMenu(guildId, currentFilter = 'clear') {
  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`music_filter_select:${guildId}`)
        .setPlaceholder(`🎛️ Filter: ${currentFilterLabel({ data: new Map([['filter', currentFilter]]) })}`)
        .addOptions([
          { label: '✨ Off', description: 'Clear all audio filters', value: 'clear', default: currentFilter === 'clear' || currentFilter === 'none' },
          { label: '⚡ Nightcore', description: 'Faster tempo with higher pitch', value: 'nightcore', default: currentFilter === 'nightcore' },
          { label: '🔊 Bassboost', description: 'Enhanced low frequencies', value: 'bassboost', default: currentFilter === 'bassboost' },
          { label: '🌊 Vaporwave', description: 'Slowed down dreamy vibe', value: 'vaporwave', default: currentFilter === 'vaporwave' },
          { label: '🔉 Soft', description: 'Smooth mellow sound', value: 'soft', default: currentFilter === 'soft' },
          { label: '🎤 Karaoke', description: 'Vocal reduction effect', value: 'karaoke', default: currentFilter === 'karaoke' },
          { label: '🌀 8D Rotation', description: 'Immersive spatial audio', value: 'rotation', default: currentFilter === 'rotation' },
          { label: '🐿️ Chipmunk', description: 'High-pitched squeaky sound', value: 'chipmunk', default: currentFilter === 'chipmunk' },
          { label: '🐢 Daycore', description: 'Slower deeper tone', value: 'daycore', default: currentFilter === 'daycore' }
        ])
    )
  ];
}

module.exports = {
  COLORS,
  clean,
  currentFilterLabel,
  limit,
  getDurationMs,
  formatTimeMs,
  trackTitle,
  trackAuthor,
  trackDisplay,
  trackDuration,
  sourceName,
  requesterMention,
  simpleEmbed,
  errorEmbed,
  successEmbed,
  buildNowPlayingEmbed,
  buildQueueEmbed,
  buildSearchEmbed,
  buildControlButtons,
  buildFilterMenu
};
