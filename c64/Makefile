# Prism Quest: Rainyday -- Commodore 64 port
# Needs cc65 (apt install cc65) and node; VICE for `make run` / `make shot`.

SRC    := src/main.c src/system.c src/data.c src/world.c src/battle.c src/ui.c src/camp.c src/gear.c src/loot.c src/save.c src/disk.s src/hi.s src/assets.c src/tree.c
PRG    := build/prismquest.prg
CFLAGS := -t c64 -Oirs -Cl
# memory layout: see prismquest.cfg
LDFLAGS := -C prismquest.cfg

all: $(PRG)

src/assets.c src/assets.h: tools/gen_assets.js ../js/sprites.js
	node tools/gen_assets.js

src/tree.c src/tree.h: tools/gen_data.js ../js/data.js
	node tools/gen_data.js

$(PRG): src/assets.h src/tree.h $(SRC) src/game.h | build
	cl65 $(CFLAGS) $(LDFLAGS) -m build/prismquest.map -o $@ $(SRC)
	@rm -f src/*.o
	@echo "built $@ ($$(stat -c %s $@) bytes)"

build:
	mkdir -p build

# a 1541 disk image with the game on it (saves go on the same disk)
D64 := build/prismquest.d64
d64: $(PRG)
	rm -f $(D64)
	c1541 -format "prism quest,pq" d64 $(D64) -write $(PRG) prismquest -write $(PRG).hi pq.hi >/dev/null
	@echo "built $(D64)"

# run in VICE (uses the real ROMs if your VICE has them)
run: $(PRG)
	x64sc -autostart $(PRG)

# headless smoke test: boot on stub ROMs, replay a scripted joystick, screenshot.
#   make shot SCRIPT=test/battle.h CYCLES=20000000
SCRIPT ?= test/title.h
CYCLES ?= 4000000
shot: src/assets.h src/tree.h $(SRC) src/game.h $(SCRIPT) | build
	cl65 $(CFLAGS) -DAUTOPLAY='"../$(SCRIPT)"' $(LDFLAGS) -m build/test.map -o build/test.prg $(SRC)
	@rm -f src/*.o
	tools/vicerun.py build/test.prg build/test.map build/$(basename $(notdir $(SCRIPT))).png $(CYCLES)

clean:
	rm -rf build src/*.o

.PHONY: all run shot d64 clean
