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
    row.onclick = () => startPolish(id);
    rawList.appendChild(row);
  }
  if (!anyRaw) rawList.innerHTML = '<div class="empty">No raw minerals yet — tap the sparkling gem nodes on the map to mine!</div>';

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

// ---------- polish minigame ----------

const POLISH = { active: false, mineral: null, pos: 0, dir: 1, raf: 0 };

function startPolish(mineralId) {
  const s = G.state;
  if (!s.raw[mineralId]) return;
  POLISH.active = true;
  POLISH.mineral = mineralId;
  POLISH.pos = 0;
  POLISH.dir = 1;
  const min = MINERALS[mineralId];
  document.getElementById('polishTitle').innerHTML =
    `Polishing <b style="color:${min.color}">${min.name}</b> — tap STOP in the bright center!`;
  const pGem = document.getElementById('pGem');
  pGem.classList.remove('glowing');
  pGem.innerHTML = gemSVG(mineralId, 120);
  document.getElementById('pResult').innerHTML = '';
  document.getElementById('pStop').style.display = 'inline-block';
  // sweet-zone widths (fraction of bar), widened by Steady Hands
  const zoneBoost = 1 + eff('polishZone');
  POLISH.brilliant = 0.055 * zoneBoost;
  POLISH.fine = 0.16 * zoneBoost;
  document.getElementById('pZoneFine').style.width = (POLISH.fine * 2 * 100) + '%';
  document.getElementById('pZoneBril').style.width = (POLISH.brilliant * 2 * 100) + '%';
  closeScreen('bagScreen');
  openScreen('polishScreen');
  let last = performance.now();
  const tick = (now) => {
    if (!POLISH.active) return;
    const dt = (now - last) / 1000;
    last = now;
    POLISH.pos += POLISH.dir * dt * 0.9; // full sweeps per second
    if (POLISH.pos > 1) { POLISH.pos = 1; POLISH.dir = -1; }
    if (POLISH.pos < 0) { POLISH.pos = 0; POLISH.dir = 1; }
    document.getElementById('pMarker').style.left = (POLISH.pos * 100) + '%';
    POLISH.raf = requestAnimationFrame(tick);
  };
  POLISH.raf = requestAnimationFrame(tick);
}

function stopPolish() {
  if (!POLISH.active) return;
  POLISH.active = false;
  cancelAnimationFrame(POLISH.raf);
  const dist = Math.abs(POLISH.pos - 0.5);
  let quality = 'rough';
  if (dist <= POLISH.brilliant) quality = 'brilliant';
  else if (dist <= POLISH.fine) quality = 'fine';

  const s = G.state;
  const id = POLISH.mineral;
  s.raw[id]--;
  if (s.raw[id] <= 0) delete s.raw[id];
  if (!s.polished[id]) s.polished[id] = { rough: 0, fine: 0, brilliant: 0 };
  s.polished[id][quality]++;
  save();

  const qd = QUALITIES[quality];
  const min = MINERALS[id];
  const gr = document.getElementById('pGem').getBoundingClientRect();
  const gx = gr.left + gr.width / 2, gy = gr.top + gr.height / 2;
  if (quality === 'brilliant') {
    document.getElementById('pGem').classList.add('glowing');
    fxRing(gx, gy, '#ffffff', 110);
    fxBurst(gx, gy, { count: 40, colors: [min.color, '#ffffff', '#ffe94a'], star: true, speed: 320, life: 1 });
  } else if (quality === 'fine') {
    fxBurst(gx, gy, { count: 18, colors: [min.color, '#ffffff'], star: true, speed: 220 });
  } else {
    fxBurst(gx, gy, { count: 6, colors: ['#9a93b5'], speed: 120, life: 0.6 });
  }
  const cheer = { rough: 'A little scuffed, but it\'ll do.', fine: 'Nice and shiny!', brilliant: 'PERFECT! It gleams like a star!' }[quality];
  const result = document.getElementById('pResult');
  result.innerHTML = `<div class="pQuality q-${quality}">${qd.icon} ${qd.name} ${min.name}</div><div class="pCheer">${cheer}</div>`;
  document.getElementById('pStop').style.display = 'none';

  const again = document.createElement('button');
  again.className = 'bigBtn';
  const remaining = s.raw[id] || 0;
  again.textContent = remaining > 0 ? `Polish another (${remaining} left)` : 'Back to bag';
  again.onclick = () => {
    closeScreen('polishScreen');
    if (remaining > 0) startPolish(id);
    else openBag();
  };
  result.appendChild(again);
}

// ---------- spellbook / crafting ----------

function countPolished(mineralId) {
  const p = G.state.polished[mineralId];
  return p ? (p.rough + p.fine + p.brilliant) : 0;
}

function openSpells() {
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
  renderSkills();
  openScreen('skillScreen');
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
  document.getElementById('btnBag').onclick = openBag;
  document.getElementById('btnSpells').onclick = openSpells;
  document.getElementById('btnSkills').onclick = openSkills;
  document.getElementById('btnMenu').onclick = () => openScreen('menuScreen');
  document.getElementById('pStop').onclick = stopPolish;
  document.getElementById('btnNewGame').onclick = () => {
    if (confirm('Start over? Your current hero will be lost.')) resetSave();
  };
  document.getElementById('btnWinClose').onclick = () => closeScreen('winBanner');
  document.querySelectorAll('.closeBtn').forEach(btn => {
    btn.onclick = () => closeScreen(btn.dataset.close);
  });
}
