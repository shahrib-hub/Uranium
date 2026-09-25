// src/utils/statusWatcher.js — Real-Time Status & AI Incident Monitor (Uranium Watcher)
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const STATUS_FILE = path.join(__dirname, '..', '..', 'data', 'status_alerts.json');

// Groq Model Tier: Primary has highest rate limits & lowest credit burn, followed by 2 fallbacks
const GROQ_MODELS = [
  'llama-3.1-8b-instant',      // Highest rate limits of all time on Groq, lightning fast
  'llama-3.3-70b-versatile',   // Fallback 1: Highly intelligent
  'gemma2-9b-it'               // Fallback 2: Robust alternative
];

// In-memory cache to prevent duplicate AI calls and preserve rate limits
const recentErrorsCache = new Map();
const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes per error pattern

// Common patterns that MUST be ignored to save credits and avoid false alarms
const IGNORE_PATTERNS = [
  'topology was destroyed',
  'connection <monitor>',
  'reconnected to mongodb',
  'connected to mongodb',
  '10062',                       // Unknown interaction (Discord user cancelled or slow interaction)
  'unknown interaction',
  'interaction has already been acknowledged',
  'lavalink] network hiccup',
  'promise rejection (swallowed)',
  '/v4/info',
  'undici',
  'favicon.ico',
  'socket] connected',
  'socket] disconnected',
  'transport close',
  'client.shard',
  'cannot read properties of undefined (reading \'id\')', // transient client-side interaction
  'request aborted',
  'econnreset',
  'etimedout'
];

function ensureFile() {
  try {
    const dir = path.dirname(STATUS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(STATUS_FILE)) {
      const initial = {
        overallStatus: 'operational',
        lastUpdated: new Date().toISOString(),
        components: {
          discord_gateway: { name: 'Discord Gateway', status: 'operational', latency: 22, description: 'Real-time WebSocket connection to Discord' },
          music_engine: { name: 'Lossless Audio (Lavalink)', status: 'operational', description: '320kbps audio playback nodes and DSP processing' },
          rest_api: { name: 'REST API & Web Backend', status: 'operational', description: 'VisiHost dedicated node & Vercel edge proxy' },
          database: { name: 'Database & Storage', status: 'operational', description: 'MongoDB Atlas cluster & SQLite persistent storage' }
        },
        alerts: [],
        notices: [
          {
            id: 'notice-infra-upgrade-2026',
            title: 'Server Migration to VisiHost Node Active',
            message: 'Uranium has moved to a dedicated server node (noida.visihost.in). Core operations remain fully active with enhanced computing limits.',
            poster: 'System Admin',
            type: 'announcement',
            severity: 'notice',
            timestamp: new Date().toISOString()
          }
        ]
      };
      fs.writeFileSync(STATUS_FILE, JSON.stringify(initial, null, 2), 'utf8');
    }
  } catch (err) {
    console.error('[StatusWatcher] Failed to ensure status file:', err.message);
  }
}

/**
 * Clean up old alerts and notices according to retention policies:
 * - Alerts older than 30 days are removed/hidden.
 * - Notices older than 6 months (180 days) are removed.
 */
function pruneOldEntries(data) {
  const now = Date.now();
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  const SIX_MONTHS = 180 * 24 * 60 * 60 * 1000;

  let changed = false;

  if (Array.isArray(data.alerts)) {
    const freshAlerts = data.alerts.filter(a => {
      const ts = new Date(a.timestamp).getTime();
      return (now - ts) < THIRTY_DAYS;
    });
    if (freshAlerts.length !== data.alerts.length) {
      data.alerts = freshAlerts;
      changed = true;
    }
  }

  if (Array.isArray(data.notices)) {
    const freshNotices = data.notices.filter(n => {
      const ts = new Date(n.timestamp).getTime();
      return (now - ts) < SIX_MONTHS;
    });
    if (freshNotices.length !== data.notices.length) {
      data.notices = freshNotices;
      changed = true;
    }
  }

  return changed;
}

function getStatusData() {
  ensureFile();
  try {
    const raw = fs.readFileSync(STATUS_FILE, 'utf8');
    const data = JSON.parse(raw);
    if (pruneOldEntries(data)) {
      saveStatusData(data);
    }
    return data;
  } catch (err) {
    console.error('[StatusWatcher] Read error:', err.message);
    return {
      overallStatus: 'operational',
      lastUpdated: new Date().toISOString(),
      components: {},
      alerts: [],
      notices: []
    };
  }
}

function saveStatusData(data) {
  ensureFile();
  try {
    data.lastUpdated = new Date().toISOString();
    fs.writeFileSync(STATUS_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('[StatusWatcher] Write error:', err.message);
    return false;
  }
}

/**
 * Call Groq with primary model and 2 automatic fallbacks using minimal tokens
 */
async function callGroqWithFallbacks(messages) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  for (let i = 0; i < GROQ_MODELS.length; i++) {
    const model = GROQ_MODELS[i];
    try {
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model,
          messages,
          temperature: 0.1, // Deterministic, fast
          max_tokens: 220,  // Ultra-minimal token consumption to preserve credits
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 8000
        }
      );

      const content = response?.data?.choices?.[0]?.message?.content;
      if (content) {
        return JSON.parse(content);
      }
    } catch (err) {
      console.warn(`[Uranium Watcher] Model ${model} failed (${err.response?.status || err.message}). Trying fallback...`);
    }
  }
  return null;
}

/**
 * Master AI Evaluation of a raw console log
 */
async function evaluateErrorWithGroq(rawLog, context = {}) {
  // Pre-filter: Check string contents
  const text = String(rawLog || '').toLowerCase();
  for (const pattern of IGNORE_PATTERNS) {
    if (text.includes(pattern)) {
      return null;
    }
  }

  // Deduplication hash
  const signature = text.slice(0, 100).replace(/\d+/g, 'X');
  const lastSeen = recentErrorsCache.get(signature);
  if (lastSeen && (Date.now() - lastSeen < COOLDOWN_MS)) {
    return null; // Already analyzed recently
  }
  recentErrorsCache.set(signature, Date.now());

  const masterPrompt = `You are "Uranium Watcher", an autonomous AI Reliability Engineer monitoring the Uranium Discord Bot infrastructure.
Analyze this raw console error log:
"${String(rawLog).slice(0, 500)}"

DECISION CRITERIA:
- Only trigger an incident if this error represents a CRITICAL or SEVERELY DEGRADING issue that breaks core bot functionality (e.g. music system completely down, database permanently unreachable, Discord API gateway disconnected, crashed commands).
- REJECT non-critical, transient, harmless, or self-recovering logs (e.g. common MongoDB reconnection, single track playback decode error, rate-limit backoff, minor client disconnection).

Return STRICT JSON:
{
  "shouldPost": true or false,
  "status": "degraded" or "outage",
  "component": "discord_gateway" or "music_engine" or "rest_api" or "database",
  "title": "Concise 4-8 word issue summary",
  "message": "1-2 brief user-friendly sentences describing the degradation and that monitoring is active. Do NOT dump raw stack traces."
}`;

  const messages = [
    { role: 'system', content: masterPrompt },
    { role: 'user', content: `Analyze log: ${rawLog}` }
  ];

  try {
    const result = await callGroqWithFallbacks(messages);
    return result;
  } catch (err) {
    console.error('[Uranium Watcher] Error during AI evaluation:', err.message);
    return null;
  }
}

/**
 * Handle a detected critical error
 */
async function handleConsoleError(errorMessage, context = {}) {
  try {
    const decision = await evaluateErrorWithGroq(errorMessage, context);
    if (!decision || !decision.shouldPost) {
      return;
    }

    const data = getStatusData();
    const alertId = `incident-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const newAlert = {
      id: alertId,
      title: decision.title || 'Service Degradation Detected',
      message: decision.message || 'An infrastructure component is experiencing degraded performance.',
      component: decision.component || 'general',
      status: decision.status || 'degraded',
      severity: decision.status === 'outage' ? 'outage' : 'degraded',
      poster: 'Uranium Watcher',
      type: 'ai',
      timestamp: new Date().toISOString(),
      active: true
    };

    data.alerts.unshift(newAlert);

    // Update component status
    if (data.components[decision.component]) {
      data.components[decision.component].status = decision.status || 'degraded';
    }

    // Update overall status
    if (decision.status === 'outage') {
      data.overallStatus = 'outage';
    } else if (data.overallStatus !== 'outage') {
      data.overallStatus = 'degraded';
    }

    saveStatusData(data);
    console.log(`[Uranium Watcher] 🛡️ Incident posted by AI: "${newAlert.title}" (Status: ${decision.status})`);
  } catch (err) {
    console.error('[StatusWatcher] Failed to handle console error:', err.message);
  }
}

/**
 * Manual Notice Addition
 */
function addManualNotice({ title, message, severity = 'notice', poster = 'System Admin', type = 'manual' }) {
  const data = getStatusData();
  const notice = {
    id: `notice-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title,
    message,
    severity,
    poster,
    type,
    timestamp: new Date().toISOString()
  };

  data.notices.unshift(notice);
  saveStatusData(data);
  return notice;
}

/**
 * Manual Alert Resolution (Reset to operational)
 */
function resolveAllAlerts(poster = 'System Admin') {
  const data = getStatusData();
  data.overallStatus = 'operational';
  for (const key of Object.keys(data.components)) {
    data.components[key].status = 'operational';
  }
  if (Array.isArray(data.alerts)) {
    data.alerts.forEach(a => {
      a.active = false;
      a.resolvedAt = new Date().toISOString();
    });
  }
  data.notices.unshift({
    id: `notice-resolved-${Date.now()}`,
    title: 'All Systems Fully Operational',
    message: 'All previous incidents have been resolved and services are running normally.',
    severity: 'operational',
    poster,
    type: 'resolution',
    timestamp: new Date().toISOString()
  });
  saveStatusData(data);
  return data;
}

/**
 * Update dynamic live telemetry (e.g. gateway ping, active nodes)
 */
function updateTelemetry(client) {
  if (!client) return;
  const data = getStatusData();
  if (data.components.discord_gateway) {
    const ping = client.ws?.ping;
    if (typeof ping === 'number' && ping >= 0) {
      data.components.discord_gateway.latency = Math.round(ping);
    }
  }
  if (data.components.music_engine && client.music) {
    const nodes = client.music.shoukaku?.nodes?.size || 1;
    data.components.music_engine.nodes = nodes;
  }
  saveStatusData(data);
}

module.exports = {
  getStatusData,
  saveStatusData,
  handleConsoleError,
  addManualNotice,
  resolveAllAlerts,
  updateTelemetry
};
