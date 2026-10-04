/* Overlay: the dungeons' floors (js/game.js buildDungeon, genCave/genRuins/
 * genHouse).
 * Loaded from disk on demand into the overlay window (see ovl() in save.c).
 *
 * A floor is 32 x 24: the way out where you came in; on every floor but the
 * last, a locked stair down guarded by a Warden that carries its key; on the
 * last, the dungeon's keeper. (Written with globals and small helpers: cc65
 * makes far smaller code of them.) */
#include "game.h"

#pragma code-name("OVDUNGEONCODE")
#pragma rodata-name("OVDUNGEONDATA")
#pragma bss-name("OVDUNGEONDATA")

#define W 32
#define H 24

static const u8 floor_tile[NDUNGEON] = { T_PATH, T_PATH, T_GRASS2 };
static const u8 wall_tile[NDUNGEON] = { T_ROCK, T_WALL, T_WALL };
static const u8 keeper[NDUNGEON] = { MO_TROLL, MO_REVENANT, MO_POLTERGEIST };
/* who lives here: three kinds, how many of each */
static const u8 dweller[NDUNGEON][3] = { { MO_BAT, MO_GOLEM, MO_GAZER }, { MO_SHROOM, MO_GOLEM, MO_GAZER },
                                         { MO_BAT, MO_GAZER, MO_SPAWNLING } };
static const u8 dwellers[NDUNGEON][3] = { { 5, 2, 2 }, { 3, 3, 2 }, { 4, 4, 2 } };

static u8 fl, wl;                       /* this dungeon's floor and wall tiles */
static u8 ex, ey, bx, by;               /* the entry, and the far end (the stair or the keeper) */
static u8 x, y, i, k, n;
static u8 *row;

static u8 dist(u8 x1, u8 y1, u8 x2, u8 y2)
{
    u8 dx = x1 > x2 ? x1 - x2 : x2 - x1, dy = y1 > y2 ? y1 - y2 : y2 - y1;
    return dx > dy ? dx : dy;
}

static void rect(u8 x0, u8 y0, u8 x1, u8 y1, u8 t)
{
    for (; y0 <= y1; ++y0) for (row = map[y0], x = x0; x <= x1; ++x) row[x] = t;
}

static void set(u8 cx, u8 cy) { map[cy][cx] = fl; }

/* cellular automaton: random rock, smoothed four times (in place) */
static void cave(void)
{
    rect(2, 2, W - 3, H - 3, fl);
    for (y = 2; y < H - 2; ++y)
        for (row = map[y], x = 2; x < W - 2; ++x) if (chance(46)) row[x] = wl;
    for (n = 0; n < 4; ++n)
        for (y = 2; y < H - 2; ++y)
            for (x = 2; x < W - 2; ++x) {
                k = 0;
                for (i = 0; i < 3; ++i) {
                    row = map[y - 1 + i] + x - 1;
                    k += (row[0] == wl) + (row[1] == wl) + (row[2] == wl);
                }
                map[y][x] = k >= 5 ? wl : fl;
            }
    ex = W / 2; ey = H - 4; bx = W / 2; by = 3;
    rect(ex - 2, ey - 2, ex + 2, ey + 1, fl);
    rect(bx - 2, by - 1, bx + 2, by + 2, fl);
    x = ex; y = ey;                     /* a drunkard's walk up: a guaranteed way through */
    while (y > by) {
        set(x, y);
        if (chance(60)) --y;
        else if (chance(50)) { if (x > 2) --x; }
        else if (x < W - 3) ++x;
        set(x, y);
    }
}

/* seven rooms, each joined to the last by an L-shaped corridor */
static void ruins(void)
{
    u8 rw, rh, rx, ry, cx, cy, px, py, d, most = 0;
    for (k = 0; k < 7; ++k) {
        rw = 4 + rnd(4); rh = 3 + rnd(3);
        rx = 2 + rnd(W - rw - 4); ry = 2 + rnd(H - rh - 4);
        rect(rx, ry, rx + rw - 1, ry + rh - 1, fl);
        cx = rx + (rw >> 1); cy = ry + (rh >> 1);
        if (k) {
            rect(px < cx ? px : cx, py, px < cx ? cx : px, py, fl);
            rect(cx, py < cy ? py : cy, cx, py < cy ? cy : py, fl);
        } else { ex = bx = cx; ey = by = cy; }
        if ((d = dist(cx, cy, ex, ey)) > most) { most = d; bx = cx; by = cy; }
        px = cx; py = cy;
    }
}

/* a haunted house: a 3 x 3 grid of rooms, with doors between neighbours */
#define CW ((W - 2) / 3)
#define CH ((H - 2) / 3)
static void house(void)
{
    u8 gx, gy, x0, y0, mx, my;
    for (gy = 0; gy < 3; ++gy)
        for (gx = 0; gx < 3; ++gx) {
            x0 = 2 + gx * CW; y0 = 2 + gy * CH;
            mx = x0 + (CW >> 1); my = y0 + (CH >> 1);
            rect(x0 + 1, y0 + 1, x0 + CW - 2, y0 + CH - 2, fl);
            if (gx < 2) rect(x0 + CW - 1, my, x0 + CW + 1, my, fl);
            if (gy < 2) rect(mx, y0 + CH - 1, mx, y0 + CH + 1, fl);
            if (gx == 1) {
                if (gy == 2) { ex = mx; ey = my; }
                if (gy == 0) { bx = mx; by = my; }
            }
        }
}

/* a random floor tile into (x, y) */
static void spot(void)
{
    do { x = 2 + rnd(W - 4); y = 2 + rnd(H - 4); } while (map[y][x] != fl);
}

static u8 crowded(u8 d)
{
    for (k = 0; k < nmobs; ++k) if (dist(mobs[k].x, mobs[k].y, x, y) < d) return 1;
    return 0;
}

void build_dungeon(void)
{
    u8 t, guard;
    const u8 *kind = dweller[dg.type], *count = dwellers[dg.type];
    fl = floor_tile[dg.type];
    wl = wall_tile[dg.type];
    mw = W; mh = H;
    rect(0, 0, W - 1, H - 1, wl);
    if (dg.type == DG_CAVE) cave();
    else if (dg.type == DG_RUINS) ruins();
    else house();
#ifdef TEST_NEAR                        /* (tests: the far end two steps east of the entry) */
    bx = ex + 2; by = ey;
    rect(ex, ey - 1, bx + 1, ey + 1, fl);
#endif
    dg.ex = ex; dg.ey = ey;
    add_gate(ex, ey, G_EXIT, 0);

    if (dg.floor >= dg.floors)          /* the bottom: the keeper, holding its ground */
        add_mob(bx, by, keeper[dg.type], 0xFF, 0xFFFF);
    else {                              /* the stair down, and its Warden beside it */
        add_gate(bx, by, G_STAIRS, 0);
        for (y = by - 1; y <= by + 1; ++y)
            for (x = bx - 1; x <= bx + 1; ++x)
                if (dg.warden == 0xFF && map[y][x] == fl && (x != bx || y != by)) {
#ifdef TEST_NEAR
                    x = ex + 1; y = ey;         /* (tests: right between the hero and the stair) */
#endif
                    dg.warden = nmobs;
                    add_mob(x, y, dg.type == DG_HOUSE ? MO_GAZER : MO_GOLEM, 0xFF, 0xFFFF);
                    mob_elite[dg.warden] = EL_ARMORED;   /* (js: an armored elite) */
                }
    }
#ifndef TEST_EMPTY                      /* (tests: no wandering monsters) */
    for (t = 0; t < 3; ++t)
        for (n = count[t], guard = 0; n && guard < 200; ++guard) {
            spot();
            if (dist(x, y, ex, ey) < 4 || dist(x, y, bx, by) < 2 || crowded(2)) continue;
            add_mob(x, y, kind[t], 50 + rnd(100), 0);
            maybe_elite(dg.tier + 1);           /* dungeons crawl with elites */
            --n;
        }
#endif
    /* gems: Prismatite, and three from the zone's own */
    for (t = 0, guard = 0; t < 4 && guard < 200; ++guard) {
        spot();
        if (dist(x, y, ex, ey) < 3 || (x == bx && y == by) || crowded(1)) continue;
        for (k = 0; k < nnodes; ++k) if (nodes[k].x == x && nodes[k].y == y) break;
        if (k < nnodes) continue;
        add_node(x, y, t ? zones[dg.zone].minerals[rnd(4)] : PRISMATITE);
        ++t;
    }
}
