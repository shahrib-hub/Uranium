// commands/Fun/facts.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const FOOTER = 'MULTi-Bot Facts | SHM';

const safeFetchJson = async (url) => {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
};

const mk = (title, desc) => new EmbedBuilder().setTitle(title).setDescription(desc).setColor(0x57F287).setFooter({ text: FOOTER }).setTimestamp();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('facts')
    .setDescription('Animal facts & general facts')
    .addSubcommand(s => s.setName('fact').setDescription('Random fun fact (useless facts)'))
    .addSubcommand(s => s.setName('bird').setDescription('Random bird fact'))
    .addSubcommand(s => s.setName('cat').setDescription('Random cat fact'))
    .addSubcommand(s => s.setName('dog').setDescription('Random dog fact'))
    .addSubcommand(s => s.setName('koala').setDescription('Random koala fact/image'))
    .addSubcommand(s => s.setName('panda').setDescription('Random panda fact/image')),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    try {
      if (sub === 'fact') {
        const j = await safeFetchJson('https://uselessfacts.jsph.pl/random.json?language=en');
        const text = j?.text || 'Could not fetch fact.';
        return interaction.reply({ embeds: [mk('💡 Fact', text)] });
      }

      if (sub === 'bird') {
        const j = await safeFetchJson('https://some-random-api.com/facts/bird');
        const fact = j?.fact || j?.message || null;
        if (!fact) return interaction.reply({ content: 'Could not fetch bird fact.', flags: 64 });
        return interaction.reply({ embeds: [mk('🐦 Bird Fact', fact)] });
      }

      if (sub === 'cat') {
        const j = await safeFetchJson('https://some-random-api.com/facts/cat');
        const fact = j?.fact || j?.message || null;
        if (!fact) return interaction.reply({ content: 'Could not fetch cat fact.', flags: 64 });
        return interaction.reply({ embeds: [mk('🐱 Cat Fact', fact)] });
      }

      if (sub === 'dog') {
        const j = await safeFetchJson('https://some-random-api.com/facts/dog');
        const fact = j?.fact || j?.message || null;
        if (!fact) return interaction.reply({ content: 'Could not fetch dog fact.', flags: 64 });
        return interaction.reply({ embeds: [mk('🐶 Dog Fact', fact)] });
      }

      if (sub === 'koala') {
        const j = await safeFetchJson('https://some-random-api.com/animal/koala') || await safeFetchJson('https://some-random-api.com/facts/koala');
        const fact = j?.fact || j?.message || null;
        const img = j?.image || j?.link || null;
        if (!fact && !img) return interaction.reply({ content: 'Could not fetch koala info.', flags: 64 });
        return interaction.reply({ embeds: [mk('🐨 Koala', fact || 'Koala time!').setImage(img || undefined)] });
      }

      if (sub === 'panda') {
        const j = await safeFetchJson('https://some-random-api.com/animal/panda') || await safeFetchJson('https://some-random-api.com/facts/panda');
        const fact = j?.fact || j?.message || null;
        const img = j?.image || j?.link || null;
        if (!fact && !img) return interaction.reply({ content: 'Could not fetch panda info.', flags: 64 });
        return interaction.reply({ embeds: [mk('🐼 Panda', fact || 'Panda time!').setImage(img || undefined)] });
      }

      return interaction.reply({ content: 'Unknown subcommand.', flags: 64 });
    } catch (err) {
      console.error('facts command error', err);
      return interaction.reply({ content: 'An error occurred.', flags: 64 });
    }
  }
};