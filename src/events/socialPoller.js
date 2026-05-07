const { Events } = require('discord.js');
const { all, updateLast } = require('../utils/socialDb');
const yt = require('../utils/youtubeChecker');
const tw = require('../utils/twitchChecker');
const embeds = require('../components/socialEmbeds');

module.exports = {
  name: 'clientReady',
  once: true,
  execute(client) {
    setInterval(async () => {
      const rows = await all();

      for (const r of rows) {
        try {
          const ch = await client.channels.fetch(r.notifyChannelId);
          if (!ch) continue;

          if (r.platform === 'youtube') {
            const d = await yt(r.source);
            if (!d || d.id === r.lastPost) continue;
            await ch.send(embeds.youtube(d, r.message));
            updateLast(r.id, d.id);
          }

          if (r.platform === 'twitch') {
            const d = await tw(r.source);
            if (!d || d.id === r.lastPost) continue;
            await ch.send(embeds.twitch(d, r.message));
            updateLast(r.id, d.id);
          }
        } catch {}
      }
    }, 3 * 60 * 1000);
  }
};
