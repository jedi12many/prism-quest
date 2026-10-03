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
- **Loot and gear (from `js/loot.js`):** five slots (Weapon, Helm, Armor, Boots,
  Charm) and five rarities (Common, Magic, Rare, Legendary, Set), shown in their
  rarity colours. Items have rolled affixes, an implicit base stat, and 0–2
  sockets. The tables and odds match the web game: affix names ("Keen Rod of
  Bonking"), item-level-scaled rolls, the five legendaries with their lore, and
  the Rainbow Raiment set (3 pieces: +15% spell, +10% crit; all 5: DOUBLE
  RAINBOW). Monsters drop gear 25% of the time; champions always drop a rare,
  legendary or set piece. The **Gear** screen shows what you wear and a
  24-item bag, with `+`/`-` upgrade markers. Item cards show every stat, the
  sockets, lore, a power rating, and the item you're wearing for comparison.
  From a card you can equip, unequip, **facet** a polished gem into a socket
  (the same stats as `GEM_SOCKET_STATS`), or salvage the item (1 Quartz, 3
  for legendaries and sets, and socketed gems come back). Gear stats, including
  dodge (capped at 60%), feed the same effect system as the Power Tree. Every
  hero starts with a common weapon, and a full bag crumbles new drops into 2
  Quartz.
- **Saving to disk:** "Save game" in the camp menu, plus an automatic save
  each time you come home to Drizzlewick, writes `PQ.SAVE` (one block, with a
  magic header, version byte and checksum) to the drive the game was loaded
  from. "Continue from disk" on the title screen brings the hero back. Zones are
  procedural, so a hero saved out in the wilds wakes up in a freshly generated
  zone.
- **Rogue-like death:** when your hero falls, the run ends, the save on disk is
  scratched with them, and you start a new hero.
- **Art:** converted automatically from `js/sprites.js`. Map tiles become
  multicolour characters; the hero and battle portraits become stacked hi-res
  hardware sprites. The 8×8 font is hand-drawn, so no Commodore ROM data is used.
- **Sound:** short SID sound effects.

**Not ported yet:** camp building, dungeons, Prism Facets, pacts, elites, the Rainycastle and the
realm, and music.

## Controls

| | |
|---|---|
| Move | Joystick in port 2, or W A S D |
| Talk | Walk into a villager |
| Fight | Walk into a monster |
| Confirm, next page | Fire, Space or Return |
| Camp menu (Bag, Gear, Spellbook, Power Tree, Ledger, Save) | Fire while standing still |
| Load a saved hero | "Continue from disk" on the title screen |
| Bag / Gear / Spellbook / Power Tree | I / G / C / T |
| Back out of a menu | Left, R or RUN/STOP |
| Battle menu | Left/right then fire, or **B**onk, **S**pell, **R**un |

## Build and run

```
sudo apt install cc65 vice     # node is also needed, for the asset converter
cd c64
make                           # -> build/prismquest.prg + build/prismquest.prg.hi
make d64                       # -> build/prismquest.d64, a 1541 disk with both files
make run                       # autostarts it in VICE (needs a VICE with the C64 ROMs)
```

The game is **two files**: `PRISMQUEST`, which you load and run, and `PQ.HI`
(the `.prg.hi` build output), which the game loads itself at startup. Put both
on a disk (or SD2IEC, 1541 Ultimate and so on), then `LOAD"PRISMQUEST",8,1`
and `RUN`. `make d64` does this for you. Saves go to the same drive, so the
disk must not be write-protected.

## Headless testing

Ubuntu's VICE package doesn't ship Commodore's copyrighted ROMs. The game
mostly doesn't need them, because it banks the ROMs out and drives the
hardware directly. `tools/stubroms.py` writes placeholder ROMs, and
`tools/vicerun.py` boots VICE on them under Xvfb, runs for a fixed number of
CPU cycles and saves a screenshot. The stubs can't load files, so
`vicerun.py` also puts `PQ.HI`, the charset and the sprite art where the
game's own loader would. VICE's monitor `bank ram` mode lets it write under
the I/O chips.

Test builds replay a scripted joystick (`test/*.h`):

```
make shot SCRIPT=test/village.h CYCLES=9000000    # walk to the Mayor and talk
make shot SCRIPT=test/battle.h  CYCLES=150000000  # Knight fights through Bogmire
make shot SCRIPT=test/camp.h    CYCLES=25000000   # polish, craft, learn skills
make shot SCRIPT=test/gear.h    CYCLES=15000000   # inspect and equip gear
```

A script can define `autoplay_loop[]` (with `#define AUTOPLAY_LOOP`), which
is replayed forever after the main script ends.

A script can also define `TEST_SETUP` (C statements run at the end of
`new_game`) to start the hero with gems or skill points.

The stub ROMs can't talk to a disk drive. To test saving, `tools/disktest.sh`
boots VICE with **real** ROMs and a true-emulated 1541. It puts a build on a
`.d64`, autostarts it, screenshots, and lists the disk afterwards. Point
`ROMDIR` at a folder with `kernal`, `basic`, `chargen` and `dos1541` images.
The `data/` folder of the upstream VICE source release has them. They are
copyrighted, so they are not in this repo.

```
S="src/main.c src/system.c src/data.c src/world.c src/battle.c src/ui.c src/camp.c src/gear.c src/loot.c src/save.c src/disk.s src/hi.s src/assets.c src/tree.c"
for t in save load; do cl65 -t c64 -Oirs -Cl -DAUTOPLAY="\"../test/$t.h\"" -C prismquest.cfg -o build/$t.prg $S; done
ROMDIR=~/vice-roms tools/disktest.sh build/save.prg build/disk.d64 build/save.png 400000000  # writes PQ.SAVE
ROMDIR=~/vice-roms tools/disktest.sh build/load.prg build/disk.d64 build/load.png 400000000  # Continue + Bag
```

## Layout

| File | |
|---|---|
| `src/system.c` | hardware setup, input, text, string builder, SID effects, sprites |
| `src/world.c` | village and zone generation, map rendering, exploration loop, monster AI |
| `src/battle.c` | combat |
| `src/ui.c` | title, stats and levelling, villagers, ledger, game over |
| `src/camp.c` | skill effects, gems and polishing, bag, spellbook, Power Tree, camp menu |
| `src/gear.c` | the Gear screen, item cards, faceting gems, equip/salvage |
| `src/loot.c` | the item engine (rarities, affixes, legendaries, set, drops, stats); lives in PQ.HI |
| `src/save.c` | save/load format, autosave, erase-on-death, loading and unpacking PQ.HI |
| `src/hi.s` | PQ.HI's load address and signature |
| `src/disk.s` | assembly: switches the KERNAL in and calls its SAVE/LOAD/OPEN, reads the drive's error channel |
| `src/data.c` | classes, monsters, zones, spells, minerals (numbers from `js/data.js`) |
| `src/assets.c` | **generated** by `tools/gen_assets.js` from `js/sprites.js` |
| `src/tree.c` | **generated** by `tools/gen_data.js` from `js/data.js` (Power Trees, class perks) |

### Memory map

The C64 has 64 KB, and the game uses nearly all of it. See `prismquest.cfg`.

| Address | Contents |
|---|---|
| `$0400–$05EF` | scratch: the save buffer, shared with the map-view buffers |
| `$05F0–$07FF` | monster, node, gate and villager tables (the KERNAL's old text screen) |
| `$0801–$CFEF` | the program: code, read-only data, initialised data (about 50 KB) |
| `$D000–$D7FF` | character set, in the RAM under the I/O chips (only the VIC reads it) |
| `$D800–$DD3F` | sprite art, also under the I/O chips (copied into sprite slots with I/O off) |
| `$E000` | screen |
| `$E400` | sprite slots |
| `$E580–$F67F` | the loot engine, loaded from PQ.HI |
| `$F680–$FF1F` | variables (BSS) |
| `…–$FFEF` | C stack (cc65's `-Cl` keeps locals static, so it only carries arguments) |

Everything from `$E000` up is the RAM under the KERNAL ROM. The VIC chip reads
it directly (bank 3), and the CPU can reach it once the ROMs are banked out.

`PQ.HI` is one file loaded at `$E000`. It holds the sprite art (landing where
the screen will go), the loot engine, and the charset (landing on BSS). At
startup `unpack_hi()` moves the art and the charset under the I/O chips and
clears BSS. Only then is the screen set up.

The KERNAL and BASIC ROMs are banked out and interrupts are off. The game syncs
to the raster beam. The only exception is `disk.s`, which banks the KERNAL in
for the duration of a disk call, touching only its own data below `$D000` and
the hardware stack. The save buffer is below the KERNAL too, so its SAVE and
LOAD can reach it.

### cc65 gotchas

- Watch for 8-bit loop counters. The save grew past 255 bytes, and a `u8`
  counter in its checksum loop then never finished.
- The C stack lives under the KERNAL, so the ROMs must be banked out before
  any C code passes arguments. `main()` does this first thing.
- cc65 2.19 miscompiles a bit test whose shift count is a computed expression,
for example `if (!(P.skills & (1u << (b * 5 + t))))`. It checks only the high
byte of the result, which quietly turned off half of the Power Tree. Test bits
with a shift-and-mask (`(P.skills >> n) & 1`) or put the count in a `u8` first. The game syncs
to the raster beam.
