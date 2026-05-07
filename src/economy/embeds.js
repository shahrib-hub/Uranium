// src/economy/embeds.js — Uranium Economy Embeds v2.0
const { EmbedBuilder } = require('discord.js');
const { RARITIES, ZONES } = require('./constants');
const { progressBar } = require('./rng');

const URANIUM_COLOR = 0x00ff88;
const URANIUM_ICON = '☢️';

function base(color = URANIUM_COLOR) {
  return new EmbedBuilder().setColor(color).setTimestamp();
}

function balanceEmbed(user, balance, bankTier, bankLimit, level, prestige) {
  const net = balance.wallet + balance.bank;
  return base(0x00b894)
    .setAuthor({ name: `${user.username}'s Balance`, iconURL: user.displayAvatarURL({ size: 128 }) })
    .setThumbnail(user.displayAvatarURL({ size: 256 }))
    .setDescription([
      `${URANIUM_ICON} **Net Worth:** \`${net.toLocaleString()}\``,
      '',
      `⚛️ **Wallet:** \`${balance.wallet.toLocaleString()}\``,
      `🏦 **Bank:** \`${balance.bank.toLocaleString()} / ${bankLimit.toLocaleString()}\``,
      `📈 **Bank Tier:** \`${bankTier}/10\``,
      '',
      `⭐ **Level:** \`${level}\` ${prestige > 0 ? `• ✨ **Prestige:** \`${prestige}\`` : ''}`
    ].join('\n'));
}

function profileEmbed(user, balance, stats, cosmetics, bankTier, bankLimit, levelInfo) {
  const title = cosmetics.title ? `${cosmetics.title} ${user.username}` : `${user.username}`;
  const color = cosmetics.color || '#00ff88';
  const net = balance.wallet + balance.bank;

  const embed = base(color)
    .setAuthor({ name: title, iconURL: user.displayAvatarURL({ size: 128 }) })
    .setThumbnail(user.displayAvatarURL({ size: 256 }))
    .addFields(
      { name: '⚛️ Wallet', value: `\`${balance.wallet.toLocaleString()}\``, inline: true },
      { name: '🏦 Bank', value: `\`${balance.bank.toLocaleString()} / ${bankLimit.toLocaleString()}\``, inline: true },
      { name: `${URANIUM_ICON} Net Worth`, value: `\`${net.toLocaleString()}\``, inline: true },
      { name: '⭐ Level', value: `\`${levelInfo.level}\``, inline: true },
      { name: '🧪 XP', value: `${progressBar(levelInfo.currentXP, levelInfo.nextLevelXP, 8)}`, inline: true },
      { name: '✨ Prestige', value: `\`${levelInfo.prestige}\` (${((levelInfo.multiplier - 1) * 100).toFixed(0)}% bonus)`, inline: true }
    );

  // Stats row
  const statLines = [
    `📊 Commands: \`${stats.commands_used || 0}\``,
    `💸 Earned: \`${(stats.money_earned || 0).toLocaleString()}\``,
    `🎲 Games: \`${stats.games_played || 0}\``,
    `🔥 Daily Streak: \`${stats.daily_streak || 0}\``
  ];
  embed.addFields({ name: '📈 Statistics', value: statLines.join(' • '), inline: false });

  if (cosmetics.badge) embed.addFields({ name: '🏅 Badge', value: cosmetics.badge, inline: true });
  if (cosmetics.frame) embed.addFields({ name: '🖼️ Frame', value: cosmetics.frame, inline: true });

  return embed;
}

function inventoryEmbed(user, inventory, itemIndex, page = 0, totalPages = 1) {
  const embed = base(0xfdcb6e)
    .setAuthor({ name: `${user.username}'s Inventory`, iconURL: user.displayAvatarURL({ size: 128 }) })
    .setFooter({ text: `Page ${page + 1}/${totalPages} • ${inventory.length} item types` });

  if (!inventory.length) {
    embed.setDescription('🧺 Your inventory is empty.\nUse `/eco shop browse` to buy items!');
    return embed;
  }

  const lines = inventory.map(row => {
    const item = itemIndex[row.itemId];
    const rarity = item ? (RARITIES[item.rarity]?.emoji || '⬜') : '⬜';
    const name = item ? `${item.emoji || '🛒'} ${item.name}` : row.itemId;
    return `${rarity} **${name}** × \`${row.quantity}\``;
  });

  embed.setDescription(lines.join('\n'));
  return embed;
}

function leaderboardEmbed(type, entries, users) {
  const embed = base(0xa29bfe)
    .setTitle(`🏆 Uranium Leaderboard — ${type === 'wallet' ? '⚛️ Wallet' : type === 'bank' ? '🏦 Bank' : `${URANIUM_ICON} Net Worth`}`)
    .setThumbnail('https://cdn.discordapp.com/emojis/1448764015919497400.png');

  if (!entries.length) {
    embed.setDescription('No players yet. Start earning with `/eco earn daily`!');
    return embed;
  }

  const medals = ['🥇', '🥈', '🥉'];
  const lines = entries.map((row, i) => {
    const user = users.get(row.userId);
    const name = user?.username || `Unknown`;
    const net = row.net || row.wallet + row.bank;
    const medal = medals[i] || `\`${i + 1}.\``;
    return `${medal} **${name}** — \`${net.toLocaleString()}\` Atoms`;
  });

  embed.setDescription(lines.join('\n'));
  return embed;
}

function shopPageEmbed(user, category, items, page, totalPages) {
  const embed = base(0x74b9ff)
    .setAuthor({ name: `☢️ Uranium Shop — ${category.name}`, iconURL: user.displayAvatarURL({ size: 128 }) })
    .setFooter({ text: `Page ${page + 1}/${totalPages} • Use buttons below to buy` });

  if (!items.length) {
    embed.setDescription('No items in this category.');
    return embed;
  }

  const lines = items.map(item => {
    const rarity = RARITIES[item.rarity] || RARITIES.common;
    const lvl = item.levelReq > 0 ? ` (Lv.${item.levelReq})` : '';
    return `${rarity.emoji} ${item.emoji || '🛒'} **${item.name}** — \`${item.price.toLocaleString()}\` Atoms${lvl}\n> ${item.description}`;
  });

  embed.setDescription(lines.join('\n\n'));
  return embed;
}

function questEmbed(user, quests, progress, refreshMs) {
  const embed = base(0xff7675)
    .setAuthor({ name: `${user.username}'s Quests`, iconURL: user.displayAvatarURL({ size: 128 }) })
    .setThumbnail(user.displayAvatarURL({ size: 256 }));

  if (!quests.length) {
    embed.setDescription('No active quests. Check back later!');
    return embed;
  }

  const { formatMs } = require('./helpers');
  const refreshText = refreshMs ? `\n\n⏳ **Refreshes in:** \`${formatMs(refreshMs)}\`` : '';

  const diffEmojis = { easy: '🟢', medium: '🟡', hard: '🔴', extreme: '💀' };
  const lines = quests.map(q => {
    const current = progress[q.key] || 0;
    const pct = Math.min(current / q.target, 1);
    const done = pct >= 1;
    const bar = progressBar(current, q.target, 8);
    const diff = diffEmojis[q.diff] || '⬜';
    return `${done ? '✅' : diff} **${q.name}** — ${q.desc}\n> ${bar} (\`${current}/${q.target}\`)\n> ⚛️ \`${q.Atoms.toLocaleString()}\` • 🧪 \`${q.xp}\` XP`;
  });

  embed.setDescription(lines.join('\n\n') + refreshText);
  return embed;
}

function adventureEmbed(user, zone, result) {
  const color = result.coins > 0 ? 0x00ff88 : 0xe74c3c;
  return base(color)
    .setAuthor({ name: `${user.username}'s Adventure`, iconURL: user.displayAvatarURL({ size: 128 }) })
    .setTitle(`${zone.name} — Adventure Complete!`)
    .setDescription([
      `${result.emoji} ${result.text}`,
      '',
      `⚛️ **Coins:** \`${result.coins >= 0 ? '+' : ''}${result.Atoms.toLocaleString()}\``,
      `🧪 **XP:** \`+${result.xp}\``,
      result.foundRare ? '🌟 **You found a rare item!**' : ''
    ].filter(Boolean).join('\n'))
    .setFooter({ text: `Outcome: ${result.outcome}` });
}

function huntEmbed(user, animal) {
  const rarity = RARITIES[animal.rarity] || RARITIES.common;
  return base(rarity.color)
    .setAuthor({ name: `${user.username} went hunting!`, iconURL: user.displayAvatarURL({ size: 128 }) })
    .setDescription([
      `${animal.emoji} You caught a **${animal.name}**!`,
      `${rarity.emoji} Rarity: **${rarity.name}**`,
      `⚛️ Value: **\`${animal.value.toLocaleString()}\`** Atoms`
    ].join('\n'));
}

function fishEmbed(user, fish) {
  const rarity = RARITIES[fish.rarity] || RARITIES.common;
  return base(rarity.color)
    .setAuthor({ name: `${user.username} went fishing!`, iconURL: user.displayAvatarURL({ size: 128 }) })
    .setDescription([
      `${fish.emoji} You caught a **${fish.name}**!`,
      `${rarity.emoji} Rarity: **${rarity.name}**`,
      `⚛️ Value: **\`${fish.value.toLocaleString()}\`** Atoms`
    ].join('\n'));
}

function levelUpEmbed(user, oldLevel, newLevel, prestige) {
  return base(0xf1c40f)
    .setTitle('⬆️ LEVEL UP!')
    .setDescription([
      `**${user.username}** leveled up!`,
      `\`${oldLevel}\` ➡️ \`${newLevel}\``,
      prestige > 0 ? `✨ Prestige: \`${prestige}\`` : ''
    ].filter(Boolean).join('\n'))
    .setThumbnail(user.displayAvatarURL({ size: 256 }));
}

function errorEmbed(message) {
  return base(0xe74c3c).setDescription(`❌ ${message}`);
}

function successEmbed(message) {
  return base(0x2ecc71).setDescription(`✅ ${message}`);
}

function cooldownEmbed(remaining) {
  const { formatMs } = require('./helpers');
  return base(0xe67e22).setDescription(`⏳ You're on cooldown! Try again in **${formatMs(remaining)}**.`);
}

module.exports = {
  balanceEmbed, profileEmbed, inventoryEmbed, leaderboardEmbed,
  shopPageEmbed, questEmbed, adventureEmbed, huntEmbed, fishEmbed,
  levelUpEmbed, errorEmbed, successEmbed, cooldownEmbed
};
