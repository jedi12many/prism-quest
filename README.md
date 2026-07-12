# 💎 Prism Quest 🌈

A mobile-friendly adventure RPG that runs in any browser — no install, no build step.
Mine rare minerals, polish them to a shine, craft dazzling spells (rainbows! unicorns!),
and drive the gloom out of the valley.

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
- **Bag → tap a raw mineral** to polish it: stop the slider in the bright center
  for **Brilliant** quality (better polish = more spell charges).
- **Spellbook**: craft spells from polished gems — Rainbow Beam 🌈, Summon Unicorn 🦄,
  Glitter Bomb 🎆, Stardust Storm 🌟 and more. Charges are consumed when cast,
  so keep mining and crafting.
- **Walk into monsters** to fight (turn-based). Win XP and gem drops.
- **Level up → spend skill points** in your class Power Tree (3 branches × 3 tiers).
- A **Gloom Dragon 🐉** guards the dark corner of the map, where legendary
  **Prismatite** grows. Level up first.

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
