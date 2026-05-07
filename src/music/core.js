// src/music/core.js
// Helper to retrieve the music Manager instance from the client.
// The actual manager is created in index.js.

module.exports = {
  getManager: (client) => client.music
};