# Prism Quest: Rainyday -- Commodore 64 port
# Needs cc65 (apt install cc65) and node; VICE for `make run` / `make shot`.

SRC    := src/main.c src/system.c src/data.c src/world.c src/battle.c src/ui.c src/kit.c src/bag.c src/gear.c \
          src/loot.c src/items.c src/save.c src/rain.c src/rainirq.s src/scroll.s src/input.s src/disk.s src/music.s src/musicdata.s src/hi.s src/ovl.s src/assets.c src/tree.c \
          src/ov_title.c src/ov_talk_a.c src/ov_talk_b.c src/ov_camp.c \
          src/ov_tree_mage.c src/ov_tree_knight.c src/ov_tree_whisperer.c src/ov_build.c src/ov_ledger.c src/ov_save.c src/ov_dungeon.c src/ov_lands.c src/ov_dig.c src/ov_glass.c src/ov_pact.c
OVLS   := 1 2 3 4 5 6 7 8 9 10 11 12 13 14
PRG    := build/prismquest.prg
CFLAGS := -t c64 -Oirs -Cl
# memory layout: see prismquest.cfg
LDFLAGS := -C prismquest.cfg

all: $(PRG)

src/assets.c src/assets.h src/assets.inc: tools/gen_assets.js tools/heroes.js tools/monsters.js ../js/sprites.js
	node tools/gen_assets.js

src/musicdata.s: tools/gen_music.js tools/music.js
	node tools/gen_music.js

src/tree.c src/tree_text.h src/tree.h: tools/gen_data.js ../js/data.js
	node tools/gen_data.js

$(PRG): src/assets.h src/tree.h src/tree_text.h src/ov_tree.inc $(SRC) src/game.h | build
	cl65 $(CFLAGS) $(LDFLAGS) -m build/prismquest.map -o $@ $(SRC)
	@rm -f src/*.o
	@echo "built $@ ($$(stat -c %s $@) bytes)"

build:
	mkdir -p build

# a 1541 disk image with the game on it (saves go on the same disk)
D64 := build/prismquest.d64
d64: $(PRG)
	rm -f $(D64)
	c1541 -format "prism quest,pq" d64 $(D64) -write $(PRG) prismquest -write $(PRG).hi pq.hi \
	  $(foreach n,$(OVLS),-write $(PRG).$(n) pq.ov$(n)) >/dev/null
	@echo "built $(D64)"

# run in VICE (uses the real ROMs if your VICE has them)
run: $(PRG)
	x64sc -autostart $(PRG)

# headless test: real ROMs (ROMDIR=...) + virtual drive, scripted joystick, screenshot.
#   make shot SCRIPT=test/battle.h CYCLES=20000000
SCRIPT ?= test/title.h
CYCLES ?= 30000000
shot: src/assets.h src/tree.h $(SRC) src/game.h $(SCRIPT) | build
	cl65 $(CFLAGS) $(DEFS) -DAUTOPLAY='"../$(SCRIPT)"' $(LDFLAGS) -m build/test.map -o build/test.prg $(SRC)
	@rm -f src/*.o
	tools/vicerun.py build/test.prg build/$(basename $(notdir $(SCRIPT))).png $(CYCLES)

clean:
	rm -rf build src/*.o

.PHONY: all run shot d64 clean
