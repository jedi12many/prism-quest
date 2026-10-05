/* Overlay: building the camp (js/ui.js renderBase / upgradeBuilding).
 * Loaded from disk on demand into the overlay window (see ovl() in save.c).
 * Each building costs gems, raw or polished, per level; what it gives comes
 * from bld_eff[] (data.c), which eff() adds in. */
#include <string.h>
#include "game.h"

#pragma code-name("OVBUILDCODE")
#pragma rodata-name("OVBUILDDATA")
#pragma bss-name("OVBUILDDATA")             /* (BSS proper is full) */

static const char *const bld_level[NBLD][BLD_MAX] = {
    { "Cozy Cabin", "Timber Lodge", "Stone Manor" },
    { "Camp Stove", "Proper Kitchen", "Royal Bakery" },
    { "Polishing Bench", "Gem Workshop", "Prism Factory" },
    { "Hay Paddock", "Unicorn Stalls", "Radiant Stables" },
    { "Practice Dummy", "Sparring Yard", "Hero's Arena" },
    { "Palisade", "Stone Walls", "Prism Citadel" },
};
static const char *const bld_desc[NBLD] = {     /* (the numbers show below) */
    "Home sweet home: rest here to heal.",
    "Hearty meals, and faster resting.",
    "Precision tools for finer polishing.",
    "Pampered unicorns fight harder.",
    "Daily drills for a mightier Bonk.",
    "A fortress wall around your camp.",
};
/* how each effect reads, after its number */
static const char *const bld_unit[NBLD][2] = {
    { " max HP", 0 }, { " max HP", 0 }, { "% polish luck", 0 },
    { "% unicorn power", 0 }, { "% Bonk", "% crit" }, { " defense", 0 },
};
#define WALLS_NEED 2                        /* the walls need a House at level 2 */

#define LIST_Y 3
#define INFO_Y 11

/* the building in hand (cc65 makes far smaller code of file-level state
 * than of parameters and repeated indexing) */
#define sel build_sel                        /* (resident: where to open) */
static u8 lvl;
static const Eff *eff_of;                   /* bld_eff[sel] */
static const u8 *cost;                      /* bld_cost[sel][lvl]: the next level's */
static u8 i, y;

static void pick(void)
{
    lvl = P.base[sel];
    eff_of = bld_eff[sel];
    cost = bld_cost[sel][lvl == BLD_MAX ? 0 : lvl];
}

/* "+24 max HP" etc, at level l */
static void sb_bonus(u8 l)
{
    const char *const *unit = bld_unit[sel];
    sb_str("+"); sb_num(eff_of[0].val * l); sb_str(unit[0]);
    if (eff_of[1].key) { sb_str(", +"); sb_num(eff_of[1].val * l); sb_str(unit[1]); }
}

static u8 locked(void) { return sel == B_WALLS && P.base[B_HOUSE] < WALLS_NEED; }

/* the next level's gems: listed from row y if `show`; 1 if they're all there */
static u8 gems(u8 show)
{
    u8 ok = 1, m, n;
    u16 have;
    const u8 *c = cost;
    for (i = 0; i < 3; ++i, c += 2) {
        if (!(n = c[1])) break;
        have = gem_stock(m = c[0]);
        if (have < n) ok = 0;
        if (!show) continue;
        put_ch(2, y, CH_GEM, mineral_color[m]);
        sb_reset(); sb_str(mineral_name[m]); sb_str(" "); sb_num(have); sb_str("/"); sb_num(n);
        put_str(4, y++, sb, have < n ? RED : WHITE);
    }
    return ok;
}

static const char *const lv_text[BLD_MAX + 1] = { "", "Lv1", "Lv2", "MAX" };

static void draw_list(void)
{
    u8 b, l;
    const char *const *lv;
    clear_rows(LIST_Y, LIST_Y + NBLD - 1);
    for (b = 0, y = LIST_Y; b < NBLD; ++b, ++y) {
        l = P.base[b];
        lv = bld_level[b];
        put_ch(0, y, b == sel ? CH_POINTER : 0, YELLOW);
        put_str(2, y, bld_name[b], b == sel ? YELLOW : WHITE);
        put_str(20, y, l ? lv[l - 1] : (const char *)"-", l ? CYAN : GREY);
        put_str(36, y, lv_text[l], l == BLD_MAX ? YELLOW : GREY);
    }
}

static void draw_info(void)
{
    clear_rows(INFO_Y, 23);
    put_str(1, INFO_Y, bld_name[sel], YELLOW);
    put_str(1, INFO_Y + 1, bld_desc[sel], WHITE);
    y = INFO_Y + 3;
    if (lvl) { sb_reset(); sb_str("Now: "); sb_bonus(lvl); put_str(1, y++, sb, LTGREEN); }
    if (lvl == BLD_MAX) { put_str(1, y + 1, "Fully built!", YELLOW); return; }
    sb_reset(); sb_str(lvl ? "Next: " : "Build: "); sb_str(bld_level[sel][lvl]);
    put_str(1, y++, sb, CYAN);
    sb_reset(); sb_str("  "); sb_bonus(lvl + 1);
    put_str(1, y++, sb, CYAN);
    if (locked()) put_str(1, y + 1, "Requires House Lv 2", YELLOW);
    else gems(1);
}

static void redraw(void) { pick(); draw_list(); draw_info(); }

/* fire: build or upgrade it if we can, and say how it went */
static void build(void)
{
    const char *why = 0;
    if (lvl == BLD_MAX) why = "Already as grand as it gets.";
    else if (locked()) why = "Build up the House first.";
    else if (!gems(0)) why = "Not enough gems. Mine some and come back!";
    if (why) { sfx(SFX_BONK); wrap(why, 22, 2, ORANGE); return; }
    for (i = 0; i < 6 && cost[i + 1]; i += 2) consume_gems(cost[i], cost[i + 1]);
    P.base[sel] = lvl + 1;
    if (sel == B_WALLS) deed(DE_WALLS);
    calc_stats();
    sfx(SFX_LEVEL);
    redraw();
    sb_reset(); sb_str(lvl > 1 ? "Upgraded to " : "Built "); sb_str(bld_level[sel][lvl - 1]); sb_str("! ");
    sb_bonus(lvl);
    wrap(sb, 22, 2, LTGREEN);
}

void show_build(void)
{
    u8 in;
    screen_open("Build the camp");
    put_str(1, 1, "Build with gems, raw or polished.", GREY);
    put_str(1, 24, "Up/Down: choose  Fire: build  R: back", BLUE);
    redraw();
    for (;;) {
        in = get_input();
        if (in & IN_UP) { sel = sel ? sel - 1 : NBLD - 1; redraw(); }
        else if (in & IN_DOWN) { sel = sel == NBLD - 1 ? 0 : sel + 1; redraw(); }
        else if (in & IN_FIRE) build();
        else if (in & IN_LEFT) return;
    }
}
