/* Overlay: the Rainycastle (js/game.js buildClouds, claimCastle; js/battle.js
 * the guardians' and the Wyrm's falls).
 * Loaded from disk on demand into the overlay window (see ovl() in save.c).
 * Its foes' portraits, names, battle cries and falls are in the big foes'
 * overlay (ov_foes.c), loaded for their fights.
 *
 * Three floors in the clouds, 22 x 14: the rainbow down on the west side of
 * each, a stair up on the east of the first two (sealed until the floor's
 * guardian falls), and the Rainwyrm on its throne at the top. Beaten
 * guardians stay beaten (P.castle). Once the Wyrm's hoard is claimed, the
 * throne is a forward base: rest, craft and train there. */
#include "game.h"

#pragma code-name("OVCASTLECODE")
#pragma rodata-name("OVCASTLEDATA")
#pragma bss-name("OVCASTLEDATA")

#define W 22
#define H 14

/* each floor: four holes to the sky, or the keep's six pillars (x, y) */
static const u8 holes[3][8] = {
    { 7, 4, 12, 9, 15, 4, 5, 8 },
    { 7, 5, 7, 9, 11, 4, 11, 10 },      /* (and 15, 5 and 15, 9: below) */
    { 8, 5, 13, 4, 6, 9, 12, 10 },
};
/* each lower floor's guardian and its three swift (then cursed) attendants */
static const u8 guardian[2] = { MO_SENTINEL, MO_RAINCALLER };
static const u8 pack[2][9] = {
    { 8, 5, MO_BAT, 11, 9, MO_BAT, 13, 5, MO_GAZER },
    { 8, 4, MO_GAZER, 9, 10, MO_BAT, 13, 7, MO_GAZER },
};
static const u8 pack_elite[2] = { EL_SWIFT, EL_CURSED };

static u8 x, y, i, f;
static const u8 *p;

void build_castle(void)
{
    if (!dg.floor) {                            /* the lowest floor still guarded */
        dg.floor = P.castle & CA_FLOOR1 ? (P.castle & CA_FLOOR2 ? 3 : 2) : 1;
        P.x = 4; P.y = 8;
    }
    if (P.main_quest == 3) P.main_quest = 4;    /* up at last */
    dg.type = DG_CASTLE;
    f = dg.floor - 1;
    dg.tier = f ? 6 : 5;
    mw = W; mh = H;
    for (y = 0; y < H; ++y)
        for (x = 0; x < W; ++x)
            map[y][x] = x >= 2 && x <= 19 && y >= 3 && y <= 11 ? T_GRASS : T_WATER;
    p = holes[f];
    for (i = 0; i < 8; i += 2) map[p[i + 1]][p[i]] = f == 1 ? T_WALL : T_WATER;
    add_gate(3, 7, G_CASTLE, CG_DOWN);
    if (f == 1) map[5][15] = map[9][15] = T_WALL;
    if (f < 2) {
        add_gate(19, 7, G_CASTLE, CG_UP);
        dg.has_key = (P.castle >> f) & 1;
        if (dg.has_key) return;                 /* (a cleared floor stays quiet) */
        add_mob(16, 7, guardian[f], 0xFF, 0xFFFF);
#ifndef TEST_EMPTY                              /* (tests: no attendants) */
        for (p = pack[f], i = 0; i < 9; i += 3) {
            add_mob(p[i], p[i + 1], p[i + 2], 50 + rnd(100), 0);
            mob_elite[nmobs - 1] = pack_elite[f];
        }
#endif
        return;
    }
    /* the throne: the keep behind it, and the Wyrm -- or its hoard, or the way below */
    map[6][17] = map[6][18] = map[7][17] = map[7][18] = T_WALL;
    if (!(P.castle & CA_WYRM)) add_mob(15, 7, MO_WYRM, 0xFF, 0xFFFF);
    else if (!(P.castle & CA_CLAIMED)) add_gate(15, 7, G_CASTLE, CG_HOARD);
    else if (!(P.castle & CA_SUN)) add_gate(15, 8, G_CASTLE, CG_PORTAL);   /* (sealed for good, after) */
}

void castle_hello(void)
{
    static const char *const hello[3] = {
        "The Rainycastle looms ahead, wrapped in storm... Each floor's guardian seals the stair up.",
        "You climb into the rain halls. The storm sings louder here.",
        "The throne floor. The air itself is holding its breath...",
    };
    if (P.castle & CA_SUN) msg("The castle stands quiet in the sunshine now. Rest, train and craft here.");
    else if (dg.floor == 3 && (P.castle & CA_CLAIMED)) msg("Your castle now: rest, train and craft here before you brave the dark.");
    else msg(hello[dg.floor - 1]);
}

/* the portal down: one way. Fire steps through, anything else turns back */
static u8 dare(void)
{
    say("The portal", "Beyond it lies the realm the rain comes from. Nobody has seen it and returned. THERE IS NO WAY BACK: "
                      "no village, no gems, no resupply - only the skills and spell charges you carry right now.");
    msg("Step through? Fire: yes   Any direction: turn back");
    do { wait_frame(); input_poll(); } while (!in_new);
    msg_clear();
    return in_new & IN_FIRE;
}

/* the Wyrm's hoard: brilliant gems, and two legendaries (or a set piece) */
static void claim(u8 gi)
{
    static const u8 hoard[NMIN] = { 0, 2, 2, 2, 2, 2, 3 };
    static Item it;
    for (i = 0; i < NMIN; ++i) P.polished[i][Q_BRILLIANT] += hoard[i];
    for (i = 0; i < 2; ++i) {
        roll_item(&it, 10, i && chance(50) ? R_SET : R_LEGEND, 0xFF);
        if (!give_item(&it)) P.raw[QUARTZ] += 2;
    }
    P.castle |= CA_CLAIMED;
    sfx(SFX_LEVEL);
    say(0, "You claim the Rainwyrm's hoard - brilliant gems and two legendary treasures - and the RAINYCASTLE itself! "
           "This keep is yours now: rest, train and craft here before you brave the dark.");
    gates[gi].zone = CG_PORTAL;                 /* the way below opens beside it */
    gates[gi].y = 8;
    gate_t[gi] = T_CLOUDGATE;
    queue_tile(15, 7);
    queue_tile(15, 8);
    msg("A portal swirls open where the hoard lay.");
}

static u8 go(u8 floor, u8 x, u8 y) { dg.floor = floor; dg.ex = x; dg.ey = y; return 2; }

u8 castle_gate(u8 gi)
{
    if (gates[gi].kind == G_CLOUD) {            /* the village's Cloudgate */
        if (P.main_quest >= 3) return go(0, 4, 8);
        say("The Cloudgate", "An old rainbow arch, cold and dormant. The Mayor says it only wakes once all four lands shine.");
        return 0;
    }
    switch (gates[gi].zone) {
    case CG_DOWN:
        return 1;
    case CG_UP:
        if (dg.has_key) return go(dg.floor + 1, 4, 7);
        msg("The stair is sealed by storm-wards. Defeat this floor's guardian!");
        break;
    case CG_HOARD:
        claim(gi);
        break;
    default:                                    /* CG_PORTAL */
        if (!dare()) break;
        P.castle |= CA_REALM;
        P.main_quest = 6;
        return go(1, 3, 12);
    }
    return 0;
}
