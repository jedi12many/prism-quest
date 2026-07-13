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

// draw a baked sprite centred at (cx, cy), sized to sizePx.
// opts: flip, bob, alpha, squashX/squashY (scale, anchored near the feet)
function drawSprite(ctx, key, cx, cy, sizePx, opts = {}) {
  const c = bakeSprite(key);
  if (!c) return false;
  const prev = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.save();
  ctx.translate(cx, cy + (opts.bob || 0));
  if (opts.flip) ctx.scale(-1, 1);
  const kx = opts.squashX || 1, ky = opts.squashY || 1;
  if (kx !== 1 || ky !== 1) {
    // scale around the feet so a squash keeps the sprite grounded
    ctx.translate(0, sizePx * 0.5);
    ctx.scale(kx, ky);
    ctx.translate(0, -sizePx * 0.5);
  }
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

  // ---------- champions & bosses ----------
  bogmaw: {
    mirror: true,
    pal: { '.': null, o: '#173a1c', g: '#6fae4a', d: '#437d2f', l: '#a6d873', e: '#ffffff', p: '#173a1c', m: '#243f1a' },
    rows: [
      '........', '..oo....', '.oeeo...', '.oepo...', '.oeeoggg', 'oggggggg',
      'oggggggg', 'ogmmmmgg', 'ommmmmmg', 'oggggggg', 'oglllggg',
      'oglllggg', '.oddgggg', '.oddddgg', 'ooddddog', '.oo...oo',
    ],
  },
  voltra: {
    mirror: true,
    pal: { '.': null, o: '#153a2a', s: '#4bbf8a', S: '#2e8a63', h: '#6fd0a0', e: '#ffd24a', p: '#153a2a', y: '#fff07a' },
    rows: [
      '...oo...', '..ohho..', '.ohhhho.', 'ohhhhhho', 'oheppeho', 'ohhhhhho',
      '.ohhhho.', '..osssss', '..osssss', '.ossssss', '.osSssss',
      '.ossssss', '..osssss', '...ossss', '....osss', '....oSSy',
    ],
  },
  mildew: {
    mirror: true,
    pal: { '.': null, o: '#2a3a1a', g: '#8fae3a', d: '#5a7d24', l: '#c0d86a', e: '#3a1a2a', s: '#e0f0a0' },
    rows: [
      '..oooo..', '.oggggog', 'ogggsggg', 'ogsggggg', 'oggggsgg', 'oggeeggg',
      'oggggggg', 'ogsgggsg', 'oggggggg', 'ogglgggg', 'oggggsgg',
      '.ogggggg', '.odggggg', '..oddggg', '...oddog', '..o..o..',
    ],
  },
  umbrella: {
    mirror: true,
    pal: { '.': null, o: '#2a1a3a', u: '#4a6fd0', U: '#33509c', k: '#ffd24a', e: '#ffffff', p: '#2a1a3a' },
    rows: [
      '......kk', '.....ouu', '...oouuu', '.oouuuuu', 'ooueeuuu', 'oouppuuu',
      'ouuuuuuu', 'oUuUuUuU', '.......u', '.......u', '.......u',
      '.......u', '......uu', '.....uu.', '........', '........',
    ],
  },
  dragon: {
    mirror: true,
    pal: { '.': null, o: '#1a2a3a', s: '#5a7db0', S: '#3a5a8a', b: '#8fb0d8', e: '#ffd24a', p: '#1a2a3a', t: '#e0556b', h: '#c0d8f0' },
    rows: [
      '.oo.....', '.ohh....', '..osssss', '.ossssss', 'osssssss', 'oseessss',
      'osssssss', 'osttttss', '.ossssss', '.ossssss', '..osssss',
      '..osssss', '...ossss', '...oSSss', '....ooss', '........',
    ],
  },
  sognaroth: {
    mirror: true,
    pal: { '.': null, o: '#1a0f2a', v: '#6a2a9a', V: '#3f1a6a', e: '#ffffff', p: '#1a0f2a', t: '#4a1f7a', y: '#b45cff', g: '#7cff9c' },
    rows: [
      '...vvv..', '..ovvvv.', '.ovvvvvv', 'ovvvvvvv', 'ovvvvvee', 'ovvvvvpp',
      'ovvvvvee', 'ovvvvvvv', 'ovvvvvvv', 'oVvvvvvv', 'ovtvtvtv',
      'otvtvtvt', 'tv.tv.tv', 'v..v..v.', 't...t..t', '........',
    ],
  },

  // ---------- villagers ----------
  npc_mayor: {
    mirror: true,
    pal: { '.': null, o: '#241a30', s: P.sk, S: P.skS, e: P.o, h: '#2a2438', c: '#5a4a55', b: '#3a3450', w: '#eaeaf0' },
    rows: [
      '...hhhhh', '...hhhhh', '...hhhhh', '.hhhhhhh', '..osssss', '..osesss',
      '..osssss', '..osccss', '.obbbbbb', '.obwbbbb', '.obwbbbb',
      '.obbbbbb', '.obbbbbb', '.obbbbbb', '..obbbbb', '..oo....',
    ],
  },
  npc_grandma: {
    mirror: true,
    pal: { '.': null, o: '#241a30', s: P.sk, S: P.skS, e: P.o, w: '#e8e8ee', g: '#c05a7a', G: '#9a3f5c' },
    rows: [
      '...wwwww', '..wwwwww', '.owwwwww', '.owsssss', '.owsesss', '.owsssss',
      '..osssss', '..oggggg', '.ogggggg', '.ogGGggg', '.ogggggg',
      '.ogggggg', '.ogggggg', '.ogggggg', '..oggggg', '..oo....',
    ],
  },
  npc_foreman: {
    mirror: true,
    pal: { '.': null, o: '#241a30', s: P.sk, S: P.skS, e: P.o, h: '#ffcc33', H: '#8a5a2a', b: '#8a5a3a', B: '#5a3a1a', r: '#c8783a' },
    rows: [
      '..hhhhhh', '.ohhhhhh', '..osssss', '..oseSss', '..obbbbb', '.obbbbbb',
      '.obbbbbb', '..obbbbb', '.orrrrrr', '.orBBrrr', '.orrrrrr',
      '.orrrrrr', '.orrrrrr', '.oHHHHHH', '..orrrrr', '..oo....',
    ],
  },

  // ---------- dungeon bosses ----------
  gloomtroll: {
    mirror: true,
    pal: { '.': null, o: '#16290f', g: '#5a7a3a', G: '#6e9048', d: '#3f5a28', e: '#ffd24a', b: '#6a4a2a' },
    rows: [
      '...ogggg', '..oggggg', '.oggeggg', '.oggeggg', '.ogggggg', '..oggggg',
      'oogggggg', 'oggggggg', 'oggGGggg', 'oggggggg', 'oggggggg',
      '.obbbbbb', '.ogggggg', '.oggg...', '.ooo....', '........',
    ],
  },
  revenant: {
    mirror: true,
    pal: { '.': null, o: '#22222a', s: '#8a8496', S: '#5a5566', l: '#b4afc0', e: '#ff5c5c' },
    rows: [
      '...ossss', '..osssss', '..osesss', '..osssss', 'oossssss', 'osssssss',
      'osSsssSs', 'osssssss', 'osssssss', 'osSsssss', '.ossssss',
      '.ossssss', '.osss...', '.osss...', '.ooo....', '........',
    ],
  },
  poltergeist: {
    mirror: true,
    pal: { '.': null, o: '#33334a', w: '#e8e8f5', W: '#b0b0cc', e: '#33334a', v: '#c9a8ff' },
    rows: [
      '...wwwww', '..wwwwww', '.wwwwwww', 'wwwwwwww', 'wwweewww', 'wwwwwwww',
      'wwwwwwoo', 'wwwwwwww', 'wWwwwwww', 'wwwwwwww', 'wwwWwwww',
      'wwwwwwww', 'ww.ww.ww', 'w..w..w.', '........', '........',
    ],
  },

  // ---------- castle & realm guardians ----------
  sentinel: {
    mirror: true,
    pal: { '.': null, o: '#1a2438', a: '#8fb0d8', A: '#5a7db0', e: '#ffe94a', c: '#c8d8f0', y: '#ffd24a' },
    rows: [
      '...oaaaa', '..oaaaaa', '..oaeeaa', '..oaaaaa', '.oaaccaa', 'oaaacaaa',
      'oaacccaa', 'oaaacaaa', 'oAaaaaaa', 'oAaaaaaa', '.oAaaaaa',
      '.oAaaaay', '..oAaaaa', '..oAAAAA', '...oo.oo', '........',
    ],
  },
  raincaller: {
    mirror: true,
    pal: { '.': null, o: '#12303a', r: '#3a7d8a', R: '#2a5a66', h: '#0e2228', e: '#7ce8ff', d: '#5cc9ff' },
    rows: [
      '...oooo.', '..orrrro', '.orrrrrr', '.orhhhhr', '.orheehr', '.orhhhhr',
      '.orrrrrr', 'orrrrrrr', 'orrdrrdr', 'orrrrrrr', 'oRrrdrrr',
      'oRrrrrrr', 'oRRrrrrr', 'oRRRRRRR', '..d..d..', '.d..d...',
    ],
  },
  herald: {
    mirror: true,
    pal: { '.': null, o: '#1a1030', v: '#7a4aba', V: '#54308a', e: '#7ce8ff', t: '#3f2468' },
    rows: [
      '...ovvv.', '..ovvvvv', '.ovvvvvv', '.ovveevv', '.ovvvvvv', 'ovvvvvvv',
      'ovvvvvvv', 'oVvvvvvv', 'ovvvvvvv', 'oVvvvvvv', 'ovtvtvtv',
      'otvtvtvt', 'tv.tv.tv', '.v..v..v', 't...t...', '........',
    ],
  },
  voidmaw: {
    mirror: true,
    pal: { '.': null, o: '#0c0816', b: '#241a3e', B: '#171028', w: '#e8e8f5', e: '#ff5c8a' },
    rows: [
      '...ooooo', '..obbbbb', '.obbbbbb', 'obbbebbb', 'obbbbbbb', 'obwbwbwb',
      'obBBBBBB', 'obBBBBBB', 'obwbwbwb', 'obbbbbbb', '.obbbbbb',
      '.obbbbbb', '..obbbbb', '...ooooo', '........', '........',
    ],
  },

  // ---------- side-quest villagers ----------
  npc_pip: {
    mirror: true,
    pal: { '.': null, o: '#241a30', s: P.sk, S: P.skS, e: P.o, h: '#8a5a2a', g: '#5cb85c', G: '#3f8a3f', b: '#4a6fd0' },
    rows: [
      '........', '........', '..ohhh..', '.ohhhhh.', '..osss..', '..oses..',
      '..osss..', '..oggg..', '.ogggggo', '.oGgggGo', '..oggg..',
      '..obbb..', '..obbb..', '..ob.b..', '..oo.oo.', '........',
    ],
  },
  npc_baker: {
    mirror: true,
    pal: { '.': null, o: '#241a30', s: P.sk, S: P.skS, e: P.o, w: '#f5f5fa', W: '#d8d8e2', a: '#e8e0d0', b: '#8a5a3a' },
    rows: [
      '..wwww..', '.owwwwo.', '.owwwwo.', '..osss..', '..oses..', '..osss..',
      '.oaaaaa.', 'oaaaaaaa', 'oaaWaaao', 'oaaaaaao', '.oaaaaa.',
      '.oaaaaa.', '.oaaaaa.', '.obbbbb.', '..oo.oo.', '........',
    ],
  },
  npc_willow: {
    mirror: true,
    pal: { '.': null, o: '#241a30', s: P.sk, S: P.skS, e: P.o, y: '#e0c86a', Y: '#b8a048', g: '#6faf5f', G: '#4f8a42', f: '#ff9ecb' },
    rows: [
      '...yy...', '..yyyy..', '.yyyyyy.', 'yyYYYYyy', '..osss..', '..oses..',
      '..osss..', '..oggg..', '.ogggggo', '.ogfgggo', '.oGgggGo',
      '.oggggg.', '.oGgggG.', '.oggggg.', '..oo.oo.', '........',
    ],
  },

  // a galloping unicorn in side view (faces RIGHT; the fx layer flips it to
  // match travel direction) — gold horn, rainbow mane, trailing tail
  unicorn: {
    pal: { '.': null, o: '#4a3a5e', w: '#ffffff', W: '#d8d2ec', y: '#ffd24a', e: '#3a2a4a',
           m: '#ff6ec7', n: '#b06ee8', c: '#5cc9ff', t: '#ff9ecb', H: '#8a7fa8' },
    rows: [
      '............yy..',
      '...........yy...',
      '..........owwo..',
      '.....m...owwww..',
      '....mn...owwwe..',
      '....mnc.owwww...',
      '.....ncowwww....',
      '...oowwwwwwww...',
      '..t.owwwwwwwww..',
      '.tt.owwwwwwwWw..',
      '.t..oWwwwwwWww..',
      '....ow.oww.ow...',
      '...ow..ow...ow..',
      '...H...H.....H..',
      '................',
      '................',
    ],
  },

  // ---------- world structures (replacing map emojis) ----------
  castle: {
    mirror: true,
    pal: { '.': null, o: '#2f3650', s: '#c6cfe4', S: '#95a0bd', w: '#ffd24a', d: '#443a63', f: '#ff6ec7', p: '#7f5cff' },
    rows: [
      '.f......', '.p......', 'ooo...oo', 'oso...os', 'ooo...ss', 'ooooosss',
      'osssssss', 'oswwssss', 'osssssss', 'osssssdd', 'osssssdd',
      'osssssdd', 'osssssss', 'oooooooo', '........', '........',
    ],
  },
  dungeon_cave: {
    mirror: true,
    pal: { '.': null, o: '#221d29', r: '#5a5560', R: '#403c48', s: '#726d80', k: '#0c0912' },
    rows: [
      '..rrrr..', '.rrrrrr.', 'rrrsrrrr', 'rrrkkrrr', 'rrkkkkrr', 'rkkkkkkr',
      'rkkkkkkr', 'rkkkkkkr', 'rkkkkkkr', 'rrkkkkrr', 'rRrkkrRr',
      'RRRRRRRR', '..RRRR..', '........', '........', '........',
    ],
  },
  dungeon_ruins: {
    mirror: true,
    pal: { '.': null, o: '#2a2a22', s: '#b0a888', S: '#7c745e', m: '#6faf5f', k: '#171712' },
    rows: [
      'ss....ss', 'so....os', 'ss....ss', 'so....os', 'sm....ms', 'ss....ss',
      'so....os', 'ssskksss', 'sSskksSs', 'sskkkkss', 'sskkkkss',
      'ssssssss', 'oooooooo', '........', '........', '........',
    ],
  },
  dungeon_house: {
    mirror: true,
    pal: { '.': null, o: '#160f1c', w: '#584a5c', W: '#3d3346', r: '#3a2a3c', R: '#241a28', g: '#a8e04a', d: '#0d0912' },
    rows: [
      '......oo', '.....orr', '....orrr', '...orrrr', '..orrRrr', '.orrrrrr',
      'orrrrrrr', 'owwwwwww', 'owgwwwww', 'owwwwwWw', 'owwwwwdd',
      'owwWwwdd', 'owwwwwdd', 'owwwwwdd', 'oooooooo', '........',
    ],
  },
  ladder: {
    pal: { '.': null, w: '#a86e30', W: '#7c4c1e' },
    rows: [
      '.....w....w.....', '.....w....w.....', '.....wwwwww.....', '.....w....w.....',
      '.....w....w.....', '.....wwwwww.....', '.....w....w.....', '.....w....w.....',
      '.....wwwwww.....', '.....w....w.....', '.....w....w.....', '.....wwwwww.....',
      '.....w....w.....', '.....w....w.....', '.....wwwwww.....', '.....W....W.....',
    ],
  },
  stairs: {
    pal: { '.': null, o: '#241f2e', s: '#9aa4c0', S: '#5a5570', k: '#0e0a16' },
    rows: [
      'osso............', 'osso............', 'osskkoo.........', '..ossso.........',
      '..osSso.........', '..osskkoo.......', '....ossso.......', '....osSso.......',
      '....osskkoo.....', '......ossso.....', '......osSso.....', '......osskkoo...',
      '........ossso...', '........osSso...', '........ossso...', '........ooooo...',
    ],
  },

  // ---------- environment ----------
  tree: {
    mirror: true,
    pal: { '.': null, o: '#2a5a24', g: '#4e9c3a', G: '#6ec254', d: '#357229', t: '#7a4a24', T: '#5a3418' },
    rows: [
      '....oooo', '..oggggg', '.ogggggg', 'oggggggg', 'oggGGggg', 'oggggggg',
      'oggggggg', '.oggggGg', '.odggggg', '..oddggg', '...odddg',
      '......tt', '......tt', '.....oTt', '.....oTt', '........',
    ],
  },
  cottage: {
    mirror: true,
    pal: { '.': null, o: '#3a2a30', w: '#e8d0a8', W: '#c8a878', r: '#c05545', R: '#9a3f38', d: '#6a4028', g: '#9fd0e8' },
    rows: [
      '......oo', '.....orr', '....orrr', '...orrrr', '..orrRrr', '.orrrrrr',
      'orrrrrrr', 'owwwwwww', 'owgggwww', 'owgggwww', 'owwwwwww',
      'owwwwwdd', 'owwWwwdd', 'owwwwwdd', 'owwwwwdd', 'oooooooo',
    ],
  },
  wall: {
    mirror: true,
    pal: { '.': null, o: '#3a3648', s: '#8a8496', S: '#615c70', l: '#a8a2b4' },
    rows: [
      'oooooooo', 'ollsssss', 'osssssss', 'ossSSsss', 'oSSSSSSS', 'osssssss',
      'osssslss', 'osssssss', 'ossSSsss', 'oSSSSSSS', 'osslssss',
      'osssssss', 'ossSSsss', 'oSSSSSSS', 'osssssss', 'oooooooo',
    ],
  },

  // ---------- camp buildings ----------
  bld_house: {
    mirror: true,
    pal: { '.': null, o: '#2a1f28', r: '#b5533f', R: '#8a3d30', w: '#b98a56', W: '#966a3e', d: '#5a3a22', g: '#9fd0e8' },
    rows: [
      '......oo', '.....orr', '....orrr', '...orrrr', '..orrRrr', '.orrrrrr',
      'orrrrrrr', 'owwwwwww', 'owgwwwww', 'owgwwwww', 'owwwwwww',
      'owwwwwdd', 'owwWwwdd', 'owwwwwdd', 'owwwwwdd', 'oooooooo',
    ],
  },
  bld_kitchen: {
    mirror: true,
    pal: { '.': null, o: '#2a1f28', r: '#e0873c', R: '#b3652a', w: '#d8c8a8', W: '#b8a888', d: '#6a4028', f: '#ff8a4a' },
    rows: [
      '......oo', '.....orr', '....orrr', '...orrrr', '..orrRrr', '.orrrrrr',
      'orrrrrrr', 'owwwwwww', 'owwwffff', 'owwwffff', 'owwwffff',
      'owwwwwww', 'owwwwwdd', 'owwwwwdd', 'owwwwwdd', 'oooooooo',
    ],
  },
  bld_factory: {
    mirror: true,
    pal: { '.': null, o: '#242028', r: '#7a7a88', R: '#5a5a66', w: '#9a9aa6', W: '#78788a', d: '#3a3a48', c: '#5a5a66', s: '#c0c0cc', f: '#c86bff' },
    rows: [
      '......ss', '......cc', '......cc', 'oorrrrcc', 'orrrrrrr', 'owwwwwww',
      'owwwwwww', 'owfwwwww', 'owfwwwww', 'owwwwwww', 'owwwffff',
      'owwwffff', 'owwwwwww', 'owwwwwdd', 'owwwwwdd', 'oooooooo',
    ],
  },
  bld_stalls: {
    mirror: true,
    pal: { '.': null, o: '#2a1f28', r: '#5a8a3a', R: '#437029', w: '#c99a6a', W: '#a87a4a', d: '#3a2418', h: '#e0c86a' },
    rows: [
      '......oo', '.....orr', '....orrr', '...orrrr', '..orrRrr', '.orrrrrr',
      'orrrrrrr', 'owwwwwww', 'owwwwwww', 'owwwwwdd', 'owwwwddd',
      'owwwdddd', 'owwwdhdd', 'owwwdddd', 'owwwdddd', 'oooooooo',
    ],
  },
  bld_training: {
    mirror: true,
    pal: { '.': null, o: '#2a1f28', r: '#b58a4a', R: '#8a6636', w: '#c9b088', W: '#a89068', d: '#5a3a22', t: '#c94f5c', T: '#ffffff' },
    rows: [
      '......oo', '.....orr', '....orrr', '...orrrr', '..orrRrr', '.orrrrrr',
      'orrrrrrr', 'owwwwwww', 'owwwwttt', 'owwwtTTT', 'owwwtTtt',
      'owwwwttt', 'owwwwwww', 'owwwwwdd', 'owwwwwdd', 'oooooooo',
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
  bogmaw: 'bogmaw', voltra: 'voltra', mildew: 'mildew', umbrella: 'umbrella',
  dragon: 'dragon', sognaroth: 'sognaroth',
  gloomtroll: 'gloomtroll', revenant: 'revenant', poltergeist: 'poltergeist',
  sentinel: 'sentinel', raincaller: 'raincaller', herald: 'herald', voidmaw: 'voidmaw',
};
const NPC_SPRITE = { mayor: 'npc_mayor', grandma: 'npc_grandma', foreman: 'npc_foreman',
  pip: 'npc_pip', baker: 'npc_baker', willow: 'npc_willow' };
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
