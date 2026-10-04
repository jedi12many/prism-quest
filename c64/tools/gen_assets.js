#!/usr/bin/env node
// Converts the web game's pixel art (js/sprites.js) into C64 graphics and
// writes c64/src/assets.c + assets.h (and assets.inc, the tile numbers for ca65).
//
//  * Map tiles (terrain, buildings, monsters, villagers) become 2x2 blocks of
//    multicolour characters: 8x16 "fat" pixels, using the shared colours
//    black + MC2 plus one free colour (0-7) per character cell.
//  * The battle portraits become hi-res hardware sprites, split into up to
//    three single-colour layers that are stacked on top of each other.
//  * The heroes are drawn for the C64 (tools/heroes.js): 24x21, an outline
//    and a detail sprite (hi-res) over a multicolour fill.
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
// the camp walls: brown brick (no grey in a character's own colours), lit white
artTile('WALL', ['oooooooo', 'cccocccc', 'bbbobbbb', 'bbbobbbb', 'oooooooo', 'cocccocc', 'bobbbobb', 'bobbbobb',
  'oooooooo', 'cccocccc', 'bbbobbbb', 'bbbobbbb', 'oooooooo', 'cocccocc', 'bobbbobb', 'oooooooo'], 1);
spriteTile('HOUSE', 'bld_house', { bgOk: true });
// the other camp buildings, and an empty plot (stakes, a rope, a hammer)
spriteTile('KITCHEN', 'bld_kitchen', { bgOk: true });
spriteTile('FACTORY', 'bld_factory', { bgOk: true });
spriteTile('STALLS', 'bld_stalls', { bgOk: true });
spriteTile('TRAINING', 'bld_training', { bgOk: true });
artTile('PLOT', ['', '', '.o....o', '.bccccb', '.b....b', '.b.oo.b', '.b.oob.b', '.b..b.b', '.b..b.b', '.bccccb', '.b....b',
  '', '', '', '', ''], 7);
// cave rock, for the Gloom Cave's walls
artTile('ROCK', ['oobbbbbo', 'obcbbbbb', 'bbbbbobb', 'bbbbobbb', 'obbbbbbo', 'oobbbboo', 'bbobbbcb', 'bbbobbbb',
  'bbbbobbb', 'obbbbbbb', 'bcbbbboo', 'bbbbbobb', 'bbboobbb', 'bbbbbbbc', 'obbbbbbb', 'oobbbbbo'], 1);
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

// the heroes: drawn for the C64 at full sprite size (tools/heroes.js) --
// outline (hi-res), detail (hi-res) and fill (multicolour), 63 bytes each
const HEROES = require('./heroes.js');
const PLAYERS = ['mage', 'knight', 'whisperer'];
function heroSprites(name) {
  const h = HEROES[name];
  const rows = h.rows.map(r => r + r.split('').reverse().join(''));
  if (rows.length !== 21 || rows.some(r => r.length !== 24)) throw new Error('hero ' + name + ': rows must be 21 x 12');
  const out = [new Uint8Array(63), new Uint8Array(63), new Uint8Array(63)];
  const MC = { A: 1, C: 2, B: 3 };      // %01 $D025, %10 the sprite's colour, %11 $D026
  rows.forEach((r, y) => {
    for (let x = 0; x < 24; x++) {
      const ch = r[x];
      if (ch === 'o') out[0][y * 3 + (x >> 3)] |= 0x80 >> (x & 7);
      else if (ch === 'd') out[1][y * 3 + (x >> 3)] |= 0x80 >> (x & 7);
      else if (ch !== '.' && !MC[ch]) throw new Error(`hero ${name}: '${ch}'`);
    }
    for (let x = 0; x < 24; x += 2) {      // the fill, a pair at a time
      const f = [r[x], r[x + 1]].find(ch => MC[ch]);
      if (f) out[2][y * 3 + (x >> 3)] |= MC[f] << (6 - (x & 7));
    }
  });
  return { data: out, colors: [h.colors.o, h.colors.d, h.colors.C], mc: [h.colors.A, h.colors.B] };
}
// the battle portraits: drawn for the C64 too (tools/monsters.js) -- up to
// four hi-res sprites each, mirrored halves packed under the I/O chips
const MONSTERS = require('./monsters.js');
function monsterLayers(m) {
  const rows = m.rows.map(r => r + r.split('').reverse().join(''));
  if (rows.length !== 21 || rows.some(r => r.length !== 24)) throw new Error('monster ' + m.name + ': rows must be 21 x 12');
  const letters = ['o', 'a', 'b', 'c'].filter(ch => rows.some(r => r.includes(ch)));
  rows.forEach(r => { for (const ch of r) if (ch !== '.' && !letters.includes(ch)) throw new Error(`monster ${m.name}: '${ch}'`); });
  // the left halves only, 2 bytes a row (12 pixels): the game mirrors them
  const layers = letters.map(ch => {
    const d = new Uint8Array(42);
    m.rows.forEach((r, y) => { for (let x = 0; x < 12; x++) if (r[x] === ch) d[y * 2 + (x >> 3)] |= 0x80 >> (x & 7); });
    return d;
  });
  return { layers, colors: letters.map(ch => m.colors[ch]) };
}
// 6 bytes of mask (bit set: that byte isn't 0), then the bytes that aren't
function pack(d) {
  const mask = new Uint8Array(6), out = [];
  d.forEach((b, i) => { if (b) { mask[i >> 3] |= 0x80 >> (i & 7); out.push(b); } });
  return [...mask, ...out];
}

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
h += `#define PLAYER_SPRITES ${PLAYERS.length}\n#define BATTLE_SPRITES ${MONSTERS.length}\n`;
h += '/* heroes: outline, detail (hi-res), fill (multicolour; $D025/$D026 = hero_mc) */\n';
h += 'extern const unsigned char hero_spr[PLAYER_SPRITES][3][63];\n';
h += 'extern const unsigned char hero_col[PLAYER_SPRITES][3];\n';
h += 'extern const unsigned char hero_mc[PLAYER_SPRITES][2];\n';
h += '/* battle portraits: hi-res layers, left halves, packed (under the I/O chips): mon_sprites() */\n';
h += 'extern const unsigned char mon_art[];\n';
h += `#define KEEPER_SPRITE0 ${MONSTERS.findIndex(m => m.keeper)}   /* from here on, the art is keeper_art[] (resident) */\n`;
h += 'extern const unsigned char keeper_art[];\n';
h += 'extern const unsigned int mon_off[BATTLE_SPRITES];\n';
h += 'extern const unsigned char mon_nl[BATTLE_SPRITES];\n';
h += 'extern const unsigned char mon_col[BATTLE_SPRITES][4];\n';
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
const mons = MONSTERS.map(monsterLayers);
// the dungeon keepers' art (keeper: true) stays resident: no room under I/O
const blob = [], kblob = [], offs = [];
const KEEPER0 = MONSTERS.findIndex(m => m.keeper);
mons.forEach((m, i) => {
  const b = MONSTERS[i].keeper ? kblob : blob;
  if (!!MONSTERS[i].keeper !== i >= KEEPER0) throw new Error('the keepers must come last in monsters.js');
  offs.push(b.length); m.layers.forEach(d => b.push(...pack(d)));
});
const ART_MAX = 0x580 - 0x100;          // (PQ.HI's art area, less the music's share)
if (blob.length > ART_MAX) throw new Error(`monster art: ${blob.length} bytes, room for ${ART_MAX}`);
c += '#pragma rodata-name(push, "HISPR")\n';
c += `const unsigned char mon_art[${blob.length}] = {\n` + hexBytes(blob) + '\n};\n';
c += '#pragma rodata-name(pop)\n\n';
c += `const unsigned char keeper_art[${kblob.length}] = {\n` + hexBytes(kblob) + '\n};\n\n';
c += `const unsigned int mon_off[BATTLE_SPRITES] = { ${offs.join(', ')} };\n`;
c += `const unsigned char mon_nl[BATTLE_SPRITES] = { ${mons.map(m => m.layers.length).join(', ')} };\n`;
c += 'const unsigned char mon_col[BATTLE_SPRITES][4] = {\n' + mons.map((m, i) =>
  `  { ${[...m.colors, 0, 0, 0].slice(0, 4).join(', ')} }, /* ${MONSTERS[i].name} */`).join('\n') + '\n};\n\n';
const heroes = PLAYERS.map(heroSprites);
c += 'const unsigned char hero_spr[PLAYER_SPRITES][3][63] = {\n' + heroes.map((hs, i) =>
  `  { /* ${PLAYERS[i]} */\n` + hs.data.map(d => '   {' + hexBytes(d, 21).replace(/\n {2}/g, '\n    ') + '}').join(',\n') + '\n  }').join(',\n') + '\n};\n\n';
c += 'const unsigned char hero_col[PLAYER_SPRITES][3] = {\n' + heroes.map((hs, i) => `  { ${hs.colors.join(', ')} }, /* ${PLAYERS[i]} */`).join('\n') + '\n};\n\n';
c += 'const unsigned char hero_mc[PLAYER_SPRITES][2] = {\n' + heroes.map((hs, i) => `  { ${hs.mc.join(', ')} }, /* ${PLAYERS[i]} */`).join('\n') + '\n};\n';

fs.writeFileSync(path.join(OUT, 'assets.h'), h);
// the tile numbers again, for the assembly renderer (scroll.s)
fs.writeFileSync(path.join(OUT, 'assets.inc'), '; Generated by tools/gen_assets.js -- do not edit.\n' +
  tiles.map((t, i) => `T_${t.name} = ${i}\n`).join(''));
fs.writeFileSync(path.join(OUT, 'assets.c'), c);
console.log(`assets: ${tiles.length} tiles (${TILE_BASE + tiles.length * 4} chars), ${PLAYERS.length} heroes, ${MONSTERS.length} monsters (${blob.length} bytes packed)`);
