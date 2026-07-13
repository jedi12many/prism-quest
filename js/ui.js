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
  const pact = s.activePact;
  let line = '📜 ' + questText();
  if (G.mapId === 'dungeon' && s.dungeon) {
    const dc = DUNGEONS[s.dungeon.type];
    line = `${dc.emoji} ${dc.name} — Floor ${s.dungeon.floor}/${s.dungeon.maxFloor}`;
  }
  document.getElementById('questLine').innerHTML =
    line + (pact ? `<br><span class="pactChip">${pact.icon} Pact: ${pact.name}</span>` : '');
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
      <div class="classStats">❤️ ${cls.hp} &nbsp; ⚔️ ${cls.atk} &nbsp; 🔮 ${cls.mag} &nbsp; 🛡️ ${cls.def}</div>
      <div class="classDiff">${cls.difficulty || ''}</div>`;
    card.onclick = () => { closeScreen('classScreen'); newGameWithClass(id); };
    wrap.appendChild(card);
  }
  const meta = loadMeta();
  const banner = document.getElementById('sanctuaryBanner');
  banner.innerHTML = `✦ <b>${meta.motes}</b> Motes` + (meta.runs ? ` · run #${(meta.runs || 0) + 1}` : '');
  document.getElementById('hud').style.display = 'none';
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

function openChar() {
  renderChar();
  openScreen('charScreen');
}

function critPct() { return Math.round((0.05 + eff('crit')) * 100); }
function dodgePct() { return Math.round(Math.min(0.6, eff('dodge')) * 100); }

function renderChar() {
  const s = G.state;
  // equipment doll
  const doll = document.getElementById('charDoll');
  doll.innerHTML = '';
  for (const [slot, sd] of Object.entries(SLOTS)) {
    const it = s.equip[slot];
    const cell = document.createElement('button');
    cell.className = 'slotCell' + (it ? ' filled' : '');
    if (it) cell.style.borderColor = RARITIES[it.rarity].color;
    cell.innerHTML = it
      ? `<span class="slotEmoji">${sd.emoji}</span><span class="slotItemName" style="color:${RARITIES[it.rarity].color}">${it.name}</span>${it.sockets ? `<span class="slotSockets">${'◈'.repeat(it.gems.length)}${'◇'.repeat(it.sockets - it.gems.length)}</span>` : ''}`
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
    <div class="icSub">${RARITIES[item.rarity].name} ${SLOTS[item.slot].name}${item.setId ? ` · ${PRISM_SET.name}` : ''}</div>
    ${item.lore ? `<div class="icLore">"${item.lore}"</div>` : ''}
    <div class="icStats">${itemStatLines(item)}</div>
    ${item.sockets ? `<div class="icSockets">Sockets: ${'◈'.repeat(item.gems.length)}${'◇'.repeat(emptySockets)}</div>` : ''}
    ${compareItem ? `<div class="icCompare">Currently equipped: <b style="color:${RARITIES[compareItem.rarity].color}">${compareItem.name}</b></div>` : ''}
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
  if (!equipped) mk('♻️ Salvage', 'sec', () => salvageItem(item));
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
  if (atBase()) return true;
  toast(`🌧️ Too dangerous out here! Return to Drizzlewick to ${what}.`);
  return false;
}

// ---------- villagers ----------

function npcHasNews(id) {
  const s = G.state;
  if (!s) return false;
  if (id === 'mayor') return s.mainQuest === 0 || s.mainQuest === 2;
  if (id === 'grandma') return !s.npcFlags.grandma;
  if (id === 'foreman') return !s.npcFlags.foreman;
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
        in the rainclouds, and the Rainwyrm means to soak us all over again.<br><br>
        There's only one road up: a rainbow. I've unsealed the old <b>Cloudgate</b> in the plaza. Ride well, hero.`,
      action: { label: '🌈 Open the Cloudgate!', fn: () => setQuest(3) },
    };
    if (q === 3) return { text: 'The <b>Cloudgate</b> 🌈 glows in the plaza, east of the fountain. Step onto it, cast your rainbow, and ride!' };
    if (q === 4) return { text: 'The Rainwyrm coils atop the Rainycastle. Sun spells burn brightest up there, they say.' };
    if (q === 5 || q === 6) return { text: "So the wyrm was only the doorman… <b>Sog'naroth</b> waits beyond that portal, and the portal only opens ONE way. Craft every spell you can carry before you step through, hero. Drizzlewick believes in you." };
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
    if (q <= 1) return { text: 'The champions? Nasty things. The toad spits poison, the serpent strikes twice, the mold <i>regrows</i>, and the umbrella… whispers. Bring healing blooms, dearie.' };
    if (q <= 4) return { text: 'The Rainwyrm hates sunlight — Sunflare, Rainbow Beam, Stardust. My knees ache just thinking about that climb.' };
    if (q <= 6) return { text: "Beyond the portal there are <b>no gems to mine, no way home</b> until it's done. Pack every spell charge you can, dearie, and come back to me in one piece." };
    return { text: 'Sunshine on my rocking chair at last. You wonderful child.' };
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
  document.getElementById('btnBase').onclick = openBase;
  document.getElementById('btnChar').onclick = openChar;
  document.getElementById('btnBag').onclick = openBag;
  document.getElementById('btnSpells').onclick = openSpells;
  document.getElementById('btnSkills').onclick = openSkills;
  document.getElementById('btnMenu').onclick = () => openScreen('menuScreen');
  document.getElementById('btnNewGame').onclick = () => {
    if (confirm('Start over? Your current hero will be lost.')) resetSave();
  };
  document.getElementById('btnDeclinePact').onclick = declinePact;
  document.getElementById('btnSanctuary').onclick = openMeta;
  document.getElementById('btnGoSanctuary').onclick = openMeta;
  document.getElementById('btnNewHero').onclick = () => {
    closeScreen('gameOverScreen');
    document.getElementById('hud').style.display = 'none';
    showClassScreen();
  };
  document.getElementById('btnWinClose').onclick = () => {
    closeScreen('winBanner');
    if (G.state && G.state.sunRestored && G.mapId === 'realm') {
      travelTo('village', VILLAGE_ENTRY.x, VILLAGE_ENTRY.y);
      toast('🌞 Drizzlewick throws you the biggest festival Rainyday has ever seen!');
    }
  };
  document.querySelectorAll('.closeBtn[data-close]').forEach(btn => {
    btn.onclick = () => closeScreen(btn.dataset.close);
  });
}
