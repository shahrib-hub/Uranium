const translate = require('@iamtraction/google-translate');
const { getServerSettings } = require('../database/settings');

// A simple regex to find typical markdown (bold/links) so we don't translate them
// Matches `**...**` or `[...](...)`
const MARKDOWN_REGEX = /(\*\*.*?\*\*|\[.*?\]\(.*?\))/g;

const translationCache = new Map();

/**
 * Translates a given text to a target language, preserving markdown links and bold strings.
 */
async function translateText(text, targetLang) {
  if (!text || targetLang === 'en') return text;

  const cacheKey = `${targetLang}:${text}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  // Extract markdown that shouldn't be translated
  const placeholders = [];
  let placeholderIndex = 0;

  const textWithPlaceholders = text.replace(MARKDOWN_REGEX, (match) => {
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
      translated = translated.replace(new RegExp(placeholder, 'gi'), placeholders[i]);
    }

    translationCache.set(cacheKey, translated);
    return translated;
  } catch (error) {
    console.error(`[Translation Error] Failed to translate to ${targetLang}:`, error.message);
    return text;
  }
}

/**
 * Translates an entire Discord embed dynamically
 */
async function translateEmbed(embed, targetLang) {
  if (targetLang === 'en') return embed;
  
  // Normalize embed to a plain API object
  let embedData = embed;
  if (typeof embed.toJSON === 'function') {
    embedData = embed.toJSON();
  } else if (embed.data) {
    embedData = embed.data;
  }

  // Clone to avoid mutating original
  const newEmbed = JSON.parse(JSON.stringify(embedData));

  // Parallelize translation of all top-level strings
  const translationTasks = [];

  if (newEmbed.title) {
    translationTasks.push((async () => { newEmbed.title = await translateText(newEmbed.title, targetLang); })());
  }
  if (newEmbed.description) {
    translationTasks.push((async () => { newEmbed.description = await translateText(newEmbed.description, targetLang); })());
  }
  
  if (newEmbed.author && newEmbed.author.name) {
    translationTasks.push((async () => { newEmbed.author.name = await translateText(newEmbed.author.name, targetLang); })());
  }
  
  if (newEmbed.footer && newEmbed.footer.text) {
    translationTasks.push((async () => { newEmbed.footer.text = await translateText(newEmbed.footer.text, targetLang); })());
  }

  if (newEmbed.fields && newEmbed.fields.length > 0) {
    for (let i = 0; i < newEmbed.fields.length; i++) {
      translationTasks.push((async () => { newEmbed.fields[i].name = await translateText(newEmbed.fields[i].name, targetLang); })());
      translationTasks.push((async () => { newEmbed.fields[i].value = await translateText(newEmbed.fields[i].value, targetLang); })());
    }
  }

  await Promise.all(translationTasks);

  return newEmbed;
}

/**
 * Recursively inspects the message options and translates content and embeds.
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
      return await translateEmbed(options, targetLang);
    }

    // Normal options object
    const newOptions = { ...options };

    const topTasks = [];

    if (newOptions.content) {
      topTasks.push((async () => { newOptions.content = await translateText(newOptions.content, targetLang); })());
    }

    if (newOptions.embeds && Array.isArray(newOptions.embeds)) {
      topTasks.push((async () => {
        newOptions.embeds = await Promise.all(
          newOptions.embeds.map(embed => translateEmbed(embed, targetLang))
        );
      })());
    }

    if (newOptions.components && Array.isArray(newOptions.components)) {
      topTasks.push((async () => {
        newOptions.components = JSON.parse(JSON.stringify(newOptions.components));
        const componentTasks = [];
        for (const row of newOptions.components) {
          if (row.components) {
            for (const comp of row.components) {
              if (comp.label && typeof comp.label === 'string') {
                componentTasks.push((async () => {
                  const tl = await translateText(comp.label, targetLang);
                  comp.label = tl.substring(0, 80);
                })());
              }
              if (comp.placeholder && typeof comp.placeholder === 'string') {
                componentTasks.push((async () => {
                  const tl = await translateText(comp.placeholder, targetLang);
                  comp.placeholder = tl.substring(0, 150);
                })());
              }
            }
          }
        }
        await Promise.all(componentTasks);
      })());
    }

    await Promise.all(topTasks);

    return newOptions;
  } catch (error) {
    console.error('[Translation Payload Error]', error);
    return options;
  }
}

module.exports = {
  translateText,
  translateEmbed,
  translateMessagePayload
};
