// src/buttons/ai_regenerate.js
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const { callGroq } = require('../utils/groq');
const { getSettings, incrementStat } = require('../utils/ai');

/**
 * Safe reply helper for interactions.
 * Tries editReply -> followUp -> reply, then falls back to sending a channel message
 * mentioning the user to ensure the interaction is not left deferred (stuck "thinking").
 */
async function safeInteractionReply(interaction, payload) {
  // payload: object accepted by reply/editReply/followUp
  try {
    // If we haven't deferred/replied yet, prefer reply (fastest)
    if (!interaction.deferred && !interaction.replied) {
      try {
        return await interaction.reply(payload);
      } catch (err) {
        // fall through to other attempts
      }
    }

    // If already deferred or replied, try editReply first
    if (interaction.deferred || interaction.replied) {
      try {
        return await interaction.editReply(payload);
      } catch (err) {
        // edit failed (token expired etc.) -> try followUp
        try {
          return await interaction.followUp({ ...payload, ephemeral: payload.ephemeral ?? true });
        } catch (followErr) {
          // followUp failed -> try reply (may throw InteractionAlreadyReplied)
          try {
            return await interaction.reply({ ...payload, ephemeral: payload.ephemeral ?? true });
          } catch (replyErr) {
            // all interaction-based attempts failed -> fall through to channel send
          }
        }
      }
    }
  } catch (_) {
    // ignore and fallback
  }

  // FINAL FALLBACK: send a normal channel message to ensure the user is informed
  try {
    const channel = interaction.channel;
    if (channel && channel.send) {
      // Use visible public message but mention user so they notice
      const mention = interaction.user ? `<@${interaction.user.id}>` : '';
      const text = payload.content ? payload.content : 'Response available (could not deliver via interaction).';
      return await channel.send({ content: `${mention} ${text}` });
    }
  } catch (finalErr) {
    // give up silently but log
    console.error('[ai_regenerate] safeInteractionReply final fallback failed:', finalErr);
  }
}

/**
 * AI regenerate handler
 */
module.exports = async (interaction) => {
  // ensure it's a button interaction
  if (!interaction.isButton?.()) return;

  const guildId = interaction.guild?.id;
  const channel = interaction.channel;

  try {
    // Grab reference to original message (where the AI prompt was)
    const refId = interaction.message?.reference?.messageId;
    if (!refId) {
      // Acknowledge so we're not stuck, then notify
      try { await interaction.deferReply({ flags: 64 }); } catch (_) {}
      return safeInteractionReply(interaction, {
        content: '⚠️ Could not find the original message reference to regenerate from.',
        flags: 64
      });
    }

    // Attempt to fetch the original message
    let originalMessage = null;
    try {
      originalMessage = await channel.messages.fetch(refId);
    } catch {
      // ignore - will be handled below
    }

    const prompt = originalMessage?.content;
    if (!prompt) {
      try { await interaction.deferReply({ flags: 64 }); } catch (_) {}
      return safeInteractionReply(interaction, {
        content: '⚠️ Could not find the original prompt to regenerate.',
        flags: 64
      });
    }

    // Defer early if not acknowledged yet
    if (!interaction.deferred && !interaction.replied) {
      try {
        await interaction.deferReply({ flags: 64 });
      } catch (_) {
        // continue; safeInteractionReply will handle final message
      }
    }

    // Call AI
    const settings = await new Promise(res => getSettings(guildId, res));
    const result = await callGroq(prompt, settings?.style, settings?.model);
    incrementStat(guildId, 'prompts');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`ai_regen_${interaction.message.id}`)
        .setLabel('🔁')
        .setStyle(ButtonStyle.Primary)
    );

    // Attempt to deliver the result (ephemeral preferred)
    await safeInteractionReply(interaction, { content: result, components: [row], flags: 64 });
    return;
  } catch (err) {
    console.error('[ai_regenerate] Regenerate error:', err);
    try {
      await safeInteractionReply(interaction, { content: '❌ Failed to regenerate the response. Please try again.', flags: 64 });
    } catch (_) {}
  }
};
