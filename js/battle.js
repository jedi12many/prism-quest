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
  B = {
    monster, def,
    mhp: def.hp, mhpMax: def.hp,
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
  dmg = Math.max(1, Math.round(dmg - B.def.def * 0.3));
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
    let dmg = s.atk * 2 * (1 + eff('basicDmg')) * variance() * dreadMult();
    if (crit) dmg *= 1.7;
    dmg = Math.max(1, Math.round(dmg - B.def.def * 0.5));
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
  if (!B.over && B.def.doubleHit && Math.random() < B.def.doubleHit) {
    blog('🐉 It attacks again!');
    monsterHit();
  }
  if (!B.over) renderBattle();
}

function monsterHit() {
  if (!B || B.over) return;
  const s = G.state;
  let atk = B.def.atk;
  if (B.mStatus.weaken && B.mStatus.weaken.turns >= 0 && B.mStatus.weaken.mult) atk *= B.mStatus.weaken.mult;
  let dmg = Math.max(1, Math.round(atk * variance() * 1.6 - s.def * 0.6));
  const ppos = bPos('bPlayerEmoji');
  if (B.pStatus.shield && B.pStatus.shield.turns > 0) {
    dmg = Math.max(1, Math.round(dmg * (1 - B.pStatus.shield.reduce)));
    B.pStatus.shield.turns--;
    blog(`🛡️ Shield absorbs the blow — only ${dmg} gets through!`);
    setTimeout(() => fxRing(ppos.x, ppos.y, '#8fb7ff', 70), 350);
  } else {
    blog(`${B.def.emoji} ${B.def.name} hits you for ${dmg}!`);
    setTimeout(() => {
      shakeEl('bPlayerEmoji');
      fxBurst(ppos.x, ppos.y, { count: 9, colors: ['#ff5c7a', '#ffffff'], speed: 190, life: 0.5, star: true });
    }, 380);
  }
  applyPlayerDamage(dmg);
  if (B.over) return;

  if (B.def.poison && Math.random() < 0.4) {
    B.pStatus.poison = { turns: 3, dmg: 2 };
    blog('🟣 You\'ve been poisoned!');
  }
  const pp = B.pStatus.poison;
  if (pp && pp.turns > 0) {
    pp.turns--;
    blog(`🟣 Poison stings you for ${pp.dmg}.`);
    applyPlayerDamage(pp.dmg);
  }
  if (B.def.dread && !B.over && Math.random() < 0.35) {
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
  const s = G.state;
  s.hp -= dmg;
  if (s.hp <= 0) {
    if (eff('lastStand') && !B.lastStandUsed) {
      B.lastStandUsed = true;
      s.hp = 1;
      blog('🕯️ Last Stand! You refuse to fall!');
    } else {
      s.hp = 0;
      defeat();
    }
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
  blog(`🎉 ${def.name} is defeated!`);
  const gained = gainXp(def.xp);
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

  const heal = eff('healOnWin');
  if (heal > 0) {
    const amt = Math.round(s.hpMax * heal);
    s.hp = Math.min(s.hpMax, s.hp + amt);
    blog(`🌬️ Second Wind restores ${amt} HP.`);
  }

  B.monster.alive = false;
  B.monster.respawnAt = def.boss ? Infinity : G.time + 45;

  if (def.finalBoss && !s.sunRestored) {
    // the sun returns to Rainyday — gloom-things cannot exist beneath it
    s.sunRestored = true;
    s.mainQuest = 7;
    for (const m of G.monsters) { m.alive = false; m.respawnAt = Infinity; }
    setTimeout(() => {
      closeScreen('battleScreen');
      openScreen('winBanner');
      fxConfetti(window.innerWidth / 2, 160, 80);
      setTimeout(() => fxConfetti(window.innerWidth / 2, window.innerHeight / 2, 60), 500);
    }, 900);
  } else if (def.miniboss !== undefined && !s.regionsRestored[def.miniboss]) {
    // a champion falls — its whole region floods with light
    s.regionsRestored[def.miniboss] = true;
    for (const m of G.monsters) {
      if (m.alive && G.mapId === 'world' && regionOf(m.x, m.y) === def.miniboss) {
        m.alive = false; m.respawnAt = Infinity;
      }
    }
    setTimeout(() => {
      toast(`🌞 Sunlight floods the ${REGION_NAMES[def.miniboss]} of Rainyday! The gloom-things melt into dew.`);
      fxConfetti(window.innerWidth / 2, 200, 50);
    }, 800);
    if (s.regionsRestored.every(Boolean)) {
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

function defeat() {
  B.over = true;
  const pp = bPos('bPlayerEmoji');
  fxBurst(pp.x, pp.y, { count: 16, colors: ['#9a93b5', '#d8d3ea'], speed: 160, life: 0.9 });
  fxBurst(pp.x, pp.y, { count: 3, emoji: ['💫'], speed: 100, size: 20, life: 1.2, g: -40 });
  blog('💫 You are knocked out…');
  renderBattle(false, true);
}

function endBattle(how) {
  B.over = true;
  closeScreen('battleScreen');
  const s = G.state;
  if (how === 'dead') {
    s.hp = s.hpMax;
    const wasRealm = G.mapId === 'realm', wasClouds = G.mapId === 'clouds';
    travelTo('village', VILLAGE_ENTRY.x, VILLAGE_ENTRY.y);
    toast(wasRealm ? '💫 The gloom chews you up and spits you back into Drizzlewick. It can wait. Can you?'
      : wasClouds ? '💫 You tumble from the clouds and land in a haystack back home.'
      : '🏘️ You wake up back in Drizzlewick, patched up and ready to try again.');
  } else if (how === 'flee') {
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

  document.getElementById('bMonEmoji').textContent = B.def.emoji;
  document.getElementById('bMonName').textContent = B.def.name;
  const mpct = Math.max(0, B.mhp / B.mhpMax * 100);
  document.getElementById('bMonHpFill').style.width = mpct + '%';
  document.getElementById('bMonHpText').textContent = `${Math.max(0, B.mhp)} / ${B.mhpMax}`;

  const chips = [];
  if (B.mStatus.burn && B.mStatus.burn.turns > 0) chips.push('🔥 burn');
  if (B.mStatus.poison && B.mStatus.poison.turns > 0) chips.push('💜 poison');
  if (B.mStatus.weaken && B.mStatus.weaken.turns > 0) chips.push('💧 weakened');
  document.getElementById('bMonChips').textContent = chips.join('  ');

  document.getElementById('bPlayerEmoji').textContent = cls.emoji;
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
    const btn = document.createElement('button');
    btn.className = 'act big';
    if (lost) {
      btn.textContent = '🏕️ Back to camp';
      btn.onclick = () => endBattle('dead');
    } else {
      btn.textContent = '✨ Continue';
      btn.onclick = () => endBattle('win');
    }
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
