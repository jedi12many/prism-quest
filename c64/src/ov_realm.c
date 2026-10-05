/* Overlay: Sog'naroth's realm (js/game.js buildRealm; the rift down,
 * js/game.js onGate) -- one way in, through the castle's portal; three
 * depths, a guardian holding each rift down shut, and Sog'naroth at the
 * bottom. Its foes are in the big foes' overlay (ov_foes.c).
 * Loaded from disk on demand into the overlay window (see ovl() in save.c). */
#include "game.h"

#pragma code-name("OVREALMCODE")
#pragma rodata-name("OVREALMDATA")
#pragma bss-name("OVREALMDATA")

static u8 x, y, i, f;

/* Sog'naroth's realm (js/game.js buildRealm): 32 x 24 of gloomstone (the
 * grass, flecked purple) pocked with void (the water, black), a winding way
 * through along row 12, its spawn and gazers -- and a rift down, held shut
 * by its guardian, or at the bottom, Sog'naroth */
#define RW 32
#define RH 24
static const i8 wob[RW - 4] = {         /* round(2 sin(0.7 x)), x = 2 .. 29 */
    2, 2, 1, -1, -2, -2, -1, 0, 1, 2, 2, 1, -1, -2, -2, -1, 0, 1, 2, 2, 1, -1, -2, -2, -1, 0, 1, 2,
};
static const u8 realm_pack[3][2] = { { 4, 2 }, { 4, 4 }, { 2, 2 } };   /* spawn, gazers */
#ifdef TEST_NEAR                        /* (tests: the far end three steps east of the way in) */
#define FAR 6
#else
#define FAR 28
#endif

void build_realm(void)
{
    u8 k, n, guard;
    if (!dg.floor) { dg.floor = 1; P.x = 3; P.y = 12; }   /* (a save down here: back to the top) */
    dg.type = DG_REALM;
    dg.tier = 6;
    f = dg.floor - 1;
    mw = RW; mh = RH;
    for (y = 0; y < RH; ++y)
        for (x = 0; x < RW; ++x)
            map[y][x] = x >= 2 && x < RW - 2 && y >= 2 && y < RH - 2 && !chance(14) ? T_GRASS : T_WATER;
    for (x = 2; x < RW - 2; ++x)
        for (y = 11 + wob[x - 2], k = 0; k < 3; ++k, ++y) map[y][x] = T_GRASS;
    for (x = 3; x <= FAR; ++x) map[12][x] = T_GRASS;
#ifndef TEST_EMPTY
    for (k = 0; k < 2; ++k)
        for (n = realm_pack[f][k], guard = 0; n && guard < 250; ++guard) {
            x = 8 + rnd(19); y = 3 + rnd(18);
            if (map[y][x] != T_GRASS || cheb(x, y, FAR, 12) < 3 || cheb(x, y, 3, 12) < 4) continue;
            for (i = 0; i < nmobs && cheb(mobs[i].x, mobs[i].y, x, y) >= 2; ++i) ;
            if (i < nmobs) continue;
            add_mob(x, y, k ? MO_GAZER : MO_SPAWNLING, 40 + rnd(50), 0);
            maybe_elite(4 + dg.floor);              /* the realm crawls with elites */
            --n;
        }
#endif
    dg.has_key = 0;
    if (f < 2) {
        add_gate(FAR, 12, G_CASTLE, CG_UP);
        add_mob(FAR - 1, 12, f ? MO_VOIDMAW : MO_HERALD, 0xFF, 0xFFFF);
    } else add_mob(FAR, 12, MO_SOG, 0xFF, 0xFFFF);
}

void realm_hello(void)
{
    static const char *const hello[3] = {
        "The portal seals behind you. The rain here falls in colours that have no names.",
        "You slip deeper. In the rift's cold quiet you bind your wounds. (+50% HP)",
        "The heart of the gloom. Something enormous is breathing. (+50% HP from the respite)",
    };
    msg(hello[dg.floor - 1]);
}

/* the rift down (the realm's only gate): 2 when it takes you */
u8 realm_gate(void)
{
    if (!dg.has_key) { msg("The rift is held shut from below. Destroy its guardian!"); return 0; }
    P.hp += P.hpmax / 2;                        /* a pocket of cold quiet between depths */
    if (P.hp > P.hpmax) P.hp = P.hpmax;
    ++dg.floor;
    dg.ex = 3; dg.ey = 12;
    return 2;
}
