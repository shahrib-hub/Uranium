const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  inlineCode,
  hyperlink
} = require("discord.js");

function formatDate(date) {
  const ts = Math.floor(date.getTime() / 1000);
  return `<t:${ts}:F> • <t:${ts}:R>`;
}

const PAGE_SIZE = 20;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("info")
    .setDescription("📊 Premium information system — users, servers, roles, channels & emojis.")

    // EMOJI LIST
    .addSubcommand(sc =>
      sc.setName("emoji-list")
        .setDescription("🌀 View the server's emojis in a polished paginated UI.")
        .addStringOption(o =>
          o.setName("scope")
            .setDescription("Filter emojis")
            .addChoices(
              { name: "All emojis", value: "all" },
              { name: "Static only", value: "static" },
              { name: "Animated only", value: "animated" }
            )
        )
        .addIntegerOption(o =>
          o.setName("page")
            .setDescription("Page number")
            .setMinValue(1)
        )
    )

    // AVATAR
    .addSubcommand(sc =>
      sc.setName("avatar")
        .setDescription("🖼️ View a user's avatar in multiple formats & resolutions.")
        .addUserOption(o =>
          o.setName("user").setDescription("Target user")
        )
    )

    // USER INFO
    .addSubcommand(sc =>
      sc.setName("user")
        .setDescription("👤 Detailed premium user info panel.")
        .addUserOption(o =>
          o.setName("user").setDescription("Target user")
        )
    )

    // SERVER INFO
    .addSubcommand(sc =>
      sc.setName("server")
        .setDescription("🏛️ View detailed server analytics & statistics.")
    )

    // CHANNEL INFO
    .addSubcommand(sc =>
      sc.setName("channel")
        .setDescription("🛰️ Inspect channel information.")
        .addChannelOption(o =>
          o.setName("channel").setDescription("Target channel")
        )
    )

    // ROLE INFO
    .addSubcommand(sc =>
      sc.setName("role")
        .setDescription("🎨 Detailed premium role info.")
        .addRoleOption(o =>
          o.setName("role").setDescription("Target role")
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // ───────────────────────────────────────────
    // EMOJI LIST
    // ───────────────────────────────────────────
    if (sub === "emoji-list") {
      if (!interaction.guild)
        return interaction.reply({
          content: "❌ This subcommand only works in servers.",
          flags: 64
        });

      const scope = interaction.options.getString("scope") || "all";
      const requestedPage = interaction.options.getInteger("page") || 1;

      let emojis = [...interaction.guild.emojis.cache.values()];
      if (scope === "static") emojis = emojis.filter(e => !e.animated);
      if (scope === "animated") emojis = emojis.filter(e => e.animated);

      if (emojis.length === 0)
        return interaction.reply({
          content: `❌ No ${scope !== "all" ? scope : ""} emojis found.`,
          flags: 64
        });

      const maxPage = Math.ceil(emojis.length / PAGE_SIZE);
      const page = Math.max(1, Math.min(requestedPage, maxPage));
      const start = (page - 1) * PAGE_SIZE;

      const pageItems = emojis.slice(start, start + PAGE_SIZE);
      const desc = pageItems
        .map((e, i) => `**${start + i + 1}.** ${e} — \`${e.name}\`\nID: \`${e.id}\``)
        .join("\n\n");

      const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle(`📙 Emoji List (${scope})`)
        .setThumbnail(interaction.guild.iconURL({ size: 256 }))
        .setDescription(desc)
        .setFooter({ text: `Page ${page}/${maxPage} • ${emojis.length} total` });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`info_emoji_prev_${interaction.guild.id}_${page}_${scope}`)
          .setLabel("◀")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page <= 1),

        new ButtonBuilder()
          .setCustomId(`info_emoji_next_${interaction.guild.id}_${page}_${scope}`)
          .setLabel("▶")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page >= maxPage)
      );

      return interaction.reply({ embeds: [embed], components: [row] });
    }

    // ───────────────────────────────────────────
    // AVATAR
    // ───────────────────────────────────────────
    if (sub === "avatar") {
      const user = interaction.options.getUser("user") || interaction.user;

      const png = user.displayAvatarURL({ extension: "png", size: 4096 });
      const jpg = user.displayAvatarURL({ extension: "jpg", size: 4096 });
      const webp = user.displayAvatarURL({ extension: "webp", size: 4096 });
      const gif = user.displayAvatarURL({ extension: "gif", size: 4096 });

      const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle(`🖼️ Avatar — ${user.tag}`)
        .setImage(png)
        .setDescription(
          [
            `**Formats:**`,
            `[PNG](${png}) • [JPG](${jpg}) • [WEBP](${webp})${gif ? ` • [GIF](${gif})` : ""}`,
            "",
            `**User ID:**`,
            `\`${user.id}\``
          ].join("\n")
        );

      return interaction.reply({ embeds: [embed] });
    }

    // ───────────────────────────────────────────
    // USER INFO
    // ───────────────────────────────────────────
    if (sub === "user") {
      const member = interaction.options.getMember("user") || interaction.member;
      const user = member.user;

      const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle(`👤 User Information — ${user.tag}`)
        .setThumbnail(user.displayAvatarURL({ size: 256 }))
        .addFields(
          { name: "🆔 User ID", value: `\`${user.id}\`` },
          { name: "📅 Account Created", value: formatDate(user.createdAt) },
          {
            name: "📥 Joined Server",
            value: member.joinedAt ? formatDate(member.joinedAt) : "Unknown"
          },
          {
            name: "🎭 Roles",
            value: member.roles.cache
              .filter(r => r.id !== interaction.guild.id)
              .sort((a, b) => b.position - a.position)
              .map(r => r.toString())
              .join(", ") || "None"
          }
        );

      return interaction.reply({ embeds: [embed] });
    }

    // ───────────────────────────────────────────
    // SERVER INFO
    // ───────────────────────────────────────────
    if (sub === "server") {
      const guild = interaction.guild;
      const owner = await guild.fetchOwner();

      const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle(`🏛️ Server Information — ${guild.name}`)
        .setThumbnail(guild.iconURL({ size: 256 }))
        .addFields(
          { name: "🆔 Server ID", value: `\`${guild.id}\`` },
          { name: "👑 Owner", value: `${owner.user.tag} (${owner.id})` },
          { name: "📅 Created", value: formatDate(guild.createdAt) },
          {
            name: "📈 Members",
            value: `Total: **${guild.memberCount}**`
          },
          {
            name: "🔧 Boost Level",
            value: `Level ${guild.premiumTier} (${guild.premiumSubscriptionCount})`
          }
        );

      return interaction.reply({ embeds: [embed] });
    }

    // ───────────────────────────────────────────
    // CHANNEL INFO
    // ───────────────────────────────────────────
    if (sub === "channel") {
      const ch =
        interaction.options.getChannel("channel") || interaction.channel;

      const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle(`🛰️ Channel Information — #${ch.name}`)
        .addFields(
          { name: "🆔 ID", value: `\`${ch.id}\`` },
          { name: "📄 Type", value: `${ChannelType[ch.type]}` },
          { name: "📅 Created", value: formatDate(ch.createdAt) }
        );

      return interaction.reply({ embeds: [embed] });
    }

    // ───────────────────────────────────────────
    // ROLE INFO
    // ───────────────────────────────────────────
    if (sub === "role") {
      const role = interaction.options.getRole("role");

      const embed = new EmbedBuilder()
        .setColor(role.color || "#5865F2")
        .setTitle(`🎨 Role Information — ${role.name}`)
        .addFields(
          { name: "🆔 ID", value: `\`${role.id}\`` },
          { name: "🎨 Color", value: role.hexColor },
          { name: "📅 Created", value: formatDate(role.createdAt) },
          {
            name: "👥 Member Count",
            value: `${role.members.size}`
          }
        );

      return interaction.reply({ embeds: [embed] });
    }
  }
};