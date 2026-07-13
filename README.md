# 💎 Prism Quest: Rainyday 🌈

A mobile-friendly adventure RPG that runs in any browser — no install, no build step.

The world of **Rainyday** has spent a hundred years beneath one endless storm. Deep
in the gloom squirms **Sog'naroth, the Endless Drizzle** — a lovecraftian thing that
can only exist where the sun never shines.

A Diablo-style campaign from the village hub of **Drizzlewick**:

1. **Drizzlewick** — quest NPCs (Mayor Puddle, Grandma Nimbus, Foreman Flint),
   your upgradeable camp, always sunny, always safe.
2. **Four directional zones** — a gate leads out of the village to the North,
   East, West, and South, each into its own procedurally-generated, themed level
   with a **gloom champion** waiting at the far end: South → Bogmire (Bogmaw 🐸),
   East → the Thunderfen (Voltra 🐍), West → the Moldwood (Mildew Prime 🦠), North
   → the Weeping Heights (the Umbrella King ☂️). Signposts in the village point
   the way and track which lands you've cleared. Beat a champion and that whole
   zone floods with permanent sunlight.
3. **The Rainycastle** rises in the rainclouds once the land shines — step onto
   the plaza **Cloudgate**, cast a rainbow, and ride your unicorn up to slay the
   **Rainwyrm**.
4. The sky tears open: a portal to **Sog'naroth's realm** — one way only. No
   village, no gems, just the skills and spell charges you carry. Win, and the
   sun returns forever.

**Diablo-style loot.** Monsters drop randomized gear across five rarities
(Common → Magic → Rare → Legendary → Set) with rolled affixes scaled to monster
level. Equip five slots — Weapon 🗡️, Helm 🪖, Armor 🧥, Boots 👢, Charm 📿 — from a
character sheet with full derived stats (attack, magic, defense, HP, crit,
**dodge**). **Facet** your polished gems into item sockets for permanent stat
boosts (quality matters — a Brilliant Prismatite is a big spell-damage gem).
Collect the **Rainbow Raiment** set for a 3-piece bonus and the all-5 *Double
Rainbow*. Champions drop rare+, the Rainwyrm and Sog'naroth drop legendary/set.
Salvage unwanted gear back into gems and quartz.

## Play it

Any static file server works:

```
python -m http.server 8123
```

then open http://localhost:8123 — on your phone, use your computer's LAN IP
(e.g. `http://192.168.1.x:8123`). Or drop the folder on any static host
(Firebase Hosting, GitHub Pages, Netlify…) and it's live.

## How to play

- **Tap the ground** to walk (WASD/arrows on desktop).
- **Tap a sparkling gem node** to mine raw minerals. Nodes regrow after ~1 minute.
- **Bag → Polish all**: one button polishes every raw mineral at once. Quality
  (Rough/Fine/Brilliant) is luck — the Polishing Factory and Steady Hands raise
  the odds, and **Summon Dwarves ⛏️** (a craftable utility spell) does the same
  job with a big Brilliant bonus. Better gems = more spell charges.
- **Spellbook**: craft spells from polished gems — Rainbow Beam 🌈, Summon Unicorn 🦄,
  Glitter Bomb 🎆, Stardust Storm 🌟 and more. Charges are consumed when cast,
  so keep mining and crafting.
- **Walk into monsters** to fight (turn-based). Win XP and gem drops.
- **Your camp is a sunny safe zone** — gloom-things cannot step into sunshine, and
  resting there heals you. Build and upgrade six structures with raw minerals
  (House, Kitchen, Polishing Factory, Unicorn Stalls, Training Grounds, Castle
  Walls) — every level grows your power. The Power Tree and Spellbook only open
  in the peace of camp.
- **One life (rogue-like).** If your hero falls, they're gone for good — you begin
  a new one, and your best run is remembered. Enemies scale up the further out you
  push (South is gentlest, North deadliest; the clouds and Sog'naroth's realm
  hardest of all). Flee when outmatched, rest at camp, and consider a **revive
  capstone** deep in your Power Tree to cheat death once per life (rebound to 50% HP).
- **Elite monsters** with coloured auras — Vicious, Armored, Swift, Venomous,
  Cursed, or Radiant (guaranteed rare+ loot) — appear more often the deeper you go.
- **The shattered Prismblade**: four Prism Facets lie buried, one per land,
  visible only as a tiny glint in the grass. Each is a fine weapon alone; the
  village **Glassworks** kiln fuses 2 (Twinlight), 3 (Trilight), or all 4 —
  **THE PRISMBLADE** — melting down an earlier prism so a late find always
  upgrades. Facets can't be salvaged; socketed gems are returned on reforge.
  (`FACET_SPAWN_CHANCE` in data.js drops below 1 for scavenger-hunt runs.)
- **Special dungeons** hidden in every zone: **Gloom Caves** (organic cave-ins),
  **Sunken Ruins** (rooms and corridors), and **Haunted Houses** (a warren of
  doored rooms) — each a real, procedurally-laid-out interior **2–3 floors deep**,
  deadlier as you descend. The stairs down are locked; defeat each floor's
  **Warden** for the key. The final-floor keeper boss (Gloomtroll, Stone Revenant,
  or Poltergeist) guards legendary loot. Optional and dangerous; climb back out
  at any entrance, but death is permanent.
- **Gloom Pacts.** Diving into an uncleared zone offers three blessing-and-curse
  pacts (e.g. +35% spell damage but −18 max HP). Pick one for the dive, or refuse.
- **The Sanctuary (meta-progression).** Every hero banks **Motes ✦** based on how
  far they got, win or lose. Spend them between runs on permanent gifts for all
  who follow: more starting HP, XP, dodge, crit, a bonus skill point, starting
  gems, or a Magic starter weapon.
- **Level up → spend skill points** in your class Power Tree: 3 branches × 5 tiers
  (15 skills), but a **level cap of 12** means you can't learn everything — you'll
  only reach two of your three branch capstones, so builds matter.
- The **Rainwyrm 🐉** guards the Sunken Gate in the dark corner, where legendary
  **Prismatite** grows. Beyond it waits **Sog'naroth 🐙**: its whispers inflict
  Dread, the rain heals it every turn — but sunlight spells (Sunflare, Rainbow
  Beam, Stardust Storm) sear it. Defeat it to restore the sun and win.

## Classes

| Class | Style |
|---|---|
| 🧙 Prism Mage | +20% spell damage; trees for damage, casting economy, and loot luck |
| 🛡️ Crystal Knight | Tanky, +50% basic attack; trees for defense, crits, and survival |
| 🦄 Unicorn Whisperer | Starts with Summon Unicorn; trees for summons, healing, and utility |

## Graphics

Hand-authored **pixel-art sprites** for the entire cast — three player classes,
common monsters, the four gloom champions, the Rainwyrm, Sog'naroth, and the
three villagers — defined as pixel grids in code (`js/sprites.js`) and baked to
offscreen canvases at load, no external image files. Sprites have idle-bob,
facing-flip, and drop shadows on the map, and render in battles and NPC dialogue
too. The **environment** is pixel art as well: textured ground (per-tile specks,
grass blades, occasional flowers), swaying trees, cottages, castle walls, and
five distinct camp buildings (house, kitchen with an oven glow, factory with a
prism smokestack, unicorn stalls, training target). Faceted gems are drawn
procedurally; spell effects use a particle layer. (Toggle
`window.__spriteSheet = true` in the console to see a contact sheet of every
sprite.)

## Sound

All audio is **synthesized at runtime with the Web Audio API** — no sound files,
matching the code-drawn art. Every action has an SFX (mining, polishing,
crafting, bonks, crits, spell casts, taking a hit, dodging, level-ups, victory,
death, buying, keys…) and each map has a subtle ambient arpeggio whose mood
shifts (calm village, tense zones, ominous dungeons, dissonant realm). A 🔊/🔇
button in the HUD mutes everything, and the choice persists.

## Balance simulator

`js/sim.js` plays full games headlessly through the real systems (combat, loot,
XP, pacts, elites, dungeons, skill builds) with a scripted player. From the
browser console:

```js
runSim(100, 5000)   // 100 games, seeds 5001..5100 — returns the outcome mix
window.SIM_LAST     // per-run details (class, build, deaths, minHp, ...)
```

Runs are **deterministic per seed** (Math.random is re-seeded per run), so after
a balance change you re-run the same seeds and compare apples to apples. Saving,
meta-progression, and death records are stubbed during the sim, and your real
game state is restored afterwards. Target mix we tune toward: roughly half the
runs are losses, with a healthy spread of close wins, comfortable wins, and the
occasional godlike **crush** (won without ever being truly threatened).

## Tech

Plain HTML5 Canvas + vanilla JavaScript. No dependencies, no build.
Saves automatically to `localStorage`. Files:

- `js/data.js` — minerals, spells, classes, skill trees, monsters
- `js/game.js` — world generation, rendering, movement, mining, save/load
- `js/battle.js` — turn-based combat, statuses, summons
- `js/ui.js` — menus, polish minigame, crafting, skill tree

Later, the whole folder can be wrapped with Capacitor for the app stores,
or given a manifest + service worker to become an installable PWA.
