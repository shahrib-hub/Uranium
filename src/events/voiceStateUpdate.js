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

    const setup = await getSetup(guild.id);
    if (!setup) return;

    const clientMember = guild.members.me;
    if (!clientMember) return;

    const category = guild.channels.cache.get(setup.target_category_id);
    if (!category) return;

    const hasPerms = category.permissionsFor(clientMember)?.has([
      PermissionsBitField.Flags.ManageChannels,
      PermissionsBitField.Flags.MoveMembers
    ]);

    if (!hasPerms) return;

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
};
