// src/dashboard/auth.js — Discord OAuth2 authentication routes
const { Router } = require('express');
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
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES
  });
  res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
});

/**
 * GET /auth/callback — Handle OAuth2 callback
 */
router.get('/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.redirect('/?error=no_code');

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
    req.session.accessToken = tokens.access_token;
    req.session.refreshToken = tokens.refresh_token;

    res.redirect('/servers');
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
