// src/utils/welcomeCardRenderer.js
const { createCanvas, loadImage } = require('canvas');
const axios = require('axios');

const WIDTH = 1024;
const HEIGHT = 500;

// Preset theme configurations
const THEMES = {
  modern_obsidian: {
    bgGradient: ['#090a0f', '#121420'],
    borderColor: 'rgba(255, 255, 255, 0.08)',
    avatarRing: '#f43f5e',
    avatarGlow: 'rgba(244, 63, 94, 0.35)',
    textColor: '#ffffff',
    subtextColor: '#8b91a7',
    badgeColor: '#f43f5e',
    badgeBg: 'rgba(244, 63, 94, 0.15)'
  },
  cyberpunk: {
    bgGradient: ['#0f0714', '#1f0d2b'],
    borderColor: 'rgba(236, 72, 153, 0.3)',
    avatarRing: '#ec4899',
    avatarGlow: 'rgba(236, 72, 153, 0.5)',
    textColor: '#ffffff',
    subtextColor: '#d946ef',
    badgeColor: '#06b6d4',
    badgeBg: 'rgba(6, 182, 212, 0.2)'
  },
  cosmic_aurora: {
    bgGradient: ['#080a1a', '#1e1b4b'],
    borderColor: 'rgba(168, 85, 247, 0.25)',
    avatarRing: '#a855f7',
    avatarGlow: 'rgba(168, 85, 247, 0.4)',
    textColor: '#ffffff',
    subtextColor: '#c084fc',
    badgeColor: '#a855f7',
    badgeBg: 'rgba(168, 85, 247, 0.2)'
  },
  minimal_frosted: {
    bgGradient: ['#12131a', '#1a1c27'],
    borderColor: 'rgba(255, 255, 255, 0.12)',
    avatarRing: '#3b82f6',
    avatarGlow: 'rgba(59, 130, 246, 0.3)',
    textColor: '#f1f3f9',
    subtextColor: '#94a3b8',
    badgeColor: '#3b82f6',
    badgeBg: 'rgba(59, 130, 246, 0.15)'
  },
  golden_royale: {
    bgGradient: ['#141008', '#261b0d'],
    borderColor: 'rgba(245, 158, 11, 0.3)',
    avatarRing: '#f59e0b',
    avatarGlow: 'rgba(245, 158, 11, 0.45)',
    textColor: '#ffffff',
    subtextColor: '#fbbf24',
    badgeColor: '#f59e0b',
    badgeBg: 'rgba(245, 158, 11, 0.2)'
  },
  emerald_horizon: {
    bgGradient: ['#06140e', '#0d281e'],
    borderColor: 'rgba(16, 185, 129, 0.25)',
    avatarRing: '#10b981',
    avatarGlow: 'rgba(16, 185, 129, 0.4)',
    textColor: '#ffffff',
    subtextColor: '#6ee7b7',
    badgeColor: '#10b981',
    badgeBg: 'rgba(16, 185, 129, 0.2)'
  }
};

/**
 * Fetch image buffer safely.
 */
async function fetchImageBuffer(url) {
  if (!url) return null;
  try {
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 5000 });
    return Buffer.from(res.data);
  } catch (err) {
    return null;
  }
}

/**
 * Draw circular clipped image with high-definition border ring and ambient glow.
 */
async function drawCircularAvatar(ctx, avatarBuffer, cx, cy, radius, ringColor, glowColor) {
  if (!avatarBuffer) return;
  try {
    const img = await loadImage(avatarBuffer);

    // Ambient glow behind avatar
    if (glowColor) {
      const g = ctx.createRadialGradient(cx, cy, radius * 0.8, cx, cy, radius + 25);
      g.addColorStop(0, glowColor);
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 25, 0, Math.PI * 2);
      ctx.fill();
    }

    // Outer accent ring
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 5, 0, Math.PI * 2);
    ctx.lineWidth = 4;
    ctx.strokeStyle = ringColor || '#f43f5e';
    ctx.stroke();

    // Clip circular avatar
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Cover-fit image
    const size = radius * 2;
    const scale = Math.max(size / img.width, size / img.height);
    const iw = img.width * scale;
    const ih = img.height * scale;
    ctx.drawImage(img, cx - iw / 2, cy - ih / 2, iw, ih);
    ctx.restore();
  } catch (err) {
    console.warn('[welcomeCardRenderer] Avatar draw error:', err?.message || err);
  }
}

/**
 * Generate high-definition welcome card PNG buffer.
 *
 * @param {Object} opts
 * @param {string} opts.username - User's username
 * @param {string} opts.discriminator - User's discriminator (or '0')
 * @param {string} opts.avatarUrl - Avatar URL
 * @param {string} opts.guildName - Server name
 * @param {number|string} opts.memberCount - Server member count
 * @param {string} opts.cardTheme - Theme key (modern_obsidian, cyberpunk, cosmic_aurora, etc.)
 * @param {string} opts.cardFont - Font family name
 * @param {string} opts.cardTextColor - Custom text color (hex)
 * @param {string} opts.cardBgColor - Custom background color (hex)
 * @param {number} opts.cardOverlayOpacity - Background overlay opacity (0-100)
 * @param {string} opts.cardBgImage - Background image URL or preset
 * @param {string} opts.cardTitle - Custom title template string (e.g. "{username} just joined the server")
 * @param {string} opts.cardSubtitle - Custom subtitle template string (e.g. "Member #{count}")
 * @param {boolean} opts.isGoodbye - True if rendering a goodbye card
 */
async function generateWelcomeCard(opts = {}) {
  const cc = opts.cardConfig || {};
  const {
    username = 'New Member',
    discriminator = '0',
    avatarUrl = null,
    guildName = 'Discord Server',
    memberCount = '1',
    cardTheme = opts.cardTheme || cc.theme || 'modern_obsidian',
    cardFont = opts.cardFont || cc.font || 'Inter',
    cardTextColor = opts.cardTextColor || cc.textColor || null,
    cardBgColor = opts.cardBgColor || cc.backgroundColor || null,
    cardOverlayOpacity = opts.cardOverlayOpacity ?? (cc.overlayOpacity != null ? Math.round(cc.overlayOpacity * 100) : 40),
    cardBgImage = opts.cardBgImage || cc.backgroundUrl || null,
    cardTitle = opts.cardTitle || cc.titleTemplate || null,
    cardSubtitle = opts.cardSubtitle || cc.subtitleTemplate || null,
    isGoodbye = opts.isGoodbye || false
  } = opts;

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  const theme = THEMES[cardTheme] || THEMES.modern_obsidian;

  // 1. Draw Background
  let customBgBuffer = null;
  if (cardBgImage && cardBgImage.startsWith('http')) {
    customBgBuffer = await fetchImageBuffer(cardBgImage);
  }

  if (customBgBuffer) {
    try {
      const bgImg = await loadImage(customBgBuffer);
      const scale = Math.max(WIDTH / bgImg.width, HEIGHT / bgImg.height);
      const w = bgImg.width * scale;
      const h = bgImg.height * scale;
      ctx.drawImage(bgImg, (WIDTH - w) / 2, (HEIGHT - h) / 2, w, h);
    } catch {
      // Fallback to gradient
    }
  } else {
    // Elegant gradient background
    const grad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    if (cardBgColor) {
      grad.addColorStop(0, cardBgColor);
      grad.addColorStop(1, '#050608');
    } else {
      grad.addColorStop(0, theme.bgGradient[0]);
      grad.addColorStop(1, theme.bgGradient[1]);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Subtle modern grid / dot accents
    ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
    for (let x = 30; x < WIDTH; x += 40) {
      for (let y = 30; y < HEIGHT; y += 40) {
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Darkening overlay (based on cardOverlayOpacity, robust to 0-1 and 0-100)
  let rawAlpha = cardOverlayOpacity;
  if (rawAlpha != null && rawAlpha <= 1 && rawAlpha > 0) {
    rawAlpha = rawAlpha * 100;
  }
  const overlayAlpha = Math.min(100, Math.max(0, rawAlpha != null ? rawAlpha : 40)) / 100;
  if (overlayAlpha > 0) {
    ctx.fillStyle = `rgba(8, 9, 14, ${overlayAlpha})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  // Outer framing border
  ctx.strokeStyle = theme.borderColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 16, WIDTH - 32, HEIGHT - 32);

  // Top header status tag: "WELCOME TO SERVER" or "GOODBYE"
  const tagText = isGoodbye ? `GOODBYE FROM ${guildName.toUpperCase()}` : `WELCOME TO ${guildName.toUpperCase()}`;
  ctx.font = 'bold 12px sans-serif';
  ctx.letterSpacing = '3px';
  ctx.textAlign = 'center';
  ctx.fillStyle = isGoodbye ? '#f87171' : theme.badgeColor;
  ctx.fillText(tagText.slice(0, 48), WIDTH / 2, 54);

  // 2. Fetch and draw Avatar (Centered at cx = WIDTH / 2, cy = 180, radius = 72)
  const cx = WIDTH / 2;
  const cy = 185;
  const avatarRadius = 72;

  let avatarBuffer = null;
  if (avatarUrl) {
    avatarBuffer = await fetchImageBuffer(avatarUrl);
  }

  if (avatarBuffer) {
    await drawCircularAvatar(ctx, avatarBuffer, cx, cy, avatarRadius, theme.avatarRing, theme.avatarGlow);
  } else {
    // Default placeholder circle with initial
    ctx.beginPath();
    ctx.arc(cx, cy, avatarRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#1e202e';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = theme.avatarRing;
    ctx.stroke();

    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText((username || '?')[0].toUpperCase(), cx, cy + 18);
  }

  // 3. Resolve Title & Subtitle text
  const cleanUser = username;
  const countStr = String(memberCount || '1');

  const replacePlaceholders = (str) => {
    if (!str) return '';
    return str
      .replace(/{server\.member_count}/gi, countStr)
      .replace(/{member_count}/gi, countStr)
      .replace(/{count}/gi, countStr)
      .replace(/{username}/gi, cleanUser)
      .replace(/{user}/gi, cleanUser)
      .replace(/{server}/gi, guildName)
      .replace(/{guild}/gi, guildName);
  };

  let titleStr = cardTitle;
  if (!titleStr) {
    titleStr = isGoodbye 
      ? `${cleanUser} just left the server` 
      : `${cleanUser} just joined the server`;
  } else {
    titleStr = replacePlaceholders(titleStr);
  }

  let subtitleStr = cardSubtitle;
  if (!subtitleStr) {
    subtitleStr = `Member #${countStr}`;
  } else {
    subtitleStr = replacePlaceholders(subtitleStr);
  }

  let fontFamily = 'Segoe UI, Arial, sans-serif';
  if (cardFont) {
    if (cardFont.includes('monospace') || cardFont === 'Orbitron') fontFamily = 'Courier New, monospace';
    else if (cardFont.includes('serif') && !cardFont.includes('sans-serif')) fontFamily = 'Georgia, serif';
    else if (cardFont.includes('Outfit') || cardFont.includes('sans-serif') || cardFont === 'Inter') fontFamily = 'Segoe UI, Arial, sans-serif';
    else fontFamily = cardFont;
  }

  const primaryTextColor = cardTextColor || theme.textColor;
  const secondaryTextColor = theme.subtextColor;


  // 4. Draw Title
  ctx.textAlign = 'center';
  ctx.font = `bold 32px ${fontFamily}`;
  ctx.fillStyle = primaryTextColor;

  // Subtle text shadow for crisp readability
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;
  ctx.fillText(titleStr.slice(0, 50), WIDTH / 2, 335);

  // 5. Draw Subtitle
  ctx.font = `500 20px ${fontFamily}`;
  ctx.fillStyle = secondaryTextColor;
  ctx.shadowBlur = 8;
  ctx.fillText(subtitleStr.slice(0, 60), WIDTH / 2, 385);

  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // 6. Member Count Pill Badge at Bottom Center
  const badgeWidth = 180;
  const badgeHeight = 32;
  const badgeX = (WIDTH - badgeWidth) / 2;
  const badgeY = 425;

  ctx.fillStyle = theme.badgeBg;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 16);
  ctx.fill();

  ctx.strokeStyle = theme.borderColor;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = theme.badgeColor;
  ctx.textAlign = 'center';
  ctx.fillText(`TOTAL MEMBERS: ${countStr}`, WIDTH / 2, badgeY + 20);

  return canvas.toBuffer('image/png');
}

module.exports = {
  generateWelcomeCard,
  renderWelcomeCard: generateWelcomeCard,
  THEMES
};