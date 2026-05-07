const { EmbedBuilder } = require('discord.js');
const { callGroq } = require('../../utils/groq');
const { updateEmbed } = require('./builderSession');

/**
 * Handles AI Assist for embed generation.
 * @param {object} session - The user's embed session
 * @param {string} prompt - The user's request (e.g., "event announcement")
 * @param {string} style - Optional tone/style (e.g., "casual", "formal")
 * @returns {Promise<{ success: boolean, message: string }>}
 */
async function generateEmbedFromAI(session, prompt, style = 'default') {
  const fullPrompt = `Create a Discord embed in raw JSON format for: ${prompt}.
Return ONLY a valid JSON object with keys like title, description, color, fields, etc.
Do NOT include any explanation, markdown, or code blocks.`;

  const response = await callGroq(fullPrompt, style);

  if (!response || typeof response !== 'string') {
    return { success: false, message: '⚠️ AI did not return a valid response.' };
  }

  try {
    // Extract JSON from response (handle code blocks or extra text)
    const jsonMatch = response.match(/```json([\s\S]*?)```|({[\s\S]*})/);
    const rawJson = jsonMatch ? jsonMatch[1] || jsonMatch[2] : response;

    // Clean up common issues
    const cleanedJson = rawJson
      .replace(/,\s*}/g, '}') // Remove trailing commas before closing braces
      .replace(/,\s*]/g, ']') // Remove trailing commas before closing brackets
      .trim();

    const data = JSON.parse(cleanedJson);

    // Apply fields to session
    const embed = new EmbedBuilder();

    if (data.title) embed.setTitle(data.title);
    if (data.description) embed.setDescription(data.description);
    if (data.color) embed.setColor(data.color);
    if (data.author) embed.setAuthor({ name: data.author });
    if (data.footer) embed.setFooter({ text: data.footer });
    if (data.thumbnail) embed.setThumbnail(data.thumbnail);
    if (data.image) embed.setImage(data.image);
    if (data.fields && Array.isArray(data.fields)) session.fields = data.fields;

    session.embed = embed;
    session.aiGenerated = true;
    updateEmbed(session);

    return { success: true, message: '✅ AI Assist applied to your embed!' };
  } catch (err) {
    console.error('AI Assist JSON parse error:', err);
    return {
      success: false,
      message: '⚠️ Failed to parse AI response. Try again or rephrase your request.'
    };
  }
}

module.exports = { generateEmbedFromAI };
