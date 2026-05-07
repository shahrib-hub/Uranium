// src/utils/emojiUtil.js
const CUSTOM_RE = /<(a)?:([a-zA-Z0-9_]+):([0-9]+)>/;

function parseEmoji(input) {
  if (!input) return null;
  input = input.trim();

  const m = input.match(CUSTOM_RE);
  if (m) {
    const animated = Boolean(m[1]);
    const name = m[2];
    const id = m[3];
    const raw = `<${animated ? 'a' : ''}:${name}:${id}>`;
    const identifier = `${name}:${id}`;
    return { raw, identifier, isCustom: true, name, id, animated };
  }

  // maybe raw like name:id
  if (/^[\w-]+:[0-9]+$/.test(input)) {
    const [name, id] = input.split(':');
    return { raw: `<:${name}:${id}>`, identifier: `${name}:${id}`, isCustom: true, name, id };
  }

  // treat as unicode / sequence
  return { raw: input, identifier: input, isCustom: false };
}

module.exports = {
  parseEmoji
};