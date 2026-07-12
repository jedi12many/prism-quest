// Prism Quest — UI: screens, class select, bag, polish minigame, spellbook, skill tree

// ---------- screen management ----------

function openScreen(id) {
  document.getElementById(id).classList.add('open');
  G.lock = true;
  G.path = [];
  G.pendingMine = null;
}

function closeScreen(id) {
  document.getElementById(id).classList.remove('open');
  G.lock = document.querySelector('.screen.open') !== null;
}

function closeAllScreens() {
  document.querySelectorAll('.screen.open').forEach(el => el.classList.remove('open'));
  G.lock = false;
}

function toast(msg) {
  const wrap = document.getElementById('toastWrap');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => el.classList.add('show'), 20);
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 3400);
}

// ---------- HUD ----------

function renderHUD() {
  if (!G.state) return;
  const s = G.state;
  document.getElementById('hpFill').style.width = Math.max(0, s.hp / s.hpMax * 100) + '%';
  document.getElementById('hpText').textContent = `❤️ ${s.hp}/${s.hpMax}`;
  const need = xpNext(s.level);
  document.getElementById('xpFill').style.width = Math.min(100, s.xp / need * 100) + '%';
  document.getElementById('lvlText').textContent = `Lv ${s.level}`;
  const dot = document.getElementById('skillDot');
  dot.style.display = s.skillPoints > 0 ? 'block' : 'none';
}

// ---------- class select ----------

function showClassScreen() {
  const wrap = document.getElementById('classCards');
  wrap.innerHTML = '';
  for (const [id, cls] of Object.entries(CLASSES)) {
    const card = document.createElement('button');
    card.className = 'classCard';
    card.innerHTML = `
      <div class="classEmoji">${cls.emoji}</div>
      <div class="className">${cls.name}</div>
      <div class="classBlurb">${cls.blurb}</div>
      <div class="classPerk">✨ ${cls.perkDesc}</div>
      <div class="classStats">❤️ ${cls.hp} &nbsp; ⚔️ ${cls.atk} &nbsp; 🔮 ${cls.mag} &nbsp; 🛡️ ${cls.def}</div>`;
    card.onclick = () => { closeScreen('classScreen'); newGameWithClass(id); };
    wrap.appendChild(card);
  }
  document.getElementById('hud').style.display = 'none';
  openScreen('classScreen');
}

// ---------- bag ----------

function openBag() {
  renderBag();
  openScreen('bagScreen');
}

function renderBag() {
  const s = G.state;
  const rawList = document.getElementById('rawList');
  rawList.innerHTML = '';
  let anyRaw = false;
  for (const [id, min] of Object.entries(MINERALS)) {
    const count = s.raw[id] || 0;
    if (!count) continue;
    anyRaw = true;
    const row = document.createElement('button');
    row.className = 'itemRow';
    row.innerHTML = `
      ${gemSVG(id, 32)}
      <span class="itemName">${min.name}</span>
      <span class="itemCount">×${count}</span>
      <span class="itemAction">Polish ➜</span>`;
    row.onclick = () => polishOne(id);
    rawList.appendChild(row);
  }
  if (!anyRaw) rawList.innerHTML = '<div class="empty">No raw minerals yet — tap the sparkling gem nodes on the map to mine!</div>';
  const dwarfCharges = s.spells.dwarves || 0;
  if (anyRaw && dwarfCharges > 0) {
    const btn = document.createElement('button');
    btn.className = 'bigBtn dwarf';
    btn.textContent = `⛏️ Summon Dwarves — polish everything! (×${dwarfCharges})`;
    btn.onclick = summonDwarves;
    rawList.appendChild(btn);
  }

  const polList = document.getElementById('polList');
  polList.innerHTML = '';
  let anyPol = false;
  for (const [id, min] of Object.entries(MINERALS)) {
    const p = s.polished[id];
    if (!p) continue;
    const parts = [];
    for (const [q, qd] of Object.entries(QUALITIES)) {
      if (p[q]) parts.push(`${qd.icon} ${qd.name} ×${p[q]}`);
    }
    if (!parts.length) continue;
    anyPol = true;
    const row = document.createElement('div');
    row.className = 'itemRow static';
    row.innerHTML = `
      ${gemSVG(id, 32)}
      <span class="itemName">${min.name}</span>
      <span class="itemCount">${parts.join(' · ')}</span>`;
    polList.appendChild(row);
  }
  if (!anyPol) polList.innerHTML = '<div class="empty">Nothing polished yet. Polished gems are what spells are made of!</div>';
}

// ---------- polishing (luck-based) ----------

// Quality is luck: the Factory, Steady Hands, and dwarf crews raise the odds.
function rollQuality(bonus = 0) {
  const luck = eff('polishZone') + bonus;
  const pBrilliant = Math.min(0.75, 0.12 + 0.18 * luck);
  const pFine = Math.min(0.9 - pBrilliant, 0.33 + 0.15 * luck);
  const r = Math.random();
  if (r < pBrilliant) return 'brilliant';
  if (r < pBrilliant + pFine) return 'fine';
  return 'rough';
}

function polishOne(mineralId) {
  const s = G.state;
  if (!s.raw[mineralId]) return;
  const quality = rollQuality();
  s.raw[mineralId]--;
  if (s.raw[mineralId] <= 0) delete s.raw[mineralId];
  if (!s.polished[mineralId]) s.polished[mineralId] = { rough: 0, fine: 0, brilliant: 0 };
  s.polished[mineralId][quality]++;
  save();
  const min = MINERALS[mineralId];
  const qd = QUALITIES[quality];
  const cheer = { rough: '', fine: ' Nice and shiny!', brilliant: ' ✨ A perfect cut!' }[quality];
  toast(`${qd.icon} ${qd.name} ${min.name}!${cheer}`);
  const pr = document.querySelector('#bagScreen .panel').getBoundingClientRect();
  fxBurst(pr.left + pr.width / 2, pr.top + 90, {
    count: quality === 'brilliant' ? 30 : quality === 'fine' ? 14 : 6,
    colors: [min.color, '#ffffff'], star: true,
    speed: quality === 'brilliant' ? 300 : 180,
  });
  if (quality === 'brilliant') fxRing(pr.left + pr.width / 2, pr.top + 90, '#ffffff', 90);
  renderBag();
}

function summonDwarves() {
  const s = G.state;
  if (!s.spells.dwarves || s.spells.dwarves <= 0) return;
  const total = Object.values(s.raw).reduce((a, b) => a + b, 0);
  if (!total) { toast('⛏️ The dwarves peer into your empty bag and shrug.'); return; }
  s.spells.dwarves--;
  const counts = { rough: 0, fine: 0, brilliant: 0 };
  for (const [m, n] of Object.entries({ ...s.raw })) {
    if (!s.polished[m]) s.polished[m] = { rough: 0, fine: 0, brilliant: 0 };
    for (let i = 0; i < n; i++) {
      const q = rollQuality(1.5); // master craftsdwarves: a nice big bonus
      s.polished[m][q]++;
      counts[q]++;
    }
    delete s.raw[m];
  }
  save();
  const pr = document.querySelector('#bagScreen .panel').getBoundingClientRect();
  fxBurst(pr.left + pr.width / 2, pr.top + 120, { count: 10, emoji: ['🧔', '⛏️', '🔨'], speed: 220, size: 24, life: 1.6, g: 250 });
  fxConfetti(pr.left + pr.width / 2, pr.top + 120, 40);
  toast(`⛏️ Hi-ho! The dwarf crew polished ${total} gems: 💠×${counts.brilliant} 🔹×${counts.fine} ◽×${counts.rough}!`);
  renderBag();
}

// ---------- spellbook / crafting ----------

function countPolished(mineralId) {
  const p = G.state.polished[mineralId];
  return p ? (p.rough + p.fine + p.brilliant) : 0;
}

function requireCamp(what) {
  if (atBase()) return true;
  toast(`🌧️ Too dangerous out here! Return to camp to ${what}.`);
  return false;
}

function openSpells() {
  if (!requireCamp('craft spells')) return;
  renderSpells();
  openScreen('spellScreen');
}

function renderSpells() {
  const s = G.state;
  const list = document.getElementById('spellList');
  list.innerHTML = '';
  for (const [id, sp] of Object.entries(SPELLS)) {
    const owned = s.spells[id] || 0;
    const canCraft = Object.entries(sp.recipe).every(([m, n]) => countPolished(m) >= n);
    const recipeHtml = Object.entries(sp.recipe).map(([m, n]) => {
      const have = countPolished(m);
      const ok = have >= n;
      return `<span class="ing ${ok ? 'ok' : 'missing'}" style="--c:${MINERALS[m].color}">${gemSVG(m, 16)}${MINERALS[m].name} ${have}/${n}</span>`;
    }).join(' ');
    const card = document.createElement('div');
    card.className = 'spellCard' + (owned > 0 ? ' owned' : '');
    card.innerHTML = `
      <div class="spellHead">
        <span class="spellEmoji">${sp.emoji}</span>
        <span class="spellName">${sp.name}</span>
        <span class="spellCharges">${owned > 0 ? '×' + owned : ''}</span>
      </div>
      <div class="spellDesc">${sp.desc}</div>
      <div class="spellRecipe">${recipeHtml}</div>`;
    const btn = document.createElement('button');
    btn.className = 'craftBtn';
    btn.textContent = canCraft ? `Craft (+${sp.base}+ charges)` : 'Need more gems';
    btn.disabled = !canCraft;
    btn.onclick = () => craftSpell(id);
    card.appendChild(btn);
    list.appendChild(card);
  }
}

function craftSpell(id) {
  const s = G.state;
  const sp = SPELLS[id];
  // verify + consume, best quality first (better quality = more charges)
  let qualitySum = 0, gemCount = 0;
  for (const [m, n] of Object.entries(sp.recipe)) {
    if (countPolished(m) < n) return;
  }
  for (const [m, n] of Object.entries(sp.recipe)) {
    let need = n;
    for (const q of ['brilliant', 'fine', 'rough']) {
      while (need > 0 && s.polished[m][q] > 0) {
        s.polished[m][q]--;
        qualitySum += QUALITIES[q].mult;
        gemCount++;
        need--;
      }
    }
  }
  const bonus = Math.round(qualitySum / gemCount);
  const charges = sp.base + bonus + eff('charges');
  s.spells[id] = (s.spells[id] || 0) + charges;
  save();
  const pr = document.querySelector('#spellScreen .panel').getBoundingClientRect();
  fxBurst(pr.left + pr.width / 2, pr.top + 80, { count: 22, colors: RAINBOW, star: true, speed: 240 });
  toast(`${sp.emoji} Crafted ${sp.name}! +${charges} charges${bonus > 0 ? ' (quality bonus!)' : ''}`);
  renderSpells();
}

// ---------- skill tree ----------

function openSkills() {
  if (!requireCamp('train your powers')) return;
  renderSkills();
  openScreen('skillScreen');
}

// ---------- camp / base building ----------

function openBase() {
  renderBase();
  openScreen('baseScreen');
}

function renderBase() {
  const s = G.state;
  const here = atBase();
  document.getElementById('baseSub').textContent = here
    ? 'Your sunny sanctuary. Build with raw minerals to grow your power.'
    : '🌧️ You are away from camp — walk home to build and upgrade.';
  const list = document.getElementById('baseList');
  list.innerHTML = '';
  for (const [id, b] of Object.entries(BUILDINGS)) {
    const lvl = s.base[id] || 0;
    const maxed = lvl >= b.max;
    const reqOk = !b.requires || (s.base[b.requires[0]] || 0) >= b.requires[1];
    const cost = maxed ? null : b.costs[lvl];
    let can = here && reqOk && !maxed && !!cost;
    let costHtml = '';
    if (cost) {
      costHtml = Object.entries(cost).map(([m, n]) => {
        const have = s.raw[m] || 0;
        if (have < n) can = false;
        return `<span class="ing ${have >= n ? 'ok' : 'missing'}" style="--c:${MINERALS[m].color}">${gemSVG(m, 14)}${MINERALS[m].name} ${have}/${n}</span>`;
      }).join('');
    }
    const card = document.createElement('div');
    card.className = 'spellCard' + (lvl > 0 ? ' owned' : '');
    card.innerHTML = `
      <div class="spellHead">
        <span class="spellEmoji">${b.emoji}</span>
        <span class="spellName">${lvl > 0 ? b.levels[lvl - 1] : b.name}</span>
        <span class="spellCharges">${maxed ? 'MAX' : lvl > 0 ? 'Lv ' + lvl : ''}</span>
      </div>
      <div class="spellDesc">${b.desc}${lvl > 0 ? ` <b style="color:#7bf59b">(now: ${b.bonus(lvl)})</b>` : ''}</div>
      ${!reqOk ? `<div class="spellDesc" style="color:#ffd24a">🔒 Requires ${BUILDINGS[b.requires[0]].name} Lv ${b.requires[1]}</div>` : ''}
      <div class="spellRecipe">${costHtml}</div>`;
    if (!maxed) {
      const btn = document.createElement('button');
      btn.className = 'craftBtn';
      btn.textContent = !here ? 'Return to camp' : !reqOk ? 'Locked' : lvl > 0 ? `Upgrade to Lv ${lvl + 1}` : 'Build';
      btn.disabled = !can;
      btn.onclick = () => upgradeBuilding(id);
      card.appendChild(btn);
    }
    list.appendChild(card);
  }
}

function upgradeBuilding(id) {
  const s = G.state, b = BUILDINGS[id];
  const lvl = s.base[id] || 0;
  if (!atBase() || lvl >= b.max) return;
  if (b.requires && (s.base[b.requires[0]] || 0) < b.requires[1]) return;
  const cost = b.costs[lvl];
  if (!cost) return;
  for (const [m, n] of Object.entries(cost)) if ((s.raw[m] || 0) < n) return;
  for (const [m, n] of Object.entries(cost)) {
    s.raw[m] -= n;
    if (s.raw[m] <= 0) delete s.raw[m];
  }
  s.base[id] = lvl + 1;
  calcStats();
  save();
  const pr = document.querySelector('#baseScreen .panel').getBoundingClientRect();
  fxConfetti(pr.left + pr.width / 2, pr.top + 100, 30);
  toast(`${b.emoji} ${lvl === 0 ? 'Built' : 'Upgraded'} ${b.levels[lvl]}! ${b.bonus(lvl + 1)}`);
  renderBase();
  renderHUD();
}

function renderSkills() {
  const s = G.state;
  const cls = classDef();
  document.getElementById('spLeft').textContent =
    `${cls.emoji} ${cls.name} — ${s.skillPoints} skill point${s.skillPoints === 1 ? '' : 's'} to spend`;
  const cols = document.getElementById('skillCols');
  cols.innerHTML = '';
  for (const branch of cls.tree) {
    const col = document.createElement('div');
    col.className = 'skillCol';
    col.innerHTML = `<div class="branchName" style="color:${branch.color}">${branch.branch}</div>`;
    branch.nodes.forEach((node, tier) => {
      const owned = !!s.skills[node.id];
      const unlocked = tier === 0 || !!s.skills[branch.nodes[tier - 1].id];
      const btn = document.createElement('button');
      btn.className = 'skillNode' + (owned ? ' owned' : unlocked ? ' avail' : ' locked');
      btn.innerHTML = `
        <span class="skillIcon">${node.icon}</span>
        <span class="skillInfo"><b>${node.name}</b><small>${node.desc}</small></span>
        <span class="skillMark">${owned ? '✓' : unlocked ? (s.skillPoints > 0 ? '+' : '') : '🔒'}</span>`;
      btn.onclick = () => buySkill(node.id, branch, tier);
      col.appendChild(btn);
    });
    cols.appendChild(col);
  }
}

function buySkill(nodeId, branch, tier) {
  const s = G.state;
  if (s.skills[nodeId]) return;
  if (tier > 0 && !s.skills[branch.nodes[tier - 1].id]) { toast('🔒 Learn the skill above it first.'); return; }
  if (s.skillPoints <= 0) { toast('No skill points — level up by defeating monsters!'); return; }
  s.skillPoints--;
  s.skills[nodeId] = true;
  calcStats();
  save();
  const node = branch.nodes[tier];
  toast(`${node.icon} Learned ${node.name}!`);
  renderSkills();
  renderHUD();
}

// ---------- bindings ----------

function bindUI() {
  document.getElementById('btnBase').onclick = openBase;
  document.getElementById('btnBag').onclick = openBag;
  document.getElementById('btnSpells').onclick = openSpells;
  document.getElementById('btnSkills').onclick = openSkills;
  document.getElementById('btnMenu').onclick = () => openScreen('menuScreen');
  document.getElementById('btnNewGame').onclick = () => {
    if (confirm('Start over? Your current hero will be lost.')) resetSave();
  };
  document.getElementById('btnWinClose').onclick = () => closeScreen('winBanner');
  document.querySelectorAll('.closeBtn').forEach(btn => {
    btn.onclick = () => closeScreen(btn.dataset.close);
  });
}
