// Prism Quest — particle & spell-effect layer (full-screen canvas above all UI)

const RAINBOW = ['#ff5c8a', '#ffb84a', '#ffe94a', '#5cff8a', '#5cc9ff', '#b45cff'];

const FX = { canvas: null, ctx: null, parts: [], beams: [], last: 0 };

function fxInit() {
  FX.canvas = document.getElementById('fx');
  FX.ctx = FX.canvas.getContext('2d');
  fxResize();
  window.addEventListener('resize', fxResize);
  requestAnimationFrame(fxFrame);
}

function fxResize() {
  const dpr = window.devicePixelRatio || 1;
  FX.canvas.width = window.innerWidth * dpr;
  FX.canvas.height = window.innerHeight * dpr;
  FX.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// classic 4-point sparkle
function drawStar(ctx, x, y, s, color, rot = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.quadraticCurveTo(s * 0.18, -s * 0.18, s, 0);
  ctx.quadraticCurveTo(s * 0.18, s * 0.18, 0, s);
  ctx.quadraticCurveTo(-s * 0.18, s * 0.18, -s, 0);
  ctx.quadraticCurveTo(-s * 0.18, -s * 0.18, 0, -s);
  ctx.fill();
  ctx.restore();
}

function fxFrame(ts) {
  const dt = Math.min(0.05, (ts - FX.last) / 1000 || 0.016);
  FX.last = ts;
  const ctx = FX.ctx;
  const dpr = window.devicePixelRatio || 1;
  if (FX.canvas.width !== Math.round(window.innerWidth * dpr)) fxResize();
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  // beams (rainbow rays)
  for (const b of FX.beams) {
    b.t += dt;
    const a = Math.max(0, 1 - b.t / b.life);
    if (a <= 0) continue;
    const ang = Math.atan2(b.y2 - b.y1, b.x2 - b.x1) + Math.PI / 2;
    const n = b.colors.length;
    ctx.lineCap = 'round';
    ctx.globalAlpha = a * 0.35;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = b.width * n * 1.6;
    ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * b.gap;
      const ox = Math.cos(ang) * off, oy = Math.sin(ang) * off;
      const wob = Math.sin(b.t * 30 + i * 2) * 2;
      ctx.globalAlpha = a * 0.95;
      ctx.strokeStyle = b.colors[i];
      ctx.lineWidth = b.width;
      ctx.beginPath();
      ctx.moveTo(b.x1 + ox, b.y1 + oy);
      ctx.lineTo(b.x2 + ox + wob, b.y2 + oy + wob);
      ctx.stroke();
    }
  }
  FX.beams = FX.beams.filter(b => b.t < b.life);

  // particles
  const spawn = [];
  for (const p of FX.parts) {
    p.t += dt;
    if (p.tx !== undefined) { // mover: travels to a target, then fires onArrive
      const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy);
      const step = p.speed * dt;
      if (d <= step) {
        p.x = p.tx; p.y = p.ty;
        if (p.onArrive) { p.onArrive(); p.onArrive = null; }
        p.t = p.life;
      } else {
        p.flip = dx < 0; // sprites face right by default; flip when heading left
        p.x += dx / d * step;
        p.y += dy / d * step;
        if (p.trail) spawn.push({
          x: p.x, y: p.y + 12, vx: (Math.random() - 0.5) * 50, vy: 30 + Math.random() * 50,
          g: 90, drag: 1, life: 0.55, t: 0, size: 4,
          color: RAINBOW[Math.floor(p.t * 14) % 6],
        });
      }
    } else {
      p.vy += (p.g || 0) * dt;
      const dr = 1 - (p.drag || 0) * dt;
      p.vx *= dr; p.vy *= dr;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.wob) p.x += Math.sin(p.t * p.wob + (p.seed || 0)) * 46 * dt;
    }
    p.rot = (p.rot || 0) + (p.spin || 0) * dt;
    const k = 1 - p.t / p.life;
    if (k <= 0) continue;
    ctx.globalAlpha = k;
    if (p.ring) {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (p.t / p.life), 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.sprite) {
      drawSprite(ctx, p.sprite, p.x, p.y, p.size, { flip: p.flip });
    } else if (p.emoji) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.font = `${p.size}px "Segoe UI Emoji", serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.emoji, 0, 0);
      ctx.restore();
    } else if (p.star) {
      drawStar(ctx, p.x, p.y, Math.max(1, p.size * k * 1.6), p.color, p.rot);
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, p.size * k), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  FX.parts = FX.parts.filter(p => p.t < p.life);
  FX.parts.push(...spawn);
  requestAnimationFrame(fxFrame);
}

// ---------- emitters ----------

function fxBurst(x, y, opts = {}) {
  const { count = 20, colors = RAINBOW, speed = 240, size = 5, life = 0.9,
          g = 300, emoji = null, star = false, spread = Math.PI * 2, dir = -Math.PI / 2, drag = 1 } = opts;
  for (let i = 0; i < count; i++) {
    const ang = dir + (Math.random() - 0.5) * spread;
    const v = speed * (0.35 + Math.random() * 0.65);
    FX.parts.push({
      x, y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, g, drag,
      life: life * (0.6 + Math.random() * 0.6), t: 0,
      size: emoji ? size : size * (0.6 + Math.random() * 0.8),
      color: colors[Math.floor(Math.random() * colors.length)],
      emoji: emoji ? emoji[Math.floor(Math.random() * emoji.length)] : null,
      star, spin: (Math.random() - 0.5) * 8, rot: Math.random() * 6.3,
    });
  }
}

function fxRing(x, y, color, maxR = 80) {
  FX.parts.push({ x, y, ring: true, color, size: maxR, life: 0.65, t: 0 });
}

function fxRise(x, y, emojis, count = 10) {
  for (let i = 0; i < count; i++) {
    FX.parts.push({
      x: x + (Math.random() - 0.5) * 90, y: y + Math.random() * 30,
      vx: (Math.random() - 0.5) * 40, vy: -60 - Math.random() * 80, g: -20,
      life: 1.3 + Math.random() * 0.6, t: 0, size: 14 + Math.random() * 10,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      spin: (Math.random() - 0.5) * 2,
    });
  }
}

function fxFlutter(x, y, count = 8) {
  for (let i = 0; i < count; i++) {
    FX.parts.push({
      x: x + (Math.random() - 0.5) * 120, y: y + (Math.random() - 0.5) * 60,
      vx: (Math.random() - 0.5) * 30, vy: -40 - Math.random() * 50,
      wob: 6 + Math.random() * 4, seed: Math.random() * 6.3,
      life: 1.6 + Math.random() * 0.5, t: 0, size: 15 + Math.random() * 8, emoji: '🦋',
    });
  }
}

function fxBeam(x1, y1, x2, y2) {
  FX.beams.push({ x1, y1, x2, y2, colors: RAINBOW, gap: 5, width: 4.5, life: 0.6, t: 0 });
  for (let i = 0; i < 12; i++) {
    const f = Math.random();
    FX.parts.push({
      x: x1 + (x2 - x1) * f, y: y1 + (y2 - y1) * f + (Math.random() - 0.5) * 20,
      vx: (Math.random() - 0.5) * 80, vy: (Math.random() - 0.5) * 80 - 40, g: 200, drag: 1,
      life: 0.7 + Math.random() * 0.4, t: 0, size: 4 + Math.random() * 3,
      color: RAINBOW[i % 6], star: true, spin: 5,
    });
  }
}

function fxConfetti(x, y, count = 50) {
  for (let i = 0; i < count; i++) {
    const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
    const v = 220 + Math.random() * 320;
    FX.parts.push({
      x, y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, g: 520, drag: 0.6,
      life: 1.1 + Math.random() * 0.7, t: 0, size: 4 + Math.random() * 4,
      color: RAINBOW[i % 6], star: Math.random() < 0.4, spin: (Math.random() - 0.5) * 10,
    });
  }
  fxBurst(x, y, { count: 5, emoji: ['🎉', '✨', '🎊'], speed: 220, size: 22, g: 300, life: 1.4 });
}

function fxUnicornSummon(at) {
  FX.parts.push({
    x: at.x - 280, y: at.y - 30, tx: at.x + 44, ty: at.y - 10,
    speed: 430, sprite: 'unicorn', size: 64, life: 5, t: 0, trail: true,
    onArrive: () => {
      fxBurst(at.x + 44, at.y - 10, { count: 22, colors: RAINBOW, star: true, speed: 240 });
      fxRise(at.x + 30, at.y, ['💖', '✨', '🌈'], 8);
    },
  });
}

function fxUnicornStrike(from, to) {
  FX.parts.push({
    x: from.x + 30, y: from.y - 10, tx: to.x, ty: to.y,
    speed: 560, sprite: 'unicorn', size: 54, life: 4, t: 0, trail: true,
    onArrive: () => fxBurst(to.x, to.y, { count: 20, colors: RAINBOW, star: true, speed: 280 }),
  });
  fxRise(from.x, from.y, ['💖', '✨'], 5);
}

function fxStardust(to) {
  for (let i = 0; i < 20; i++) {
    FX.parts.push({
      x: to.x + (Math.random() - 0.5) * 280, y: to.y - 200 - Math.random() * 140,
      vx: (Math.random() - 0.5) * 30, vy: 300 + Math.random() * 180, g: 60,
      life: 0.9 + Math.random() * 0.5, t: 0, size: 15 + Math.random() * 13,
      emoji: ['⭐', '✨', '🌟'][Math.floor(Math.random() * 3)],
      spin: (Math.random() - 0.5) * 4,
    });
  }
  setTimeout(() => {
    fxBurst(to.x, to.y, { count: 34, colors: ['#ffffff', '#ffe94a', '#b45cff'], star: true, speed: 360, life: 1 });
    fxRing(to.x, to.y, '#ffe94a', 110);
  }, 450);
}

// one dispatcher per spell — the fireworks catalog
function spellFX(id, from, to) {
  switch (id) {
    case 'glitterbomb':
      fxBurst(to.x, to.y, { count: 30, colors: RAINBOW, star: true, speed: 320, life: 0.9 });
      fxBurst(to.x, to.y, { count: 6, emoji: ['✨', '🎆'], speed: 160, size: 18, life: 1, g: 150 });
      break;
    case 'rainbowbeam':
      fxBeam(from.x, from.y, to.x, to.y);
      fxBurst(to.x, to.y, { count: 26, colors: RAINBOW, star: true, speed: 300 });
      break;
    case 'sunflare':
      fxRing(to.x, to.y, '#ffd24a', 90);
      fxBurst(to.x, to.y, { count: 30, colors: ['#ffd24a', '#ff8a5c', '#fff3b0'], speed: 260, g: -80, life: 1 });
      fxBurst(to.x, to.y, { count: 4, emoji: ['🔥', '☀️'], speed: 120, size: 20, g: -60 });
      break;
    case 'tidepop':
      fxBurst(to.x, to.y - 30, { count: 26, colors: ['#4fd8e0', '#9fe9ff', '#ffffff'], speed: 240, g: 520, life: 1 });
      fxBurst(to.x, to.y, { count: 5, emoji: ['💧', '🫧'], speed: 150, size: 16, g: 300 });
      break;
    case 'butterflyswarm':
      fxFlutter(to.x, to.y + 20, 9);
      fxBurst(to.x, to.y, { count: 14, colors: ['#b06ee8', '#39c26d', '#ffffff'], star: true, speed: 180 });
      break;
    case 'bloomheal':
      fxRing(from.x, from.y, '#f77fb0', 80);
      fxRise(from.x, from.y + 10, ['🌸', '💮', '✨'], 12);
      break;
    case 'prismshield':
      fxRing(from.x, from.y, '#8fb7ff', 60);
      fxRing(from.x, from.y, '#d9e6ff', 95);
      fxBurst(from.x, from.y, { count: 12, colors: ['#8fb7ff', '#ffffff'], star: true, speed: 140, g: 0, life: 0.7 });
      break;
    case 'unicorn':
      fxUnicornSummon(from);
      break;
    case 'stardust':
      fxStardust(to);
      break;
  }
}
