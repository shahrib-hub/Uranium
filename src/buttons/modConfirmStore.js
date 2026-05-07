// src/buttons/modConfirmStore.js
const pending = new Map();

/**
 * Store a pending moderation action for an interaction
 * @param {string} interactionId
 * @param {object} payload
 */
function setPendingModeration(interactionId, payload) {
  pending.set(interactionId, {
    ...payload,
    createdAt: Date.now()
  });

  // Auto-expire after 5 minutes
  setTimeout(() => {
    if (pending.get(interactionId)?.createdAt === payload.createdAt) {
      pending.delete(interactionId);
    }
  }, 5 * 60 * 1000);
}

/**
 * Get a pending moderation action
 * @param {string} interactionId
 */
function getPendingModeration(interactionId) {
  return pending.get(interactionId);
}

/**
 * Delete a pending moderation action
 * @param {string} interactionId
 */
function deletePendingModeration(interactionId) {
  pending.delete(interactionId);
}

module.exports = {
  setPendingModeration,
  getPendingModeration,
  deletePendingModeration
};