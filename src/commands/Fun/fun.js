// src/commands/Fun/fun.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const GIPHY_TOKEN = process.env.GIPHY_TOKEN || '';
const FOOTER = 'MULTi-Bot | SHM';

// animu endpoints (base)
const ANIMU_BASE = 'https://api.some-random-api.com/animu';
const ANIMU_TYPES = ['nom','poke','cry','kiss','pat','hug','wink','face-palm','quote'];

// local quote pools (separate for target vs self)
const ANIMU_QUOTES_TARGET = [
  "I'll always be by your side, no matter what.",
  "If you fall, I'll catch you — every single time.",
  "I'll protect you until my last breath.",
  "A single smile can change a life.",
  "We fight for the people we love.",
  "Hold on to hope — it's stronger than you think."
];
const ANIMU_QUOTES_SELF = [
  "Even the smallest light can pierce the darkest night.",
  "Dreams are just plans waiting to happen.",
  "Sometimes the bravest thing is asking for help.",
  "Every scar is a story of survival.",
  "Your heart is louder than your fear.",
  "We get stronger when we stand together."
];

// roast pools (different for target vs self)
const ROASTS_TARGET = [
  "You're the reason the gene pool needs a lifeguard.",
  "I'd explain it to you, but I left my crayons at home.",
  "You're like a cloud — when you disappear it's a beautiful day.",
  "Calling you an idiot would be an insult to stupid people."
];
const ROASTS_SELF = [
  "You asked for this roast — you should've used a helmet.",
  "Self-roast incoming: you're the CPU of bad decisions.",
  "Self-inflicted burn! Ow, that's gotta sting.",
  "You took one for the team and the team filed a complaint."
];

// fun simulation stages: target vs self
const HACK_STAGES_TARGET = (targetTag, targetUser) => [
  `Initializing fun simulation on ${targetTag}...`,
  'Calibrating humor sensors... [███░░░] 35%',
  'Calculating epic gamer score... [██████░] 70%',
  'Synthesizing virtual confetti... [████████] 100%',
  'Simulation complete! Good vibes delivered.'
];
const HACK_STAGES_SELF = (invTag) => [
  `Running self-optimization diagnostic on ${invTag}...`,
  'Checking mood levels... [██░░░░] 20%',
  'Patching vibes.exe... [████░░] 60%',
  'Boosting coolness settings... [███████] 90%',
  'Self-diagnostic complete. You are operating at 100% awesome.'
];

// other utility pools
const ROAST_BUTTONS_POOL = {
  lol: '😂 LOL',
  own: '🔥 OWN'
};

const safeFetchJson = async (url) => {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
};
const rand = (arr) => Array.isArray(arr) && arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;
const truncate = (s, n = 100) => (s && s.length > n ? s.slice(0, n-3) + '...' : s);

// static art
const DINO = `
              __
             / _)
    .-^^^-/ /
 __/       /
<__.|_|-|_|
`;
const asciiArt = (t) => '```\n' + t.toUpperCase().split('').join(' ') + '\n```';

// roast pool fallback (generic)
const ROASTS_GENERIC = [
  "You're as sharp as a butter knife dipped in marshmallow.",
  "You're the human version of a typo.",
  "You bring everyone so much joy — when you leave the room."
];

// fetch animu image
async function fetchAnimu(type) {
  if (!ANIMU_TYPES.includes(type)) return null;
  const j = await safeFetchJson(`${ANIMU_BASE}/${type}`);
  if (!j) return null;
  return j.link || j.url || j.image || (typeof j === 'string' ? j : null);
}

// embed factory
function mkEmbed(title, desc, opts = {}) {
  const e = new EmbedBuilder()
    .setTitle(title)
    .setDescription(desc)
    .setColor(opts.color ?? 0x5865F2)
    .setFooter({ text: FOOTER });
  if (opts.image) e.setImage(opts.image);
  if (opts.timestamp) e.setTimestamp();
  return e;
}

// UI helpers
const anotherRow = (tag, ownerId) => new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId(`${tag}_another_${ownerId}`).setLabel('Another').setStyle(ButtonStyle.Primary)
);
const roastButtonRow = (ownerId) => new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId(`roast_lol_${ownerId}`).setLabel(ROAST_BUTTONS_POOL.lol).setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId(`roast_own_${ownerId}`).setLabel(ROAST_BUTTONS_POOL.own).setStyle(ButtonStyle.Danger)
);

// exported command
module.exports = {
  data: new SlashCommandBuilder()
    .setName('fun')
    .setDescription('Fun utilities and memes')
    // ANIMU (9)
    .addSubcommand(s => s.setName('nom').setDescription('Nom someone').addUserOption(o => o.setName('target').setDescription('Who to nom')))
    .addSubcommand(s => s.setName('poke').setDescription('Poke someone').addUserOption(o => o.setName('target').setDescription('Who to poke')))
    .addSubcommand(s => s.setName('cry').setDescription('Show a crying image').addUserOption(o => o.setName('target').setDescription('Optional target')))
    .addSubcommand(s => s.setName('kiss').setDescription('Kiss someone').addUserOption(o => o.setName('target').setDescription('Optional target')))
    .addSubcommand(s => s.setName('pat').setDescription('Pat someone').addUserOption(o => o.setName('target').setDescription('Optional target')))
    .addSubcommand(s => s.setName('hug').setDescription('Hug someone').addUserOption(o => o.setName('target').setDescription('Optional target')))
    .addSubcommand(s => s.setName('wink').setDescription('Wink at someone').addUserOption(o => o.setName('target').setDescription('Optional target')))
    .addSubcommand(s => s.setName('facepalm').setDescription('Facepalm (animu)').addUserOption(o => o.setName('target').setDescription('Optional target')))
    .addSubcommand(s => s.setName('quote').setDescription('Animu quote/image').addUserOption(o => o.setName('target').setDescription('Optional target')))
    // MISC (16) - total 25
    .addSubcommand(s => s.setName('ascii').setDescription('ASCII-ish text').addStringOption(o => o.setName('text').setDescription('Text to convert').setRequired(true)))
    .addSubcommand(s => s.setName('cleverrate').setDescription('Rate how clever someone is').addUserOption(u => u.setName('target').setDescription('Optional user to rate')))
    .addSubcommand(s => s.setName('confused').setDescription('Show a confused animu image').addUserOption(o => o.setName('target').setDescription('Optional target')))
    .addSubcommand(s => s.setName('dinochrome').setDescription('Show dinosaur ASCII art'))
    .addSubcommand(s => s.setName('epicgamerrate').setDescription('Rate gamer epicness').addUserOption(u => u.setName('target').setDescription('Optional user')))
    .addSubcommand(s => s.setName('gif').setDescription('Search a GIPHY GIF').addStringOption(o => o.setName('query').setDescription('Search term').setRequired(true)))
    .addSubcommand(s => s.setName('hack').setDescription('Fake-hack').addUserOption(o => o.setName('target').setDescription('Optional target')))
    .addSubcommand(s => s.setName('kill').setDescription('Playfully kill').addUserOption(o => o.setName('target').setDescription('Optional target')))
    .addSubcommand(s => s.setName('lovemeter').setDescription('Love meter between two users').addUserOption(u => u.setName('a').setDescription('User A').setRequired(true)).addUserOption(u => u.setName('b').setDescription('User B').setRequired(true)))
    .addSubcommand(s => s.setName('reverse').setDescription('Reverse text').addStringOption(o => o.setName('text').setDescription('Text to reverse').setRequired(true)))
    .addSubcommand(s => s.setName('rickroll').setDescription('Rickroll someone').addUserOption(o => o.setName('target').setDescription('Optional target')))
    .addSubcommand(s => s.setName('roast').setDescription('Roast').addUserOption(o => o.setName('target').setDescription('Optional target')))
    .addSubcommand(s => s.setName('sudo').setDescription('Pretend to run sudo').addStringOption(o => o.setName('cmd').setDescription('Command').setRequired(true)))
    .addSubcommand(s => s.setName('token').setDescription('Generate a fake token for fun'))
    .addSubcommand(s => s.setName('xmas').setDescription('Send a festive image/GIF')),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const inv = interaction.user;

    // imageFlow uses interaction directly
    async function imageFlow(title, desc, imageUrl, tag) {
      const embed = mkEmbed(title, desc, { image: imageUrl || undefined, timestamp: true });
      const row = anotherRow(tag, interaction.user.id);
      let msg;
      try {
        msg = await interaction.reply({ embeds: [embed], components: [row], withResponse: true });
      } catch {
        try { msg = await interaction.fetchReply(); } catch { return; }
      }

      const collector = msg.createMessageComponentCollector({
        filter: b => b.user.id === interaction.user.id,
        time: 30000,
        max: 4
      });

      collector.on('collect', async (btn) => {
        await btn.deferUpdate().catch(() => {});
        let next = null;
        if (tag.startsWith('animu_')) {
          const t = tag.split('_')[1];
          next = await fetchAnimu(t);
        }
        const newEmbed = mkEmbed(title, desc, { image: next || undefined, timestamp: true });
        await msg.edit({ embeds: [newEmbed], components: [row] }).catch(() => {});
      });

      return;
    }

    try {
      // ---------- ANIMU ----------
      if (ANIMU_TYPES.includes(sub)) {
        const target = interaction.options.getUser('target') || null;
        const image = await fetchAnimu(sub);
        // If a target is provided: dialogue prefix + target quote + action line
        // If no target: only a self quote (no dialogue)
        if (target) {
          const quote = rand(ANIMU_QUOTES_TARGET);
          let dialoguePrefix;
          if (sub === 'hug') dialoguePrefix = `${inv.tag} whispers: "Come here — you deserve a hug."`;
          else if (sub === 'kiss') dialoguePrefix = `${inv.tag} murmurs: "One kiss, just for you."`;
          else if (sub === 'pat') dialoguePrefix = `${inv.tag} says softly: "There, there — good job."`;
          else if (sub === 'nom') dialoguePrefix = `${inv.tag} exclaims: "Snacks incoming!"`;
          else if (sub === 'poke') dialoguePrefix = `${inv.tag} teases: "Poke!"`;
          else if (sub === 'wink') dialoguePrefix = `${inv.tag} winks: "You know what I mean."`;
          else if (sub === 'cry') dialoguePrefix = `${inv.tag} sighs: "This one's a tear-jerker..."`;
          else if (sub === 'face-palm') dialoguePrefix = `${inv.tag} groans: "Oh no, not again..."`;
          else dialoguePrefix = `${inv.tag} shares a moment.`;

          const desc = `${dialoguePrefix}\n\n> *${quote}*\n\nAction directed at: <@${target.id}>`;
          return imageFlow(sub.toUpperCase(), desc, image, `animu_${sub}`);
        } else {
          // no target -> just a self quote
          const quote = rand(ANIMU_QUOTES_SELF);
          const desc = `> *${quote}*`;
          return imageFlow(sub.toUpperCase(), desc, image, `animu_${sub}`);
        }
      }

      // ---------- ASCII ----------
      if (sub === 'ascii') {
        const t = interaction.options.getString('text', true).slice(0, 60);
        return interaction.reply({ content: asciiArt(t) });
      }

      // ---------- CONFUSED ----------
      if (sub === 'confused') {
        const target = interaction.options.getUser('target') || null;
        const img = await fetchAnimu('cry') || await fetchAnimu('face-palm') || null;
        if (target) {
          const quote = rand(ANIMU_QUOTES_TARGET);
          const dialogue = `${inv.tag} mutters: "Wait—what did I just read?"`;
          const desc = `${dialogue}\n\n> *${quote}*\n\nAction directed at: <@${target.id}>`;
          return imageFlow('Confused', desc, img, 'animu_cry');
        } else {
          const quote = rand(ANIMU_QUOTES_SELF);
          const desc = `> *${quote}*`;
          return imageFlow('Confused', desc, img, 'animu_cry');
        }
      }

      // ---------- DINO ----------
      if (sub === 'dinochrome') {
        const e = mkEmbed('🦕 Dinochrome', `${inv.tag} proclaims: "Behold, the dino."\n\n> *${rand(ANIMU_QUOTES_SELF)}*`, { timestamp: true });
        await interaction.reply({ embeds: [e], withResponse: true }).catch(() => {});
        return interaction.followUp({ content: '```' + DINO + '```' });
      }

      // ---------- CLEVERRATE / EPICGAMERRATE ----------
      if (sub === 'cleverrate' || sub === 'epicgamerrate') {
        const target = interaction.options.getUser('target') || interaction.user;
        const val = Math.floor(Math.random() * 101);
        const title = sub === 'cleverrate' ? '🧠 Cleverness Rate' : '🎮 Epic Gamer Rate';
        const desc = `${target} is **${val}%** ${sub === 'cleverrate' ? 'clever' : 'epic gamer'}.\n\n${val > 80 ? 'Legendary.' : val > 50 ? 'Pretty good.' : 'Needs practice.'}\n\n> *${rand(ANIMU_QUOTES_SELF)}*`;
        return interaction.reply({ embeds: [mkEmbed(title, desc, { timestamp: true })] });
      }

      // ---------- GIF (GIPHY) ----------
      if (sub === 'gif') {
        const q = truncate(interaction.options.getString('query', true), 100);
        if (!GIPHY_TOKEN || GIPHY_TOKEN === 'YOUR_GIPHY_TOKEN_HERE') return interaction.reply({ content: 'GIPHY token not set (GIPHY_TOKEN env).', flags: 64 });
        const jr = await safeFetchJson(`https://api.giphy.com/v1/gifs/search?api_key=${encodeURIComponent(GIPHY_TOKEN)}&q=${encodeURIComponent(q)}&limit=25&rating=pg-13`);
        const gif = jr?.data?.length ? rand(jr.data).images.original.url : null;
        if (!gif) return interaction.reply({ content: 'No GIFs found.', flags: 64 });
        const row = anotherRow('gif', interaction.user.id);
        const embed = mkEmbed(`GIF: ${q}`, `Here's a GIF for **${q}** — press Another to fetch more.\n\n> *${rand(ANIMU_QUOTES_SELF)}*`, { image: gif, timestamp: true });
        const msg = await interaction.reply({ embeds: [embed], components: [row], withResponse: true });

        const coll = msg.createMessageComponentCollector({ filter: b => b.user.id === interaction.user.id, time: 30000, max: 4 });
        coll.on('collect', async b => {
          await b.deferUpdate().catch(() => {});
          const jr2 = await safeFetchJson(`https://api.giphy.com/v1/gifs/search?api_key=${encodeURIComponent(GIPHY_TOKEN)}&q=${encodeURIComponent(q)}&limit=50&rating=pg-13`);
          const next = jr2?.data?.length ? rand(jr2.data).images.original.url : null;
          const newE = mkEmbed(`GIF: ${q}`, `Another GIF for **${q}**\n\n> *${rand(ANIMU_QUOTES_SELF)}*`, { image: next || undefined, timestamp: true });
          await msg.edit({ embeds: [newE], components: [row] }).catch(() => {});
        });

        return;
      }

      // ---------- REVERSE ----------
      if (sub === 'reverse') {
        const t = interaction.options.getString('text', true);
        return interaction.reply({ content: `🔁 ${t.split('').reverse().join('')}` });
      }

      // ---------- KILL ----------
      if (sub === 'kill') {
        const target = interaction.options.getUser('target') || null;
        const methods_target = [
          'was overwhelmed by an army of rubber ducks.',
          'tripped on a banana peel and became a legend.',
          'lost a duel with a sandwich.',
          'was outwitted by a goldfish.'
        ];
        const methods_self = [
          'accidentally imploded from too much swagger.',
          'was defeated by their own overconfidence.',
          'took one for the team and the team still complained.'
        ];
        if (target) {
          const desc = `<@${target.id}> ${rand(methods_target)}\n\n> *${rand(ANIMU_QUOTES_TARGET)}*`;
          return interaction.reply({ embeds: [mkEmbed('🔪 Playful Kill', desc, { timestamp: true })] });
        } else {
          const desc = `${inv.tag} ${rand(methods_self)}\n\n> *${rand(ANIMU_QUOTES_SELF)}*`;
          return interaction.reply({ embeds: [mkEmbed('🔪 Self Playful Kill', desc, { timestamp: true })] });
        }
      }

      // ---------- LOVEMETER ----------
      if (sub === 'lovemeter') {
        const a = interaction.options.getUser('a', true);
        const b = interaction.options.getUser('b', true);
        const val = Math.floor(Math.random() * 101);
        const hearts = '❤️'.repeat(Math.round((val / 100) * 5)) || '💔';
        const text = `💘 **Love Meter**\n\n<@${a.id}> + <@${b.id}> = **${val}%**\n\n${hearts}\n\n> *${rand(ANIMU_QUOTES_SELF)}*`;
        return interaction.reply({ embeds: [mkEmbed('Love Meter', text, { timestamp: true })] });
      }

      // ---------- RICKROLL ----------
      if (sub === 'rickroll') {
        const target = interaction.options.getUser('target') || null;
        const mention = target ? `<@${target.id}>` : 'everyone';
        const main = `${mention}, here's a gift for you 🎵\nhttps://www.youtube.com/watch?v=dQw4w9WgXcQ`;
        const extra = target ? `\n\n> *${rand(ANIMU_QUOTES_TARGET)}*` : `\n\n> *${rand(ANIMU_QUOTES_SELF)}*`;
        return interaction.reply({ embeds: [mkEmbed('😈 Rickroll', main + extra, { timestamp: true })] });
      }

      // ---------- ROAST ----------
      if (sub === 'roast') {
        const target = interaction.options.getUser('target') || null;
        if (target) {
          const roast = rand(ROASTS_TARGET) || rand(ROASTS_GENERIC);
          const long = `🔥 **Roast for <@${target.id}>**\n\n${roast}\n\n> *${rand(ANIMU_QUOTES_TARGET)}*`;
          const row = roastButtonRow(interaction.user.id);
          const sent = await interaction.reply({ embeds: [mkEmbed('Roast', long, { timestamp: true })], components: [row], withResponse: true });
          const coll = sent.createMessageComponentCollector({ time: 30000 });
          coll.on('collect', async b => {
            if (b.customId.startsWith('roast_lol_')) await b.reply({ content: '😂 LOL', flags: 64 }).catch(() => {});
            else if (b.customId.startsWith('roast_own_')) await b.reply({ content: '🔥 OWN', flags: 64 }).catch(() => {});
            else await b.reply({ content: 'Reacted!', flags: 64 }).catch(() => {});
          });
          return;
        } else {
          const roast = rand(ROASTS_SELF) || rand(ROASTS_GENERIC);
          const long = `🔥 **Self Roast for ${inv.tag}**\n\n${roast}\n\n> *${rand(ANIMU_QUOTES_SELF)}*`;
          const row = roastButtonRow(interaction.user.id);
          const sent = await interaction.reply({ embeds: [mkEmbed('Self Roast', long, { timestamp: true })], components: [row], withResponse: true });
          const coll = sent.createMessageComponentCollector({ time: 30000 });
          coll.on('collect', async b => {
            if (b.customId.startsWith('roast_lol_')) await b.reply({ content: '😂 LOL', flags: 64 }).catch(() => {});
            else if (b.customId.startsWith('roast_own_')) await b.reply({ content: '🔥 OWN', flags: 64 }).catch(() => {});
            else await b.reply({ content: 'Reacted!', flags: 64 }).catch(() => {});
          });
          return;
        }
      }

      // ---------- HACK ----------
      if (sub === 'hack') {
        const target = interaction.options.getUser('target') || null;
        if (target) {
          // target hack (progressive)
          const stages = HACK_STAGES_TARGET(`<@${target.id}>`, target.username || target.id);
          const start = mkEmbed('💻 Fake Hack', 'Starting hack sequence...', { timestamp: true });
          const sent = await interaction.reply({ embeds: [start], withResponse: true });
          for (let i = 0; i < stages.length; i++) {
            ((idx) => {
              setTimeout(async () => {
                try {
                  const e = mkEmbed('💻 Fake Hack', `\`\`\`\n${stages[idx]}\n\`\`\``, { timestamp: true });
                  await sent.edit({ embeds: [e] }).catch(() => {});
                  if (idx === stages.length - 1) {
                    const done = mkEmbed('💻 Fake Hack — Complete', `All operations finished on <@${target.id}>.`, { timestamp: true });
                    await sent.edit({ embeds: [done] }).catch(() => {});
                  }
                } catch {}
              }, 700 * (idx + 1));
            })(i);
          }
          return;
        } else {
          // self-hack (shorter progressive)
          const stages = HACK_STAGES_SELF(inv.tag);
          const start = mkEmbed('💻 Self Hack', 'Running self-improvement sequence...', { timestamp: true });
          const sent = await interaction.reply({ embeds: [start], withResponse: true });
          for (let i = 0; i < stages.length; i++) {
            ((idx) => {
              setTimeout(async () => {
                try {
                  const e = mkEmbed('💻 Self Hack', `\`\`\`\n${stages[idx]}\n\`\`\``, { timestamp: true });
                  await sent.edit({ embeds: [e] }).catch(() => {});
                  if (idx === stages.length - 1) {
                    const done = mkEmbed('💻 Self Hack — Complete', `Self improvement applied to ${inv.tag}.`, { timestamp: true });
                    await sent.edit({ embeds: [done] }).catch(() => {});
                  }
                } catch {}
              }, 700 * (idx + 1));
            })(i);
          }
          return;
        }
      }

      // ---------- SUDO ----------
      if (sub === 'sudo') {
        const cmd = interaction.options.getString('cmd', true).slice(0, 200);
        const out = `🔐 Pretending to run: \`${cmd}\`\n\nPermission denied. (simulation)\n\n> *${rand(ANIMU_QUOTES_SELF)}*`;
        return interaction.reply({ embeds: [mkEmbed('SUDO', out, { timestamp: true })] });
      }

      // ---------- TOKEN ----------
      if (sub === 'token') {
        const coinId = `ARCADE-${Math.floor(100000 + Math.random() * 900000)}`;
        return interaction.reply({
          embeds: [mkEmbed('🪙 Arcade Token', `You claimed arcade token: \`${coinId}\`!\n\n> *${rand(ANIMU_QUOTES_SELF)}*`)]
        });
      }

      // ---------- XMAS (fixed) ----------
if (sub === 'xmas') {
  // try a dedicated holidays image endpoint first
  const holidayResp = await safeFetchJson('https://some-random-api.com/img/holidays');
  const imgFromResp = holidayResp?.link || holidayResp?.url || holidayResp?.image || holidayResp?.data || null;

  if (imgFromResp) {
    const txt = `🎄 Merry and cozy — enjoy the season!\n\n> *${rand(ANIMU_QUOTES_SELF)}*`;
    return interaction.reply({
      embeds: [mkEmbed('🎄 Happy Holidays', txt, { image: imgFromResp, timestamp: true })]
    });
  }

  // If the API didn't provide a holiday image, try a safe secondary source (animu 'quote' isn't appropriate)
  // We'll attempt any available "animu/quote" image as a last resort, but only use it if it looks like an image URL.
  const quoteImgCandidate = await fetchAnimu('quote');
  const looksLikeImage = typeof quoteImgCandidate === 'string' && (quoteImgCandidate.startsWith('http://') || quoteImgCandidate.startsWith('https://'));

  if (looksLikeImage) {
    const txt = `🎄 Happy Holidays — small visual treat!\n\n> *${rand(ANIMU_QUOTES_SELF)}*`;
    return interaction.reply({
      embeds: [mkEmbed('🎄 Happy Holidays', txt, { image: quoteImgCandidate, timestamp: true })]
    });
  }

  // Final fallback: plain embed + ASCII art (no animu kiss)
  const asciiTree = [
    '         *',
    '        /|\\',
    '       /*|O\\',
    '      /*/|\\*\\',
    '     /X/ * | \\',
    '    /*/X/\\X|*\\',
    '   /O/*/X/\\*\\O\\',
    '        | |',
    '        | |',
    '       ====='
  ].join('\n');

  const txt = `🎄 Merry and cozy — no images available right now, enjoy this instead!\n\n> *${rand(ANIMU_QUOTES_SELF)}*`;
  await interaction.reply({ embeds: [mkEmbed('🎄 Happy Holidays', txt, { timestamp: true })] });
  return interaction.followUp({ content: '```' + asciiTree + '```' });
}
        
      // fallback
      return interaction.reply({ content: 'Subcommand not implemented.', flags: 64 });
    } catch (err) {
      console.error('fun command error', err);
      if (!interaction.replied) return interaction.reply({ content: 'An internal error occurred.', flags: 64 });
      return;
    }
  }
};