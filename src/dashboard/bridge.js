// src/dashboard/bridge.js — Bot ↔ Dashboard realtime bridge
const { serializePlayer, serializeTrack } = require('./api');

class DashboardBridge {
  constructor(client, io) {
    this.client = client;
    this.io = io;
    this.positionTickers = new Map(); // guildId -> interval
    this._hookKazagumoEvents();
  }

  /**
   * Hook into Kazagumo events to emit realtime updates to dashboard clients.
   * These run IN ADDITION to the existing playerEvents.js handlers.
   */
  _hookKazagumoEvents() {
    const kazagumo = this.client.music;
    if (!kazagumo) return;

    kazagumo.on('playerStart', (player) => {
      this.emitPlayerUpdate(player);
      this._startPositionTicker(player.guildId);
    });

    kazagumo.on('playerEnd', (player) => {
      this.emitPlayerUpdate(player);
    });

    kazagumo.on('playerEmpty', (player) => {
      this._stopPositionTicker(player.guildId);
      this.io.to(`guild:${player.guildId}`).emit('playerUpdate', { active: false });
    });

    kazagumo.on('playerClosed', (player) => {
      this._stopPositionTicker(player.guildId);
      this.io.to(`guild:${player.guildId}`).emit('playerUpdate', { active: false });
    });

    kazagumo.on('playerException', (player) => {
      this.emitPlayerUpdate(player);
    });
  }

  /**
   * Emit full player state to all dashboard clients watching this guild.
   */
  emitPlayerUpdate(player) {
    if (!player?.guildId) return;
    const data = serializePlayer(player);
    this.io.to(`guild:${player.guildId}`).emit('playerUpdate', data);
  }

  /**
   * Emit queue-specific update.
   */
  emitQueueUpdate(player) {
    if (!player?.guildId) return;
    const tracks = Array.from(player.queue || []).map((t, i) => ({ ...serializeTrack(t), position: i }));
    this.io.to(`guild:${player.guildId}`).emit('queueUpdate', {
      current: serializeTrack(player.queue?.current),
      tracks,
      size: player.queue?.size || 0
    });
  }

  /**
   * Position ticker — sends position updates every 1s for active players.
   * Only runs if there are dashboard clients in the guild room.
   */
  _startPositionTicker(guildId) {
    this._stopPositionTicker(guildId);
    const ticker = setInterval(() => {
      const room = this.io.sockets.adapter.rooms.get(`guild:${guildId}`);
      if (!room || room.size === 0) {
        this._stopPositionTicker(guildId);
        return;
      }

      const player = this.client.music?.players?.get(guildId);
      if (!player || !player.playing || player.paused) return;

      this.io.to(`guild:${guildId}`).emit('positionUpdate', {
        position: player.position || 0,
        duration: this._getDuration(player.queue?.current),
        paused: player.paused || false,
        playing: player.playing || false
      });
    }, 1000);

    this.positionTickers.set(guildId, ticker);
  }

  _stopPositionTicker(guildId) {
    const t = this.positionTickers.get(guildId);
    if (t) clearInterval(t);
    this.positionTickers.delete(guildId);
  }

  _getDuration(track) {
    if (!track) return 0;
    const info = track.info || track.raw?.info || track;
    const v = info.length ?? info.duration ?? info.durationMs ?? track.length ?? track.duration;
    return typeof v === 'number' ? v : parseInt(v) || 0;
  }

  destroy() {
    for (const [guildId] of this.positionTickers) {
      this._stopPositionTicker(guildId);
    }
  }
}

module.exports = { DashboardBridge };
