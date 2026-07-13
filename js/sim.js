// Prism Quest — repeatable end-to-end balance simulator.
//
// Usage (from the browser console):
//   runSim(50, 1000)   -> plays 50 full games with seeds 1001..1050, returns the mix
//   window.SIM_LAST    -> per-run details of the last batch
//
// The sim drives the REAL game systems — combat, loot, XP/level cap, pacts,
// elites, dungeons, skill trees, buildings — through a scripted player policy.
// Movement is abstracted to encounters. Each run seeds Math.random, so results
// are deterministic per seed: tweak a balance number, re-run the same seeds,
// and compare. Saving/meta/death-recording are stubbed during the sim and your
// real game state is restored afterwards.

const SIM_SPELL_PRIORITY = ['stardust', 'rainbowbeam', 'sunflare', 'tidepop', 'butterflyswarm', 'glitterbomb'];
const SIM_CRAFT_ORDER = ['bloomheal', 'unicorn', 'rainbowbeam', 'stardust', 'sunflare', 'tidepop', 'prismshield', 'butterflyswarm', 'glitterbomb'];
const SIM_PATCH = ['toast', 'renderBattle', 'renderHUD', 'renderBag', 'renderSpells', 'renderSkills',
  'renderBase', 'renderChar', 'renderForge', 'openItemCard', 'fxBurst', 'fxConfetti', 'fxRing', 'fxRise',
  'fxFlutter', 'fxBeam', 'fxUnicornSummon', 'fxUnicornStrike', 'fxStardust', 'spellFX', 'shakeEl',
  'showGameOver', 'setMusic', 'addFloater', 'offerPact', 'save', 'achEvent', 'showBossIntro'];

function simShuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = (rng() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function simItemScore(it) {
  const st = itemStats(it);
  return (st.atkFlat || 0) * 3 + (st.magFlat || 0) * 3 + (st.defFlat || 0) * 3 + (st.hpMax || 0) * 0.5
    + ((st.spellDmg || 0) + (st.basicDmg || 0)) * 40 + (st.crit || 0) * 30 + (st.dodge || 0) * 30
    + ((st.unicornPower || 0) + (st.healPower || 0)) * 15 + (st.regen || 0) * 4 + (it.setId ? 12 : 0);
}

// ---------- the scripted player ----------

function simBattle(mon, ctx, rng) {
  const s = G.state;
  startBattle(mon, rng() < 0.1); // occasional ambush
  let turns = 0;
  while (B && !B.over && turns++ < 60) {
    const hpFrac = s.hp / s.hpMax;
    ctx.minHp = Math.min(ctx.minHp, hpFrac);
    const big = !!(B.def.boss || B.warden || B.elite);
    if (hpFrac < 0.32 && (s.spells.bloomheal | 0) > 0) { playerAction('spell', 'bloomheal'); continue; }
    if (big && (s.spells.prismshield | 0) > 0 && !(B.pStatus.shield && B.pStatus.shield.turns > 0) && hpFrac < 0.6) { playerAction('spell', 'prismshield'); continue; }
    if (big && (s.spells.unicorn | 0) > 0 && !B.unicorn) { playerAction('spell', 'unicorn'); continue; }
    if (hpFrac < 0.18 && !B.def.boss) { playerAction('flee'); if (!B || B.over) { ctx.fled++; break; } continue; }
    let cast = null;
    if (big || B.mhp > 25 || hpFrac < 0.5) {
      for (const sp of SIM_SPELL_PRIORITY) if ((s.spells[sp] | 0) > 0) { cast = sp; break; }
    }
    if (cast) playerAction('spell', cast); else playerAction('bonk');
  }
  ctx.battles++;
  if (s.hp <= 0) {
    ctx.dead = true;
    const where = G.state.dungeon ? `${G.state.dungeon.type} f${G.state.dungeon.floor}` : G.mapId;
    ctx.deathAt = `${where} vs ${(mon.elite ? ELITE_MODS[mon.elite].name + ' ' : '')}${MONSTERS[mon.type].name}`;
    return false;
  }
  ctx.minHp = Math.min(ctx.minHp, Math.max(0, s.hp / s.hpMax));
  if (B && B.over) endBattle('win');       // victory: dismiss the battle screen
  else if (B && !B.over) endBattle('flee'); // turn-limit safety: disengage
  return !mon.alive;
}

function simBuySkills(build) {
  const s = G.state, cls = classDef();
  let bought = true, guard = 0;
  while (s.skillPoints > 0 && bought && guard++ < 40) {
    bought = false;
    for (const bi of build) {
      const br = cls.tree[bi];
      for (let t = 0; t < br.nodes.length; t++) {
        const n = br.nodes[t];
        if (s.skills[n.id]) continue;
        if (t > 0 && !s.skills[br.nodes[t - 1].id]) break;
        buySkill(n.id, br, t);
        if (s.skills[n.id]) bought = true;
        break;
      }
      if (bought) break;
    }
  }
}

function simEquipAll() {
  const s = G.state;
  for (const it of [...s.inventory]) {
    const cur = s.equip[it.slot];
    if (!cur || simItemScore(it) > simItemScore(cur)) equipItem(it);
  }
  let guard = 0;
  while (s.inventory.length > 16 && guard++ < 20) {
    const cands = s.inventory.filter(it => !it.facet && !it.facets); // relics can't be salvaged
    if (!cands.length) break;
    let worst = cands[0];
    for (const it of cands) if (simItemScore(it) < simItemScore(worst)) worst = it;
    salvageItem(worst);
  }
}

function simSocketGems() {
  const s = G.state;
  const tiers = ['prismatite', 'roseopal', 'emerald', 'aquamarine', 'sunstone', 'amethyst', 'quartz'];
  for (const it of Object.values(s.equip)) {
    if (!it) continue;
    let guard = 0;
    while (it.gems.length < (it.sockets || 0) && guard++ < 6) {
      let done = false;
      for (const m of tiers) {
        const p = s.polished[m];
        if (!p) continue;
        for (const q of ['brilliant', 'fine', 'rough']) {
          if (p[q] > 2) { facetGem(it, m, q); done = true; break; } // keep 2 for crafting
        }
        if (done) break;
      }
      if (!done) break;
    }
  }
}

function simRestock(rng, build) {
  const s = G.state;
  const totalRaw = Object.values(s.raw).reduce((a, b) => a + b, 0);
  if ((s.spells.dwarves | 0) > 0 && totalRaw >= 8) summonDwarves(); else if (totalRaw > 0) polishAll();
  let crafted = true, guard = 0;
  while (crafted && guard++ < 30) {
    crafted = false;
    for (const id of SIM_CRAFT_ORDER) {
      const sp = SPELLS[id];
      if ((s.spells[id] | 0) >= (id === 'bloomheal' ? 6 : 4)) continue;
      if (Object.entries(sp.recipe).every(([m, n]) => countPolished(m) >= n)) { craftSpell(id); crafted = true; break; }
    }
  }
  simBuySkills(build);
  simEquipAll();
  simSocketGems();
}

function simFieldRest(rng, ctx, build, force) {
  const s = G.state;
  if (s.hp < s.hpMax * (force ? 0.75 : 0.4)) {
    ctx.campTrips++;
    s.hp = s.hpMax;
    simRestock(rng, build);
  }
}

function simCampVisit(rng, build) {
  const s = G.state;
  buildMap('village'); s.mapId = 'village';
  s.activePact = null;
  calcStats();
  s.hp = s.hpMax;
  simRestock(rng, build);
  if (countFacetPower() >= 2 && looseFacetCount() >= 1) forgePrism(); // fuse at the Glassworks
  // buildings: spend surplus raw, keeping a crafting buffer
  let bought = true, guard = 0;
  while (bought && guard++ < 20) {
    bought = false;
    for (const bid of ['kitchen', 'factory', 'training', 'stalls', 'house', 'walls']) {
      const b = BUILDINGS[bid], lvl = s.base[bid] || 0;
      if (lvl >= b.max) continue;
      if (b.requires && (s.base[b.requires[0]] || 0) < b.requires[1]) continue;
      const cost = b.costs[lvl];
      if (cost && Object.entries(cost).every(([m, n]) => gemStock(m) >= n + 4)) {
        upgradeBuilding(bid);
        bought = true;
      }
    }
  }
}

function simZone(zid, rng, ctx, build) {
  const s = G.state;
  buildMap(zid); s.mapId = zid;
  s.activePact = null;
  if (rng() < 0.75) {
    const p = PACTS[(rng() * PACTS.length) | 0];
    s.activePact = { name: p.name, icon: p.icon, bless: p.bless, curse: p.curse };
    ctx.pacts.push(p.name);
  }
  calcStats(); s.hp = Math.min(s.hp, s.hpMax);
  for (const n of G.nodes) if (rng() < 0.7) mineNode(n);
  // a wandering hero spots the buried facet's shy glint only sometimes
  if (G.treasure && rng() < 0.35) { digTreasure(); ctx.facetsDug++; }
  const share = 0.45 + rng() * 0.3;
  const mobs = G.monsters.filter(m => m.alive && MONSTERS[m.type].miniboss === undefined);
  for (const m of simShuffle(mobs, rng)) {
    if (!m.alive || rng() > share) continue;
    simFieldRest(rng, ctx, build, false);
    simBattle(m, ctx, rng);
    if (ctx.dead) return;
  }
  // a sensible player only dives a dungeon when strong enough for its tier
  const dg = G.gates.find(g => g.kind === 'dungeon');
  if (dg && s.level >= 2 + 2 * ZONES[zid].tier && rng() < 0.45) {
    ctx.dungeons++;
    simDungeon(dg, rng, ctx, build, zid);
    if (ctx.dead) return;
    buildMap(zid); s.mapId = zid; // climb back out (fresh roll of the zone)
  }
  simFieldRest(rng, ctx, build, true);
  const champ = G.monsters.find(m => m.alive && MONSTERS[m.type].miniboss !== undefined);
  if (champ) { simBattle(champ, ctx, rng); if (ctx.dead) return; }
  s.activePact = null;
  calcStats(); s.hp = Math.min(s.hp, s.hpMax);
}

function simDungeon(dg, rng, ctx, build, zid) {
  const s = G.state;
  s.dungeon = { type: dg.dtype, fromZone: zid, tier: ZONES[zid].tier, floor: 1, maxFloor: 2 + (rng() < 0.5 ? 1 : 0), hasKey: false };
  let guard = 0;
  while (guard++ < 5) {
    buildMap('dungeon'); s.mapId = 'dungeon';
    for (const n of G.nodes) if (rng() < 0.8) mineNode(n);
    const mobs = G.monsters.filter(m => m.alive && !m.warden && !MONSTERS[m.type].dungeonBoss);
    for (const m of simShuffle(mobs, rng)) {
      if (!m.alive || rng() > 0.55) continue;
      simFieldRest(rng, ctx, build, false);
      simBattle(m, ctx, rng);
      if (ctx.dead) return;
    }
    const final = s.dungeon.floor >= s.dungeon.maxFloor;
    const boss = G.monsters.find(m => m.alive && (final ? MONSTERS[m.type].dungeonBoss : m.warden));
    if (boss) {
      simFieldRest(rng, ctx, build, true);
      simBattle(boss, ctx, rng);
      if (ctx.dead) return;
    }
    if (final) break;
    s.dungeon.floor++; s.dungeon.tier++;
  }
  s.dungeon = null;
}

function simRunOne(seed) {
  Math.random = mulberry32((seed >>> 0) || 1);
  const rng = mulberry32(((seed * 7919) >>> 0) || 2); // separate policy stream
  const cls = ['mage', 'knight', 'whisperer'][(rng() * 3) | 0];
  newGameWithClass(cls);
  const s = G.state;
  s.npcFlags = { grandma: true, foreman: true };      // village gifts, as a player would collect
  s.raw.quartz = (s.raw.quartz || 0) + 4;
  s.spells.dwarves = (s.spells.dwarves || 0) + 1;
  s.mainQuest = 1;
  const build = simShuffle([0, 1, 2], rng);           // seeded branch-priority build
  const ctx = { seed, cls, build: build.join(''), dead: false, deathAt: null, battles: 0, campTrips: 0,
    dungeons: 0, minHp: 1, fled: 0, pacts: [], endHp: null, facetsDug: 0 };
  try {
    for (const zid of ['south', 'east', 'west', 'north']) {
      simCampVisit(rng, build);
      simZone(zid, rng, ctx, build);
      if (ctx.dead) break;
    }
    if (!ctx.dead) { // the Rainycastle — three floors up
      for (let f = 1; f <= 3 && !ctx.dead; f++) {
        simCampVisit(rng, build); // players pop home between climbs
        G.castleFloor = f;
        buildMap('clouds'); s.mapId = 'clouds';
        const mobs = simShuffle(G.monsters.filter(m => m.alive && !m.keyGuard && m.type !== 'dragon'), rng);
        for (const m of mobs) {
          if (rng() > 0.6) continue;
          simFieldRest(rng, ctx, build, false);
          simBattle(m, ctx, rng);
          if (ctx.dead) break;
        }
        if (ctx.dead) break;
        simFieldRest(rng, ctx, build, true);
        const bossMon = G.monsters.find(m => m.alive && (m.keyGuard || m.type === 'dragon'));
        if (bossMon) simBattle(bossMon, ctx, rng);
      }
    }
    if (!ctx.dead && s.bossDefeated) { // one way: the realm, three depths down
      simCampVisit(rng, build);
      G.realmDepth = 1;
      for (let dpt = 1; dpt <= 3 && !ctx.dead; dpt++) {
        G.realmDepth = dpt;
        if (dpt > 1) s.hp = Math.min(s.hpMax, s.hp + Math.round(s.hpMax * 0.5)); // rift respite
        buildMap('realm'); s.mapId = 'realm';
        // no resting, no restocking beyond the portal
        const horrors = simShuffle(G.monsters.filter(m => m.alive && !m.keyGuard && m.type !== 'sognaroth'), rng).slice(0, 3);
        for (const m of horrors) {
          simBattle(m, ctx, rng);
          if (ctx.dead) break;
        }
        if (ctx.dead) break;
        const deep = G.monsters.find(m => m.alive && (m.keyGuard || m.type === 'sognaroth'));
        if (deep) {
          simBattle(deep, ctx, rng);
          if (!ctx.dead && s.sunRestored) ctx.endHp = s.hp / s.hpMax;
        }
      }
    }
  } catch (e) {
    ctx.error = String((e && e.message) || e);
  }
  const zones = ZONE_IDS.filter(z => s.zonesCleared[z]).length;
  let outcome;
  if (!s.sunRestored) outcome = 'loss';
  else if (ctx.endHp < 0.35 || s.reviveUsed || ctx.minHp < 0.10) outcome = 'close win';
  else if (ctx.endHp >= 0.7 && ctx.minHp >= 0.25) outcome = 'crush'; // never really threatened
  else outcome = 'win';
  const prismItem = [...s.inventory, ...Object.values(s.equip)].find(it => it && it.facets);
  return { seed, cls, build: ctx.build, outcome, level: s.level, zones, kills: s.kills,
    facets: ctx.facetsDug, prism: prismItem ? prismItem.facets : 0,
    battles: ctx.battles, dungeons: ctx.dungeons, campTrips: ctx.campTrips, fled: ctx.fled,
    minHp: +ctx.minHp.toFixed(2), endHp: ctx.endHp == null ? null : +ctx.endHp.toFixed(2),
    deathAt: ctx.deathAt, error: ctx.error || null };
}

// ---------- harness ----------

function runSim(runs = 30, baseSeed = 1000) {
  const origRandom = Math.random;
  const origTimeout = window.setTimeout;
  const origFns = {};
  const origMuted = SND.muted;
  const origLoadMeta = window.loadMeta;
  const origRecordDeath = window.recordDeath;
  const pre = G.state ? { json: JSON.stringify(G.state) } : null;
  for (const n of SIM_PATCH) { origFns[n] = window[n]; window[n] = () => {}; }
  window.loadMeta = () => ({ motes: 0, upgrades: {} }); // baseline heroes, deterministic
  window.recordDeath = () => ({ level: 0, zones: 0, kills: 0, earned: 0, best: {} });
  window.setTimeout = () => 0; // don't queue cosmetic timers (game-over screens, toasts) during sim
  SND.muted = true;
  const results = [];
  try {
    for (let i = 1; i <= runs; i++) results.push(simRunOne(baseSeed + i));
  } finally {
    Math.random = origRandom;
    window.setTimeout = origTimeout;
    for (const n of SIM_PATCH) window[n] = origFns[n];
    window.loadMeta = origLoadMeta;
    window.recordDeath = origRecordDeath;
    SND.muted = origMuted;
    closeAllScreens();
    if (pre) { G.state = JSON.parse(pre.json); startGame(); }
    else { G.state = null; showClassScreen(); }
  }
  // aggregate
  const mix = {}, deaths = {}, byClass = {};
  let lvlSum = 0, batSum = 0, zoneSum = 0;
  for (const r of results) {
    mix[r.outcome] = (mix[r.outcome] || 0) + 1;
    if (r.deathAt) deaths[r.deathAt] = (deaths[r.deathAt] || 0) + 1;
    const c = byClass[r.cls] = byClass[r.cls] || {};
    c[r.outcome] = (c[r.outcome] || 0) + 1;
    lvlSum += r.level; batSum += r.battles; zoneSum += r.zones;
  }
  const pct = {};
  for (const k of ['loss', 'close win', 'win', 'crush']) pct[k] = Math.round(100 * (mix[k] || 0) / runs) + '%';
  const topDeaths = Object.entries(deaths).sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([k, v]) => `${v}x ${k}`);
  window.SIM_LAST = results;
  return { runs, baseSeed, pct, mix, byClass, avgLevel: +(lvlSum / runs).toFixed(1),
    avgBattles: +(batSum / runs).toFixed(1), avgZones: +(zoneSum / runs).toFixed(1),
    topDeaths, errors: results.filter(r => r.error).length };
}
