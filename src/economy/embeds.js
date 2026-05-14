const { EmbedBuilder } = require('discord.js');
const { RARITIES } = require('./constants');
const { progressBar } = require('./rng');

const ACCENT = 0x00ff88;

function base(color = ACCENT) {
  return new EmbedBuilder().setColor(color).setTimestamp();
}

function balanceEmbed(user, balance, bankTier, bankLimit, level, prestige) {
  const net = balance.wallet + balance.bank;
  return base(0x00b894)
    .setAuthor({ name: `${user.username}'s Balance`, iconURL: user.displayAvatarURL({ size: 128 }) })
    .setDescription([
      `Net Worth: \`${net.toLocaleString()}\``,
      '',
      `Wallet: \`${balance.wallet.toLocaleString()}\``,
      `Bank: \`${balance.bank.toLocaleString()} / ${bankLimit.toLocaleString()}\``,
      `Bank Tier: \`${bankTier}\``,
      `Level: \`${level}\`${prestige > 0 ? ` | Prestige \`${prestige}\`` : ''}`
    ].join('\n'));
}

function profileEmbed(user, balance, stats, cosmetics, bankTier, bankLimit, levelInfo) {
  const net = balance.wallet + balance.bank;
  const color = cosmetics.color || ACCENT;
  const title = cosmetics.title ? `${cosmetics.title} ${user.username}` : user.username;

  const embed = base(color)
    .setAuthor({ name: title, iconURL: user.displayAvatarURL({ size: 128 }) })
    .setThumbnail(user.displayAvatarURL({ size: 256 }))
    .addFields(
      { name: 'Wallet', value: `\`${balance.wallet.toLocaleString()}\``, inline: true },
      { name: 'Bank', value: `\`${balance.bank.toLocaleString()} / ${bankLimit.toLocaleString()}\``, inline: true },
      { name: 'Net Worth', value: `\`${net.toLocaleString()}\``, inline: true },
      { name: 'Level', value: `\`${levelInfo.level}\``, inline: true },
      { name: 'XP', value: `${progressBar(levelInfo.currentXP, levelInfo.nextLevelXP, 8)}`, inline: true },
      { name: 'Prestige', value: `\`${levelInfo.prestige}\` (${((levelInfo.multiplier - 1) * 100).toFixed(0)}% bonus)`, inline: true },
      { name: 'Stats', value: [
        `Commands: \`${stats.commands_used || 0}\``,
        `Earned: \`${(stats.money_earned || 0).toLocaleString()}\``,
        `Spent: \`${(stats.money_spent || 0).toLocaleString()}\``,
        `Games: \`${stats.games_played || 0}\``
      ].join(' | '), inline: false }
    );

  if (cosmetics.badge) embed.addFields({ name: 'Badge', value: cosmetics.badge, inline: true });
  if (cosmetics.frame) embed.addFields({ name: 'Frame', value: cosmetics.frame, inline: true });
  if (bankTier > 0) embed.addFields({ name: 'Bank Tier', value: `\`${bankTier}\``, inline: true });
  return embed;
}

function inventoryEmbed(user, inventory, itemIndex, page = 0, totalPages = 1, selectedItem = null, collections = null) {
  const embed = base(0xfdcb6e)
    .setAuthor({ name: `${user.username}'s Inventory`, iconURL: user.displayAvatarURL({ size: 128 }) })
    .setFooter({ text: `Page ${page + 1}/${totalPages} | ${inventory.length} visible item types` });

  if (!inventory.length) {
    embed.setDescription('Your inventory is empty.\nUse `/eco shop` to buy items.');
    return embed;
  }

  const lines = inventory.map((row) => {
    const item = itemIndex[row.itemId] || row.item;
    const rarity = item ? (RARITIES[item.rarity]?.emoji || '⬜') : '⬜';
    const quantity = row.quantity ?? row.amount ?? 0;
    const suffix = row.equipped?.length ? ` | equipped: ${row.equipped.join(', ')}` : '';
    const durability = row.minDurability !== null && row.maxDurability ? ` | durability: ${row.minDurability}-${row.maxDurability}/${row.maxDurability}` : '';
    return `${row.selected ? '👉' : '•'} ${rarity} ${(item?.emoji || '📦')} **${item?.name || row.itemId}** x\`${quantity}\`${suffix}${durability}`;
  });

  embed.setDescription(lines.join('\n'));

  if (selectedItem) {
    const item = selectedItem.item;
    const detailLines = [
      item?.description || 'No description available.',
      selectedItem.equipped?.length ? `Equipped in: ${selectedItem.equipped.join(', ')}` : 'Not equipped.',
      selectedItem.instances?.length ? `Instances: \`${selectedItem.instances.length}\`` : null,
      selectedItem.primaryAction ? `Primary action: **${selectedItem.primaryAction.label}**` : null
    ].filter(Boolean);
    embed.addFields({ name: `${item?.emoji || '📦'} ${item?.name || selectedItem.itemId}`, value: detailLines.join('\n') });
  }

  if (collections) {
    const summary = Object.entries(collections)
      .map(([category, data]) => `${category}: \`${data.owned}/${data.possible}\``)
      .join(' | ');
    if (summary) embed.addFields({ name: 'Collections', value: summary });
  }

  return embed;
}

function leaderboardEmbed(type, entries, users) {
  const title = type === 'wallet' ? 'Wallet' : type === 'bank' ? 'Bank' : 'Net Worth';
  const embed = base(0xa29bfe).setTitle(`Economy Leaderboard | ${title}`);
  if (!entries.length) {
    embed.setDescription('No players yet.');
    return embed;
  }
  embed.setDescription(entries.map((row, index) => {
    const user = users.get(row.userId);
    const label = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
    const amount = type === 'wallet' ? row.wallet : type === 'bank' ? row.bank : row.net;
    return `${label} **${user?.username || 'Unknown'}** — \`${Number(amount || 0).toLocaleString()}\``;
  }).join('\n'));
  return embed;
}

function shopPageEmbed(user, category, items, page, totalPages) {
  const embed = base(0x74b9ff)
    .setAuthor({ name: `Shop | ${category.name}`, iconURL: user.displayAvatarURL({ size: 128 }) })
    .setFooter({ text: `Page ${page + 1}/${totalPages}` });

  if (!items.length) {
    embed.setDescription('No items in this category.');
    return embed;
  }

  embed.setDescription(items.map((item) => {
    const rarity = RARITIES[item.rarity] || RARITIES.common;
    const levelText = item.levelReq > 0 ? ` | Lv.${item.levelReq}` : '';
    return `${rarity.emoji} ${item.emoji || '🛒'} **${item.name}** — \`${item.price.toLocaleString()}\`${levelText}\n> ${item.description}`;
  }).join('\n\n'));
  return embed;
}

function questEmbed(user, quests, progress, refreshMs) {
  const embed = base(0xff7675)
    .setAuthor({ name: `${user.username}'s Quests`, iconURL: user.displayAvatarURL({ size: 128 }) });

  if (!quests.length) {
    embed.setDescription('No active quests right now.');
    return embed;
  }

  const lines = quests.map((quest) => {
    const current = Number(progress[quest.key] || 0);
    const done = current >= quest.target;
    return `${done ? '✅' : '•'} **${quest.name}**\n${progressBar(current, quest.target, 8)} (\`${current}/${quest.target}\`)\nReward: \`${quest.Atoms.toLocaleString()}\` Atoms | \`${quest.xp}\` XP`;
  });

  embed.setDescription(lines.join('\n\n'));
  if (refreshMs) embed.addFields({ name: 'Refresh', value: `\`${Math.ceil(refreshMs / 60000)}\` minute(s)` });
  return embed;
}

function adventureEmbed(user, zone, result) {
  return base(result.Atoms > 0 ? 0x00ff88 : 0xe74c3c)
    .setAuthor({ name: `${user.username}'s Adventure`, iconURL: user.displayAvatarURL({ size: 128 }) })
    .setTitle(`${zone.name} | Adventure Complete`)
    .setDescription([
      result.text,
      '',
      `Atoms: \`${result.Atoms >= 0 ? '+' : ''}${result.Atoms.toLocaleString()}\``,
      `XP: \`+${result.xp}\``,
      result.foundRare ? 'You found a rare item.' : null
    ].filter(Boolean).join('\n'));
}

function huntEmbed(user, animal, extraLines = []) {
  const rarity = RARITIES[animal.rarity] || RARITIES.common;
  return base(rarity.color)
    .setAuthor({ name: `${user.username} went hunting`, iconURL: user.displayAvatarURL({ size: 128 }) })
    .setDescription([
      `${animal.emoji} You caught a **${animal.name}**`,
      `Rarity: ${rarity.name}`,
      `Value: \`${animal.value.toLocaleString()}\` Atoms`,
      ...extraLines
    ].join('\n'));
}

function fishEmbed(user, fish, extraLines = []) {
  const rarity = RARITIES[fish.rarity] || RARITIES.common;
  return base(rarity.color)
    .setAuthor({ name: `${user.username} went fishing`, iconURL: user.displayAvatarURL({ size: 128 }) })
    .setDescription([
      `${fish.emoji} You caught a **${fish.name}**`,
      `Rarity: ${rarity.name}`,
      `Value: \`${fish.value.toLocaleString()}\` Atoms`,
      ...extraLines
    ].join('\n'));
}

function levelUpEmbed(user, oldLevel, newLevel, prestige) {
  return base(0xf1c40f)
    .setTitle('Level Up')
    .setDescription([
      `**${user.username}** leveled up.`,
      `\`${oldLevel}\` -> \`${newLevel}\``,
      prestige > 0 ? `Prestige: \`${prestige}\`` : null
    ].filter(Boolean).join('\n'));
}

function errorEmbed(message) {
  return base(0xe74c3c).setDescription(`❌ ${message}`);
}

function successEmbed(message) {
  return base(0x2ecc71).setDescription(`✅ ${message}`);
}

function cooldownEmbed(remaining) {
  const seconds = Math.ceil(remaining / 1000);
  return base(0xe67e22).setDescription(`⏳ You're on cooldown. Try again in **${seconds}s**.`);
}

module.exports = {
  balanceEmbed,
  profileEmbed,
  inventoryEmbed,
  leaderboardEmbed,
  shopPageEmbed,
  questEmbed,
  adventureEmbed,
  huntEmbed,
  fishEmbed,
  levelUpEmbed,
  errorEmbed,
  successEmbed,
  cooldownEmbed
};
