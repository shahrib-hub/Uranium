// src/utils/notificationsManager.js — JSON-backed notifications for dashboard header
const fs = require('fs');
const path = require('path');

const NOTIFS_FILE = path.join(__dirname, '..', '..', 'data', 'notifications.json');

const DEFAULT_NOTIFICATIONS = [
  {
    id: 'notif-host-migration-14d',
    title: 'Hosting Migration & Temporary Degradation Notice',
    message: 'Uranium has successfully migrated to a new high-speed dedicated server host. Over the next 14 days, you may experience occasional audio buffer pauses, temporary socket disconnects, or minor latency while external routing stabilizes. All server data, configs, and playlists are 100% preserved. Thank you for your patience!',
    type: 'warning',
    badge: 'Host Migration',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days
    link: '/status',
    linkText: 'Check Live System Status'
  }
];

function ensureFile() {
  try {
    const dir = path.dirname(NOTIFS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(NOTIFS_FILE)) {
      fs.writeFileSync(NOTIFS_FILE, JSON.stringify(DEFAULT_NOTIFICATIONS, null, 2), 'utf8');
    }
  } catch (err) {
    console.error('[Notifications] Failed to ensure file:', err.message);
  }
}

function getNotifications() {
  ensureFile();
  try {
    const raw = fs.readFileSync(NOTIFS_FILE, 'utf8');
    const items = JSON.parse(raw);
    if (!Array.isArray(items)) return [];

    const now = Date.now();
    // Filter out expired items (e.g. older than expiresAt)
    const valid = items.filter(n => {
      if (!n.expiresAt) return true;
      return new Date(n.expiresAt).getTime() > now;
    });

    // If some were pruned, save clean state
    if (valid.length !== items.length) {
      saveNotifications(valid);
    }

    return valid;
  } catch (err) {
    console.error('[Notifications] Read error:', err.message);
    return DEFAULT_NOTIFICATIONS;
  }
}

function saveNotifications(items) {
  ensureFile();
  try {
    fs.writeFileSync(NOTIFS_FILE, JSON.stringify(items, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('[Notifications] Write error:', err.message);
    return false;
  }
}

function addNotification({ title, message, type = 'info', badge = 'Notice', durationDays = 14, link = null, linkText = null }) {
  const items = getNotifications();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  const newNotif = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title,
    message,
    type,
    badge,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    link,
    linkText
  };

  items.unshift(newNotif);
  saveNotifications(items);
  return newNotif;
}

function deleteNotification(id) {
  const items = getNotifications();
  const filtered = items.filter(n => n.id !== id);
  if (filtered.length !== items.length) {
    saveNotifications(filtered);
    return true;
  }
  return false;
}

module.exports = {
  getNotifications,
  addNotification,
  deleteNotification
};
