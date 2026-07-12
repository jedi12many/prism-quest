// Prism Quest — Diablo-style loot: random drops, affixes, sockets, legendaries, sets

const SLOTS = {
  weapon: { name: 'Weapon', emoji: '🗡️' },
  helm:   { name: 'Helm',   emoji: '🪖' },
  armor:  { name: 'Armor',  emoji: '🧥' },
  boots:  { name: 'Boots',  emoji: '👢' },
  charm:  { name: 'Charm',  emoji: '📿' },
};

const RARITIES = {
  common:    { name: 'Common',    color: '#cfcfda', w: 55 },
  magic:     { name: 'Magic',     color: '#6fa8ff', w: 27 },
  rare:      { name: 'Rare',      color: '#ffd24a', w: 14 },
  legendary: { name: 'Legendary', color: '#ff8a3c', w: 3 },
  set:       { name: 'Set',       color: '#39c26d', w: 1 },
};

// implicit base stat per slot
const SLOT_BASES = {
  weapon: { names: ['Wand', 'Rod', 'Staff'],        stat: 'atkFlat', min: 1, max: 4 },
  helm:   { names: ['Cap', 'Hood', 'Circlet'],      stat: 'magFlat', min: 1, max: 3 },
  armor:  { names: ['Cloak', 'Robe', 'Raincoat'],   stat: 'defFlat', min: 1, max: 3 },
  boots:  { names: ['Boots', 'Striders', 'Galoshes'], stat: 'dodge', min: 0.02, max: 0.05 },
  charm:  { names: ['Charm', 'Amulet', 'Locket'],   stat: 'hpMax',   min: 6, max: 14 },
};

const AFFIXES = [
  { pre: 'Sharp',     suf: 'of Fangs',      key: 'atkFlat',      min: 1,    max: 4 },
  { pre: 'Arcane',    suf: 'of Stars',      key: 'magFlat',      min: 1,    max: 4 },
  { pre: 'Sturdy',    suf: 'of Stone',      key: 'defFlat',      min: 1,    max: 3 },
  { pre: 'Vital',     suf: 'of the Bear',   key: 'hpMax',        min: 8,    max: 24 },
  { pre: 'Brutal',    suf: 'of Bonking',    key: 'basicDmg',     min: 0.06, max: 0.18 },
  { pre: 'Radiant',   suf: 'of Rainbows',   key: 'spellDmg',     min: 0.06, max: 0.18 },
  { pre: 'Keen',      suf: 'of the Fox',    key: 'crit',         min: 0.03, max: 0.08 },
  { pre: 'Nimble',    suf: 'of Puddles',    key: 'dodge',        min: 0.03, max: 0.08 },
  { pre: 'Blessed',   suf: 'of Blooms',     key: 'healPower',    min: 0.10, max: 0.25 },
  { pre: 'Gleaming',  suf: 'of the Herd',   key: 'unicornPower', min: 0.10, max: 0.30 },
  { pre: 'Scholarly', suf: 'of Tales',      key: 'xpGain',       min: 0.05, max: 0.15 },
  { pre: 'Lucky',     suf: 'of Clover',     key: 'rareLuck',     min: 0.05, max: 0.12 },
];

// what a polished gem grants when faceted into a socket [rough, fine, brilliant]
const GEM_SOCKET_STATS = {
  quartz:     { key: 'hpMax',        vals: [6, 10, 16] },
  amethyst:   { key: 'magFlat',      vals: [1, 2, 3] },
  sunstone:   { key: 'atkFlat',      vals: [1, 2, 3] },
  aquamarine: { key: 'defFlat',      vals: [1, 2, 3] },
  emerald:    { key: 'regen',        vals: [1, 2, 3] },
  roseopal:   { key: 'unicornPower', vals: [0.1, 0.2, 0.3] },
  prismatite: { key: 'spellDmg',     vals: [0.08, 0.12, 0.18] },
};
const QUALITY_INDEX = { rough: 0, fine: 1, brilliant: 2 };

const LEGENDARIES = [
  { slot: 'weapon', name: 'Sunsplitter',            affixes: { atkFlat: [3, 6], spellDmg: [0.15, 0.25] }, sockets: 2,
    lore: 'Forged from a sunbeam that refused to give up.' },
  { slot: 'helm',   name: 'Gloomveil Crown',        affixes: { magFlat: [2, 5], chargeSave: [0.1, 0.2] }, sockets: 1,
    lore: 'Worn by the last king who ever saw the sun.' },
  { slot: 'armor',  name: 'The Drizzleproof Coat',  affixes: { defFlat: [3, 5], regen: [2, 4] }, sockets: 1,
    lore: 'Not a single drop gets through.' },
  { slot: 'boots',  name: 'Puddlejumper Boots',     affixes: { dodge: [0.08, 0.14], crit: [0.04, 0.08] }, sockets: 1,
    lore: 'Splish, splash, slash.' },
  { slot: 'charm',  name: "Grandma's Other Locket", affixes: { hpMax: [15, 30], healPower: [0.15, 0.3] }, sockets: 1,
    lore: 'She has so many.' },
];

// The Rainbow Raiment — wear 3 of 5 for the first bonus, all 5 for Double Rainbow
const SET_ITEMS = [
  { slot: 'weapon', name: 'Prism Blade' },
  { slot: 'helm',   name: 'Prism Crown' },
  { slot: 'armor',  name: 'Prism Mantle' },
  { slot: 'boots',  name: 'Prism Striders' },
  { slot: 'charm',  name: 'Prism Heart' },
];
const PRISM_SET = {
  name: 'Rainbow Raiment',
  b3: { spellDmg: 0.15, crit: 0.10 },
  b3Desc: '+15% spell damage, +10% crit',
  b5: { chargeSave: 0.30, spellDmg: 0.25, unicornPower: 0.25 },
  b5Desc: 'DOUBLE RAINBOW: 30% free casts, +25% spell damage, +25% unicorn power',
};

const FLAT_KEYS = ['atkFlat', 'magFlat', 'defFlat', 'hpMax', 'regen', 'charges', 'mineYield'];

const STAT_LABELS = {
  atkFlat: '⚔️ Attack', magFlat: '🔮 Magic', defFlat: '🛡️ Defense', hpMax: '❤️ Max HP',
  basicDmg: '🔨 Bonk damage', spellDmg: '✨ Spell damage', crit: '💥 Crit chance',
  dodge: '🌀 Dodge chance', healPower: '🌸 Healing', unicornPower: '🦄 Unicorn power',
  xpGain: '⭐ XP gain', rareLuck: '🍀 Rare luck', regen: '🌿 Regen per turn',
  chargeSave: '⛓️ Free cast chance', charges: '➕ Craft charges', mineYield: '⛏️ Mining yield',
  polishZone: '🪞 Polish luck',
};

function fmtStat(key, val) {
  return FLAT_KEYS.includes(key) ? `+${val}` : `+${Math.round(val * 100)}%`;
}

function lootPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function lootUid() { return Math.random().toString(36).slice(2, 10); }

function rollStat(key, min, max, ilvl) {
  const q = Math.min(1, 0.35 + ilvl / 12);
  let v = min + (max - min) * Math.random() * q;
  return FLAT_KEYS.includes(key) ? Math.max(1, Math.round(v)) : Math.round(Math.max(min, v) * 100) / 100;
}

function rollRarity() {
  const total = Object.values(RARITIES).reduce((a, r) => a + r.w, 0);
  let roll = Math.random() * total;
  for (const [id, r] of Object.entries(RARITIES)) {
    roll -= r.w;
    if (roll <= 0) return id;
  }
  return 'common';
}

function rollItem(ilvl, forceRarity, forceSlot) {
  const rarity = forceRarity || rollRarity();
  if (rarity === 'legendary') {
    const def = lootPick(forceSlot ? LEGENDARIES.filter(l => l.slot === forceSlot) : LEGENDARIES);
    const affixes = {};
    for (const [k, [mn, mx]] of Object.entries(def.affixes)) affixes[k] = rollStat(k, mn, mx, Math.max(ilvl, 6));
    return { id: lootUid(), slot: def.slot, name: def.name, rarity, lore: def.lore,
             base: {}, affixes, sockets: def.sockets, gems: [], ilvl };
  }
  if (rarity === 'set') {
    const def = lootPick(forceSlot ? SET_ITEMS.filter(s => s.slot === forceSlot) : SET_ITEMS);
    const picks = [...AFFIXES].sort(() => Math.random() - 0.5).slice(0, 2);
    const affixes = {};
    for (const a of picks) affixes[a.key] = rollStat(a.key, (a.min + a.max) / 2, a.max, Math.max(ilvl, 6));
    return { id: lootUid(), slot: def.slot, name: def.name, rarity, setId: 'prism',
             base: {}, affixes, sockets: 1, gems: [], ilvl };
  }
  const slot = forceSlot || lootPick(Object.keys(SLOTS));
  const sb = SLOT_BASES[slot];
  const base = { [sb.stat]: rollStat(sb.stat, sb.min, sb.max, ilvl) };
  const baseName = lootPick(sb.names);
  const affixCount = rarity === 'common' ? 0 : rarity === 'magic' ? 1 : (Math.random() < 0.5 ? 3 : 2);
  const picks = [...AFFIXES].sort(() => Math.random() - 0.5).slice(0, affixCount);
  const affixes = {};
  for (const a of picks) affixes[a.key] = rollStat(a.key, a.min, a.max, ilvl);
  let name = baseName;
  if (rarity === 'magic') name = `${picks[0].pre} ${baseName}`;
  if (rarity === 'rare') name = `${picks[0].pre} ${baseName} ${picks[1].suf}`;
  const sockets = rarity === 'rare' ? 1 + (Math.random() < 0.4 ? 1 : 0)
    : (Math.random() < (rarity === 'magic' ? 0.35 : 0.2) ? 1 : 0);
  return { id: lootUid(), slot, name, rarity, base, affixes, sockets, gems: [], ilvl };
}

// combined stats an item grants (base + affixes + faceted gems)
function itemStats(item) {
  const out = {};
  const add = (k, v) => { out[k] = (out[k] || 0) + v; };
  for (const [k, v] of Object.entries(item.base || {})) add(k, v);
  for (const [k, v] of Object.entries(item.affixes || {})) add(k, v);
  for (const g of item.gems || []) {
    const gs = GEM_SOCKET_STATS[g.mineral];
    if (gs) add(gs.key, gs.vals[QUALITY_INDEX[g.quality]]);
  }
  return out;
}

function prismSetCount() {
  if (!G.state || !G.state.equip) return 0;
  return Object.values(G.state.equip).filter(it => it && it.setId === 'prism').length;
}

// what falls out of a defeated monster
function rollMonsterLoot(def) {
  const ilvl = Math.max(1, Math.min(10, Math.round(def.xp / 12)));
  if (def.finalBoss) return rollItem(10, Math.random() < 0.5 ? 'legendary' : 'set');
  if (def.dungeonBoss) return rollItem(10, Math.random() < 0.45 ? (Math.random() < 0.5 ? 'legendary' : 'set') : 'rare');
  if (def.miniboss !== undefined) {
    const r = Math.random();
    return rollItem(ilvl, r < 0.25 ? 'set' : r < 0.45 ? 'legendary' : 'rare');
  }
  if (def.boss) return rollItem(9, Math.random() < 0.5 ? 'legendary' : 'set'); // the Rainwyrm
  if (Math.random() < 0.25) return rollItem(ilvl);
  return null;
}

const INVENTORY_CAP = 24;

function addItemToInventory(item) {
  const s = G.state;
  if (s.inventory.length >= INVENTORY_CAP) {
    s.raw.quartz = (s.raw.quartz || 0) + 2;
    toast('🎒 Bag full! The item crumbled into 2 raw Quartz.');
    save();
    return false;
  }
  s.inventory.push(item);
  save();
  return true;
}
