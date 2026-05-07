const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

module.exports = {
  youtube(data, msg) {
    return {
      embeds: [
        new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle(data.title)
          .setURL(data.url)
          .setDescription(msg)
          .setImage(data.thumbnail)
          .setFooter({ text: '📺 YouTube Upload' })
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setLabel('Watch Video')
            .setURL(data.url)
        )
      ]
    };
  },

  twitch(data, msg) {
    return {
      embeds: [
        new EmbedBuilder()
          .setColor(0x9146ff)
          .setTitle(data.title)
          .setURL(data.url)
          .setDescription(
            `${msg}\n\n🎮 ${data.game}\n👥 ${data.viewers} viewers`
          )
          .setImage(data.thumbnail)
          .setFooter({ text: '🔴 Twitch Live' })
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setLabel('Watch Stream')
            .setURL(data.url)
        )
      ]
    };
  },

  dashboard(rows, premium) {
    const embed = new EmbedBuilder()
      .setTitle('📡 Social Notifications Dashboard')
      .setColor(0x2b2d31)
      .setDescription(
        premium
          ? '🌟 Premium Guild — extended limits enabled'
          : '🆓 Free Guild — limited notifications'
      );

    if (!rows.length) {
      embed.addFields({ name: 'Status', value: 'No channels configured.' });
      return embed;
    }

    for (const r of rows) {
      embed.addFields({
        name: `${r.platform.toUpperCase()} • ID ${r.id}`,
        value: `Source: \`${r.source}\`\nChannel: <#${r.notifyChannelId}>`
      });
    }

    return embed;
  }
};
