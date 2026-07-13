// Prism Quest: Rainyday — core engine
// Maps: Drizzlewick (village hub) → the wilds of Rainyday (procedural) →
//       the Rainycastle in the rainclouds → Sog'naroth's realm (one way!)

const TILE = 44;
const SPAWN = { x: 6, y: 6 };                        // new-hero spot in the village
const VILLAGE_ENTRY = { x: 14, y: 13 };              // where travel drops you at home
const ZONE_IDS = ['north', 'east', 'west', 'south'];
const FLOOR_TILES = new Set(['grass', 'cloud', 'gloomstone', 'cavefloor', 'ruinfloor', 'housefloor']);
const ZONE_W = 34, ZONE_H = 26;                      // each zone map's size
// You enter each zone on the edge nearest the village and cross to the far side:
// go South → arrive North; North → South; East → West; West → East.
const ZONE_LAYOUTS = {
  south: { entry: { x: 17, y: 4 },  spawn: { x: 17, y: 6 },  lair: { x: 17, y: 22 } },
  north: { entry: { x: 17, y: 21 }, spawn: { x: 17, y: 19 }, lair: { x: 17, y: 3 } },
  east:  { entry: { x: 4, y: 13 },  spawn: { x: 6, y: 13 },  lair: { x: 30, y: 13 } },
  west:  { entry: { x: 30, y: 13 }, spawn: { x: 28, y: 13 }, lair: { x: 4, y: 13 } },
};
function zoneSpawn(zoneId) { return ZONE_LAYOUTS[zoneId].entry; } // spawn on the way-home gate
const BASE_RECT = { x0: 2, y0: 2, x1: 11, y1: 11 };  // the buildable camp plot
const GATE_TILES = [[6, 11], [7, 11]];               // opening in the castle walls
const LEVEL_CAP = 12;                                 // caps skill points so you can't get everything
const SAVE_KEY = 'prismquest_save_v3';
const META_KEY = 'prismquest_meta_v1';               // Motes + upgrades, survive death

const G = {
  state: null,
  mapId: 'village',
  map: null, mw: 0, mh: 0,   // current map tiles + dimensions
  nodes: [],                 // mineral nodes {x, y, mineral, respawnAt}
  monsters: [],              // {x, y, type, alive, respawnAt, home, moveAt}
  npcs: [],                  // {id, x, y} (village only)
  gates: [],                 // {x, y, kind: 'zone'|'village'|'cloudgate'|'portal', zone?}
  wallTiles: [],
  path: [],
  pendingMine: null,
  pendingNpc: null,
  px: 0, py: 0,
  floaters: [],
  lock: false,
  time: 0,
  saveAt: 0,
  canvas: null, ctx: null,
};

// ---------- utilities ----------

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function cheb(x1, y1, x2, y2) { return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2)); }

function classDef() { return CLASSES[G.state.classId]; }

// Sum a skill-effect key across owned nodes, class perk, and camp buildings.
function eff(key) {
  const cls = classDef();
  let v = (cls.perk && cls.perk[key]) || 0;
  for (const branch of cls.tree) {
    for (const node of branch.nodes) {
      if (G.state.skills[node.id] && node.eff[key]) v += node.eff[key];
    }
  }
  for (const [bid, lvl] of Object.entries(G.state.base || {})) {
    const bd = BUILDINGS[bid];
    if (lvl > 0 && bd && bd.eff && bd.eff[key]) v += bd.eff[key] * lvl;
  }
  for (const it of Object.values(G.state.equip || {})) {
    if (!it) continue;
    const st = itemStats(it);
    if (st[key]) v += st[key];
  }
  const sc = prismSetCount();
  if (sc >= 3 && PRISM_SET.b3[key]) v += PRISM_SET.b3[key];
  if (sc >= 5 && PRISM_SET.b5[key]) v += PRISM_SET.b5[key];
  const pact = G.state.activePact;
  if (pact) {
    if (pact.bless[key]) v += pact.bless[key];
    if (pact.curse[key]) v += pact.curse[key];
  }
  v += metaEff(key); // permanent Sanctuary upgrades
  return v;
}

function atBase() { return G.mapId === 'village'; }

function inZone() { return ZONE_IDS.includes(G.mapId); }

// difficulty scaling by where you're fighting: zone tier 1-4, clouds/realm higher
function combatTier() {
  if (inZone()) return ZONES[G.mapId].tier;
  if (G.mapId === 'dungeon') return (G.state.dungeon ? G.state.dungeon.tier : 1) + 1; // deadlier than its zone
  if (G.mapId === 'clouds') return 5;
  if (G.mapId === 'realm') return 6;
  return 1;
}

// Sunshine per map. Gloom-things cannot exist in it. A zone is sunny once cleared.
function inSun(x, y) {
  if (!G.state) return false;
  if (G.state.sunRestored) return true;
  if (G.mapId === 'village') return true;
  if (inZone()) return !!G.state.zonesCleared[G.mapId];
  return false; // the rainclouds and the realm never see the sun
}

// The Rainycastle is up and pulling rain back over the land
function castleActive() {
  return G.state && G.state.mainQuest >= 3 && !G.state.bossDefeated && !G.state.sunRestored;
}

function isWallTile(x, y) {
  const R = BASE_RECT;
  if (x < R.x0 || x > R.x1 || y < R.y0 || y > R.y1) return false;
  if (x !== R.x0 && x !== R.x1 && y !== R.y0 && y !== R.y1) return false;
  return !GATE_TILES.some(([gx, gy]) => gx === x && gy === y);
}

function buildingAt(x, y) {
  for (const [id, b] of Object.entries(BUILDINGS)) {
    if (b.tile && b.tile.x === x && b.tile.y === y) return id;
  }
  return null;
}

function npcAt(x, y) {
  const n = G.npcs.find(n => n.x === x && n.y === y);
  return n ? n.id : null;
}

function gateAt(x, y) { return G.gates.some(g => g.x === x && g.y === y); }

function calcStats() {
  const s = G.state, cls = classDef();
  const lvl = s.level;
  s.hpMax = cls.hp + 6 * (lvl - 1) + eff('hpMax');
  s.atk = cls.atk + (lvl - 1) + eff('atkFlat');
  s.mag = cls.mag + (lvl - 1) + eff('magFlat');
  s.def = Math.floor(cls.def + (lvl - 1) * cls.defGrow) + eff('defFlat');
  s.hp = clamp(s.hp, 0, s.hpMax);
}

function xpNext(level) { return Math.round(18 * Math.pow(level, 1.5)); }

function gainXp(n) {
  const s = G.state;
  const gained = Math.round(n * (1 + eff('xpGain')));
  s.xp += gained;
  let leveled = false;
  while (s.xp >= xpNext(s.level) && s.level < LEVEL_CAP) {
    s.xp -= xpNext(s.level);
    s.level++;
    s.skillPoints++;
    leveled = true;
  }
  if (s.level >= LEVEL_CAP) s.xp = 0;
  if (leveled) {
    calcStats();
    G.state.hp = G.state.hpMax;
    toast(`⭐ Level ${s.level}! Fully healed. +1 skill point`);
    fxConfetti(window.innerWidth / 2, window.innerHeight - 140, 30);
    sndLevel();
  }
  renderHUD();
  return gained;
}

// ---------- quests ----------

function questText() {
  const s = G.state;
  if (!s) return '';
  if (s.mainQuest === 1) {
    const done = ZONE_IDS.filter(z => s.zonesCleared[z]).length;
    return `${QUEST_TEXT[1]} (${done}/4)`;
  }
  return QUEST_TEXT[s.mainQuest] || '';
}

function setQuest(n) {
  if (!G.state || G.state.mainQuest >= n) return;
  G.state.mainQuest = n;
  toast('📜 ' + QUEST_TEXT[n]);
  renderHUD();
  save();
}

// ---------- maps ----------

function buildMap(mapId) {
  G.mapId = mapId;
  G.nodes = []; G.monsters = []; G.npcs = []; G.gates = []; G.wallTiles = [];
  if (mapId === 'village') buildVillage();
  else if (ZONE_IDS.includes(mapId)) buildZone(mapId);
  else if (mapId === 'dungeon') buildDungeon();
  else if (mapId === 'clouds') buildClouds();
  else buildRealm();
}

function blankMap(w, h, fill, border) {
  G.mw = w; G.mh = h;
  G.map = [];
  for (let y = 0; y < h; y++) {
    const row = [];
    for (let x = 0; x < w; x++) {
      row.push(x < 2 || y < 2 || x >= w - 2 || y >= h - 2 ? border : fill);
    }
    G.map.push(row);
  }
}

// Drizzlewick — the last sunny village
function buildVillage() {
  blankMap(28, 18, 'grass', 'tree');
  for (const [cx, cy] of [[16, 3], [21, 5], [24, 9], [20, 12], [15, 12]]) G.map[cy][cx] = 'cottage';
  for (let y = BASE_RECT.y0; y <= BASE_RECT.y1; y++)
    for (let x = BASE_RECT.x0; x <= BASE_RECT.x1; x++)
      G.map[y][x] = 'grass';
  for (let x = BASE_RECT.x0; x <= BASE_RECT.x1; x++)
    for (let y = BASE_RECT.y0; y <= BASE_RECT.y1; y++)
      if (isWallTile(x, y)) G.wallTiles.push([x, y]);
  G.npcs = Object.entries(NPCS).map(([id, n]) => ({ id, x: n.x, y: n.y }));
  // a gate to each of the four zones, plus the plaza cloudgate
  G.gates = [{ x: 18, y: 4, kind: 'cloudgate' }];
  for (const zid of ZONE_IDS) {
    for (const [gx, gy] of ZONES[zid].gate) {
      G.map[gy][gx] = 'grass'; // keep the gate tile clear
      G.gates.push({ x: gx, y: gy, kind: 'zone', zone: zid });
    }
  }
}

// occasionally promote a spawned mob to an elite with an affix
function maybeElite(m, tier, rng) {
  const chance = 0.1 + (tier - 1) * 0.04; // ~10% (South) to ~22% (North)
  if (rng() < chance) m.elite = ELITE_KEYS[(rng() * ELITE_KEYS.length) | 0];
}

// A directional zone — a fresh themed level with a champion at the far end
function buildZone(zoneId) {
  const z = ZONES[zoneId];
  const rng = mulberry32((Math.random() * 1e9) | 0);
  const W = ZONE_W, H = ZONE_H;
  blankMap(W, H, 'grass', 'tree');
  // lakes
  const lakes = 2 + ((rng() * 2) | 0);
  for (let i = 0; i < lakes; i++) {
    const cx = 6 + rng() * (W - 12), cy = 5 + rng() * (H - 10), rx = 2 + rng() * 3, ry = 2 + rng() * 2;
    for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry;
      if (dx * dx + dy * dy < 1) G.map[y][x] = 'water';
    }
  }
  // forest scatter
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
    if (G.map[y][x] === 'grass' && rng() < 0.09) G.map[y][x] = 'tree';
  }
  const L = ZONE_LAYOUTS[zoneId];
  const entry = L.entry, lair = L.lair;
  const clear = (cx, cy, r) => {
    for (let y = Math.max(2, cy - r); y <= Math.min(H - 3, cy + r); y++)
      for (let x = Math.max(2, cx - r); x <= Math.min(W - 3, cx + r); x++)
        G.map[y][x] = 'grass';
  };
  clear(entry.x, entry.y, 2);
  clear(lair.x, lair.y, 2);
  // carve a wandering path from entry to lair (any direction) so it's traversable
  let cx = entry.x, cy = entry.y;
  let pguard = 0;
  while ((cx !== lair.x || cy !== lair.y) && pguard++ < 800) {
    const dxs = Math.sign(lair.x - cx), dys = Math.sign(lair.y - cy);
    if (Math.abs(lair.x - cx) > Math.abs(lair.y - cy)) {
      cx = clamp(cx + dxs, 3, W - 4);
      if (dys && rng() < 0.4) cy = clamp(cy + dys, 3, H - 4);
    } else {
      cy = clamp(cy + dys, 3, H - 4);
      if (dxs && rng() < 0.4) cx = clamp(cx + dxs, 3, W - 4);
    }
    G.map[cy][cx] = 'grass';
    if (cx + 1 < W - 2 && G.map[cy][cx + 1] !== 'water') G.map[cy][cx + 1] = 'grass'; // widen
  }
  // way-home 2x2 gate at the entry
  G.gates = [];
  for (const [gx, gy] of [[entry.x - 1, entry.y - 1], [entry.x, entry.y - 1],
                          [entry.x - 1, entry.y], [entry.x, entry.y]]) {
    G.gates.push({ x: gx, y: gy, kind: 'village' });
  }

  // mineral nodes (themed pool); legendary prismatite by the lair
  let placed = 0, guard = 0;
  while (placed < 10 && guard++ < 3000) {
    const x = 3 + ((rng() * (W - 6)) | 0), y = 3 + ((rng() * (H - 6)) | 0);
    if (G.map[y][x] !== 'grass') continue;
    if (cheb(x, y, entry.x, entry.y) < 3) continue;
    if (G.nodes.some(n => cheb(n.x, n.y, x, y) < 2)) continue;
    G.nodes.push({ x, y, mineral: z.minerals[(rng() * z.minerals.length) | 0], respawnAt: 0 });
    placed++;
  }
  G.nodes.push({ x: lair.x + 1, y: lair.y + 1, mineral: 'prismatite', respawnAt: 0 });
  G.nodes.push({ x: lair.x - 1, y: lair.y + 1, mineral: 'prismatite', respawnAt: 0 });

  // monsters + the champion (none once the zone is cleared / the sun is back)
  if (!G.state.zonesCleared[zoneId] && !G.state.sunRestored) {
    for (const [type, count] of Object.entries(z.packs)) {
      let p = 0, g2 = 0;
      while (p < count && g2++ < 3000) {
        const x = 3 + ((rng() * (W - 6)) | 0), y = 3 + ((rng() * (H - 6)) | 0);
        if (!walkable(x, y)) continue;
        if (cheb(x, y, entry.x, entry.y) < 5) continue;
        if (cheb(x, y, lair.x, lair.y) < 2) continue;
        if (G.monsters.some(m => cheb(m.x, m.y, x, y) < 3)) continue;
        if (G.nodes.some(n => n.x === x && n.y === y)) continue;
        const mob = { x, y, type, alive: true, respawnAt: 0, home: { x, y }, moveAt: 1 + rng() * 2 };
        maybeElite(mob, z.tier, rng);
        G.monsters.push(mob);
        p++;
      }
    }
    G.monsters.push({ x: lair.x, y: lair.y, type: z.champion, alive: true, respawnAt: 0, home: { ...lair }, moveAt: Infinity });
  }

  // 1-2 special dungeon entrances hidden in the zone
  const dCount = 1 + (rng() < 0.5 ? 1 : 0);
  let dp = 0, dg = 0;
  while (dp < dCount && dg++ < 3000) {
    const x = 4 + ((rng() * (W - 8)) | 0), y = 4 + ((rng() * (H - 8)) | 0);
    if (G.map[y][x] !== 'grass') continue;
    if (cheb(x, y, entry.x, entry.y) < 4 || cheb(x, y, lair.x, lair.y) < 4) continue;
    if (G.gates.some(g => cheb(g.x, g.y, x, y) < 3)) continue;
    if (G.monsters.some(m => cheb(m.x, m.y, x, y) < 2) || G.nodes.some(n => n.x === x && n.y === y)) continue;
    const dtype = DUNGEON_TYPES[(rng() * DUNGEON_TYPES.length) | 0];
    G.gates.push({ x, y, kind: 'dungeon', dtype, fromZone: zoneId });
    dp++;
  }
}

// ---------- special dungeons ----------

function fillMap(w, h, tile) {
  G.mw = w; G.mh = h;
  G.map = [];
  for (let y = 0; y < h; y++) { const row = []; for (let x = 0; x < w; x++) row.push(tile); G.map.push(row); }
}

// cellular-automata cave
function genCave(W, H, floor, wall, rng) {
  fillMap(W, H, wall);
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) G.map[y][x] = rng() < 0.46 ? wall : floor;
  for (let it = 0; it < 4; it++) {
    const n = G.map.map(r => r.slice());
    for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
      let w = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (G.map[y + dy][x + dx] === wall) w++;
      n[y][x] = w >= 5 ? wall : floor;
    }
    G.map = n;
  }
  const entry = { x: W >> 1, y: H - 4 }, boss = { x: W >> 1, y: 3 };
  const carve = (cx, cy, r) => {
    for (let y = Math.max(2, cy - r); y <= Math.min(H - 3, cy + r); y++)
      for (let x = Math.max(2, cx - r); x <= Math.min(W - 3, cx + r); x++) G.map[y][x] = floor;
  };
  carve(entry.x, entry.y, 2); carve(boss.x, boss.y, 2);
  let px = entry.x, py = entry.y; // drunkard's path guarantees a route
  while (py > boss.y) {
    G.map[py][px] = floor;
    if (rng() < 0.6) py--; else px = clamp(px + (rng() < 0.5 ? -1 : 1), 2, W - 3);
    G.map[clamp(py, 2, H - 3)][px] = floor;
  }
  return { entry, boss };
}

// classic rooms + L-corridors
function genRuins(W, H, floor, wall, rng) {
  fillMap(W, H, wall);
  const rooms = [];
  for (let i = 0; i < 7; i++) {
    const rw = 4 + ((rng() * 4) | 0), rh = 3 + ((rng() * 3) | 0);
    const rx = 2 + ((rng() * (W - rw - 4)) | 0), ry = 2 + ((rng() * (H - rh - 4)) | 0);
    for (let y = ry; y < ry + rh; y++) for (let x = rx; x < rx + rw; x++) G.map[y][x] = floor;
    const room = { cx: rx + (rw >> 1), cy: ry + (rh >> 1) };
    if (rooms.length) {
      const p = rooms[rooms.length - 1];
      for (let x = Math.min(p.cx, room.cx); x <= Math.max(p.cx, room.cx); x++) G.map[p.cy][x] = floor;
      for (let y = Math.min(p.cy, room.cy); y <= Math.max(p.cy, room.cy); y++) G.map[y][room.cx] = floor;
    }
    rooms.push(room);
  }
  const entry = { x: rooms[0].cx, y: rooms[0].cy };
  let bossRoom = rooms[0], md = -1;
  for (const r of rooms) { const d = cheb(r.cx, r.cy, entry.x, entry.y); if (d > md) { md = d; bossRoom = r; } }
  return { entry, boss: { x: bossRoom.cx, y: bossRoom.cy } };
}

// a grid of rooms joined by doors
function genHouse(W, H, floor, wall, rng) {
  fillMap(W, H, wall);
  const cols = 3, rows = 3;
  const cw = Math.floor((W - 2) / cols), ch = Math.floor((H - 2) / rows);
  const cell = (gx, gy) => ({ x0: 2 + gx * cw, y0: 2 + gy * ch });
  for (let gy = 0; gy < rows; gy++) for (let gx = 0; gx < cols; gx++) {
    const c = cell(gx, gy);
    for (let y = c.y0 + 1; y < c.y0 + ch - 1; y++) for (let x = c.x0 + 1; x < c.x0 + cw - 1; x++) G.map[y][x] = floor;
  }
  // doors between adjacent rooms
  for (let gy = 0; gy < rows; gy++) for (let gx = 0; gx < cols; gx++) {
    const c = cell(gx, gy);
    const midx = c.x0 + (cw >> 1), midy = c.y0 + (ch >> 1);
    if (gx < cols - 1) { const wx = c.x0 + cw; G.map[midy][wx] = floor; G.map[midy][wx - 1] = floor; G.map[midy][wx + 1] = floor; }
    if (gy < rows - 1) { const wy = c.y0 + ch; G.map[wy][midx] = floor; G.map[wy - 1][midx] = floor; G.map[wy + 1][midx] = floor; }
  }
  const roomCenter = (gx, gy) => { const c = cell(gx, gy); return { x: c.x0 + (cw >> 1), y: c.y0 + (ch >> 1) }; };
  return { entry: roomCenter(1, rows - 1), boss: roomCenter(1, 0) };
}

function buildDungeon() {
  const d = G.state.dungeon;
  const cfg = DUNGEONS[d.type];
  const rng = mulberry32((Math.random() * 1e9) | 0);
  const W = 32, H = 24;
  const res = d.type === 'cave' ? genCave(W, H, cfg.floor, cfg.wall, rng)
    : d.type === 'ruins' ? genRuins(W, H, cfg.floor, cfg.wall, rng)
    : genHouse(W, H, cfg.floor, cfg.wall, rng);
  const { entry, boss } = res;
  // spawn on a floor tile beside the entry; the exit gate sits on the entry
  let spawn = entry;
  for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
    const nx = entry.x + dx, ny = entry.y + dy;
    if (G.map[ny] && FLOOR_TILES.has(G.map[ny][nx])) { spawn = { x: nx, y: ny }; break; }
  }
  G.dungeonSpawn = entry; // spawn on the exit ladder so a stray tap won't leave
  G.gates = [{ x: entry.x, y: entry.y, kind: 'zoneback', zone: d.fromZone }];

  const floors = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (FLOOR_TILES.has(G.map[y][x])) floors.push({ x, y });

  const finalFloor = d.floor >= d.maxFloor;
  G.monsters = [];
  if (finalFloor) {
    // the keeper of the dungeon, with the richest loot
    G.monsters.push({ x: boss.x, y: boss.y, type: cfg.boss, alive: true, respawnAt: 0, home: { ...boss }, moveAt: Infinity });
  } else {
    // a locked way down, guarded by a Warden that carries the key
    G.gates.push({ x: boss.x, y: boss.y, kind: 'stairsdown' });
    let wpos = { x: boss.x, y: boss.y };
    for (const f of floors) { if (cheb(f.x, f.y, boss.x, boss.y) === 1) { wpos = f; break; } }
    const wtype = d.type === 'house' ? 'gazer' : 'golem';
    G.monsters.push({ x: wpos.x, y: wpos.y, type: wtype, warden: true, elite: 'armored', alive: true, respawnAt: 0, home: { ...wpos }, moveAt: Infinity });
  }
  for (const [type, count] of Object.entries(cfg.mobs)) {
    let p = 0, g2 = 0;
    while (p < count && g2++ < 3000) {
      const f = floors[(rng() * floors.length) | 0];
      if (cheb(f.x, f.y, spawn.x, spawn.y) < 4 || cheb(f.x, f.y, boss.x, boss.y) < 2) continue;
      if (G.monsters.some(m => cheb(m.x, m.y, f.x, f.y) < 2)) continue;
      const mob = { x: f.x, y: f.y, type, alive: true, respawnAt: 0, home: { x: f.x, y: f.y }, moveAt: 1 + rng() * 2 };
      maybeElite(mob, d.tier + 1, rng); // dungeons crawl with elites
      G.monsters.push(mob);
      p++;
    }
  }
  // reward gems, including prismatite by the boss
  G.nodes = [];
  const pool = ZONES[d.fromZone] ? ZONES[d.fromZone].minerals : ['quartz'];
  for (let i = 0; i < 4; i++) {
    const f = floors[(rng() * floors.length) | 0];
    if (cheb(f.x, f.y, spawn.x, spawn.y) < 3) continue;
    if (G.nodes.some(n => n.x === f.x && n.y === f.y)) continue;
    G.nodes.push({ x: f.x, y: f.y, mineral: i === 0 ? 'prismatite' : pool[(rng() * pool.length) | 0], respawnAt: 0 });
  }
}

// The Rainycastle, floating in the rainclouds
function buildClouds() {
  blankMap(22, 14, 'sky', 'sky');
  for (let y = 3; y <= 11; y++) for (let x = 2; x <= 19; x++) G.map[y][x] = 'cloud';
  for (const [hx, hy] of [[8, 5], [13, 4], [6, 9], [12, 10]]) G.map[hy][hx] = 'sky';
  for (const [kx, ky] of [[17, 6], [18, 6], [17, 7], [18, 7]]) G.map[ky][kx] = 'keep';
  G.gates = [{ x: 3, y: 7, kind: 'village' }];
  // the tear in the sky seals for good once the sun returns
  if (G.state.bossDefeated && !G.state.sunRestored) G.gates.push({ x: 16, y: 9, kind: 'portal' });
  else if (!G.state.bossDefeated) G.monsters.push({ x: 15, y: 7, type: 'dragon', alive: true, respawnAt: 0, home: { x: 15, y: 7 }, moveAt: Infinity });
}

// Sog'naroth's realm — one way in, one fight out
function buildRealm() {
  const rng = mulberry32((Math.random() * 1e9) | 0);
  blankMap(32, 24, 'gloomstone', 'voidt');
  for (let y = 2; y < 22; y++) for (let x = 2; x < 30; x++) {
    if (rng() < 0.14) G.map[y][x] = 'voidt';
  }
  // a guaranteed (if winding) way through
  for (let x = 2; x < 30; x++) {
    const wob = Math.round(Math.sin(x * 0.7) * 2);
    for (let dy = -1; dy <= 1; dy++) G.map[clamp(12 + wob + dy, 2, 21)][x] = 'gloomstone';
  }
  G.map[12][3] = 'gloomstone';
  G.map[12][28] = 'gloomstone';
  if (G.state.sunRestored) {
    // Sog'naroth is dead — the realm is a silent echo, and the way home stands open
    G.gates.push({ x: 3, y: 12, kind: 'village' });
    return;
  }
  const packs = { spawnling: 6, gazer: 4 };
  for (const [type, count] of Object.entries(packs)) {
    let placed = 0, guard = 0;
    while (placed < count && guard++ < 2000) {
      const x = 8 + Math.floor(rng() * 19);
      const y = 3 + Math.floor(rng() * 18);
      if (G.map[y][x] !== 'gloomstone') continue;
      if (cheb(x, y, 28, 12) < 3 || cheb(x, y, 3, 12) < 4) continue;
      if (G.monsters.some(m => cheb(m.x, m.y, x, y) < 2)) continue;
      const mob = { x, y, type, alive: true, respawnAt: 0, home: { x, y }, moveAt: 0.8 + rng() };
      maybeElite(mob, 5, rng); // the realm crawls with elites
      G.monsters.push(mob);
      placed++;
    }
  }
  G.monsters.push({ x: 28, y: 12, type: 'sognaroth', alive: true, respawnAt: 0, home: { x: 28, y: 12 }, moveAt: Infinity });
}

function walkable(x, y) {
  if (x < 0 || y < 0 || x >= G.mw || y >= G.mh) return false;
  const t = G.map[y][x];
  if (!FLOOR_TILES.has(t)) return false;
  if (G.mapId === 'village' && G.state && G.state.base) {
    const bid = buildingAt(x, y);
    if (bid && G.state.base[bid] > 0) return false;
    if (G.state.base.walls > 0 && isWallTile(x, y)) return false;
  }
  if (npcAt(x, y)) return false;
  return true;
}

// ---------- travel ----------

function travelTo(mapId, x, y) {
  G.state.mapId = mapId;
  buildMap(mapId);
  if (mapId === 'dungeon' && G.dungeonSpawn) { x = G.dungeonSpawn.x; y = G.dungeonSpawn.y; }
  G.state.x = x; G.state.y = y;
  calcStats(); // pacts/meta may have changed max HP etc.
  G.px = (x + 0.5) * TILE;
  G.py = (y + 0.5) * TILE;
  G.path = []; G.pendingMine = null; G.pendingNpc = null;
  G.gateArmed = !gateAt(x, y); // spawned on a gate? don't let it fire until you step off
  G.locatePulse = 1.6;
  setMusic(mapId);
  renderHUD();
  save();
}

// pop back out of a dungeon into the exact zone you left, beside the entrance
function restoreZone() {
  const z = G.zoneReturn;
  G.state.mapId = z.zone; G.mapId = z.zone;
  G.map = z.map; G.nodes = z.nodes; G.monsters = z.monsters; G.gates = z.gates;
  G.wallTiles = z.wallTiles; G.mw = z.mw; G.mh = z.mh;
  G.state.x = z.x; G.state.y = z.y;
  G.px = (z.x + 0.5) * TILE; G.py = (z.y + 0.5) * TILE;
  G.path = []; G.pendingMine = null; G.pendingNpc = null;
  G.dungeonSpawn = null;
  G.zoneReturn = null;
  G.state.dungeon = null;
  G.gateArmed = !gateAt(z.x, z.y); // returned onto the dungeon entrance? don't re-enter instantly
  G.locatePulse = 1.6;
  calcStats();
  setMusic(z.zone);
  renderHUD();
  save();
}

function onGate(g) {
  if (g.kind === 'village') {
    G.state.activePact = null;
    G.zoneReturn = null;
    travelTo('village', VILLAGE_ENTRY.x, VILLAGE_ENTRY.y);
    toast('🏘️ Home sweet Drizzlewick.');
  } else if (g.kind === 'zone') {
    const z = ZONES[g.zone];
    G.state.activePact = null;
    G.zoneReturn = null;
    travelTo(g.zone, zoneSpawn(g.zone).x, zoneSpawn(g.zone).y);
    const cleared = G.state.zonesCleared[g.zone];
    toast(`${z.dir} — ${z.name}: ${z.blurb}.${cleared ? ' ☀️ The light has returned here.' : ''}`);
    if (!cleared && !G.state.sunRestored) offerPact(g.zone);
  } else if (g.kind === 'dungeon') {
    const dcfg = DUNGEONS[g.dtype];
    const tier = ZONE_IDS.includes(g.fromZone) ? ZONES[g.fromZone].tier : 1;
    // remember the zone exactly so we pop back out beside the entrance, not the far edge
    const pt = playerTile();
    G.zoneReturn = {
      zone: G.mapId, x: pt.x, y: pt.y,
      map: G.map, nodes: G.nodes, monsters: G.monsters, gates: G.gates,
      wallTiles: G.wallTiles, mw: G.mw, mh: G.mh,
    };
    G.state.dungeon = { type: g.dtype, fromZone: g.fromZone, tier, floor: 1, maxFloor: 2 + (Math.random() < 0.5 ? 1 : 0), hasKey: false };
    travelTo('dungeon', 0, 0);
    toast(`${dcfg.emoji} You enter the ${dcfg.name} — ${G.state.dungeon.maxFloor} floors deep. Deadly, but rich.`);
  } else if (g.kind === 'zoneback') {
    if (G.zoneReturn && G.zoneReturn.zone === g.zone) restoreZone();
    else travelTo(g.zone, zoneSpawn(g.zone).x, zoneSpawn(g.zone).y);
    toast('🪜 You climb back out into the open.');
  } else if (g.kind === 'stairsdown') {
    if (G.state.dungeon.hasKey) {
      G.state.dungeon.floor++;
      G.state.dungeon.tier++;
      G.state.dungeon.hasKey = false;
      travelTo('dungeon', 0, 0);
      toast(`⬇️ You descend to floor ${G.state.dungeon.floor}. The gloom thickens…`);
    } else {
      toast('🔒 The way down is locked. Defeat the Warden to claim its key.');
      const p = playerTile();
      for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
        if (walkable(p.x + dx, p.y + dy)) {
          G.px = (p.x + dx + 0.5) * TILE; G.py = (p.y + dy + 0.5) * TILE;
          G.state.x = p.x + dx; G.state.y = p.y + dy;
          break;
        }
      }
    }
  } else if (g.kind === 'cloudgate') {
    if (G.state.mainQuest >= 3) rideRainbow();
    else toast('🌈 A faint shimmer in the stones… the Mayor might know what it means.');
  } else if (g.kind === 'portal') {
    enterPortal();
  }
}

function rideRainbow() {
  if (G.riding) return;
  G.riding = true;
  const w = window.innerWidth, h = window.innerHeight;
  fxBeam(60, h - 100, w - 80, 80);
  FX.parts.push({ x: 60, y: h - 100, tx: w - 80, ty: 80, speed: 520, sprite: 'unicorn', size: 80, life: 6, t: 0, trail: true });
  sndRainbowRide();
  toast('🌈 You cast the rainbow — your unicorn leaps skyward!');
  setQuest(4);
  G.state.activePact = null;
  setTimeout(() => {
    travelTo('clouds', 4, 8);
    G.riding = false;
    toast('☁️ The Rainycastle looms ahead, wrapped in storm…');
  }, 1700);
}

function enterPortal() {
  if (!confirm("Beyond this portal lies Sog'naroth's realm.\n\nTHERE IS NO WAY BACK. No village, no gems, no resupply — only the skills and spell charges you carry right now.\n\nEnter?")) {
    // step off so it doesn't instantly re-trigger
    const p = playerTile();
    for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
      if (walkable(p.x + dx, p.y + dy)) {
        G.px = (p.x + dx + 0.5) * TILE; G.py = (p.y + dy + 0.5) * TILE;
        G.state.x = p.x + dx; G.state.y = p.y + dy;
        break;
      }
    }
    return;
  }
  setQuest(6);
  G.state.activePact = null;
  travelTo('realm', 3, 12);
  toast('🌀 The portal seals behind you. The rain here falls in colors that have no names.');
}

// ---------- save / load ----------

function save() {
  if (!G.state) return;
  const s = G.state;
  localStorage.setItem(SAVE_KEY, JSON.stringify({
    classId: s.classId, level: s.level, xp: s.xp, skillPoints: s.skillPoints,
    hp: s.hp, x: Math.round(G.px / TILE - 0.5), y: Math.round(G.py / TILE - 0.5),
    raw: s.raw, polished: s.polished, spells: s.spells, skills: s.skills,
    kills: s.kills, bossDefeated: s.bossDefeated, sunRestored: s.sunRestored, base: s.base,
    mapId: G.mapId, mainQuest: s.mainQuest, zonesCleared: s.zonesCleared, npcFlags: s.npcFlags,
    equip: s.equip, inventory: s.inventory, reviveUsed: s.reviveUsed, activePact: s.activePact, dungeon: s.dungeon,
  }));
}

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

function resetSave() {
  localStorage.removeItem(SAVE_KEY);
  location.reload();
}

// meta-progression store: Motes, purchased upgrades, and best-run records
function loadMeta() {
  try {
    const m = JSON.parse(localStorage.getItem(META_KEY)) || {};
    m.motes = m.motes || 0;
    m.upgrades = m.upgrades || {};
    return m;
  } catch (e) { return { motes: 0, upgrades: {} }; }
}
function saveMeta(m) { localStorage.setItem(META_KEY, JSON.stringify(m)); }

// always-on bonuses from purchased 'eff' upgrades
function metaEff(key) {
  const up = loadMeta().upgrades;
  let v = 0;
  for (const [id, rank] of Object.entries(up)) {
    const def = META_UPGRADES[id];
    if (def && def.eff && def.eff[key]) v += def.eff[key] * rank;
  }
  return v;
}

function motesForRun(s) {
  const zones = ZONE_IDS.filter(z => s.zonesCleared[z]).length;
  return s.kills * 2 + zones * 15 + s.level * 3 + (s.sunRestored ? 100 : 0);
}

// rogue-like: on death the hero is gone. Bank Motes, record the run, wipe save.
function recordDeath() {
  const s = G.state;
  const meta = loadMeta();
  const zones = ZONE_IDS.filter(z => s.zonesCleared[z]).length;
  const earned = motesForRun(s);
  meta.motes += earned;
  meta.runs = (meta.runs || 0) + 1;
  meta.bestLevel = Math.max(meta.bestLevel || 0, s.level);
  meta.bestZones = Math.max(meta.bestZones || 0, zones);
  meta.bestKills = Math.max(meta.bestKills || 0, s.kills);
  saveMeta(meta);
  localStorage.removeItem(SAVE_KEY); // the hero is lost
  return { level: s.level, zones, kills: s.kills, earned, best: meta };
}

// ---------- game start ----------

function newGameWithClass(classId) {
  const cls = CLASSES[classId];
  G.state = {
    classId, level: 1, xp: 0, skillPoints: 1,
    hp: cls.hp, hpMax: cls.hp,
    raw: {}, polished: {},
    spells: Object.assign({ glitterbomb: 4 }, cls.perkSpells || {}),
    skills: {},
    kills: 0, bossDefeated: false, sunRestored: false, reviveUsed: false,
    base: { house: 1, kitchen: 0, factory: 0, stalls: 0, training: 0, walls: 0 },
    mapId: 'village', mainQuest: 0,
    zonesCleared: { north: false, east: false, west: false, south: false }, npcFlags: {},
    equip: { weapon: rollItem(1, 'common', 'weapon'), helm: null, armor: null, boots: null, charm: null },
    inventory: [], activePact: null, dungeon: null,
    x: SPAWN.x, y: SPAWN.y,
  };
  // apply Sanctuary starting grants
  const up = loadMeta().upgrades;
  if (up.trained) G.state.skillPoints += up.trained;
  if (up.prospector) G.state.polished.quartz = { rough: 0, fine: up.prospector * 2, brilliant: 0 };
  if (up.arsenal) G.state.equip.weapon = rollItem(3, 'magic', 'weapon');
  calcStats();
  G.state.hp = G.state.hpMax; // start full (meta HP included)
  startGame();
  toast(`Welcome to Drizzlewick, ${cls.name}! The Mayor 🎩 is waiting to speak with you.`);
}

function startGame() {
  const s = G.state;
  buildMap(s.mapId || 'village');
  if (!walkable(s.x, s.y)) {
    const home = G.mapId === 'village' ? SPAWN : inZone() ? zoneSpawn(G.mapId)
      : G.mapId === 'clouds' ? { x: 4, y: 8 } : { x: 3, y: 12 };
    s.x = home.x; s.y = home.y;
  }
  G.px = (s.x + 0.5) * TILE;
  G.py = (s.y + 0.5) * TILE;
  G.path = [];
  G.pendingMine = null; G.pendingNpc = null;
  G.gateArmed = !gateAt(s.x, s.y);
  closeAllScreens();
  document.getElementById('hud').style.display = 'flex';
  G.locatePulse = 1.6;
  setMusic(G.mapId);
  renderHUD();
  save();
}

function boot() {
  G.canvas = document.getElementById('game');
  G.ctx = G.canvas.getContext('2d');
  resizeCanvas();
  fxInit();
  seedRain();
  sndBoot();
  window.addEventListener('resize', resizeCanvas);
  G.canvas.addEventListener('pointerdown', onTap);
  window.addEventListener('keydown', onKey);
  bindUI();

  const saved = loadSave();
  if (saved && CLASSES[saved.classId]) {
    G.state = Object.assign({
      raw: {}, polished: {}, spells: {}, skills: {}, kills: 0, bossDefeated: false, sunRestored: false,
      reviveUsed: false,
      base: { house: 1, kitchen: 0, factory: 0, stalls: 0, training: 0, walls: 0 },
      mapId: 'village', mainQuest: 0,
      zonesCleared: { north: false, east: false, west: false, south: false }, npcFlags: {},
      equip: { weapon: null, helm: null, armor: null, boots: null, charm: null },
      inventory: [], activePact: null, dungeon: null,
    }, saved);
    calcStats();
    if (G.state.hp <= 0) G.state.hp = G.state.hpMax;
    // procedural maps are rebuilt fresh — re-enter them at their entry
    // a saved dungeon is ephemeral: pop back out to its zone
    if (G.state.mapId === 'dungeon') G.state.mapId = (G.state.dungeon && G.state.dungeon.fromZone) || 'village';
    G.mapId = G.state.mapId;
    if (ZONE_IDS.includes(G.state.mapId)) { const sp = zoneSpawn(G.state.mapId); G.state.x = sp.x; G.state.y = sp.y; }
    if (G.state.mapId === 'realm') { G.state.x = 3; G.state.y = 12; }
    startGame();
    toast('Welcome back! Your quest continues.');
  } else {
    showClassScreen();
  }
  requestAnimationFrame(frame);
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  G.canvas.width = window.innerWidth * dpr;
  G.canvas.height = window.innerHeight * dpr;
  G.canvas.style.width = window.innerWidth + 'px';
  G.canvas.style.height = window.innerHeight + 'px';
  G.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// ---------- input ----------

function playerTile() { return { x: Math.floor(G.px / TILE), y: Math.floor(G.py / TILE) }; }

function onTap(e) {
  sndUnlock();
  if (G.lock || !G.state || G.riding) return;
  const cam = camera();
  const tx = Math.floor((e.clientX + cam.x) / TILE);
  const ty = Math.floor((e.clientY + cam.y) / TILE);
  if (tx < 0 || ty < 0 || tx >= G.mw || ty >= G.mh) return;

  const p = playerTile();
  // villagers: walk over and talk
  const npcId = npcAt(tx, ty);
  if (npcId) {
    if (cheb(p.x, p.y, tx, ty) <= 1) { openNpc(npcId); return; }
    const path = findPath(p, (x, y) => cheb(x, y, tx, ty) <= 1);
    if (path) { G.path = path; G.pendingNpc = npcId; G.pendingMine = null; }
    return;
  }
  // camp buildings open the build menu
  if (G.mapId === 'village' && buildingAt(tx, ty)) { openBase(); return; }

  const node = G.nodes.find(n => n.x === tx && n.y === ty && n.respawnAt <= G.time);
  if (node) {
    if (cheb(p.x, p.y, tx, ty) <= 1) { mineNode(node); G.path = []; G.pendingMine = null; return; }
    const path = findPath(p, (x, y) => cheb(x, y, tx, ty) <= 1);
    if (path) { G.path = path; G.pendingMine = node; G.pendingNpc = null; }
    else toast("Can't reach that node from here.");
    return;
  }
  G.pendingMine = null; G.pendingNpc = null;
  const goal = walkable(tx, ty)
    ? (x, y) => x === tx && y === ty
    : (x, y) => cheb(x, y, tx, ty) <= 1;
  const path = findPath(p, goal);
  if (path) G.path = path;
  else toast("Can't walk there.");
}

function onKey(e) {
  sndUnlock();
  if (G.lock || !G.state || G.riding) return;
  const dirs = {
    ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
    w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
  };
  const d = dirs[e.key];
  if (!d) return;
  const p = playerTile();
  const nx = p.x + d[0], ny = p.y + d[1];
  const npcId = npcAt(nx, ny);
  if (npcId) { openNpc(npcId); return; }
  const node = G.nodes.find(n => n.x === nx && n.y === ny && n.respawnAt <= G.time);
  if (node) { mineNode(node); return; }
  if (walkable(nx, ny)) { G.path = [{ x: nx, y: ny }]; G.pendingMine = null; G.pendingNpc = null; }
}

function findPath(start, goalPred) {
  if (goalPred(start.x, start.y)) return [];
  const prev = new Map();
  const key = (x, y) => y * G.mw + x;
  const queue = [start];
  prev.set(key(start.x, start.y), null);
  while (queue.length) {
    const cur = queue.shift();
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const nx = cur.x + dx, ny = cur.y + dy;
      if (!walkable(nx, ny) || prev.has(key(nx, ny))) continue;
      prev.set(key(nx, ny), cur);
      if (goalPred(nx, ny)) {
        const path = [{ x: nx, y: ny }];
        let back = cur;
        while (back && !(back.x === start.x && back.y === start.y)) {
          path.unshift({ x: back.x, y: back.y });
          back = prev.get(key(back.x, back.y));
        }
        return path;
      }
      queue.push({ x: nx, y: ny });
    }
  }
  return null;
}

// ---------- mining ----------

function mineNode(node) {
  const s = G.state;
  const m = MINERALS[node.mineral];
  let amount = 1 + (Math.random() < 0.35 ? 1 : 0) + eff('mineYield');
  s.raw[node.mineral] = (s.raw[node.mineral] || 0) + amount;
  node.respawnAt = G.time + 60;
  addFloater(node.x, node.y, `+${amount} ${m.name}`, m.color);
  sndMine();
  const cam = camera();
  fxBurst(node.x * TILE - cam.x + TILE / 2, node.y * TILE - cam.y + TILE / 2,
    { colors: [m.color, '#ffffff'], star: true, count: 16, speed: 230, life: 0.8, g: 260 });
  if (eff('rareLuck') > 0 && Math.random() < eff('rareLuck')) {
    const bonus = ['aquamarine', 'emerald', 'roseopal'][Math.floor(Math.random() * 3)];
    s.raw[bonus] = (s.raw[bonus] || 0) + 1;
    addFloater(node.x, node.y - 1, `🍀 +1 ${MINERALS[bonus].name}!`, MINERALS[bonus].color);
  }
  save();
}

function addFloater(tx, ty, text, color) {
  G.floaters.push({ x: (tx + 0.5) * TILE, y: ty * TILE, text, color, t: 0 });
}

// ---------- rain ----------

function seedRain() {
  G.rain = [];
  for (let i = 0; i < 90; i++) {
    G.rain.push({
      x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight,
      v: 360 + Math.random() * 260, l: 12 + Math.random() * 10,
    });
  }
}

function updateRain(dt) {
  if (!G.rain) return;
  for (const d of G.rain) {
    d.y += d.v * dt;
    d.x += d.v * 0.22 * dt;
    if (d.y > window.innerHeight + 20) { d.y = -20; d.x = Math.random() * (window.innerWidth + 100) - 80; }
    if (d.x > window.innerWidth + 20) d.x -= window.innerWidth + 40;
  }
}

// ---------- update ----------

const WALK_SPEED = 5.2; // tiles per second

function update(dt) {
  G.time += dt;
  updateRain(dt);
  if (G.locatePulse > 0) G.locatePulse = Math.max(0, G.locatePulse - dt);
  if (!G.state || G.lock || G.riding) return;

  // resting in the village heals (house and kitchen make it heartier)
  if (atBase() && G.state.hp < G.state.hpMax && G.time >= (G.healAt || 0)) {
    G.healAt = G.time + 2;
    const amt = 2 + (G.state.base.house || 0) + (G.state.base.kitchen || 0) * 2;
    G.state.hp = Math.min(G.state.hpMax, G.state.hp + amt);
    const p0 = playerTile();
    addFloater(p0.x, p0.y, `+${amt} ❤️`, '#7bf59b');
    renderHUD();
  }

  // player follows path
  if (G.path.length) {
    const target = G.path[0];
    const txp = (target.x + 0.5) * TILE, typ = (target.y + 0.5) * TILE;
    const dx = txp - G.px, dy = typ - G.py;
    const dist = Math.hypot(dx, dy);
    const step = WALK_SPEED * TILE * dt;
    if (dist <= step) {
      G.px = txp; G.py = typ;
      G.path.shift();
      G.state.x = target.x; G.state.y = target.y;
      // gates only work once you've stepped onto the map proper — so you don't
      // accidentally walk straight back out of the gate you spawned on
      if (!gateAt(target.x, target.y)) G.gateArmed = true;
      const mon = G.monsters.find(m => m.alive && m.x === target.x && m.y === target.y);
      if (mon) { G.path = []; G.pendingMine = null; G.pendingNpc = null; startBattle(mon, false); return; }
      const gate = G.gates.find(g => g.x === target.x && g.y === target.y);
      if (gate && G.gateArmed) { G.path = []; G.pendingMine = null; G.pendingNpc = null; onGate(gate); return; }
      if (!G.path.length && G.pendingMine) {
        const n = G.pendingMine; G.pendingMine = null;
        const p = playerTile();
        if (n.respawnAt <= G.time && cheb(p.x, p.y, n.x, n.y) <= 1) mineNode(n);
      }
      if (!G.path.length && G.pendingNpc) {
        const id = G.pendingNpc; G.pendingNpc = null;
        const npc = G.npcs.find(n => n.id === id);
        const p = playerTile();
        if (npc && cheb(p.x, p.y, npc.x, npc.y) <= 1) openNpc(id);
      }
    } else {
      G.px += (dx / dist) * step;
      G.py += (dy / dist) * step;
    }
    if (Math.abs(dx) > 0.5) G.faceLeft = dx < 0;
  }

  // monsters wander / chase / respawn
  const p = playerTile();
  for (const m of G.monsters) {
    if (!m.alive) {
      if (m.respawnAt && m.respawnAt !== Infinity && G.time >= m.respawnAt
          && !inSun(m.home.x, m.home.y) && cheb(m.home.x, m.home.y, p.x, p.y) > 4) {
        m.alive = true; m.x = m.home.x; m.y = m.home.y; m.respawnAt = 0;
      }
      continue;
    }
    if (m.moveAt === Infinity) continue;
    m.moveAt -= dt;
    if (m.moveAt > 0) continue;
    m.moveAt = 0.8 + Math.random() * 0.8;
    let dx = 0, dy = 0;
    const dist = cheb(m.x, m.y, p.x, p.y);
    if (dist <= 5) {
      dx = Math.sign(p.x - m.x); dy = Math.sign(p.y - m.y);
      if (dx && dy) { if (Math.random() < 0.5) dx = 0; else dy = 0; }
    } else {
      const r = Math.floor(Math.random() * 4);
      [dx, dy] = [[0, -1], [0, 1], [-1, 0], [1, 0]][r];
    }
    const nx = m.x + dx, ny = m.y + dy;
    if (inSun(nx, ny)) continue; // gloom-things hiss and stop at the sunlight's edge
    if (cheb(nx, ny, m.home.x, m.home.y) > 7) continue; // don't wander too far from home
    if (nx === p.x && ny === p.y) { startBattle(m, true); return; }
    if (walkable(nx, ny) && !G.monsters.some(o => o !== m && o.alive && o.x === nx && o.y === ny)) {
      m.x = nx; m.y = ny;
    }
  }

  for (const f of G.floaters) f.t += dt;
  G.floaters = G.floaters.filter(f => f.t < 1.4);

  if (G.time - G.saveAt > 5) { G.saveAt = G.time; save(); }
}

// ---------- rendering ----------

function camera() {
  const w = window.innerWidth, h = window.innerHeight;
  return {
    x: clamp(G.px - w / 2, 0, Math.max(0, G.mw * TILE - w)),
    y: clamp(G.py - h / 2, 0, Math.max(0, G.mh * TILE - h)),
  };
}

const TILE_COLORS = {
  grass: ['#79c14e', '#83c957'],
  tree: ['#5aa23c', '#5aa23c'],
  water: ['#4aa3df', '#4aa3df'],
  cottage: ['#79c14e', '#83c957'],
  cloud: ['#e4e9f6', '#d8def0'],
  sky: ['#8fb0e8', '#87a9e3'],
  keep: ['#cfd6ea', '#cfd6ea'],
  gloomstone: ['#332a4a', '#3a3054'],
  voidt: ['#171126', '#181229'],
  cavefloor: ['#4a4048', '#443a44'], caverock: ['#241f2c', '#2a2434'],
  ruinfloor: ['#6a6558', '#736e60'], ruinwall: ['#3f3c33', '#48453a'],
  housefloor: ['#7a5a3a', '#845f3c'], housewall: ['#33241a', '#3a2a20'],
};

const GATE_EMOJI = { village: '🏘️', world: '🗺️', cloudgate: '🌈', portal: '🌀', zoneback: '🪜', stairsdown: '⬇️' };

function tileHash(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return (h >>> 0);
}

// deterministic per-tile specks so ground reads as textured, not flat
const TILE_SPECKS = {
  grass: ['#5fa83c', '#93d861', '#5fa83c'],
  cloud: ['#f2f5ff', '#c6cee6'],
  gloomstone: ['#40365c', '#28203e'],
  keep: ['#e6ebf7', '#b8c0d8'],
  cavefloor: ['#5a5058', '#38303c'],
  ruinfloor: ['#7c8a5c', '#565042'],
  housefloor: ['#8a6a44', '#5f4326'],
};
function tileTexture(ctx, t, sx, sy, x, y) {
  const specks = TILE_SPECKS[t];
  if (!specks) return;
  const h = tileHash(x, y);
  const n = 3 + (h & 1);
  for (let i = 0; i < n; i++) {
    const hi = (h >>> (i * 5)) & 0x3ff;
    const px = sx + 4 + (hi & 7) * (TILE - 10) / 7;
    const py = sy + 4 + ((hi >> 3) & 7) * (TILE - 10) / 7;
    ctx.fillStyle = specks[(hi >> 6) % specks.length];
    const sz = 2 + ((hi >> 8) & 1);
    if (t === 'grass' && (hi & 1)) { ctx.fillRect(px, py, 1, sz + 1); } // blades
    else ctx.fillRect(px, py, sz, sz);
  }
  // occasional flower on grass
  if (t === 'grass' && (h & 0x1f) === 0) {
    ctx.fillStyle = ['#ff9ecb', '#ffe27a', '#c9a8ff'][(h >> 8) % 3];
    ctx.fillRect(sx + 6 + (h & 15), sy + 8 + ((h >> 4) & 15), 2, 2);
  }
}

function draw() {
  const ctx = G.ctx;
  const w = window.innerWidth, h = window.innerHeight;
  if (window.__spriteSheet && typeof drawSpriteSheet === 'function') { drawSpriteSheet(); return; }
  ctx.fillStyle = '#25203a';
  ctx.fillRect(0, 0, w, h);
  if (!G.state || !G.map) return;

  const cam = camera();
  const x0 = Math.floor(cam.x / TILE), y0 = Math.floor(cam.y / TILE);
  const x1 = Math.min(G.mw - 1, x0 + Math.ceil(w / TILE) + 1);
  const y1 = Math.min(G.mh - 1, y0 + Math.ceil(h / TILE) + 1);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // pass 1: ground — base colour, texture, water/void detail, weather wash
  const zoneGround = inZone() ? ZONES[G.mapId].ground : null; // themed grass per zone
  for (let y = Math.max(0, y0); y <= y1; y++) {
    for (let x = Math.max(0, x0); x <= x1; x++) {
      const t = G.map[y][x];
      const sx = x * TILE - cam.x, sy = y * TILE - cam.y;
      const grassy = t === 'grass' || t === 'tree' || t === 'cottage';
      const base = grassy ? (zoneGround || TILE_COLORS.grass) : TILE_COLORS[t];
      ctx.fillStyle = base[(x + y) % 2];
      ctx.fillRect(sx, sy, TILE, TILE);
      tileTexture(ctx, t === 'tree' || t === 'cottage' ? 'grass' : t, sx, sy, x, y);
      if (t === 'water') {
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        const wob = Math.sin(G.time * 2 + x * 1.7 + y * 2.3) * 3;
        ctx.fillRect(sx + 6 + wob, sy + TILE / 2, TILE - 16, 3);
        ctx.fillRect(sx + 10 - wob, sy + TILE * 0.28, TILE - 24, 2);
        // foam shoreline on every edge that touches land
        const isWater = (xx, yy) => G.map[yy] && G.map[yy][xx] === 'water';
        const foam = Math.sin(G.time * 3 + x * 2 + y) * 0.12;
        ctx.fillStyle = `rgba(210,244,255,${0.5 + foam})`;
        const th = 4;
        if (!isWater(x, y - 1)) ctx.fillRect(sx, sy, TILE, th);
        if (!isWater(x, y + 1)) ctx.fillRect(sx, sy + TILE - th, TILE, th);
        if (!isWater(x - 1, y)) ctx.fillRect(sx, sy, th, TILE);
        if (!isWater(x + 1, y)) ctx.fillRect(sx + TILE - th, sy, th, TILE);
      } else if (t === 'voidt') {
        ctx.fillStyle = 'rgba(180,92,255,0.12)';
        const pulse = Math.sin(G.time * 1.5 + x * 2.1 + y * 1.3) * 2;
        ctx.fillRect(sx + 10, sy + 10 + pulse, TILE - 20, TILE - 20);
      }
      if (G.mapId === 'village' || inZone()) {
        ctx.fillStyle = inSun(x, y) ? 'rgba(255,225,120,0.10)' : 'rgba(70,80,125,0.22)';
        ctx.fillRect(sx, sy, TILE, TILE);
      } else if (G.mapId === 'dungeon') {
        ctx.fillStyle = 'rgba(8,5,18,0.30)'; // torch-lit gloom
        ctx.fillRect(sx, sy, TILE, TILE);
      }
    }
  }

  // pass 2: static objects — trees & cottages as pixel sprites (with variation)
  for (let y = Math.max(0, y0); y <= y1; y++) {
    for (let x = Math.max(0, x0); x <= x1; x++) {
      const t = G.map[y][x];
      if (t !== 'tree' && t !== 'cottage') continue;
      const cx = x * TILE - cam.x + TILE / 2, cy = y * TILE - cam.y + TILE / 2;
      const hsh = tileHash(x, y);
      if (t === 'tree') {
        const sway = Math.sin(G.time * 1.6 + x * 1.3) * 1.5;
        drawShadow(ctx, cx, cy + TILE * 0.4, TILE * 0.44);
        drawSprite(ctx, 'tree', cx + sway, cy - TILE * 0.22, TILE * (1.28 + (hsh & 3) * 0.04), { flip: hsh & 4 });
      } else {
        drawShadow(ctx, cx, cy + TILE * 0.4, TILE * 0.5);
        drawSprite(ctx, 'cottage', cx, cy - TILE * 0.14, TILE * 1.18, { flip: hsh & 4 });
      }
    }
  }

  // camp buildings + walls (village only)
  if (G.mapId === 'village') {
    for (const [id, b] of Object.entries(BUILDINGS)) {
      if (!b.tile) continue;
      const lvl = G.state.base[id] || 0;
      const sx = b.tile.x * TILE - cam.x + TILE / 2, sy = b.tile.y * TILE - cam.y + TILE / 2;
      if (sx < -TILE || sy < -TILE || sx > w + TILE || sy > h + TILE) continue;
      const bkey = 'bld_' + id;
      if (lvl > 0) {
        drawShadow(ctx, sx, sy + TILE * 0.42, TILE * 0.5);
        if (!drawSprite(ctx, bkey, sx, sy - TILE * 0.16, TILE * 1.2)) {
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.font = `${TILE * 0.85}px "Segoe UI Emoji", serif`;
          ctx.fillText(b.emoji, sx, sy - 2);
        }
        ctx.fillStyle = '#ffd24a';
        for (let i = 0; i < lvl; i++) {
          ctx.beginPath();
          ctx.arc(sx - (lvl - 1) * 5 + i * 10, sy + TILE * 0.46, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        drawSprite(ctx, bkey, sx, sy - TILE * 0.16, TILE * 1.2, { alpha: 0.32 });
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `${TILE * 0.42}px "Segoe UI Emoji", serif`;
        ctx.fillText('🔨', sx + TILE * 0.28, sy + TILE * 0.2);
      }
    }
    if (G.state.base.walls > 0) {
      for (const [wx, wy] of G.wallTiles) {
        const sx = wx * TILE - cam.x + TILE / 2, sy = wy * TILE - cam.y + TILE / 2;
        if (sx < -TILE || sy < -TILE || sx > w + TILE || sy > h + TILE) continue;
        if (!drawSprite(ctx, 'wall', sx, sy, TILE + 1)) {
          ctx.font = `${TILE * 0.78}px "Segoe UI Emoji", serif`;
          ctx.fillText('🧱', sx, sy);
        }
      }
    }
  }

  // the Rainycastle keep
  if (G.mapId === 'clouds') {
    ctx.font = `${TILE * 2.1}px "Segoe UI Emoji", serif`;
    ctx.fillText('🏰', 18 * TILE - cam.x, 7 * TILE - cam.y - 6);
  }

  // the village landmark — a labelled 2x2 hamlet, drawn once at the block centre
  const villageGates = G.gates.filter(g => g.kind === 'village');
  if (villageGates.length) {
    const gx = villageGates.reduce((a, g) => a + g.x, 0) / villageGates.length;
    const gy = villageGates.reduce((a, g) => a + g.y, 0) / villageGates.length;
    const vx = (gx + 0.5) * TILE - cam.x, vy = (gy + 0.5) * TILE - cam.y;
    if (vx > -2 * TILE && vy > -2 * TILE && vx < w + 2 * TILE && vy < h + 2 * TILE) {
      drawVillageLandmark(ctx, vx, vy);
    }
  }

  // village zone gates — one directional signpost per zone
  const zoneGates = G.gates.filter(g => g.kind === 'zone');
  if (zoneGates.length) {
    const byZone = {};
    for (const g of zoneGates) (byZone[g.zone] = byZone[g.zone] || []).push(g);
    for (const [zid, gs] of Object.entries(byZone)) {
      const gx = gs.reduce((a, g) => a + g.x, 0) / gs.length;
      const gy = gs.reduce((a, g) => a + g.y, 0) / gs.length;
      drawZoneSign(ctx, (gx + 0.5) * TILE - cam.x, (gy + 0.5) * TILE - cam.y, zid);
    }
  }

  // dungeon entrances (in zones) — a labelled structure marker
  for (const g of G.gates) {
    if (g.kind !== 'dungeon') continue;
    const dcfg = DUNGEONS[g.dtype];
    const sx = g.x * TILE - cam.x + TILE / 2, sy = g.y * TILE - cam.y + TILE / 2;
    if (sx < -TILE || sy < -TILE || sx > w + TILE || sy > h + TILE) continue;
    drawShadow(ctx, sx, sy + TILE * 0.4, TILE * 0.55);
    ctx.font = `${TILE * 1.05}px "Segoe UI Emoji", serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(dcfg.emoji, sx, sy - TILE * 0.12 + Math.sin(G.time * 2 + g.x) * 1.5);
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.fillStyle = '#e0c6ff';
    ctx.strokeText(dcfg.name, sx, sy + TILE * 0.5);
    ctx.fillText(dcfg.name, sx, sy + TILE * 0.5);
  }

  // other gates (cloudgate / portal / dungeon exit)
  for (const g of G.gates) {
    if (g.kind === 'village' || g.kind === 'zone' || g.kind === 'dungeon') continue;
    if (g.kind === 'cloudgate' && G.state.mainQuest < 3) continue;
    const sx = g.x * TILE - cam.x + TILE / 2, sy = g.y * TILE - cam.y + TILE / 2;
    if (sx < -TILE || sy < -TILE || sx > w + TILE || sy > h + TILE) continue;
    const pulse = 1 + Math.sin(G.time * 3 + g.x) * 0.1;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(pulse, pulse);
    ctx.font = `${TILE * 0.72}px "Segoe UI Emoji", serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(GATE_EMOJI[g.kind], 0, 0);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, TILE * 0.42, 0, Math.PI * 2);
    ctx.stroke();
    if (g.kind === 'stairsdown') {
      const locked = !(G.state.dungeon && G.state.dungeon.hasKey);
      ctx.font = `${TILE * 0.4}px "Segoe UI Emoji", serif`;
      ctx.fillText(locked ? '🔒' : '🗝️', TILE * 0.3, -TILE * 0.3);
    }
    ctx.restore();
  }

  // mineral nodes
  for (const n of G.nodes) {
    const sx = n.x * TILE - cam.x + TILE / 2, sy = n.y * TILE - cam.y + TILE / 2;
    if (sx < -TILE || sy < -TILE || sx > w + TILE || sy > h + TILE) continue;
    const min = MINERALS[n.mineral];
    const alive = n.respawnAt <= G.time;
    ctx.save();
    ctx.translate(sx, sy);
    if (alive) {
      const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, TILE * 0.9);
      grad.addColorStop(0, min.glow + '77');
      grad.addColorStop(1, min.glow + '00');
      ctx.fillStyle = grad;
      ctx.fillRect(-TILE, -TILE, TILE * 2, TILE * 2);
      const pulse = 1 + Math.sin(G.time * 3 + n.x) * 0.07;
      ctx.scale(pulse, pulse);
      drawGemCanvas(ctx, 0, 0, TILE * 0.36, n.mineral, G.time);
      for (let k = 0; k < 2; k++) {
        const ang = G.time * (1.3 + k * 0.4) + n.x * 2 + k * 2.6;
        const spx = Math.cos(ang) * TILE * 0.42;
        const spy = Math.sin(ang * 1.4) * TILE * 0.36 - 4;
        ctx.globalAlpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(G.time * 5 + k * 3 + n.y));
        drawStar(ctx, spx, spy, 4.5, '#ffffff', ang);
        ctx.globalAlpha = 1;
      }
    } else {
      ctx.globalAlpha = 0.45;
      drawGemCanvas(ctx, 0, 0, TILE * 0.16, n.mineral, 0);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  // villagers
  for (const n of G.npcs) {
    const sx = n.x * TILE - cam.x + TILE / 2, sy = n.y * TILE - cam.y + TILE / 2;
    if (sx < -TILE || sy < -TILE || sx > w + TILE || sy > h + TILE) continue;
    const nbr = Math.sin(G.time * 2.5 + n.x);
    const nbob = nbr * 1.2;
    drawShadow(ctx, sx, sy + TILE * 0.42, TILE * 0.46);
    if (!drawSprite(ctx, NPC_SPRITE[n.id], sx, sy - 2, TILE * 1.02, { bob: nbob, squashY: 1 + nbr * 0.02, squashX: 1 - nbr * 0.015 })) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `${TILE * 0.78}px "Segoe UI Emoji", serif`;
      ctx.fillText(NPCS[n.id].emoji, sx, sy);
    }
    if (npcHasNews(n.id)) {
      const bob = Math.sin(G.time * 5) * 3;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `${TILE * 0.45}px "Segoe UI Emoji", serif`;
      ctx.fillText('❗', sx, sy - TILE * 0.62 + bob);
    }
  }

  // monsters — pixel sprite where we have one, emoji fallback otherwise
  const pt = playerTile();
  for (const m of G.monsters) {
    if (!m.alive) continue;
    const sx = m.x * TILE - cam.x + TILE / 2, sy = m.y * TILE - cam.y + TILE / 2;
    if (sx < -TILE || sy < -TILE || sx > w + TILE || sy > h + TILE) continue;
    const bob = Math.sin(G.time * 4 + m.home.x) * 2;
    const def = MONSTERS[m.type];
    const em = m.elite ? ELITE_MODS[m.elite] : null;
    if (em) {
      // pulsing coloured aura marking an elite
      const ar = TILE * (0.5 + Math.sin(G.time * 4 + m.home.x) * 0.05);
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = em.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sx, sy + TILE * 0.2, ar, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.restore();
    }
    const key = MONSTER_SPRITE[m.type];
    if (key && hasSprite(key)) {
      const size = def.boss ? TILE * 1.5 : TILE * 1.02;
      const breathe = Math.sin(G.time * 3 + m.home.x) * 0.035;
      drawShadow(ctx, sx, sy + TILE * 0.42, size * 0.5);
      drawSprite(ctx, key, sx, sy - 2, size, { bob, flip: m.x > pt.x, squashY: 1 + breathe, squashX: 1 - breathe });
      if (m.warden) {
        ctx.font = `${TILE * 0.4}px "Segoe UI Emoji", serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('🗝️', sx, sy - TILE * 0.55 + bob);
      } else if (em) {
        ctx.fillStyle = em.color;
        ctx.font = `${TILE * 0.32}px "Segoe UI Emoji", serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('✦', sx, sy - TILE * 0.5 + bob);
      }
    } else {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `${def.boss ? TILE * 1.15 : TILE * 0.72}px "Segoe UI Emoji", serif`;
      drawShadow(ctx, sx, sy + TILE * 0.4, TILE * 0.5);
      ctx.fillText(def.emoji, sx, sy + bob);
    }
  }

  // player — bouncy squash-stretch walk, idle breathe, facing flip, shadow
  const cls = classDef();
  const pcx = G.px - cam.x, pcy = G.py - cam.y;
  const walking = G.path.length > 0;
  let pbob, psx, psy;
  if (walking) {
    const bounce = Math.abs(Math.sin(G.time * 13));
    pbob = -bounce * 3.5;
    psy = 1 + bounce * 0.09;
    psx = 1 - bounce * 0.07;
  } else {
    const br = Math.sin(G.time * 3) * 0.5;
    pbob = br;
    psy = 1 + br * 0.03;
    psx = 1 - br * 0.02;
  }
  // locate glow — always a gentle pulse, flaring bigger right after you arrive
  const locate = G.locatePulse || 0;
  const beat = 0.5 + 0.5 * Math.sin(G.time * 3.5);
  const halo = ctx.createRadialGradient(pcx, pcy, 3, pcx, pcy, TILE * (0.95 + locate));
  halo.addColorStop(0, `rgba(255,238,170,${0.14 + beat * 0.05 + locate * 0.22})`);
  halo.addColorStop(1, 'rgba(255,238,170,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(pcx - TILE * 2.2, pcy - TILE * 2.2, TILE * 4.4, TILE * 4.4);
  ctx.strokeStyle = `rgba(255,236,150,${0.45 + locate * 0.45})`;
  ctx.lineWidth = 2 + locate * 2;
  ctx.beginPath();
  ctx.ellipse(pcx, pcy + TILE * 0.4, TILE * (0.42 + beat * 0.1 + locate * 0.6), TILE * (0.17 + beat * 0.04 + locate * 0.24), 0, 0, Math.PI * 2);
  ctx.stroke();

  drawShadow(ctx, pcx, pcy + TILE * 0.42, TILE * 0.5 * (walking ? 0.9 : 1));
  if (!drawSprite(ctx, playerSpriteKey(), pcx, pcy - 2, TILE * 1.05, { bob: pbob, flip: G.faceLeft, squashX: psx, squashY: psy })) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `${TILE * 0.8}px "Segoe UI Emoji", serif`;
    ctx.fillText(cls.emoji, pcx, pcy - 2);
  }

  // a bobbing "here you are" marker, shown briefly after arriving on a map
  if (locate > 0.04) {
    const my = pcy - TILE * 0.92 + Math.sin(G.time * 6) * 3;
    ctx.globalAlpha = Math.min(1, locate * 1.4);
    ctx.fillStyle = '#ffec96';
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pcx - 8, my - 7); ctx.lineTo(pcx + 8, my - 7); ctx.lineTo(pcx, my + 6); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // tap-target marker
  if (G.path.length) {
    const last = G.path[G.path.length - 1];
    const sx = last.x * TILE - cam.x + TILE / 2, sy = last.y * TILE - cam.y + TILE / 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, TILE * 0.3 + Math.sin(G.time * 6) * 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  // the weather: rain per map (heavier in the clouds, purple in the realm)
  if (!G.state.sunRestored && G.rain) {
    const drizzle = castleActive();
    const cfgKey = inZone() ? 'zone' : G.mapId;
    const cfg = {
      village: drizzle ? { color: 'rgba(170,190,255,', full: 0, light: 0.22 } : null,
      zone: { color: 'rgba(170,190,255,', full: 0.4, light: drizzle ? 0.18 : 0 },
      clouds: { color: 'rgba(190,205,255,', full: 0.55, light: 0 },
      realm: { color: 'rgba(180,92,255,', full: 0.45, light: 0 },
    }[cfgKey];
    if (cfg) {
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      for (const pass of ['full', 'light']) {
        if (!cfg[pass]) continue;
        ctx.strokeStyle = cfg.color + cfg[pass] + ')';
        ctx.beginPath();
        for (const d of G.rain) {
          const tx = Math.floor((d.x + cam.x) / TILE), ty = Math.floor((d.y + cam.y) / TILE);
          if (tx < 0 || ty < 0 || tx >= G.mw || ty >= G.mh) continue;
          const sunny = inSun(tx, ty);
          if (pass === 'full' ? sunny : !sunny) continue;
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x - d.l * 0.25, d.y - d.l);
        }
        ctx.stroke();
      }
    }
  }

  // floaters
  ctx.font = 'bold 15px system-ui, sans-serif';
  for (const f of G.floaters) {
    ctx.globalAlpha = 1 - f.t / 1.4;
    ctx.fillStyle = f.color;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 3;
    const fx = f.x - cam.x, fy = f.y - cam.y - f.t * 28;
    ctx.strokeText(f.text, fx, fy);
    ctx.fillText(f.text, fx, fy);
  }
  ctx.globalAlpha = 1;
}

// a 2x2 hamlet landmark marking the way home, with a waving flag and label
function drawVillageLandmark(ctx, cx, cy) {
  const s = TILE;
  // eye-catching pulse ring at the base
  const pr = s * 1.15 + Math.sin(G.time * 3) * 4;
  ctx.strokeStyle = 'rgba(255,236,150,0.55)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.6, pr, pr * 0.42, 0, 0, Math.PI * 2);
  ctx.stroke();
  drawShadow(ctx, cx, cy + s * 0.68, s * 1.5);
  // a little cluster of cottages: taller one behind, two in front
  drawSprite(ctx, 'cottage', cx, cy - s * 0.5, s * 1.4);
  drawSprite(ctx, 'cottage', cx - s * 0.62, cy + s * 0.06, s * 1.12);
  drawSprite(ctx, 'cottage', cx + s * 0.62, cy + s * 0.06, s * 1.12, { flip: true });
  // flag on the tall cottage
  const fx = cx + s * 0.02, fy = cy - s * 1.05;
  ctx.strokeStyle = '#6a4028';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(fx, fy);
  ctx.lineTo(fx, fy - s * 0.5);
  ctx.stroke();
  const wav = Math.sin(G.time * 4) * 3;
  ctx.fillStyle = '#ff6ec7';
  ctx.beginPath();
  ctx.moveTo(fx, fy - s * 0.5);
  ctx.lineTo(fx + s * 0.34 + wav, fy - s * 0.4);
  ctx.lineTo(fx, fy - s * 0.3);
  ctx.closePath();
  ctx.fill();
  // label
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = 'rgba(0,0,0,0.75)';
  ctx.fillStyle = '#fff';
  ctx.strokeText('Village', cx, cy + s * 1.0);
  ctx.fillText('Village', cx, cy + s * 1.0);
}

// a wooden signpost in the village pointing to a zone, with its name + cleared mark
function drawZoneSign(ctx, cx, cy, zid) {
  const z = ZONES[zid];
  const cleared = G.state.zonesCleared[zid];
  const arrow = { North: '▲', South: '▼', East: '▶', West: '◀' }[z.dir];
  // post
  ctx.fillStyle = '#6a4028';
  ctx.fillRect(cx - 2, cy - 4, 4, TILE * 0.5);
  // board
  const bw = TILE * 1.5, bh = 18;
  ctx.fillStyle = cleared ? '#3a7d3a' : '#8a5a2a';
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 2;
  ctx.fillRect(cx - bw / 2, cy - 24, bw, bh);
  ctx.strokeRect(cx - bw / 2, cy - 24, bw, bh);
  // direction line
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${arrow} ${z.dir}`, cx, cy - 15);
  // zone name below
  ctx.font = '10px system-ui, sans-serif';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0,0,0,0.75)';
  ctx.fillStyle = cleared ? '#bff0bf' : '#ffe9a8';
  const label = (cleared ? '✓ ' : '') + z.name;
  ctx.strokeText(label, cx, cy + TILE * 0.5);
  ctx.fillText(label, cx, cy + TILE * 0.5);
}

let lastFrame = 0;
function frame(ts) {
  const dt = Math.min(0.05, (ts - lastFrame) / 1000 || 0.016);
  lastFrame = ts;
  const dpr = window.devicePixelRatio || 1;
  if (G.canvas.width !== Math.round(window.innerWidth * dpr)
      || G.canvas.height !== Math.round(window.innerHeight * dpr)) resizeCanvas();
  update(dt);
  draw();
  requestAnimationFrame(frame);
}
