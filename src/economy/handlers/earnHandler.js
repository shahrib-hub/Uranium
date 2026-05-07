// src/economy/handlers/earnHandler.js
const { getBalance, bumpStat, getInventory, consumeInventoryItem } = require('../../utils/economyStorage');
const { canUseCooldown, setUsedCooldown, addWalletSafe, updateDailyStreak, getDailyStreak, formatMs } = require('../helpers');
const { errorEmbed, successEmbed, cooldownEmbed, questEmbed, huntEmbed, fishEmbed } = require('../embeds');
const { questButtons } = require('../components');
const { JOBS, CRIMES, BEG_RESPONSES, SEARCH_LOCATIONS, ANIMALS, FISH, QUEST_TEMPLATES, ZONES } = require('../constants');
const { rollRange, rollChance, pickRandom, rollFromTable, rollRandomEvent, rollAdventure } = require('../rng');
const { awardActionXP, getUserLevel } = require('../levelSystem');
const { findItem } = require('../items');

async function handleRandomEvent(userId, interaction) {
  const evt = rollRandomEvent();
  if (evt) {
    await addWalletSafe(userId, evt.coins);
    await interaction.followUp({ content: evt.text + ` (${evt.coins >= 0 ? '+' : ''}${evt.Atoms.toLocaleString()} Atoms)`, flags: 64 }).catch(() => {});
  }
}

async function handleLevelUp(result, interaction) {
  if (result.leveledUp) {
    const { levelUpEmbed } = require('../embeds');
    await interaction.followUp({ embeds: [levelUpEmbed(interaction.user, result.oldLevel, result.newLevel, 0)] }).catch(() => {});
  }
}

module.exports = {
  async daily(interaction) {
    const userId = interaction.user.id;
    const now = Date.now();
    const cd = await canUseCooldown(userId, 'DAILY', now);
    if (!cd.ok) return interaction.reply({ embeds: [cooldownEmbed(cd.remaining)], flags: 64 });

    let amount = rollRange(2000, 3500);
    const streakInfo = await updateDailyStreak(userId);
    amount = Math.floor(amount * streakInfo.multiplier);

    await addWalletSafe(userId, amount);
    await setUsedCooldown(userId, 'DAILY', now);
    await bumpStat(userId, 'daily_claims', 1);
    const xp = await awardActionXP(userId, 'daily');

    const lines = [
      `⚛️ You claimed your daily and received **\`${amount.toLocaleString()}\`** Atoms!`,
      `🔥 **Streak:** \`${streakInfo.streak}\` days (${streakInfo.multiplier}x bonus)`,
      `🧪 **+${xp.xpGained} XP**`
    ];

    if (rollChance(0.02)) {
      const { addInventoryItem } = require('../../utils/economyStorage');
      await addInventoryItem(userId, 'adv_ticket', 1);
      lines.push('🎫 **WOW! You found a rare Adventure Ticket!**');
    }

    await interaction.reply({ embeds: [successEmbed(lines.join('\n'))] });
    await handleLevelUp(xp, interaction);
    await handleRandomEvent(userId, interaction);
  },

  async work(interaction) {
    const userId = interaction.user.id;
    const cd = await canUseCooldown(userId, 'WORK');
    if (!cd.ok) return interaction.reply({ embeds: [cooldownEmbed(cd.remaining)], flags: 64 });

    const lvl = await getUserLevel(userId);
    const available = JOBS.filter(j => j.lvl <= lvl.level);
    const job = pickRandom(available.length ? available : [JOBS[0]]);
    let amount = rollRange(job.min, job.max);
    amount = Math.floor(amount * lvl.multiplier);

    await addWalletSafe(userId, amount);
    await setUsedCooldown(userId, 'WORK');
    await bumpStat(userId, 'work_used', 1);
    const xp = await awardActionXP(userId, 'work');

    let text = `${job.emoji} You worked as a **${job.name}** and earned **\`${amount.toLocaleString()}\`** Atoms!\n🧪 **+${xp.xpGained} XP**`;
    
    if (rollChance(0.02)) {
      const { addInventoryItem } = require('../../utils/economyStorage');
      await addInventoryItem(userId, 'adv_ticket', 1);
      text += '\n🎫 **WOW! You found a rare Adventure Ticket on the job!**';
    }

    await interaction.reply({ embeds: [successEmbed(text)] });
    await handleLevelUp(xp, interaction);
    await handleRandomEvent(userId, interaction);
  },

  async crime(interaction) {
    const userId = interaction.user.id;
    const cd = await canUseCooldown(userId, 'CRIME');
    if (!cd.ok) return interaction.reply({ embeds: [cooldownEmbed(cd.remaining)], flags: 64 });

    const lvl = await getUserLevel(userId);
    const available = CRIMES.filter(c => c.lvl <= lvl.level);
    const crime = pickRandom(available.length ? available : [CRIMES[0]]);
    await setUsedCooldown(userId, 'CRIME');

    if (rollChance(crime.chance)) {
      let gain = rollRange(crime.min, crime.max);
      gain = Math.floor(gain * lvl.multiplier);
      await addWalletSafe(userId, gain);
      await bumpStat(userId, 'crime_success', 1);
      await bumpStat(userId, 'crime_used', 1);
      const xp = await awardActionXP(userId, 'crime_success');
      await interaction.reply({ embeds: [successEmbed(`${crime.emoji} **${crime.name}** successful!\nYou earned **\`${gain.toLocaleString()}\`** Atoms! 🧪 +${xp.xpGained} XP`)] });
      await handleLevelUp(xp, interaction);
    } else {
      const fine = rollRange(crime.fine[0], crime.fine[1]);
      const bal = await getBalance(userId);
      const loss = Math.min(bal.wallet, fine);
      await addWalletSafe(userId, -loss);
      await bumpStat(userId, 'crime_fail', 1);
      await bumpStat(userId, 'crime_used', 1);
      await awardActionXP(userId, 'crime_fail');
      await interaction.reply({ embeds: [errorEmbed(`${crime.emoji} **${crime.name}** failed!\nYou paid a fine of **\`${loss.toLocaleString()}\`** Atoms.`)] });
    }
  },

  async beg(interaction) {
    const userId = interaction.user.id;
    const cd = await canUseCooldown(userId, 'BEG');
    if (!cd.ok) return interaction.reply({ embeds: [cooldownEmbed(cd.remaining)], flags: 64 });

    // Weighted selection
    let roll = Math.random();
    let response = BEG_RESPONSES[BEG_RESPONSES.length - 1];
    for (const r of BEG_RESPONSES) { roll -= r.chance; if (roll <= 0) { response = r; break; } }

    const amount = rollRange(response.min, response.max);
    if (amount > 0) await addWalletSafe(userId, amount);
    await setUsedCooldown(userId, 'BEG');
    await bumpStat(userId, 'beg_used', 1);
    const xp = await awardActionXP(userId, 'beg');

    const text = amount > 0 ? `🙏 ${response.text}\n⚛️ **+\`${amount.toLocaleString()}\`** Atoms • 🧪 +${xp.xpGained} XP` : `🙏 ${response.text}`;
    await interaction.reply({ embeds: [amount > 0 ? successEmbed(text) : errorEmbed(text)] });
    await handleLevelUp(xp, interaction);
  },

  async search(interaction) {
    const userId = interaction.user.id;
    const cd = await canUseCooldown(userId, 'SEARCH');
    if (!cd.ok) return interaction.reply({ embeds: [cooldownEmbed(cd.remaining)], flags: 64 });

    const loc = pickRandom(SEARCH_LOCATIONS);
    const amount = rollRange(loc.min, loc.max);
    await addWalletSafe(userId, amount);
    await setUsedCooldown(userId, 'SEARCH');
    await bumpStat(userId, 'search_used', 1);
    const xp = await awardActionXP(userId, 'search');

    await interaction.reply({ embeds: [successEmbed(`${loc.emoji} You searched the **${loc.name}** and found **\`${amount.toLocaleString()}\`** Atoms!\n🧪 +${xp.xpGained} XP`)] });
    await handleLevelUp(xp, interaction);
    await handleRandomEvent(userId, interaction);
  },

  async hunt(interaction) {
    const userId = interaction.user.id;
    const cd = await canUseCooldown(userId, 'HUNT');
    if (!cd.ok) return interaction.reply({ embeds: [cooldownEmbed(cd.remaining)], flags: 64 });

    const animal = rollFromTable(ANIMALS);
    await addWalletSafe(userId, animal.value);
    await setUsedCooldown(userId, 'HUNT');
    await bumpStat(userId, 'hunt_used', 1);
    const xp = await awardActionXP(userId, 'hunt');

    await interaction.reply({ embeds: [huntEmbed(interaction.user, animal)] });
    await handleLevelUp(xp, interaction);
  },

  async fish(interaction) {
    const userId = interaction.user.id;
    const cd = await canUseCooldown(userId, 'FISH');
    if (!cd.ok) return interaction.reply({ embeds: [cooldownEmbed(cd.remaining)], flags: 64 });

    const caught = rollFromTable(FISH);
    await addWalletSafe(userId, caught.value);
    await setUsedCooldown(userId, 'FISH');
    await bumpStat(userId, 'fish_used', 1);
    const xp = await awardActionXP(userId, 'fish');

    await interaction.reply({ embeds: [fishEmbed(interaction.user, caught)] });
    await handleLevelUp(xp, interaction);
  },

  async quest(interaction) {
    const userId = interaction.user.id;
    const { getStats } = require('../../utils/economyStorage');
    const { getActiveQuests, getQuestRefreshTime } = require('../questEngine');
    
    const stats = await getStats(userId);
    const active = await getActiveQuests(userId);
    const refreshMs = await getQuestRefreshTime(userId);
    
    const embed = questEmbed(interaction.user, active, stats, refreshMs);
    const row = questButtons();
    return interaction.reply({ embeds: [embed], components: [row], flags: 64 });
  },

  async adventure(interaction) {
    const userId = interaction.user.id;
    const cd = await canUseCooldown(userId, 'ADVENTURE');
    if (!cd.ok) return interaction.reply({ embeds: [cooldownEmbed(cd.remaining)], flags: 64 });

    const { adventureZoneSelect } = require('../components');
    const lvl = await getUserLevel(userId);
    const row = adventureZoneSelect(lvl.level);
    return interaction.reply({ content: '🗺️ **Choose your adventure zone:**', components: [row], flags: 64 });
  },

  async explore(interaction) {
    const userId = interaction.user.id;
    const cd = await canUseCooldown(userId, 'EXPLORE');
    if (!cd.ok) return interaction.reply({ embeds: [cooldownEmbed(cd.remaining)], flags: 64 });

    const loc = pickRandom(SEARCH_LOCATIONS);
    const Atoms = rollRange(loc.min * 2, loc.max * 2);
    const foundItem = rollChance(0.10);
    await addWalletSafe(userId, Atoms);
    await setUsedCooldown(userId, 'EXPLORE');
    await bumpStat(userId, 'explore_used', 1);
    const xp = await awardActionXP(userId, 'explore');

    let text = `${loc.emoji} You explored the **${loc.name}** and found **\`${Atoms.toLocaleString()}\`** Atoms!\n🧪 +${xp.xpGained} XP`;
    if (foundItem) text += '\n🎁 You also found a **Common Crate**!';
    if (foundItem) { const { addInventoryItem } = require('../../utils/economyStorage'); await addInventoryItem(userId, 'crate_common', 1); }

    if (rollChance(0.02)) {
      const { addInventoryItem } = require('../../utils/economyStorage');
      await addInventoryItem(userId, 'adv_ticket', 1);
      text += '\n🎫 **WOW! You found a rare Adventure Ticket hidden in the dirt!**';
    }

    await interaction.reply({ embeds: [successEmbed(text)] });
    await handleLevelUp(xp, interaction);
  }
};
