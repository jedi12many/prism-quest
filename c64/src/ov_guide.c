/* Overlay: How to Play (js/ui.js GUIDE_PAGES, openGuide) -- the paged
 * walkthrough, told for the joystick. It opens by itself for the first hero
 * on a disk (deeds.seen_guide), and from the camp menu after.
 * Loaded from disk on demand into the overlay window (see ovl() in save.c). */
#include "game.h"

#pragma code-name("OVGUIDECODE")
#pragma rodata-name("OVGUIDEDATA")
#pragma bss-name("OVGUIDEDATA")

#define NPAGE 10

static const char *const title[NPAGE] = {
    "A hundred years of rain",
    "Getting around",
    "Drizzlewick, your home",
    "The wilds and the champions",
    "Gems are everything",
    "Gear and loot",
    "Dungeons",
    "The shattered Prismblade",
    "The castle and the dark below",
    "One life",
};
static const char *const text[NPAGE] = {
    "Rainyday hasn't seen the sun in a century. Under the endless storm, gloom-things have crept into the land. "
    "You're the hero who will drive back the dark and bring the morning home.\n\n"
    "Fire turns the page.",

    "Walk with the joystick in port 2, or the WASD keys.\n\n"
    "Walk into a villager to talk - they hand out quests and tell the story. Walk into a monster to fight it.\n\n"
    "Stand still and press fire to make camp.",

    "The village is always sunny and safe, and you heal there. Build up your camp, and study your Power Tree "
    "and Spellbook here. The signposts lead out into the wilds.",

    "The wilds redraw themselves every trip. Four gloom champions rule the north, east, west and south. "
    "Beat one and sunlight floods its land for good. The north is deadliest - work up to it.",

    "Walk over a gem node to mine it. In the Bag, Polish all turns raw minerals into gems - by luck, "
    "which the camp Factory and dwarf crews improve. Gems fuel spells, camp upgrades and item sockets.",

    "Monsters drop loot: Common, Magic, Rare, Legendary, Set. Fill five slots: Weapon, Helm, Armor, Boots, Charm. "
    "Facet gems into sockets for good, and collect the Rainbow Raiment set. Salvage the rest.",

    "Each land hides a dungeon two or three floors deep, deadlier as you descend. Beat each floor's Warden "
    "for the key down; the keeper at the bottom guards legendary loot. Climb out any time.",

    "The Prismblade lies broken: one facet hidden in each land, a shy glint in the grass that shines plainly "
    "once the land is sunny. Each is a fine weapon; the Glassworks fuses two to four into something far greater.",

    "Free all four lands and the Rainycastle rises in the clouds. Ride the rainbow up from the Cloudgate and "
    "climb it, floor by guarded floor. Past the top waits a one-way door: no village, no resupply. "
    "Win, and the sun returns for good.",

    "One life. Fall, and your hero is gone; the next one inherits the Motes they leave, for the Sanctuary's upgrades. "
    "Flee when outmatched. The level cap is 12, so build with care.\n\n"
    "This guide is in the camp menu too.",
};

static u8 i, k;

static void page(void)
{
    screen_open(title[i]);
    sb_reset(); sb_num(i + 1); sb_str("/"); sb_num(NPAGE);
    put_str(35, 0, sb, DKGREY);
    wrap(text[i], 2, 19, i ? WHITE : CYAN);
    for (k = 0; k < NPAGE; ++k) put_str(10 + 2 * k, 22, k == i ? "*" : ".", k == i ? YELLOW : DKGREY);
    put_str(1, 24, i == NPAGE - 1 ? "Fire: let's play!   Up: back" : "Fire: next   Up: back   R: close", BLUE);
}

void show_guide(void)
{
    u8 in;
    i = 0;
    page();
    for (;;) {
        in = get_input();
        if (in & (IN_FIRE | IN_RIGHT | IN_DOWN)) {
            if (i == NPAGE - 1) break;
            ++i;
        } else if (in & IN_UP) {
            if (!i) continue;
            --i;
        } else if (in & IN_LEFT) break;     /* (R or RUN/STOP too) */
        sfx(SFX_TALK);
        page();
    }
    if (!deeds.seen_guide) { deeds.seen_guide = 1; deeds_write(); }
}
