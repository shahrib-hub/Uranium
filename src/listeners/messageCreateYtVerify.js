const { EmbedBuilder } = require('discord.js');
const { getSettings, isEnabled, getVerifyChannel } = require('../utils/ytVerify');
const { extractTextFromAttachment } = require('../utils/ocr');
const { enqueueOCRJob } = require('../utils/ocrQueue');
const stringSimilarity = require('string-similarity');

module.exports = async (client) => {
  client.on('messageCreate', async (message) => {
    if (!message.guild || message.author.bot) return;
    const guildId = message.guild.id;

    getVerifyChannel(guildId, async (channelId) => {
      if (!channelId || message.channel.id !== channelId) return;

      isEnabled(guildId, async (enabled) => {
        if (!enabled) return;

        const settings = await new Promise(res => getSettings(guildId, res));
        if (!settings) return;

        const attachments = [...message.attachments.values()];
        const image = attachments.find(a => a.contentType?.startsWith('image/'));
        if (!image) {
          const warn = new EmbedBuilder()
            .setColor('Yellow')
            .setTitle('📸 Screenshot Required')
            .setDescription('Please upload a clear screenshot of the YouTube channel showing the Subscribed badge and the channel name.');
          const warnMsg = await message.channel.send({ embeds: [warn] });
          setTimeout(() => {
            warnMsg.delete().catch(() => {});
            message.delete().catch(() => {});
          }, 60_000);
          return;
        }

        const started = new EmbedBuilder()
          .setColor('Blurple')
          .setTitle('🚀 Verification Started')
          .setDescription('Your screenshot is in the queue. Please wait while we process it…')
          .setFooter({ text: 'You are in a queue. This may take a few seconds.' });
        const startedMsg = await message.channel.send({ embeds: [started] });

        const startTime = Date.now();
        let text = '';
        try {
          text = await enqueueOCRJob(() => extractTextFromAttachment(image.url));
        } catch (e) {
          const fail = new EmbedBuilder()
            .setColor('Red')
            .setTitle('❌ Verification Failed')
            .setDescription('We couldn’t read your screenshot. Please try again with a clearer image.');
          const failMsg = await message.channel.send({ embeds: [fail] });
          setTimeout(() => {
            failMsg.delete().catch(() => {});
            startedMsg.delete().catch(() => {});
            message.delete().catch(() => {});
          }, 60_000);
          return;
        }

        const haystack = (text || '').toLowerCase();

        // Ensure channel_name is valid
        if (!settings.channel_name || typeof settings.channel_name !== 'string') {
          const fail = new EmbedBuilder()
            .setColor('Red')
            .setTitle('⚙️ Verification Misconfigured')
            .setDescription('Verification is not configured properly. Please contact an admin.')
            .setFooter({ text: 'Missing or invalid YouTube channel name in settings.' });

          const failMsg = await message.channel.send({ embeds: [fail] });
          setTimeout(() => {
            failMsg.delete().catch(() => {});
            startedMsg.delete().catch(() => {});
            message.delete().catch(() => {});
          }, 60_000);
          return;
        }

        const target = settings.channel_name.toLowerCase();

        const words = haystack
          .split(/\s+/)
          .filter(w => typeof w === 'string' && w.length >= 4);

        let score = 0;
        let channelMatch = false;

        // Only call string-similarity if args are valid
        if (target && target.trim().length > 0 && Array.isArray(words) && words.length > 0) {
          try {
            const bestMatch = stringSimilarity.findBestMatch(target, words);
            score = bestMatch.bestMatch.rating;
            channelMatch = score >= 0.85;
          } catch (err) {
            // Failsafe: don't crash bot, just log and continue with fallback
            console.error('YT Verify string-similarity error:', err);
            channelMatch = haystack.includes(target);
          }
        } else {
          // Fallback when OCR text is too weak or empty
          channelMatch = haystack.includes(target);
        }

        const subscribedMatch =
          haystack.includes('subscribed') || haystack.includes('subscription');

        const timeTaken = ((Date.now() - startTime) / 1000).toFixed(1);

        if (channelMatch && subscribedMatch) {
          const roleIds = (settings.grant_roles || '')
            .split(',')
            .map(r => r.trim())
            .filter(Boolean);

          const rolesGranted = [];
          for (const rid of roleIds) {
            const role = message.guild.roles.cache.get(rid);
            if (role) {
              await message.member.roles.add(role).catch(() => {});
              rolesGranted.push(role);
            }
          }

          const success = new EmbedBuilder()
            .setColor('Green')
            .setTitle('✅ Verified!')
            .setDescription(
              `You’re subscribed to **${settings.channel_name}**.\n` +
              `Granted roles: ${rolesGranted.map(r => `<@&${r.id}>`).join(', ') || 'None'}`
            )
            .setFooter({ text: `Verification completed in ${timeTaken} seconds.` });

          const successMsg = await message.channel.send({ embeds: [success] });
          setTimeout(() => {
            successMsg.delete().catch(() => {});
            startedMsg.delete().catch(() => {});
            message.delete().catch(() => {});
          }, 60_000);
        } else {
          const fail = new EmbedBuilder()
            .setColor('Red')
            .setTitle('❌ Verification Failed')
            .setDescription(
              `Couldn’t confirm subscription to **${settings.channel_name}**.\n` +
              'Make sure the screenshot shows the Subscribed badge and the channel name clearly.'
            )
            .setFooter({ text: `Processed in ${timeTaken} seconds.` });

          const failMsg = await message.channel.send({ embeds: [fail] });
          setTimeout(() => {
            failMsg.delete().catch(() => {});
            startedMsg.delete().catch(() => {});
            message.delete().catch(() => {});
          }, 60_000);
        }
      });
    });
  });
};