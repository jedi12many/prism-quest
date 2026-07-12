# 💎 Prism Quest: Rainyday 🌈

A mobile-friendly adventure RPG that runs in any browser — no install, no build step.

The world of **Rainyday** has spent a hundred years beneath one endless storm. Deep
in the gloom squirms **Sog'naroth, the Endless Drizzle** — a lovecraftian thing that
can only exist where the sun never shines.

A Diablo-style campaign from the village hub of **Drizzlewick**:

1. **Drizzlewick** — quest NPCs (Mayor Puddle, Grandma Nimbus, Foreman Flint),
   your upgradeable camp, always sunny, always safe.
2. **The wilds of Rainyday** — procedurally redrawn every trip. Defeat the four
   **gloom champions** (Bogmaw 🐸, Voltra 🐍, Mildew Prime 🦠, the Umbrella King ☂️)
   and each region floods with permanent sunlight.
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
- **Level up → spend skill points** in your class Power Tree (3 branches × 3 tiers).
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
too. Faceted gems are drawn procedurally; spell effects use a particle layer.
(Toggle `window.__spriteSheet = true` in the console to see a contact sheet of
every sprite.)

## Tech

Plain HTML5 Canvas + vanilla JavaScript. No dependencies, no build.
Saves automatically to `localStorage`. Files:

- `js/data.js` — minerals, spells, classes, skill trees, monsters
- `js/game.js` — world generation, rendering, movement, mining, save/load
- `js/battle.js` — turn-based combat, statuses, summons
- `js/ui.js` — menus, polish minigame, crafting, skill tree

Later, the whole folder can be wrapped with Capacitor for the app stores,
or given a manifest + service worker to become an installable PWA.
