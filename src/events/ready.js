const { Events, ActivityType } = require('discord.js');
const {
  listActiveGiveaways,
  finalizeGiveaway
} = require('../listeners/giveawayService');

const DEFAULT_INTERVAL = 15000;

module.exports = {
  name: 'clientReady',
  once: true,
  async execute(client) {
    // ✅ Activity rotation setup
    const normalize = a => {
      if (!a?.name) return null;
      const validTypes = new Set(Object.values(ActivityType));
      const t = validTypes.has(a.type) ? a.type : ActivityType.Playing;
      const s = ["online", "idle", "dnd", "invisible"].includes(a.status) ? a.status : "online";
      return { name: a.name, type: t, status: s, url: a.url };
    };

    const apply = async e => {
      if (!e) return;
      const act = { name: e.name, type: e.type };
      if (e.type === ActivityType.Streaming && e.url) act.url = e.url;
      try {
        await client.user.setPresence({ activities: [act], status: e.status });
      } catch (_) {}
    };

    client._activity = { list: [], interval: DEFAULT_INTERVAL, timer: null, index: 0 };

    client.startActivityRotation = (list, ms = DEFAULT_INTERVAL) => {
      const clean = (list || []).map(normalize).filter(Boolean);
      if (!clean.length) return;
      if (client._activity.timer) clearInterval(client._activity.timer);
      client._activity.list = clean;
      client._activity.interval = Math.max(5000, ms);
      client._activity.index = 0;
      apply(clean[0]);
      client._activity.timer = setInterval(() => {
        client._activity.index = (client._activity.index + 1) % clean.length;
        apply(client._activity.list[client._activity.index]);
      }, client._activity.interval);
    };

    client.stopActivityRotation = () => {
      if (client._activity.timer) clearInterval(client._activity.timer);
      client._activity.timer = null;
    };

    // ✅ Start rotating presence
    client.startActivityRotation([
      { name: "Playing /games 🎮", type: ActivityType.Playing, status: "idle" },
      { name: "Playing with AI 🤖", type: ActivityType.Playing, status: "idle" },
      { name: "Watching the servers 💀", type: ActivityType.Watching, status: "idle" }
    ], 15000);

    // ✅ Resume and schedule active giveaways
    client.giveawayTimers = new Map();

    const giveaways = await listActiveGiveaways();
    for (const g of giveaways) {
      const timeLeft = g.end_at - Date.now();
      if (timeLeft <= 0) {
        await finalizeGiveaway(g.message_id, client);
      } else {
        const timer = setTimeout(() => finalizeGiveaway(g.message_id, client), timeLeft);
        client.giveawayTimers.set(g.message_id, timer);
      }
    }
  }
};
