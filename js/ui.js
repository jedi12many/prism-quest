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
  syncHudActive();
}

function closeAllScreens() {
  document.querySelectorAll('.screen.open').forEach(el => el.classList.remove('open'));
  G.lock = false;
  syncHudActive();
}

// keep the highlighted HUD icon in step with whichever panel (if any) is open
function syncHudActive() {
  const open = Object.keys(PANEL_BUTTONS || {}).find(id => document.getElementById(id).classList.contains('open'));
  if (typeof hudActive === 'function') hudActive(open || null);
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

function hudVisible(on) {
  const d = on ? 'flex' : 'none';
  document.getElementById('hud').style.display = d;
  document.getElementById('hudBottom').style.display = d;
}

// the current objective, dungeon location, active pact, and villager favors —
// shared by the Quest tab and the Village Ledger's journal section
function questJournalHTML() {
  const s = G.state;
  let html = '';
  if (G.mapId === 'dungeon' && s.dungeon) {
    const dc = DUNGEONS[s.dungeon.type];
    html += `<div class="ledgerQuest">${dc.emoji} ${dc.name} — Floor ${s.dungeon.floor}/${s.dungeon.maxFloor}</div>`;
  }
  html += `<div class="ledgerQuest">📜 ${questText()}</div>`;
  if (s.activePact) html += `<div class="ledgerFavor">${s.activePact.icon} Gloom Pact: <b>${s.activePact.name}</b></div>`;
  const q = s.sideQuests || {};
  const favor = (id, name, text) => {
    const st = q[id];
    if (!st || st.stage === 0) return '';
    const ready = questFavorReady(id);
    return `<div class="ledgerFavor">${st.stage >= 2 ? '✅' : ready ? '❗' : '▫️'} <b>${name}</b> — ${text(st)}</div>`;
  };
  html += favor('pip', "Pip's frog", st => st.stage >= 2 ? 'Sir Croaksworth is home!' : `scare off monsters in Bogmire (${Math.min(5, st.n)}/5)`);
  html += favor('baker', "Barnaby's ovens", st => st.stage >= 2 ? 'the ovens glow again' : `bring 4 Sunstone (${Math.min(4, gemStock('sunstone'))}/4)`);
  html += favor('willow', "Willow's tulips", st => st.stage >= 2 ? 'the tulips bloom!' : `bring 2 Rose Opal (${Math.min(2, gemStock('roseopal'))}/2)`);
  return html;
}

function questFavorReady(id) {
  const q = G.state.sideQuests || {};
  if (id === 'pip') return q.pip && q.pip.stage === 1 && q.pip.n >= 5;
  if (id === 'baker') return q.baker && q.baker.stage === 1 && gemStock('sunstone') >= 4;
  if (id === 'willow') return q.willow && q.willow.stage === 1 && gemStock('roseopal') >= 2;
  return false;
}
function questTurnInReady() { return ['pip', 'baker', 'willow'].some(questFavorReady); }

function openQuest() { switchPanel('questScreen', renderQuest); }
function renderQuest() { document.getElementById('questJournal').innerHTML = questJournalHTML(); }

function renderHUD() {
  if (!G.state) return;
  const s = G.state;
  document.getElementById('questDot').style.display = questTurnInReady() ? 'block' : 'none';
  if (document.querySelector('#questScreen.open')) renderQuest(); // live-refresh if open
  document.getElementById('hpFill').style.width = Math.max(0, s.hp / s.hpMax * 100) + '%';
  document.getElementById('hpText').textContent = `❤️ ${s.hp} / ${s.hpMax}`;
  const capped = s.level >= LEVEL_CAP;
  const need = xpNext(s.level);
  document.getElementById('xpFill').style.width = (capped ? 100 : Math.min(100, s.xp / need * 100)) + '%';
  document.getElementById('lvlText').textContent = capped
    ? `⭐ Lv ${s.level} · MAX`
    : `⭐ Lv ${s.level} · ${s.xp}/${need} XP · ${need - s.xp} to next`;
  const dot = document.getElementById('skillDot');
  dot.style.display = s.skillPoints > 0 ? 'block' : 'none';
  document.getElementById('upgradeDot').style.display = hasBaggedUpgrade() ? 'block' : 'none';
}

// is any unequipped item in the bag a straight upgrade for its slot?
function hasBaggedUpgrade() {
  const s = G.state;
  if (!s || !s.inventory) return false;
  return s.inventory.some(it => itemUpgradeDelta(it).total > 0);
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
      <div class="classStats">❤️ ${cls.hp} &nbsp; ⚔️ ${cls.atk} &nbsp; 🔮 ${cls.mag} &nbsp; 🛡️ ${cls.def}</div>
      <div class="classDiff">${cls.difficulty || ''}</div>`;
    card.onclick = () => { closeScreen('classScreen'); newGameWithClass(id); };
    wrap.appendChild(card);
  }
  const meta = loadMeta();
  const banner = document.getElementById('sanctuaryBanner');
  banner.innerHTML = `✦ <b>${meta.motes}</b> Motes` + (meta.runs ? ` · run #${(meta.runs || 0) + 1}` : '');
  hudVisible(false);
  openScreen('classScreen');
}

// ---------- Sanctuary (meta-progression shop) ----------

function openMeta() {
  renderMeta();
  openScreen('metaScreen');
}

function renderMeta() {
  const meta = loadMeta();
  document.getElementById('metaMotes').innerHTML = `✦ <b>${meta.motes}</b> Motes to spend`;
  const list = document.getElementById('metaList');
  list.innerHTML = '';
  for (const [id, u] of Object.entries(META_UPGRADES)) {
    const rank = meta.upgrades[id] || 0;
    const maxed = rank >= u.max;
    const cost = maxed ? null : u.cost(rank);
    const can = !maxed && meta.motes >= cost;
    const card = document.createElement('div');
    card.className = 'metaCard' + (rank > 0 ? ' owned' : '');
    card.innerHTML = `
      <div class="metaHead"><span class="metaIcon">${u.icon}</span>
        <span class="metaName">${u.name}</span>
        <span class="metaRank">${maxed ? 'MAX' : rank > 0 ? `${rank}/${u.max}` : ''}</span></div>
      <div class="metaDesc">${u.desc}${u.eff ? ' <span class="metaPerm">(permanent)</span>' : ''}</div>`;
    const btn = document.createElement('button');
    btn.className = 'craftBtn';
    btn.textContent = maxed ? 'Maxed' : `Buy — ✦ ${cost}`;
    btn.disabled = !can;
    btn.onclick = () => buyMeta(id);
    card.appendChild(btn);
    list.appendChild(card);
  }
}

function buyMeta(id) {
  const meta = loadMeta();
  const u = META_UPGRADES[id];
  const rank = meta.upgrades[id] || 0;
  if (rank >= u.max) return;
  const cost = u.cost(rank);
  if (meta.motes < cost) return;
  meta.motes -= cost;
  meta.upgrades[id] = rank + 1;
  saveMeta(meta);
  sndCoin();
  toast(`${u.icon} ${u.name} upgraded! (${rank + 1}/${u.max})`);
  renderMeta();
}

// ---------- bag ----------

// the top HUD icons stay live while a panel is open, so tapping one switches
// straight to that panel (no Close needed). These map screen -> HUD button.
const PANEL_BUTTONS = { questScreen: 'btnQuest', bagScreen: 'btnBag', charScreen: 'btnChar', spellScreen: 'btnSpells', skillScreen: 'btnSkills', baseScreen: 'btnBase', menuScreen: 'btnMenu' };
function switchPanel(id, renderFn) {
  closeAllScreens();      // drop whatever panel/sub-modal was up
  renderFn();
  openScreen(id);
  hudActive(id);
}
// tap the icon to open its panel; tap the same icon again to close it (and any
// sub-modal it spawned, like an open item card)
function togglePanel(id, openFn) {
  if (document.getElementById(id).classList.contains('open')) closeAllScreens();
  else openFn();
}
function hudActive(id) {
  for (const [scr, btn] of Object.entries(PANEL_BUTTONS)) {
    document.getElementById(btn).classList.toggle('active', scr === id);
  }
}

function openBag() { switchPanel('bagScreen', renderBag); }

function renderBag() {
  const s = G.state;
  const rawList = document.getElementById('rawList');
  rawList.innerHTML = '';
  let anyRaw = false;
  for (const [id, min] of Object.entries(MINERALS)) {
    const count = s.raw[id] || 0;
    if (!count) continue;
    anyRaw = true;
    const row = document.createElement('div');
    row.className = 'itemRow static';
    row.innerHTML = `
      ${gemSVG(id, 32)}
      <span class="itemName">${min.name}</span>
      <span class="itemCount">×${count}</span>`;
    rawList.appendChild(row);
  }
  if (!anyRaw) rawList.innerHTML = '<div class="empty">No raw minerals yet — tap the sparkling gem nodes on the map to mine!</div>';
  if (anyRaw) {
    const btn = document.createElement('button');
    btn.className = 'bigBtn';
    btn.textContent = '🪞 Polish all';
    btn.onclick = polishAll;
    rawList.appendChild(btn);
    const dwarfCharges = s.spells.dwarves || 0;
    if (dwarfCharges > 0) {
      const dbtn = document.createElement('button');
      dbtn.className = 'bigBtn dwarf';
      dbtn.textContent = `⛏️ Summon Dwarves — big Brilliant bonus! (×${dwarfCharges})`;
      dbtn.onclick = summonDwarves;
      rawList.appendChild(dbtn);
    }
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

// ---------- character sheet ----------

function openChar() { switchPanel('charScreen', renderChar); }

function critPct() { return Math.round((0.05 + eff('crit')) * 100); }
function dodgePct() { return Math.round(Math.min(0.6, eff('dodge')) * 100); }

function renderChar() {
  const s = G.state;
  // identity — class, and the title you earn by holding back the dark
  const cls = CLASSES[s.classId];
  const titleEl = document.getElementById('charTitle');
  if (titleEl) {
    const earned = s.sunRestored;
    titleEl.innerHTML = `<span class="charIdent">${cls.emoji} Lv ${s.level} ${cls.name}</span>`
      + (earned
        ? `<span class="charEpithet" title="Earned for restoring the sun to Rainyday">🌑 the Gloombreaker</span>`
        : '');
  }
  // equipment doll
  const doll = document.getElementById('charDoll');
  doll.innerHTML = '';
  for (const [slot, sd] of Object.entries(SLOTS)) {
    const it = s.equip[slot];
    const cell = document.createElement('button');
    cell.className = 'slotCell' + (it ? ' filled' : '');
    if (it) cell.style.borderColor = RARITIES[it.rarity].color;
    cell.innerHTML = it
      ? `<span class="slotEmoji">${sd.emoji}</span><span class="slotItemName" style="color:${RARITIES[it.rarity].color}">${it.name}</span>${ratingPill(it)}${it.sockets ? `<span class="slotSockets">${'◈'.repeat(it.gems.length)}${'◇'.repeat(it.sockets - it.gems.length)}</span>` : ''}`
      : `<span class="slotEmoji empty">${sd.emoji}</span><span class="slotItemName dim">${sd.name}</span>`;
    cell.onclick = () => it ? openItemCard(it, 'equipped') : toast(`Empty ${sd.name} slot — equip one from your loot below.`);
    doll.appendChild(cell);
  }

  // derived stats
  const set = prismSetCount();
  const rows = [
    ['⚔️ Attack', s.atk], ['🔮 Magic', s.mag], ['🛡️ Defense', s.def], ['❤️ Max HP', s.hpMax],
    ['💥 Crit', critPct() + '%'], ['🌀 Dodge', dodgePct() + '%'],
    ['✨ Spell dmg', '+' + Math.round(eff('spellDmg') * 100) + '%'],
    ['🔨 Bonk dmg', '+' + Math.round(eff('basicDmg') * 100) + '%'],
    ['🦄 Unicorn', '+' + Math.round(eff('unicornPower') * 100) + '%'],
    ['🌿 Regen', eff('regen') + '/turn'],
  ];
  document.getElementById('charStats').innerHTML = rows.map(([k, v]) =>
    `<div class="statRow"><span>${k}</span><b>${v}</b></div>`).join('');

  // set bonus banner
  const sb = document.getElementById('charSet');
  if (set > 0) {
    sb.style.display = 'block';
    sb.innerHTML = `<div class="setTitle">🌈 ${PRISM_SET.name} (${set}/5)</div>
      <div class="setLine ${set >= 3 ? 'on' : 'off'}">(3) ${PRISM_SET.b3Desc}</div>
      <div class="setLine ${set >= 5 ? 'on' : 'off'}">(5) ${PRISM_SET.b5Desc}</div>`;
  } else sb.style.display = 'none';

  // inventory
  const inv = document.getElementById('charInv');
  inv.innerHTML = '';
  if (!s.inventory.length) {
    inv.innerHTML = '<div class="empty">No loot in your bag. Defeat monsters to find equipment!</div>';
  } else {
    for (const it of s.inventory) {
      const cell = document.createElement('button');
      cell.className = 'invItem';
      cell.style.borderColor = RARITIES[it.rarity].color;
      cell.innerHTML = `<span class="invEmoji">${SLOTS[it.slot].emoji}</span>
        <span class="invName" style="color:${RARITIES[it.rarity].color}">${it.name}</span>
        ${ratingPill(it)} ${verdictBadge(it)}
        ${it.sockets ? `<span class="invSock">${'◈'.repeat(it.gems.length)}${'◇'.repeat(it.sockets - it.gems.length)}</span>` : ''}`;
      cell.onclick = () => openItemCard(it, 'inventory');
      inv.appendChild(cell);
    }
  }
}

function itemStatLines(item) {
  const lines = [];
  for (const [k, v] of Object.entries(item.base || {})) lines.push(`<div class="iStat">${STAT_LABELS[k] || k} <b>${fmtStat(k, v)}</b></div>`);
  for (const [k, v] of Object.entries(item.affixes || {})) lines.push(`<div class="iStat affix">${STAT_LABELS[k] || k} <b>${fmtStat(k, v)}</b></div>`);
  for (const g of item.gems || []) {
    const gs = GEM_SOCKET_STATS[g.mineral];
    lines.push(`<div class="iStat gemLine">◈ ${MINERALS[g.mineral].name} (${QUALITIES[g.quality].name}) <b>${fmtStat(gs.key, gs.vals[QUALITY_INDEX[g.quality]])}</b></div>`);
  }
  return lines.join('');
}

// spelled-out equip verdict for the item card
function verdictLine(item) {
  const d = itemUpgradeDelta(item);
  const dd = `<small>⚔ ${signed(d.atk)} · 🛡 ${signed(d.def)}</small>`;
  if (d.empty) return `<div class="icVerdict up">▲ Equip — fills an empty slot (+${d.total} power) ${dd}</div>`;
  if (d.total > 0) return `<div class="icVerdict up">▲ Upgrade — ${signed(d.total)} power ${dd}</div>`;
  if (d.total < 0) return `<div class="icVerdict down">▼ Downgrade — ${d.total} power ${dd}</div>`;
  return `<div class="icVerdict even">= Sidegrade — same power ${dd}</div>`;
}

function openItemCard(item, where) {
  const emptySockets = (item.sockets || 0) - item.gems.length;
  const card = document.getElementById('itemCard');
  card.style.borderColor = RARITIES[item.rarity].color;
  const equipped = where === 'equipped';
  const compareItem = !equipped ? G.state.equip[item.slot] : null;
  card.innerHTML = `
    <div class="icHead" style="color:${RARITIES[item.rarity].color}">
      ${SLOTS[item.slot].emoji} ${item.name}
    </div>
    <div class="icSub">${RARITIES[item.rarity].name} ${SLOTS[item.slot].name}${item.setId ? ` · ${PRISM_SET.name}` : ''} ${ratingPill(item)}</div>
    ${item.lore ? `<div class="icLore">"${item.lore}"</div>` : ''}
    <div class="icStats">${itemStatLines(item)}</div>
    ${item.sockets ? `<div class="icSockets">Sockets: ${'◈'.repeat(item.gems.length)}${'◇'.repeat(emptySockets)}</div>` : ''}
    ${!equipped ? verdictLine(item) : ''}
    ${compareItem ? `<div class="icCompare">Equipped: <b style="color:${RARITIES[compareItem.rarity].color}">${compareItem.name}</b> ${ratingPill(compareItem)}</div>` : ''}
    <div class="icActs" id="icActs"></div>`;
  const acts = document.getElementById('icActs');
  const mk = (label, cls, fn) => {
    const b = document.createElement('button');
    b.className = 'icBtn ' + cls;
    b.textContent = label;
    b.onclick = fn;
    acts.appendChild(b);
  };
  if (equipped) {
    mk('Unequip', 'sec', () => { unequip(item.slot); });
  } else {
    mk('Equip', 'pri', () => { equipItem(item); });
  }
  if (emptySockets > 0) mk('💎 Facet a gem', 'sec', () => openGemPicker(item));
  if (!equipped && !item.facet && !item.facets) mk('♻️ Salvage', 'sec', () => salvageItem(item));
  mk('Close', 'plain', () => closeScreen('itemCardScreen'));
  openScreen('itemCardScreen');
}

function equipItem(item) {
  const s = G.state;
  const i = s.inventory.indexOf(item);
  if (i < 0) return;
  s.inventory.splice(i, 1);
  const prev = s.equip[item.slot];
  s.equip[item.slot] = item;
  if (prev) s.inventory.push(prev);
  calcStats();
  save();
  toast(`${SLOTS[item.slot].emoji} Equipped ${item.name}.`);
  closeScreen('itemCardScreen');
  renderChar();
  renderHUD();
}

function unequip(slot) {
  const s = G.state;
  const it = s.equip[slot];
  if (!it) return;
  if (s.inventory.length >= INVENTORY_CAP) { toast('🎒 Bag is full — make room first.'); return; }
  s.equip[slot] = null;
  s.inventory.push(it);
  calcStats();
  save();
  closeScreen('itemCardScreen');
  renderChar();
  renderHUD();
}

function salvageItem(item) {
  if (item.facet || item.facets) { toast('✨ Far too precious to break. The Glassworks can reforge it.'); return; }
  const s = G.state;
  const i = s.inventory.indexOf(item);
  if (i < 0) return;
  s.inventory.splice(i, 1);
  // recover gems + a little quartz
  for (const g of item.gems) {
    if (!s.polished[g.mineral]) s.polished[g.mineral] = { rough: 0, fine: 0, brilliant: 0 };
    s.polished[g.mineral][g.quality]++;
  }
  const q = item.rarity === 'legendary' || item.rarity === 'set' ? 3 : 1;
  s.raw.quartz = (s.raw.quartz || 0) + q;
  calcStats();
  save();
  toast(`♻️ Salvaged ${item.name} → ${q} Quartz${item.gems.length ? ' + recovered gems' : ''}.`);
  closeScreen('itemCardScreen');
  renderChar();
  renderHUD();
}

function openGemPicker(item) {
  const s = G.state;
  const pick = document.getElementById('gemPickList');
  pick.innerHTML = '';
  let any = false;
  for (const [id, min] of Object.entries(MINERALS)) {
    const p = s.polished[id];
    if (!p) continue;
    for (const [q, qd] of Object.entries(QUALITIES)) {
      if (!p[q]) continue;
      any = true;
      const gs = GEM_SOCKET_STATS[id];
      const row = document.createElement('button');
      row.className = 'itemRow';
      row.innerHTML = `${gemSVG(id, 30)}
        <span class="itemName">${qd.name} ${min.name}</span>
        <span class="itemCount">×${p[q]}</span>
        <span class="itemAction">${STAT_LABELS[gs.key]} ${fmtStat(gs.key, gs.vals[QUALITY_INDEX[q]])} ➜</span>`;
      row.onclick = () => facetGem(item, id, q);
      pick.appendChild(row);
    }
  }
  if (!any) pick.innerHTML = '<div class="empty">No polished gems to facet. Polish some in your Bag first!</div>';
  document.getElementById('gemPickTitle').textContent = `Facet a gem into ${item.name}`;
  openScreen('gemPickScreen');
}

function facetGem(item, mineralId, quality) {
  const s = G.state;
  if (item.gems.length >= item.sockets) return;
  if (!s.polished[mineralId] || !s.polished[mineralId][quality]) return;
  s.polished[mineralId][quality]--;
  item.gems.push({ mineral: mineralId, quality });
  calcStats();
  save();
  const gs = GEM_SOCKET_STATS[mineralId];
  toast(`💎 Faceted ${QUALITIES[quality].name} ${MINERALS[mineralId].name} — ${STAT_LABELS[gs.key]} ${fmtStat(gs.key, gs.vals[QUALITY_INDEX[quality]])}!`);
  const pr = document.querySelector('#gemPickScreen .panel').getBoundingClientRect();
  fxBurst(pr.left + pr.width / 2, pr.top + 60, { count: 20, colors: [MINERALS[mineralId].color, '#ffffff'], star: true, speed: 240 });
  closeScreen('gemPickScreen');
  renderChar();
  renderHUD();
  // reopen the item card to show the new gem
  const where = Object.values(s.equip).includes(item) ? 'equipped' : 'inventory';
  openItemCard(item, where);
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

// polish every raw mineral in the bag; returns the quality tally
function polishBatch(bonus) {
  const s = G.state;
  const counts = { rough: 0, fine: 0, brilliant: 0, total: 0 };
  for (const [m, n] of Object.entries({ ...s.raw })) {
    if (!s.polished[m]) s.polished[m] = { rough: 0, fine: 0, brilliant: 0 };
    for (let i = 0; i < n; i++) {
      const q = rollQuality(bonus);
      s.polished[m][q]++;
      counts[q]++;
      counts.total++;
    }
    delete s.raw[m];
  }
  save();
  return counts;
}

function tallyText(c) { return `💠×${c.brilliant} 🔹×${c.fine} ◽×${c.rough}`; }

function polishAll() {
  if (!Object.keys(G.state.raw).length) return;
  const c = polishBatch(0);
  c.brilliant > 0 ? sndBrilliant() : sndPolish();
  const pr = document.querySelector('#bagScreen .panel').getBoundingClientRect();
  fxBurst(pr.left + pr.width / 2, pr.top + 100, {
    count: 18 + c.brilliant * 4, colors: ['#ffffff', '#ffe94a', '#c9b8ff'], star: true, speed: 260,
  });
  if (c.brilliant > 0) fxRing(pr.left + pr.width / 2, pr.top + 100, '#ffffff', 90);
  toast(`🪞 Polished ${c.total} gems: ${tallyText(c)}`);
  renderBag();
}

function summonDwarves() {
  const s = G.state;
  if (!s.spells.dwarves || s.spells.dwarves <= 0) return;
  if (!Object.keys(s.raw).length) { toast('⛏️ The dwarves peer into your empty bag and shrug.'); return; }
  s.spells.dwarves--;
  sndDwarves();
  achEvent('dwarves');
  const c = polishBatch(1.5); // master craftsdwarves: a nice big bonus
  const pr = document.querySelector('#bagScreen .panel').getBoundingClientRect();
  fxBurst(pr.left + pr.width / 2, pr.top + 120, { count: 10, emoji: ['🧔', '⛏️', '🔨'], speed: 220, size: 24, life: 1.6, g: 250 });
  fxConfetti(pr.left + pr.width / 2, pr.top + 120, 40);
  toast(`⛏️ Hi-ho! The dwarf crew polished ${c.total} gems: ${tallyText(c)}`);
  renderBag();
}

// ---------- spellbook / crafting ----------

function countPolished(mineralId) {
  const p = G.state.polished[mineralId];
  return p ? (p.rough + p.fine + p.brilliant) : 0;
}

function requireCamp(what) {
  if (homeBase()) return true;
  toast(`🌧️ Too dangerous out here! Return to Drizzlewick to ${what}.`);
  return false;
}

// ---------- the homecoming festival ----------

// the Mayor leads the whole village in a cheer when you return from the gloom
function villageCelebration() {
  sndCheer();
  for (let i = 0; i < 6; i++) { // fireworks over the square
    setTimeout(() => {
      const x = 60 + Math.random() * (window.innerWidth - 120);
      const y = 80 + Math.random() * (window.innerHeight * 0.45);
      fxConfetti(x, y, 36);
      fxRing(x, y, RAINBOW[i % 6], 70);
    }, i * 420);
  }
  document.getElementById('dEmoji').textContent = NPCS.mayor.emoji;
  document.getElementById('dName').textContent = NPCS.mayor.name;
  document.getElementById('dText').innerHTML =
    `The whole village is packed into the square — Pip is up on Barnaby's shoulders, Grandma is crying into her shawl,
     and Foreman Flint is pretending very hard that he isn't.<br><br>
     <b>"THREE CHEERS FOR THE HERO OF RAINYDAY!"</b><br><br>
     "You walked into the dark that ate a hundred years of mornings… and you carried the SUN home on your back.
     Drizzlewick will bake about this, sing about this, and absolutely exaggerate about this for generations. HIP HIP—"`;
  const acts = document.getElementById('dActs');
  acts.innerHTML = '';
  const btn = document.createElement('button');
  btn.className = 'bigBtn';
  btn.textContent = '🎉 HOORAY!';
  btn.onclick = () => {
    closeScreen('dialogScreen');
    sndCheer();
    for (let i = 0; i < 4; i++) {
      setTimeout(() => fxConfetti(100 + Math.random() * (window.innerWidth - 200), 120 + Math.random() * 220, 40), i * 250);
    }
    toast('🌞 Drizzlewick will never forget this day. (⚙️ Menu → Play Again whenever you like!)');
  };
  acts.appendChild(btn);
  const again = document.createElement('button');
  again.className = 'bigBtn';
  again.style.background = 'linear-gradient(90deg, #39c26d, #4fd8e0)';
  again.textContent = '🌈 Play Again';
  again.onclick = () => { sndClick(); resetSave(); }; // fresh hero — nothing to lose, you won!
  acts.appendChild(again);
  openScreen('dialogScreen');
}

// ---------- boss intro cinematic ----------

let BI_TIMER = null;

function showBossIntro(type) {
  const intro = BOSS_INTROS[type];
  if (!intro) return;
  const def = MONSTERS[type];
  const el = document.getElementById('bossIntro');
  const key = MONSTER_SPRITE[type];
  const url = key && hasSprite(key) ? spriteDataURL(key) : null;
  const img = document.getElementById('biSprite');
  if (url) { img.src = url; img.style.display = 'block'; } else { img.style.display = 'none'; }
  const tag = intro.tag || 'BOSS';
  document.getElementById('biTag').textContent = `— ⚔ ${tag} ⚔ —`;
  const nameEl = document.getElementById('biName');
  nameEl.textContent = def.name;
  nameEl.style.color = intro.color;
  document.getElementById('biQuote').textContent = intro.quote;
  el.classList.remove('show');
  void el.offsetWidth; // restart the animations
  el.classList.add('show');
  sndBossIntro(type);
  clearTimeout(BI_TIMER);
  const dismiss = () => { el.classList.remove('show'); el.onclick = null; clearTimeout(BI_TIMER); };
  BI_TIMER = setTimeout(dismiss, 3800);
  el.onclick = dismiss;
}

// ---------- villagers ----------

// Grandma's whisper about the shattered Prismblade
function facetHint(s) {
  const missing = ZONE_IDS.filter(z => !s.facetsFound[z]);
  if (!missing.length) return '<br><br>✨ You found every shard of the old <b>Prismblade</b>! The Glassworks kiln by the camp can fuse them, dearie.';
  return `<br><br>✨ Old tale: the <b>Prismblade</b> shattered into four facets, one lost in each land. Watch for a <b>tiny glint</b> in the grass — the ${missing.map(z => ZONES[z].dir).join(', ')} still hide${missing.length === 1 ? 's' : ''} theirs. The <b>Glassworks</b> kiln can fuse any two or more.`;
}

function npcHasNews(id) {
  const s = G.state;
  if (!s) return false;
  if (id === 'mayor') return s.mainQuest === 0 || s.mainQuest === 2;
  if (id === 'grandma') return !s.npcFlags.grandma;
  if (id === 'foreman') return !s.npcFlags.foreman;
  const sq = s.sideQuests || {};
  if (id === 'pip') return !sq.pip || sq.pip.stage === 0 || (sq.pip.stage === 1 && sq.pip.n >= 5);
  if (id === 'baker') return !sq.baker || sq.baker.stage === 0 || (sq.baker.stage === 1 && gemStock('sunstone') >= 4);
  if (id === 'willow') return !sq.willow || sq.willow.stage === 0 || (sq.willow.stage === 1 && gemStock('roseopal') >= 2);
  return false;
}

function npcDialog(id) {
  const s = G.state;
  const q = s.mainQuest;
  if (id === 'mayor') {
    if (q === 0) return {
      text: `Ah, a hero at last! Welcome to <b>Drizzlewick</b> — the last sunny speck in all of Rainyday.<br><br>
        A gate leads out of the village in each direction, and each way lies a land held by a <b>gloom champion</b>:
        <b>South</b> to Bogmire's damp toad, <b>East</b> to the Thunderfen's serpent, <b>West</b> to the Moldwood's creeping rot,
        and <b>North</b> to the haunted heights. Strike each champion down and the sun returns to that land!`,
      action: { label: "⚔️ I'll bring back the light!", fn: () => setQuest(1) },
    };
    if (q === 1) {
      const done = ZONE_IDS.filter(z => s.zonesCleared[z]).length;
      const left = ZONE_IDS.filter(z => !s.zonesCleared[z]).map(z => `${ZONES[z].dir} (${ZONES[z].name})`).join(', ');
      return { text: `${done}/4 lands shine again. Still under the storm: <b>${left}</b>. Take the matching gate out of the village — the signposts point the way. Start with the South if you're fresh; it's the gentlest.` };
    }
    if (q === 2) return {
      text: `You DID it! The whole land glitters — but do you feel that drizzle? The <b>RAINYCASTLE</b> has risen
        in the rainclouds, and <i>something up there</i> is brewing the storm all over again. Nobody knows what. Nobody's ever come back to say.<br><br>
        There's only one road up: a rainbow. I've unsealed the old <b>Cloudgate</b> in the plaza. Ride well, hero.`,
      action: { label: '🌈 Open the Cloudgate!', fn: () => setQuest(3) },
    };
    if (q === 3) return { text: 'The <b>Cloudgate</b> 🌈 glows in the plaza, east of the fountain. Step onto it, cast your rainbow, and ride!' };
    if (q === 4) return { text: 'Climb the castle floor by floor — its guardians seal every stair. Whatever waits at the top, sun spells burn brightest up there, they say.' };
    if (q === 5 || q === 6) return { text: 'So the serpent was only the doorman… something <i>older than weather</i> waits beyond that portal, and the portal only opens ONE way. Craft every spell you can carry before you step through, hero. Drizzlewick believes in you.' };
    return { text: '🌞 The HERO OF RAINYDAY stands before me! Statues shall be raised. Pies shall be baked. Welcome home.' };
  }
  if (id === 'grandma') {
    if (!s.npcFlags.grandma) {
      s.npcFlags.grandma = true;
      s.raw.quartz = (s.raw.quartz || 0) + 4;
      save();
      toast('🎁 Grandma Nimbus gave you 4 raw Quartz!');
      return { text: `Oh, sweetheart, you'll catch your death out there. Here — some quartz from my rock garden, for practice.<br><br>
        Mind the rain: the gloom-things <b>cannot step into sunshine</b>. If they gang up on you, run for the light.` };
    }
    if (q <= 1) return { text: 'The champions? Nasty things. The toad spits poison, the serpent strikes twice, the mold <i>regrows</i>, and the umbrella… whispers. Bring healing blooms, dearie.' + facetHint(s) + achHintLine() };
    if (q <= 4) return { text: 'Whatever rules that castle fears pure sunlight — Sunflare, Rainbow Beam, Stardust. My knees ache just thinking about that climb.' + facetHint(s) + achHintLine() };
    if (q <= 6) return { text: "Beyond the portal there are <b>no gems to mine, no way home</b> until it's done. Pack every spell charge you can, dearie, and come back to me in one piece." + achHintLine() };
    return { text: 'Sunshine on my rocking chair at last. You wonderful child.' + achHintLine() };
  }
  if (id === 'pip') {
    const qp = s.sideQuests.pip;
    if (qp.stage === 0) return {
      text: `*sniff* Mister hero? My frog <b>Sir Croaksworth</b> hopped off toward the <b>South swamp</b> and he's too scared
        to come home with all those monsters croaking around…<br><br>Could you scare off <b>five</b> of them? Please?`,
      action: { label: '🐸 I\'ll clear the way home!', fn: () => { qp.stage = 1; save(); toast('📖 Favor accepted: scare off 5 monsters in Bogmire (South).'); } },
    };
    if (qp.stage === 1 && qp.n < 5) return { text: `You scared off <b>${qp.n}/5</b> so far! Sir Croaksworth says ribbit. That means hurry.` };
    if (qp.stage === 1) return {
      text: '<b>HE CAME HOME!</b> Sir Croaksworth hopped right onto my head! You\'re the best hero EVER. Here — I found these in a puddle. And this shiny thing!',
      action: { label: '🎁 Aww. Take the reward', fn: () => {
        qp.stage = 2;
        s.raw.quartz = (s.raw.quartz || 0) + 3;
        addItemToInventory(rollItem(3, 'magic'));
        save(); sndCoin();
        toast('🎁 Pip\'s favor complete: +3 Quartz and a shiny trinket!');
        checkGoodNeighbor();
      } },
    };
    return { text: 'Sir Croaksworth and me are gonna be knights when we grow up. Like YOU!' };
  }
  if (id === 'baker') {
    const qb = s.sideQuests.baker;
    if (qb.stage === 0) return {
      text: `A customer! Oh — no, no bread today, friend. The rain got into my ovens and the sourdough has gone <i>gloomy</i>.
        Four <b>Sunstones</b> would warm them right up. Raw, polished — the oven isn't picky.`,
      action: { label: '🍞 I\'ll fetch the Sunstone', fn: () => { qb.stage = 1; save(); toast('📖 Favor accepted: bring Barnaby 4 Sunstone.'); } },
    };
    if (qb.stage === 1 && gemStock('sunstone') < 4) return { text: `Any luck? You've got ${gemStock('sunstone')}/4 Sunstone. The Thunderfen (East) practically glows with them.` };
    if (qb.stage === 1) return {
      text: 'FOUR SUNSTONES! Feel that? The ovens are singing already. First batch of <b>Sunshine Buns</b> is yours — eat up, they stick to your ribs forever.',
      action: { label: '🥐 Trade 4 Sunstone for buns', fn: () => {
        consumeGems('sunstone', 4);
        qb.stage = 2;
        s.questBonuses.hpMax = (s.questBonuses.hpMax || 0) + 10;
        calcStats();
        save(); sndHeal();
        toast('🥐 Sunshine Buns! +10 max HP for the rest of this run.');
        checkGoodNeighbor();
        renderHUD();
      } },
    };
    return { text: 'Smell that? THAT is what sunshine tastes like. Come back any time, friend.' };
  }
  if (id === 'willow') {
    const qw = s.sideQuests.willow;
    if (qw.stage === 0) return {
      text: `Careful of the flowerbeds, love. My <b>rainbow tulips</b> refuse to bloom — a hundred years of drizzle will do that.
        They just need a dusting of <b>Rose Opal</b>. Two would do it. The far south-east lands grow them… so I'm told.`,
      action: { label: '🌷 I\'ll find the Rose Opal', fn: () => { qw.stage = 1; save(); toast('📖 Favor accepted: bring Willow 2 Rose Opal.'); } },
    };
    if (qw.stage === 1 && gemStock('roseopal') < 2) return { text: `The tulips are holding their breath. ${gemStock('roseopal')}/2 Rose Opal so far.` };
    if (qw.stage === 1) return {
      text: 'Oh, they\'re PERFECT. *dusts the beds* …Look at that. First bloom in a century. Sit with me a moment, hero — gardeners know a thing or two worth teaching.',
      action: { label: '🌷 Trade 2 Rose Opal for wisdom', fn: () => {
        consumeGems('roseopal', 2);
        qw.stage = 2;
        s.skillPoints++;
        save(); sndLevel();
        toast('🌷 The tulips bloom! Willow\'s wisdom: +1 skill point.');
        checkGoodNeighbor();
        renderHUD();
      } },
    };
    return { text: 'The tulips turn to follow you when you walk past. They remember.' };
  }
  // foreman
  if (!s.npcFlags.foreman) {
    s.npcFlags.foreman = true;
    s.spells.dwarves = (s.spells.dwarves || 0) + 1;
    save();
    toast('🎁 Foreman Flint taught you Summon Dwarves! (+1 charge)');
    return { text: `Flint's the name — stone, gems, and honest work. The crew owes me a favor, so here: one <b>dwarf crew summons</b>, on the house.
      They'll polish your whole bag, and they don't do sloppy work.<br><br>Build up that <b>Polishing Factory</b> and even your own hands get luckier.` };
  }
  return { text: 'Upgrade the camp, hero — Kitchen for your health, Stalls for your unicorn, Walls for your hide. Raw minerals pay the bills.' };
}

function checkGoodNeighbor() {
  const q = G.state.sideQuests;
  if (q && q.pip.stage >= 2 && q.baker.stage >= 2 && q.willow.stage >= 2) achEvent('neighbor');
}

// Gloom Pact — offer three random blessing/curse pacts on a zone dive
function offerPact(zoneId) {
  const pool = [...PACTS].sort(() => Math.random() - 0.5).slice(0, 3);
  const list = document.getElementById('pactList');
  list.innerHTML = '';
  document.getElementById('pactSub').textContent =
    `You step into ${ZONES[zoneId].name}. The gloom offers a bargain — choose a pact, or refuse it.`;
  for (const p of pool) {
    const card = document.createElement('button');
    card.className = 'pactCard';
    const blessTxt = Object.entries(p.bless).map(([k, v]) => STAT_LABELS[k] + ' ' + fmtStat(k, v)).join(', ');
    const curseTxt = Object.entries(p.curse).map(([k, v]) => STAT_LABELS[k] + ' ' + fmtStat(k, v)).join(', ');
    card.innerHTML = `
      <div class="pactName">${p.icon} ${p.name}</div>
      <div class="pactBless">✦ ${blessTxt}</div>
      <div class="pactCurse">☠ ${curseTxt}</div>`;
    card.onclick = () => choosePact(p);
    list.appendChild(card);
  }
  openScreen('pactScreen');
}

function choosePact(p) {
  const s = G.state;
  s.activePact = { name: p.name, icon: p.icon, bless: p.bless, curse: p.curse };
  calcStats();
  s.hp = Math.min(s.hp, s.hpMax);
  sndPact();
  save();
  closeScreen('pactScreen');
  toast(`${p.icon} Pact sealed: ${p.name}. ${p.desc}`);
  renderHUD();
}

function declinePact() {
  G.state.activePact = null;
  calcStats();
  save();
  closeScreen('pactScreen');
  toast('🚫 You refuse the gloom\'s bargain. No blessing, no curse.');
  renderHUD();
}

// rogue-like game over — the run is done, offer a fresh hero
function showGameOver(summary) {
  closeAllScreens();
  const b = summary.best;
  document.getElementById('goStats').innerHTML = `
    <div class="goRun">This hero: <b>Level ${summary.level}</b> · ${summary.zones}/4 lands freed · ${summary.kills} kills</div>
    <div class="goMotes">✦ Earned <b>${summary.earned}</b> Motes — ${b.motes} banked</div>
    <div class="goBest">Best ever: Level ${b.bestLevel || 0} · ${b.bestZones || 0}/4 lands · run #${b.runs || 1}</div>`;
  openScreen('gameOverScreen');
}

function openNpc(id) {
  const npc = NPCS[id];
  const d = npcDialog(id);
  document.getElementById('dEmoji').innerHTML = actorHTML(NPC_SPRITE[id], npc.emoji, 60);
  document.getElementById('dName').textContent = npc.name;
  document.getElementById('dText').innerHTML = d.text;
  const acts = document.getElementById('dActs');
  acts.innerHTML = '';
  if (d.action) {
    const btn = document.createElement('button');
    btn.className = 'bigBtn';
    btn.textContent = d.action.label;
    btn.onclick = () => { closeScreen('dialogScreen'); d.action.fn(); };
    acts.appendChild(btn);
  }
  const close = document.createElement('button');
  close.className = 'closeBtn plain';
  close.textContent = d.action ? 'Maybe later' : 'Farewell!';
  close.onclick = () => closeScreen('dialogScreen');
  acts.appendChild(close);
  openScreen('dialogScreen');
}

function openSpells() {
  if (!requireCamp('craft spells')) return;
  switchPanel('spellScreen', renderSpells);
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
  sndCraft();
  save();
  const pr = document.querySelector('#spellScreen .panel').getBoundingClientRect();
  fxBurst(pr.left + pr.width / 2, pr.top + 80, { count: 22, colors: RAINBOW, star: true, speed: 240 });
  toast(`${sp.emoji} Crafted ${sp.name}! +${charges} charges${bonus > 0 ? ' (quality bonus!)' : ''}`);
  renderSpells();
}

// ---------- skill tree ----------

function openSkills() {
  if (!requireCamp('train your powers')) return;
  switchPanel('skillScreen', renderSkills);
}

// ---------- camp / base building ----------

function openBase() { switchPanel('baseScreen', renderBase); }

function renderBase() {
  const s = G.state;
  const here = atBase();
  document.getElementById('baseSub').textContent = here
    ? 'Your sunny sanctuary. Build with gems — raw or polished — to grow your power.'
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
        const have = gemStock(m); // raw + polished both count
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

// total gems of a mineral available to spend on buildings (raw + polished)
function gemStock(m) {
  return (G.state.raw[m] || 0) + countPolished(m);
}

// consume n gems of a mineral: raw first, then polished cheapest-quality first
function consumeGems(m, n) {
  const s = G.state;
  const fromRaw = Math.min(n, s.raw[m] || 0);
  if (fromRaw > 0) {
    s.raw[m] -= fromRaw;
    if (s.raw[m] <= 0) delete s.raw[m];
    n -= fromRaw;
  }
  if (n > 0 && s.polished[m]) {
    for (const q of ['rough', 'fine', 'brilliant']) {
      const take = Math.min(n, s.polished[m][q] || 0);
      s.polished[m][q] -= take;
      n -= take;
      if (n <= 0) break;
    }
  }
}

// ---------- the Glassworks (prism forge) ----------

function openForge() {
  renderForge();
  openScreen('forgeScreen');
}

function renderForge() {
  const s = G.state;
  document.getElementById('forgeDots').innerHTML = ZONE_IDS.map(z => {
    const f = FACETS[z];
    const found = s.facetsFound[z];
    return `<div class="facetDot ${found ? 'found' : ''}" style="--fc:${f.color}">
      <span class="fdGem">◆</span><span class="fdName">${f.name}</span><span class="fdZone">${found ? '✓ found' : ZONES[z].dir + ' — a glint in the grass'}</span></div>`;
  }).join('');
  const power = countFacetPower(), loose = looseFacetCount();
  const tiers = [2, 3, 4].map(n =>
    `<div class="forgeTier ${power >= n ? 'ok' : ''}">${n === 4 ? '🌈' : '✨'} <b>${PRISM_TIERS[n].name}</b> <small>(${n} facets)</small></div>`).join('');
  document.getElementById('forgeInfo').innerHTML =
    `<div class="forgePower">Facet power held: <b>${power}/4</b></div>${tiers}
     <p class="sub" style="text-align:left">Fusing melts down everything prismatic you carry — including an earlier prism weapon — so finding another facet always lets you reforge stronger. Socketed gems are returned.</p>`;
  const acts = document.getElementById('forgeActs');
  acts.innerHTML = '';
  const btn = document.createElement('button');
  btn.className = 'bigBtn';
  const can = power >= 2 && loose >= 1;
  btn.textContent = can ? `🔥 Fuse into the ${PRISM_TIERS[Math.min(4, power)].name}`
    : power >= 2 ? 'Nothing new to fuse — find more facets' : 'Bring at least two Prism Facets';
  btn.disabled = !can;
  btn.onclick = forgePrism;
  acts.appendChild(btn);
}

function forgePrism() {
  const s = G.state;
  const power = countFacetPower();
  if (power < 2 || looseFacetCount() < 1) return;
  // melt down every prismatic item held (loose facets + any earlier prism weapon)
  const taken = [];
  s.inventory = s.inventory.filter(it => {
    if (it.facet || it.facets) { taken.push(it); return false; }
    return true;
  });
  for (const slot of Object.keys(s.equip)) {
    const it = s.equip[slot];
    if (it && (it.facet || it.facets)) { taken.push(it); s.equip[slot] = null; }
  }
  for (const it of taken) {
    for (const g of it.gems || []) { // return socketed gems
      if (!s.polished[g.mineral]) s.polished[g.mineral] = { rough: 0, fine: 0, brilliant: 0 };
      s.polished[g.mineral][g.quality]++;
    }
  }
  const weapon = makePrismWeapon(power);
  if (!s.equip.weapon) s.equip.weapon = weapon; // the slot was just vacated — wield it
  else s.inventory.push(weapon);
  calcStats();
  save();
  sndForge(power);
  achEvent('forge', { power });
  const pr = document.querySelector('#forgeScreen .panel').getBoundingClientRect();
  fxConfetti(pr.left + pr.width / 2, pr.top + 120, power >= 4 ? 80 : 40);
  toast(power >= 4 ? '🌈⚔️ THE PRISMBLADE IS WHOLE. Go blast everything.'
    : `⚔️ Forged the ${weapon.name}! Another facet would make it stronger — the kiln can always reforge.`);
  renderForge();
  renderHUD();
}

function upgradeBuilding(id) {
  const s = G.state, b = BUILDINGS[id];
  const lvl = s.base[id] || 0;
  if (!atBase() || lvl >= b.max) return;
  if (b.requires && (s.base[b.requires[0]] || 0) < b.requires[1]) return;
  const cost = b.costs[lvl];
  if (!cost) return;
  for (const [m, n] of Object.entries(cost)) if (gemStock(m) < n) return;
  for (const [m, n] of Object.entries(cost)) consumeGems(m, n);
  s.base[id] = lvl + 1;
  if (id === 'walls') achEvent('walls');
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
  const owned = Object.keys(s.skills).length;
  const total = cls.tree.reduce((a, br) => a + br.nodes.length, 0);
  document.getElementById('spLeft').innerHTML =
    `${cls.emoji} ${cls.name} — <b>${s.skillPoints}</b> point${s.skillPoints === 1 ? '' : 's'} to spend · learned ${owned}/${total}` +
    `<br><small>Level cap ${LEVEL_CAP} — you can't learn everything. Choose your build (you'll only reach 2 of the 3 capstones).</small>`;
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
  sndBrilliant();
  save();
  const node = branch.nodes[tier];
  toast(`${node.icon} Learned ${node.name}!`);
  renderSkills();
  renderHUD();
}

// ---------- bindings ----------

function bindUI() {
  const muteBtn = document.getElementById('btnMute');
  muteBtn.textContent = SND.muted ? '🔇' : '🔊';
  muteBtn.onclick = () => { sndUnlock(); muteBtn.textContent = sndToggleMute() ? '🔇' : '🔊'; };
  // tapping a HUD icon opens its panel; tapping the SAME icon again closes it
  document.getElementById('btnQuest').onclick = () => togglePanel('questScreen', openQuest);
  document.getElementById('btnBase').onclick = () => togglePanel('baseScreen', openBase);
  document.getElementById('btnChar').onclick = () => togglePanel('charScreen', openChar);
  document.getElementById('btnBag').onclick = () => togglePanel('bagScreen', openBag);
  document.getElementById('btnSpells').onclick = () => togglePanel('spellScreen', openSpells);
  document.getElementById('btnSkills').onclick = () => togglePanel('skillScreen', openSkills);
  document.getElementById('btnMenu').onclick = () => togglePanel('menuScreen', () => {
    // reflect a won game: friendly "Play Again" instead of a scary "New Game"
    const won = G.state && G.state.sunRestored;
    const ng = document.getElementById('btnNewGame');
    ng.textContent = won ? '🌈 Play Again' : '🔄 New Game';
    ng.classList.toggle('danger', !won);
    switchPanel('menuScreen', () => {});
  });
  const diffBtn = document.getElementById('btnDifficulty');
  const refreshDiff = () => {
    const key = (G.settings && G.settings.difficulty) || 'normal';
    diffBtn.textContent = DIFFICULTIES[key].name;
    diffBtn.classList.toggle('on', key !== 'normal');
    document.getElementById('difficultyBlurb').textContent = DIFFICULTIES[key].blurb + ' (applies to your next hero)';
  };
  diffBtn.onclick = () => {
    const i = DIFFICULTY_ORDER.indexOf((G.settings && G.settings.difficulty) || 'normal');
    G.settings.difficulty = DIFFICULTY_ORDER[(i + 1) % DIFFICULTY_ORDER.length];
    saveSettings(); refreshDiff(); sndClick();
  };
  refreshDiff();
  const asBtn = document.getElementById('btnAutoSalvage');
  const refreshAS = () => { asBtn.textContent = AUTO_SALVAGE_LABELS[(G.settings && G.settings.autoSalvage) || 0]; asBtn.classList.toggle('on', ((G.settings && G.settings.autoSalvage) || 0) > 0); };
  asBtn.onclick = () => {
    G.settings.autoSalvage = ((G.settings.autoSalvage || 0) + 1) % AUTO_SALVAGE_LABELS.length;
    saveSettings(); refreshAS(); sndClick();
  };
  refreshAS();
  document.getElementById('btnNewGame').onclick = () => {
    // once you've won, starting over is a victory lap — no scary warning
    if (G.state && G.state.sunRestored) { resetSave(); return; }
    if (confirm('Start over? Your current hero will be lost.')) resetSave();
  };
  document.getElementById('btnDeclinePact').onclick = declinePact;
  document.getElementById('btnSanctuary').onclick = openMeta;
  document.getElementById('btnGoSanctuary').onclick = openMeta;
  document.getElementById('btnNewHero').onclick = () => {
    closeScreen('gameOverScreen');
    hudVisible(false);
    showClassScreen();
  };
  document.getElementById('btnWinClose').onclick = () => {
    closeScreen('winBanner');
    if (G.state && G.state.sunRestored && G.mapId === 'realm') {
      travelTo('village', VILLAGE_ENTRY.x, VILLAGE_ENTRY.y);
      setTimeout(villageCelebration, 600); // let the sunny village render, then the square erupts
    }
  };
  document.querySelectorAll('.closeBtn[data-close]').forEach(btn => {
    btn.onclick = () => closeScreen(btn.dataset.close);
  });
}
