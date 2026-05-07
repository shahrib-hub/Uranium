// Rank card PNG generator with themes: dark, light, neon
// Uses node-canvas
const { createCanvas, loadImage } = require('canvas');

const THEMES = {
  dark: { bg: '#1f1f1f', fg: '#ffffff', accent: '#5865F2', barBg: '#2b2b2b' },
  light: { bg: '#f5f5f5', fg: '#111111', accent: '#5865F2', barBg: '#e5e5e5' },
  neon: { bg: '#0a0a0a', fg: '#39ff14', accent: '#00e5ff', barBg: '#111111' }
};

async function generateRankCard({
  avatarUrl,
  username,
  discriminator,
  level,
  xp,
  xpNeeded,
  rank,
  badges = [],
  theme = 'dark'
}) {
  const t = THEMES[theme] || THEMES.dark;
  const width = 900, height = 300;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, width, height);

  // Accent stripe
  ctx.fillStyle = t.accent;
  ctx.fillRect(0, 0, 8, height);

  // Avatar
  try {
    const avatar = await loadImage(avatarUrl);
    ctx.save();
    ctx.beginPath();
    ctx.arc(150, 150, 100, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, 50, 50, 200, 200);
    ctx.restore();
  } catch (e) {
    // ignore avatar load errors
  }

  // Username
  ctx.fillStyle = t.fg;
  ctx.font = 'bold 40px Sans-serif';
  ctx.fillText(username, 280, 110);

  // Discriminator
  if (discriminator) {
    ctx.font = '24px Sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText(`#${discriminator}`, 280, 145);
  }

  // Level and rank
  ctx.font = 'bold 28px Sans-serif';
  ctx.fillStyle = t.fg;
  ctx.fillText(`Level: ${level}`, 280, 190);
  ctx.fillText(`Rank: #${rank ?? '—'}`, 450, 190);

  // XP bar
  const barX = 280, barY = 220, barW = 580, barH = 24;
  ctx.fillStyle = t.barBg;
  roundRect(ctx, barX, barY, barW, barH, 12);
  ctx.fill();

  const progress = Math.max(0, Math.min(1, xpNeeded > 0 ? xp / xpNeeded : 0));
  ctx.fillStyle = t.accent;
  roundRect(ctx, barX, barY, Math.max(6, Math.floor(barW * progress)), barH, 12);
  ctx.fill();

  ctx.font = '20px Sans-serif';
  ctx.fillStyle = t.fg;
  ctx.fillText(`${xp} / ${xpNeeded} XP`, barX, barY + 50);

  // Badges (simple circles)
  if (badges && badges.length) {
    ctx.font = '18px Sans-serif';
    ctx.fillStyle = t.fg;
    ctx.fillText(`Badges:`, barX, barY + 85);
    badges.slice(0, 6).forEach((b, i) => {
      ctx.fillStyle = t.accent;
      ctx.beginPath();
      ctx.arc(barX + 70 + i * 30, barY + 78, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = t.fg;
      ctx.font = '14px Sans-serif';
      ctx.fillText(b.slice(0, 1).toUpperCase(), barX + 64 + i * 30, barY + 83);
    });
  }

  return canvas.toBuffer('image/png');
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

module.exports = { generateRankCard };
