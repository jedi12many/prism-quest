// Prism Quest — pixel-art sprite engine.
// Sprites are 16x16 pixel grids defined in code and baked to offscreen canvases
// at first use, then blitted nearest-neighbour. `mirror` sprites author the left
// 8 columns and reflect them, keeping symmetric characters clean and cheap.

const SPR_N = 16;
const SPR_SCALE = 6; // native bake = 96px; drawn scaled per actor

// shared palette keys used across sprites (per-sprite `pal` can override)
function bakeSprite(key) {
  const def = SPRITES[key];
  if (!def) return null;
  if (def._c) return def._c;
  const c = document.createElement('canvas');
  c.width = SPR_N * SPR_SCALE;
  c.height = SPR_N * SPR_SCALE;
  const x = c.getContext('2d');
  for (let r = 0; r < SPR_N; r++) {
    const row = def.rows[r] || '';
    for (let col = 0; col < SPR_N; col++) {
      const ch = def.mirror ? (col < 8 ? row[col] : row[15 - col]) : row[col];
      const color = ch && def.pal[ch];
      if (!color) continue;
      x.fillStyle = color;
      x.fillRect(col * SPR_SCALE, r * SPR_SCALE, SPR_SCALE, SPR_SCALE);
    }
  }
  def._c = c;
  return c;
}

function hasSprite(key) { return !!SPRITES[key]; }

// draw a baked sprite centred at (cx, cy), sized to sizePx, optional h-flip + bob
function drawSprite(ctx, key, cx, cy, sizePx, opts = {}) {
  const c = bakeSprite(key);
  if (!c) return false;
  const prev = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.save();
  ctx.translate(cx, cy + (opts.bob || 0));
  if (opts.flip) ctx.scale(-1, 1);
  if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
  ctx.drawImage(c, -sizePx / 2, -sizePx / 2, sizePx, sizePx);
  ctx.restore();
  ctx.imageSmoothingEnabled = prev;
  return true;
}

// soft ground shadow under an actor
function drawShadow(ctx, cx, cy, w) {
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(cx, cy, w * 0.5, w * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ---- palettes ----
const P = {
  o: '#231a38',   // near-black outline
  W: '#ffffff',
  sk: '#f6c99a', skS: '#d89f6f',       // skin + shade
};

const SPRITES = {
  // ---------- player classes ----------
  player_mage: {
    mirror: true,
    pal: { '.': null, o: P.o, s: P.sk, S: P.skS, e: P.o, n: P.o, r: '#6b5cff', R: '#463bbf', B: '#2f2596', w: '#eaf0ff', y: '#ffd24a' },
    rows: [
      '.......y', '......yy', '.....oyy', '....orrB', '...orrrB', '..orrrrr',
      '.ooooooo', '...ossss', '...osens', '...osssS', '..owwwww',
      '..orrrrr', '.orrrrrr', '.orRrrrr', '.oRRRRRR', '..oo....',
    ],
  },
  player_knight: {
    mirror: true,
    pal: { '.': null, o: P.o, e: P.o, a: '#9fb7d8', A: '#6d84a8', b: '#7fd0ff', g: '#ffd24a' },
    rows: [
      '.....gg.', '....gaag', '...oaaaa', '...oaeaa', '...oaaaa', '..oaaaaa',
      '..oaAaaa', '.oaaaaaa', '.oaAaaaa', '.oaaaaaa', '.oaaaaaa',
      '.obaaaab', '.oaaaaaa', '.oaAAaaa', '..oaaaaa', '..oo....',
    ],
  },
  player_whisperer: {
    mirror: true,
    pal: { '.': null, o: P.o, s: P.sk, S: P.skS, e: P.o, n: P.o, h: '#f5a0d8', H: '#d873b8', r: '#b06ee8', R: '#8f52c4', w: '#ffffff', y: '#ffd24a' },
    rows: [
      '....wy..', '...whw..', '...ohho.', '..ohhhhh', '..ohhsss', '..ohsens',
      '..ohsssS', '..ohhsss', '.orhhhhr', '.orrrrrr', '.orHrrrr',
      '.orrrrrr', '.orrHrrr', '.oRRRRRR', '..oo.oo.', '........',
    ],
  },

  // ---------- common monsters ----------
  slime: {
    mirror: true,
    pal: { '.': null, o: '#186b2e', g: '#4fc85f', d: '#37a049', l: '#9cf0a6', e: '#ffffff', p: '#186b2e' },
    rows: [
      '........', '........', '.....ooo', '...oollg', '..olllgg', '..olgggg',
      '.olggggg', '.olggeeg', '.olggeeg', '.olggppg', '.olgggpg',
      '.olggggg', '.odggggg', '.oddgggg', '..oddddo', '...ooo..',
    ],
  },
  bat: {
    mirror: true,
    pal: { '.': null, o: '#241a30', b: '#7a5fae', B: '#5a4487', e: '#ffd24a', f: '#ffffff' },
    rows: [
      '........', '........', '......bb', '.....obb', 'oo...bbb', 'obbo.bbb',
      'obbbobbb', 'obbbbbbb', 'obbebbbb', 'obbbbbbb', 'obbbBbbb',
      '.obbbobb', '..obb.bb', '....obbb', '.....obb', '......oo',
    ],
  },
  fox: {
    mirror: true,
    pal: { '.': null, o: '#3a2214', f: '#f08a3c', F: '#c96a24', w: '#ffe9d0', e: '#231a38' },
    rows: [
      '........', '.oo.....', '.ofo....', '.offo...', '.offfo..', '.offffo.',
      '.offffff', '.offewff', '.offwwff', '.ofwwwwf', '.offffff',
      '..offfff', '..oFffff', '..offwwf', '..offfff', '..oo....',
    ],
  },
  shroom: {
    mirror: true,
    pal: { '.': null, o: '#5a2a3a', c: '#e0556b', C: '#b83a55', s: '#f3e6d0', S: '#d8c4a8', e: '#5a2a3a', w: '#ffffff' },
    rows: [
      '........', '....ooo.', '..oocccc', '.occwccc', '.occcccc', 'occCcccc',
      'occccwcc', '.oCccccc', '...osss.', '...osess', '...ossss',
      '...osssS', '...ossss', '...osssS', '..oossso', '..oo..oo',
    ],
  },
  golem: {
    mirror: true,
    pal: { '.': null, o: '#2f2a3a', r: '#8a8496', R: '#615c70', l: '#b4afc0', e: '#8fe0ff', c: '#c86bff' },
    rows: [
      '........', '..oooo..', '.orrrrl.', '.orRrrr.', '.oreercr', '.orrrrrr',
      'oorrrrrr', 'oRoRrrrr', 'oRorrrrr', '.orrcrrr', '.orrrrrr',
      '.orRrrRr', '.oRr.oRr', '.oRo.oRo', '.ooo.ooo', '........',
    ],
  },
  gazer: {
    mirror: true,
    pal: { '.': null, o: '#1a1230', b: '#3a2f6a', B: '#2a2050', e: '#ffffff', p: '#1a1230', v: '#b45cff', t: '#7a4fd0' },
    rows: [
      '........', '...ooo..', '..obbbb.', '.obBbbbb', '.obeeeeb', '.obeppeb',
      '.obeppeb', '.obeeeeb', '.obBbbbb', '..obbbb.', '..otvt..',
      '.otvtvt.', 'otv.t.vt', 'ot.....t', '.t.....t', '........',
    ],
  },
  spawnling: {
    mirror: true,
    pal: { '.': null, o: '#2a1240', v: '#9a3fd0', V: '#6f2aa0', e: '#7cff9c', t: '#5a1f8a', p: '#2a1240' },
    rows: [
      '........', '...ooo..', '..ovvvv.', '.ovVvvvv', '.oveevvv', '.ovepvvv',
      '.ovvvvvv', '.oVvvvvv', '.ovtvtvt', 'ootvtvtv', 'ot.t.t.t',
      '........', '........', '........', '........', '........',
    ],
  },
};

// debug: draw a labelled contact sheet of every sprite (toggle window.__spriteSheet)
function drawSpriteSheet() {
  const ctx = G.ctx, W = window.innerWidth, H = window.innerHeight;
  ctx.fillStyle = '#2a2440';
  ctx.fillRect(0, 0, W, H);
  const keys = Object.keys(SPRITES);
  const cell = 104, cols = Math.max(1, Math.floor((W - 24) / cell)), pad = 16;
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  keys.forEach((k, i) => {
    const cx = pad + (i % cols) * cell + cell / 2;
    const cy = pad + Math.floor(i / cols) * cell + cell / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(cx - cell / 2 + 4, cy - cell / 2 + 4, cell - 8, cell - 8);
    drawShadow(ctx, cx, cy + 32, 46);
    drawSprite(ctx, k, cx, cy, 80);
    ctx.fillStyle = '#fff'; ctx.font = '11px system-ui';
    ctx.fillText(k, cx, cy + 40);
  });
}

// map a monster type / player class to its sprite key (falls back to emoji)
const MONSTER_SPRITE = {
  slime: 'slime', bat: 'bat', fox: 'fox', shroom: 'shroom', golem: 'golem',
  gazer: 'gazer', spawnling: 'spawnling',
};
function playerSpriteKey() {
  return 'player_' + (G.state ? G.state.classId : 'mage');
}

// cached data URL for DOM <img> use (battle screen, etc.)
const SPR_URL = {};
function spriteDataURL(key) {
  if (SPR_URL[key] !== undefined) return SPR_URL[key];
  const c = bakeSprite(key);
  SPR_URL[key] = c ? c.toDataURL() : null;
  return SPR_URL[key];
}

// html for an actor: pixel sprite <img> when available, else the emoji
function actorHTML(spriteKey, emoji, px) {
  const url = spriteKey && hasSprite(spriteKey) ? spriteDataURL(spriteKey) : null;
  return url ? `<img class="sprImg" src="${url}" width="${px}" height="${px}" alt="">` : emoji;
}
