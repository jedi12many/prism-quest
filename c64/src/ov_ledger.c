/* Overlay: the Village Ledger -- the quest, the lands, the favors.
 * Loaded from disk on demand into the overlay window (see ovl() in save.c). */
#include "game.h"

#pragma code-name("OVLEDGERCODE")
#pragma rodata-name("OVLEDGERDATA")
#pragma bss-name("OVLEDGERDATA")

static const char *const pact_name[NPACT] = {
    "Glass Rainbow", "Berserker's Vow", "Hoarder's Bargain", "Turtle's Patience",
    "Unicorn's Fervor", "Nimble Gambit", "Scholar's Focus", "Ascetic's Boon",
};

static const char *const quest_text[8] = {
    "Talk to Mayor Puddle in Drizzlewick.",
    "Take a gate out of the village and defeat the gloom champion in each direction.",
    "The land shines! Report to Mayor Puddle.",
    "Step onto the Cloudgate in the plaza and ride to the Rainycastle.",
    "Climb the Rainycastle and face whatever brews the storm!",
    "Claim the Wyrm's Hoard, then step through the portal - but there is no way back.",
    "Descend to the heart of the gloom and destroy it. No retreat, no resupply.",
    "Rainyday is saved! Bask in the sunshine, Gloombreaker.",
};

void show_ledger(void)
{
    u8 i, k;
    POKE(0xD015, 0);
    cls();
    POKE(0xD021, BLACK);
    put_str(1, 0, "The Village Ledger", YELLOW);
    put_str(1, 2, "Current quest:", PURPLE);
    log_reset(3, 3);
    log_add(quest_text[P.main_quest], WHITE);
    put_str(1, 7, "The four lands:", PURPLE);
    for (i = 0; i < NZONE; ++i) {
        sb_reset(); sb_str(zones[i].dir); sb_str(" - "); sb_str(zones[i].name);
        put_str(2, 8 + i, sb, WHITE);
        put_str(30, 8 + i, (P.zones_cleared & (1 << i)) ? "sunny" : (P.champ_below & (1 << i)) ? "below" : "gloom",
                (P.zones_cleared & (1 << i)) ? YELLOW : (P.champ_below & (1 << i)) ? PURPLE : BLUE);
    }
    put_str(1, 13, "Favors:", PURPLE);
    put_str(2, 14, "Pip's lost frog", WHITE);
    put_str(30, 14, P.pip_stage == 2 ? "done" : P.pip_stage ? "open" : "-", CYAN);
    put_str(2, 15, "Barnaby's cold ovens", WHITE);
    put_str(30, 15, P.baker_stage == 2 ? "done" : P.baker_stage ? "open" : "-", CYAN);
    put_str(2, 16, "Willow's stubborn tulips", WHITE);
    put_str(30, 16, P.willow_stage == 2 ? "done" : P.willow_stage ? "open" : "-", CYAN);
    if (P.pact) { put_str(2, 18, "Gloom Pact", WHITE); put_str(20, 18, pact_name[P.pact - 1], PURPLE); }
    for (i = 0, k = 0; i < NZONE; ++i) if (P.facets & (1 << i)) ++k;
    put_str(2, 17, "Prism Facets found", WHITE);
    put_ch(30, 17, glyph('0' + k), CYAN); put_str(31, 17, "/4", CYAN);
    sb_reset(); sb_str("Kills: "); sb_num(P.kills); sb_str("   Time: "); sb_num(seconds / 60); sb_str(" min");
    put_str(1, 19, sb, WHITE);
    put_str(1, 24, "Fire: back", BLUE);
    wait_fire();
}
