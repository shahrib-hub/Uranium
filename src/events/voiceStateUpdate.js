const {
  ChannelType,
  PermissionsBitField
} = require('discord.js');

const {
  getSetup,
  trackTempChannel,
  untrackTempChannel,
  isTrackedTempChannel
} = require('../listeners/joinToCreateServices');

module.exports = {
  name: 'voiceStateUpdate',

  async execute(oldState, newState) {
    const guild = newState.guild || oldState.guild;
    if (!guild) return;

    // --- Join to Create Logic ---
    const setup = await getSetup(guild.id).catch(() => null);
    if (setup) {
      const clientMember = guild.members.me;
      if (clientMember) {
        const category = guild.channels.cache.get(setup.target_category_id);
        if (category) {
          const hasPerms = category.permissionsFor(clientMember)?.has([
            PermissionsBitField.Flags.ManageChannels,
            PermissionsBitField.Flags.MoveMembers
          ]);

          if (hasPerms) {
            // ✅ User joined the trigger VC
            const joinedTrigger = newState.channelId === setup.trigger_voice_id &&
                                  oldState.channelId !== setup.trigger_voice_id;

            if (joinedTrigger) {
              const user = newState.member;
              const channelName = `${user.displayName}'s VC`;

              try {
                const tempChannel = await guild.channels.create({
                  name: channelName,
                  type: ChannelType.GuildVoice,
                  parent: setup.target_category_id,
                  userLimit: setup.user_limit,
                  permissionOverwrites: [
                    {
                      id: user.id,
                      allow: [PermissionsBitField.Flags.MuteMembers, PermissionsBitField.Flags.DeafenMembers, PermissionsBitField.Flags.MoveMembers, PermissionsBitField.Flags.ManageChannels]
                    }
                  ],
                  reason: `Join-To-Create: ${user.user.tag}`
                });

                await trackTempChannel({
                  guildId: guild.id,
                  channelId: tempChannel.id,
                  ownerId: user.id
                });

                await user.voice.setChannel(tempChannel, 'Moved to temporary voice channel');
              } catch (err) {
                console.error('❌ Failed to create or move to temp VC:', err);
              }
            }

            // ✅ Cleanup: delete empty temp VC
            const leftTempVC = oldState.channel && await isTrackedTempChannel(oldState.channel.id);
            if (leftTempVC) {
              const channel = oldState.channel;
              if (channel.members.size === 0) {
                try {
                  await channel.delete('Join-To-Create cleanup: channel empty');
                } catch (err) {
                  console.error('❌ Failed to delete empty temp VC:', err);
                } finally {
                  await untrackTempChannel(channel.id);
                }
              }
            }
          }
        }
      }
    }

    // ✅ Music Player: Pause/Resume on empty VC
    const player = newState.client.music?.players?.get(guild.id);
    if (player) {
      const voiceChannelId = player.voiceId;
      const voiceChannel = guild.channels.cache.get(voiceChannelId);

      if (voiceChannel) {
        // Count human members
        const humans = voiceChannel.members.filter(m => !m.user.bot).size;

        if (humans === 0) {
          // VC is empty (only bot remains)
          if (!player.paused) {
            await player.pause(true);
            player.data.set('pausedByEmptyVC', true);
            
            const { simpleEmbed } = require('../music/ui');
            const ch = newState.client.channels.cache.get(player.textId);
            if (ch) {
              await ch.send({ 
                embeds: [simpleEmbed('Everyone left the voice channel. I have paused the music and will leave in 2 minutes if no one joins.')] 
              }).catch(() => null);
            }
            
            // Start leave timeout
            const timeoutMs = newState.client.musicConfig?.leaveTimeout || 120000;
            const timer = setTimeout(async () => {
              const p = newState.client.music?.players?.get(guild.id);
              if (p && p.voiceId === voiceChannelId) {
                const currentHumans = voiceChannel.members.filter(m => !m.user.bot).size;
                if (currentHumans === 0) {
                  await p.destroy().catch(() => null);
                  newState.client.dashboardIO?.to(`guild:${guild.id}`).emit('playerUpdate', { active: false });
                }
              }
            }, timeoutMs);
            
            // Store timer in player data to clear it if someone joins
            if (player.data.get('leaveTimer')) clearTimeout(player.data.get('leaveTimer'));
            player.data.set('leaveTimer', timer);
            
            newState.client.dashboardBridge?.emitPlayerUpdate(player);
          }
        } else {
          // Humans are present
          if (player.data.get('pausedByEmptyVC')) {
            await player.pause(false);
            player.data.delete('pausedByEmptyVC');
            
            // Clear leave timer
            const timer = player.data.get('leaveTimer');
            if (timer) {
              clearTimeout(timer);
              player.data.delete('leaveTimer');
            }
            
            const { simpleEmbed } = require('../music/ui');
            const ch = newState.client.channels.cache.get(player.textId);
            if (ch) {
              await ch.send({ 
                embeds: [simpleEmbed('Someone joined! Resuming playback.')] 
              }).catch(() => null);
            }
            
            newState.client.dashboardBridge?.emitPlayerUpdate(player);
          }
        }
      }
    }
  }
};
