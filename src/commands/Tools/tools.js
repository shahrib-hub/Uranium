const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  ComponentType
} = require('discord.js');
const isgd = require('isgd');
const generator = require('generate-password');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tools')
    .setDescription('🧰 A collection of useful tools')
    .addSubcommand(sub =>
      sub.setName('calculator').setDescription('🧮 Open an interactive calculator')
    )
    .addSubcommand(sub =>
      sub.setName('decode')
        .setDescription('🔓 Decode binary to text')
        .addStringOption(o => o.setName('binary').setDescription('Binary code to decode').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('encode')
        .setDescription('🔐 Encode text to binary')
        .addStringOption(o => o.setName('text').setDescription('Text to encode').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('emojify')
        .setDescription('🔡 Convert text to emoji')
        .addStringOption(o => o.setName('text').setDescription('Text to emojify').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('enlarge')
        .setDescription('🔍 Enlarge an emoji')
        .addStringOption(o => o.setName('emoji').setDescription('Emoji to enlarge').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('mcskin')
        .setDescription('🎮 View Minecraft skin')
        .addStringOption(o => o.setName('username').setDescription('Minecraft username').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('mcstatus')
        .setDescription('📡 Check Minecraft server status')
        .addStringOption(o => o.setName('ip').setDescription('Server IP address').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('passwordgen')
        .setDescription('🔐 Generate a secure password')
        .addIntegerOption(o => o.setName('length').setDescription('Password length').setRequired(true))
        .addBooleanOption(o => o.setName('numbers').setDescription('Include numbers?').setRequired(true))
        .addBooleanOption(o => o.setName('symbols').setDescription('Include symbols?').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('qrcode')
        .setDescription('📱 Generate a QR code')
        .addStringOption(o => o.setName('url').setDescription('URL to encode').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('shortenurl')
        .setDescription('🔗 Shorten a URL')
        .addStringOption(o => o.setName('url').setDescription('URL to shorten').setRequired(true))
    ),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const user = interaction.user;

    // Helper: Safe calculator evaluation
    const safeEval = (expr) => {
      try {
        if (!/^[\d+\-*/().\s]+$/.test(expr)) return null;
        return Function(`return (${expr})`)();
      } catch {
        return null;
      }
    };

    // Helper: Binary encode/decode
    const textToBinary = (text) =>
      text.split('').map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');
    const binaryToText = (bin) =>
      bin.split(' ').map(b => String.fromCharCode(parseInt(b, 2))).join('');

    // Helper: Emojify
    const emojiMap = {
      '0': ':zero:', '1': ':one:', '2': ':two:', '3': ':three:', '4': ':four:',
      '5': ':five:', '6': ':six:', '7': ':seven:', '8': ':eight:', '9': ':nine:',
      '#': ':hash:', '*': ':asterisk:', '?': ':grey_question:', '!': ':grey_exclamation:', ' ': '   '
    };
    const emojify = (text) =>
      text.toLowerCase().split('').map(c => emojiMap[c] || `:regional_indicator_${c}:`).join(' ');

    // Helper: Emoji parser
    const parseEmoji = (emoji) => {
      const custom = emoji.match(/<a?:\w+:(\d+)>/);
      if (custom) {
        const isAnimated = emoji.startsWith('<a:');
        return {
          url: `https://cdn.discordapp.com/emojis/${custom[1]}.${isAnimated ? 'gif' : 'png'}?size=512`,
          animated: isAnimated
        };
      }
      const codePoint = [...emoji][0].codePointAt(0).toString(16);
      return {
        url: `https://twemoji.maxcdn.com/v/latest/72x72/${codePoint}.png`,
        animated: false
      };
    };

    // Subcommand: calculator
    if (sub === 'calculator') {
      const rows = [
        ['7', '8', '9', '/'],
        ['4', '5', '6', '*'],
        ['1', '2', '3', '-'],
        ['0', '.', 'C', '+'],
        ['(', ')', '⌫', '=']
      ];
      let expression = '';

      const getEmbed = (expr, result = '') => new EmbedBuilder()
        .setTitle('🧮 Calculator')
        .setDescription(`\`\`\`\n${expr || '0'}\n\`\`\`` + (result ? `**= ${result}**` : ''))
        .setColor(0x2b2d31)
        .setFooter({ text: `Requested by ${user.username}`, iconURL: user.displayAvatarURL() });

      const getButtons = (disabled = false) => rows.map(row =>
        new ActionRowBuilder().addComponents(
          row.map(label =>
            new ButtonBuilder()
              .setCustomId(`calc_${label}`)
              .setLabel(label)
              .setStyle(['+', '-', '*', '/', '='].includes(label) ? ButtonStyle.Primary :
                        label === 'C' ? ButtonStyle.Danger :
                        label === '⌫' ? ButtonStyle.Secondary :
                        ButtonStyle.Secondary)
              .setDisabled(disabled)
          )
        )
      );

      const message = await interaction.reply({
        embeds: [getEmbed(expression)],
        components: getButtons(),
        withResponse: true
      });

      const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 8 * 60 * 1000
      });

      collector.on('collect', async btn => {
        try {
          if (btn.user.id !== user.id) return btn.reply({ content: '❌ This calculator is not for you.', flags: 64 });

          const key = btn.customId.replace('calc_', '');
          if (key === 'C') expression = '';
          else if (key === '⌫') expression = expression.slice(0, -1);
          else if (key === '=') expression = safeEval(expression)?.toString() || 'Error';
          else expression += key;

          await btn.update({
            embeds: [getEmbed(expression)],
            components: getButtons()
          });
        } catch (err) {
          if (err?.code === 10062) return;
          console.error('[calculator] collector error:', err);
        }
      });

      collector.on('end', async () => {
        await message.edit({
          embeds: [getEmbed(expression, 'Expired')],
          components: getButtons(true)
        });
      });

      return;
    }

    // Subcommand: decode
    if (sub === 'decode') {
      const binary = interaction.options.getString('binary');
      if (!/^[01\s]+$/.test(binary)) {
        return interaction.reply({ content: '❌ Invalid binary input.', flags: 64 });
      }
      const text = binaryToText(binary);
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setTitle('🔓 Binary Decoded')
          .setDescription(`\`\`\`${text}\`\`\``)
          .setColor(0x2b2d31)]
      });
    }

    // Subcommand: encode
    if (sub === 'encode') {
      const text = interaction.options.getString('text');
      const binary = textToBinary(text);
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setTitle('🔐 Text Encoded to Binary')
          .setDescription(`\`\`\`${binary}\`\`\``)
          .setColor(0x2b2d31)]
      });
    }

    // Subcommand: emojify
    if (sub === 'emojify') {
      const text = interaction.options.getString('text');
      const result = emojify(text);
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setTitle('🔡 Emojified Text')
          .setDescription(result)
          .setColor(0x2b2d31)]
      });
    }

    // Subcommand: enlarge
    if (sub === 'enlarge') {
      const emoji = interaction.options.getString('emoji');
      const { url } = parseEmoji(emoji);
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setTitle('🔍 Enlarged Emoji')
          .setImage(url)
          .setColor(0x2b2d31)]
      });
    }
    // Subcommand: mcskin
    if (sub === 'mcskin') {
      const username = interaction.options.getString('username');
      const skinUrl = `https://minotar.net/armor/body/${username}/700.png`;

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setTitle(`🎮 Minecraft Skin: ${username}`)
          .setImage(skinUrl)
          .setColor(0x2b2d31)]
      });
    }

    // Subcommand: mcstatus
    if (sub === 'mcstatus') {
      const ip = interaction.options.getString('ip');
      const res = await fetch(`https://api.mcsrvstat.us/2/${ip}`).then(r => r.json()).catch(() => null);
      if (!res || !res.ip) {
        return interaction.reply({ content: '❌ Could not fetch server status.', flags: 64 });
      }

      const embed = new EmbedBuilder()
        .setTitle(`📡 Minecraft Server Status`)
        .setColor(res.online ? 0x57f287 : 0xed4245)
        .setThumbnail(`https://eu.mc-api.net/v3/server/favicon/${ip}`)
        .addFields(
          { name: 'IP', value: res.ip, inline: true },
          { name: 'Status', value: res.online ? '🟢 Online' : '🔴 Offline', inline: true },
          { name: 'Version', value: res.version || 'Unknown', inline: true },
          { name: 'Players', value: res.players ? `${res.players.online}/${res.players.max}` : 'N/A', inline: true },
          { name: 'MOTD', value: res.motd?.clean?.join('\n') || 'N/A' }
        );

      return interaction.reply({ embeds: [embed] });
    }

    // Subcommand: passwordgen
    if (sub === 'passwordgen') {
      const length = interaction.options.getInteger('length');
      const numbers = interaction.options.getBoolean('numbers');
      const symbols = interaction.options.getBoolean('symbols');

      const password = generator.generate({
        length,
        numbers,
        symbols,
        uppercase: true,
        lowercase: true,
        strict: true
      });

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setTitle('🔐 Generated Password')
          .setDescription(`\`\`\`${password}\`\`\``)
          .setColor(0x2b2d31)]
      });
    }

    // Subcommand: qrcode
    if (sub === 'qrcode') {
      const url = interaction.options.getString('url');
      const encoded = encodeURIComponent(url);
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encoded}`;

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setTitle('📱 QR Code')
          .setImage(qrUrl)
          .setColor(0x2b2d31)]
      });
    }

    // Subcommand: shortenurl
    if (sub === 'shortenurl') {
      const url = interaction.options.getString('url');
      isgd.shorten(url, async function (shortUrl) {
        if (!shortUrl || shortUrl.startsWith('Error')) {
          return interaction.reply({ content: '❌ Failed to shorten URL.', flags: 64 });
        }

        const embed = new EmbedBuilder()
          .setTitle('🔗 Shortened URL')
          .setDescription(`[Click here to open](${shortUrl})`)
          .setColor(0x2b2d31);

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel('Open Link')
            .setStyle(ButtonStyle.Link)
            .setURL(shortUrl)
        );

        return interaction.reply({ embeds: [embed], components: [row] });
      });
    }
  }
};
