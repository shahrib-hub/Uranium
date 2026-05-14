const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const wait = require('node:timers/promises').setTimeout;
const { addWalletSafe, canUseCooldown, setUsedCooldown } = require('../helpers');
const { bumpStat, getBalance } = require('../../utils/economyStorage');
const { errorEmbed, cooldownEmbed } = require('../embeds');
const { awardActionXP, getUserLevel } = require('../levelSystem');
const { rollRange, rollChance, pickRandom, weightedRandom } = require('../rng');
const { getActionMultiplier, useToolForAction } = require('../service');
const {
  MINE_ORES,
  MINE_EVENTS,
  HACK_TARGETS,
  HACK_STEPS,
  DUEL_NPCS,
  HEIST_STAGES,
  HEIST_TARGETS,
  SCAVENGE_AREAS,
  SCAVENGE_VALUES,
  REACTOR_FUELS,
  BOUNTY_TARGETS,
  DIG_LAYERS
} = require('../constants');

const activeDuels = new Map();
const activeHeists = new Map();

function toolNote(toolUse) {
  if (!toolUse?.instance) return null;
  if (toolUse.broke) return `Tool broke: **${toolUse.item?.name || toolUse.instance.itemId}**`;
  if (toolUse.instance.maxDurability) {
    return `Tool durability: \`${toolUse.instance.durability}/${toolUse.instance.maxDurability}\``;
  }
  return null;
}

async function maybeLevelUp(interaction, xp) {
  if (!xp?.leveledUp) return;
  const { levelUpEmbed } = require('../embeds');
  await interaction.followUp({ embeds: [levelUpEmbed(interaction.user, xp.oldLevel, xp.newLevel, 0)] }).catch(() => {});
}

async function mine(interaction) {
  const userId = interaction.user.id;
  const cooldown = await canUseCooldown(userId, 'MINE');
  if (!cooldown.ok) return interaction.reply({ embeds: [cooldownEmbed(cooldown.remaining)], flags: 64 });

  const toolUse = await useToolForAction(userId, 'MINE', { required: true });
  if (!toolUse.ok) return interaction.reply({ embeds: [errorEmbed(toolUse.reason)], flags: 64 });

  await interaction.deferReply();
  await setUsedCooldown(userId, 'MINE');
  const actionBoost = await getActionMultiplier(userId, 'mine');

  const swings = rollRange(3, 5);
  const event = pickRandom(MINE_EVENTS);
  let totalValue = 0;
  const found = [];

  for (let i = 0; i < swings; i += 1) {
    const ore = weightedRandom(MINE_ORES);
    const value = Math.floor(ore.value * event.mult * actionBoost.multiplier * (toolUse.bonusMultiplier || 1));
    totalValue += value;
    found.push(`${ore.emoji} **${ore.name}** - \`${value.toLocaleString()}\` Atoms`);
  }

  await addWalletSafe(userId, totalValue);
  await bumpStat(userId, 'mine_used', 1);
  const xp = await awardActionXP(userId, 'mine');

  const embed = new EmbedBuilder()
    .setColor(event.mult >= 1.5 ? 0xf1c40f : event.mult < 1 ? 0xe74c3c : 0x3498db)
    .setAuthor({ name: `${interaction.user.username}'s Mining Trip`, iconURL: interaction.user.displayAvatarURL() })
    .setTitle('Mining Results')
    .setDescription([
      `Event: ${event.text}`,
      `Multiplier: \`${event.mult}x\``,
      '',
      ...found,
      '',
      `Total: \`${totalValue.toLocaleString()}\` Atoms`,
      `XP: +${xp.xpGained}`,
      toolNote(toolUse)
    ].filter(Boolean).join('\n'));

  await interaction.editReply({ embeds: [embed] });
  await maybeLevelUp(interaction, xp);
}

async function hack(interaction) {
  const userId = interaction.user.id;
  const cooldown = await canUseCooldown(userId, 'HACK');
  if (!cooldown.ok) return interaction.reply({ embeds: [cooldownEmbed(cooldown.remaining)], flags: 64 });

  const levelInfo = await getUserLevel(userId);
  const available = HACK_TARGETS.filter((target) => target.lvl <= levelInfo.level);
  const target = pickRandom(available.length ? available : [HACK_TARGETS[0]]);
  const actionBoost = await getActionMultiplier(userId, 'hack');

  await interaction.deferReply();
  await setUsedCooldown(userId, 'HACK');

  const steps = HACK_STEPS.slice(0, rollRange(3, 5));
  const successChance = Math.max(0.3, 0.85 - (target.diff * 0.07));
  const succeeded = rollChance(successChance);
  const statusLines = steps.map((step, index) => {
    if (index < steps.length - 1 || succeeded) return `\`[OK]\` ${step}`;
    return `\`[!!]\` ${step} **DETECTED**`;
  });

  if (succeeded) {
    const reward = Math.floor(rollRange(target.min, target.max) * levelInfo.multiplier * actionBoost.multiplier);
    await addWalletSafe(userId, reward);
    await bumpStat(userId, 'hack_used', 1);
    const xp = await awardActionXP(userId, 'hack');

    const embed = new EmbedBuilder()
      .setColor(0x00ff88)
      .setAuthor({ name: `${interaction.user.username}'s Hack`, iconURL: interaction.user.displayAvatarURL() })
      .setTitle(`Hacked: ${target.emoji} ${target.name}`)
      .setDescription([
        ...statusLines,
        '',
        `Reward: \`${reward.toLocaleString()}\` Atoms`,
        `XP: +${xp.xpGained}`
      ].join('\n'));
    await interaction.editReply({ embeds: [embed] });
    return maybeLevelUp(interaction, xp);
  }

  const fine = rollRange(100, 500);
  const balance = await getBalance(userId);
  const loss = Math.min(balance.wallet, fine);
  await addWalletSafe(userId, -loss);
  await bumpStat(userId, 'hack_used', 1);
  const xp = await awardActionXP(userId, 'hack');

  const embed = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setAuthor({ name: `${interaction.user.username}'s Hack`, iconURL: interaction.user.displayAvatarURL() })
    .setTitle(`Failed Hack: ${target.emoji} ${target.name}`)
    .setDescription([
      ...statusLines,
      '',
      `Loss: \`${loss.toLocaleString()}\` Atoms`,
      `XP: +${xp.xpGained}`
    ].join('\n'));
  await interaction.editReply({ embeds: [embed] });
  await maybeLevelUp(interaction, xp);
}

async function duel(interaction) {
  const userId = interaction.user.id;
  const cooldown = await canUseCooldown(userId, 'DUEL');
  if (!cooldown.ok) return interaction.reply({ embeds: [cooldownEmbed(cooldown.remaining)], flags: 64 });
  if (activeDuels.has(userId)) return interaction.reply({ embeds: [errorEmbed('You are already in a duel.')], flags: 64 });

  const levelInfo = await getUserLevel(userId);
  const available = DUEL_NPCS.filter((npc) => npc.lvl <= levelInfo.level);
  const npc = pickRandom(available.length ? available : [DUEL_NPCS[0]]);
  await setUsedCooldown(userId, 'DUEL');

  const playerHp = 100 + (levelInfo.level * 2);
  activeDuels.set(userId, {
    npc: { ...npc, currentHp: npc.hp },
    player: { hp: playerHp, maxHp: playerHp, atk: [10 + levelInfo.level, 20 + (levelInfo.level * 2)] },
    turns: 0
  });

  const embed = buildDuelEmbed(interaction.user, activeDuels.get(userId));
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('eco:duel:attack').setLabel('Attack').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('eco:duel:defend').setLabel('Defend').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('eco:duel:special').setLabel('Power Strike').setStyle(ButtonStyle.Success)
  );
  await interaction.reply({ embeds: [embed], components: [row] });
}

function hpBar(current, max) {
  const pct = Math.max(0, current / max);
  const filled = Math.round(pct * 10);
  return '🟩'.repeat(filled) + '⬛'.repeat(10 - filled);
}

function buildDuelEmbed(user, state) {
  return new EmbedBuilder()
    .setColor(0xff6b6b)
    .setAuthor({ name: `${user.username} vs ${state.npc.emoji} ${state.npc.name}`, iconURL: user.displayAvatarURL() })
    .setTitle(`Duel - Turn ${state.turns + 1}`)
    .setDescription([
      `You ${hpBar(state.player.hp, state.player.maxHp)} \`${Math.max(0, state.player.hp)}/${state.player.maxHp}\` HP`,
      `${state.npc.name} ${hpBar(state.npc.currentHp, state.npc.hp)} \`${Math.max(0, state.npc.currentHp)}/${state.npc.hp}\` HP`,
      '',
      state.log || 'Choose your action.'
    ].join('\n'));
}

async function heist(interaction) {
  const userId = interaction.user.id;
  const cooldown = await canUseCooldown(userId, 'HEIST');
  if (!cooldown.ok) return interaction.reply({ embeds: [cooldownEmbed(cooldown.remaining)], flags: 64 });
  if (activeHeists.has(userId)) return interaction.reply({ embeds: [errorEmbed('You are already doing a heist.')], flags: 64 });

  const levelInfo = await getUserLevel(userId);
  const available = HEIST_TARGETS.filter((target) => target.lvl <= levelInfo.level);
  const target = pickRandom(available.length ? available : [HEIST_TARGETS[0]]);
  await setUsedCooldown(userId, 'HEIST');

  activeHeists.set(userId, { target, stage: 0, lootMult: 1 });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('eco:heist:proceed').setLabel('Proceed').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('eco:heist:abort').setLabel('Abort').setStyle(ButtonStyle.Danger)
  );
  await interaction.reply({ embeds: [buildHeistEmbed(interaction.user, activeHeists.get(userId))], components: [row] });
}

function buildHeistEmbed(user, state) {
  const stage = HEIST_STAGES[state.stage] || HEIST_STAGES[0];
  const progress = HEIST_STAGES.map((entry, index) => {
    if (index < state.stage) return `Done: ${entry.name}`;
    if (index === state.stage) return `Now: **${entry.name}** - ${entry.desc}`;
    return `Later: ${entry.name}`;
  });
  return new EmbedBuilder()
    .setColor(0x9b59b6)
    .setAuthor({ name: `${user.username}'s Heist`, iconURL: user.displayAvatarURL() })
    .setTitle(`Heist: ${state.target.emoji} ${state.target.name}`)
    .setDescription([
      `Stage ${state.stage + 1}/${HEIST_STAGES.length}`,
      '',
      ...progress,
      '',
      `Success Rate: \`${Math.round(stage.successRate * 100)}%\``,
      `Loot Multiplier: \`${state.lootMult.toFixed(1)}x\``
    ].join('\n'));
}

async function scavenge(interaction) {
  const userId = interaction.user.id;
  const cooldown = await canUseCooldown(userId, 'SCAVENGE');
  if (!cooldown.ok) return interaction.reply({ embeds: [cooldownEmbed(cooldown.remaining)], flags: 64 });

  await interaction.deferReply();
  await setUsedCooldown(userId, 'SCAVENGE');
  const actionBoost = await getActionMultiplier(userId, 'scavenge');

  const area = pickRandom(SCAVENGE_AREAS);
  const finds = rollRange(1, 3);
  let totalValue = 0;
  const lines = [];

  for (let i = 0; i < finds; i += 1) {
    const id = pickRandom(area.finds);
    const item = SCAVENGE_VALUES[id];
    if (!item) continue;
    const value = Math.floor(item.value * (0.7 + Math.random() * 0.6) * actionBoost.multiplier);
    totalValue += value;
    lines.push(`${item.emoji} **${item.name}** - \`${value.toLocaleString()}\` Atoms`);
  }

  await addWalletSafe(userId, totalValue);
  await bumpStat(userId, 'scavenge_used', 1);
  const xp = await awardActionXP(userId, 'scavenge');

  const embed = new EmbedBuilder()
    .setColor(0xe67e22)
    .setAuthor({ name: `${interaction.user.username}'s Scavenge`, iconURL: interaction.user.displayAvatarURL() })
    .setTitle(`Scavenged: ${area.emoji} ${area.name}`)
    .setDescription([
      ...lines,
      '',
      `Total: \`${totalValue.toLocaleString()}\` Atoms`,
      `XP: +${xp.xpGained}`
    ].join('\n'));
  await interaction.editReply({ embeds: [embed] });
  await maybeLevelUp(interaction, xp);
}

async function reactor(interaction) {
  const userId = interaction.user.id;
  const cooldown = await canUseCooldown(userId, 'REACTOR');
  if (!cooldown.ok) return interaction.reply({ embeds: [cooldownEmbed(cooldown.remaining)], flags: 64 });

  await interaction.deferReply();
  await setUsedCooldown(userId, 'REACTOR');
  const actionBoost = await getActionMultiplier(userId, 'reactor');

  const fuel = pickRandom(REACTOR_FUELS);
  const cycles = rollRange(3, 6);
  let totalOutput = 0;
  let meltdown = false;
  const log = [];

  for (let i = 0; i < cycles; i += 1) {
    if (rollChance(fuel.meltdownRisk)) {
      meltdown = true;
      log.push(`Cycle ${i + 1}: MELTDOWN`);
      break;
    }
    const output = Math.floor(rollRange(fuel.baseOutput[0], fuel.baseOutput[1]) * actionBoost.multiplier);
    totalOutput += output;
    log.push(`Cycle ${i + 1}: \`${output.toLocaleString()}\` Atoms`);
  }

  if (meltdown) totalOutput = Math.floor(totalOutput * 0.3);

  await addWalletSafe(userId, totalOutput);
  await bumpStat(userId, 'reactor_used', 1);
  const xp = await awardActionXP(userId, 'reactor');

  const embed = new EmbedBuilder()
    .setColor(meltdown ? 0xe74c3c : 0x00ff88)
    .setAuthor({ name: `${interaction.user.username}'s Reactor`, iconURL: interaction.user.displayAvatarURL() })
    .setTitle(`Reactor Run - ${fuel.name}`)
    .setDescription([
      ...log,
      '',
      `Total Output: \`${totalOutput.toLocaleString()}\` Atoms`,
      `XP: +${xp.xpGained}`
    ].join('\n'));
  await interaction.editReply({ embeds: [embed] });
  await maybeLevelUp(interaction, xp);
}

async function bounty(interaction) {
  const userId = interaction.user.id;
  const cooldown = await canUseCooldown(userId, 'BOUNTY');
  if (!cooldown.ok) return interaction.reply({ embeds: [cooldownEmbed(cooldown.remaining)], flags: 64 });

  await interaction.deferReply();
  await setUsedCooldown(userId, 'BOUNTY');
  const actionBoost = await getActionMultiplier(userId, 'bounty');

  const target = pickRandom(BOUNTY_TARGETS);
  const escaped = rollChance(target.escapeChance);

  await bumpStat(userId, 'bounty_used', 1);
  const xp = await awardActionXP(userId, 'bounty');

  if (escaped) {
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle(`Bounty Escaped: ${target.emoji} ${target.name}`)
          .setDescription(`No reward this time.\nXP: +${xp.xpGained}`)
      ]
    });
    return maybeLevelUp(interaction, xp);
  }

  const reward = Math.floor(rollRange(target.reward[0], target.reward[1]) * actionBoost.multiplier);
  await addWalletSafe(userId, reward);
  await interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x00ff88)
        .setTitle(`Bounty Captured: ${target.emoji} ${target.name}`)
        .setDescription(`Reward: \`${reward.toLocaleString()}\` Atoms\nXP: +${xp.xpGained}`)
    ]
  });
  await maybeLevelUp(interaction, xp);
}

async function dig(interaction) {
  const userId = interaction.user.id;
  const cooldown = await canUseCooldown(userId, 'DIG');
  if (!cooldown.ok) return interaction.reply({ embeds: [cooldownEmbed(cooldown.remaining)], flags: 64 });

  const toolUse = await useToolForAction(userId, 'DIG', { required: true });
  if (!toolUse.ok) return interaction.reply({ embeds: [errorEmbed(toolUse.reason)], flags: 64 });

  await interaction.deferReply();
  await setUsedCooldown(userId, 'DIG');
  const actionBoost = await getActionMultiplier(userId, 'dig');

  const layer = pickRandom(DIG_LAYERS);
  let roll = Math.random();
  let found = layer.finds[layer.finds.length - 1];
  for (const option of layer.finds) {
    roll -= option.chance;
    if (roll <= 0) {
      found = option;
      break;
    }
  }

  const value = Math.floor(found.value * (0.8 + Math.random() * 0.4) * actionBoost.multiplier * (toolUse.bonusMultiplier || 1));
  await addWalletSafe(userId, value);
  await bumpStat(userId, 'dig_used', 1);
  const xp = await awardActionXP(userId, 'dig');

  const embed = new EmbedBuilder()
    .setColor(0x8b4513)
    .setAuthor({ name: `${interaction.user.username}'s Dig`, iconURL: interaction.user.displayAvatarURL() })
    .setTitle('Archaeological Dig')
    .setDescription([
      `Layer: ${layer.depth}`,
      `Found: **${found.name}**`,
      `Value: \`${value.toLocaleString()}\` Atoms`,
      `XP: +${xp.xpGained}`,
      toolNote(toolUse)
    ].filter(Boolean).join('\n'));
  await interaction.editReply({ embeds: [embed] });
  await maybeLevelUp(interaction, xp);
}

async function chop(interaction) {
  const userId = interaction.user.id;
  const cooldown = await canUseCooldown(userId, 'CHOP');
  if (!cooldown.ok) return interaction.reply({ embeds: [cooldownEmbed(cooldown.remaining)], flags: 64 });

  const toolUse = await useToolForAction(userId, 'CHOP', { required: true });
  if (!toolUse.ok) return interaction.reply({ embeds: [errorEmbed(toolUse.reason)], flags: 64 });

  await interaction.deferReply();
  await setUsedCooldown(userId, 'CHOP');
  const actionBoost = await getActionMultiplier(userId, 'chop');

  await interaction.editReply({ content: 'Walking up to a huge tree...' });
  await wait(700);
  await interaction.editReply({ content: 'CHOP! (1/3)' });
  await wait(700);
  await interaction.editReply({ content: 'CHOP!! (2/3)' });
  await wait(700);
  await interaction.editReply({ content: 'TIMBER!!! (3/3)' });
  await wait(700);

  const reward = Math.floor(rollRange(200, 600) * actionBoost.multiplier * (toolUse.bonusMultiplier || 1));
  await addWalletSafe(userId, reward);
  await bumpStat(userId, 'chop_used', 1);
  const xp = await awardActionXP(userId, 'chop');

  await interaction.editReply({
    content: null,
    embeds: [
      new EmbedBuilder()
        .setColor(0x27ae60)
        .setTitle('Tree Felled')
        .setDescription([
          `Sold the wood for \`${reward.toLocaleString()}\` Atoms`,
          `XP: +${xp.xpGained}`,
          toolNote(toolUse)
        ].filter(Boolean).join('\n'))
    ]
  });
  await maybeLevelUp(interaction, xp);
}

async function drill(interaction) {
  const userId = interaction.user.id;
  const cooldown = await canUseCooldown(userId, 'DRILL');
  if (!cooldown.ok) return interaction.reply({ embeds: [cooldownEmbed(cooldown.remaining)], flags: 64 });

  await interaction.deferReply();
  await setUsedCooldown(userId, 'DRILL');
  const actionBoost = await getActionMultiplier(userId, 'drill');

  await interaction.editReply({ content: 'Starting the heavy drill...' });
  await wait(700);
  await interaction.editReply({ content: 'Drilling at 10m depth...' });
  await wait(700);
  await interaction.editReply({ content: 'Drilling at 50m depth...' });
  await wait(700);
  await interaction.editReply({ content: 'Drilling at 100m depth...' });
  await wait(700);

  let reward = Math.floor(rollRange(500, 1500) * actionBoost.multiplier);
  let gemNote = '';
  if (rollChance(0.2)) {
    reward += 500;
    gemNote = 'Rare gem found: +500 Atoms';
  }

  await addWalletSafe(userId, reward);
  await bumpStat(userId, 'drill_used', 1);
  const xp = await awardActionXP(userId, 'drill');

  await interaction.editReply({
    content: null,
    embeds: [
      new EmbedBuilder()
        .setColor(0x34495e)
        .setTitle('Drill Complete')
        .setDescription([
          `Extraction value: \`${reward.toLocaleString()}\` Atoms`,
          gemNote,
          `XP: +${xp.xpGained}`
        ].filter(Boolean).join('\n'))
    ]
  });
  await maybeLevelUp(interaction, xp);
}

async function handleDuelButton(interaction) {
  const userId = interaction.user.id;
  const state = activeDuels.get(userId);
  if (!state) return interaction.reply({ content: 'No active duel.', flags: 64 });

  await interaction.deferUpdate().catch(() => {});
  const action = interaction.customId.split(':')[2];
  state.turns += 1;

  let playerDamage = rollRange(state.player.atk[0], state.player.atk[1]);
  let npcDamage = rollRange(state.npc.atk[0], state.npc.atk[1]);

  if (action === 'defend') {
    npcDamage = Math.floor(npcDamage * 0.4);
    playerDamage = Math.floor(playerDamage * 0.5);
    state.log = `You defended. Took \`${npcDamage}\`, dealt \`${playerDamage}\`.`;
  } else if (action === 'special') {
    if (rollChance(0.6)) {
      playerDamage = Math.floor(playerDamage * 2.2);
      state.log = `Power Strike landed for \`${playerDamage}\`.`;
    } else {
      playerDamage = 0;
      state.log = `Power Strike missed. You took \`${npcDamage}\`.`;
    }
  } else {
    state.log = `You hit for \`${playerDamage}\`. Enemy hit for \`${npcDamage}\`.`;
  }

  state.npc.currentHp -= playerDamage;
  state.player.hp -= npcDamage;

  if (state.npc.currentHp <= 0) {
    activeDuels.delete(userId);
    const actionBoost = await getActionMultiplier(userId, 'duel');
    const reward = Math.floor(rollRange(state.npc.reward[0], state.npc.reward[1]) * actionBoost.multiplier);
    await addWalletSafe(userId, reward);
    await bumpStat(userId, 'duel_used', 1);
    const xp = await awardActionXP(userId, 'duel_win');
    state.log += `\n\nYou win. Reward: \`${reward.toLocaleString()}\` Atoms | XP: +${xp.xpGained}`;
    return interaction.editReply({ embeds: [buildDuelEmbed(interaction.user, state).setColor(0x00ff88)], components: [] });
  }

  if (state.player.hp <= 0) {
    activeDuels.delete(userId);
    await bumpStat(userId, 'duel_used', 1);
    const xp = await awardActionXP(userId, 'duel_lose');
    state.log += `\n\nYou lost. XP: +${xp.xpGained}`;
    return interaction.editReply({ embeds: [buildDuelEmbed(interaction.user, state).setColor(0xe74c3c)], components: [] });
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('eco:duel:attack').setLabel('Attack').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('eco:duel:defend').setLabel('Defend').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('eco:duel:special').setLabel('Power Strike').setStyle(ButtonStyle.Success)
  );
  return interaction.editReply({ embeds: [buildDuelEmbed(interaction.user, state)], components: [row] });
}

async function handleHeistButton(interaction) {
  const userId = interaction.user.id;
  const state = activeHeists.get(userId);
  if (!state) return interaction.reply({ content: 'No active heist.', flags: 64 });

  await interaction.deferUpdate().catch(() => {});
  const action = interaction.customId.split(':')[2];

  if (action === 'abort') {
    activeHeists.delete(userId);
    const partial = Math.floor(rollRange(state.target.baseLoot[0], state.target.baseLoot[1]) * state.lootMult * 0.25 * (state.stage / HEIST_STAGES.length));
    if (partial > 0) await addWalletSafe(userId, partial);
    await bumpStat(userId, 'heist_used', 1);
    return interaction.editReply({
      embeds: [new EmbedBuilder().setColor(0xf1c40f).setTitle('Heist Aborted').setDescription(`Escaped with \`${partial.toLocaleString()}\` Atoms.`)],
      components: []
    });
  }

  const stage = HEIST_STAGES[state.stage];
  if (!rollChance(stage.successRate)) {
    activeHeists.delete(userId);
    await bumpStat(userId, 'heist_used', 1);
    const xp = await awardActionXP(userId, 'heist_fail');
    return interaction.editReply({
      embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle(`Heist Failed at ${stage.name}`).setDescription(`${stage.failText}\nXP: +${xp.xpGained}`)],
      components: []
    });
  }

  state.stage += 1;
  state.lootMult += 0.2;

  if (state.stage >= HEIST_STAGES.length) {
    activeHeists.delete(userId);
    const actionBoost = await getActionMultiplier(userId, 'heist');
    const reward = Math.floor(rollRange(state.target.baseLoot[0], state.target.baseLoot[1]) * state.lootMult * actionBoost.multiplier);
    await addWalletSafe(userId, reward);
    await bumpStat(userId, 'heist_used', 1);
    const xp = await awardActionXP(userId, 'heist_success');
    return interaction.editReply({
      embeds: [new EmbedBuilder().setColor(0x00ff88).setTitle('Heist Complete').setDescription(`Reward: \`${reward.toLocaleString()}\` Atoms\nXP: +${xp.xpGained}`)],
      components: []
    });
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('eco:heist:proceed').setLabel('Proceed').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('eco:heist:abort').setLabel('Abort').setStyle(ButtonStyle.Danger)
  );
  return interaction.editReply({ embeds: [buildHeistEmbed(interaction.user, state)], components: [row] });
}

module.exports = {
  mine,
  hack,
  duel,
  heist,
  scavenge,
  reactor,
  bounty,
  dig,
  chop,
  drill,
  handleDuelButton,
  handleHeistButton,
  activeDuels,
  activeHeists
};
