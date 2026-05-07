// src/listeners/transcript.js
const escapeHtml = str =>
  (str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

async function generateTranscriptBuffer(channel, maxMessages = 2000) {
  const messages = [];
  let lastId;

  while (true) {
    const fetched = await channel.messages.fetch({ limit: 100, before: lastId }).catch(() => null);
    if (!fetched || fetched.size === 0) break;
    messages.push(...fetched.values());
    lastId = fetched.last().id;
    if (messages.length >= maxMessages) break;
  }

  messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

  const rows = messages.map(m => {
    const author = escapeHtml(m.member?.displayName || m.author.username || 'Unknown');
    const avatar = m.author.displayAvatarURL ? m.author.displayAvatarURL({ extension: 'png', size: 64 }) : '';
    const time = new Date(m.createdTimestamp).toLocaleString();
    const content = escapeHtml(m.content || '');
    const attachments = [...m.attachments.values()].map(a =>
      `<div class="attachment"><a href="${a.url}" target="_blank">${escapeHtml(a.name || 'Attachment')}</a></div>`
    ).join('');
    const embeds = (m.embeds || []).map(e =>
      `<div class="embed">
        ${e.title ? `<div class="et">${escapeHtml(e.title)}</div>` : ''}
        ${e.description ? `<div class="ed">${escapeHtml(e.description)}</div>` : ''}
      </div>`
    ).join('');

    return `
      <div class="message">
        <img class="avatar" src="${avatar}" />
        <div class="body">
          <div class="meta">
            <span class="author">${author}</span>
            <span class="timestamp">${time}</span>
          </div>
          <div class="content">${content}</div>
          ${attachments}${embeds}
        </div>
      </div>`;
  });

  const html = `
    <!DOCTYPE html>
    <html><head><meta charset="utf-8">
    <title>Ticket Transcript</title>
    <style>
      body { background: #0f1720; color: #e6eef8; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; }
      .container { padding: 20px; max-width: 1000px; margin: auto; }
      h2 { margin-top: 0; }
      .message { display: flex; margin-bottom: 16px; }
      .avatar { width: 48px; height: 48px; border-radius: 8px; margin-right: 12px; }
      .body { flex: 1; }
      .meta { font-size: 13px; color: #9aa7b2; margin-bottom: 6px; }
      .author { color: #ffffff; font-weight: 600; margin-right: 8px; }
      .timestamp { color: #7f8a94; font-size: 12px; }
      .content { white-space: pre-wrap; line-height: 1.5; color: #dbe9ff; }
      .attachment, .embed { background: #0b1220; padding: 8px; border-radius: 6px; margin-top: 6px; border: 1px solid #172033; }
      .embed .et { font-weight: 700; margin-bottom: 4px; }
    </style>
    </head><body>
    <div class="container">
      <h2>Ticket Transcript</h2>
      ${rows.join('\n')}
    </div>
    </body></html>`;

  return Buffer.from(html, 'utf8');
}

module.exports = { generateTranscriptBuffer };
