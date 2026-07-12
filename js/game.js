// Prism Quest — core engine: state, world, rendering, movement, mining

const TILE = 44;
const MAP_W = 48, MAP_H = 36;
const SPAWN = { x: 6, y: 6 };
const SAVE_KEY = 'prismquest_save_v1';

// Global game object
const G = {
  state: null,       // player state (saved)
  map: null,         // 2D tile grid: 'grass' | 'tree' | 'water' | 'dark' | 'darktree'
  nodes: [],         // mineral nodes {x, y, mineral, respawnAt}
  monsters: [],      // {x, y, type, alive, respawnAt, home:{x,y}, moveAt}
  path: [],          // tiles the player is walking through
  pendingMine: null, // node to mine when path completes
  px: 0, py: 0,      // player position in pixels (tile centers)
  floaters: [],      // {x, y, text, color, t}
  lock: false,       // true when any overlay screen is open
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

// Sum a skill-effect key across owned nodes + class perk.
function eff(key) {
  const cls = classDef();
  let v = (cls.perk && cls.perk[key]) || 0;
  for (const branch of cls.tree) {
    for (const node of branch.nodes) {
      if (G.state.skills[node.id] && node.eff[key]) v += node.eff[key];
    }
  }
  return v;
}

function calcStats() {
  const s = G.state, cls = classDef();
  const lvl = s.level;
  s.hpMax = cls.hp + 6 * (lvl - 1) + eff('hpMax');
  s.atk = cls.atk + (lvl - 1);
  s.mag = cls.mag + (lvl - 1);
  s.def = Math.floor(cls.def + (lvl - 1) * cls.defGrow) + eff('defFlat');
  s.hp = clamp(s.hp, 0, s.hpMax);
}

function xpNext(level) { return Math.round(18 * Math.pow(level, 1.5)); }

function gainXp(n) {
  const s = G.state;
  const gained = Math.round(n * (1 + eff('xpGain')));
  s.xp += gained;
  let leveled = false;
  while (s.xp >= xpNext(s.level) && s.level < 30) {
    s.xp -= xpNext(s.level);
    s.level++;
    s.skillPoints++;
    leveled = true;
  }
  if (leveled) {
    calcStats();
    G.state.hp = G.state.hpMax;
    toast(`⭐ Level ${s.level}! Fully healed. +1 skill point`);
  }
  renderHUD();
  return gained;
}

// ---------- world generation ----------

function inDark(x, y) { return x >= 36 && y >= 24; }

function buildWorld() {
  const rng = mulberry32(1337);
  G.map = [];
  for (let y = 0; y < MAP_H; y++) {
    const row = [];
    for (let x = 0; x < MAP_W; x++) {
      let t = 'grass';
      // border forest, two tiles thick
      if (x < 2 || y < 2 || x >= MAP_W - 2 || y >= MAP_H - 2) t = 'tree';
      // lake
      const dx = (x - 30) / 6.5, dy = (y - 10) / 4.5;
      if (dx * dx + dy * dy < 1) t = 'water';
      // scattered trees (keep spawn area clear)
      if (t === 'grass' && rng() < 0.07 && cheb(x, y, SPAWN.x, SPAWN.y) > 3) t = 'tree';
      if (inDark(x, y)) t = (t === 'tree') ? 'darktree' : (t === 'grass' ? 'dark' : t);
      row.push(t);
    }
    G.map.push(row);
  }
  // keep the boss tile and spawn clear
  G.map[31][43] = 'dark';
  G.map[SPAWN.y][SPAWN.x] = 'grass';

  // mineral nodes by zone
  G.nodes = [];
  const placeNodes = (count, zone, pick) => {
    let placed = 0, guard = 0;
    while (placed < count && guard++ < 4000) {
      const x = 2 + Math.floor(rng() * (MAP_W - 4));
      const y = 2 + Math.floor(rng() * (MAP_H - 4));
      if (!zone(x, y)) continue;
      if (G.map[y][x] !== 'grass' && G.map[y][x] !== 'dark') continue;
      if (cheb(x, y, SPAWN.x, SPAWN.y) < 2) continue;
      if (G.nodes.some(n => cheb(n.x, n.y, x, y) < 2)) continue;
      G.nodes.push({ x, y, mineral: pick(rng()), respawnAt: 0 });
      placed++;
    }
  };
  placeNodes(10, (x, y) => x < 20 && y < 18 && !inDark(x, y),
    r => (r < 0.7 ? 'quartz' : 'amethyst'));
  placeNodes(14, (x, y) => (x >= 20 || y >= 18) && !(x >= 28 && y >= 20) && !inDark(x, y),
    r => (r < 0.34 ? 'sunstone' : r < 0.67 ? 'aquamarine' : 'emerald'));
  placeNodes(6, (x, y) => x >= 28 && y >= 20 && !inDark(x, y),
    r => (r < 0.6 ? 'roseopal' : 'emerald'));
  placeNodes(4, (x, y) => inDark(x, y),
    () => 'prismatite');

  // monsters by zone
  G.monsters = [];
  const placeMonsters = (count, type, zone) => {
    let placed = 0, guard = 0;
    while (placed < count && guard++ < 4000) {
      const x = 2 + Math.floor(rng() * (MAP_W - 4));
      const y = 2 + Math.floor(rng() * (MAP_H - 4));
      if (!zone(x, y) || !walkable(x, y)) continue;
      if (cheb(x, y, SPAWN.x, SPAWN.y) < 5) continue;
      if (G.monsters.some(m => cheb(m.x, m.y, x, y) < 3)) continue;
      if (G.nodes.some(n => n.x === x && n.y === y)) continue;
      G.monsters.push({ x, y, type, alive: true, respawnAt: 0, home: { x, y }, moveAt: 1 + rng() * 2 });
      placed++;
    }
  };
  placeMonsters(6, 'slime', (x, y) => x < 22 && y < 20 && !inDark(x, y));
  placeMonsters(4, 'bat',   (x, y) => x < 26 && y < 24 && !inDark(x, y));
  placeMonsters(4, 'shroom',(x, y) => (x >= 16 || y >= 14) && !inDark(x, y));
  placeMonsters(4, 'fox',   (x, y) => (x >= 24 || y >= 20) && !inDark(x, y));
  placeMonsters(3, 'golem', (x, y) => x >= 28 && y >= 16 && !inDark(x, y));
  // the boss, stationary in the dark corner
  G.monsters.push({ x: 43, y: 31, type: 'dragon', alive: true, respawnAt: 0, home: { x: 43, y: 31 }, moveAt: Infinity });
}

function walkable(x, y) {
  if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return false;
  const t = G.map[y][x];
  return t === 'grass' || t === 'dark';
}

// ---------- save / load ----------

function save() {
  if (!G.state) return;
  const s = G.state;
  localStorage.setItem(SAVE_KEY, JSON.stringify({
    classId: s.classId, level: s.level, xp: s.xp, skillPoints: s.skillPoints,
    hp: s.hp, x: Math.round(G.px / TILE - 0.5), y: Math.round(G.py / TILE - 0.5),
    raw: s.raw, polished: s.polished, spells: s.spells, skills: s.skills,
    kills: s.kills, bossDefeated: s.bossDefeated,
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

// ---------- game start ----------

function newGameWithClass(classId) {
  const cls = CLASSES[classId];
  G.state = {
    classId, level: 1, xp: 0, skillPoints: 1,
    hp: cls.hp, hpMax: cls.hp,
    raw: {},                 // {mineralId: count}
    polished: {},            // {mineralId: {rough,fine,brilliant}}
    spells: Object.assign({ glitterbomb: 4 }, cls.perkSpells || {}), // {spellId: charges}
    skills: {},              // {nodeId: true}
    kills: 0, bossDefeated: false,
    x: SPAWN.x, y: SPAWN.y,
  };
  calcStats();
  startGame();
  toast(`Welcome, ${cls.name}! Tap the ground to walk. Tap a gem node to mine it.`);
}

function startGame() {
  buildWorld();
  const s = G.state;
  if (!walkable(s.x, s.y)) { s.x = SPAWN.x; s.y = SPAWN.y; }
  G.px = (s.x + 0.5) * TILE;
  G.py = (s.y + 0.5) * TILE;
  G.path = [];
  G.pendingMine = null;
  closeAllScreens();
  document.getElementById('hud').style.display = 'flex';
  renderHUD();
  save();
}

function boot() {
  G.canvas = document.getElementById('game');
  G.ctx = G.canvas.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  G.canvas.addEventListener('pointerdown', onTap);
  window.addEventListener('keydown', onKey);
  bindUI();

  const saved = loadSave();
  if (saved && CLASSES[saved.classId]) {
    G.state = Object.assign({
      raw: {}, polished: {}, spells: {}, skills: {}, kills: 0, bossDefeated: false,
    }, saved);
    calcStats();
    if (G.state.hp <= 0) G.state.hp = G.state.hpMax;
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
  if (G.lock || !G.state) return;
  const cam = camera();
  const tx = Math.floor((e.clientX + cam.x) / TILE);
  const ty = Math.floor((e.clientY + cam.y) / TILE);
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return;

  const p = playerTile();
  const node = G.nodes.find(n => n.x === tx && n.y === ty && n.respawnAt <= G.time);
  if (node) {
    if (cheb(p.x, p.y, tx, ty) <= 1) { mineNode(node); G.path = []; G.pendingMine = null; return; }
    const path = findPath(p, (x, y) => cheb(x, y, tx, ty) <= 1);
    if (path) { G.path = path; G.pendingMine = node; }
    else toast("Can't reach that node from here.");
    return;
  }
  G.pendingMine = null;
  const goal = walkable(tx, ty)
    ? (x, y) => x === tx && y === ty
    : (x, y) => cheb(x, y, tx, ty) <= 1;
  const path = findPath(p, goal);
  if (path) G.path = path;
  else toast("Can't walk there.");
}

function onKey(e) {
  if (G.lock || !G.state) return;
  const dirs = {
    ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
    w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
  };
  const d = dirs[e.key];
  if (!d) return;
  const p = playerTile();
  const nx = p.x + d[0], ny = p.y + d[1];
  const node = G.nodes.find(n => n.x === nx && n.y === ny && n.respawnAt <= G.time);
  if (node) { mineNode(node); return; }
  if (walkable(nx, ny)) { G.path = [{ x: nx, y: ny }]; G.pendingMine = null; }
}

// BFS from start tile to any tile matching goalPred. Returns list of steps (excluding start).
function findPath(start, goalPred) {
  if (goalPred(start.x, start.y)) return [];
  const prev = new Map();
  const key = (x, y) => y * MAP_W + x;
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

// ---------- update ----------

const WALK_SPEED = 5.2; // tiles per second

function update(dt) {
  G.time += dt;
  if (!G.state || G.lock) return;

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
      // stepping onto a monster starts a battle
      const mon = G.monsters.find(m => m.alive && m.x === target.x && m.y === target.y);
      if (mon) { G.path = []; G.pendingMine = null; startBattle(mon, false); return; }
      if (!G.path.length && G.pendingMine) {
        const n = G.pendingMine; G.pendingMine = null;
        const p = playerTile();
        if (n.respawnAt <= G.time && cheb(p.x, p.y, n.x, n.y) <= 1) mineNode(n);
      }
      if (!G.path.length && inDark(target.x, target.y) && !G.state.bossDefeated && G.state.level < 5) {
        toast('🌑 The air crackles here… something big lives in this dark corner.');
      }
    } else {
      G.px += (dx / dist) * step;
      G.py += (dy / dist) * step;
    }
  }

  // monsters wander / chase / respawn
  const p = playerTile();
  for (const m of G.monsters) {
    if (!m.alive) {
      if (m.respawnAt && G.time >= m.respawnAt && cheb(m.home.x, m.home.y, p.x, p.y) > 4) {
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
    if (dist <= 5) { // chase
      dx = Math.sign(p.x - m.x); dy = Math.sign(p.y - m.y);
      if (dx && dy) { if (Math.random() < 0.5) dx = 0; else dy = 0; }
    } else {
      const r = Math.floor(Math.random() * 4);
      [dx, dy] = [[0, -1], [0, 1], [-1, 0], [1, 0]][r];
    }
    const nx = m.x + dx, ny = m.y + dy;
    if (nx === p.x && ny === p.y) { startBattle(m, true); return; }
    if (walkable(nx, ny)
        && !G.monsters.some(o => o !== m && o.alive && o.x === nx && o.y === ny)
        && inDark(nx, ny) === inDark(m.home.x, m.home.y)) {
      m.x = nx; m.y = ny;
    }
  }

  // floaters
  for (const f of G.floaters) f.t += dt;
  G.floaters = G.floaters.filter(f => f.t < 1.4);

  // autosave
  if (G.time - G.saveAt > 5) { G.saveAt = G.time; save(); }
}

// ---------- rendering ----------

function camera() {
  const w = window.innerWidth, h = window.innerHeight;
  return {
    x: clamp(G.px - w / 2, 0, Math.max(0, MAP_W * TILE - w)),
    y: clamp(G.py - h / 2, 0, Math.max(0, MAP_H * TILE - h)),
  };
}

const TILE_COLORS = {
  grass: ['#79c14e', '#83c957'], dark: ['#3d3352', '#463a5e'],
  tree: ['#5aa23c', '#5aa23c'], darktree: ['#2e2742', '#2e2742'],
  water: ['#4aa3df', '#4aa3df'],
};

function draw() {
  const ctx = G.ctx;
  const w = window.innerWidth, h = window.innerHeight;
  ctx.fillStyle = '#25203a';
  ctx.fillRect(0, 0, w, h);
  if (!G.state || !G.map) return;

  const cam = camera();
  const x0 = Math.floor(cam.x / TILE), y0 = Math.floor(cam.y / TILE);
  const x1 = Math.min(MAP_W - 1, x0 + Math.ceil(w / TILE) + 1);
  const y1 = Math.min(MAP_H - 1, y0 + Math.ceil(h / TILE) + 1);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let y = Math.max(0, y0); y <= y1; y++) {
    for (let x = Math.max(0, x0); x <= x1; x++) {
      const t = G.map[y][x];
      const sx = x * TILE - cam.x, sy = y * TILE - cam.y;
      const colors = TILE_COLORS[t];
      ctx.fillStyle = colors[(x + y) % 2];
      ctx.fillRect(sx, sy, TILE, TILE);
      if (t === 'tree' || t === 'darktree') {
        ctx.font = `${TILE * 0.75}px "Segoe UI Emoji", serif`;
        ctx.fillText(t === 'tree' ? '🌲' : '🌲', sx + TILE / 2, sy + TILE / 2 + 2);
        if (t === 'darktree') {
          ctx.fillStyle = 'rgba(30,20,60,0.55)';
          ctx.fillRect(sx, sy, TILE, TILE);
        }
      } else if (t === 'water') {
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        const wob = Math.sin(G.time * 2 + x * 1.7 + y * 2.3) * 3;
        ctx.fillRect(sx + 6 + wob, sy + TILE / 2, TILE - 16, 3);
      }
    }
  }

  // mineral nodes
  for (const n of G.nodes) {
    const sx = n.x * TILE - cam.x + TILE / 2, sy = n.y * TILE - cam.y + TILE / 2;
    if (sx < -TILE || sy < -TILE || sx > w + TILE || sy > h + TILE) continue;
    const min = MINERALS[n.mineral];
    const alive = n.respawnAt <= G.time;
    const r = alive ? TILE * 0.32 : TILE * 0.16;
    const pulse = alive ? 1 + Math.sin(G.time * 3 + n.x) * 0.08 : 1;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(pulse, pulse);
    if (alive && min.rainbow) {
      const grad = ctx.createLinearGradient(-r, -r, r, r);
      ['#ff5c8a', '#ffb84a', '#ffe94a', '#5cff8a', '#5cc9ff', '#b45cff'].forEach((c, i, arr) =>
        grad.addColorStop(i / (arr.length - 1), c));
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = alive ? min.color : '#6b6b78';
    }
    ctx.beginPath();
    ctx.moveTo(0, -r); ctx.lineTo(r * 0.8, 0); ctx.lineTo(0, r); ctx.lineTo(-r * 0.8, 0);
    ctx.closePath();
    ctx.fill();
    if (alive) {
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(-r * 0.25, -r * 0.35, r * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // monsters
  ctx.font = `${TILE * 0.72}px "Segoe UI Emoji", serif`;
  for (const m of G.monsters) {
    if (!m.alive) continue;
    const sx = m.x * TILE - cam.x + TILE / 2, sy = m.y * TILE - cam.y + TILE / 2;
    if (sx < -TILE || sy < -TILE || sx > w + TILE || sy > h + TILE) continue;
    const bob = Math.sin(G.time * 4 + m.home.x) * 2;
    const def = MONSTERS[m.type];
    if (def.boss) {
      ctx.font = `${TILE * 1.15}px "Segoe UI Emoji", serif`;
      ctx.fillText(def.emoji, sx, sy + bob);
      ctx.font = `${TILE * 0.72}px "Segoe UI Emoji", serif`;
    } else {
      ctx.fillText(def.emoji, sx, sy + bob);
    }
  }

  // player
  const cls = classDef();
  ctx.font = `${TILE * 0.8}px "Segoe UI Emoji", serif`;
  ctx.fillText(cls.emoji, G.px - cam.x, G.py - cam.y - 2);

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

let lastFrame = 0;
function frame(ts) {
  const dt = Math.min(0.05, (ts - lastFrame) / 1000 || 0.016);
  lastFrame = ts;
  // some embedded browsers don't fire resize events reliably
  const dpr = window.devicePixelRatio || 1;
  if (G.canvas.width !== Math.round(window.innerWidth * dpr)
      || G.canvas.height !== Math.round(window.innerHeight * dpr)) resizeCanvas();
  update(dt);
  draw();
  requestAnimationFrame(frame);
}
