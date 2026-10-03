// src/buttons/helphandler.js — Uranium Help Menu Handler (Premium v3.0)
const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const {
  buildMainEmbed,
  buildCategoryEmbed,
  buildSelectOptions,
  buildHomeButtons,
  safeLoadJson,
  makeToken
} = require('../commands/Information/help');

module.exports = async function helpHandler(interaction) {
  try {
    const helpData = safeLoadJson();
    if (!helpData) {
      if (interaction.isRepliable && !interaction.replied) {
        return interaction.reply({ content: '⚠️ Help data missing on host. Contact developer.', flags: 64 });
      }
      return;
    }

    const categories = helpData.categories || [];

    // SELECT (category chosen)
    if (interaction.isStringSelectMenu && interaction.isStringSelectMenu()) {
      const cid = interaction.customId || '';
      if (!cid.startsWith('help_select_')) return;

      const parts = cid.split('_');
      const expectedUser = parts[2];
      if (expectedUser && expectedUser !== interaction.user.id) {
        return interaction.reply({ content: 'Only the original requester may interact with this help menu.', flags: 64 });
      }

      const token = parts[3] || makeToken();
      const chosen = interaction.values[0];
      const category = categories.find(c => c.id === chosen);
      if (!category) return interaction.update({ content: 'Category not found.', embeds: [], components: [] });

      const prevId = `help_prev_${interaction.user.id}_${token}`;
      const nextId = `help_next_${interaction.user.id}_${token}`;
      const backId = `help_back_${interaction.user.id}_${token}`;
      const selectId = `help_select_${interaction.user.id}_${token}`;

      const perPage = 8;
      const totalPages = Math.max(1, Math.ceil((category.commands || []).length / perPage));

      const prevBtn = new ButtonBuilder().setCustomId(prevId).setLabel('◀ Previous').setStyle(ButtonStyle.Primary).setDisabled(true);
      const nextBtn = new ButtonBuilder().setCustomId(nextId).setLabel('Next ▶').setStyle(ButtonStyle.Primary).setDisabled(totalPages <= 1);
      const backBtn = new ButtonBuilder().setCustomId(backId).setLabel('Back').setStyle(ButtonStyle.Secondary);
      const navRow = new ActionRowBuilder().addComponents(prevBtn, backBtn, nextBtn);

      const selectOptions = buildSelectOptions(categories);
      const select = new StringSelectMenuBuilder()
        .setCustomId(selectId)
        .setPlaceholder('✨ Select a module to explore commands...')
        .addOptions(selectOptions);
      const selectRow = new ActionRowBuilder().addComponents(select);

      return interaction.update({ embeds: [buildCategoryEmbed(category, 0, perPage, interaction)], components: [selectRow, navRow] });
    }

    // BUTTONS (prev/next/back)
    if (interaction.isButton && interaction.isButton()) {
      const id = interaction.customId || '';
      if (!id.startsWith('help_prev_') && !id.startsWith('help_next_') && !id.startsWith('help_back_')) {
        return;
      }

      const parts = id.split('_');
      const action = parts[1];
      const expectedUser = parts[2];
      const token = parts[3] || '';

      if (expectedUser && expectedUser !== interaction.user.id) {
        return interaction.reply({ content: 'Only the original requester may interact with this help menu.', flags: 64 });
      }

      const message = interaction.message;
      const embed = message?.embeds?.[0];
      if (!embed) {
        const mainEmbed = buildMainEmbed(helpData, interaction);
        const selectOptions = buildSelectOptions(categories);
        const selectId = `help_select_${interaction.user.id}_${token || makeToken()}`;
        const select = new StringSelectMenuBuilder()
          .setCustomId(selectId)
          .setPlaceholder('✨ Select a module to explore commands...')
          .addOptions(selectOptions);
        const selectRow = new ActionRowBuilder().addComponents(select);
        const buttons = buildHomeButtons(helpData);
        return interaction.update({ embeds: [mainEmbed], components: [selectRow, buttons] });
      }

      const title = embed.title || '';
      let currentCategory = null;
      for (const c of categories) {
        if (title.includes(c.id)) {
          currentCategory = c;
          break;
        }
      }

      if (!currentCategory || action === 'back') {
        const mainEmbed = buildMainEmbed(helpData, interaction);
        const selectOptions = buildSelectOptions(categories);
        const selectId = `help_select_${interaction.user.id}_${token || makeToken()}`;
        const select = new StringSelectMenuBuilder()
          .setCustomId(selectId)
          .setPlaceholder('✨ Select a module to explore commands...')
          .addOptions(selectOptions);
        const selectRow = new ActionRowBuilder().addComponents(select);
        const buttons = buildHomeButtons(helpData);
        return interaction.update({ embeds: [mainEmbed], components: [selectRow, buttons] });
      }

      let page = 0;
      const footer = embed.footer?.text || '';
      const m = footer.match(/Page\s+(\d+)\s+of\s+(\d+)/i);
      if (m) page = Math.max(0, parseInt(m[1], 10) - 1);

      const perPage = 8;
      const totalPages = Math.max(1, Math.ceil((currentCategory.commands || []).length / perPage));

      if (action === 'prev') page = Math.max(0, page - 1);
      else if (action === 'next') page = Math.min(totalPages - 1, page + 1);

      const prevBtn = new ButtonBuilder().setCustomId(`help_prev_${interaction.user.id}_${token}`).setLabel('◀ Previous').setStyle(ButtonStyle.Primary).setDisabled(page <= 0);
      const nextBtn = new ButtonBuilder().setCustomId(`help_next_${interaction.user.id}_${token}`).setLabel('Next ▶').setStyle(ButtonStyle.Primary).setDisabled(page >= totalPages - 1);
      const backBtn = new ButtonBuilder().setCustomId(`help_back_${interaction.user.id}_${token}`).setLabel('Back').setStyle(ButtonStyle.Secondary);
      const navRow = new ActionRowBuilder().addComponents(prevBtn, backBtn, nextBtn);

      const selectOptions2 = buildSelectOptions(categories);
      const select2 = new StringSelectMenuBuilder()
        .setCustomId(`help_select_${interaction.user.id}_${token}`)
        .setPlaceholder('✨ Select a module to explore commands...')
        .addOptions(selectOptions2);
      const selectRow2 = new ActionRowBuilder().addComponents(select2);

      return interaction.update({ embeds: [buildCategoryEmbed(currentCategory, page, perPage, interaction)], components: [selectRow2, navRow] });
    }

    return;
  } catch (err) {
    try {
      if (interaction.isRepliable && !interaction.replied) return interaction.reply({ content: 'Help handler error', flags: 64 });
      if (interaction.isRepliable && interaction.replied) return interaction.followUp({ content: 'Help handler error', flags: 64 });
    } catch (_) {}
  }
};