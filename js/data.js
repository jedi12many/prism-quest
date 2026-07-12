// Prism Quest — game data: minerals, spells, classes, skill trees, monsters

const MINERALS = {
  quartz:     { name: 'Quartz',     color: '#e9edf5', glow: '#ffffff', tier: 1 },
  amethyst:   { name: 'Amethyst',   color: '#b06ee8', glow: '#d9b3ff', tier: 2 },
  sunstone:   { name: 'Sunstone',   color: '#f5a33c', glow: '#ffd28a', tier: 2 },
  aquamarine: { name: 'Aquamarine', color: '#4fd8e0', glow: '#b8f4f8', tier: 3 },
  emerald:    { name: 'Emerald',    color: '#39c26d', glow: '#a9f0c6', tier: 3 },
  roseopal:   { name: 'Rose Opal',  color: '#f77fb0', glow: '#ffd1e6', tier: 4 },
  prismatite: { name: 'Prismatite', color: '#c86bff', glow: '#ffffff', tier: 5, rainbow: true },
};

const QUALITIES = {
  rough:     { name: 'Rough',     mult: 0, icon: '◽' },
  fine:      { name: 'Fine',      mult: 1, icon: '🔹' },
  brilliant: { name: 'Brilliant', mult: 2, icon: '💠' },
};

// recipe: polished gems consumed per craft. base: charges gained (plus gem-quality bonus).
const SPELLS = {
  glitterbomb: {
    name: 'Glitter Bomb', emoji: '🎆', base: 4, power: 8,
    recipe: { quartz: 2 },
    desc: 'A fizzing burst of glitter. Cheap, cheerful, surprisingly painful.',
  },
  prismshield: {
    name: 'Prism Shield', emoji: '🛡️', base: 3, power: 0,
    recipe: { quartz: 1, amethyst: 1 },
    desc: 'A shimmering barrier that blocks most damage for 2 turns.',
  },
  sunflare: {
    name: 'Sunflare', emoji: '☀️', base: 3, power: 12,
    recipe: { sunstone: 2 },
    desc: 'Scorching light that also burns the target for 3 turns.',
  },
  tidepop: {
    name: 'Tide Pop', emoji: '🌊', base: 3, power: 12,
    recipe: { aquamarine: 2 },
    desc: 'A splashy blast that weakens the enemy\'s attacks for 3 turns.',
  },
  bloomheal: {
    name: 'Healing Bloom', emoji: '🌸', base: 3, power: 0,
    recipe: { emerald: 2 },
    desc: 'Flowers burst around you, restoring 40% of your health.',
  },
  butterflyswarm: {
    name: 'Butterfly Swarm', emoji: '🦋', base: 3, power: 6,
    recipe: { amethyst: 1, emerald: 1 },
    desc: 'Glittering butterflies nip and poison the enemy for 4 turns.',
  },
  dwarves: {
    name: 'Summon Dwarves', emoji: '⛏️', base: 2, power: 0, utility: true,
    recipe: { sunstone: 1, emerald: 1 },
    desc: 'A cheerful dwarf crew polishes your ENTIRE bag of raw minerals with a big bonus to Brilliant cuts. Cast from your Bag.',
  },
  rainbowbeam: {
    name: 'Rainbow Beam', emoji: '🌈', base: 3, power: 18,
    recipe: { quartz: 1, amethyst: 1, sunstone: 1 },
    desc: 'A full-spectrum blast of concentrated joy. Hits hard.',
  },
  unicorn: {
    name: 'Summon Unicorn', emoji: '🦄', base: 2, power: 8,
    recipe: { roseopal: 1, aquamarine: 1 },
    desc: 'A radiant unicorn fights beside you for 4 turns, attacking and healing.',
  },
  stardust: {
    name: 'Stardust Storm', emoji: '🌟', base: 2, power: 40,
    recipe: { prismatite: 1, quartz: 1 },
    desc: 'Calls down a storm of falling stars. Devastating.',
  },
};

const CLASSES = {
  mage: {
    name: 'Prism Mage', emoji: '🧙', hp: 34, atk: 4, mag: 7, def: 2, defGrow: 0.5,
    perk: { spellDmg: 0.2 },
    perkDesc: '+20% spell damage',
    blurb: 'A scholar of light. Spells hit harder, but robes are thin.',
    tree: [
      { branch: 'Radiance', color: '#ff6ec7', nodes: [
        { id: 'mg_r1', name: 'Focused Light',   icon: '🔆', desc: '+15% spell damage',  eff: { spellDmg: 0.15 } },
        { id: 'mg_r2', name: 'Prismatic Edge',  icon: '🔪', desc: '+12% crit chance',   eff: { crit: 0.12 } },
        { id: 'mg_r3', name: 'Supernova Heart', icon: '💥', desc: '+25% spell damage',  eff: { spellDmg: 0.25 } },
      ]},
      { branch: 'Flow', color: '#4fd8e0', nodes: [
        { id: 'mg_f1', name: 'Steady Hands', icon: '🤲', desc: 'Big boost to polish quality odds',      eff: { polishZone: 0.35 } },
        { id: 'mg_f2', name: 'Echo Casting', icon: '🔁', desc: '+1 charge every time you craft a spell', eff: { charges: 1 } },
        { id: 'mg_f3', name: 'Chain Light',  icon: '⛓️', desc: '25% chance casting is free',            eff: { chargeSave: 0.25 } },
      ]},
      { branch: 'Fortune', color: '#ffd24a', nodes: [
        { id: 'mg_o1', name: 'Gem Sense',    icon: '👁️', desc: '+1 mineral from every node',        eff: { mineYield: 1 } },
        { id: 'mg_o2', name: 'Scholar',      icon: '📖', desc: '+25% XP from battles',              eff: { xpGain: 0.25 } },
        { id: 'mg_o3', name: 'Rainbow Luck', icon: '🍀', desc: '20% chance of a bonus rare gem when mining', eff: { rareLuck: 0.2 } },
      ]},
    ],
  },
  knight: {
    name: 'Crystal Knight', emoji: '🛡️', hp: 46, atk: 8, mag: 4, def: 4, defGrow: 1,
    perk: { basicDmg: 0.5, spellDmg: -0.1 },
    perkDesc: '+50% Bonk damage, tough as gemstone',
    blurb: 'A walking geode. Bonks first, asks questions never.',
    tree: [
      { branch: 'Bulwark', color: '#8fb7ff', nodes: [
        { id: 'kn_b1', name: 'Stonewall',       icon: '🧱', desc: '+25 max HP',                    eff: { hpMax: 25 } },
        { id: 'kn_b2', name: 'Crystal Plate',   icon: '💎', desc: '+3 defense',                    eff: { defFlat: 3 } },
        { id: 'kn_b3', name: 'Aegis of Facets', icon: '🛡️', desc: 'Prism Shield blocks far more',  eff: { shieldPower: 0.5 } },
      ]},
      { branch: 'Shatter', color: '#ff8a5c', nodes: [
        { id: 'kn_s1', name: 'Heavy Bonk',     icon: '🔨', desc: '+25% Bonk damage', eff: { basicDmg: 0.25 } },
        { id: 'kn_s2', name: 'Fracture Point', icon: '🎯', desc: '+12% crit chance', eff: { crit: 0.12 } },
        { id: 'kn_s3', name: 'Meteor Bonk',    icon: '☄️', desc: '+40% Bonk damage', eff: { basicDmg: 0.4 } },
      ]},
      { branch: 'Resolve', color: '#a9f0c6', nodes: [
        { id: 'kn_r1', name: 'Second Wind', icon: '🌬️', desc: 'Heal 25% HP after every victory', eff: { healOnWin: 0.25 } },
        { id: 'kn_r2', name: 'Iron Will',   icon: '⚙️', desc: '+2 defense',                      eff: { defFlat: 2 } },
        { id: 'kn_r3', name: 'Last Stand',  icon: '🕯️', desc: 'Survive a fatal blow once per battle', eff: { lastStand: 1 } },
      ]},
    ],
  },
  whisperer: {
    name: 'Unicorn Whisperer', emoji: '🦄', hp: 38, atk: 5, mag: 6, def: 3, defGrow: 0.5,
    perk: { unicornPower: 0.5 },
    perkDesc: 'Unicorns are 50% stronger; starts with Summon Unicorn',
    perkSpells: { unicorn: 2 },
    blurb: 'Speaks fluent sparkle. Unicorns answer the call.',
    tree: [
      { branch: 'Kinship', color: '#f77fb0', nodes: [
        { id: 'wh_k1', name: 'Best Friends',    icon: '💞', desc: 'Unicorns 30% stronger',      eff: { unicornPower: 0.3 } },
        { id: 'wh_k2', name: 'Loyal Companion', icon: '🐴', desc: 'Summons last 2 extra turns', eff: { summonTurns: 2 } },
        { id: 'wh_k3', name: 'Radiant Herd',    icon: '✨', desc: 'Unicorns 50% stronger',      eff: { unicornPower: 0.5 } },
      ]},
      { branch: 'Blessing', color: '#a9f0c6', nodes: [
        { id: 'wh_b1', name: 'Gentle Glow',  icon: '🌤️', desc: 'Healing 30% stronger',      eff: { healPower: 0.3 } },
        { id: 'wh_b2', name: 'Warm Heart',   icon: '💗', desc: '+20 max HP',                eff: { hpMax: 20 } },
        { id: 'wh_b3', name: 'Meadow Soul',  icon: '🌿', desc: 'Regenerate 3 HP every battle turn', eff: { regen: 3 } },
      ]},
      { branch: 'Wild', color: '#ffd24a', nodes: [
        { id: 'wh_w1', name: 'Forager',   icon: '🧺', desc: '+1 mineral from every node',        eff: { mineYield: 1 } },
        { id: 'wh_w2', name: 'Fae Steps', icon: '🦶', desc: 'Fleeing always works, never ambushed', eff: { fleeSure: 1 } },
        { id: 'wh_w3', name: 'Old Tales', icon: '📜', desc: '+25% XP from battles',              eff: { xpGain: 0.25 } },
      ]},
    ],
  },
};

const MONSTERS = {
  slime:  { name: 'Gloom Slime',  emoji: '👾', hp: 14,  atk: 4,  def: 0, xp: 8,
            drops: { quartz: 3, amethyst: 1 } },
  bat:    { name: 'Cave Bat',     emoji: '🦇', hp: 10,  atk: 5,  def: 0, xp: 9,
            drops: { quartz: 2, amethyst: 2 } },
  shroom: { name: 'Sporeshroom',  emoji: '🍄', hp: 16,  atk: 5,  def: 0, xp: 12, poison: true,
            drops: { amethyst: 2, emerald: 2 } },
  fox:    { name: 'Shadow Fox',   emoji: '🦊', hp: 20,  atk: 7,  def: 1, xp: 16,
            drops: { sunstone: 2, aquamarine: 2 } },
  golem:  { name: 'Rock Golem',   emoji: '🗿', hp: 30,  atk: 6,  def: 3, xp: 22,
            drops: { emerald: 2, aquamarine: 2, roseopal: 1 } },
  gazer:  { name: 'Drowned Gazer', emoji: '👁️', hp: 26, atk: 9, def: 1, xp: 30, dread: true,
            drops: { roseopal: 2, prismatite: 1 } },
  dragon: { name: 'Rainwyrm',     emoji: '🐉', hp: 110, atk: 12, def: 3, xp: 150, boss: true, doubleHit: 0.4,
            drops: { prismatite: 1 } },
  sognaroth: { name: "Sog'naroth, the Endless Drizzle", emoji: '🐙', hp: 170, atk: 14, def: 4, xp: 300,
            boss: true, finalBoss: true, doubleHit: 0.45, dread: true, regen: 4,
            drops: { prismatite: 1 } },
};

// Camp buildings. costs[L] = raw minerals to go from level L to L+1 (null = prebuilt).
const BUILDINGS = {
  house: {
    name: 'House', emoji: '🏠', tile: { x: 6, y: 4 }, max: 3,
    levels: ['Cozy Cabin', 'Timber Lodge', 'Stone Manor'],
    desc: 'Home sweet home. Resting at camp heals you; each level adds +10 max HP and faster resting.',
    bonus: l => `+${10 * l} max HP`,
    eff: { hpMax: 10 },
    costs: [null, { quartz: 6, amethyst: 2 }, { sunstone: 6, emerald: 4, roseopal: 2 }],
  },
  kitchen: {
    name: 'Kitchen', emoji: '🍳', tile: { x: 8, y: 5 }, max: 3,
    levels: ['Camp Stove', 'Proper Kitchen', 'Royal Bakery'],
    desc: 'Hearty meals toughen you up: +12 max HP per level, and resting heals much faster.',
    bonus: l => `+${12 * l} max HP`,
    eff: { hpMax: 12 },
    costs: [{ quartz: 4 }, { sunstone: 4, aquamarine: 2 }, { emerald: 4, roseopal: 2 }],
  },
  factory: {
    name: 'Polishing Factory', emoji: '🏭', tile: { x: 4, y: 5 }, max: 3,
    levels: ['Polishing Bench', 'Gem Workshop', 'Prism Factory'],
    desc: 'Precision tools raise polish quality odds with every level.',
    bonus: l => `+${20 * l}% quality luck`,
    eff: { polishZone: 0.2 },
    costs: [{ quartz: 3, amethyst: 2 }, { aquamarine: 4, emerald: 2 }, { roseopal: 3, prismatite: 1 }],
  },
  stalls: {
    name: 'Unicorn Stalls', emoji: '🦄', tile: { x: 8, y: 8 }, max: 3,
    levels: ['Hay Paddock', 'Unicorn Stalls', 'Radiant Stables'],
    desc: 'Pampered unicorns fight harder: +25% summon power per level.',
    bonus: l => `+${25 * l}% unicorn power`,
    eff: { unicornPower: 0.25 },
    costs: [{ quartz: 5, amethyst: 2 }, { aquamarine: 3, emerald: 3 }, { roseopal: 2, prismatite: 1 }],
  },
  training: {
    name: 'Training Grounds', emoji: '⚔️', tile: { x: 4, y: 8 }, max: 3,
    levels: ['Practice Dummy', 'Sparring Yard', "Hero's Arena"],
    desc: 'Daily drills: +10% Bonk damage and +4% crit chance per level.',
    bonus: l => `+${10 * l}% Bonk, +${4 * l}% crit`,
    eff: { basicDmg: 0.1, crit: 0.04 },
    costs: [{ quartz: 4, sunstone: 1 }, { sunstone: 3, emerald: 3 }, { roseopal: 3, sunstone: 2 }],
  },
  walls: {
    name: 'Castle Walls', emoji: '🧱', max: 3, requires: ['house', 2],
    levels: ['Palisade', 'Stone Walls', 'Prism Citadel'],
    desc: 'Your camp becomes a fortress with a real wall around it: +2 defense per level, everywhere you go.',
    bonus: l => `+${2 * l} defense`,
    eff: { defFlat: 2 },
    costs: [{ quartz: 8, amethyst: 4 }, { sunstone: 6, aquamarine: 4 }, { emerald: 4, roseopal: 4, prismatite: 1 }],
  },
};
