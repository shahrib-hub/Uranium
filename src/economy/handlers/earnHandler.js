const {
  bumpStat,
  addInventoryItem,
  getStats,
  getBalance,
  clearExpiredEffects,
  getActiveEffects,
  updateEffect,
  deleteEffect
} = require('../../utils/economyStorage');
const {
  canUseCooldown,
  setUsedCooldown,
  addWalletSafe,
  updateDailyStreak,
  getActionMultiplier,
  useToolForAction,
  applyCrimeFailureProtection
} = require('../service');
const {
  errorEmbed,
  successEmbed,
  cooldownEmbed,
  questEmbed,
  huntEmbed,
  fishEmbed
} = require('../embeds');
const { questButtons } = require('../components');
const { JOBS, CRIMES, BEG_RESPONSES, SEARCH_LOCATIONS, ANIMALS, FISH, ZONES } = require('../constants');
const { rollRange, rollChance, pickRandom, rollFromTable, rollRandomEvent } = require('../rng');
const { awardActionXP, getUserLevel } = require('../levelSystem');

async function maybeUseEffect(userId, key) {
  await clearExpiredEffects(userId);
  const effects = await getActiveEffects(userId);
  const effect = effects.find((entry) => entry.key === key);
  if (!effect) return null;

  if (effect.usesRemaining !== null && effect.usesRemaining !== undefined) {
    if (effect.usesRemaining <= 1) await deleteEffect(effect.effectId);
    else await updateEffect(effect.effectId, { usesRemaining: effect.usesRemaining - 1 });
  }

  return effect;
}

async function handleRandomEvent(userId, interaction) {
  const event = rollRandomEvent();
  if (!event) return;
  await addWalletSafe(userId, event.Atoms);
  await interaction.followUp({
    content: `${event.text} (${event.Atoms >= 0 ? '+' : ''}${event.Atoms.toLocaleString()} Atoms)`,
    flags: 64
  }).catch(() => {});
}

async function handleLevelUp(result, interaction) {
  if (!result?.leveledUp) return;
  const { levelUpEmbed } = require('../embeds');
  await interaction.followUp({
    embeds: [levelUpEmbed(interaction.user, result.oldLevel, result.newLevel, 0)]
  }).catch(() => {});
}

function formatToolMessage(toolUse) {
  if (!toolUse?.instance) return null;
  if (toolUse.broke) return `Your **${toolUse.item?.name || toolUse.instance.itemId}** broke after that run.`;
  if (toolUse.instance.maxDurability) {
    return `Tool durability: \`${toolUse.instance.durability}/${toolUse.instance.maxDurability}\``;
  }
  return null;
}

async function getRarityOverride(userId, key) {
  const effect = await maybeUseEffect(userId, key);
  return effect?.metadata?.guaranteedRarity || null;
}

module.exports = {
  async daily(interaction) {
    const userId = interaction.user.id;
    const cooldown = await canUseCooldown(userId, 'DAILY');
    if (!cooldown.ok) return interaction.reply({ embeds: [cooldownEmbed(cooldown.remaining)], flags: 64 });

    const streakInfo = await updateDailyStreak(userId);
    const levelInfo = await getUserLevel(userId);
    const actionBoost = await getActionMultiplier(userId, 'daily');
    const dailyEffect = await maybeUseEffect(userId, 'daily');
    const dailyMultiplier = Number(dailyEffect?.metadata?.multiplier || 1);
    const amount = Math.max(
      1,
      Math.floor(rollRange(2000, 3500) * streakInfo.multiplier * levelInfo.multiplier * actionBoost.multiplier * dailyMultiplier)
    );

    await addWalletSafe(userId, amount);
    await setUsedCooldown(userId, 'DAILY');
    await bumpStat(userId, 'daily_claims', 1);
    const xp = await awardActionXP(userId, 'daily');

    const lines = [
      `You claimed your daily and received **\`${amount.toLocaleString()}\`** Atoms.`,
      `Streak: \`${streakInfo.streak}\` day(s) (${streakInfo.multiplier}x).`,
      `+${xp.xpGained} XP`
    ];

    if (dailyMultiplier > 1) lines.push(`Daily Doubler triggered at **${dailyMultiplier}x**.`);

    if (rollChance(0.02)) {
      await addInventoryItem(userId, 'adv_ticket', 1);
      lines.push('You found an **Adventure Ticket**.');
    }

    await interaction.reply({ embeds: [successEmbed(lines.join('\n'))] });
    await handleLevelUp(xp, interaction);
    await handleRandomEvent(userId, interaction);
  },

  async work(interaction) {
    const userId = interaction.user.id;
    const cooldown = await canUseCooldown(userId, 'WORK');
    if (!cooldown.ok) return interaction.reply({ embeds: [cooldownEmbed(cooldown.remaining)], flags: 64 });

    const levelInfo = await getUserLevel(userId);
    const jobs = JOBS.filter((job) => job.lvl <= levelInfo.level);
    const job = pickRandom(jobs.length ? jobs : [JOBS[0]]);
    const actionBoost = await getActionMultiplier(userId, 'work');
    const amount = Math.max(1, Math.floor(rollRange(job.min, job.max) * levelInfo.multiplier * actionBoost.multiplier));

    await addWalletSafe(userId, amount);
    await setUsedCooldown(userId, 'WORK');
    await bumpStat(userId, 'work_used', 1);
    const xp = await awardActionXP(userId, 'work');

    const lines = [
      `${job.emoji} You worked as **${job.name}** and earned **\`${amount.toLocaleString()}\`** Atoms.`,
      `+${xp.xpGained} XP`
    ];

    if (actionBoost.multiplier > 1) lines.push(`Boosts applied: \`${actionBoost.multiplier.toFixed(2)}x\``);
    if (rollChance(0.02)) {
      await addInventoryItem(userId, 'adv_ticket', 1);
      lines.push('You found an **Adventure Ticket** on the job.');
    }

    await interaction.reply({ embeds: [successEmbed(lines.join('\n'))] });
    await handleLevelUp(xp, interaction);
    await handleRandomEvent(userId, interaction);
  },

  async crime(interaction) {
    const userId = interaction.user.id;
    const cooldown = await canUseCooldown(userId, 'CRIME');
    if (!cooldown.ok) return interaction.reply({ embeds: [cooldownEmbed(cooldown.remaining)], flags: 64 });

    const levelInfo = await getUserLevel(userId);
    const crimes = CRIMES.filter((entry) => entry.lvl <= levelInfo.level);
    const crime = pickRandom(crimes.length ? crimes : [CRIMES[0]]);
    const actionBoost = await getActionMultiplier(userId, 'crime');
    await setUsedCooldown(userId, 'CRIME');
    await bumpStat(userId, 'crime_used', 1);

    if (rollChance(crime.chance)) {
      const gain = Math.max(1, Math.floor(rollRange(crime.min, crime.max) * levelInfo.multiplier * actionBoost.multiplier));
      await addWalletSafe(userId, gain);
      await bumpStat(userId, 'crime_success', 1);
      const xp = await awardActionXP(userId, 'crime_success');
      const lines = [
        `${crime.emoji} **${crime.name}** succeeded.`,
        `You earned **\`${gain.toLocaleString()}\`** Atoms.`,
        `+${xp.xpGained} XP`
      ];
      if (actionBoost.multiplier > 1) lines.push(`Boosts applied: \`${actionBoost.multiplier.toFixed(2)}x\``);
      await interaction.reply({ embeds: [successEmbed(lines.join('\n'))] });
      return handleLevelUp(xp, interaction);
    }

    const fineBase = rollRange(crime.fine[0], crime.fine[1]);
    const reducedFine = await applyCrimeFailureProtection(userId, fineBase);
    const balance = await getBalance(userId);
    const loss = Math.min(balance.wallet, reducedFine);
    await addWalletSafe(userId, -loss);
    await bumpStat(userId, 'crime_fail', 1);
    const xp = await awardActionXP(userId, 'crime_fail');
    await interaction.reply({
      embeds: [errorEmbed(`${crime.emoji} **${crime.name}** failed.\nYou paid **\`${loss.toLocaleString()}\`** Atoms in fines.\n+${xp.xpGained} XP`)]
    });
    await handleLevelUp(xp, interaction);
  },

  async beg(interaction) {
    const userId = interaction.user.id;
    const cooldown = await canUseCooldown(userId, 'BEG');
    if (!cooldown.ok) return interaction.reply({ embeds: [cooldownEmbed(cooldown.remaining)], flags: 64 });

    let roll = Math.random();
    let response = BEG_RESPONSES[BEG_RESPONSES.length - 1];
    for (const entry of BEG_RESPONSES) {
      roll -= entry.chance;
      if (roll <= 0) {
        response = entry;
        break;
      }
    }

    const actionBoost = await getActionMultiplier(userId, 'beg');
    const amount = Math.max(0, Math.floor(rollRange(response.min, response.max) * actionBoost.multiplier));
    if (amount > 0) await addWalletSafe(userId, amount);
    await setUsedCooldown(userId, 'BEG');
    await bumpStat(userId, 'beg_used', 1);
    const xp = await awardActionXP(userId, 'beg');

    const text = amount > 0
      ? `${response.text}\n+\`${amount.toLocaleString()}\` Atoms | +${xp.xpGained} XP`
      : `${response.text}\n+${xp.xpGained} XP`;
    await interaction.reply({ embeds: [amount > 0 ? successEmbed(text) : errorEmbed(text)] });
    await handleLevelUp(xp, interaction);
  },

  async search(interaction) {
    const userId = interaction.user.id;
    const cooldown = await canUseCooldown(userId, 'SEARCH');
    if (!cooldown.ok) return interaction.reply({ embeds: [cooldownEmbed(cooldown.remaining)], flags: 64 });

    const location = pickRandom(SEARCH_LOCATIONS);
    const actionBoost = await getActionMultiplier(userId, 'search');
    const toolUse = await useToolForAction(userId, 'SEARCH');
    if (!toolUse.ok) return interaction.reply({ embeds: [errorEmbed(toolUse.reason)], flags: 64 });

    const amount = Math.max(
      1,
      Math.floor(rollRange(location.min, location.max) * actionBoost.multiplier * (toolUse.bonusMultiplier || 1))
    );
    await addWalletSafe(userId, amount);
    await setUsedCooldown(userId, 'SEARCH');
    await bumpStat(userId, 'search_used', 1);
    const xp = await awardActionXP(userId, 'search');

    const lines = [
      `${location.emoji} You searched **${location.name}** and found **\`${amount.toLocaleString()}\`** Atoms.`,
      `+${xp.xpGained} XP`
    ];
    const toolText = formatToolMessage(toolUse);
    if (toolText) lines.push(toolText);

    await interaction.reply({ embeds: [successEmbed(lines.join('\n'))] });
    await handleLevelUp(xp, interaction);
    await handleRandomEvent(userId, interaction);
  },

  async hunt(interaction) {
    const userId = interaction.user.id;
    const cooldown = await canUseCooldown(userId, 'HUNT');
    if (!cooldown.ok) return interaction.reply({ embeds: [cooldownEmbed(cooldown.remaining)], flags: 64 });

    const toolUse = await useToolForAction(userId, 'HUNT', { required: true });
    if (!toolUse.ok) return interaction.reply({ embeds: [errorEmbed(toolUse.reason)], flags: 64 });

    const forcedRarity = await getRarityOverride(userId, 'hunt_rarity');
    const animal = rollFromTable(ANIMALS, forcedRarity);
    const actionBoost = await getActionMultiplier(userId, 'hunt');
    const amount = Math.max(1, Math.floor(animal.value * actionBoost.multiplier * (toolUse.bonusMultiplier || 1)));
    await addWalletSafe(userId, amount);
    await setUsedCooldown(userId, 'HUNT');
    await bumpStat(userId, 'hunt_used', 1);
    const xp = await awardActionXP(userId, 'hunt');

    const extraLines = [`Final value: \`${amount.toLocaleString()}\` Atoms`, `+${xp.xpGained} XP`];
    const toolText = formatToolMessage(toolUse);
    if (forcedRarity) extraLines.push(`Guaranteed rarity consumed: **${forcedRarity}**.`);
    if (toolText) extraLines.push(toolText);

    await interaction.reply({ embeds: [huntEmbed(interaction.user, { ...animal, value: amount }, extraLines)] });
    await handleLevelUp(xp, interaction);
  },

  async fish(interaction) {
    const userId = interaction.user.id;
    const cooldown = await canUseCooldown(userId, 'FISH');
    if (!cooldown.ok) return interaction.reply({ embeds: [cooldownEmbed(cooldown.remaining)], flags: 64 });

    const toolUse = await useToolForAction(userId, 'FISH', { required: true });
    if (!toolUse.ok) return interaction.reply({ embeds: [errorEmbed(toolUse.reason)], flags: 64 });

    const forcedRarity = await getRarityOverride(userId, 'fish_rarity');
    const caught = rollFromTable(FISH, forcedRarity);
    const actionBoost = await getActionMultiplier(userId, 'fish');
    const amount = Math.max(1, Math.floor(caught.value * actionBoost.multiplier * (toolUse.bonusMultiplier || 1)));
    await addWalletSafe(userId, amount);
    await setUsedCooldown(userId, 'FISH');
    await bumpStat(userId, 'fish_used', 1);
    const xp = await awardActionXP(userId, 'fish');

    const extraLines = [`Final value: \`${amount.toLocaleString()}\` Atoms`, `+${xp.xpGained} XP`];
    const toolText = formatToolMessage(toolUse);
    if (forcedRarity) extraLines.push(`Guaranteed rarity consumed: **${forcedRarity}**.`);
    if (toolText) extraLines.push(toolText);

    await interaction.reply({ embeds: [fishEmbed(interaction.user, { ...caught, value: amount }, extraLines)] });
    await handleLevelUp(xp, interaction);
  },

  async quest(interaction) {
    const userId = interaction.user.id;
    const { getActiveQuests, getQuestRefreshTime } = require('../questEngine');
    const [stats, active, refreshMs] = await Promise.all([
      getStats(userId),
      getActiveQuests(userId),
      getQuestRefreshTime(userId)
    ]);
    return interaction.reply({
      embeds: [questEmbed(interaction.user, active, stats, refreshMs)],
      components: [questButtons()],
      flags: 64
    });
  },

  async adventure(interaction) {
    const userId = interaction.user.id;
    const cooldown = await canUseCooldown(userId, 'ADVENTURE');
    if (!cooldown.ok) return interaction.reply({ embeds: [cooldownEmbed(cooldown.remaining)], flags: 64 });

    const { adventureZoneSelect } = require('../components');
    const levelInfo = await getUserLevel(userId);
    return interaction.reply({
      content: 'Choose your adventure zone:',
      components: [adventureZoneSelect(levelInfo.level)],
      flags: 64
    });
  },

  async explore(interaction) {
    const userId = interaction.user.id;
    const cooldown = await canUseCooldown(userId, 'EXPLORE');
    if (!cooldown.ok) return interaction.reply({ embeds: [cooldownEmbed(cooldown.remaining)], flags: 64 });

    const location = pickRandom(SEARCH_LOCATIONS);
    const actionBoost = await getActionMultiplier(userId, 'explore');
    const toolUse = await useToolForAction(userId, 'EXPLORE');
    if (!toolUse.ok) return interaction.reply({ embeds: [errorEmbed(toolUse.reason)], flags: 64 });

    const amount = Math.max(
      1,
      Math.floor(rollRange(location.min * 2, location.max * 2) * actionBoost.multiplier * (toolUse.bonusMultiplier || 1))
    );
    const foundItem = rollChance(0.1);
    await addWalletSafe(userId, amount);
    await setUsedCooldown(userId, 'EXPLORE');
    await bumpStat(userId, 'explore_used', 1);
    const xp = await awardActionXP(userId, 'explore');

    const lines = [
      `${location.emoji} You explored **${location.name}** and found **\`${amount.toLocaleString()}\`** Atoms.`,
      `+${xp.xpGained} XP`
    ];

    if (foundItem) {
      await addInventoryItem(userId, 'crate_common', 1);
      lines.push('You also found a **Common Crate**.');
    }
    if (rollChance(0.02)) {
      await addInventoryItem(userId, 'adv_ticket', 1);
      lines.push('You found an **Adventure Ticket** hidden in the dirt.');
    }

    const toolText = formatToolMessage(toolUse);
    if (toolText) lines.push(toolText);

    await interaction.reply({ embeds: [successEmbed(lines.join('\n'))] });
    await handleLevelUp(xp, interaction);
  }
};
