// src/dashboard/socket.js — Socket.IO event handling
function setupSocket(io, client) {
  io.on('connection', (socket) => {
    const session = socket.request.session;
    if (!session?.user) {
      socket.disconnect(true);
      return;
    }

    const userId = session.user.id;

    socket.on('join-guild', (guildId) => {
      // Validate user is member of this guild
      const userGuilds = session.guilds || [];
      const isMember = userGuilds.some(g => g.id === guildId);
      if (!isMember) return;

      // Validate bot is in guild
      if (!client.guilds.cache.has(guildId)) return;

      // Leave any previously joined guild rooms
      for (const room of socket.rooms) {
        if (room.startsWith('guild:')) socket.leave(room);
      }

      socket.join(`guild:${guildId}`);
      socket.guildId = guildId;

      // Send immediate state
      const { serializePlayer } = require('./api');
      const player = client.music?.players?.get(guildId);
      socket.emit('playerUpdate', serializePlayer(player, guildId));
    });

    socket.on('leave-guild', () => {
      for (const room of socket.rooms) {
        if (room.startsWith('guild:')) socket.leave(room);
      }
      socket.guildId = null;
    });

    socket.on('disconnect', () => {
      // Clean up
    });
  });
}

module.exports = { setupSocket };
