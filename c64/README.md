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
- **Art:** map tiles are converted automatically from `js/sprites.js` into
  multicolour characters. The heroes and the battle portraits are drawn for
  the C64 at full sprite size, 24×21, and doubled on the title screen and in
  battle:
  - **Heroes** (`tools/heroes.js`): a hi-res black outline and a hi-res detail
    colour over a multicolour fill, five colours in three stacked sprites.
  - **Monsters** (`tools/monsters.js`): an outline and up to three colours, one
    hi-res sprite each (sprites 3–6). They can't use multicolour, because the
    hero's fill owns the shared sprite colours. They're stored as mirrored left
    halves, packed (885 bytes for all eleven), and unpacked into the map's idle
    second screen when a battle starts.

  The 8×8 font is hand-drawn, so no Commodore ROM data is used.
- **The storm:** in gloomy lands it rains, using a raster-interrupt sprite
  multiplexer (`rainirq.s`). Five double-wide hardware sprites are reused seven
  times down the map, giving about 245 animated raindrops from 35 sprite
  images. Each band and column runs its own animation phase, so there's no
  grid. Rain gets heavier in deeper lands. Lightning flashes the screen, and
  thunder follows after a delay of up to a second: SID noise on voice 3,
  rumbling down through a resonant low-pass filter. Beat a champion and the
  rain thins out column by column, then sunlight breaks through. The title
  screen has the storm too.
- **Smooth scrolling:** the map glides 2 pixels a frame at a steady 50 fps,
  under a fixed status panel (HUD and messages) at the top. See *Smooth
  scrolling* below.
- **Sound:** short SID sound effects, plus the thunder.

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

The game is several files on one disk:

| File | Build output | Contents |
|---|---|---|
| `PRISMQUEST` | `prismquest.prg` | the resident game, which you load and run |
| `PQ.HI` | `.prg.hi` | the loot engine, charset and sprite art; loaded at startup |
| `PQ.OV1`–`PQ.OV7` | `.prg.1`–`.prg.7` | overlays, loaded on demand (below) |

`make d64` puts them all on a 1541 image. On a real C64 or in VICE, mount
or insert it, then `LOAD"PRISMQUEST",8,1` and `RUN`. Saves go to the same
drive, so the disk must not be write-protected.

**microSD:** SD2IEC, Pi1541, Kung Fu Flash and the 1541 Ultimate all look
like a disk drive to the C64, and the game only uses the standard KERNAL
LOAD and SAVE calls. Mount `prismquest.d64` and saves go into the image.
Speed depends on the device: SD2IEC on a stock KERNAL and Pi1541 run at
roughly 1541 speed, while JiffyDOS, Kung Fu Flash or a 1541 Ultimate make
every load near-instant.

### Overlays: screens loaded on demand

Screens you open now and then live on disk and load into a shared 3 KB
window at `$C400` when needed. An overlay that's already in the window isn't
reloaded.

| Overlay | Contents | Size |
|---|---|---|
| `PQ.OV1` | title, hero creation, game over | 2.1 KB |
| `PQ.OV2` | dialogue: Mayor Puddle, Grandma Nimbus, Foreman Flint | 2.0 KB |
| `PQ.OV3` | dialogue: Pip, Barnaby, Willow | 2.1 KB |
| `PQ.OV4` | the Spellbook | 2.7 KB |
| `PQ.OV5`–`PQ.OV7` | the Power Tree, one per class (each carries only its own class's text) | 2.6–2.7 KB |

On a stock 1541 each takes roughly 5–7 seconds (about 400 bytes a second);
a "Loading" note shows in the corner meanwhile. Overlays are kept to about
2–3 KB for that reason.

The world, battles, Bag, Gear, Ledger, saving and the camp menu stay
resident, so exploring and fighting never wait on the disk. Moving the
overlays out shrank the resident program from 50 KB to 38 KB, leaving about
10 KB for future resident features. More overlays can be added whenever a
feature doesn't need to be instant.

## Smooth scrolling

The world screen is split by the frame interrupt (`rainirq.s`):

| Lines | |
|---|---|
| rows 0–4 | the status panel: HUD and messages, hi-res text on black, never moves |
| 90–98 | a black bar. ECM + multicolour is an invalid VIC mode that draws black; it hides the map's moving top edge |
| 99–246 | the map, in screen rows 5–24 (40 × 20 characters of 2×2-character tiles), shown 38 columns × 24 rows wide so the edges can scroll |

At line 90 the interrupt switches to the map's fine x/y scroll, screen buffer
and background colour, and at line 250 it switches back. Changing the
vertical scroll mid-screen is dangerous: if a bad line starts in the middle of
a raster line (VSP), some real C64s crash. So the scroll is only written
during lines 90–92, and the scroller only uses the odd values 1, 3, 5 and 7.
Those can't turn any of those lines bad, and with 2-pixel steps they are all
it needs. Late writes are skipped for that frame.

When the camera crosses a character boundary, the whole map moves one
character:

- **Characters** are double-buffered (screens `$E000` and `$C000`). The back
  screen is built as a shifted copy of the front (`scr_copy`, in two halves),
  plus the one new column or row (`render`).
- **Colour RAM** can't be double-buffered. The interrupt shifts it in place
  during the vertical blank (`col_shift`, about 8,000 cycles, finished before
  the beam reaches the map) and swaps the screens.

The interrupt drives the walk. As soon as a step starts, the main loop queues
its frames (scroll registers and hero position) a few frames ahead, and the
interrupt takes one per frame. A slow main-loop frame (a monster stepping, a
message being drawn) therefore never stutters the picture. Each crossing is
planned when the step starts, and its back screen is built in pieces against
that deadline. If a back screen isn't ready in time, the picture holds for one
frame; this is rare.

Tiles that change (monsters and villagers stepping, nodes shimmering) are
queued and redrawn when a frame has time to spare. The heavy parts are
assembly: `compose()` (which tiles and entities fall in a box) and the cell
loop. In C they cost about 20 times as much.

Disk access can't keep the split steady: the KERNAL holds interrupts off while
it waits on the drive. So the screen is blanked during loads in the world, and
the interrupt doesn't touch the scroll registers meanwhile.

## Headless testing

The game loads files from disk as it goes, so tests need a real KERNAL and a
drive. `tools/vicerun.py` builds a `.d64` from a build and boots VICE under
Xvfb with real ROMs. It runs for a fixed number of CPU cycles and saves a
screenshot. Point `ROMDIR` at a folder with `kernal`, `basic`, `chargen` and
`dos1541` images. The `data/` folder of the upstream VICE source release has
them. They are copyrighted, so they are not in this repo.

- **Default drive:** VICE's IEC-level virtual device (`-iecdevice8`). Disk
  access takes almost no emulated time, so tests stay quick.
- **`--truedrive`:** emulates a real 1541, so loads take as long as they would
  on the real thing.
- **A disk path as 4th argument:** keeps that disk between runs, for testing
  saves.

Test builds replay a scripted joystick (`test/*.h`). The game starts about
15M cycles in, after the KERNAL has loaded it.

```
export ROMDIR=~/vice-roms
make shot SCRIPT=test/village.h CYCLES=60000000   # walk to the Mayor and talk
make shot SCRIPT=test/camp.h    CYCLES=90000000   # polish, craft, learn skills
make shot SCRIPT=test/gear.h    CYCLES=50000000   # inspect and equip gear
make shot SCRIPT=test/battle.h  CYCLES=160000000  # Knight fights through Bogmire
make shot SCRIPT=test/save.h    CYCLES=60000000   # then, keeping one disk:
tools/vicerun.py build/test.prg build/save.png 60000000 build/disk.d64
make shot SCRIPT=test/load.h    CYCLES=10         # (just to build it)
tools/vicerun.py build/test.prg build/load.png 80000000 build/disk.d64
```

A script can define `TEST_SETUP` (C statements run at the end of `new_game`)
to start the hero with gems, gear or skill points, and `TEST_SEED` to fix the
random seed so every run builds the same lands. It can also define
`autoplay_loop[]` (with `#define AUTOPLAY_LOOP`), which is replayed forever
after the main script ends.

The scroller has its own scripts and switches, passed as `DEFS=`:

```
make shot SCRIPT=test/scroll.h CYCLES=60000000 DEFS="-DBENCH -DCHECK"   # village laps
make shot SCRIPT=test/zone.h   CYCLES=80000000 DEFS="-DBENCH -DCHECK"   # laps in the storm
make shot SCRIPT=test/home.h   CYCLES=50000000                          # out a gate and home
```

- **`-DBENCH`:** walking never stops. Fights, conversations and dialogue gates
  are skipped. The HUD shows screen swaps (cyan) and frames the picture held
  for want of a back screen (red).
- **`-DGALLERY=n`:** skips the game and shows monster n's battle portrait
  next to the hero (with `test/idle.h`).
- **`-DCHECK`:** after each swap, renders the whole view from scratch into the
  idle back screen and compares it with the screen on show. It prints checks
  (cyan) and mismatches (red), which should be 0.

## Layout

| File | |
|---|---|
| `src/system.c` | hardware setup, input, text, string builder, SID effects, sprites |
| `src/world.c` | village and zone generation, map rendering, exploration loop, monster AI |
| `src/battle.c` | combat |
| `src/ui.c` | title, stats and levelling, villagers, ledger, game over |
| `src/kit.c` | skill effects, gem helpers, the menu kit, camp menu, Ledger, doors into the overlays |
| `src/bag.c` | the Bag: polishing and Summon Dwarves |
| `src/gear.c` | the Gear screen, item cards, faceting gems, equip/salvage |
| `src/ov_*.c` | the overlays: title, the two dialogue halves, Spellbook, Power Tree (`ov_tree.inc`, built once per class) |
| `src/ovl.s` | overlay file headers: load address and signature |
| `src/loot.c` | the item engine (rarities, affixes, legendaries, set, drops, stats); lives in PQ.HI |
| `src/save.c` | save/load format, autosave, erase-on-death, loading PQ.HI, the overlay loader `ovl()` |
| `src/hi.s` | PQ.HI's load address and signature |
| `src/disk.s` | assembly: switches the KERNAL in and calls its SAVE/LOAD/OPEN, reads the drive's error channel |
| `src/rainirq.s` | the frame interrupt: the rain multiplexer, the world's split screen, the camera queue |
| `src/scroll.s` | the scroller's shifts (screen copy, colour RAM), and `compose()` and the cell loop of the map renderer |
| `src/rain.c` | rain frames, lightning, thunder, the sun breaking through |
| `src/input.s` | the keyboard matrix, read in one go |
| `src/data.c` | classes, monsters, zones, spells, minerals (numbers from `js/data.js`) |
| `src/assets.c` | **generated** by `tools/gen_assets.js` from `js/sprites.js`, `tools/heroes.js` and `tools/monsters.js` (the C64 art for the heroes and battle portraits) |
| `src/tree.c`, `tree_text.h` | **generated** by `tools/gen_data.js` from `js/data.js`: Power Tree effects and class perks (resident); skill names and descriptions (overlays) |

### Memory map

The C64 has 64 KB, and the game uses nearly all of it. See `prismquest.cfg`.

| Address | Contents |
|---|---|
| `$0400–$05EF` | scratch: the save buffer, shared with the map-view buffers |
| `$05F0–$07FF` | monster, node, gate and villager tables (the KERNAL's old text screen) |
| `$0801–$BFEF` | the resident program: code, read-only data, initialised data (about 44 KB), then `world.c`'s variables (WBSS, zeroed by `main()`) |
| `$C000–$C3FF` | the map's second screen (the scroller double-buffers) |
| `$C400–$CFEF` | the overlay window: PQ.OV1–7 load here on demand |
| `$D000–$D7FF` | character set, in the RAM under the I/O chips (only the VIC reads it) |
| `$D800–$DD3F` | the battle portraits, packed, also under the I/O chips (then the rain's frames from `$DD40`) |
| `$E000` | screen (the status panel always comes from here) |
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

The KERNAL and BASIC ROMs are banked out. The only interrupt is the VIC's
raster interrupt (vector at `$FFFE`): it drives the rain, and in the world the
split screen and the camera queue. `disk.s` banks the KERNAL in for the
duration of a disk call, touching only its own data below `$D000` and the
hardware stack. It keeps interrupts on if they were on, reached through the
KERNAL's own vector at `$0314`. The save buffer is below the KERNAL too, so
its SAVE and LOAD can reach it.

### C64 and cc65 gotchas

- The KERNAL can re-arm the CIA timer interrupt during disk calls. That never
  mattered while interrupts were off, but the rain enables them. `disk_op`
  silences the CIAs after every call, and the rain handler acknowledges any
  CIA interrupt as a safety net.
- cl65 compiles `foo.c` via a temporary `foo.s` in the same folder and then
  deletes it. Never name an assembly file after a C file (hence `rainirq.s`).
- cc65 drops a bare `PEEK(reg);` statement even though the pointer is
  volatile. Use inline asm (`lda $dc0d`) for reads that matter.
- Sprites must be off during disk I/O. Their DMA steals cycles the KERNAL's
  serial timing needs, so loads stall or bytes arrive corrupted. `disk_op`
  hides them for the length of every call.

- Watch for 8-bit loop counters. The save grew past 255 bytes, and a `u8`
  counter in its checksum loop then never finished.
- The C stack lives under the KERNAL, so the ROMs must be banked out before
  any C code passes arguments. `main()` does this first thing.
- cc65 2.19 miscompiles a bit test whose shift count is a computed expression,
for example `if (!(P.skills & (1u << (b * 5 + t))))`. It checks only the high
byte of the result, which quietly turned off half of the Power Tree. Test bits
with a shift-and-mask (`(P.skills >> n) & 1`) or put the count in a `u8` first.
- Never wait for a raster line with `cpx $D012 / bne`. An interrupt that
  arrives at the very end of the line spins for a whole frame. Wait while the
  line is less than the target.
- In the world, `wait_frame()` waits for the interrupt's frame counter, not a
  raster line. The interrupt's bottom-of-frame work (rain setup, sometimes the
  colour shift) can cover any one line.
- cc65 multiplies for every `array[i].field` access with a non-power-of-two
  struct size. Walk arrays of structs with a pointer.
- BSS (`$F680–$FF1F`) is nearly full. New variables go in `.data` (assembly)
  or WBSS (`world.c`).
