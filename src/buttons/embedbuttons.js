const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType
} = require('discord.js');

const {
  createSession,
  getSession,
  clearSession,
  updateEmbed
} = require('../components/embedbuilder/builderSession');

const { isPremiumGuild } = require('../utils/premium');
const { saveTemplate, countTemplates } = require('../utils/embedTemplates');

const BUILDER_TIMEOUT = 8 * 60 * 1000;

const DEFAULT_TITLE = 'Untitled Embed';
const DEFAULT_DESC = 'Click a button below to start editing.';

const COLOR_NAMES = {
  red: 0xED4245,
  green: 0x57F287,
  yellow: 0xFEE75C,
  blue: 0x5865F2,
  purple: 0x9B59B6,
  orange: 0xFAA61A,
  black: 0x000000,
  white: 0xFFFFFF,
  grey: 0x2B2D31,
  gray: 0x2B2D31,
  random: 'RANDOM'
};

function getBuilderRows() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('edit_title').setLabel('📝 Title').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('edit_description').setLabel('📄 Description').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('edit_color').setLabel('🎨 Color').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('edit_author').setLabel('👤 Author').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('edit_footer').setLabel('🦶 Footer').setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('edit_thumbnail').setLabel('🖼️ Thumbnail').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('edit_image').setLabel('🖼️ Image').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('add_field').setLabel('➕ Field').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('remove_field').setLabel('➖ Field').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('toggle_timestamp').setLabel('🕒 Time').setStyle(ButtonStyle.Secondary)
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('save_template').setLabel('💾 Save').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('send_embed').setLabel('📤 Send').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('cancel_builder').setLabel('❌ Cancel').setStyle(ButtonStyle.Danger)
  );

  return [row1, row2, row3];
}

module.exports = {
  getBuilderRows,
  async execute(interaction) {
    const { customId, user, guild, message } = interaction;
    const userId = user.id;

    /* ───────────── START BUILDER ───────────── */

    if (customId === 'start_embed_builder') {
      const session = createSession(userId);

      session.embed = new EmbedBuilder()
        .setTitle(DEFAULT_TITLE)
        .setDescription(DEFAULT_DESC)
        .setColor('Blurple');

      updateEmbed(session);

      await interaction.update({
        content: '🧱 **Embed Builder Active (8 minutes)**',
        embeds: [session.embed],
        components: getBuilderRows()
      });

      setTimeout(async () => {
        if (!getSession(userId)) return;
        clearSession(userId);
        try { await message.edit({ components: [] }); } catch {}
      }, BUILDER_TIMEOUT);

      return;
    }

    /* ───────────── LOAD TEMPLATE MENU ───────────── */

    if (interaction.isStringSelectMenu && interaction.isStringSelectMenu() && customId === 'load_embed_template') {
      const templateName = interaction.values[0];
      const { getTemplateByName } = require('../utils/embedTemplates');
      const data = await getTemplateByName(guild.id, templateName);
      
      if (!data) {
        return interaction.reply({ flags: 64, content: `❌ Template **${templateName}** no longer exists.` });
      }

      const session = createSession(userId);
      session.embed = EmbedBuilder.from(JSON.parse(data));
      updateEmbed(session);

      await interaction.update({
        content: `🧱 **Embed Builder Active (8 minutes)** - Loaded: \`${templateName}\``,
        embeds: [session.embed],
        components: getBuilderRows()
      });

      setTimeout(async () => {
        if (!getSession(userId)) return;
        clearSession(userId);
        try { await message.edit({ components: [] }).catch(() => {}); } catch {}
      }, BUILDER_TIMEOUT);

      return;
    }

    /* ───────────── CANCEL ───────────── */

    if (customId === 'cancel_builder') {
      clearSession(userId);
      await interaction.update({ content: '❌ Builder cancelled.', embeds: [], components: [] });
      return;
    }

    /* ───────────── TOGGLE TIMESTAMP ───────────── */

    if (customId === 'toggle_timestamp') {
      const s = getSession(userId);
      if (!s) return;

      s.timestamp = !s.timestamp;
      updateEmbed(s);

      await interaction.update({ embeds: [s.embed], components: message.components });
      return;
    }

    /* ───────────── SAVE TEMPLATE ───────────── */

    if (customId === 'save_template') {
      const s = getSession(userId);
      if (!s) return;

      await interaction.reply({ flags: 64, content: '💾 Enter template name:' });

      const c = interaction.channel.createMessageCollector({
        filter: m => m.author.id === userId,
        max: 1,
        time: 15000
      });

      c.on('collect', async m => {
        const { isPremiumGuild } = require('../utils/premium');
        const isPremium = await isPremiumGuild(guild.id);
        const limit = isPremium ? 20 : 3;
        const currentCount = await countTemplates(guild.id);
        if (currentCount >= limit) {
          await interaction.followUp({ flags: 64, content: `⚠️ Template limit reached. (Max: ${limit} templates for ${isPremium ? 'Premium' : 'Free'} guilds)` });
          return m.delete().catch(() => {});
        }

        await saveTemplate(guild.id, userId, m.content.trim(), s.embed.toJSON());
        await interaction.followUp({ flags: 64, content: '✅ Template saved.' });
        m.delete().catch(() => {});
      });

      return;
    }

    /* ───────────── SEND EMBED ───────────── */

    if (customId === 'send_embed') {
      const s = getSession(userId);
      if (!s) return;

      await interaction.reply({ flags: 64, content: '📤 Mention a text channel.' });

      const c = interaction.channel.createMessageCollector({
        filter: m => m.author.id === userId,
        max: 1,
        time: 15000
      });

      c.on('collect', async m => {
        const ch = m.mentions.channels.first();
        if (!ch || ch.type !== ChannelType.GuildText) {
          await interaction.followUp({ flags: 64, content: '❌ Invalid channel.' });
          return m.delete().catch(() => {});
        }

        await ch.send({ embeds: [s.embed] });
        clearSession(userId);

        await interaction.followUp({ flags: 64, content: `✅ Sent to ${ch}` });
        try { await message.edit({ components: [] }); } catch {}
        m.delete().catch(() => {});
      });

      return;
    }

    /* ───────────── EDIT FIELDS ───────────── */

    const PROMPTS = {
      edit_title: 'Enter **title**',
      edit_description: 'Enter **description**',
      edit_author: 'Enter **author name**',
      edit_footer: 'Enter **footer text**',
      edit_color: 'Enter color (`red`, `yellow`, `#ff0000`, `random`)',
      edit_thumbnail: 'Send image URL or upload',
      edit_image: 'Send image URL or upload'
    };

    if (PROMPTS[customId]) {
      await interaction.reply({ flags: 64, content: PROMPTS[customId] });

      const c = interaction.channel.createMessageCollector({
        filter: m => m.author.id === userId,
        max: 1,
        time: 15000
      });

      c.on('collect', async m => {
        const s = getSession(userId);
        if (!s) return;

        let valid = true;
        const e = s.embed;
        const text = m.content?.trim();
        const img = m.attachments.first()?.url;

        try {
          if (customId === 'edit_title')
            e.setTitle(text || DEFAULT_TITLE);

          if (customId === 'edit_description')
            e.setDescription(text || DEFAULT_DESC);

          if (customId === 'edit_author')
            e.setAuthor({ name: text || ' ' });

          if (customId === 'edit_footer')
            e.setFooter({ text: text || ' ' });

          if (customId === 'edit_color') {
            const c = COLOR_NAMES[text?.toLowerCase()];
            if (c !== undefined) e.setColor(c);
            else if (/^#?[0-9a-f]{6}$/i.test(text)) e.setColor(text);
            else valid = false;
          }

          if (customId === 'edit_thumbnail') {
            if (img) e.setThumbnail(img);
            else if (text?.startsWith('http')) e.setThumbnail(text);
            else valid = false;
          }

          if (customId === 'edit_image') {
            if (img) e.setImage(img);
            else if (text?.startsWith('http')) e.setImage(text);
            else valid = false;
          }
        } catch { valid = false; }

        updateEmbed(s);

        await interaction.message.edit({
          embeds: [e],
          components: interaction.message.components
        }).catch(() => {});

        await m.react(valid ? '✅' : '❌').catch(() => {});
        setTimeout(() => m.delete().catch(() => {}), 5000);
      });

      return;
    }

    /* ───────────── ADD / REMOVE FIELD ───────────── */

    if (customId === 'add_field') {
      await interaction.reply({ flags: 64, content: 'Format: `Name | Value`' });

      const c = interaction.channel.createMessageCollector({
        filter: m => m.author.id === userId,
        max: 1,
        time: 15000
      });

      c.on('collect', async m => {
        const s = getSession(userId);
        if (!s) return;

        const [n, v] = m.content.split('|').map(x => x?.trim());
        if (!n || !v) {
          await m.react('❌');
          return m.delete().catch(() => {});
        }

        s.fields.push({ name: n, value: v, inline: false });
        updateEmbed(s);

        await interaction.message.edit({ embeds: [s.embed], components: interaction.message.components }).catch(() => {});
        await m.react('✅').catch(() => {});
        setTimeout(() => m.delete().catch(() => {}), 5000);
      });

      return;
    }

    if (customId === 'remove_field') {
      const s = getSession(userId);
      if (!s || !s.fields.length)
        return interaction.reply({ flags: 64, content: '⚠️ No fields to remove.' });

      s.fields.pop();
      updateEmbed(s);

      await interaction.update({ embeds: [s.embed], components: interaction.message.components }).catch(() => {});
    }
  }
};