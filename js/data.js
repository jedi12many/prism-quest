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
        { id: 'mg_r4', name: 'Starfire',        icon: '🌟', desc: '+20% spell damage',  eff: { spellDmg: 0.2 } },
        { id: 'mg_r5', name: 'Prismatic Nova',  icon: '🎆', desc: 'CAPSTONE: +40% spell damage & +12% crit', eff: { spellDmg: 0.4, crit: 0.12 } },
      ]},
      { branch: 'Flow', color: '#4fd8e0', nodes: [
        { id: 'mg_f1', name: 'Steady Hands', icon: '🤲', desc: 'Big boost to polish quality odds',      eff: { polishZone: 0.35 } },
        { id: 'mg_f2', name: 'Echo Casting', icon: '🔁', desc: '+1 charge every time you craft a spell', eff: { charges: 1 } },
        { id: 'mg_f3', name: 'Chain Light',  icon: '⛓️', desc: '25% chance casting is free',            eff: { chargeSave: 0.25 } },
        { id: 'mg_f4', name: 'Mana Well',    icon: '🌊', desc: '+1 craft charge & 15% free casts',      eff: { charges: 1, chargeSave: 0.15 } },
        { id: 'mg_f5', name: 'Second Dawn',  icon: '🌅', desc: 'CAPSTONE: once per life, cheat death and revive at 50% HP', eff: { reviveFrac: 0.5 } },
      ]},
      { branch: 'Fortune', color: '#ffd24a', nodes: [
        { id: 'mg_o1', name: 'Gem Sense',    icon: '👁️', desc: '+1 mineral from every node',        eff: { mineYield: 1 } },
        { id: 'mg_o2', name: 'Scholar',      icon: '📖', desc: '+25% XP from battles',              eff: { xpGain: 0.25 } },
        { id: 'mg_o3', name: 'Rainbow Luck', icon: '🍀', desc: '20% chance of a bonus rare gem when mining', eff: { rareLuck: 0.2 } },
        { id: 'mg_o4', name: 'Gem Diviner',  icon: '🔮', desc: '+1 mineral & +12% rare gem luck',        eff: { mineYield: 1, rareLuck: 0.12 } },
        { id: 'mg_o5', name: 'Midas Prism',  icon: '👑', desc: 'CAPSTONE: +40% XP & +20% rare gem luck', eff: { xpGain: 0.4, rareLuck: 0.2 } },
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
        { id: 'kn_b4', name: 'Bastion',         icon: '🏰', desc: '+30 max HP & +2 defense',        eff: { hpMax: 30, defFlat: 2 } },
        { id: 'kn_b5', name: 'Undying',         icon: '⚰️', desc: 'CAPSTONE: once per life, revive at 50% HP', eff: { reviveFrac: 0.5 } },
      ]},
      { branch: 'Shatter', color: '#ff8a5c', nodes: [
        { id: 'kn_s1', name: 'Heavy Bonk',     icon: '🔨', desc: '+25% Bonk damage', eff: { basicDmg: 0.25 } },
        { id: 'kn_s2', name: 'Fracture Point', icon: '🎯', desc: '+12% crit chance', eff: { crit: 0.12 } },
        { id: 'kn_s3', name: 'Meteor Bonk',    icon: '☄️', desc: '+40% Bonk damage', eff: { basicDmg: 0.4 } },
        { id: 'kn_s4', name: 'Devastate',      icon: '💢', desc: '+25% Bonk damage', eff: { basicDmg: 0.25 } },
        { id: 'kn_s5', name: 'Cataclysm',      icon: '🌋', desc: 'CAPSTONE: +50% Bonk damage & +12% crit', eff: { basicDmg: 0.5, crit: 0.12 } },
      ]},
      { branch: 'Resolve', color: '#a9f0c6', nodes: [
        { id: 'kn_r1', name: 'Second Wind', icon: '🌬️', desc: 'Heal 25% HP after every victory', eff: { healOnWin: 0.25 } },
        { id: 'kn_r2', name: 'Iron Will',   icon: '⚙️', desc: '+2 defense',                      eff: { defFlat: 2 } },
        { id: 'kn_r3', name: 'Last Stand',  icon: '🕯️', desc: 'Survive a fatal blow once per battle', eff: { lastStand: 1 } },
        { id: 'kn_r4', name: 'Warden Spirit', icon: '💠', desc: '+3 regen & heal 15% after each win',  eff: { regen: 3, healOnWin: 0.15 } },
        { id: 'kn_r5', name: 'Immovable',   icon: '🗿', desc: 'CAPSTONE: +25% max HP & +4 defense',    eff: { hpMax: 25, defFlat: 4 } },
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
        { id: 'wh_k4', name: 'Herd Leader',     icon: '🐎', desc: '+30% unicorn power & +2 summon turns', eff: { unicornPower: 0.3, summonTurns: 2 } },
        { id: 'wh_k5', name: 'Celestial Herd',  icon: '🌟', desc: 'CAPSTONE: unicorns 50% stronger again', eff: { unicornPower: 0.5 } },
      ]},
      { branch: 'Blessing', color: '#a9f0c6', nodes: [
        { id: 'wh_b1', name: 'Gentle Glow',  icon: '🌤️', desc: 'Healing 30% stronger',      eff: { healPower: 0.3 } },
        { id: 'wh_b2', name: 'Warm Heart',   icon: '💗', desc: '+20 max HP',                eff: { hpMax: 20 } },
        { id: 'wh_b3', name: 'Meadow Soul',  icon: '🌿', desc: 'Regenerate 3 HP every battle turn', eff: { regen: 3 } },
        { id: 'wh_b4', name: 'Radiant Soul', icon: '💗', desc: '+3 regen & +25% healing',          eff: { regen: 3, healPower: 0.25 } },
        { id: 'wh_b5', name: "Unicorn's Gift", icon: '🦄', desc: 'CAPSTONE: once per life, your unicorn sacrifices itself to revive you at 50% HP', eff: { reviveFrac: 0.5 } },
      ]},
      { branch: 'Wild', color: '#ffd24a', nodes: [
        { id: 'wh_w1', name: 'Forager',   icon: '🧺', desc: '+1 mineral from every node',        eff: { mineYield: 1 } },
        { id: 'wh_w2', name: 'Fae Steps', icon: '🦶', desc: 'Fleeing always works, never ambushed', eff: { fleeSure: 1 } },
        { id: 'wh_w3', name: 'Old Tales', icon: '📜', desc: '+25% XP from battles',              eff: { xpGain: 0.25 } },
        { id: 'wh_w4', name: 'Pathfinder', icon: '🧭', desc: '+1 mineral & fleeing always works', eff: { mineYield: 1, fleeSure: 1 } },
        { id: 'wh_w5', name: 'Storyteller', icon: '📖', desc: 'CAPSTONE: +40% XP from battles',    eff: { xpGain: 0.4 } },
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
  spawnling: { name: 'Spawn of Sog', emoji: '🦑', hp: 24, atk: 10, def: 1, xp: 26,
            drops: { roseopal: 1 } },
  // the four gloom champions — beat one and its region floods with light
  bogmaw:   { name: 'Bogmaw the Damp',        emoji: '🐸', hp: 50, atk: 9,  def: 2, xp: 60, boss: true, miniboss: 0, poison: true,
            drops: { aquamarine: 2, prismatite: 1 } },
  voltra:   { name: 'Voltra the Storm Serpent', emoji: '🐍', hp: 55, atk: 11, def: 2, xp: 70, boss: true, miniboss: 1, doubleHit: 0.35,
            drops: { sunstone: 2, prismatite: 1 } },
  mildew:   { name: 'Mildew Prime',           emoji: '🦠', hp: 65, atk: 10, def: 3, xp: 80, boss: true, miniboss: 2, regen: 2,
            drops: { emerald: 2, prismatite: 1 } },
  umbrella: { name: 'The Umbrella King',      emoji: '☂️', hp: 60, atk: 10, def: 4, xp: 75, boss: true, miniboss: 3, dread: true,
            drops: { roseopal: 2, prismatite: 1 } },
  dragon: { name: 'Rainwyrm',     emoji: '🐉', hp: 110, atk: 12, def: 3, xp: 150, boss: true, doubleHit: 0.4,
            drops: { prismatite: 1 } },
  sognaroth: { name: "Sog'naroth, the Endless Drizzle", emoji: '🐙', hp: 170, atk: 14, def: 4, xp: 300,
            boss: true, finalBoss: true, doubleHit: 0.45, dread: true, regen: 4,
            drops: { prismatite: 1 } },
};

// Elite monster affixes — a rare mob spawns "elite" with a modifier, more HP,
// better XP/loot, and a coloured aura. (Champions/bosses are never elite.)
const ELITE_MODS = {
  vicious:  { name: 'Vicious',  color: '#ff6b6b', hpMul: 1.3, atkMul: 1.45, xpMul: 1.8 },
  armored:  { name: 'Armored',  color: '#8fb7ff', hpMul: 2.0, defBonus: 3,  xpMul: 1.8 },
  swift:    { name: 'Swift',    color: '#5cff8a', hpMul: 1.3, extraHit: 0.5, xpMul: 1.8 },
  venomous: { name: 'Venomous', color: '#b06ee8', hpMul: 1.35, venom: true, xpMul: 1.8 },
  cursed:   { name: 'Cursed',   color: '#c86bff', hpMul: 1.4, curse: true,  xpMul: 1.9 },
  radiant:  { name: 'Radiant',  color: '#ffd24a', hpMul: 1.6, xpMul: 2.5, richLoot: true },
};
const ELITE_KEYS = Object.keys(ELITE_MODS);

// Drizzlewick villagers
const NPCS = {
  mayor:   { name: 'Mayor Puddle',   emoji: '🎩', x: 14, y: 6 },
  grandma: { name: 'Grandma Nimbus', emoji: '🧓', x: 17, y: 9 },
  foreman: { name: 'Foreman Flint',  emoji: '🧔', x: 10, y: 12 },
};

// The four directional zones out of Drizzlewick — one champion boss each.
// Ordered easy→hard; each is its own procedural level with a themed look.
const ZONES = {
  south: {
    dir: 'South', name: 'Bogmire', champion: 'bogmaw', tier: 1,
    ground: ['#6f9c4a', '#79a854'],
    packs: { slime: 5, bat: 3, shroom: 2 },
    minerals: ['quartz', 'quartz', 'amethyst', 'sunstone'],
    gate: [[13, 15], [14, 15]],
    blurb: 'a sunken swamp of croaking gloom',
  },
  east: {
    dir: 'East', name: 'The Thunderfen', champion: 'voltra', tier: 2,
    ground: ['#5f9a86', '#69a690'],
    packs: { bat: 4, fox: 4, slime: 2 },
    minerals: ['sunstone', 'aquamarine', 'quartz', 'amethyst'],
    gate: [[25, 8], [25, 9]],
    blurb: 'storm-lashed reedlands',
  },
  west: {
    dir: 'West', name: 'The Moldwood', champion: 'mildew', tier: 3,
    ground: ['#6a8a3a', '#749644'],
    packs: { shroom: 5, golem: 2, fox: 2, gazer: 1 },
    minerals: ['emerald', 'aquamarine', 'emerald', 'quartz'],
    gate: [[2, 13], [2, 14]],
    blurb: 'a rotting, spore-choked forest',
  },
  north: {
    dir: 'North', name: 'The Weeping Heights', champion: 'umbrella', tier: 4,
    ground: ['#7286a4', '#7e92b0'],
    packs: { golem: 3, gazer: 3, fox: 2 },
    minerals: ['roseopal', 'emerald', 'sunstone', 'roseopal'],
    gate: [[13, 2], [14, 2]],
    blurb: 'cold cliffs under endless drizzle',
  },
};

// Main quest stages (index = state.mainQuest)
const QUEST_TEXT = [
  'Talk to Mayor Puddle in Drizzlewick.',
  'Take a gate out of the village and defeat the gloom champion in each direction.',
  'The land shines! Report to Mayor Puddle.',
  'Step onto the Cloudgate 🌈 in the plaza and ride to the Rainycastle.',
  'Defeat the Rainwyrm in the Rainycastle!',
  'A portal has opened in the Rainycastle. Prepare, then enter — there is no way back.',
  "Destroy Sog'naroth. No retreat, no resupply.",
  'Rainyday is saved! Bask in the sunshine.',
];

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
