// src/commands/Moderation/ai.js  (patched, single-file handlers, no separate button files)
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const { callGroq } = require('../../utils/groq');
const {
  addChannel,
  removeChannel,
  isChannelEnabled,
  getStats,
  getSettings,
  setSettings,
  incrementStat,
  resetSettings
} = require('../../utils/ai');

const { isPremiumGuild } = require('../../utils/premium');
const aiGloballyDisabled = false;
module.exports.premium = true;

const SETUP_FOOTER = {
  text: 'MULTi-Bot AI • Powered by Groq',
  iconURL: 'https://cdn.discordapp.com/attachments/938020057928302663/1442829606099882064/LogoMakerCa-1763789971628.png'
};

// ---------- Safe reply helper (local) ----------
async function safeReply(interaction, payload = {}) {
  try {
    // If not deferred/replied yet: attempt reply
    if (!interaction.deferred && !interaction.replied) {
      return await interaction.reply(payload);
    }

    // If already deferred/replied: prefer editReply
    if (interaction.deferred || interaction.replied) {
      try {
        return await interaction.editReply(payload);
      } catch (err) {
        // edit failed (token expired) -> try followUp
        try {
          return await interaction.followUp({ ...payload, ephemeral: payload.ephemeral ?? true });
        } catch (followErr) {
          // final fallback: try reply (may throw InteractionAlreadyReplied)
          try {
            return await interaction.reply({ ...payload, ephemeral: payload.ephemeral ?? true });
          } catch (_) {
            // give up; nothing else to do here
          }
        }
      }
    }
  } catch (e) {
    // swallow to avoid crash
    console.error('[ai.safeReply] final fallback error:', e);
  }
}

// ---------- Command definition ----------
module.exports = {
  data: new SlashCommandBuilder()
    .setName('ai')
    .setDescription('Interact with MULTi-Bot\'s AI features')
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub.setName('chat')
        .setDescription('Chat with the AI')
        .addStringOption(opt =>
          opt.setName('prompt').setDescription('Your message to the AI').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('setup')
        .setDescription('Enable AI auto-reply in a channel')
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Select a channel to enable AI')
            .addChannelTypes(ChannelType.GuildText)))
    .addSubcommand(sub =>
      sub.setName('disable')
        .setDescription('Disable AI auto-reply in a channel')
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Select a channel to disable AI')
            .addChannelTypes(ChannelType.GuildText)))
    .addSubcommand(sub =>
      sub.setName('status')
        .setDescription('Check if AI is enabled in this channel'))
    .addSubcommand(sub =>
      sub.setName('stats')
        .setDescription('View AI usage stats for this server'))
    .addSubcommand(sub =>
      sub.setName('style')
        .setDescription('Set the AI\'s tone/style')
        .addStringOption(opt =>
          opt.setName('style')
            .setDescription('Choose a tone')
            .setRequired(true)
            .addChoices(
              { name: 'Default', value: 'default' },
              { name: 'Casual', value: 'casual' },
              { name: 'Formal', value: 'formal' },
              { name: 'Sarcastic', value: 'sarcastic' },
              { name: 'Poetic', value: 'poetic' },
              { name: 'Friendly', value: 'friendly' }
            )))

    .addSubcommand(sub =>
      sub.setName('settings')
        .setDescription('Change AI model, style, or auto-reply')
        .addStringOption(opt =>
          opt.setName('model')
            .setDescription('Choose an AI model')
            .addChoices(
              { name: 'LLaMA 3.1 8B Instant', value: 'llama-3.1-8b-instant' },
              { name: 'GPT-OSS 20B', value: 'openai/gpt-oss-20b' },
              { name: 'LLaMA 3.3 70B Versatile', value: 'llama-3.3-70b-versatile' }
            ))
        .addStringOption(opt =>
          opt.setName('style')
            .setDescription('Choose a tone')
            .addChoices(
              { name: 'Default', value: 'default' },
              { name: 'Casual', value: 'casual' },
              { name: 'Formal', value: 'formal' },
              { name: 'Sarcastic', value: 'sarcastic' },
              { name: 'Poetic', value: 'poetic' },
              { name: 'Friendly', value: 'friendly' }
            ))
        .addBooleanOption(opt =>
          opt.setName('auto_reply')
            .setDescription('Enable or disable auto-reply')))

    .addSubcommand(sub =>
      sub.setName('reset')
        .setDescription('Reset all AI settings and channels for this server'))
    .addSubcommand(sub =>
      sub.setName('help')
        .setDescription('Learn how to use MULTi-Bot\'s AI features')),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const channelId = interaction.channel.id;
    const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.ManageGuild);

    // permission guard
    if (!['chat', 'status', 'help'].includes(sub) && !isAdmin) {
      return safeReply(interaction, { content: '❌ You need **Manage Server** permission to use this command.', flags: 64 });
    }

    // premium gating
    if (sub !== 'help') {
      try {
        if (!isPremiumGuild(guildId)) {
          return safeReply(interaction, {
            embeds: [new EmbedBuilder()
              .setColor('Red')
              .setTitle('🔒 Premium Feature')
              .setDescription(
                'This command is available only to **premium servers**.\n\n' +
                '• Use `/premium buy` to purchase premium\n' +
                '• Use `/premium redeem` to activate a code\n\n' +
                '💖 Thank you for supporting the project!'
              )
              .setFooter({ text: 'Premium required to access this feature.' })],
            flags: 64
          });
        }
      } catch (err) {
        console.error('[ai] premium check failed', err);
        return safeReply(interaction, { content: 'An internal error occurred while checking premium status.', flags: 64 });
      }
    }

    // global disable
    if (aiGloballyDisabled) {
      return safeReply(interaction, {
        embeds: [
          new EmbedBuilder()
            .setColor('Red')
            .setTitle('🚫 AI Temporarily Disabled')
            .setDescription('The AI system is temporarily disabled.')
            .setFooter({ text: 'This feature will return once bugs are fixed' })
        ],
        flags: 64
      });
    }

    try {
      // ---------------- chat ----------------
      if (sub === 'chat') {
        const prompt = interaction.options.getString('prompt', true);

        // Defer early (prevents 3s timeout)
        try { await interaction.deferReply({ flags: 64 }); } catch { }

        const settings = await new Promise(res => getSettings(guildId, res));
        const replyText = await callGroq(prompt, settings?.style ?? 'default', settings?.model ?? 'llama-3.1-8b-instant');
        incrementStat(guildId, 'prompts');

        if (!replyText) {
          return safeReply(interaction, { content: '⚠️ The AI did not return a response.', flags: 64 });
        }

        if (replyText.length > 2000) {
          return safeReply(interaction, { content: '⚠️ The AI response exceeds Discord\'s 2000 character limit and cannot be displayed.', flags: 64 });
        }

        return safeReply(interaction, { content: replyText, flags: 64 });
      }


      // ---------------- setup ----------------
      else if (sub === 'setup') {
        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
        isChannelEnabled(guildId, targetChannel.id, async (enabled) => {
          if (enabled) return safeReply(interaction, { content: '⚠️ AI is already enabled in that channel.', flags: 64 });
          addChannel(guildId, targetChannel.id);
          const embed = new EmbedBuilder()
            .setColor('Green')
            .setTitle('✅ AI Enabled')
            .setDescription(`MULTi-Bot will now auto-reply in <#${targetChannel.id}>.`)
            .setFooter(SETUP_FOOTER);
          return safeReply(interaction, { embeds: [embed], flags: 64 });
        });
      }

      // ---------------- disable ----------------
      else if (sub === 'disable') {
        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
        isChannelEnabled(guildId, targetChannel.id, async (enabled) => {
          if (!enabled) return safeReply(interaction, { content: '⚠️ AI is not enabled in that channel.', flags: 64 });
          removeChannel(guildId, targetChannel.id);
          return safeReply(interaction, { content: `🛑 AI auto-reply has been disabled in <#${targetChannel.id}>.`, flags: 64 });
        });
      }

      // ---------------- status ----------------
      else if (sub === 'status') {
        isChannelEnabled(guildId, channelId, async (enabled) => {
          const embed = new EmbedBuilder()
            .setColor(enabled ? 'Green' : 'Red')
            .setTitle('📡 AI Channel Status')
            .setDescription(enabled ? '✅ AI is enabled in this channel.' : '❌ AI is not enabled here.')
            .setFooter(SETUP_FOOTER);
          return safeReply(interaction, { embeds: [embed], flags: 64 });
        });
      }

      // ---------------- stats ----------------
      else if (sub === 'stats') {
        getStats(guildId, async (stats) => {
          const embed = new EmbedBuilder()
            .setColor('Blurple')
            .setTitle('📊 AI Usage Stats')
            .addFields({ name: '🧠 Prompts Sent', value: `${stats?.prompts || 0}`, inline: true })
            .setFooter(SETUP_FOOTER);
          return safeReply(interaction, { embeds: [embed], flags: 64 });
        });
      }

      // ---------------- style ----------------
      else if (sub === 'style') {
        const style = interaction.options.getString('style', true);
        setSettings(guildId, { style });
        return safeReply(interaction, { content: `🎨 AI style updated to **${style}**.`, flags: 64 });
      }

      // ---------------- settings ----------------
      else if (sub === 'settings') {
        const model = interaction.options.getString('model');
        const style = interaction.options.getString('style');
        const auto_reply = interaction.options.getBoolean('auto_reply');

        if (!model && !style && auto_reply === null) {
          return safeReply(interaction, { content: '⚠️ No changes were made. Please select at least one option.', flags: 64 });
        }

        const updates = {};
        if (model) updates.model = model;
        if (style) updates.style = style;
        if (auto_reply !== null) updates.auto_reply = auto_reply;

        setSettings(guildId, updates);

        const fields = [];
        if (model) fields.push({ name: '🧠 Model', value: model, inline: true });
        if (style) fields.push({ name: '🎭 Style', value: style, inline: true });
        if (auto_reply !== null) fields.push({ name: '💬 Auto-Reply', value: auto_reply ? 'Enabled ✅' : 'Disabled ❌', inline: true });

        const embed = new EmbedBuilder()
          .setColor('Blue')
          .setTitle('⚙️ AI Settings Updated')
          .setDescription('Here are your updated AI preferences:')
          .addFields(...fields)
          .setFooter(SETUP_FOOTER);

        return safeReply(interaction, { embeds: [embed], flags: 64 });
      }

      // ---------------- reset ----------------
      else if (sub === 'reset') {
        const confirmRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('confirm_reset').setLabel('✅ Confirm Reset').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('cancel_reset').setLabel('❌ Cancel').setStyle(ButtonStyle.Secondary)
        );

        const confirmEmbed = new EmbedBuilder()
          .setColor('Red')
          .setTitle('⚠️ Confirm AI Reset')
          .setDescription(
            'This will **permanently delete** all AI settings for this server.\n\n' +
            '- Auto-reply channels\n- Model and style preferences\n- Auto-reply toggle\n\nAre you sure you want to continue?'
          )
          .setFooter(SETUP_FOOTER);

        // Send the reply and fetch the message so we can attach a collector (must be non-ephemeral for reliable collection)
        const replyMsg = await interaction.reply({ embeds: [confirmEmbed], components: [confirmRow], fetchReply: true });

        // Collector listens only for this user's clicks and will use the collector interaction to update the message
        const collector = replyMsg.createMessageComponentCollector({
          time: 15000,
          filter: i => i.user.id === interaction.user.id
        });

        collector.on('collect', async i => {
          try {
            if (i.customId === 'confirm_reset') {
              resetSettings(guildId);
              await i.update({ content: '✅ All AI settings and channels have been reset for this server.', embeds: [], components: [] });
            } else if (i.customId === 'cancel_reset') {
              await i.update({ content: '❌ AI reset cancelled.', embeds: [], components: [] });
            }
          } catch (e) {
            console.error('[ai.reset.collector] collect handler error:', e);
            try { await i.reply({ content: '❌ An error occurred handling your click.', flags: 64 }); } catch (_) { }
          } finally {
            collector.stop();
          }
        });

        collector.on('end', async collected => {
          if (collected.size === 0) {
            // edit via original interaction (safe because replyMsg is the message)
            try {
              await interaction.editReply({ content: '⌛ Reset timed out. No changes were made.', embeds: [], components: [] });
            } catch (e) {
              // If editReply fails (rare), attempt to send ephemeral fallback
              try { await safeReply(interaction, { content: '⌛ Reset timed out. No changes were made.', flags: 64 }); } catch (_) { }
            }
          }
        });

        return;
      }

      // ---------------- help ----------------
      else if (sub === 'help') {
        const helpEmbed = new EmbedBuilder()
          .setColor('Gold')
          .setTitle('🤖 MULTi-Bot AI Help Menu')
          .setDescription([
            '**Welcome to MULTi-Bot\'s AI system!**',
            '',
            '🧠 **/ai chat** — Chat with the AI using your selected model and tone.',
            '⚙️ **/ai setup** — Enable AI auto-reply in a channel (admin only).',
            '🚫 **/ai disable** — Turn off AI auto-reply in a channel (admin only).',
            '📡 **/ai status** — Check if AI is enabled in the current channel.',
            '📊 **/ai stats** — View how many prompts your server has used.',
            '🎭 **/ai style** — Change the tone of AI replies (admin only).',
            '🔧 **/ai settings** — Change the model, style, or auto-reply toggle (admin only).',
            '🧹 **/ai reset** — Reset all AI settings and channels (admin only).'
          ].join('\n'))
          .setFooter(SETUP_FOOTER);

        return safeReply(interaction, { embeds: [helpEmbed], flags: 64 });
      }
    } catch (err) {
      console.error('[ai command] error', err);
      if (!interaction.replied && !interaction.deferred) {
        try { await interaction.reply({ content: 'An internal error occurred while running the command.', flags: 64 }); } catch (_) { }
      } else {
        try { await safeReply(interaction, { content: 'An internal error occurred while running the command.', flags: 64 }); } catch (_) { }
      }
    }
  }
};
