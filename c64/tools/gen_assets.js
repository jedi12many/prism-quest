#!/usr/bin/env node
// Converts the web game's pixel art (js/sprites.js) into C64 graphics and
// writes c64/src/assets.c + assets.h.
//
//  * Map tiles (terrain, buildings, monsters, villagers) become 2x2 blocks of
//    multicolour characters: 8x16 "fat" pixels, using the shared colours
//    black + MC2 plus one free colour (0-7) per character cell.
//  * The player and battle portraits become hi-res hardware sprites, split into
//    up to three single-colour layers that are stacked on top of each other.
//  * A hand-drawn 8x8 font (upper + lower case) fills the first 96 characters.
//
// Run from the repo root or c64/: `node c64/tools/gen_assets.js`.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.resolve(__dirname, '..', 'src');

// ---------- load the web game's sprites ----------
const src = fs.readFileSync(path.join(ROOT, 'js', 'sprites.js'), 'utf8');
const { SPRITES } = new Function('document', 'window', src + ';return { SPRITES };')({}, {});

function expand(spr) {
  // -> 16 rows of 16 hex colours (null = transparent)
  return spr.rows.map(r => {
    let row = r;
    if (spr.mirror) row = r + r.split('').reverse().join('');
    return row.split('').map(ch => spr.pal[ch] || null);
  });
}

// ---------- the C64 palette (Colodore) ----------
const C64 = ['000000', 'ffffff', '813338', '75cec8', '8e3c97', '56ac4d', '2e2c9b', 'edf171',
  '8e5029', '553800', 'c46c71', '4a4a4a', '7b7b7b', 'a9ff9f', '706deb', 'b2b2b2']
  .map(h => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]);

function rgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}
function dist(a, b) {
  // weighted RGB distance — good enough for picking from 16 colours
  const dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2];
  return 2 * dr * dr + 4 * dg * dg + 3 * db * db;
}
function nearest(hex, allowed = [...Array(16).keys()]) {
  const c = rgb(hex);
  let best = allowed[0], bd = Infinity;
  for (const i of allowed) {
    const d = dist(c, C64[i]);
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}

// ---------- shared multicolour registers for map tiles ----------
const MC1 = 0;  // $D022 black: outlines
const MC2 = 9;  // $D023 brown: wood, trunks, earth
const BG = 5;   // $D021 default grass (per map at runtime)

// ---------- font ----------
// 5x7 glyphs (row 7 = descender row for lowercase), drawn at column 1.
const FONT = {
  ' ': ['', '', '', '', '', '', ''],
  '!': ['..#', '..#', '..#', '..#', '..#', '', '..#'],
  '"': ['.#.#', '.#.#', '', '', '', '', ''],
  '#': ['.#.#.', '#####', '.#.#.', '.#.#.', '#####', '.#.#.', ''],
  '$': ['..#', '.####', '#.#', '.###', '..#.#', '####', '..#'],
  '%': ['##..#', '##.#', '...#', '..#', '.#', '#.##', '..##'],
  '&': ['.##', '#..#', '.##', '.#.#', '#..#.#', '#...#', '.###.#'],
  "'": ['..#', '..#', '', '', '', '', ''],
  '(': ['...#', '..#', '.#', '.#', '.#', '..#', '...#'],
  ')': ['.#', '..#', '...#', '...#', '...#', '..#', '.#'],
  '*': ['', '.#.#', '..#', '#####', '..#', '.#.#', ''],
  '+': ['', '..#', '..#', '#####', '..#', '..#', ''],
  ',': ['', '', '', '', '', '..#', '.#'],
  '-': ['', '', '', '#####', '', '', ''],
  '.': ['', '', '', '', '', '', '..#'],
  '/': ['....#', '...#', '...#', '..#', '.#', '.#', '#'],
  '0': ['.###', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###'],
  '1': ['..#', '.##', '..#', '..#', '..#', '..#', '.###'],
  '2': ['.###', '#...#', '....#', '..##', '.#', '#', '#####'],
  '3': ['.###', '#...#', '....#', '..##', '....#', '#...#', '.###'],
  '4': ['...#', '..##', '.#.#', '#..#', '#####', '...#', '...#'],
  '5': ['#####', '#', '####', '....#', '....#', '#...#', '.###'],
  '6': ['..##', '.#', '#', '####', '#...#', '#...#', '.###'],
  '7': ['#####', '....#', '...#', '..#', '.#', '.#', '.#'],
  '8': ['.###', '#...#', '#...#', '.###', '#...#', '#...#', '.###'],
  '9': ['.###', '#...#', '#...#', '.####', '....#', '...#', '.##'],
  ':': ['', '..#', '', '', '', '..#', ''],
  ';': ['', '..#', '', '', '', '..#', '.#'],
  '<': ['...#', '..#', '.#', '#', '.#', '..#', '...#'],
  '=': ['', '', '#####', '', '#####', '', ''],
  '>': ['.#', '..#', '...#', '....#', '...#', '..#', '.#'],
  '?': ['.###', '#...#', '....#', '...#', '..#', '', '..#'],
  '@': ['.###', '#...#', '#.###', '#.#.#', '#.###', '#', '.####'],
  A: ['..#', '.#.#', '#...#', '#...#', '#####', '#...#', '#...#'],
  B: ['####', '#...#', '#...#', '####', '#...#', '#...#', '####'],
  C: ['.###', '#...#', '#', '#', '#', '#...#', '.###'],
  D: ['###', '#..#', '#...#', '#...#', '#...#', '#..#', '###'],
  E: ['#####', '#', '#', '####', '#', '#', '#####'],
  F: ['#####', '#', '#', '####', '#', '#', '#'],
  G: ['.###', '#...#', '#', '#.###', '#...#', '#...#', '.####'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['.###', '..#', '..#', '..#', '..#', '..#', '.###'],
  J: ['..###', '...#', '...#', '...#', '...#', '#..#', '.##'],
  K: ['#...#', '#..#', '#.#', '##', '#.#', '#..#', '#...#'],
  L: ['#', '#', '#', '#', '#', '#', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#'],
  O: ['.###', '#...#', '#...#', '#...#', '#...#', '#...#', '.###'],
  P: ['####', '#...#', '#...#', '####', '#', '#', '#'],
  Q: ['.###', '#...#', '#...#', '#...#', '#.#.#', '#..#', '.##.#'],
  R: ['####', '#...#', '#...#', '####', '#.#', '#..#', '#...#'],
  S: ['.###', '#...#', '#', '.###', '....#', '#...#', '.###'],
  T: ['#####', '..#', '..#', '..#', '..#', '..#', '..#'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#', '..#'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#', '..#', '.#.#', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#', '..#', '..#', '..#', '..#'],
  Z: ['#####', '....#', '...#', '..#', '.#', '#', '#####'],
  '[': ['.###', '.#', '.#', '.#', '.#', '.#', '.###'],
  '\\': ['#', '.#', '.#', '..#', '...#', '...#', '....#'],
  ']': ['.###', '...#', '...#', '...#', '...#', '...#', '.###'],
  '^': ['..#', '.#.#', '#...#', '', '', '', ''],
  '_': ['', '', '', '', '', '', '#####'],
  a: ['', '', '.###', '....#', '.####', '#...#', '.####'],
  b: ['#', '#', '####', '#...#', '#...#', '#...#', '####'],
  c: ['', '', '.###', '#', '#', '#', '.###'],
  d: ['....#', '....#', '.####', '#...#', '#...#', '#...#', '.####'],
  e: ['', '', '.###', '#...#', '#####', '#', '.###'],
  f: ['..##', '.#', '####', '.#', '.#', '.#', '.#'],
  g: ['', '', '.####', '#...#', '#...#', '.####', '....#', '.###'],
  h: ['#', '#', '####', '#...#', '#...#', '#...#', '#...#'],
  i: ['..#', '', '.##', '..#', '..#', '..#', '.###'],
  j: ['...#', '', '..##', '...#', '...#', '...#', '#..#', '.##'],
  k: ['#', '#', '#..#', '#.#', '##', '#.#', '#..#'],
  l: ['.##', '..#', '..#', '..#', '..#', '..#', '.###'],
  m: ['', '', '##.#', '#.#.#', '#.#.#', '#.#.#', '#...#'],
  n: ['', '', '####', '#...#', '#...#', '#...#', '#...#'],
  o: ['', '', '.###', '#...#', '#...#', '#...#', '.###'],
  p: ['', '', '####', '#...#', '#...#', '####', '#', '#'],
  q: ['', '', '.####', '#...#', '#...#', '.####', '....#', '....#'],
  r: ['', '', '#.##', '##', '#', '#', '#'],
  s: ['', '', '.####', '#', '.###', '....#', '####'],
  t: ['.#', '.#', '####', '.#', '.#', '.#', '..##'],
  u: ['', '', '#...#', '#...#', '#...#', '#...#', '.####'],
  v: ['', '', '#...#', '#...#', '#...#', '.#.#', '..#'],
  w: ['', '', '#...#', '#.#.#', '#.#.#', '#.#.#', '.#.#'],
  x: ['', '', '#...#', '.#.#', '..#', '.#.#', '#...#'],
  y: ['', '', '#...#', '#...#', '#...#', '.####', '....#', '.###'],
  z: ['', '', '#####', '...#', '..#', '.#', '#####'],
};

const charset = new Uint8Array(2048);
function glyph(rows) {
  const out = [];
  for (let y = 0; y < 8; y++) {
    const r = rows[y] || '';
    let b = 0;
    for (let x = 0; x < 6; x++) if (r[x] === '#') b |= 0x80 >> (x + 1);
    out.push(b);
  }
  return out;
}
// chars 0-63: ASCII 32-95; chars 64-89: a-z
for (let c = 32; c < 96; c++) {
  const ch = String.fromCharCode(c);
  if (!FONT[ch]) throw new Error('missing glyph ' + ch);
  charset.set(glyph(FONT[ch]), (c - 32) * 8);
}
for (let i = 0; i < 26; i++) charset.set(glyph(FONT[String.fromCharCode(97 + i)]), (64 + i) * 8);

// UI glyphs (hi-res) at 90..95
const UI = {
  90: ['.##.##', '#######', '#######', '.#####', '..###', '...#', ''],           // heart
  91: ['..###', '.#.#.#', '#######', '.#...#', '..#.#', '...#', ''],            // gem
  92: ['########', '########', '########', '########', '########', '########', '########', '########'], // solid
  93: ['', '', '', '########', '########', '', '', ''],                          // bar
  94: ['...#', '..###', '#######', '..###', '.##.##', '#.....#', ''],           // star
  95: ['#', '##', '###', '####', '###', '##', '#'],                              // pointer
};
for (const [code, rows] of Object.entries(UI)) {
  const out = [];
  for (let y = 0; y < 8; y++) {
    const r = rows[y] || ''; let b = 0;
    for (let x = 0; x < 8; x++) if (r[x] === '#') b |= 0x80 >> x;
    out.push(b);
  }
  charset.set(out, code * 8);
}

// ---------- map tiles ----------
// Each tile: 8 fat pixels x 16 rows. Pixel classes: 0 bg, 1 MC1, 2 MC2, 3 cell colour.
const TILE_BASE = 96;
const tiles = []; // { name, px[16][8] (0-3), colors[4] (0-7) }

// fat-pixel ascii art: '.' bg, 'o' black, 'b' brown, 'c' cell colour
function artTile(name, rows, cellColor) {
  const px = rows.map(r => r.padEnd(8, '.').split('').map(ch => ({ '.': 0, o: 1, b: 2, c: 3 })[ch]));
  const cols = Array.isArray(cellColor) ? cellColor : [cellColor, cellColor, cellColor, cellColor];
  tiles.push({ name, px, colors: cols });
}

// downsample a 16x16 sprite to 8x16 fat pixels and fit it to the char palette
function spriteTile(name, key, opts = {}) {
  const img = expand(SPRITES[key]);
  const fat = img.map(row => {
    const out = [];
    for (let x = 0; x < 8; x++) {
      const a = row[x * 2], b = row[x * 2 + 1];
      // keep detail: prefer an opaque pixel, and prefer colour over the outline
      let pick = a || b;
      if (a && b && a !== b) {
        const da = nearest(a), db = nearest(b);
        pick = (da === 0 && db !== 0) ? b : a;
      }
      out.push(pick);
    }
    return out;
  });
  const px = [], colors = [];
  for (let y = 0; y < 16; y++) px.push(new Array(8).fill(0));
  for (let cy = 0; cy < 2; cy++) for (let cx = 0; cx < 2; cx++) {
    // choose the cell colour (0-7) that best fits this 4x8 block
    let bestC = 1, bestErr = Infinity;
    const cands = opts.color !== undefined ? [opts.color] : [1, 2, 3, 4, 5, 6, 7];
    for (const c of cands) {
      let err = 0;
      for (let y = 0; y < 8; y++) for (let x = 0; x < 4; x++) {
        const p = fat[cy * 8 + y][cx * 4 + x];
        if (!p) continue;
        const v = rgb(p);
        err += Math.min(dist(v, C64[MC1]), dist(v, C64[MC2]), dist(v, C64[c]), opts.bgOk ? dist(v, C64[BG]) : Infinity);
      }
      if (err < bestErr) { bestErr = err; bestC = c; }
    }
    colors.push(bestC);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 4; x++) {
      const p = fat[cy * 8 + y][cx * 4 + x];
      if (!p) continue;
      const v = rgb(p);
      const opts4 = [[1, dist(v, C64[MC1])], [2, dist(v, C64[MC2])], [3, dist(v, C64[bestC])]];
      if (opts.bgOk) opts4.push([0, dist(v, C64[BG])]);
      opts4.sort((m, n) => m[1] - n[1]);
      px[cy * 8 + y][cx * 4 + x] = opts4[0][0];
    }
  }
  tiles.push({ name, px, colors });
}

// terrain
artTile('GRASS', ['', '', '..c', '', '', '', '', '.....c', '', '', '', '.c', '', '', '', ''], 5);
artTile('GRASS2', ['', '', '', '.....b', '', '.b', '', '', '', '', '....c', '', '', '..b', '', ''], 7);
artTile('FLOWER', ['', '', '.c', 'cbc', '.c', '', '', '.....c', '....cbc', '.....c', '', '', '..c', '.cbc', '..c', ''], 7);
spriteTile('TREE', 'tree', { bgOk: true });
artTile('WATER', ['cccccccc', 'cccccccc', 'ccccoocc', 'cccccccc', 'cccccccc', 'coocccccc', 'cccccccc', 'cccccccc',
  'cccccccc', 'ccccccoo', 'cccccccc', 'cccccccc', 'cccoocccc', 'cccccccc', 'cccccccc', 'cccccccc'], 6);
spriteTile('COTTAGE', 'cottage', { bgOk: true });
spriteTile('WALL', 'wall');
spriteTile('HOUSE', 'bld_house', { bgOk: true });
// a signpost pointing out of the village / back home
artTile('SIGN', ['', '', '.oooooo', '.occccco', '.occccco', '.oooooo', '...bb', '...bb', '...bb', '...bb', '...bb',
  '...bb', '..bbbb', '', '', ''], 7);
artTile('HOMESIGN', ['', '', '.oooooo', '.occccco', '.occccco', '.oooooo', '...bb', '...bb', '...bb', '...bb', '...bb',
  '...bb', '..bbbb', '', '', ''], 1);
artTile('CLOUDGATE', ['', '..cccc', '.c....c', 'c.oooo.c', 'c.o..o.c', '.o....o', '.o....o', 'o......o', 'o......o',
  'o......o', '', '', '', '', '', ''], [2, 2, 7, 7]);
artTile('BOARD', ['', '', 'oooooooo', 'occcccco', 'oc.cc.co', 'occcccco', 'oc.cc.co', 'occcccco', 'oooooooo', '..b..b',
  '..b..b', '..b..b', '..b..b', '', '', ''], 7);
artTile('FORGE', ['', '...oo', '...oo', '..oooo', '.oooooo', '.obbbbo', '.obccbo', '.obccbo', '.obbbbo', '.oooooo', '', '', '', '', '', ''], 2);
// a mineral node: cell colour set per mineral at draw time
artTile('NODE', ['', '', '', '', '...o', '..oco', '.occco', '.occcco', 'ooccccoo', 'occcccco', 'oocccooo', '.oooo', '', '', '', ''], 1);
artTile('GLINT', ['', '', '', '', '', '', '....c', '...ccc', '....c', '', '', '', '', '', '', ''], 1);
spriteTile('DUNGEON', 'dungeon_cave', { bgOk: true });
artTile('PATH', ['', 'b', '', '....b', '', '', '..b', '', '', '......b', '', '.b', '', '', '....b', ''], 5);

// actors
const MONSTER_TILES = ['slime', 'bat', 'shroom', 'fox', 'golem', 'gazer', 'spawnling', 'bogmaw', 'voltra', 'mildew', 'umbrella'];
for (const m of MONSTER_TILES) spriteTile('M_' + m.toUpperCase(), m);
const NPC_TILES = ['mayor', 'grandma', 'foreman', 'pip', 'baker', 'willow'];
for (const n of NPC_TILES) spriteTile('N_' + n.toUpperCase(), 'npc_' + n);

if (TILE_BASE + tiles.length * 4 > 256) throw new Error('too many tiles: ' + tiles.length);
tiles.forEach((t, i) => {
  const base = (TILE_BASE + i * 4) * 8;
  for (let cy = 0; cy < 2; cy++) for (let cx = 0; cx < 2; cx++) {
    const ci = base + (cy * 2 + cx) * 8;
    for (let y = 0; y < 8; y++) {
      let b = 0;
      for (let x = 0; x < 4; x++) b |= (t.px[cy * 8 + y][cx * 4 + x] & 3) << (6 - x * 2);
      charset[ci + y] = b;
    }
  }
});

// ---------- hardware sprites (hi-res, layered) ----------
function spriteLayers(key) {
  const img = expand(SPRITES[key]);
  const counts = new Map();
  const idx = img.map(row => row.map(p => {
    if (!p) return -1;
    const c = nearest(p);
    counts.set(c, (counts.get(c) || 0) + 1);
    return c;
  }));
  // up to 3 layers: always keep black (the outline) if present, then most-used
  let order = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(e => e[0]);
  if (order.includes(0)) order = [0, ...order.filter(c => c !== 0)];
  const layers = order.slice(0, 3);
  while (layers.length < 3) layers.push(layers[layers.length - 1] ?? 0);
  const data = layers.map(() => new Uint8Array(32));   // 16 rows x 2 bytes; spr_load pads to 24x21
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const c = idx[y][x];
    if (c < 0) continue;
    let li = layers.indexOf(c);
    if (li < 0) {
      // fold leftover colours into the closest layer
      let bd = Infinity;
      layers.forEach((lc, i) => { const d = dist(C64[c], C64[lc]); if (d < bd) { bd = d; li = i; } });
    }
    data[li][y * 2 + (x >> 3)] |= 0x80 >> (x & 7);
  }
  return { data, colors: layers };
}

const PLAYERS = ['mage', 'knight', 'whisperer'];
const BATTLE = ['slime', 'bat', 'shroom', 'fox', 'golem', 'gazer', 'spawnling', 'bogmaw', 'voltra', 'mildew', 'umbrella'];

// ---------- emit C ----------
function hexBytes(arr, per = 16) {
  const lines = [];
  for (let i = 0; i < arr.length; i += per)
    lines.push('  ' + Array.from(arr.slice(i, i + per)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(','));
  return lines.join(',\n');
}

let h = '/* Generated by tools/gen_assets.js from js/sprites.js -- do not edit. */\n';
h += '#ifndef ASSETS_H\n#define ASSETS_H\n\n';
h += `#define TILE_BASE ${TILE_BASE}\n#define MC1_COLOR ${MC1}\n#define MC2_COLOR ${MC2}\n\n`;
tiles.forEach((t, i) => { h += `#define T_${t.name} ${i}\n`; });
h += `#define T_COUNT ${tiles.length}\n\n`;
h += '#define CH_HEART 90\n#define CH_GEM 91\n#define CH_SOLID 92\n#define CH_BAR 93\n#define CH_STAR 94\n#define CH_POINTER 95\n\n';
h += `#define CHARSET_BYTES ${(TILE_BASE + tiles.length * 4) * 8}\n`;
h += 'extern const unsigned char charset[CHARSET_BYTES];\n';
h += 'extern const unsigned char tile_color[T_COUNT][4];\n';
h += `#define PLAYER_SPRITES ${PLAYERS.length}\n#define BATTLE_SPRITES ${BATTLE.length}\n`;
h += 'extern const unsigned char player_spr[PLAYER_SPRITES][3][32];\n';
h += 'extern const unsigned char player_spr_col[PLAYER_SPRITES][3];\n';
h += 'extern const unsigned char battle_spr[BATTLE_SPRITES][3][32];\n';
h += 'extern const unsigned char battle_spr_col[BATTLE_SPRITES][3];\n';
h += '\n#endif\n';

let c = '/* Generated by tools/gen_assets.js from js/sprites.js -- do not edit. */\n#include "assets.h"\n\n';
const used = (TILE_BASE + tiles.length * 4) * 8;   // chars past the last tile are blank
// the charset and sprite art ride at the end of PQ.HI and are copied under the
// I/O chips at startup (see prismquest.cfg / unpack_hi in save.c)
c += '#pragma rodata-name(push, "HICHR")\n';
c += 'const unsigned char charset[CHARSET_BYTES] = {\n' + hexBytes(charset.slice(0, used)) + '\n};\n';
c += '#pragma rodata-name(pop)\n\n';
c += 'const unsigned char tile_color[T_COUNT][4] = {\n' +
  tiles.map(t => `  { ${t.colors.join(', ')} }, /* ${t.name} */`).join('\n') + '\n};\n\n';
function sprBlock(name, keys, part) {
  const all = keys.map(spriteLayers);
  if (part === 'cols')
    return `const unsigned char ${name}_col[${keys.length}][3] = {\n` + all.map((sp, i) => `  { ${sp.colors.join(', ')} }, /* ${keys[i]} */`).join('\n') + '\n};\n\n';
  let s = `const unsigned char ${name}[${keys.length}][3][32] = {\n`;
  s += all.map((sp, i) => `  { /* ${keys[i]} */\n` + sp.data.map(d => '   {' + hexBytes(d, 16).replace(/\n {2}/g, '\n    ') + '}').join(',\n') + '\n  }').join(',\n');
  return s + '\n};\n\n';
}
const PLAYER_KEYS = PLAYERS.map(p => 'player_' + p);
c += '#pragma rodata-name(push, "HISPR")\n';
c += sprBlock('player_spr', PLAYER_KEYS, 'data');
c += sprBlock('battle_spr', BATTLE, 'data');
c += '#pragma rodata-name(pop)\n\n';
c += sprBlock('player_spr', PLAYER_KEYS, 'cols');
c += sprBlock('battle_spr', BATTLE, 'cols');

fs.writeFileSync(path.join(OUT, 'assets.h'), h);
fs.writeFileSync(path.join(OUT, 'assets.c'), c);
console.log(`assets: ${tiles.length} tiles (${TILE_BASE + tiles.length * 4} chars), ${PLAYERS.length + BATTLE.length} sprites`);
