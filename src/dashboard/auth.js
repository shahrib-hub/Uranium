// src/dashboard/auth.js — Discord OAuth2 authentication routes
const { Router } = require('express');
const crypto = require('crypto');
const router = Router();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://localhost:3000';
const REDIRECT_URI = `${DASHBOARD_URL}/auth/callback`.replace(/\/+$/, ''); // Remove trailing slash if any
const SCOPES = 'identify guilds';

const DISCORD_API = 'https://discord.com/api/v10';

/**
 * GET /auth/login — Redirect to Discord OAuth2
 */
router.get('/login', (req, res) => {
  const requestedNext = typeof req.query.next === 'string' ? req.query.next : '/servers';
  const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/servers';
  const state = crypto.randomBytes(32).toString('base64url');
  req.session.oauthState = state;
  req.session.oauthNext = next;
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    state
  });
  res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
});

/**
 * GET /auth/callback — Handle OAuth2 callback
 */
router.get('/callback', async (req, res) => {
  const code = req.query.code;
  const state = req.query.state;
  const expectedState = req.session.oauthState;
  const receivedState = typeof state === 'string' ? Buffer.from(state) : null;
  const expectedStateBuffer = typeof expectedState === 'string' ? Buffer.from(expectedState) : null;
  if (!code || !receivedState || !expectedStateBuffer || receivedState.length !== expectedStateBuffer.length || !crypto.timingSafeEqual(receivedState, expectedStateBuffer)) {
    return res.redirect('/?error=invalid_oauth_state');
  }

  const next = req.session.oauthNext || '/servers';
  delete req.session.oauthState;
  delete req.session.oauthNext;

  try {
    // Exchange code for tokens
    const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI
      })
    });

    if (!tokenRes.ok) {
      const errorData = await tokenRes.json().catch(() => ({}));
      console.error('[auth] Token exchange failed:', tokenRes.status, errorData);
      return res.redirect(`/?error=token_failed&status=${tokenRes.status}`);
    }

    const tokens = await tokenRes.json();

    // Fetch user profile
    const userRes = await fetch(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    if (!userRes.ok) return res.redirect('/?error=user_fetch_failed');
    const user = await userRes.json();

    // Fetch user guilds
    const guildsRes = await fetch(`${DISCORD_API}/users/@me/guilds`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const guilds = guildsRes.ok ? await guildsRes.json() : [];

    // Store in session
    req.session.user = {
      id: user.id,
      username: user.username,
      globalName: user.global_name || user.username,
      discriminator: user.discriminator,
      avatar: user.avatar,
      avatarUrl: user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${user.avatar.startsWith('a_') ? 'gif' : 'webp'}?size=256`
        : `https://cdn.discordapp.com/embed/avatars/${(BigInt(user.id) >> 22n) % 6n}.png`
    };
    req.session.guilds = guilds.map(g => ({
      id: g.id,
      name: g.name,
      icon: g.icon,
      owner: g.owner,
      permissions: g.permissions,
      iconUrl: g.icon
        ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.${g.icon.startsWith('a_') ? 'gif' : 'webp'}?size=128`
        : null
    }));
    // OAuth tokens are used only for this callback and are not retained in the session.
    // The dashboard subsequently authorizes requests using the Discord user ID and guild membership.
    const safeNext = typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') ? next : '/servers';
    const dashboardBase = DASHBOARD_URL.replace(/\/+$/, '');

    // Persist the Mongo-backed session before redirecting. Without this,
    // the browser can arrive at Vercel before the session write completes,
    // causing /api/me and /api/guilds to see an unauthenticated request.
    req.session.save((saveErr) => {
      if (saveErr) {
        console.error('[auth] Session save failed:', saveErr);
        return res.redirect(`${dashboardBase}/?error=session_failed`);
      }
      res.redirect(`${dashboardBase}${safeNext}`);
    });
  } catch (err) {
    console.error('[auth] OAuth2 callback error:', err);
    res.redirect('/?error=auth_failed');
  }
});

/**
 * GET /auth/logout — Destroy session
 */
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

/**
 * GET /auth/me — Return current user info
 */
router.get('/me', (req, res) => {
  if (!req.session?.user) {
    return res.status(401).json({ authenticated: false });
  }
  res.json({
    authenticated: true,
    user: req.session.user,
    guilds: req.session.guilds || []
  });
});

module.exports = router;
