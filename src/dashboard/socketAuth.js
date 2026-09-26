// Short-lived signed credentials for browser-to-dashboard Socket.IO connections.
const crypto = require('crypto');

const DEFAULT_TTL_SECONDS = 60;

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET must be a random value of at least 32 characters.');
  }
  return secret;
}

function getTtlSeconds() {
  const configured = Number.parseInt(process.env.SOCKET_TOKEN_TTL_SECONDS, 10);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_TTL_SECONDS;
}

function sign(encodedPayload) {
  return crypto.createHmac('sha256', getSecret()).update(encodedPayload).digest('base64url');
}

function createSocketToken(session) {
  if (!session?.user?.id) throw new Error('Cannot create a socket token without a user session');

  const payload = {
    sub: session.user.id,
    guilds: (session.guilds || []).map(({ id }) => id),
    exp: Math.floor(Date.now() / 1000) + getTtlSeconds()
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

function verifySocketToken(token) {
  if (typeof token !== 'string') return null;
  const [encodedPayload, signature, ...extra] = token.split('.');
  if (!encodedPayload || !signature || extra.length) return null;

  const expectedSignature = Buffer.from(sign(encodedPayload));
  const receivedSignature = Buffer.from(signature);
  if (expectedSignature.length !== receivedSignature.length || !crypto.timingSafeEqual(expectedSignature, receivedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    if (!payload?.sub || !Array.isArray(payload.guilds) || !Number.isInteger(payload.exp)) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

module.exports = { createSocketToken, verifySocketToken };
