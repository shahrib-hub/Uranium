const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const OWNER_IDS = (process.env.BOT_OWNER_IDS || '')
  .split(',')
  .map(i => i.trim())
  .filter(Boolean);

const DEV_GUILD_ID = process.env.DEV_GUILD_ID;
const PAGE_SIZE = 10;

module.exports = {
  devOnly: true,

  data: new SlashCommandBuilder()
    .setName('guild')
    .setDescription('🛠️ Developer guild utilities')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)

    .addSubcommand(sc =>
      sc.setName('list')
        .setDescription('List all guilds the bot is in (paginated)')
    ),

  async execute(interaction) {
    const { client } = interaction;
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    // 👑 Owner check
    if (!OWNER_IDS.includes(userId)) {
      return interaction.reply({
        content: '❌ Owner-only command.',
        flags: 64
      });
    }

    // 🧪 Dev guild check
    if (interaction.guildId !== DEV_GUILD_ID) {
      return interaction.reply({
        content: '❌ This command can only be used in the dev guild.',
        flags: 64
      });
    }

    // =====================
    // /guild list
    // =====================
    if (sub === 'list') {
      const guilds = [...client.guilds.cache.values()];
      let page = 0;

      const totalPages = Math.max(1, Math.ceil(guilds.length / PAGE_SIZE));

      const render = () => {
        const slice = guilds.slice(
          page * PAGE_SIZE,
          (page + 1) * PAGE_SIZE
        );

        const embed = new EmbedBuilder()
          .setColor('Blurple')
          .setTitle(`📊 Connected Guilds (${guilds.length})`)
          .setFooter({ text: `Page ${page + 1} / ${totalPages}` })
          .setDescription(
            slice.length
              ? slice.map(g =>
                  `**${g.name}**\n🆔 \`${g.id}\`\n👥 ${g.memberCount}`
                ).join('\n\n')
              : 'No guilds to display.'
          );

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('guild_prev')
            .setLabel('⬅️ Prev')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0),

          new ButtonBuilder()
            .setCustomId('guild_next')
            .setLabel('➡️ Next')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= totalPages - 1)
        );

        return { embed, row };
      };

      const { embed, row } = render();

      const msg = await interaction.reply({
        embeds: [embed],
        components: [row],
        flags: 64
      });

      const collector = msg.createMessageComponentCollector({
        time: 2 * 60 * 1000
      });

      collector.on('collect', async i => {
        if (i.user.id !== userId) {
          return i.reply({
            content: '❌ These buttons aren’t for you.',
            flags: 64
          });
        }

        if (i.customId === 'guild_next') page++;
        if (i.customId === 'guild_prev') page--;

        const { embed, row } = render();
        await i.update({ embeds: [embed], components: [row] });
      });

      collector.on('end', () => {
        msg.edit({ components: [] }).catch(() => {});
      });

      return;
    }
  }
};