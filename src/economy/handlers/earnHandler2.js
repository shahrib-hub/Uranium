// src/economy/handlers/earnHandler2.js — New Earning Mini-Games
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { addWalletSafe, canUseCooldown, setUsedCooldown } = require('../helpers');
const { bumpStat, getBalance } = require('../../utils/economyStorage');
const { errorEmbed, successEmbed, cooldownEmbed } = require('../embeds');
const { awardActionXP, getUserLevel } = require('../levelSystem');
const { rollRange, rollChance, pickRandom, weightedRandom } = require('../rng');
const {
  MINE_ORES, MINE_EVENTS, HACK_TARGETS, HACK_STEPS,
  DUEL_NPCS, HEIST_STAGES, HEIST_TARGETS,
  SCAVENGE_AREAS, SCAVENGE_VALUES, REACTOR_FUELS,
  BOUNTY_TARGETS, DIG_LAYERS
} = require('../constants');

// Active sessions
const activeDuels = new Map();
const activeHeists = new Map();

// ═══ MINE ═══
async function mine(interaction) {
  const userId = interaction.user.id;
  const cd = await canUseCooldown(userId, 'MINE');
  if (!cd.ok) return interaction.reply({ embeds: [cooldownEmbed(cd.remaining)], flags: 64 });
  await interaction.deferReply();
  await setUsedCooldown(userId, 'MINE');

  const swings = rollRange(3, 5);
  let totalValue = 0;
  const foundOres = [];
  const event = pickRandom(MINE_EVENTS);

  for (let i = 0; i < swings; i++) {
    const ore = weightedRandom(MINE_ORES);
    const val = Math.floor(ore.value * event.mult);
    totalValue += val;
    foundOres.push(`${ore.emoji} **${ore.name}** — \`${val.toLocaleString()}\` Atoms`);
  }

  const bar = '█'.repeat(swings) + '░'.repeat(5 - swings);
  await addWalletSafe(userId, totalValue);
  await bumpStat(userId, 'mine_used', 1);
  const xp = await awardActionXP(userId, 'mine');

  const embed = new EmbedBuilder()
    .setColor(event.mult >= 1.5 ? 0xf1c40f : event.mult < 1 ? 0xe74c3c : 0x3498db)
    .setAuthor({ name: `${interaction.user.username}'s Mining Trip`, iconURL: interaction.user.displayAvatarURL() })
    .setTitle('⛏️ Mining Results')
    .setDescription([
      `**Event:** ${event.text}`,
      `**Multiplier:** \`${event.mult}x\``,
      '',
      `**Ores Found (${swings} swings):**`,
      ...foundOres,
      '',
      `${bar} **Progress**`,
      '',
      `**Total:** \`${totalValue.toLocaleString()}\` Atoms | 🧪 +${xp.xpGained} XP`
    ].join('\n'));

  await interaction.editReply({ embeds: [embed] });
  if (xp.leveledUp) {
    const { levelUpEmbed } = require('../embeds');
    await interaction.followUp({ embeds: [levelUpEmbed(interaction.user, xp.oldLevel, xp.newLevel, 0)] }).catch(() => {});
  }
}

// ═══ HACK ═══
async function hack(interaction) {
  const userId = interaction.user.id;
  const cd = await canUseCooldown(userId, 'HACK');
  if (!cd.ok) return interaction.reply({ embeds: [cooldownEmbed(cd.remaining)], flags: 64 });

  const lvl = await getUserLevel(userId);
  const available = HACK_TARGETS.filter(t => t.lvl <= lvl.level);
  const target = pickRandom(available.length ? available : [HACK_TARGETS[0]]);

  await interaction.deferReply();
  await setUsedCooldown(userId, 'HACK');

  // Simulate hacking steps
  const steps = rollRange(3, 5);
  const usedSteps = HACK_STEPS.slice(0, steps);
  const successChance = Math.max(0.30, 0.85 - (target.diff * 0.07));
  const succeeded = rollChance(successChance);

  let statusLines = usedSteps.map((s, i) => {
    if (i < usedSteps.length - 1 || succeeded) return `\`[OK]\` ${s}`;
    return `\`[!!]\` ${s} **DETECTED!**`;
  });

  if (succeeded) {
    const loot = rollRange(target.min, target.max);
    const finalLoot = Math.floor(loot * lvl.multiplier);
    await addWalletSafe(userId, finalLoot);
    await bumpStat(userId, 'hack_used', 1);
    const xp = await awardActionXP(userId, 'hack');

    const embed = new EmbedBuilder()
      .setColor(0x00ff88)
      .setAuthor({ name: `${interaction.user.username}'s Hack`, iconURL: interaction.user.displayAvatarURL() })
      .setTitle(`💻 Hacked: ${target.emoji} ${target.name}`)
      .setDescription([
        '```ansi\n\u001b[32m[TERMINAL] Connection established...\u001b[0m\n```',
        ...statusLines,
        '',
        `\`[$$]\` **Data exfiltrated successfully!**`,
        '',
        `⚛️ **+\`${finalLoot.toLocaleString()}\`** Atoms | 🧪 +${xp.xpGained} XP`
      ].join('\n'));
    await interaction.editReply({ embeds: [embed] });
  } else {
    const fine = rollRange(100, 500);
    const bal = await getBalance(userId);
    const loss = Math.min(bal.wallet, fine);
    await addWalletSafe(userId, -loss);
    await bumpStat(userId, 'hack_used', 1);
    await awardActionXP(userId, 'hack');

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setAuthor({ name: `${interaction.user.username}'s Hack`, iconURL: interaction.user.displayAvatarURL() })
      .setTitle(`💻 FAILED: ${target.emoji} ${target.name}`)
      .setDescription([
        '```ansi\n\u001b[31m[TERMINAL] INTRUSION DETECTED!\u001b[0m\n```',
        ...statusLines,
        '',
        `\`[XX]\` **Traced! You paid \`${loss.toLocaleString()}\` Atoms in damages.**`
      ].join('\n'));
    await interaction.editReply({ embeds: [embed] });
  }
}

// ═══ DUEL ═══
async function duel(interaction) {
  const userId = interaction.user.id;
  const cd = await canUseCooldown(userId, 'DUEL');
  if (!cd.ok) return interaction.reply({ embeds: [cooldownEmbed(cd.remaining)], flags: 64 });
  if (activeDuels.has(userId)) return interaction.reply({ embeds: [errorEmbed('You are already in a duel!')], flags: 64 });

  const lvl = await getUserLevel(userId);
  const available = DUEL_NPCS.filter(n => n.lvl <= lvl.level);
  const npc = pickRandom(available.length ? available : [DUEL_NPCS[0]]);
  await setUsedCooldown(userId, 'DUEL');

  const playerHp = 100 + (lvl.level * 2);
  const playerAtk = [10 + lvl.level, 20 + (lvl.level * 2)];
  const state = { npc: { ...npc, currentHp: npc.hp }, player: { hp: playerHp, maxHp: playerHp, atk: playerAtk }, turns: 0 };
  activeDuels.set(userId, state);

  const embed = buildDuelEmbed(interaction.user, state);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('eco:duel:attack').setLabel('Attack').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('eco:duel:defend').setLabel('Defend').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('eco:duel:special').setLabel('Power Strike').setStyle(ButtonStyle.Success)
  );

  await interaction.reply({ embeds: [embed], components: [row] });
}

function buildDuelEmbed(user, state) {
  const pBar = hpBar(state.player.hp, state.player.maxHp);
  const nBar = hpBar(state.npc.currentHp, state.npc.hp);
  return new EmbedBuilder()
    .setColor(0xff6b6b)
    .setAuthor({ name: `${user.username} vs ${state.npc.emoji} ${state.npc.name}`, iconURL: user.displayAvatarURL() })
    .setTitle(`⚔️ DUEL — Turn ${state.turns + 1}`)
    .setDescription([
      `**You** ${pBar} \`${Math.max(0, state.player.hp)}/${state.player.maxHp}\` HP`,
      `**${state.npc.name}** ${nBar} \`${Math.max(0, state.npc.currentHp)}/${state.npc.hp}\` HP`,
      '', state.log || '*Choose your action!*'
    ].join('\n'));
}

function hpBar(current, max) {
  const pct = Math.max(0, current / max);
  const filled = Math.round(pct * 10);
  return '🟩'.repeat(filled) + '⬛'.repeat(10 - filled);
}

// ═══ HEIST ═══
async function heist(interaction) {
  const userId = interaction.user.id;
  const cd = await canUseCooldown(userId, 'HEIST');
  if (!cd.ok) return interaction.reply({ embeds: [cooldownEmbed(cd.remaining)], flags: 64 });
  if (activeHeists.has(userId)) return interaction.reply({ embeds: [errorEmbed('You are already doing a heist!')], flags: 64 });

  const lvl = await getUserLevel(userId);
  const available = HEIST_TARGETS.filter(t => t.lvl <= lvl.level);
  const target = pickRandom(available.length ? available : [HEIST_TARGETS[0]]);
  await setUsedCooldown(userId, 'HEIST');

  const state = { target, stage: 0, lootMult: 1.0 };
  activeHeists.set(userId, state);

  const embed = buildHeistEmbed(interaction.user, state);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('eco:heist:proceed').setLabel('Proceed').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('eco:heist:abort').setLabel('Abort (keep 25%)').setStyle(ButtonStyle.Danger)
  );

  await interaction.reply({ embeds: [embed], components: [row] });
}

function buildHeistEmbed(user, state) {
  const stage = HEIST_STAGES[state.stage] || HEIST_STAGES[0];
  const progress = HEIST_STAGES.map((s, i) => {
    if (i < state.stage) return `✅ ~~${s.name}~~`;
    if (i === state.stage) return `➡️ **${s.name}** — ${s.desc}`;
    return `⬜ ${s.name}`;
  });
  return new EmbedBuilder()
    .setColor(0x9b59b6)
    .setAuthor({ name: `${user.username}'s Heist`, iconURL: user.displayAvatarURL() })
    .setTitle(`🏦 Heist: ${state.target.emoji} ${state.target.name}`)
    .setDescription([
      `**Stage ${state.stage + 1}/${HEIST_STAGES.length}**`,
      '', ...progress, '',
      `**Success Rate:** \`${(stage.successRate * 100).toFixed(0)}%\``,
      `**Loot Multiplier:** \`${state.lootMult.toFixed(1)}x\``
    ].join('\n'));
}

// ═══ SCAVENGE ═══
async function scavenge(interaction) {
  const userId = interaction.user.id;
  const cd = await canUseCooldown(userId, 'SCAVENGE');
  if (!cd.ok) return interaction.reply({ embeds: [cooldownEmbed(cd.remaining)], flags: 64 });
  await interaction.deferReply();
  await setUsedCooldown(userId, 'SCAVENGE');

  const area = pickRandom(SCAVENGE_AREAS);
  const numFinds = rollRange(1, 3);
  let totalValue = 0;
  const items = [];

  for (let i = 0; i < numFinds; i++) {
    const findId = pickRandom(area.finds);
    const findInfo = SCAVENGE_VALUES[findId];
    if (findInfo) {
      const val = Math.floor(findInfo.value * (0.7 + Math.random() * 0.6));
      totalValue += val;
      items.push(`${findInfo.emoji} **${findInfo.name}** — \`${val.toLocaleString()}\` Atoms`);
    }
  }

  await addWalletSafe(userId, totalValue);
  await bumpStat(userId, 'scavenge_used', 1);
  const xp = await awardActionXP(userId, 'scavenge');

  const embed = new EmbedBuilder()
    .setColor(0xe67e22)
    .setAuthor({ name: `${interaction.user.username}'s Scavenge`, iconURL: interaction.user.displayAvatarURL() })
    .setTitle(`🔍 Scavenged: ${area.emoji} ${area.name}`)
    .setDescription([
      `You rummaged through the **${area.name}**...`,
      '', ...items, '',
      `**Total:** \`${totalValue.toLocaleString()}\` Atoms | 🧪 +${xp.xpGained} XP`
    ].join('\n'));

  await interaction.editReply({ embeds: [embed] });
}

// ═══ REACTOR ═══
async function reactor(interaction) {
  const userId = interaction.user.id;
  const cd = await canUseCooldown(userId, 'REACTOR');
  if (!cd.ok) return interaction.reply({ embeds: [cooldownEmbed(cd.remaining)], flags: 64 });
  await interaction.deferReply();
  await setUsedCooldown(userId, 'REACTOR');

  const fuel = pickRandom(REACTOR_FUELS);
  const cycles = rollRange(3, 6);
  let totalOutput = 0;
  let meltdown = false;
  const log = [];

  for (let i = 0; i < cycles; i++) {
    if (rollChance(fuel.meltdownRisk)) {
      meltdown = true;
      log.push(`\`[CYCLE ${i + 1}]\` ☢️ **MELTDOWN!** Reactor overloaded!`);
      break;
    }
    const output = rollRange(fuel.baseOutput[0], fuel.baseOutput[1]);
    totalOutput += output;
    const temp = rollRange(200, 900);
    log.push(`\`[CYCLE ${i + 1}]\` Temp: \`${temp}C\` | Output: \`${output.toLocaleString()}\` Atoms`);
  }

  if (meltdown) {
    totalOutput = Math.floor(totalOutput * 0.3);
    log.push(`\n**Salvaged only 30% of output!**`);
  }

  await addWalletSafe(userId, totalOutput);
  await bumpStat(userId, 'reactor_used', 1);
  const xp = await awardActionXP(userId, 'reactor');

  const embed = new EmbedBuilder()
    .setColor(meltdown ? 0xe74c3c : 0x00ff88)
    .setAuthor({ name: `${interaction.user.username}'s Reactor`, iconURL: interaction.user.displayAvatarURL() })
    .setTitle(`☢️ Reactor Run — ${fuel.emoji} ${fuel.name}`)
    .setDescription([
      `**Fuel:** ${fuel.name} | **Efficiency:** \`${fuel.efficiency}x\` | **Risk:** \`${(fuel.meltdownRisk * 100).toFixed(0)}%\``,
      '', ...log, '',
      `**Total Output:** \`${totalOutput.toLocaleString()}\` Atoms | 🧪 +${xp.xpGained} XP`
    ].join('\n'));

  await interaction.editReply({ embeds: [embed] });
}

// ═══ BOUNTY ═══
async function bounty(interaction) {
  const userId = interaction.user.id;
  const cd = await canUseCooldown(userId, 'BOUNTY');
  if (!cd.ok) return interaction.reply({ embeds: [cooldownEmbed(cd.remaining)], flags: 64 });
  await interaction.deferReply();
  await setUsedCooldown(userId, 'BOUNTY');

  const target = pickRandom(BOUNTY_TARGETS);
  const phases = ['Tracking...', 'Located target!', 'Moving in...', 'Engaging!'];
  const escaped = rollChance(target.escapeChance);

  if (!escaped) {
    const reward = rollRange(target.reward[0], target.reward[1]);
    await addWalletSafe(userId, reward);
    await bumpStat(userId, 'bounty_used', 1);
    const xp = await awardActionXP(userId, 'bounty');

    const embed = new EmbedBuilder()
      .setColor(0x00ff88)
      .setAuthor({ name: `${interaction.user.username}'s Bounty`, iconURL: interaction.user.displayAvatarURL() })
      .setTitle(`🎯 Bounty Captured: ${target.emoji} ${target.name}`)
      .setDescription([
        ...phases.map(p => `> ${p}`), '',
        `✅ **Target captured!**`,
        `⚛️ **+\`${reward.toLocaleString()}\`** Atoms | 🧪 +${xp.xpGained} XP`
      ].join('\n'));
    await interaction.editReply({ embeds: [embed] });
  } else {
    await bumpStat(userId, 'bounty_used', 1);
    await awardActionXP(userId, 'bounty');

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setAuthor({ name: `${interaction.user.username}'s Bounty`, iconURL: interaction.user.displayAvatarURL() })
      .setTitle(`🎯 Bounty Escaped: ${target.emoji} ${target.name}`)
      .setDescription([
        ...phases.slice(0, 3).map(p => `> ${p}`),
        `> 💨 Target escaped!`, '',
        `❌ **${target.name} got away! No reward.**`
      ].join('\n'));
    await interaction.editReply({ embeds: [embed] });
  }
}

// ═══ DIG ═══
async function dig(interaction) {
  const userId = interaction.user.id;
  const cd = await canUseCooldown(userId, 'DIG');
  if (!cd.ok) return interaction.reply({ embeds: [cooldownEmbed(cd.remaining)], flags: 64 });
  await interaction.deferReply();
  await setUsedCooldown(userId, 'DIG');

  const layer = pickRandom(DIG_LAYERS);
  let roll = Math.random();
  let found = layer.finds[layer.finds.length - 1];
  for (const f of layer.finds) { roll -= f.chance; if (roll <= 0) { found = f; break; } }

  const value = Math.floor(found.value * (0.8 + Math.random() * 0.4));
  await addWalletSafe(userId, value);
  await bumpStat(userId, 'dig_used', 1);
  const xp = await awardActionXP(userId, 'dig');

  const depthBar = DIG_LAYERS.map((l, i) => {
    const isCurrent = l.depth === layer.depth;
    return `${isCurrent ? '➡️' : '  '} ${l.emoji} \`${l.depth}\`${isCurrent ? ' **<-- YOU ARE HERE**' : ''}`;
  });

  const embed = new EmbedBuilder()
    .setColor(0x8B4513)
    .setAuthor({ name: `${interaction.user.username}'s Dig`, iconURL: interaction.user.displayAvatarURL() })
    .setTitle('🦴 Archaeological Dig')
    .setDescription([
      '**Depth Reached:**', ...depthBar, '',
      `**Found:** ${found.name}`,
      `⚛️ **+\`${value.toLocaleString()}\`** Atoms | 🧪 +${xp.xpGained} XP`
    ].join('\n'));

  await interaction.editReply({ embeds: [embed] });
}

// ═══ BUTTON HANDLERS ═══
async function handleDuelButton(interaction) {
  const userId = interaction.user.id;
  const state = activeDuels.get(userId);
  if (!state) return interaction.reply({ content: '❌ No active duel.', flags: 64 });

  await interaction.deferUpdate().catch(() => {});
  const action = interaction.customId.split(':')[2]; // attack/defend/special
  state.turns++;

  // Player attacks
  let playerDmg = rollRange(state.player.atk[0], state.player.atk[1]);
  let npcDmg = rollRange(state.npc.atk[0], state.npc.atk[1]);

  if (action === 'defend') {
    npcDmg = Math.floor(npcDmg * 0.4);
    playerDmg = Math.floor(playerDmg * 0.5);
    state.log = `🛡️ You defended! Took \`${npcDmg}\` dmg, dealt \`${playerDmg}\` dmg.`;
  } else if (action === 'special') {
    if (rollChance(0.6)) {
      playerDmg = Math.floor(playerDmg * 2.2);
      state.log = `⚡ **POWER STRIKE!** Dealt \`${playerDmg}\` dmg! Took \`${npcDmg}\` dmg.`;
    } else {
      playerDmg = 0;
      state.log = `💨 Power strike **MISSED!** Took \`${npcDmg}\` dmg.`;
    }
  } else {
    state.log = `⚔️ You attacked for \`${playerDmg}\` dmg. Enemy hit you for \`${npcDmg}\` dmg.`;
  }

  state.npc.currentHp -= playerDmg;
  state.player.hp -= npcDmg;

  // Check win/lose
  if (state.npc.currentHp <= 0) {
    activeDuels.delete(userId);
    const reward = rollRange(state.npc.reward[0], state.npc.reward[1]);
    await addWalletSafe(userId, reward);
    await bumpStat(userId, 'duel_used', 1);
    const xp = await awardActionXP(userId, 'duel_win');
    state.log += `\n\n🎉 **YOU WIN!** +\`${reward.toLocaleString()}\` Atoms | 🧪 +${xp.xpGained} XP`;
    const embed = buildDuelEmbed(interaction.user, state).setColor(0x00ff88);
    return interaction.editReply({ embeds: [embed], components: [] });
  }

  if (state.player.hp <= 0) {
    activeDuels.delete(userId);
    await bumpStat(userId, 'duel_used', 1);
    await awardActionXP(userId, 'duel_lose');
    state.log += `\n\n💀 **YOU LOST!** Better luck next time.`;
    const embed = buildDuelEmbed(interaction.user, state).setColor(0xe74c3c);
    return interaction.editReply({ embeds: [embed], components: [] });
  }

  const embed = buildDuelEmbed(interaction.user, state);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('eco:duel:attack').setLabel('Attack').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('eco:duel:defend').setLabel('Defend').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('eco:duel:special').setLabel('Power Strike').setStyle(ButtonStyle.Success)
  );
  return interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleHeistButton(interaction) {
  const userId = interaction.user.id;
  const state = activeHeists.get(userId);
  if (!state) return interaction.reply({ content: '❌ No active heist.', flags: 64 });

  await interaction.deferUpdate().catch(() => {});
  const action = interaction.customId.split(':')[2]; // proceed/abort

  if (action === 'abort') {
    activeHeists.delete(userId);
    const baseLoot = rollRange(state.target.baseLoot[0], state.target.baseLoot[1]);
    const partial = Math.floor(baseLoot * state.lootMult * 0.25 * (state.stage / HEIST_STAGES.length));
    if (partial > 0) await addWalletSafe(userId, partial);
    await bumpStat(userId, 'heist_used', 1);
    const embed = new EmbedBuilder().setColor(0xf1c40f)
      .setTitle('🏦 Heist Aborted')
      .setDescription(`You bailed with \`${partial.toLocaleString()}\` Atoms.`);
    return interaction.editReply({ embeds: [embed], components: [] });
  }

  // Proceed
  const stage = HEIST_STAGES[state.stage];
  const success = rollChance(stage.successRate);

  if (!success) {
    activeHeists.delete(userId);
    await bumpStat(userId, 'heist_used', 1);
    await awardActionXP(userId, 'heist_fail');
    const embed = new EmbedBuilder().setColor(0xe74c3c)
      .setTitle(`🏦 Heist FAILED at Stage ${state.stage + 1}`)
      .setDescription(`❌ **${stage.failText}**\n\nYou lost all accumulated loot.`);
    return interaction.editReply({ embeds: [embed], components: [] });
  }

  state.lootMult += 0.2;
  state.stage++;

  // Check if completed all stages
  if (state.stage >= HEIST_STAGES.length) {
    activeHeists.delete(userId);
    const baseLoot = rollRange(state.target.baseLoot[0], state.target.baseLoot[1]);
    const totalLoot = Math.floor(baseLoot * state.lootMult);
    await addWalletSafe(userId, totalLoot);
    await bumpStat(userId, 'heist_used', 1);
    const xp = await awardActionXP(userId, 'heist_success');
    const embed = new EmbedBuilder().setColor(0x00ff88)
      .setTitle(`🏦 Heist COMPLETE!`)
      .setDescription([
        `✅ All stages cleared!`,
        `**Loot Multiplier:** \`${state.lootMult.toFixed(1)}x\``,
        '',
        `⚛️ **+\`${totalLoot.toLocaleString()}\`** Atoms | 🧪 +${xp.xpGained} XP`
      ].join('\n'));
    return interaction.editReply({ embeds: [embed], components: [] });
  }

  const embed = buildHeistEmbed(interaction.user, state);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('eco:heist:proceed').setLabel('Proceed').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('eco:heist:abort').setLabel('Abort (keep 25%)').setStyle(ButtonStyle.Danger)
  );
  return interaction.editReply({ embeds: [embed], components: [row] });
}

module.exports = {
  mine, hack, duel, heist, scavenge, reactor, bounty, dig,
  handleDuelButton, handleHeistButton, activeDuels, activeHeists
};
