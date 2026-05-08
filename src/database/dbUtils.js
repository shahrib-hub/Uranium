const { useMongoDB } = require('../config/database');
const { getDbStatus } = require('./mongoose');

/**
 * Checks if MongoDB is configured and connected.
 * @returns {boolean}
 */
function isMongoReady() {
  return useMongoDB && getDbStatus();
}

module.exports = { isMongoReady };
