/* Overlay: the deeds (js/achievements.js, js/data.js ACHIEVEMENTS) -- their
 * names and hints, telling of new ones (and writing PQ.DEEDS then), and the
 * Deeds page. (Reading and writing the file: kit.c.)
 * Loaded from disk on demand into the overlay window (see ovl() in save.c). */
#include <string.h>
#include "game.h"

#pragma code-name("OVDEEDSCODE")
#pragma rodata-name("OVDEEDSDATA")
#pragma bss-name("OVDEEDSDATA")


static const char *const name[NDEED] = {
    "First Light", "Four Dawns", "Stormbreaker", "Sunbringer", "Glasssmith", "All Colors, One Light",
    "Glint-Eyed", "Keeper of Keepers", "Aura Breaker", "Hi-Ho", "Best Friends", "Devil's Due",
    "Heart of Drizzlewick", "Before Supper", "Untouchable", "Triple Crown", "Bottom Floor", "Castle Doctrine",
};
static const char *const desc[NDEED] = {
    "Bring the sun back to one land.",
    "Restore all four lands in one run.",
    "Defeat the master of the Rainycastle.",
    "Banish the gloom and restore the sun.",
    "Fuse your first prism weapon.",
    "Forge THE PRISMBLADE.",
    "Unearth all four Prism Facets in one run.",
    "Defeat all three dungeon keepers.",
    "Slay 25 elite monsters.",
    "Summon the dwarf crew.",
    "Summon a unicorn in battle.",
    "Beat a champion under a Gloom Pact.",
    "Do all three villager favors in one run.",
    "Restore the sun in under 40 minutes.",
    "Win, never falling below 30% health.",
    "Restore the sun with every class.",
    "Reach the third floor of a dungeon.",
    "Raise the camp walls.",
};
/* Grandma's wisdom, for the ones not yet done */
static const char *const hint[NDEED] = {
    "Every dawn starts with one sunbeam.",
    "North, east, west, south: all four.",
    "Whatever rules that castle can fall.",
    "Someone must see this nightmare through.",
    "The kiln is cold. Feed it two colors.",
    "Four facets. One blade.",
    "Four glints, for patient eyes.",
    "A troll, a statue, a ghost.",
    "Hit the shiny ones, twenty-five times.",
    "Flint's crew works for gems.",
    "Whistle for a friend with a horn.",
    "Bargain with the gloom, then win.",
    "Pip, Barnaby and Willow need you.",
    "My stew takes forty minutes. Race it.",
    "Barely muss your hair.",
    "The sun loves all three classes.",
    "Some holes go down, and down again.",
    "Good walls make the gloom sulk.",
};

static u8 i, n;

static const u8 bit[8] = { 1, 2, 4, 8, 16, 32, 64, 128 };
static u8 k;
/* deed id in a set of three bytes. (In steps: cc65 -Oirs made
 * `set[id >> 3] & bit[id & 7]` take whatever X held as the address's high byte.) */
static u8 has(const u8 *set, u8 id)
{
    k = id >> 3;
    k = set[k];
    return k & bit[id & 7];
}
#define done(id) has(deeds.got, id)

void deeds_tell(void)
{
    for (i = 0; i < NDEED; ++i)
        if (done(i) && !has(deeds_told, i)) {
            sfx(SFX_LEVEL);
            sb_reset(); sb_str("Deed done: "); sb_str(name[i]); sb_str("!");
            say(sb, desc[i]);
        }
    memcpy(deeds_told, deeds.got, sizeof(deeds_told));
    deeds_write();
}

static void draw(u8 sel)
{
    for (i = 0; i < NDEED; ++i) {
        put_ch(1, 3 + i, i == sel ? CH_POINTER : 0, YELLOW);
        if (done(i)) { put_ch(3, 3 + i, CH_STAR, YELLOW); put_str(5, 3 + i, name[i], i == sel ? YELLOW : WHITE); }
        else put_str(5, 3 + i, "...", i == sel ? YELLOW : DKGREY);
    }
    clear_rows(21, 22);
    if (done(sel)) wrap(desc[sel], 21, 2, CYAN);
    else { sb_reset(); sb_str("Grandma: \""); sb_str(hint[sel]); sb_str("\""); wrap(sb, 21, 2, PURPLE); }
}

/* the Ledger of Deeds: up/down to read them; and the chronicle of runs */
void show_deeds(void)
{
    u8 sel = 0, in;
    screen_open("The Ledger of Deeds");
    for (n = 0, i = 0; i < NDEED; ++i) if (done(i)) ++n;
    sb_reset(); sb_num(n); sb_str("/"); sb_num(NDEED); sb_str(" deeds done");
    put_str(23, 0, sb, CYAN);
    sb_reset(); sb_str("Runs "); sb_num(deeds.runs); sb_str("  Suns "); sb_num(deeds.wins); sb_str("  Lost "); sb_num(deeds.losses);
    if (deeds.best) { sb_str("  Best "); sb_num(deeds.best / 60); sb_str(" min"); }
    put_str(1, 23, sb, GREY);
    put_str(1, 24, "Up/Down  R: back", BLUE);
    draw(sel);
    for (;;) {
        in = get_input();
        if (in & IN_UP) { sel = sel ? sel - 1 : NDEED - 1; draw(sel); }
        else if (in & IN_DOWN) { sel = sel == NDEED - 1 ? 0 : sel + 1; draw(sel); }
        else if (in & (IN_LEFT | IN_FIRE)) return;
    }
}
