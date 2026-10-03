# Prism Quest: Rainyday — Commodore 64 port

A work-in-progress port of the browser game to a stock Commodore 64 (64 KB,
1 MHz 6502), written in C with [cc65](https://cc65.github.io/).

## What's in this first slice

- **Title screen and class select:** Prism Mage, Crystal Knight or Unicorn
  Whisperer, each with the web game's base stats and class perks.
- **Drizzlewick:** the 28×18 village with its cottages, camp house, Cloudgate,
  Glassworks kiln, Village Ledger and the four zone signposts. All six villagers
  wander around their posts and talk, using the original dialogue. Pip's,
  Barnaby's and Willow's favors work. Resting in the village heals you.
- **The four zones:** each one is a fresh procedural 34×26 level, generated the
  same way as `buildZone` in `js/game.js`: lakes, forest scatter, a guaranteed
  path to the lair, themed mineral nodes (Prismatite by the lair), monster packs,
  and the gloom champion. Walk over a node to mine it; nodes regrow after 60 s.
- **Monsters:** they wander, chase you within 5 tiles, can ambush you, and
  respawn after 45 s. Beat a champion and its land floods with sunlight, and
  every gloom-thing in it melts away.
- **Turn-based battles:** Bonk, Spell or Run, using the same damage, crit,
  variance, tier-scaling, XP and drop formulas as `js/battle.js` (done in fixed
  point). Poison, Dread, double strikes, regeneration, Prism Shield, Sunflare
  burn, Tide Pop weaken and the Whisperer's bonded unicorn all work.
- **Polishing:** "Polish all" in the Bag cuts every raw gem as Rough, Fine or
  Brilliant, at the web game's odds. Foreman Flint's free **Summon Dwarves**
  crew polishes with a big Brilliant bonus.
- **Spellbook:** craft all ten spells from polished gems, using the original
  recipes. Better cuts give more charges (base + average quality + Echo Casting).
  Crafting only works in Drizzlewick.
- **Power Tree:** each class has 3 branches × 5 tiers, generated from `js/data.js`
  by `tools/gen_data.js`. Skills unlock top-down, and with the level cap of 12
  you can only reach two capstones. Every effect is live: spell, Bonk and crit
  bonuses, polish luck, extra and free charges, mining yield, rare-gem luck,
  XP gain, max HP and defence, stronger shields and healing, regen, Second Wind,
  Last Stand, the once-per-life revive capstones, unicorn power and duration,
  and sure-footed fleeing.
- **Rogue-like death:** when your hero falls, the run ends and you start a new hero.
- **Art:** converted automatically from `js/sprites.js`. Map tiles become
  multicolour characters; the hero and battle portraits become stacked hi-res
  hardware sprites. The 8×8 font is hand-drawn, so no Commodore ROM data is used.
- **Sound:** short SID sound effects.

**Not ported yet:** loot and gear,
camp building, dungeons, Prism Facets, pacts, elites, the Rainycastle and the
realm, saving to disk, and music.

## Controls

| | |
|---|---|
| Move | Joystick in port 2, or W A S D |
| Talk | Walk into a villager |
| Fight | Walk into a monster |
| Confirm, next page | Fire, Space or Return |
| Camp menu (Bag, Spellbook, Power Tree, Ledger) | Fire while standing still |
| Bag / Spellbook / Power Tree | I / C / T |
| Back out of a menu | Left, R or RUN/STOP |
| Battle menu | Left/right then fire, or **B**onk, **S**pell, **R**un |

## Build and run

```
sudo apt install cc65 vice     # node is also needed, for the asset converter
cd c64
make                           # -> build/prismquest.prg
make run                       # autostarts it in VICE (needs a VICE with the C64 ROMs)
```

On a real C64 (SD2IEC, 1541 Ultimate and so on): `LOAD"PRISMQUEST.PRG",8,1`, then `RUN`.

## Headless testing

Ubuntu's VICE package doesn't ship Commodore's copyrighted ROMs. The game
doesn't need them, because it banks the ROMs out and drives the hardware
directly. `tools/stubroms.py` writes placeholder ROMs, and `tools/shot.sh`
boots VICE on them under Xvfb, loads the program through the monitor, runs it
for a fixed number of CPU cycles and saves a screenshot.

Test builds can replay a scripted joystick (`test/*.h`):

```
make shot SCRIPT=test/village.h CYCLES=9000000    # walk to the Mayor and talk
make shot SCRIPT=test/battle.h  CYCLES=120000000  # Knight fights through Bogmire
make shot SCRIPT=test/camp.h    CYCLES=15000000   # polish, craft, learn skills
```

A script can also define `TEST_SETUP` (C statements run at the end of
`new_game`) to start the hero with gems or skill points.

## Layout

| File | |
|---|---|
| `src/system.c` | hardware setup, input, text, string builder, SID effects, sprites |
| `src/world.c` | village and zone generation, map rendering, exploration loop, monster AI |
| `src/battle.c` | combat |
| `src/ui.c` | title, stats and levelling, villagers, ledger, game over |
| `src/camp.c` | skill effects, gems and polishing, bag, spellbook, Power Tree, camp menu |
| `src/data.c` | classes, monsters, zones, spells, minerals (numbers from `js/data.js`) |
| `src/assets.c` | **generated** by `tools/gen_assets.js` from `js/sprites.js` |
| `src/tree.c` | **generated** by `tools/gen_data.js` from `js/data.js` (Power Trees, class perks) |

### Memory map

See `prismquest.cfg`.

| Address | Contents |
|---|---|
| `$0801–$CFEF` | program, read-only data and initialised data (about 49 KB) |
| `$E000` | screen |
| `$E400` | 16 sprite slots |
| `$E800` | character set |
| `$F000–$FBFF` | variables (BSS) |
| `$FC00–$FFEF` | C stack |

Everything from `$E000` up is the RAM under the KERNAL ROM. The VIC chip reads
it directly (bank 3), and the CPU can reach it once the ROMs are banked out.
The KERNAL and BASIC ROMs are banked out and interrupts are off. The game syncs
to the raster beam.
