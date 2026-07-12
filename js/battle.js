// Prism Quest — turn-based battles

let B = null; // active battle state

// screen-center of a battle element, for aiming particle effects
function bPos(id) {
  const r = document.getElementById(id).getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function shakeEl(id) {
  const el = document.getElementById(id);
  el.classList.remove('hit');
  void el.offsetWidth; // restart the animation
  el.classList.add('hit');
}

function startBattle(monster, ambush) {
  const def = MONSTERS[monster.type];
  // difficulty scaling: tougher in higher-tier zones and the finale maps
  const tier = combatTier();
  const em = monster.elite ? ELITE_MODS[monster.elite] : null;
  const warden = !!monster.warden;
  const hpMult = (1 + (tier - 1) * 0.4) * (em ? em.hpMul : 1) * (warden ? 1.6 : 1);
  const atkScale = (1 + (tier - 1) * 0.22) * (em ? (em.atkMul || 1) : 1) * (warden ? 1.15 : 1);
  const hp = Math.round(def.hp * hpMult);
  B = {
    monster, def, tier, atkScale, elite: em, warden,
    mdef: def.def + (em ? (em.defBonus || 0) : 0),
    mhp: hp, mhpMax: hp,
    mStatus: {},          // burn:{turns,dmg}, poison:{turns,dmg}, weaken:{turns,mult}
    pStatus: {},          // shield:{turns,reduce}, poison:{turns,dmg}
    unicorn: null,        // {turns, power}
    lastStandUsed: false,
    over: false,
    log: [],
  };
  openScreen('battleScreen');
  document.getElementById('bMonEmoji').classList.remove('dying', 'hit');
  document.getElementById('bPlayerEmoji').classList.remove('hit');
  blog(def.boss ? `${def.emoji} ${def.name} bars your way!` : `${def.emoji} A wild ${def.name} appears!`);
  if (def.finalBoss) blog('🌑 SOG\'NAROTH RISES. The rain bends toward it. The gloom has a heartbeat.');
  else if (monster.type === 'dragon') blog('🌧️ The storm-fattened serpent coils around its cloud throne!');
  else if (def.dungeonBoss) blog('💀 The keeper of this place stirs — deadly, but its hoard is legendary!');
  else if (monster.warden) blog('🗝️ The Warden bars the stair. Slay it to claim the key below!');
  else if (def.miniboss !== undefined) blog('⚡ A champion of the gloom! Defeat it and the light returns to this land!');
  if (ambush && !eff('fleeSure')) {
    blog('😱 Ambush! It strikes first!');
    monsterHit();
  }
  renderBattle();
  const mp = bPos('bMonEmoji');
  fxBurst(mp.x, mp.y, { count: 16, colors: ['#b45cff', '#ffffff'], star: true, speed: 200, life: 0.7 });
}

function blog(msg) {
  B.log.push(msg);
  if (B.log.length > 6) B.log.shift();
}

function variance() { return 0.9 + Math.random() * 0.2; }
function isCrit() { return Math.random() < 0.05 + eff('crit'); }

// eldritch whispers sap your strength
function dreadMult() {
  return (B && B.pStatus.dread && B.pStatus.dread.turns > 0) ? 0.75 : 1;
}

function spellDamage(power) {
  const s = G.state;
  let dmg = power * (1 + s.mag * 0.05) * (1 + eff('spellDmg')) * variance() * dreadMult();
  const crit = isCrit();
  if (crit) dmg *= 1.7;
  dmg = Math.max(1, Math.round(dmg - B.mdef * 0.3));
  return { dmg, crit };
}

function hitMonster(dmg, label) {
  B.mhp -= dmg;
  blog(`${label} ${dmg} damage!`);
  if (B.mhp <= 0) { victory(); return true; }
  return false;
}

function playerAction(action, spellId) {
  if (!B || B.over) return;
  const s = G.state;
  const fxFrom = bPos('bPlayerEmoji'), fxTo = bPos('bMonEmoji');

  if (action === 'bonk') {
    fxBurst(fxTo.x, fxTo.y, { count: 10, colors: ['#ffffff', '#ffd24a'], star: true, speed: 220, life: 0.5 });
    shakeEl('bMonEmoji');
    const crit = isCrit();
    crit ? sndCrit() : sndBonk();
    let dmg = s.atk * 2 * (1 + eff('basicDmg')) * variance() * dreadMult();
    if (crit) dmg *= 1.7;
    dmg = Math.max(1, Math.round(dmg - B.mdef * 0.5));
    if (hitMonster(dmg, crit ? '💥 CRITICAL BONK!' : '🪄 Bonk!')) return;

  } else if (action === 'flee') {
    if (eff('fleeSure') || Math.random() < 0.6) {
      fxBurst(fxFrom.x, fxFrom.y, { count: 18, colors: ['#ffffff', '#c9b8ff'], star: true, speed: 200, life: 0.6 });
      blog('💨 You slip away in a puff of glitter!');
      endBattle('flee');
      return;
    }
    blog('❌ Couldn\'t escape!');

  } else if (action === 'spell') {
    if (!s.spells[spellId] || s.spells[spellId] <= 0) return;
    const sp = SPELLS[spellId];
    const free = Math.random() < eff('chargeSave');
    if (!free) s.spells[spellId]--;
    else blog('⛓️ Chain Light — the charge is refunded!');
    spellFX(spellId, fxFrom, fxTo);
    sndSpell(spellId);
    if (sp.power > 0 && spellId !== 'unicorn') shakeEl('bMonEmoji');

    if (spellId === 'prismshield') {
      const reduce = Math.min(0.9, 0.6 * (1 + eff('shieldPower')));
      B.pStatus.shield = { turns: 2, reduce };
      blog(`🛡️ Prism Shield! Blocking ${Math.round(reduce * 100)}% damage for 2 turns.`);
    } else if (spellId === 'bloomheal') {
      const heal = Math.round(s.hpMax * 0.4 * (1 + eff('healPower')));
      s.hp = Math.min(s.hpMax, s.hp + heal);
      blog(`🌸 Healing Bloom restores ${heal} HP!`);
    } else if (spellId === 'unicorn') {
      const turns = 4 + eff('summonTurns');
      B.unicorn = { turns, power: 1 + eff('unicornPower') };
      blog(`🦄 A radiant unicorn gallops to your side! (${turns} turns)`);
    } else {
      const sunSpell = B.def.finalBoss && ['sunflare', 'rainbowbeam', 'stardust'].includes(spellId);
      const { dmg, crit } = spellDamage(sp.power * (sunSpell ? 1.5 : 1));
      if (sunSpell) blog('☀️ Sunlight! The horror sizzles where the light lands!');
      const label = `${sp.emoji} ${sp.name}${crit ? ' CRIT!' : '!'}`;
      if (hitMonster(dmg, label)) return;
      if (spellId === 'sunflare') { B.mStatus.burn = { turns: 3, dmg: 4 }; blog('🔥 It\'s burning!'); }
      if (spellId === 'butterflyswarm') { B.mStatus.poison = { turns: 4, dmg: 3 }; blog('💜 It\'s poisoned!'); }
      if (spellId === 'tidepop') { B.mStatus.weaken = { turns: 3, mult: 0.7 }; blog('💧 Its attacks are weakened!'); }
    }
  }

  // status ticks on the monster
  for (const k of ['burn', 'poison']) {
    const st = B.mStatus[k];
    if (st && st.turns > 0) {
      st.turns--;
      B.mhp -= st.dmg;
      fxBurst(fxTo.x, fxTo.y, {
        count: 7, colors: k === 'burn' ? ['#ff8a5c', '#ffd24a'] : ['#b06ee8', '#d9b3ff'],
        speed: 110, g: -90, life: 0.6,
      });
      blog(`${k === 'burn' ? '🔥' : '💜'} ${B.def.name} takes ${st.dmg} ${k} damage.`);
      if (B.mhp <= 0) { victory(); return; }
    }
  }
  if (B.mStatus.weaken && B.mStatus.weaken.turns > 0) B.mStatus.weaken.turns--;
  if (B.pStatus.dread && B.pStatus.dread.turns > 0) B.pStatus.dread.turns--;

  // unicorn acts
  if (B.unicorn && B.unicorn.turns > 0) {
    B.unicorn.turns--;
    setTimeout(() => { if (B && !B.over) fxUnicornStrike(fxFrom, fxTo); }, 320);
    const udmg = Math.max(1, Math.round(8 * B.unicorn.power * (1 + s.mag * 0.04) * variance()));
    const uheal = Math.round(6 * B.unicorn.power * (1 + eff('healPower')));
    s.hp = Math.min(s.hpMax, s.hp + uheal);
    blog(`🦄 Unicorn charges for ${udmg} and heals you ${uheal}!`);
    B.mhp -= udmg;
    if (B.mhp <= 0) { victory(); return; }
    if (B.unicorn.turns <= 0) { B.unicorn = null; blog('🌈 The unicorn bows and departs.'); }
  }

  // regen
  const regen = eff('regen');
  if (regen > 0 && s.hp < s.hpMax) s.hp = Math.min(s.hpMax, s.hp + regen);

  monsterHit();
  const extraHit = (B.def.doubleHit || 0) + (B.elite ? (B.elite.extraHit || 0) : 0);
  if (!B.over && extraHit && Math.random() < extraHit) {
    blog(B.elite && B.elite.extraHit ? '💨 It blurs and strikes again!' : '🐉 It attacks again!');
    monsterHit();
  }
  if (!B.over) renderBattle();
}

function monsterHit() {
  if (!B || B.over) return;
  const s = G.state;
  const ppos = bPos('bPlayerEmoji');
  // dodge — a defensive stat from boots and affixes (capped so you can't be untouchable)
  if (Math.random() < Math.min(0.6, eff('dodge'))) {
    blog(`🌀 You dance aside — ${B.def.name}'s attack whiffs!`);
    sndDodge();
    setTimeout(() => fxBurst(ppos.x, ppos.y, { count: 8, colors: ['#b8f4f8', '#ffffff'], speed: 150, life: 0.5, star: true }), 350);
    return;
  }
  let atk = B.def.atk * (B.atkScale || 1);
  if (B.mStatus.weaken && B.mStatus.weaken.turns >= 0 && B.mStatus.weaken.mult) atk *= B.mStatus.weaken.mult;
  let dmg = Math.max(1, Math.round(atk * variance() * 1.85 - s.def * 0.5));
  if (B.pStatus.shield && B.pStatus.shield.turns > 0) {
    dmg = Math.max(1, Math.round(dmg * (1 - B.pStatus.shield.reduce)));
    B.pStatus.shield.turns--;
    blog(`🛡️ Shield absorbs the blow — only ${dmg} gets through!`);
    setTimeout(() => fxRing(ppos.x, ppos.y, '#8fb7ff', 70), 350);
  } else {
    blog(`${B.def.emoji} ${B.def.name} hits you for ${dmg}!`);
    setTimeout(() => {
      shakeEl('bPlayerEmoji');
      sndHurt();
      fxBurst(ppos.x, ppos.y, { count: 9, colors: ['#ff5c7a', '#ffffff'], speed: 190, life: 0.5, star: true });
    }, 380);
  }
  applyPlayerDamage(dmg);
  if (B.over) return;

  const venom = B.def.poison || (B.elite && B.elite.venom);
  if (venom && Math.random() < 0.4) {
    B.pStatus.poison = { turns: 3, dmg: B.elite && B.elite.venom ? 3 : 2 };
    blog('🟣 You\'ve been poisoned!');
  }
  const pp = B.pStatus.poison;
  if (pp && pp.turns > 0) {
    pp.turns--;
    blog(`🟣 Poison stings you for ${pp.dmg}.`);
    applyPlayerDamage(pp.dmg);
  }
  const curse = B.def.dread || (B.elite && B.elite.curse);
  if (curse && !B.over && Math.random() < 0.35) {
    B.pStatus.dread = { turns: 2 };
    blog('😰 It whispers something you should not have heard… (your damage -25%)');
  }
  if (B.def.regen && !B.over && B.mhp > 0 && B.mhp < B.mhpMax) {
    B.mhp = Math.min(B.mhpMax, B.mhp + B.def.regen);
    blog(`🌧️ The rain knits its wounds closed (+${B.def.regen}).`);
  }
  renderBattle();
  renderHUD();
}

function applyPlayerDamage(dmg) {
  if (!B || B.over) return; // already resolved (e.g. died on the first hit this turn)
  const s = G.state;
  s.hp -= dmg;
  if (s.hp <= 0) {
    // 1) Last Stand — survive at 1 HP, once per battle
    if (eff('lastStand') && !B.lastStandUsed) {
      B.lastStandUsed = true;
      s.hp = 1;
      blog('🕯️ Last Stand! You refuse to fall!');
      return;
    }
    // 2) Revive capstone — cheat death once per LIFE, rebound to a fraction of HP
    if (eff('reviveFrac') > 0 && !s.reviveUsed) {
      s.reviveUsed = true;
      s.hp = Math.max(1, Math.round(s.hpMax * eff('reviveFrac')));
      blog(`💗 Death denied! You surge back to ${s.hp} HP — but only once.`);
      const pp = bPos('bPlayerEmoji');
      fxBurst(pp.x, pp.y, { count: 30, colors: ['#ff6ec7', '#ffffff', '#ffd24a'], star: true, speed: 300 });
      fxRing(pp.x, pp.y, '#ff6ec7', 90);
      save();
      return;
    }
    // 3) no safety net left — the hero falls for good (rogue-like)
    s.hp = 0;
    defeat();
  }
}

function victory() {
  B.over = true;
  const s = G.state;
  const def = B.def;
  s.kills++;
  const mpos = bPos('bMonEmoji');
  document.getElementById('bMonEmoji').classList.add('dying');
  setTimeout(() => fxBurst(mpos.x, mpos.y, { count: 26, colors: ['#cbb6ff', '#ffffff'], star: true, speed: 260 }), 200);
  setTimeout(() => fxConfetti(mpos.x, mpos.y + 60, 40), 420);
  const foeName = B.elite ? `${B.elite.name} ${def.name}` : def.name;
  blog(`🎉 ${foeName} is defeated!`);
  const gained = gainXp(Math.round(def.xp * (1 + ((B.tier || 1) - 1) * 0.3) * (B.elite ? B.elite.xpMul : 1)));
  blog(`⭐ +${gained} XP`);

  // drops
  if (def.boss || Math.random() < 0.6) {
    const table = def.drops;
    const total = Object.values(table).reduce((a, b) => a + b, 0);
    let roll = Math.random() * total;
    let picked = Object.keys(table)[0];
    for (const [mineral, weight] of Object.entries(table)) {
      roll -= weight;
      if (roll <= 0) { picked = mineral; break; }
    }
    const amount = def.boss ? 2 : 1;
    s.raw[picked] = (s.raw[picked] || 0) + amount;
    blog(`💎 It dropped ${amount} raw ${MINERALS[picked].name}!`);
  }

  // equipment loot — elites always drop; Radiant elites drop guaranteed rare+
  let item = rollMonsterLoot(def);
  if (B.elite && B.elite.richLoot) item = rollItem(Math.max(2, (B.tier || 1) * 2), Math.random() < 0.3 ? 'legendary' : 'rare');
  else if (!item && B.elite) item = rollItem(Math.max(1, (B.tier || 1) * 2));
  if (item) {
    if (addItemToInventory(item)) {
      blog(`${SLOTS[item.slot].emoji} <b style="color:${RARITIES[item.rarity].color}">${item.name}</b> dropped! (${RARITIES[item.rarity].name})`);
      if (item.rarity === 'legendary' || item.rarity === 'set') {
        setTimeout(() => fxConfetti(mpos.x, mpos.y, 30), 300);
      }
    }
  }

  const heal = eff('healOnWin');
  if (heal > 0) {
    const amt = Math.round(s.hpMax * heal);
    s.hp = Math.min(s.hpMax, s.hp + amt);
    blog(`🌬️ Second Wind restores ${amt} HP.`);
  }

  B.monster.alive = false;
  B.monster.respawnAt = def.boss ? Infinity : G.time + 45;

  sndVictory();

  if (B.warden && s.dungeon) {
    // the Warden falls — the way down is unlocked
    s.dungeon.hasKey = true;
    setTimeout(() => { toast('🗝️ The Warden drops a heavy key — the stair is open!'); fxConfetti(mpos.x, mpos.y, 24); sndKey(); }, 600);
  }

  if (def.finalBoss && !s.sunRestored) {
    // the sun returns to Rainyday — gloom-things cannot exist beneath it
    s.sunRestored = true;
    s.mainQuest = 7;
    for (const m of G.monsters) { m.alive = false; m.respawnAt = Infinity; }
    setTimeout(() => {
      closeScreen('battleScreen');
      openScreen('winBanner');
      sndWin();
      fxConfetti(window.innerWidth / 2, 160, 80);
      setTimeout(() => fxConfetti(window.innerWidth / 2, window.innerHeight / 2, 60), 500);
    }, 900);
  } else if (def.miniboss !== undefined && ZONE_IDS.includes(G.mapId) && !s.zonesCleared[G.mapId]) {
    // a champion falls — its whole zone floods with light
    const zid = G.mapId;
    s.zonesCleared[zid] = true;
    for (const m of G.monsters) { if (m.alive) { m.alive = false; m.respawnAt = Infinity; } }
    setTimeout(() => {
      toast(`🌞 Sunlight floods ${ZONES[zid].name}! The gloom-things melt into dew.`);
      fxConfetti(window.innerWidth / 2, 200, 50);
    }, 800);
    if (ZONE_IDS.every(z => s.zonesCleared[z])) {
      setTimeout(() => {
        setQuest(2);
        toast('🏰 Far above, thunder rolls… the RAINYCASTLE has risen in the rainclouds!');
      }, 3000);
    } else {
      renderHUD();
    }
  } else if (B.monster.type === 'dragon' && !s.bossDefeated) {
    s.bossDefeated = true;
    G.gates.push({ x: 16, y: 9, kind: 'portal' });
    setTimeout(() => toast('🌊 The Rainwyrm bursts into mist — and the sky itself tears open…'), 900);
    setTimeout(() => {
      setQuest(5);
      toast("🐙 Beyond the tear: SOG'NAROTH, the Endless Drizzle. A portal swirls beside the castle.");
    }, 3600);
  }
  renderBattle(true);
  renderHUD();
  save();
}

// rogue-like death: the hero is lost for good
function defeat() {
  B.over = true;
  const pp = bPos('bPlayerEmoji');
  fxBurst(pp.x, pp.y, { count: 22, colors: ['#9a93b5', '#d8d3ea', '#3a3450'], speed: 170, life: 1.1 });
  fxBurst(pp.x, pp.y, { count: 3, emoji: ['💀'], speed: 90, size: 24, life: 1.4, g: -30 });
  blog(`💀 ${classDef().name} has fallen. The gloom claims another hero…`);
  sndDeath();
  const summary = recordDeath();
  renderBattle(false, true);
  setTimeout(() => { closeScreen('battleScreen'); B = null; showGameOver(summary); }, 1400);
}

function endBattle(how) {
  B.over = true;
  closeScreen('battleScreen');
  const s = G.state;
  if (how === 'flee') {
    // hop one tile away from the monster if possible
    const p = playerTile();
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nx = p.x + dx, ny = p.y + dy;
      if (walkable(nx, ny) && !G.monsters.some(m => m.alive && m.x === nx && m.y === ny)) {
        G.px = (nx + 0.5) * TILE; G.py = (ny + 0.5) * TILE;
        G.state.x = nx; G.state.y = ny;
        break;
      }
    }
  }
  B = null;
  renderHUD();
  save();
}

// ---------- battle UI ----------

function renderBattle(won, lost) {
  if (!B) return;
  const s = G.state;
  const cls = classDef();

  document.getElementById('bMonEmoji').innerHTML = actorHTML(MONSTER_SPRITE[B.monster.type], B.def.emoji, 76);
  const nameEl = document.getElementById('bMonName');
  if (B.elite) {
    nameEl.innerHTML = `<span style="color:${B.elite.color}">✦ ${B.elite.name}</span> ${B.def.name}`;
  } else {
    nameEl.textContent = B.def.name;
  }
  const mpct = Math.max(0, B.mhp / B.mhpMax * 100);
  document.getElementById('bMonHpFill').style.width = mpct + '%';
  document.getElementById('bMonHpText').textContent = `${Math.max(0, B.mhp)} / ${B.mhpMax}`;

  const chips = [];
  if (B.mStatus.burn && B.mStatus.burn.turns > 0) chips.push('🔥 burn');
  if (B.mStatus.poison && B.mStatus.poison.turns > 0) chips.push('💜 poison');
  if (B.mStatus.weaken && B.mStatus.weaken.turns > 0) chips.push('💧 weakened');
  document.getElementById('bMonChips').textContent = chips.join('  ');

  document.getElementById('bPlayerEmoji').innerHTML = actorHTML(playerSpriteKey(), cls.emoji, 68);
  const ppct = Math.max(0, s.hp / s.hpMax * 100);
  document.getElementById('bPlayerHpFill').style.width = ppct + '%';
  document.getElementById('bPlayerHpText').textContent = `${s.hp} / ${s.hpMax}`;
  const pchips = [];
  if (B.pStatus.shield && B.pStatus.shield.turns > 0) pchips.push(`🛡️ shield ×${B.pStatus.shield.turns}`);
  if (B.pStatus.poison && B.pStatus.poison.turns > 0) pchips.push('🟣 poisoned');
  if (B.pStatus.dread && B.pStatus.dread.turns > 0) pchips.push(`😰 dread ×${B.pStatus.dread.turns}`);
  if (B.unicorn) pchips.push(`🦄 ×${B.unicorn.turns}`);
  document.getElementById('bPlayerChips').textContent = pchips.join('  ');

  document.getElementById('bLog').innerHTML = B.log.map(l => `<div>${l}</div>`).join('');

  const acts = document.getElementById('bActs');
  acts.innerHTML = '';
  if (B.over) {
    if (lost) {
      const dead = document.createElement('div');
      dead.className = 'deathNote';
      dead.textContent = '💀 You have fallen…';
      acts.appendChild(dead);
      return;
    }
    const btn = document.createElement('button');
    btn.className = 'act big';
    btn.textContent = '✨ Continue';
    btn.onclick = () => endBattle('win');
    acts.appendChild(btn);
    return;
  }
  const bonk = document.createElement('button');
  bonk.className = 'act';
  bonk.innerHTML = `🪄 Bonk<small>free</small>`;
  bonk.onclick = () => playerAction('bonk');
  acts.appendChild(bonk);

  for (const [id, charges] of Object.entries(s.spells)) {
    if (charges <= 0) continue;
    const sp = SPELLS[id];
    if (sp.utility) continue; // dwarves polish, they don't fight
    const btn = document.createElement('button');
    btn.className = 'act spell';
    btn.innerHTML = `${sp.emoji} ${sp.name}<small>×${charges}</small>`;
    btn.onclick = () => playerAction('spell', id);
    acts.appendChild(btn);
  }

  const flee = document.createElement('button');
  flee.className = 'act flee';
  flee.innerHTML = `💨 Flee<small>${eff('fleeSure') ? 'sure' : '60%'}</small>`;
  flee.onclick = () => playerAction('flee');
  acts.appendChild(flee);
}
