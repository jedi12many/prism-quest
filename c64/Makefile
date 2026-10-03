# Prism Quest: Rainyday -- Commodore 64 port
# Needs cc65 (apt install cc65) and node; VICE for `make run` / `make shot`.

SRC    := src/main.c src/system.c src/data.c src/world.c src/battle.c src/ui.c src/camp.c src/assets.c src/tree.c
PRG    := build/prismquest.prg
CFLAGS := -t c64 -Oirs -Cl
# memory layout: see prismquest.cfg
LDFLAGS := -C prismquest.cfg -m build/prismquest.map

all: $(PRG)

src/assets.c src/assets.h: tools/gen_assets.js ../js/sprites.js
	node tools/gen_assets.js

src/tree.c src/tree.h: tools/gen_data.js ../js/data.js
	node tools/gen_data.js

$(PRG): src/assets.h src/tree.h $(SRC) src/game.h | build
	cl65 $(CFLAGS) $(LDFLAGS) -o $@ $(SRC)
	@rm -f src/*.o
	@echo "built $@ ($$(stat -c %s $@) bytes)"

build:
	mkdir -p build

# run in VICE (uses the real ROMs if your VICE has them)
run: $(PRG)
	x64sc -autostart $(PRG)

# headless smoke test: boot on stub ROMs, replay a scripted joystick, screenshot.
#   make shot SCRIPT=test/battle.h CYCLES=20000000
SCRIPT ?= test/title.h
CYCLES ?= 4000000
shot: src/assets.h src/tree.h $(SRC) src/game.h $(SCRIPT) | build
	cl65 $(CFLAGS) -DAUTOPLAY='"../$(SCRIPT)"' $(LDFLAGS) -o build/test.prg $(SRC)
	@rm -f src/*.o
	tools/shot.sh build/test.prg build/$(basename $(notdir $(SCRIPT))).png $(CYCLES)

clean:
	rm -rf build src/*.o

.PHONY: all run shot clean
