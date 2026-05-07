const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const PAGE_SIZE = 20;

module.exports = async function handleInfoButtons(interaction) {
  const id = interaction.customId;

  if (!id.startsWith("info_emoji_")) return;

  // FORMAT:
  // info_emoji_prev_guildId_page_scope
  // info_emoji_next_guildId_page_scope

  const [_, __, action, guildId, pageStr, scope] = id.split("_");

  const page = Number(pageStr);

  const guild = interaction.client.guilds.cache.get(guildId);
  if (!guild)
    return interaction.reply({ content: "Guild not found.", flags: 64 });

  let emojis = [...guild.emojis.cache.values()];

  if (scope === "static") emojis = emojis.filter(e => !e.animated);
  if (scope === "animated") emojis = emojis.filter(e => e.animated);

  const maxPage = Math.ceil(emojis.length / PAGE_SIZE);
  const newPage =
    action === "prev" ? Math.max(1, page - 1) : Math.min(maxPage, page + 1);

  const start = (newPage - 1) * PAGE_SIZE;
  const slice = emojis.slice(start, start + PAGE_SIZE);

  const desc = slice
    .map(
      (e, i) => `**${start + i + 1}.** ${e} — \`${e.name}\`\nID: \`${e.id}\``
    )
    .join("\n\n");

  const embed = new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle(`📙 Emoji List (${scope})`)
    .setThumbnail(guild.iconURL({ size: 256 }))
    .setDescription(desc)
    .setFooter({
      text: `Page ${newPage}/${maxPage} • ${emojis.length} total`
    });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`info_emoji_prev_${guildId}_${newPage}_${scope}`)
      .setLabel("◀")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(newPage <= 1),

    new ButtonBuilder()
      .setCustomId(`info_emoji_next_${guildId}_${newPage}_${scope}`)
      .setLabel("▶")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(newPage >= maxPage)
  );

  return interaction.update({ embeds: [embed], components: [row] });
};