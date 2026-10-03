// src/commands/Utility/customcommand.js
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const {
  getCustomCommands,
  getCustomCommand,
  saveCustomCommand,
  deleteCustomCommand,
  countCustomCommands,
  incrementUses,
  checkExecutionAllowed
} = require('../../utils/customCommandStorage');

const { isPremiumGuild } = require('../../utils/premium');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('customcommand')
    .setDescription('⚡ Manage server custom commands')
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub
        .setName('create')
        .setDescription('Create a new custom command')
        .addStringOption(opt =>
          opt
            .setName('name')
            .setDescription('Command trigger name (alphanumeric, e.g. ip, rules, store)')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('response')
            .setDescription('Message response sent when triggered (supports {user}, {server}, etc.)')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('description')
            .setDescription('Brief description of what this command does')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt
            .setName('prefix')
            .setDescription('Trigger prefix (e.g. !, ?, ., $, -) [default: !]')
            .setRequired(false)
        )
        .addBooleanOption(opt =>
          opt
            .setName('private')
            .setDescription('If true, response is only visible to the user (ephemeral)')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('edit')
        .setDescription('Edit an existing custom command')
        .addStringOption(opt =>
          opt
            .setName('name')
            .setDescription('Name of the command to edit')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('prefix')
            .setDescription('New trigger prefix (e.g. !, ?, ., $, -)')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt
            .setName('response')
            .setDescription('New response message')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt
            .setName('description')
            .setDescription('New description')
            .setRequired(false)
        )
        .addBooleanOption(opt =>
          opt
            .setName('private')
            .setDescription('Whether the response is private (ephemeral)')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('delete')
        .setDescription('Delete an existing custom command')
        .addStringOption(opt =>
          opt
            .setName('name')
            .setDescription('Name of the command to remove')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('List all custom commands created in this server')
    )
    .addSubcommand(sub =>
      sub
        .setName('info')
        .setDescription('View detailed configuration of a custom command')
        .addStringOption(opt =>
          opt
            .setName('name')
            .setDescription('Command name')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('run')
        .setDescription('Execute a custom command by name')
        .addStringOption(opt =>
          opt
            .setName('name')
            .setDescription('Name of the custom command to execute')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const member = interaction.member;

    // Helper: Variable Formatter
    const formatPlaceholders = (text) => {
      if (!text) return '';
      return text
        .replace(/{user}/gi, `<@${interaction.user.id}>`)
        .replace(/{mention}/gi, `<@${interaction.user.id}>`)
        .replace(/{username}/gi, interaction.user.username)
        .replace(/{user\.tag}/gi, interaction.user.tag || interaction.user.username)
        .replace(/{user\.id}/gi, interaction.user.id)
        .replace(/{server}/gi, interaction.guild.name)
        .replace(/{guild}/gi, interaction.guild.name)
        .replace(/{membercount}/gi, String(interaction.guild.memberCount || 1))
        .replace(/{channel}/gi, `<#${interaction.channel.id}>`);
    };

    // ── 1. RUN COMMAND ────────────────────────────────────────────────────────
    if (sub === 'run') {
      const name = interaction.options.getString('name').trim().toLowerCase();
      const cmd = await getCustomCommand(guildId, name);
      if (!cmd) {
        return interaction.reply({
          content: `❌ Custom command \`${name}\` not found in this server.`,
          flags: 64
        });
      }

      // Check permissions and cooldown
      const check = checkExecutionAllowed(member, interaction.channel, cmd);
      if (!check.allowed) {
        return interaction.reply({
          content: `⛔ ${check.reason}`,
          flags: 64
        });
      }

      const actions = cmd.data?.actions || [];
      const action = actions[0] || {};
      const isEphemeral = !!(cmd.data?.ephemeral ?? action.ephemeral);

      // Random responses pick or single message
      let replyText = action.message || cmd.data?.message || 'Custom command executed!';
      const randomArr = action.randomResponses || cmd.data?.randomResponses || [];
      if (Array.isArray(randomArr) && randomArr.length > 0) {
        const pool = [replyText, ...randomArr].filter(Boolean);
        replyText = pool[Math.floor(Math.random() * pool.length)];
      }

      replyText = formatPlaceholders(replyText);

      // Embed support
      const embedConfig = action.embed || cmd.data?.embed;
      let embed = null;
      if (embedConfig && (embedConfig.title || embedConfig.description)) {
        embed = new EmbedBuilder();
        if (embedConfig.title) embed.setTitle(formatPlaceholders(embedConfig.title));
        if (embedConfig.description) embed.setDescription(formatPlaceholders(embedConfig.description));
        if (embedConfig.color) {
          const colorInt = typeof embedConfig.color === 'number'
            ? embedConfig.color
            : parseInt(String(embedConfig.color).replace('#', ''), 16) || 0x5865F2;
          embed.setColor(colorInt);
        } else {
          embed.setColor(0x5865F2);
        }
        if (embedConfig.thumbnail) embed.setThumbnail(embedConfig.thumbnail);
        if (embedConfig.image) embed.setImage(embedConfig.image);
        if (embedConfig.footer) embed.setFooter({ text: formatPlaceholders(embedConfig.footer) });
        embed.setTimestamp();
      }

      await incrementUses(guildId, name);

      const replyPayload = {
        flags: isEphemeral ? 64 : 0
      };

      if (embed) {
        replyPayload.embeds = [embed];
        if (replyText && replyText !== embedConfig.description) {
          replyPayload.content = replyText;
        }
      } else {
        replyPayload.content = replyText;
      }

      return interaction.reply(replyPayload);
    }

    // All management commands require ManageGuild permission
    if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('❌ Permission Denied')
            .setDescription('You need the **Manage Server** permission to configure custom commands.')
        ],
        flags: 64
      });
    }

    // ── 2. CREATE COMMAND ─────────────────────────────────────────────────────
    if (sub === 'create') {
      const name = interaction.options.getString('name');
      const response = interaction.options.getString('response');
      const description = interaction.options.getString('description') || '';
      const isPrivate = interaction.options.getBoolean('private') || false;
      const prefix = interaction.options.getString('prefix') || '!';

      try {
        const saved = await saveCustomCommand(guildId, {
          name,
          prefix: prefix.trim(),
          description,
          message: response,
          ephemeral: isPrivate,
          actions: [
            {
              type: 'message',
              ephemeral: isPrivate,
              message: response,
              embed: null,
              randomResponses: []
            }
          ]
        });

        const isPrem = await isPremiumGuild(guildId);
        const count = await countCustomCommands(guildId);
        const max = isPrem ? 50 : 10;
        const triggerPrefix = saved.data?.prefix || prefix.trim() || '!';

        const embed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle('✅ Custom Command Created!')
          .setDescription(`Custom command \`${triggerPrefix}${saved.name}\` has been successfully created.`)
          .addFields(
            { name: 'Trigger', value: `\`${triggerPrefix}${saved.name}\``, inline: true },
            { name: 'Prefix', value: `\`${triggerPrefix}\``, inline: true },
            { name: 'Visibility', value: isPrivate ? '🔒 Private (Ephemeral)' : '🌐 Public in Channel', inline: true },
            { name: 'Quota Usage', value: `${count}/${max} commands`, inline: true },
            { name: 'Response Preview', value: response.slice(0, 1024) }
          )
          .setFooter({ text: 'Configure advanced roles, channels, and embeds on the Web Dashboard!' });

        return interaction.reply({ embeds: [embed] });
      } catch (err) {
        return interaction.reply({ content: `❌ ${err.message}`, flags: 64 });
      }
    }

    // ── 3. EDIT COMMAND ───────────────────────────────────────────────────────
    if (sub === 'edit') {
      const name = interaction.options.getString('name').trim().toLowerCase();
      const existing = await getCustomCommand(guildId, name);
      if (!existing) {
        return interaction.reply({
          content: `❌ Command \`${name}\` does not exist in this server.`,
          flags: 64
        });
      }

      const prefix = interaction.options.getString('prefix');
      const response = interaction.options.getString('response');
      const description = interaction.options.getString('description');
      const isPrivate = interaction.options.getBoolean('private');

      const updatedData = {
        name,
        prefix: prefix !== null ? prefix.trim() : (existing.data?.prefix || '!'),
        description: description !== null ? description : existing.description,
        message: response !== null ? response : existing.data?.message,
        ephemeral: isPrivate !== null ? isPrivate : existing.data?.ephemeral,
        actions: existing.data?.actions || [],
        permissions: existing.data?.permissions,
        cooldown: existing.data?.cooldown
      };

      if (response !== null && updatedData.actions[0]) {
        updatedData.actions[0].message = response;
      }
      if (isPrivate !== null && updatedData.actions[0]) {
        updatedData.actions[0].ephemeral = isPrivate;
      }

      await saveCustomCommand(guildId, updatedData);

      const displayPrefix = updatedData.prefix || '!';
      return interaction.reply({
        content: `✅ Successfully updated custom command \`${displayPrefix}${name}\`!`,
        flags: 64
      });
    }

    // ── 4. DELETE COMMAND ─────────────────────────────────────────────────────
    if (sub === 'delete') {
      const name = interaction.options.getString('name').trim().toLowerCase();
      const removed = await deleteCustomCommand(guildId, name);
      if (!removed) {
        return interaction.reply({
          content: `❌ Command \`${name}\` was not found in this server.`,
          flags: 64
        });
      }

      const count = await countCustomCommands(guildId);
      const isPrem = await isPremiumGuild(guildId);
      const max = isPrem ? 50 : 10;

      return interaction.reply({
        content: `🗑️ Deleted custom command \`${name}\`. (${count}/${max} slots in use).`
      });
    }

    // ── 5. LIST COMMANDS ──────────────────────────────────────────────────────
    if (sub === 'list') {
      const commands = await getCustomCommands(guildId);
      const isPrem = await isPremiumGuild(guildId);
      const max = isPrem ? 50 : 10;

      if (!commands || commands.length === 0) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x5865F2)
              .setTitle('📜 Server Custom Commands')
              .setDescription(
                'No custom commands have been configured yet.\n\nCreate your first command with `/customcommand create` or via the **Web Dashboard**!'
              )
              .setFooter({ text: `Slots: 0/${max} used (${isPrem ? 'Premium' : 'Free'})` })
          ]
        });
      }

      const listDesc = commands
        .slice(0, 25)
        .map((c, i) => {
          const priv = c.data?.ephemeral ? '🔒' : '🌐';
          const uses = `(${c.uses || 0} uses)`;
          const desc = c.description ? `— *${c.description}*` : '';
          const pfx = c.data?.prefix || '!';
          return `**${i + 1}.** \`${pfx}${c.name}\` ${priv} ${uses} ${desc}`;
        })
        .join('\n');

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`📜 Server Custom Commands (${commands.length}/${max})`)
        .setDescription(listDesc)
        .setFooter({
          text: `${isPrem ? '💎 Premium Tier' : '⭐ Free Tier'} • Create more via /customcommand or Dashboard`
        });

      return interaction.reply({ embeds: [embed] });
    }

    // ── 6. INFO COMMAND ───────────────────────────────────────────────────────
    if (sub === 'info') {
      const name = interaction.options.getString('name').trim().toLowerCase();
      const cmd = await getCustomCommand(guildId, name);
      if (!cmd) {
        return interaction.reply({ content: `❌ Command \`${name}\` not found.`, flags: 64 });
      }

      const perms = cmd.data?.permissions || {};
      const cooldown = cmd.data?.cooldown || { type: 'none', seconds: 0 };
      const actions = cmd.data?.actions || [];
      const pfx = cmd.data?.prefix || '!';

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`⚙️ Custom Command: ${pfx}${cmd.name}`)
        .setDescription(cmd.description || 'No description set.')
        .addFields(
          { name: 'Trigger', value: `\`${pfx}${cmd.name}\``, inline: true },
          { name: 'Prefix', value: `\`${pfx}\``, inline: true },
          { name: 'Total Uses', value: `${cmd.uses || 0}`, inline: true },
          { name: 'Visibility', value: cmd.data?.ephemeral ? '🔒 Private' : '🌐 Public', inline: true },
          {
            name: 'Cooldown',
            value: cooldown.type && cooldown.type !== 'none'
              ? `${cooldown.seconds}s (${cooldown.type})`
              : 'None',
            inline: true
          },
          {
            name: 'Allowed Roles',
            value: perms.allowedRoles?.length
              ? perms.allowedRoles.map(r => `<@&${r}>`).join(', ')
              : 'Everyone',
            inline: false
          },
          {
            name: 'Allowed Channels',
            value: perms.allowedChannels?.length
              ? perms.allowedChannels.map(c => `<#${c}>`).join(', ')
              : 'All Channels',
            inline: false
          },
          {
            name: 'Response Action',
            value: (cmd.data?.message || actions[0]?.message || 'No message').slice(0, 1024),
            inline: false
          }
        )
        .setFooter({ text: 'Edit actions, embeds, and random messages on the Web Dashboard!' });

      return interaction.reply({ embeds: [embed] });
    }
  }
};
