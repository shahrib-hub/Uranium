const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const { isPremiumUser } = require('../../utils/premium');
const playlistStorage = require('../../utils/playlistStorage');
const { createPlayer, searchTracks } = require('../../music/service');
const { formatTimeMs, limit } = require('../../music/ui');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('playlist')
    .setDescription('📁 Manage and play your personal music playlists')
    .addSubcommand((sub) =>
      sub
        .setName('create')
        .setDescription('Create a new personal playlist')
        .addStringOption((opt) =>
          opt.setName('name').setDescription('Playlist name').setRequired(true).setMaxLength(50)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('list').setDescription('List your saved playlists and check quota')
    )
    .addSubcommand((sub) =>
      sub
        .setName('view')
        .setDescription('View tracks inside one of your playlists')
        .addStringOption((opt) =>
          opt.setName('name').setDescription('Playlist name').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Add a song to one of your playlists')
        .addStringOption((opt) =>
          opt.setName('name').setDescription('Playlist name').setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName('song')
            .setDescription('Song title or URL (leave empty to add current playing track)')
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove a track from a playlist by position number')
        .addStringOption((opt) =>
          opt.setName('name').setDescription('Playlist name').setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt
            .setName('position')
            .setDescription('Track position number (e.g. 1)')
            .setRequired(true)
            .setMinValue(1)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('delete')
        .setDescription('Delete a playlist')
        .addStringOption((opt) =>
          opt.setName('name').setDescription('Playlist name').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('play')
        .setDescription('Play a saved playlist in your voice channel')
        .addStringOption((opt) =>
          opt.setName('name').setDescription('Playlist name').setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const client = interaction.client;
    const isPremium = isPremiumUser(userId);

    // ── CREATE ──────────────────────────────────────────────────────────
    if (sub === 'create') {
      const name = interaction.options.getString('name');
      const result = await playlistStorage.createPlaylist(userId, name, isPremium);

      if (!result.success) {
        return interaction.reply({
          ephemeral: true,
          embeds: [
            new EmbedBuilder()
              .setColor('#ef4444')
              .setTitle('❌ Could Not Create Playlist')
              .setDescription(result.error)
              .setFooter({
                text: isPremium ? 'Premium User Quota (20 Max)' : 'Free User Limit: 1 Playlist • Upgrade for 20'
              })
          ]
        });
      }

      const quota = await playlistStorage.getUserPlaylistQuota(userId, isPremium);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#10b981')
            .setTitle('✅ Playlist Created!')
            .setDescription(`Created playlist **${result.playlist.name}**.\n\nYou can now add songs using \`/playlist add name:${result.playlist.name}\` or from the Web Dashboard.`)
            .addFields({
              name: 'Your Playlist Quota',
              value: `${quota.count}/${quota.max} playlists used (${isPremium ? '👑 Premium User' : 'Free User'})`,
              inline: true
            })
        ]
      });
    }

    // ── LIST ────────────────────────────────────────────────────────────
    if (sub === 'list') {
      const playlists = await playlistStorage.getUserPlaylists(userId);
      const quota = await playlistStorage.getUserPlaylistQuota(userId, isPremium);

      if (playlists.length === 0) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#3b82f6')
              .setTitle('📁 Your Music Playlists')
              .setDescription(`You don't have any playlists yet.\nUse \`/playlist create <name>\` to make one!`)
              .addFields({
                name: 'Quota',
                value: `${quota.count}/${quota.max} (${isPremium ? '👑 Premium User' : 'Free User - 1 Max'})`
              })
          ]
        });
      }

      const listDesc = playlists
        .map((p, i) => {
          const trackCount = p.tracks?.length || 0;
          return `**${i + 1}. ${p.name}** — \`${trackCount}\` song${trackCount === 1 ? '' : 's'}`;
        })
        .join('\n');

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#a855f7')
            .setTitle(`📁 Your Music Playlists (${quota.count}/${quota.max})`)
            .setDescription(listDesc)
            .addFields({
              name: 'Tier Status',
              value: isPremium
                ? '👑 **User Premium**: Up to 20 Playlists Unlocked'
                : '🆓 **Free User**: 1 Playlist (Upgrade to Premium for 20)',
              inline: false
            })
            .setFooter({ text: 'Use /playlist play <name> to listen in VC' })
        ]
      });
    }

    // ── VIEW ────────────────────────────────────────────────────────────
    if (sub === 'view') {
      const name = interaction.options.getString('name');
      const pl = await playlistStorage.getPlaylist(userId, name);

      if (!pl) {
        return interaction.reply({
          ephemeral: true,
          embeds: [
            new EmbedBuilder()
              .setColor('#ef4444')
              .setDescription(`❌ Playlist **${name}** not found. Use \`/playlist list\` to view your playlists.`)
          ]
        });
      }

      if (!pl.tracks?.length) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#3b82f6')
              .setTitle(`📁 ${pl.name} (Empty)`)
              .setDescription(`This playlist doesn't have any songs yet.\nAdd songs with \`/playlist add name:${pl.name} song:<query>\``)
          ]
        });
      }

      const topTracks = pl.tracks.slice(0, 15);
      const trackList = topTracks
        .map((t, i) => {
          const dur = t.duration ? formatTimeMs(t.duration) : '0:00';
          return `**${i + 1}.** [${limit(t.title, 45)}](${t.uri || 'https://discord.com'}) — \`${dur}\`\n   *by ${limit(t.author, 35)}*`;
        })
        .join('\n');

      const extra = pl.tracks.length > 15 ? `\n\n*...and ${pl.tracks.length - 15} more tracks*` : '';

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#3b82f6')
            .setTitle(`📁 Playlist: ${pl.name}`)
            .setDescription(`${trackList}${extra}`)
            .setFooter({
              text: `Total: ${pl.tracks.length} track${pl.tracks.length === 1 ? '' : 's'} • /playlist play name:${pl.name}`
            })
        ]
      });
    }

    // ── ADD ─────────────────────────────────────────────────────────────
    if (sub === 'add') {
      await interaction.deferReply();
      const name = interaction.options.getString('name');
      const songQuery = interaction.options.getString('song');
      const pl = await playlistStorage.getPlaylist(userId, name);

      if (!pl) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ef4444')
              .setDescription(`❌ Playlist **${name}** not found. Create it first using \`/playlist create\`.`)
          ]
        });
      }

      let trackToAdd = null;

      if (songQuery) {
        const searchRes = await searchTracks(client, songQuery, interaction.member);
        if (!searchRes.tracks?.length) {
          return interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor('#ef4444')
                .setDescription(`❌ Could not find any song matching **${songQuery}**.`)
            ]
          });
        }
        const found = searchRes.tracks[0];
        trackToAdd = {
          title: found.title || 'Unknown Title',
          author: found.author || 'Unknown Artist',
          uri: found.uri || '',
          duration: found.duration || 0,
          thumbnail: found.thumbnail || null
        };
      } else {
        const player = client.music?.players?.get(interaction.guildId);
        if (!player?.queue?.current) {
          return interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor('#ef4444')
                .setDescription('❌ No song is currently playing in this server, and no query was provided.')
            ]
          });
        }
        const cur = player.queue.current;
        trackToAdd = {
          title: cur.title || 'Unknown Title',
          author: cur.author || 'Unknown Artist',
          uri: cur.uri || '',
          duration: cur.duration || 0,
          thumbnail: cur.thumbnail || null
        };
      }

      const res = await playlistStorage.addTrackToPlaylist(userId, pl.id, trackToAdd);
      if (!res.success) {
        return interaction.editReply({
          embeds: [new EmbedBuilder().setColor('#ef4444').setDescription(`❌ ${res.error}`)]
        });
      }

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('#10b981')
            .setTitle('🎵 Track Added to Playlist')
            .setDescription(`Added **${trackToAdd.title}** by **${trackToAdd.author}** to **${pl.name}**!`)
            .setFooter({ text: `Playlist now has ${res.playlist.tracks.length} tracks` })
        ]
      });
    }

    // ── REMOVE ──────────────────────────────────────────────────────────
    if (sub === 'remove') {
      const name = interaction.options.getString('name');
      const pos = interaction.options.getInteger('position');
      const pl = await playlistStorage.getPlaylist(userId, name);

      if (!pl) {
        return interaction.reply({
          ephemeral: true,
          embeds: [new EmbedBuilder().setColor('#ef4444').setDescription(`❌ Playlist **${name}** not found.`)]
        });
      }

      const res = await playlistStorage.removeTrackFromPlaylist(userId, pl.id, pos - 1);
      if (!res.success) {
        return interaction.reply({
          ephemeral: true,
          embeds: [new EmbedBuilder().setColor('#ef4444').setDescription(`❌ ${res.error}`)]
        });
      }

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#10b981')
            .setDescription(`🗑️ Removed **${res.removedTrack.title}** from **${pl.name}**.`)
        ]
      });
    }

    // ── DELETE ──────────────────────────────────────────────────────────
    if (sub === 'delete') {
      const name = interaction.options.getString('name');
      const res = await playlistStorage.deletePlaylist(userId, name);

      if (!res.success) {
        return interaction.reply({
          ephemeral: true,
          embeds: [new EmbedBuilder().setColor('#ef4444').setDescription(`❌ ${res.error}`)]
        });
      }

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#10b981')
            .setDescription(`🗑️ Playlist **${res.playlist.name}** has been deleted.`)
        ]
      });
    }

    // ── PLAY ────────────────────────────────────────────────────────────
    if (sub === 'play') {
      await interaction.deferReply();
      const name = interaction.options.getString('name');
      const pl = await playlistStorage.getPlaylist(userId, name);

      if (!pl) {
        return interaction.editReply({
          embeds: [new EmbedBuilder().setColor('#ef4444').setDescription(`❌ Playlist **${name}** not found.`)]
        });
      }

      if (!pl.tracks?.length) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor('#ef4444')
              .setDescription(`❌ Playlist **${pl.name}** is empty. Add songs to it before playing!`)
          ]
        });
      }

      const member = interaction.member;
      if (!member?.voice?.channelId) {
        return interaction.editReply({
          embeds: [new EmbedBuilder().setColor('#ef4444').setDescription('❌ Join a voice channel first.')]
        });
      }

      let player = client.music?.players?.get(interaction.guildId);
      if (player && player.voiceId !== member.voice.channelId) {
        return interaction.editReply({
          embeds: [new EmbedBuilder().setColor('#ef4444').setDescription('❌ You must be in the same voice channel as the bot.')]
        });
      }

      player = await createPlayer(client, interaction.guildId, member.voice.channelId, interaction.channelId);

      let loadedCount = 0;
      for (const t of pl.tracks) {
        try {
          const res = await searchTracks(client, t.uri || `${t.title} ${t.author}`, member);
          if (res.tracks?.length) {
            player.queue.add(res.tracks[0]);
            loadedCount++;
          }
        } catch (e) {
          // ignore track error
        }
      }

      if (loadedCount === 0) {
        return interaction.editReply({
          embeds: [new EmbedBuilder().setColor('#ef4444').setDescription('❌ Could not resolve tracks from this playlist.')]
        });
      }

      if (!player.playing && !player.paused) {
        await player.play();
      }

      client.dashboardBridge?.emitPlayerUpdate(player);

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('#10b981')
            .setTitle(`🎶 Playing Playlist: ${pl.name}`)
            .setDescription(`Loaded **${loadedCount}** track${loadedCount === 1 ? '' : 's'} into the queue and started playback.`)
            .setFooter({ text: 'Uranium Music' })
        ]
      });
    }
  }
};
