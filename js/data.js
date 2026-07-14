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
    name: 'Prism Mage', emoji: '🧙', hp: 40, atk: 4, mag: 9, def: 3, defGrow: 0.5, difficulty: 'Expert ★★★',
    perk: { spellDmg: 0.35, chargeSave: 0.1 },
    perkDesc: '+35% spell damage, 10% free casts',
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
    name: 'Crystal Knight', emoji: '🛡️', hp: 46, atk: 8, mag: 4, def: 4, defGrow: 1, difficulty: 'Steady ★★',
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
        { id: 'kn_s4', name: 'Devastate',      icon: '💢', desc: '+30% Bonk damage & +6% crit', eff: { basicDmg: 0.3, crit: 0.06 } },
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
    name: 'Unicorn Whisperer', emoji: '🦄', hp: 38, atk: 5, mag: 6, def: 3, defGrow: 0.5, difficulty: 'Gentle ★',
    perk: { unicornPower: 0.35 },
    perkDesc: 'Unicorns are 35% stronger; starts with Summon Unicorn',
    perkSpells: { unicorn: 2 },
    blurb: 'Speaks fluent sparkle. Unicorns answer the call.',
    tree: [
      { branch: 'Kinship', color: '#f77fb0', nodes: [
        { id: 'wh_k1', name: 'Best Friends',    icon: '💞', desc: 'Unicorns 30% stronger',      eff: { unicornPower: 0.3 } },
        { id: 'wh_k2', name: 'Loyal Companion', icon: '🐴', desc: 'Summons last 2 extra turns', eff: { summonTurns: 2 } },
        { id: 'wh_k3', name: 'Radiant Herd',    icon: '✨', desc: 'Unicorns 50% stronger',      eff: { unicornPower: 0.5 } },
        { id: 'wh_k4', name: 'Herd Leader',     icon: '🐎', desc: 'Summons last +3 turns',       eff: { summonTurns: 3 } },
        { id: 'wh_k5', name: 'Celestial Herd',  icon: '🌟', desc: 'CAPSTONE: +70% unicorn power', eff: { unicornPower: 0.7 } },
      ]},
      { branch: 'Blessing', color: '#a9f0c6', nodes: [
        { id: 'wh_b1', name: 'Gentle Glow',  icon: '🌤️', desc: 'Healing 30% stronger',      eff: { healPower: 0.3 } },
        { id: 'wh_b2', name: 'Warm Heart',   icon: '💗', desc: '+20 max HP',                eff: { hpMax: 20 } },
        { id: 'wh_b3', name: 'Meadow Soul',  icon: '🌿', desc: 'Regenerate 3 HP every battle turn', eff: { regen: 3 } },
        { id: 'wh_b4', name: 'Radiant Soul', icon: '💗', desc: '+25% healing & +15 max HP',        eff: { healPower: 0.25, hpMax: 15 } },
        { id: 'wh_b5', name: "Unicorn's Gift", icon: '🦄', desc: 'CAPSTONE: once per life, your unicorn sacrifices itself to revive you at 50% HP', eff: { reviveFrac: 0.5 } },
      ]},
      { branch: 'Wild', color: '#ffd24a', nodes: [
        { id: 'wh_w1', name: 'Forager',   icon: '🧺', desc: '+1 mineral from every node',        eff: { mineYield: 1 } },
        { id: 'wh_w2', name: 'Fae Steps', icon: '🦶', desc: 'Fleeing always works, never ambushed', eff: { fleeSure: 1 } },
        { id: 'wh_w3', name: 'Old Tales', icon: '📜', desc: '+25% XP from battles',              eff: { xpGain: 0.25 } },
        { id: 'wh_w4', name: 'Lucky Charm', icon: '🍀', desc: '+18% chance of a bonus rare gem when mining', eff: { rareLuck: 0.18 } },
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
  bogmaw:   { name: 'Bogmaw the Damp',        emoji: '🐸', hp: 46, atk: 8,  def: 2, xp: 60, boss: true, miniboss: 0, poison: true,
            drops: { aquamarine: 2, prismatite: 1 } },
  voltra:   { name: 'Voltra the Storm Serpent', emoji: '🐍', hp: 55, atk: 11, def: 2, xp: 70, boss: true, miniboss: 1, doubleHit: 0.35,
            drops: { sunstone: 2, prismatite: 1 } },
  mildew:   { name: 'Mildew Prime',           emoji: '🦠', hp: 65, atk: 10, def: 3, xp: 80, boss: true, miniboss: 2, regen: 2,
            drops: { emerald: 2, prismatite: 1 } },
  umbrella: { name: 'The Umbrella King',      emoji: '☂️', hp: 60, atk: 10, def: 4, xp: 75, boss: true, miniboss: 3, dread: true,
            drops: { roseopal: 2, prismatite: 1 } },
  // dungeon bosses — deadly, with rich loot
  gloomtroll:  { name: 'Gloomtroll',     emoji: '🧌', hp: 85, atk: 13, def: 3, xp: 110, boss: true, dungeonBoss: true, regen: 3,
            drops: { emerald: 2, prismatite: 1 } },
  revenant:    { name: 'Stone Revenant', emoji: '🗿', hp: 100, atk: 12, def: 5, xp: 120, boss: true, dungeonBoss: true, doubleHit: 0.3,
            drops: { aquamarine: 2, prismatite: 1 } },
  poltergeist: { name: 'Poltergeist',    emoji: '👻', hp: 78, atk: 14, def: 2, xp: 118, boss: true, dungeonBoss: true, dread: true, doubleHit: 0.4,
            drops: { roseopal: 2, prismatite: 1 } },
  // guardians of the Rainycastle floors and the realm depths
  sentinel:   { name: 'Galeheart, the Storm Sentinel', emoji: '🌩️', hp: 80, atk: 12, def: 5, xp: 110, boss: true, guardian: true, doubleHit: 0.3,
            drops: { aquamarine: 2, prismatite: 1 } },
  raincaller: { name: 'The Raincaller', emoji: '🌧️', hp: 90, atk: 13, def: 3, xp: 125, boss: true, guardian: true, regen: 3, dread: true,
            drops: { sunstone: 2, prismatite: 1 } },
  herald:     { name: 'The Herald Below', emoji: '🦑', hp: 85, atk: 13, def: 3, xp: 140, boss: true, guardian: true, doubleHit: 0.3, dread: true,
            drops: { roseopal: 2, prismatite: 1 } },
  voidmaw:    { name: 'The Voidmaw', emoji: '🕳️', hp: 95, atk: 13, def: 4, xp: 160, boss: true, guardian: true, regen: 3, doubleHit: 0.3,
            drops: { prismatite: 2 } },
  dragon: { name: 'Rainwyrm',     emoji: '🐉', hp: 110, atk: 12, def: 3, xp: 150, boss: true, doubleHit: 0.4,
            drops: { prismatite: 1 } },
  sognaroth: { name: "Sog'naroth, the Endless Drizzle", emoji: '🐙', hp: 170, atk: 14, def: 4, xp: 300,
            boss: true, finalBoss: true, doubleHit: 0.45, dread: true, regen: 4,
            drops: { prismatite: 1 } },
};

// Difficulty — chosen for your next hero and locked into the run. Scales every
// monster's HP and damage. Normal is 1.0 (the tuned baseline). Values get
// dialed in by the balance sim (runSim / tuneDifficulty).
const DIFFICULTIES = {
  easy:    { name: 'Easy',    hp: 0.88, dmg: 0.78, blurb: 'A gentle drizzle — for the story and the sights.' },
  normal:  { name: 'Normal',  hp: 1.00, dmg: 1.00, blurb: 'Rainyday as intended: a fair, deadly rogue-like.' },
  hard:    { name: 'Hard',    hp: 1.08, dmg: 1.15, blurb: 'The storm bites back. For veterans of the gloom.' },
  monsoon: { name: 'Monsoon', hp: 1.16, dmg: 1.32, blurb: 'A hundred-year deluge. Most heroes drown.' },
};
const DIFFICULTY_ORDER = ['easy', 'normal', 'hard', 'monsoon'];

// The six real villains get a cinematic entrance: sprite slam, quote, sting.
const BOSS_INTROS = {
  bogmaw:    { color: '#6fae4a', quote: '“GLORP. This swamp has drowned ninety-nine heroes. You make it a nice round number.”' },
  voltra:    { color: '#4bbf8a', quote: '“Ssssso. A little spark crawls in… to challenge the storm itself.”' },
  mildew:    { color: '#8fae3a', quote: '“Everything rots. Everything joins us. You will make LOVELY compost.”' },
  umbrella:  { color: '#6f8fe0', quote: '“A hundred years I have kept the rain off my betters. You? You are merely damp.”' },
  dragon:    { color: '#8fb0d8', quote: '“I AM THE STORM’S TOOTH, groundling. The sky was never yours.”' },
  sognaroth: { color: '#b45cff', quote: '“little light. i have drowned ten thousand dawns. yours will not even ripple.”' },

  // named lieutenants — the storm's stairway guardians (fought on the way up/down)
  sentinel:   { tag: 'GUARDIAN', color: '#8fb0d8', quote: '“None climb past me. The storm keeps its crown, and I keep its stair.”' },
  raincaller:  { tag: 'GUARDIAN', color: '#5cc9ff', quote: '“I have called this rain down for a hundred years. I will call your name down next.”' },
  herald:     { tag: 'GUARDIAN', color: '#7a4aba', quote: '“Turn back, sunlit thing. You only hurry toward the mouth that waits below.”' },
  voidmaw:    { tag: 'GUARDIAN', color: '#b45cff', quote: '“I am the last dark before the dark. Everything bright ends in me.”' },

  // dungeon keepers — hoarders in the deep places
  gloomtroll: { tag: 'DUNGEON KEEPER', color: '#6fae4a', quote: '“HRRN. Shiny go in cave. Hero go in cave. Cave keeps ALL.”' },
  revenant:   { tag: 'DUNGEON KEEPER', color: '#a8a2b4', quote: '“I have guarded these stones since before your sun. Kneel, or be rubble.”' },
  poltergeist: { tag: 'DUNGEON KEEPER', color: '#e8e8f5', quote: '“Ahaha— a VISITOR! Stay. Stay forever. Everyone here does.”' },
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

// Sanctuary meta-upgrades — bought with Motes ✦ (earned each run) and kept
// across deaths. 'eff' upgrades are always-on; 'start' upgrades grant something
// to each new hero. cost(rank) is the price to buy the next rank.
const META_UPGRADES = {
  hearty:     { name: 'Hearty',     icon: '❤️', max: 4, cost: r => 20 + r * 20, desc: '+8 starting max HP', eff: { hpMax: 8 } },
  veteran:    { name: 'Veteran',    icon: '⭐', max: 3, cost: r => 30 + r * 30, desc: '+6% XP gained',      eff: { xpGain: 0.06 } },
  fleet:      { name: 'Fleet-footed', icon: '🌀', max: 3, cost: r => 30 + r * 25, desc: '+3% dodge chance', eff: { dodge: 0.03 } },
  keen:       { name: 'Keen Eye',   icon: '💥', max: 3, cost: r => 30 + r * 25, desc: '+3% crit chance',    eff: { crit: 0.03 } },
  trained:    { name: 'Well-Trained', icon: '🌳', max: 2, cost: r => 50 + r * 50, desc: '+1 starting skill point', start: { skillPoints: 1 } },
  prospector: { name: 'Prospector', icon: '💎', max: 3, cost: r => 25 + r * 20, desc: 'Start with 2 Fine gems', start: { gems: 2 } },
  arsenal:    { name: 'Arsenal',    icon: '🗡️', max: 1, cost: () => 90,          desc: 'Start with a Magic weapon', start: { magicWeapon: true } },
};

// Special dungeons — optional sub-maps found inside the zones, each with a
// distinct hand-laid-out interior, deadly boss, and boosted loot.
const DUNGEONS = {
  cave:  { name: 'Gloom Cave',    emoji: '⛰️', floor: 'cavefloor',  wall: 'caverock', boss: 'gloomtroll',
           mobs: { bat: 5, golem: 2, gazer: 2 } },
  ruins: { name: 'Sunken Ruins',  emoji: '🏛️', floor: 'ruinfloor',  wall: 'ruinwall',  boss: 'revenant',
           mobs: { shroom: 3, golem: 3, gazer: 2 } },
  house: { name: 'Haunted House', emoji: '🏚️', floor: 'housefloor', wall: 'housewall', boss: 'poltergeist',
           mobs: { bat: 4, gazer: 4, spawnling: 2 } },
};
const DUNGEON_TYPES = ['cave', 'ruins', 'house'];

// The shattered Prismblade — four facets, one hidden in each land as a tiny
// glint in the grass. Fuse them at the village Glassworks: 2, 3, or all 4.
const FACET_SPAWN_CHANCE = 1; // drop to 0.75 later for true scavenger-hunt runs
const FACETS = {
  south: { name: 'Crimson Facet', color: '#ff5c7a', lore: 'A shard of the Prismblade, warm as dawn.',
           affixes: { atkFlat: 4, spellDmg: 0.12, crit: 0.05 } },
  east:  { name: 'Amber Facet',   color: '#ffd24a', lore: 'It hums with distant thunder.',
           affixes: { atkFlat: 5, basicDmg: 0.15, crit: 0.05 } },
  west:  { name: 'Verdant Facet', color: '#5cff8a', lore: 'Moss cannot grow on it. It tried.',
           affixes: { magFlat: 4, spellDmg: 0.15, regen: 2 } },
  north: { name: 'Azure Facet',   color: '#5cc9ff', lore: 'Cold, clear, and impossibly light.',
           affixes: { magFlat: 5, spellDmg: 0.18, dodge: 0.05 } },
};
const PRISM_TIERS = {
  2: { name: 'Twinlight Prism', sockets: 2, lore: 'Two colors, braided into one edge.',
       affixes: { atkFlat: 6, magFlat: 4, spellDmg: 0.22, basicDmg: 0.15, crit: 0.08 } },
  3: { name: 'Trilight Prism',  sockets: 2, lore: 'Almost whole. It aches for the last color.',
       affixes: { atkFlat: 8, magFlat: 6, spellDmg: 0.35, basicDmg: 0.25, crit: 0.1, chargeSave: 0.12 } },
  4: { name: 'THE PRISMBLADE',  sockets: 3, lore: 'All colors. One light. Zero survivors.',
       affixes: { atkFlat: 12, magFlat: 10, spellDmg: 0.7, basicDmg: 0.7, crit: 0.18, chargeSave: 0.25, dodge: 0.06 } },
};

// Gloom Pacts — a blessing paired with a curse, chosen when you dive into an
// uncleared zone. Active only while you're in that zone (a fresh choice each dive).
const PACTS = [
  { name: 'Glass Rainbow',    icon: '🌈', bless: { spellDmg: 0.35 },              curse: { hpMax: -18 },
    desc: '+35% spell damage, but −18 max HP' },
  { name: "Berserker's Vow",  icon: '⚔️', bless: { basicDmg: 0.4, crit: 0.08 },   curse: { defFlat: -3 },
    desc: '+40% Bonk damage & +8% crit, but −3 defense' },
  { name: "Hoarder's Bargain", icon: '💎', bless: { rareLuck: 0.25, mineYield: 1 }, curse: { xpGain: -0.3 },
    desc: '+25% rare-gem luck & +1 mining, but −30% XP' },
  { name: "Turtle's Patience", icon: '🛡️', bless: { defFlat: 4, hpMax: 20 },       curse: { spellDmg: -0.2, basicDmg: -0.2 },
    desc: '+4 defense & +20 max HP, but −20% all damage' },
  { name: "Unicorn's Fervor", icon: '🦄', bless: { unicornPower: 0.6, healPower: 0.3 }, curse: { atkFlat: -2 },
    desc: '+60% unicorn power & +30% healing, but −2 attack' },
  { name: 'Nimble Gambit',    icon: '🌀', bless: { dodge: 0.12, crit: 0.08 },      curse: { hpMax: -12 },
    desc: '+12% dodge & +8% crit, but −12 max HP' },
  { name: "Scholar's Focus",  icon: '📖', bless: { xpGain: 0.5, chargeSave: 0.15 }, curse: { defFlat: -2 },
    desc: '+50% XP & 15% free casts, but −2 defense' },
  { name: "Ascetic's Boon",   icon: '✨', bless: { spellDmg: 0.2, basicDmg: 0.2, regen: 2 }, curse: { hpMax: -25 },
    desc: '+20% all damage & regen, but −25 max HP' },
];

// Drizzlewick villagers
const NPCS = {
  mayor:   { name: 'Mayor Puddle',   emoji: '🎩', x: 14, y: 6 },
  grandma: { name: 'Grandma Nimbus', emoji: '🧓', x: 17, y: 9 },
  foreman: { name: 'Foreman Flint',  emoji: '🧔', x: 10, y: 12 },
  pip:     { name: 'Pip',            emoji: '🧒', x: 20, y: 7 },
  baker:   { name: 'Barnaby the Baker', emoji: '🧑‍🍳', x: 22, y: 11 },
  willow:  { name: 'Willow the Gardener', emoji: '🧑‍🌾', x: 13, y: 10 },
};

// Deeds — persistent per-device achievements. Hidden until earned; the Ledger
// shows only completed ones plus the denominator. Grandma hints at the rest.
const ACHIEVEMENTS = {
  'first-steps':   { name: 'First Light',      desc: 'Bring the sun back to one land.',            hint: 'Every dawn starts with a single sunbeam, dearie.' },
  'lights-on':     { name: 'Four Dawns',       desc: 'Restore all four lands in a single run.',    hint: 'North, east, west, south — the sun misses them all.' },
  'wyrmfall':      { name: 'Stormbreaker',     desc: 'Defeat the master of the Rainycastle.',      hint: 'Whatever rules that castle can fall like any other rain.' },
  'sunbringer':    { name: 'Sunbringer',       desc: 'Banish the gloom and restore the sun.',      hint: 'Someday, someone will see this whole nightmare through.' },
  'twinlight':     { name: 'Glasssmith',       desc: 'Fuse your first prism weapon.',              hint: 'The kiln has been cold for a hundred years. Feed it two colors.' },
  'prismblade':    { name: 'All Colors, One Light', desc: 'Forge THE PRISMBLADE.',                 hint: 'Four facets. One blade. The old songs say it outshone the sun.' },
  'facet-hunter':  { name: 'Glint-Eyed',       desc: 'Unearth all four Prism Facets in one run.',  hint: 'Four glints in four lands, for eyes patient enough.' },
  'keeper-slayer': { name: 'Keeper of Keepers', desc: 'Defeat all three dungeon keepers.',         hint: 'A troll, a statue, a ghost — each hoards something wonderful.' },
  'elite-slayer':  { name: 'Aura Breaker',     desc: 'Slay 25 elite monsters.',                    hint: 'The shiny ones hit harder. Hit them back, twenty-five times.' },
  'dwarf-friend':  { name: 'Hi-Ho',            desc: 'Summon the dwarf crew.',                     hint: 'Flint\'s crew works for gems and glory. Mostly gems.' },
  'unicorn-rider': { name: 'Best Friends',     desc: 'Summon a unicorn in battle.',                hint: 'When all seems lost, whistle for a friend with a horn.' },
  'pact-victor':   { name: 'Devil\'s Due',     desc: 'Defeat a champion while under a Gloom Pact.', hint: 'Bargain with the gloom, then beat its champion anyway.' },
  'good-neighbor': { name: 'Heart of Drizzlewick', desc: 'Complete all three villager favors in one run.', hint: 'Pip, Barnaby, and Willow each need a small kindness.' },
  'speed-sun':     { name: 'Before Supper',    desc: 'Restore the sun in under 40 minutes.',       hint: 'My stew takes forty minutes. Race it.' },
  'untouchable':   { name: 'Untouchable',      desc: 'Win without ever falling below 30% health.', hint: 'The best fights are the ones that barely muss your hair.' },
  'triple-crown':  { name: 'Triple Crown',     desc: 'Restore the sun with every class.',          hint: 'Mage, knight, whisperer — the sun loves all three the same.' },
  'deep-delver':   { name: 'Bottom Floor',     desc: 'Reach the third floor of a dungeon.',        hint: 'Some holes go down, and down, and down again.' },
  'wall-builder':  { name: 'Castle Doctrine',  desc: 'Raise the camp walls.',                      hint: 'Good walls make the gloom sulk outside.' },
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
  'Climb the Rainycastle and face whatever brews the storm!',
  'A portal has opened in the Rainycastle. Prepare, then enter — there is no way back.',
  'Descend to the heart of the gloom and destroy it. No retreat, no resupply.',
  'Rainyday is saved! Bask in the sunshine.',
];

// Camp buildings. costs[L] = gems (raw or polished) to reach level L+1 (null = prebuilt).
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
