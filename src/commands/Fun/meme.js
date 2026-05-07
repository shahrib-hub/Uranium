const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('meme')
    .setDescription('Get a random meme from Reddit'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const res = await fetch('https://www.reddit.com/r/memes/hot.json?limit=50');
      const json = await res.json();

      const posts = json.data.children
        .map(p => p.data)
        .filter(p =>
          !p.over_18 &&
          (p.post_hint === 'image' || /\.(jpg|png|jpeg|gif)$/.test(p.url))
        );

      if (!posts.length) {
        return interaction.editReply('⚠️ No safe memes found. Try again!');
      }

      const post = posts[Math.floor(Math.random() * posts.length)];

      const embed = new EmbedBuilder()
        .setTitle(post.title)
        .setURL(`https://reddit.com${post.permalink}`)
        .setImage(post.url)
        .setColor(0xFF5700)
        .setFooter({ text: `👍 ${post.ups} | 💬 ${post.num_comments}` });

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('Meme fetch error:', err);
      await interaction.editReply('❌ Failed to fetch a meme. Try again later.');
    }
  }
};