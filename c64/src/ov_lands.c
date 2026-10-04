/* Overlay: growing a zone (js/game.js buildZone) -- loaded for the moment a
 * land is generated, behind the "Through the gate..." screen.
 * Loaded from disk on demand into the overlay window (see ovl() in save.c). */
#include "game.h"

#pragma code-name("OVLANDSCODE")
#pragma rodata-name("OVLANDSDATA")
#pragma bss-name("OVLANDSDATA")

#define ABSD(a, b) ((a) > (b) ? (a) - (b) : (b) - (a))
static u8 clampu(i16 v, i16 lo, i16 hi) { return (u8)(v < lo ? lo : v > hi ? hi : v); }

/* a directional zone: a fresh procedural level with a champion at the far end.
 * (Written with small helpers and globals: cc65 turns the obvious version of
 * this into 3 KB of code.) */
#define ZW 34
#define ZH 26
static u8 gx, gy;                       /* candidate tile */

static void fill(u8 x0, u8 y0, u8 x1, u8 y1, u8 t)
{
    u8 x;
    for (; y0 <= y1; ++y0) for (x = x0; x <= x1; ++x) map[y0][x] = t;
}

/* a random tile at least `m` in from the edges */
static void spot(u8 m)
{
    gx = m + rnd(ZW - 2 * m);
    gy = m + rnd(ZH - 2 * m);
}

static u8 is_grass(u8 x, u8 y) { return map[y][x] == T_GRASS || map[y][x] == T_GRASS2; }

static u8 near_node(u8 d)
{
    u8 i;
    for (i = 0; i < nnodes; ++i) if (cheb(nodes[i].x, nodes[i].y, gx, gy) < d) return 1;
    return 0;
}

static u8 near_mob(u8 d)
{
    u8 i;
    for (i = 0; i < nmobs; ++i) if (cheb(mobs[i].x, mobs[i].y, gx, gy) < d) return 1;
    return 0;
}

static u8 near_dungeon(void)
{
    u8 i;
    for (i = 0; i < ngates; ++i) if (gates[i].kind == G_DUNGEON && cheb(gates[i].x, gates[i].y, gx, gy) < 3) return 1;
    return 0;
}



void build_zone(u8 z)
{
    const ZoneDef *zd = &zones[z];
    u8 i, k, n, ex = zd->entry[0], ey = zd->entry[1], lx = zd->lair[0], ly = zd->lair[1];
    u16 guard;
    i16 dx, dy, rx2, ry2;
    u8 *row;

    blank_map(ZW, ZH);
    /* lakes: 2-3 ellipses */
    for (n = 2 + rnd(2); n; --n) {
        spot(6);
        gy = 5 + rnd(ZH - 10);
        rx2 = 2 + rnd(3); rx2 *= rx2;
        ry2 = 2 + rnd(2); ry2 *= ry2;
        for (i = 2; i < ZH - 2; ++i) {
            dy = i - gy;
            row = map[i];
            for (k = 2; k < ZW - 2; ++k) {
                dx = k - gx;
                if (dx * dx * ry2 + dy * dy * rx2 < rx2 * ry2) row[k] = T_WATER;
            }
        }
    }
    /* forest scatter */
    for (i = 2; i < ZH - 2; ++i) {
        row = map[i];
        for (k = 2; k < ZW - 2; ++k) if (row[k] != T_WATER && chance(9)) row[k] = T_TREE;
    }
    /* clearings at the entry and the lair */
    fill(ex - 2, ey - 2, ex + 2, ey + 2, T_GRASS);
    fill(lx - 2, ly - 2, lx + 2, ly + 2, T_GRASS);
    /* carve a wandering path from entry to lair so it's always traversable */
    gx = ex; gy = ey;
    for (guard = 0; (gx != lx || gy != ly) && guard < 800; ++guard) {
        dx = lx > gx ? 1 : lx < gx ? -1 : 0;
        dy = ly > gy ? 1 : ly < gy ? -1 : 0;
        if (ABSD(lx, gx) > ABSD(ly, gy)) {
            gx = clampu(gx + dx, 3, ZW - 4);
            if (dy && chance(40)) gy = clampu(gy + dy, 3, ZH - 4);
        } else {
            gy = clampu(gy + dy, 3, ZH - 4);
            if (dx && chance(40)) gx = clampu(gx + dx, 3, ZW - 4);
        }
        row = map[gy];
        row[gx] = T_PATH;
        if (gx + 1 < ZW - 2 && row[gx + 1] != T_WATER) row[gx + 1] = T_GRASS;
    }
    /* way-home 2x2 gate at the entry */
    for (i = 0; i < 4; ++i) add_gate(ex - 1 + (i & 1), ey - 1 + (i >> 1), G_HOME, z);

    /* mineral nodes (themed pool); legendary prismatite by the lair */
    for (guard = 0; nnodes < 10 && guard < 3000; ++guard) {
        spot(3);
        if (is_grass(gx, gy) && cheb(gx, gy, ex, ey) >= 3 && !near_node(2))
            add_node(gx, gy, zd->minerals[rnd(4)]);
    }
    add_node(lx + 1, ly + 1, PRISMATITE);
    add_node(lx - 1, ly + 1, PRISMATITE);

    /* 1-2 dungeon entrances, hidden away from the entry and the lair */
    for (n = 1 + chance(50), guard = 0; n && guard < 3000; ++guard) {
        spot(4);
        if (is_grass(gx, gy) && cheb(gx, gy, ex, ey) >= 4 && cheb(gx, gy, lx, ly) >= 4
            && !near_node(1) && !near_dungeon()) {
            add_gate(gx, gy, G_DUNGEON, rnd(NDUNGEON));
            --n;
        }
    }

    /* monsters + the champion (none once the zone is cleared) */
    if (P.zones_cleared & (1 << z)) return;
    for (k = 0; k < 4; ++k)
        for (i = zd->pack_n[k], guard = 0; i && guard < 3000 && nmobs < MAXMON - 1; ++guard) {
            spot(3);
            if (walkable(gx, gy) && cheb(gx, gy, ex, ey) >= 5 && cheb(gx, gy, lx, ly) >= 2
                && !near_mob(3) && node_at(gx, gy) == 0xFF && gate_at(gx, gy) == 0xFF) {
                add_mob(gx, gy, zd->pack_type[k], 50 + rnd(100), 0);
                maybe_elite(zd->tier);
                --i;
            }
        }
    add_mob(lx, ly, zd->champion, 0xFF, 0xFFFF);   /* champions hold their ground */
}

