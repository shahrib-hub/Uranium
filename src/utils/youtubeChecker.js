const Parser = require('rss-parser');
const parser = new Parser();

module.exports = async function checkYouTube(channelId) {
  const feed = await parser.parseURL(
    `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
  );

  if (!feed.items?.length) return null;

  const latest = feed.items[0];

  return {
    id: latest.id,
    title: latest.title,
    url: latest.link,
    published: latest.pubDate,
    channel: feed.title,
    thumbnail: latest.enclosure?.url
  };
};
