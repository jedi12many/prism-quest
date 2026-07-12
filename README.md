# 💎 Prism Quest: Rainyday 🌈

A mobile-friendly adventure RPG that runs in any browser — no install, no build step.

The world of **Rainyday** has spent a hundred years beneath one endless storm. Deep
in the gloom squirms **Sog'naroth, the Endless Drizzle** — a lovecraftian thing that
can only exist where the sun never shines. Mine rare minerals, polish them to a shine,
craft dazzling spells (rainbows! unicorns!), build up your camp, defeat the Rainwyrm
at the Sunken Gate, and destroy Sog'naroth to **bring back the sunshine**.

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

## Tech

Plain HTML5 Canvas + vanilla JavaScript. No dependencies, no build.
Saves automatically to `localStorage`. Files:

- `js/data.js` — minerals, spells, classes, skill trees, monsters
- `js/game.js` — world generation, rendering, movement, mining, save/load
- `js/battle.js` — turn-based combat, statuses, summons
- `js/ui.js` — menus, polish minigame, crafting, skill tree

Later, the whole folder can be wrapped with Capacitor for the app stores,
or given a manifest + service worker to become an installable PWA.
