const { buildFilterMenu, currentFilterLabel, errorEmbed, simpleEmbed } = require('../music/ui');
const {
  applyFilter,
  getCurrentFilter,
  musicConfig,
  updatePlayerMessage
} = require('../music/service');

const CONTROL_COOLDOWN_MS = 3000;
const controlCooldowns = new Map();

function cooldownKey(interaction) {
  return `${interaction.guildId}:${interaction.user.id}`;
}

function getCooldownRemaining(interaction) {
  const key = cooldownKey(interaction);
  const expiresAt = controlCooldowns.get(key) || 0;
  const remaining = expiresAt - Date.now();
  return remaining > 0 ? remaining : 0;
}

function setCooldown(interaction) {
  controlCooldowns.set(cooldownKey(interaction), Date.now() + CONTROL_COOLDOWN_MS);
}

module.exports = async (interaction) => {
  const id = interaction.customId || '';
  if (!id.startsWith('music_ctrl:') && !id.startsWith('music_filter_select:')) return;

  const parts = id.split(':');
  const isFilterSelect = id.startsWith('music_filter_select:');
  const action = isFilterSelect ? 'filter_select' : parts[1];
  const guildId = isFilterSelect ? parts[1] : parts[2];
  const player = interaction.client.music?.players.get(guildId);

  if (!player) {
    return interaction.reply({ embeds: [errorEmbed('No active music session.')], flags: 64 }).catch(() => null);
  }

  const memberVoiceId = interaction.member?.voice?.channelId;
  if (!memberVoiceId || player.voiceId !== memberVoiceId) {
    return interaction.reply({ embeds: [errorEmbed('You must be in the same voice channel as the bot.')], flags: 64 }).catch(() => null);
  }

  try {
    const remaining = getCooldownRemaining(interaction);
    if (remaining > 0) {
      return interaction.reply({ embeds: [errorEmbed(`Wait \`${(remaining / 1000).toFixed(1)}s\` before using music controls again.`)], flags: 64 }).catch(() => null);
    }

    setCooldown(interaction);

    if (interaction.isStringSelectMenu()) {
      const selected = interaction.values?.[0] || 'clear';
      const applied = await applyFilter(player, selected);
      await updatePlayerMessage(interaction.client, player);
      return interaction.update({
        embeds: [simpleEmbed(`Filter applied: **${currentFilterLabel({ data: new Map([['filter', applied]]) })}**.`)],
        components: buildFilterMenu(guildId, getCurrentFilter(player))
      }).catch(() => null);
    }

    if (action === 'pause') {
      player.pause(!player.paused);
      await updatePlayerMessage(interaction.client, player);

      return interaction.deferUpdate().catch(() => null);
    }

    if (action === 'skip') {
      if (!player.queue.current) return interaction.reply({ embeds: [errorEmbed('Nothing to skip.')], flags: 64 });
      player.skip();
      return interaction.reply({ embeds: [simpleEmbed('Skipped the current song.')], flags: 64 });
    }

    if (action === 'previous') {
      const previous = player.getPrevious?.(true) || player.queue.previous?.shift();
      if (!previous) return interaction.reply({ embeds: [errorEmbed('Previous song not found.')], flags: 64 });
      if (player.queue.current) player.queue.unshift(player.queue.current);
      player.queue.unshift(previous);
      player.skip();
      return interaction.reply({ embeds: [simpleEmbed('Playing the previous song.')], flags: 64 });
    }

    if (action === 'shuffle') {
      if (player.queue.size <= 1) return interaction.reply({ embeds: [errorEmbed('Need at least two upcoming songs to shuffle.')], flags: 64 });
      player.queue.shuffle();
      await updatePlayerMessage(interaction.client, player);
      return interaction.reply({ embeds: [simpleEmbed('Queue has been shuffled.')], flags: 64 });
    }

    if (action === 'loop') {
      const next = player.loop === 'none' ? 'track' : player.loop === 'track' ? 'queue' : 'none';
      player.setLoop(next);
      await updatePlayerMessage(interaction.client, player);
      return interaction.reply({ embeds: [simpleEmbed(`Loop mode has been set to \`${next}\`.`)], flags: 64 });
    }

    if (action === 'filters') {
      return interaction.reply({
        embeds: [simpleEmbed(`Choose a filter. Current filter: **${currentFilterLabel(player)}**.`)],
        components: buildFilterMenu(guildId, getCurrentFilter(player)),
        flags: 64
      });
    }

    if (action === 'autoplay') {
      const currentAutoplay = player.data.get('autoplay') || false;
      const newAutoplay = !currentAutoplay;
      player.data.set('autoplay', newAutoplay);
      await updatePlayerMessage(interaction.client, player);
      return interaction.reply({ 
        embeds: [simpleEmbed(newAutoplay ? '🎵 Autoplay enabled! Related tracks will play after queue ends.' : '❌ Autoplay disabled.')], 
        flags: 64 
      });
    }

    if (action === 'stop') {
      player.queue.clear();
      player.queue.current = null;
      await player.destroy().catch(() => null);
      return interaction.reply({ embeds: [simpleEmbed('Stopped the player.')], flags: 64 });
    }

    if (action === 'vol_down' || action === 'vol_up') {
      const config = musicConfig(interaction.client);
      const direction = action === 'vol_up' ? 10 : -10;
      const next = Math.max(config.minVolume, Math.min(config.maxVolume, (player.volume ?? 100) + direction));
      await player.setVolume(next);
      await updatePlayerMessage(interaction.client, player);
      return interaction.reply({ embeds: [simpleEmbed(`Volume has been set to \`${next}%\`.`)], flags: 64 });
    }

    return interaction.reply({ embeds: [errorEmbed('Unknown music control.')], flags: 64 });
  } catch (error) {
    console.error('[music_controls] failed:', error);
    return interaction.reply({ embeds: [errorEmbed(error?.message || 'Music control failed.')], flags: 64 }).catch(() => null);
  }
};
