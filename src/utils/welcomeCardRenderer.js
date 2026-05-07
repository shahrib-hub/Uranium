// src/utils/welcomeCardRenderer.js
const { createCanvas, loadImage, registerFont } = require('canvas');
const fetch = require('node-fetch'); // if you have native fetch, you can replace this

// Optional: register a bundled font for consistent rendering
// registerFont(path.join(__dirname, '../assets/fonts/Inter-Bold.ttf'), { family: 'Inter' });

const WIDTH = 1024;
const HEIGHT = 450;

/**
 * Draw circular clipped image from given URL (cover-fit).
 */
async function drawCircularImage(ctx, imageUrl, x, y, size) {
  if (!imageUrl) return;
  try {
    const res = await fetch(imageUrl);
    const arrayBuffer = await res.arrayBuffer();
    const img = await loadImage(Buffer.from(arrayBuffer));
    const radius = size / 2;
    const cx = x + radius;
    const cy = y + radius;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // cover-style draw
    const scale = Math.max(size / img.width, size / img.height);
    const iw = img.width * scale;
    const ih = img.height * scale;
    const ix = cx - iw / 2;
    const iy = cy - ih / 2;
    ctx.drawImage(img, ix, iy, iw, ih);

    ctx.restore();

    // subtle ring
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.stroke();
  } catch (err) {
    // swallow avatar errors
    console.warn('[welcomeCard] avatar load failed:', err?.message || err);
  }
}

/**
 * Soft radial glow helper.
 */
function radialGlow(ctx, cx, cy, r, color) {
  const g = ctx.createRadialGradient(cx, cy, r * 0.05, cx, cy, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Generate welcome card PNG buffer.
 * opts: { username, discriminator, avatarUrl, guildName, memberCount, templateIndex (1..10) }
 */
async function generateWelcomeCard(opts = {}) {
  const {
    username = 'New Member',
    discriminator = '0000',
    avatarUrl = null,
    guildName = 'Server',
    memberCount = null,
    templateIndex = 1
  } = opts;

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  const uname = `${username}#${discriminator}`.slice(0, 40);
  const guild = String(guildName).slice(0, 40);
  const countText = memberCount ? `Member #${memberCount}` : '';

  const tpl = Math.min(Math.max(Number(templateIndex) || 1, 1), 10);

  // Shared small helpers
  function drawWatermark() {
    ctx.font = '14px Sans';
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.textAlign = 'right';
    ctx.fillText(guild, WIDTH - 24, HEIGHT - 18);
    ctx.textAlign = 'start';
  }

  // --- Templates ---
  switch (tpl) {
    case 1: {
      // Modern gradient banner + left avatar
      const g = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
      g.addColorStop(0, '#0f172a');
      g.addColorStop(1, '#0f6b9a');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.globalAlpha = 0.08;
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#000000';
        ctx.beginPath();
        ctx.ellipse(120 + i * 160, 80 + (i % 3) * 30, 420 - i * 60, 120 + i * 10, -0.25, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // panel
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fillRect(48, 64, 420, HEIGHT - 128);

      await drawCircularImage(ctx, avatarUrl, 100, 110, 220);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px Sans';
      ctx.fillText('Welcome,', 560, 160);

      ctx.font = 'bold 48px Sans';
      ctx.fillText(uname, 560, 220);

      ctx.font = '20px Sans';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText(guild, 560, 260);

      if (countText) {
        ctx.font = '18px Sans';
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.fillText(countText, 560, 296);
      }

      drawWatermark();
      break;
    }

    case 2: {
      // Warm swoosh
      const g = ctx.createLinearGradient(0, 0, WIDTH, 0);
      g.addColorStop(0, '#f6d365');
      g.addColorStop(1, '#fda085');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.beginPath();
      ctx.moveTo(0, HEIGHT * 0.62);
      ctx.quadraticCurveTo(WIDTH * 0.25, HEIGHT * 0.55, WIDTH * 0.45, HEIGHT * 0.7);
      ctx.quadraticCurveTo(WIDTH * 0.7, HEIGHT * 0.85, WIDTH, HEIGHT * 0.7);
      ctx.lineTo(WIDTH, HEIGHT);
      ctx.lineTo(0, HEIGHT);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#1f1f1f';
      ctx.font = 'bold 64px Sans';
      ctx.fillText('Welcome!', 60, 140);

      ctx.font = 'bold 44px Sans';
      ctx.fillText(uname, 60, 210);

      await drawCircularImage(ctx, avatarUrl, WIDTH - 320, 80, 240);

      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.font = '22px Sans';
      ctx.fillText(guild, 60, 260);

      drawWatermark();
      break;
    }

    case 3: {
      // Dark neon
      ctx.fillStyle = '#0b0f1a';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.strokeStyle = 'rgba(126,249,255,0.06)';
      ctx.lineWidth = 6;
      ctx.strokeRect(24, 24, WIDTH - 48, HEIGHT - 48);

      const accent = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
      accent.addColorStop(0, '#7ef9ff');
      accent.addColorStop(1, '#c77dff');
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.06;
      ctx.fillRect(0, HEIGHT * 0.55, WIDTH, HEIGHT * 0.45);
      ctx.globalAlpha = 1;

      await drawCircularImage(ctx, avatarUrl, 60, 100, 220);
      radialGlow(ctx, 170, 210, 160, 'rgba(126,249,255,0.08)');

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 42px Sans';
      ctx.fillText(uname, 320, 170);

      ctx.font = '20px Sans';
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText('joined', 320, 210);

      ctx.font = '28px Sans';
      ctx.fillStyle = '#c77dff';
      ctx.fillText(guild, 320, 260);

      drawWatermark();
      break;
    }

    case 4: {
      // Minimal banner
      ctx.fillStyle = '#eef2ff';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(40, 40, WIDTH - 80, 140);

      ctx.fillStyle = 'rgba(0,0,0,0.04)';
      ctx.fillRect(40, 186, WIDTH - 80, 6);

      await drawCircularImage(ctx, avatarUrl, 80, 60, 120);

      ctx.fillStyle = '#111827';
      ctx.font = 'bold 36px Sans';
      ctx.fillText(uname, 220, 110);

      ctx.font = '20px Sans';
      ctx.fillStyle = 'rgba(17,24,39,0.7)';
      ctx.fillText(`Welcome to ${guild}`, 220, 145);

      if (countText) {
        ctx.font = '18px Sans';
        ctx.fillStyle = '#6b7280';
        ctx.fillText(countText, 220, 175);
      }

      drawWatermark();
      break;
    }

    case 5: {
      // Playful colorful
      const g = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
      g.addColorStop(0, '#ff7a7a');
      g.addColorStop(0.5, '#ffd27a');
      g.addColorStop(1, '#7affc2');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      for (let i = 0; i < 60; i++) {
        ctx.fillStyle = `rgba(${Math.round(Math.random()*255)}, ${Math.round(Math.random()*255)}, ${Math.round(Math.random()*255)}, 0.12)`;
        const rx = Math.random() * WIDTH;
        const ry = Math.random() * HEIGHT;
        const r = 6 + Math.random() * 10;
        ctx.beginPath();
        ctx.ellipse(rx, ry, r, r, Math.random()*Math.PI, 0, Math.PI*2);
        ctx.fill();
      }

      ctx.fillStyle = '#06121a';
      ctx.font = 'bold 64px Sans';
      ctx.textAlign = 'center';
      ctx.fillText('WELCOME', WIDTH / 2, 140);

      ctx.font = 'bold 42px Sans';
      ctx.fillText(uname, WIDTH / 2, 230);

      await drawCircularImage(ctx, avatarUrl, 64, HEIGHT - 170, 140);

      ctx.textAlign = 'left';
      ctx.font = '18px Sans';
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillText(guild, 240, HEIGHT - 110);
      if (countText) ctx.fillText(countText, 240, HEIGHT - 80);

      ctx.textAlign = 'start';
      drawWatermark();
      break;
    }

    case 6: {
      // Mosaic / geometric
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // geometric tiles
      for (let i = 0; i < 12; i++) {
        ctx.fillStyle = `rgba(${30 + i*10}, ${80 + i*8}, ${140 + i*6}, 0.06)`;
        ctx.beginPath();
        ctx.moveTo(i * 90, 0);
        ctx.lineTo((i + 1) * 90, 0);
        ctx.lineTo((i + 1) * 90, HEIGHT);
        ctx.lineTo(i * 90, HEIGHT);
        ctx.closePath();
        ctx.fill();
      }

      // center card
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      ctx.fillRect(120, 60, WIDTH - 240, HEIGHT - 120);

      await drawCircularImage(ctx, avatarUrl, WIDTH/2 - 110, 86, 220);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 44px Sans';
      ctx.fillText(uname, 120, 360);

      ctx.font = '22px Sans';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText(`Welcome to ${guild}`, 120, 394);

      if (countText) {
        ctx.font = '18px Sans';
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillText(countText, 120, 422);
      }

      drawWatermark();
      break;
    }

    case 7: {
      // Polaroid / photo
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // polaroid frame
      ctx.fillStyle = '#ffffff';
      const fw = 640, fh = 320, fx = 180, fy = 55;
      ctx.fillRect(fx, fy, fw, fh);
      ctx.fillStyle = 'rgba(0,0,0,0.03)';
      ctx.fillRect(fx, fy + fh, fw, 28);

      // avatar as photo
      await drawCircularImage(ctx, avatarUrl, fx + 30, fy + 30, 260);

      ctx.fillStyle = '#111827';
      ctx.font = 'bold 32px Sans';
      ctx.fillText(uname, fx + 320, fy + 110);

      ctx.font = '18px Sans';
      ctx.fillStyle = 'rgba(17,24,39,0.7)';
      ctx.fillText(`Welcome to ${guild}`, fx + 320, fy + 150);

      drawWatermark();
      break;
    }

    case 8: {
      // Comic / sticker style
      ctx.fillStyle = '#fff6ea';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // speech bubble
      ctx.fillStyle = '#ffefc7';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(48, 60, WIDTH - 96, HEIGHT - 140, 28) : null; // older node-canvas may not support roundRect
      ctx.fillRect(48, 60, WIDTH - 96, HEIGHT - 140);

      await drawCircularImage(ctx, avatarUrl, 80, 120, 180);

      ctx.fillStyle = '#2b2b2b';
      ctx.font = 'bold 42px Sans';
      ctx.fillText('Hey!', 300, 160);

      ctx.font = 'bold 36px Sans';
      ctx.fillText(uname, 300, 210);

      ctx.font = '18px Sans';
      ctx.fillStyle = '#4b5563';
      ctx.fillText(`joined ${guild}`, 300, 250);

      drawWatermark();
      break;
    }

    case 9: {
      // Glassmorphism style
      const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
      bg.addColorStop(0, '#0f172a');
      bg.addColorStop(1, '#08263b');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // translucent frosted panel
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(80, 50, WIDTH - 160, HEIGHT - 100);

      // frosted blur-like rings (simulated)
      radialGlow(ctx, WIDTH - 220, 130, 160, 'rgba(255,255,255,0.04)');
      radialGlow(ctx, 180, HEIGHT - 120, 120, 'rgba(255,255,255,0.03)');

      await drawCircularImage(ctx, avatarUrl, 120, 92, 180);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 40px Sans';
      ctx.fillText(uname, 340, 170);

      ctx.font = '20px Sans';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText(`Welcome to ${guild}`, 340, 206);

      drawWatermark();
      break;
    }

    case 10: {
      // Luxe gold card
      const g = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
      g.addColorStop(0, '#0b1220');
      g.addColorStop(1, '#1a1f2b');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // golden stripe
      ctx.fillStyle = '#b8872a';
      ctx.fillRect(48, 64, WIDTH - 96, 24);

      await drawCircularImage(ctx, avatarUrl, 80, 120, 200);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 44px Sans';
      ctx.fillText(uname, 320, 170);

      ctx.font = '20px Sans';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText(`Welcome to ${guild}`, 320, 206);

      if (countText) {
        ctx.font = '18px Sans';
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.fillText(countText, 320, 240);
      }

      // small gold accent at bottom
      ctx.fillStyle = 'rgba(184,135,42,0.08)';
      ctx.fillRect(48, HEIGHT - 76, WIDTH - 96, 48);

      drawWatermark();
      break;
    }

    default: {
      // fallback simple card
      ctx.fillStyle = '#111827';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      await drawCircularImage(ctx, avatarUrl, 64, 64, 160);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 42px Sans';
      ctx.fillText(`Welcome ${uname}`, 260, 140);

      ctx.font = '20px Sans';
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillText(`to ${guild}`, 260, 180);

      drawWatermark();
      break;
    }
  }

  // ensure defaults
  ctx.textAlign = 'start';

  return canvas.toBuffer('image/png');
}

module.exports = { generateWelcomeCard };