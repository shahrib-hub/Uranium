const translate = require('@iamtraction/google-translate');
const { getServerSettings } = require('../database/settings');

// A simple regex to find typical markdown (bold/links) so we don't translate them
// Matches `**...**` or `[...](...)`
const MARKDOWN_REGEX = /(\*\*.*?\*\*|\[.*?\]\(.*?\))/g;

/**
 * Translates a given text to a target language, preserving markdown links and bold strings.
 * @param {string} text 
 * @param {string} targetLang 
 * @returns {Promise<string>}
 */
async function translateText(text, targetLang) {
  if (!text || targetLang === 'en') return text;

  // Extract markdown that shouldn't be translated (e.g. song titles, artist names)
  const placeholders = [];
  let placeholderIndex = 0;

  const textWithPlaceholders = text.replace(MARKDOWN_REGEX, (match) => {
    // using a highly unlikely string as placeholder that translate API usually leaves alone
    const placeholder = `___m${placeholderIndex}___`;
    placeholders.push(match);
    placeholderIndex++;
    return placeholder;
  });

  try {
    const res = await translate(textWithPlaceholders, { to: targetLang });
    let translated = res.text;

    if (!translated) return text;

    // Restore placeholders
    for (let i = 0; i < placeholders.length; i++) {
      const placeholder = `___m${i}___`;
      // Google translate might sometimes add spaces around placeholders, or change case.
      // So we use a case-insensitive replace, though ___m0___ shouldn't change case.
      translated = translated.replace(new RegExp(placeholder, 'gi'), placeholders[i]);
    }

    return translated;
  } catch (error) {
    console.error(`[Translation Error] Failed to translate to ${targetLang}:`, error.message);
    return text; // fallback to original text
  }
}

/**
 * Translates an entire Discord embed dynamically
 */
async function translateEmbed(embed, targetLang) {
  if (targetLang === 'en') return embed;
  
  // Normalize embed to a plain API object
  // Discord.js EmbedBuilder has a .data property or .toJSON() method
  let embedData = embed;
  if (typeof embed.toJSON === 'function') {
    embedData = embed.toJSON();
  } else if (embed.data) {
    embedData = embed.data;
  }

  // Clone to avoid mutating original
  const newEmbed = JSON.parse(JSON.stringify(embedData));

  if (newEmbed.title) newEmbed.title = await translateText(newEmbed.title, targetLang);
  if (newEmbed.description) newEmbed.description = await translateText(newEmbed.description, targetLang);
  
  if (newEmbed.author && newEmbed.author.name) {
    newEmbed.author.name = await translateText(newEmbed.author.name, targetLang);
  }
  
  if (newEmbed.footer && newEmbed.footer.text) {
    newEmbed.footer.text = await translateText(newEmbed.footer.text, targetLang);
  }

  if (newEmbed.fields && newEmbed.fields.length > 0) {
    for (let i = 0; i < newEmbed.fields.length; i++) {
      newEmbed.fields[i].name = await translateText(newEmbed.fields[i].name, targetLang);
      newEmbed.fields[i].value = await translateText(newEmbed.fields[i].value, targetLang);
    }
  }

  return newEmbed;
}

/**
 * Recursively inspects the message options and translates content and embeds.
 * @param {Object|string} options The message options to translate
 * @param {string} guildId
 * @returns {Promise<Object|string>} The translated options
 */
async function translateMessagePayload(options, guildId) {
  if (!guildId) return options;

  try {
    const settings = await getServerSettings(guildId);
    const targetLang = settings.botLanguage;

    if (!targetLang || targetLang === 'en') return options;

    // Handle string payload
    if (typeof options === 'string') {
      return await translateText(options, targetLang);
    }

    // Handle EmbedBuilder passed directly
    if (options && (typeof options.toJSON === 'function' || options.data)) {
      // It's a single embed being passed as the entire options
      // We should return it as part of an embeds array to be safe, 
      // or just translate it and hope the patch caller handles it.
      // Most interaction.reply() calls taking an embed expect an options object { embeds: [embed] }
      // but some old versions or specific methods might take it directly.
      return await translateEmbed(options, targetLang);
    }

    // Normal options object
    const newOptions = { ...options };

    if (newOptions.content) {
      newOptions.content = await translateText(newOptions.content, targetLang);
    }

    if (newOptions.embeds && Array.isArray(newOptions.embeds)) {
      newOptions.embeds = await Promise.all(
        newOptions.embeds.map(embed => translateEmbed(embed, targetLang))
      );
    }

    // We don't translate components like button labels because they are often limited in size, 
    // but if the user wants "everything", we could try. The prompt says "every single messages".
    // Buttons are part of messages, so we translate their labels just in case.
    if (newOptions.components && Array.isArray(newOptions.components)) {
      // Clone components deeply to avoid mutation issues
      newOptions.components = JSON.parse(JSON.stringify(newOptions.components));
      for (const row of newOptions.components) {
        if (row.components) {
          for (const comp of row.components) {
            // Button label
            if (comp.label && typeof comp.label === 'string') {
               // Translate component label (careful of length limits)
               const tl = await translateText(comp.label, targetLang);
               comp.label = tl.substring(0, 80); // max discord label length
            }
            if (comp.placeholder && typeof comp.placeholder === 'string') {
               const tl = await translateText(comp.placeholder, targetLang);
               comp.placeholder = tl.substring(0, 150);
            }
          }
        }
      }
    }

    return newOptions;
  } catch (error) {
    console.error('[Translation Payload Error]', error);
    return options; // If anything fails, return original
  }
}

module.exports = {
  translateText,
  translateEmbed,
  translateMessagePayload
};
