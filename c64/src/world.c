/* Maps, rendering and the exploration loop -- ported from js/game.js. */
#include <string.h>
#include "game.h"

/* this file's variables live in main RAM (WBSS; main() zeroes them): the
 * BSS under the KERNAL is full */
#pragma bss-name("WBSS")

u8 map_id;
u8 mw, mh;
#pragma bss-name(push, "BSS")           /* (the map itself fits back up there) */
u8 map[MAP_H][MAP_W];
#pragma bss-name(pop)
/* the entity tables live in the free RAM at $0400 (see prismquest.cfg) */
#pragma bss-name(push, "LOWBSS")
Mob mobs[MAXMON];
Node nodes[MAXNODE];
Gate gates[MAXGATE];
Npc npcs[NNPC];
#pragma bss-name(pop)
u8 nmobs;
u8 nnodes;
u8 ngates;

static u8 hud_dirty;
u8 gate_t[MAXGATE];                     /* each gate's tile (see compose) */
u8 mob_tile[MAXMON];                    /* each monster's */
static u8 gate_tile(u8 i);
static u8 gate_armed;
static u16 heal_at;

#define ABSD(a, b) ((a) > (b) ? (a) - (b) : (b) - (a))
static u8 cheb(u8 x1, u8 y1, u8 x2, u8 y2)
{
    u8 dx = ABSD(x1, x2), dy = ABSD(y1, y2);
    return dx > dy ? dx : dy;
}

static u8 in_zone(void) { return map_id != MAP_VILLAGE; }
static u8 zone_sunny(void) { return in_zone() && (P.zones_cleared & (1 << map_id)); }

/* ---------- building ---------- */

static void blank_map(u8 w, u8 h)
{
    u8 x, y, t;
    mw = w; mh = h;
    for (y = 0; y < h; ++y)
        for (x = 0; x < w; ++x) {
            if (x < 2 || y < 2 || x >= w - 2 || y >= h - 2) t = T_TREE;
            else t = ((x * 7 + y * 13 + (x ^ y) * 5) % 11 == 0) ? T_GRASS2 : T_GRASS;
            map[y][x] = t;
        }
}

static void add_gate(u8 x, u8 y, u8 kind, u8 zone)
{
    Gate *g = &gates[ngates++];
    g->x = x; g->y = y; g->kind = kind; g->zone = zone;
}

static const u8 village_cottages[5][2] = { { 16, 3 }, { 21, 5 }, { 24, 9 }, { 20, 12 }, { 15, 12 } };
static const u8 village_decor[8][2] = { { 16, 10 }, { 19, 11 }, { 22, 8 }, { 24, 12 }, { 14, 12 }, { 18, 13 }, { 21, 14 }, { 12, 13 } };

static void build_village(void)
{
    u8 i, z;
    blank_map(28, 18);
    for (i = 0; i < 5; ++i) map[village_cottages[i][1]][village_cottages[i][0]] = T_COTTAGE;
    for (i = 0; i < 8; ++i) map[village_decor[i][1]][village_decor[i][0]] = T_FLOWER;
    place_buildings();                        /* your camp */
    add_gate(18, 4, G_CLOUD, 0);
    add_gate(12, 7, G_FORGE, 0);
    add_gate(15, 4, G_BOARD, 0);
    for (z = 0; z < NZONE; ++z)
        for (i = 0; i < 2; ++i) {
            map[zones[z].gate[i][1]][zones[z].gate[i][0]] = T_PATH;
            add_gate(zones[z].gate[i][0], zones[z].gate[i][1], G_ZONE, z);
        }
    for (i = 0; i < NNPC; ++i) {
        npcs[i].x = npc_home[i][0];
        npcs[i].y = npc_home[i][1];
        npcs[i].move_t = 50 + rnd(150);
    }
}

/* the camp: each building, or its empty plot; walls round it once built,
 * with a gap in the south side. (Called again after building.) */
#if T_KITCHEN != T_HOUSE + 1 || T_FACTORY != T_HOUSE + 2 || T_STALLS != T_HOUSE + 3 || T_TRAINING != T_HOUSE + 4 || T_PLOT != T_HOUSE + 5
#error "the camp's tiles must run House .. Training, then the plot (gen_assets.js)"
#endif
#define CAMP_X0 2
#define CAMP_X1 11
#define CAMP_Y0 2
#define CAMP_Y1 11
void place_buildings(void)
{
    u8 x, y;
    u8 *row;
    for (x = 0; x < NBLD - 1; ++x)
        map[bld_xy[x][1]][bld_xy[x][0]] = P.base[x] ? T_HOUSE + x : T_PLOT;
    if (!P.base[B_WALLS]) return;
    row = map[CAMP_Y0];
    for (y = CAMP_Y0; y <= CAMP_Y1; ++y, row += MAP_W)
        for (x = CAMP_X0; x <= CAMP_X1; ++x)
            if (y == CAMP_Y0 || x == CAMP_X0 || x == CAMP_X1 || (y == CAMP_Y1 && (x < 6 || x > 7)))
                row[x] = T_WALL;                /* (the gate: x 6-7 on the south side) */
}

/* the camp building (or plot) at x, y, else 0xFF: walking into one opens
 * the build screen on it */
static u8 camp_plot(u8 x, u8 y)
{
    u8 i;
    for (i = 0; i < NBLD - 1; ++i) if (bld_xy[i][0] == x && bld_xy[i][1] == y) return i;
    return 0xFF;
}

static u8 clampu(i16 v, i16 lo, i16 hi) { return (u8)(v < lo ? lo : v > hi ? hi : v); }

/* (pointers, not mobs[i].x: cc65 multiplies for every indexed field) */
static u8 mob_at(u8 x, u8 y)
{
    u8 i;
    const Mob *m = mobs;
    for (i = 0; i < nmobs; ++i, ++m)
        if (m->x == x && m->y == y && m->alive) return i;
    return 0xFF;
}

static u8 node_at(u8 x, u8 y)
{
    u8 i;
    const Node *n = nodes;
    for (i = 0; i < nnodes; ++i, ++n)
        if (n->x == x && n->y == y) return i;
    return 0xFF;
}

static u8 gate_at(u8 x, u8 y)
{
    u8 i;
    const Gate *g = gates;
    for (i = 0; i < ngates; ++i, ++g)
        if (g->x == x && g->y == y) return i;
    return 0xFF;
}

static u8 npc_at(u8 x, u8 y)
{
    u8 i;
    const Npc *n = npcs;
    if (in_zone()) return 0xFF;
    for (i = 0; i < NNPC; ++i, ++n)
        if (n->x == x && n->y == y) return i;
    return 0xFF;
}

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

static void add_node(u8 x, u8 y, u8 m)
{
    Node *n = &nodes[nnodes++];
    n->x = x; n->y = y; n->mineral = m; n->respawn = 0;
}

static void add_mob(u8 x, u8 y, u8 type, u8 move_t, u16 respawn)
{
    Mob *m = &mobs[nmobs++];
    m->x = m->hx = x; m->y = m->hy = y;
    m->type = type; m->alive = 1; m->move_t = move_t; m->respawn = respawn;
}

static void build_zone(u8 z)
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

    /* monsters + the champion (none once the zone is cleared) */
    if (P.zones_cleared & (1 << z)) return;
    for (k = 0; k < 4; ++k)
        for (i = zd->pack_n[k], guard = 0; i && guard < 3000 && nmobs < MAXMON - 1; ++guard) {
            spot(3);
            if (walkable(gx, gy) && cheb(gx, gy, ex, ey) >= 5 && cheb(gx, gy, lx, ly) >= 2
                && !near_mob(3) && node_at(gx, gy) == 0xFF) {
                add_mob(gx, gy, zd->pack_type[k], 50 + rnd(100), 0);
                --i;
            }
        }
    add_mob(lx, ly, zd->champion, 0xFF, 0xFFFF);   /* champions hold their ground */
}

static void set_palette(void)
{
    u8 bg = GREEN;
    if (in_zone()) bg = zone_sunny() ? zones[map_id].bg_sun : zones[map_id].bg;
    map_bg = bg;                            /* the frame interrupt sets it under the panel */
    POKE(0xD020, in_zone() && !zone_sunny() ? DKGREY : BLACK);
}

void build_map(u8 id)
{
    u8 i;
    map_id = id;
    nmobs = nnodes = ngates = 0;
    if (id == MAP_VILLAGE) build_village();
    else build_zone(id);
    for (i = 0; i < ngates; ++i) gate_t[i] = gate_tile(i);
    for (i = 0; i < nmobs; ++i) mob_tile[i] = monsters[mobs[i].type].tile;
}

u8 walkable(u8 x, u8 y)
{
    u8 t;
    if (x >= mw || y >= mh) return 0;
    t = map[y][x];
    if (t != T_GRASS && t != T_GRASS2 && t != T_FLOWER && t != T_PATH) return 0;
    if (npc_at(x, y) != 0xFF) return 0;
    return 1;
}

/* ---------- rendering: the smooth-scrolling view ----------
 *
 * The map sits in screen rows 5-24: 40 x 20 characters of 2x2-character
 * tiles, on one of two screens (scroll.s). The camera works in pixels; the
 * frame interrupt (rainirq.s) applies the fine scroll, and whenever the
 * camera crosses a character boundary the back screen -- a shifted copy of
 * the front with one new column or row -- is swapped in.
 *
 * The interrupt drives the walk: the main loop queues each step's frames
 * (camera, hero) a few frames ahead, and the interrupt takes one a frame, so
 * the map glides at a steady 50 fps whatever the main loop is busy with. For
 * each crossing queued, the main loop builds the back screen in pieces --
 * copy the top half, the bottom half, draw the new edge (~4,000-8,000 cycles
 * each) -- and the interrupt swaps it in and shifts colour RAM in the
 * vertical blank.
 *
 * An origin is the world character column shown in screen column 0, and the
 * world character row shown in map row 0, plus 2 (the row can be -1: above
 * the map, under the mask at its top edge). */

#define SCR_A ((u8 *)0xE000)
#define SCR_B ((u8 *)0xC000)
#define VW 21                           /* the tiles a 40 x 20 view can touch */
#define VH 11
/* compose buffers: rebuilt on every draw, so they share LOWSCRATCH with the
 * save buffer (save.c) */
#define vt ((u8 *)LOWSCRATCH)
#define vc ((u8 *)(LOWSCRATCH + VW * VH))

/* the camera queue (rainirq.s) */
extern u8 cq[16 * 6];
extern volatile u8 cq_head, cq_n, cq_ready, cq_swaps, cq_done, cq_stalls;
extern volatile u8 vbl;
#define CQ_DEPTH 3                      /* frames queued ahead */
static u8 cq_tail, pushed;              /* where the next goes; how many so far */

static u16 phx, phy;                    /* the hero where the queue leaves him, px */
static u8 foc, forb;                    /* the front screen's origin */
static u8 loc, lorb;                    /* the last queued frame's origin */
static u8 soc, sorb, staged, halves;    /* the back screen being built: origin, dir + 1 */
static u8 roc, rorb;                    /* the origin render() draws for */
/* crossings coming, oldest first: dir + 1, origin, and the frame (counting
 * as pushed does) they show on */
static u8 sw_dir[4], sw_oc[4], sw_orb[4], sw_at[4], sw_head, sw_n, seen_swaps;
/* the step being queued: frames left, direction */
static u8 glide;
static i8 gdx, gdy;
/* steps queued that the hero's still to finish walking: where, and the
 * cq_done count that means he's there */
static u8 arr_x[2], arr_y[2], arr_at[2], arr_n;

static u8 *front(void) { return (sc_front ? SCR_B : SCR_A) + MAP_ROW * 40; }
static u8 *back(void) { return (sc_front ? SCR_A : SCR_B) + MAP_ROW * 40; }

static u8 gate_tile(u8 i)
{
    const Gate *g = &gates[i];
    switch (g->kind) {
    case G_ZONE:  return (g->y == zones[g->zone].gate[0][1] && g->x == zones[g->zone].gate[0][0]) ? T_SIGN : T_PATH;
    case G_HOME:  return (i & 3) == 0 ? T_HOMESIGN : T_PATH;
    case G_CLOUD: return T_CLOUDGATE;
    case G_FORGE: return T_FORGE;
    default:      return T_BOARD;
    }
}

/* the cell loop and compose() -- the tw x th tiles from (c_tx, c_ty - 1)
 * with everything standing on them, into vt/vc -- are in scroll.s: in C they
 * cost ~20 times as much */
extern u8 c_tx, c_ty, c_tw, c_th, prism_col;
void compose(void);
extern u8 r_wx0, r_wy, r_w, r_h, r_cs, r_cty;
extern u8 *r_scr, *r_col;
void render_cells(void);
#if MAP_W != 34                         /* (and PRISMATITE == 6; tile numbers: assets.inc) */
#error "scroll.s needs updating"
#endif

/* draw view cells [sx0, sx0 + w) x [sy0, sy0 + h) for origin (roc, rorb):
 * characters to scr (the first cell; rows 40 apart), colours to col (rows cs
 * apart) */
static void render(u8 sx0, u8 sy0, u8 w, u8 h, u8 *scr, u8 *col, u8 cs)
{
    r_wx0 = roc + sx0; r_wy = rorb + sy0;
    c_tx = r_wx0 >> 1; r_cty = c_ty = r_wy >> 1;
    c_tw = ((r_wx0 + w - 1) >> 1) - c_tx + 1;
    c_th = ((r_wy + h - 1) >> 1) - c_ty + 1;
    compose();
    r_w = w; r_h = h; r_scr = scr; r_col = col; r_cs = cs;
    render_cells();
}

/* redraw one tile: on the front screen, and on a back screen being built */
static u8 dummy[2];
static void tile_on(u8 tx, u8 ty, u8 oc_, u8 orb_, u8 *scr, u8 *col)
{
    i16 sx = (i16)(tx * 2) - oc_, sy = (i16)(ty * 2 + 2) - orb_;
    u8 w = 2, h = 2;
    if (sx < 0) { if (sx < -1) return; sx = 0; w = 1; }
    else if (sx >= 39) { if (sx > 39) return; w = 1; }
    if (sy < 0) { if (sy < -1) return; sy = 0; h = 1; }
    else if (sy >= 19) { if (sy > 19) return; h = 1; }
    roc = oc_; rorb = orb_;
    scr += (u8)sy * 40u + (u8)sx;
    if (col != dummy) col += (u8)sy * 40u + (u8)sx;
    render((u8)sx, (u8)sy, w, h, scr, col, col == dummy ? 0 : 40);
}

/* (never while cq_ready: the interrupt may swap the screens at any moment,
 * and edge[] holds the new edge's colours, which wouldn't see the change) */
static void draw_tile(u8 tx, u8 ty)
{
    tile_on(tx, ty, foc, forb, front(), COLORRAM + MAP_ROW * 40);
    /* (its colours there come from shifting the front's) */
    if (staged) tile_on(tx, ty, soc, sorb, back(), dummy);
}

/* tiles to redraw: monsters and villagers step, nodes shimmer. ~3,500 cycles
 * each, so they wait for frames with time to spare */
#define TQ 48                           /* (16 monsters x old + new spot, nodes) */
static u8 tq_x[TQ], tq_y[TQ], tq_n;
#pragma bss-name(push, "BSS")           /* (room for it up there too) */
static u8 tq_bits[(MAP_W * MAP_H + 7) / 8];   /* one bit a map tile: queued? */
#pragma bss-name(pop)
static const u8 bitv8[8] = { 1, 2, 4, 8, 16, 32, 64, 128 };

/* does tile (x, y) show for origin (oc_, orb_)? */
static u8 on_view(u8 x, u8 y, u8 oc_, u8 orb_)
{
    return (u8)(x * 2 + 1 - oc_) <= 40 && (u8)(y * 2 + 3 - orb_) <= 20;
}

static void queue_tile(u8 x, u8 y)
{
    u16 b;
    if (!on_view(x, y, foc, forb) && !(staged && on_view(x, y, soc, sorb))) return;
    b = y * MAP_W + x;
    if (tq_bits[b >> 3] & bitv8[b & 7]) return;
    if (tq_n == TQ) { if (!cq_ready) draw_tile(x, y); return; }    /* (full: rare) */
    tq_bits[b >> 3] |= bitv8[b & 7];
    tq_x[tq_n] = x; tq_y[tq_n++] = y;
}

static u8 vbl0;                         /* vbl as this frame began */
static u8 frame_left(void)              /* time for ~3,500 cycles more this frame? */
{
    u8 lo = PEEK(0xD012);
    if (vbl != vbl0) return 0;          /* already late */
    if (PEEK(0xD011) & 0x80) return 1;  /* lines 256-311: the frame's barely begun */
    return lo < 100;                    /* (a tile under the map costs ~90 lines) */
}

static void flush_tiles(void)
{
    u16 b;
    u8 n = 2;
    while (tq_n && n-- && !cq_ready && frame_left()) {
        --tq_n;
        b = tq_y[tq_n] * MAP_W + tq_x[tq_n];
        tq_bits[b >> 3] &= ~bitv8[b & 7];
        draw_tile(tq_x[tq_n], tq_y[tq_n]);
    }
}

/* the camera follows the hero, held inside the map. The centring is 4 px
 * off so the camera rests mid-character (x = 4, y = 6 mod 8): no step
 * crosses a character boundary on its first frame */
static u16 limx, limy;                  /* the camera's reach on this map */
static u16 ccx, ccy;
static void cam_for(u16 x, u16 y)
{
    ccx = x < 140 ? 0 : x - 140;
    if (ccx > limx) ccx = limx;
    ccy = y < 66 ? 0 : y - 66;
    if (ccy > limy) ccy = limy;
}
#define OCOL(cx) ((u8)((cx) >> 3))
#define OROW(cy) ((u8)((((cy) + 6) >> 3) + 1))

/* the registers for the hero at (x, y) px: d[0..4] as in the camera queue */
static u8 qe[6];
static void frame_regs(u16 x, u16 y, u8 orb_)
{
    u16 sx;
    cam_for(x, y);
    qe[0] = 0x10 | ((3 + (u8)(orb_ * 8 - 8 - ccy)) & 7);   /* the map starts 0-6 lines down */
    qe[1] = 0x10 | (7 - (ccx & 7));
    sx = 31 - 4 + x - ccx;              /* (24x21: centred on the tile, feet on its floor) */
    qe[2] = sx; qe[3] = sx & 0x100 ? 7 : 0;
    qe[4] = 98 - 5 + y - ccy;
    qe[5] = 0;
}

/* which way the map moves from origin (oc_, orb_) to (toc, torb), + 1 */
static u8 cross_dir(u8 oc_, u8 orb_, u8 toc, u8 torb)
{
    if (toc == oc_ && torb == orb_) return 0;
    return toc > oc_ ? 1 : toc < oc_ ? 2 : torb > orb_ ? 3 : 4;
}

/* a step from (x, y) px, dx/dy 2 px a frame for 8 frames: note its
 * crossings now, so their back screens can be built in good time */
static void plan_step(u16 x, u16 y)
{
    u8 k, toc, torb, d, i, oc_ = loc, orb_ = lorb;
    for (k = 1; k <= 8; ++k) {
        x += gdx * 2; y += gdy * 2;
        cam_for(x, y);
        toc = OCOL(ccx); torb = OROW(ccy);
        if ((d = cross_dir(oc_, orb_, toc, torb)) != 0) {
            i = (sw_head + sw_n) & 3;
            sw_dir[i] = d; sw_oc[i] = toc; sw_orb[i] = torb; sw_at[i] = pushed + k;
            ++sw_n;
            oc_ = toc; orb_ = torb;
        }
    }
}

/* queue the frame with the hero at (x, y) px */
static void push_frame(u16 x, u16 y)
{
    u8 toc, torb, d;
    cam_for(x, y);
    toc = OCOL(ccx); torb = OROW(ccy);
    if ((d = cross_dir(loc, lorb, toc, torb)) != 0) { loc = toc; lorb = torb; }
    frame_regs(x, y, torb);
    qe[5] = d;
    memcpy(cq + cq_tail, qe, 6);
    cq_tail = cq_tail == 15 * 6 ? 0 : cq_tail + 6;
    ++cq_n;                             /* (inc: atomic against the interrupt) */
    ++pushed;
}

/* the interrupt's swaps: the back screen is the front now */
static void scroll_sync(void)
{
    while (seen_swaps != cq_swaps) {
        ++seen_swaps;
        foc = sw_oc[sw_head]; forb = sw_orb[sw_head];
        sw_head = (sw_head + 1) & 3;
        --sw_n;
        staged = 0;
    }
}

/* the back screen as a shifted copy of the front, ten rows at a go */
static void copy_half(void)
{
    scr_copy((staged - 1) * 2 + halves);
    ++halves;
}

/* draw the new edge (characters on the back screen, colours to edge[]) */
static void finish(void)
{
    u8 *b = back();
    roc = soc; rorb = sorb;
    switch (staged) {
    case 1: render(39, 0, 1, 20, b + 39, edge, 1); break;
    case 2: render(0, 0, 1, 20, b, edge, 1); break;
    case 3: render(0, 19, 40, 1, b + 19 * 40, edge, 0); break;
    default: render(0, 0, 40, 1, b, edge, 0); break;
    }
    cq_ready = 1;
}

/* build the next crossing's back screen: a piece a frame, more if its frame
 * is close */
static void scroll_build(void)
{
    u8 left, frames;
    if (!sw_n || cq_ready) return;
    if (!staged) {
        staged = sw_dir[sw_head]; soc = sw_oc[sw_head]; sorb = sw_orb[sw_head];
        halves = 0;
    }
    frames = sw_at[sw_head] - cq_done; /* bottoms of frames before it shows */
    if (frames > 100) frames = 0;       /* (overdue: the picture's holding for it) */
    left = 3 - halves;                  /* pieces to go */
    do {
        if (halves < 2) copy_half();
        else { finish(); break; }
    } while (--left && left + 1 >= frames);   /* (done a frame early: the
                                                 * main loop can run long) */
}

void draw_map(void)
{
    u16 x = P.x * 16, y = P.y * 16;
    __asm__("sei");
    cq_n = cq_ready = 0;
    __asm__("cli");
    seen_swaps = cq_swaps;
    pushed = cq_done;
    cq_tail = cq_head;
    sw_n = staged = glide = tq_n = 0;
    memset(tq_bits, 0, sizeof(tq_bits));
    phx = x; phy = y;
    limx = mw * 16 - 304; limy = mh * 16 - 148;
    cam_for(x, y);
    roc = foc = loc = OCOL(ccx); rorb = forb = lorb = OROW(ccy);
    frame_regs(x, y, forb);
    sc_d011 = qe[0]; sc_d016 = qe[1];
    sc_d018 = sc_front ? 0x04 : 0x84;
    POKE(0xD000, qe[2]); POKE(0xD002, qe[2]); POKE(0xD004, qe[2]);
    POKE(0xD001, qe[4]); POKE(0xD003, qe[4]); POKE(0xD005, qe[4]);
    POKE(0xD010, (PEEK(0xD010) & 0xF8) | qe[3]);
    render(0, 0, 40, 20, front(), COLORRAM + MAP_ROW * 40, 40);
}

void place_player_sprite(void)
{
    hero_sprites(P.cls);
    /* sprites 0-2 only: 3-7 belong to the rain */
    POKE(0xD017, PEEK(0xD017) & 0xF8); POKE(0xD01D, PEEK(0xD01D) & 0xF8);
    POKE(0xD01B, PEEK(0xD01B) & 0xF8);
    POKE(0xD015, PEEK(0xD015) | 0x07);
}

void draw_hud(void)
{
    clear_rows(0, 0);
    put_ch(0, 0, CH_HEART, RED);
    sb_reset(); sb_num(P.hp); sb_str("/"); sb_num(P.hpmax);
    put_str(1, 0, sb, P.hp * 4 < P.hpmax ? RED : WHITE);
    sb_reset(); sb_str("Lv"); sb_num(P.level);
    put_str(9, 0, sb, YELLOW);
    if (P.skill_points) put_ch(8, 0, CH_STAR, YELLOW);   /* unspent skill points */
    sb_reset(); sb_num(P.xp); sb_str("/"); sb_num(xp_next[P.level]); sb_str("xp");
    put_str(14, 0, sb, CYAN);
    if (in_zone()) put_str(40 - strlen(zones[map_id].name), 0, zones[map_id].name, zone_sunny() ? YELLOW : PURPLE);
    else put_str(29, 0, "Drizzlewick", YELLOW);
}

static void redraw_all(void)
{
    if (!prism_col) prism_col = 1;
    cls();
    POKE(0xD016, 0x18);                     /* multicolour tiles */
    set_palette();
    draw_hud();
    arr_n = 0;
    sc_front = 0;                           /* (cls just blanked this one) */
    split_on();
    draw_map();
    place_player_sprite();
    if (in_zone() && !zone_sunny()) {
        storm_start(zones[map_id].tier);
        music(TUNE_WILDS);
    } else music(TUNE_VILLAGE);
}

/* ---------- actions ---------- */

static void travel(u8 id, u8 x, u8 y)
{
    sfx(SFX_GATE);
    POKE(0xD015, 0);
    cls();                                  /* (a new land takes a moment to grow) */
    put_center(12, id == MAP_VILLAGE ? "Home to Drizzlewick..." : "Through the gate...", GREY);
    build_map(id);
    P.map = id;
    P.x = x; P.y = y;
    gate_armed = 0;
    redraw_all();
    if (in_zone()) {
        sb_reset();
        if (zone_sunny()) { sb_str(zones[id].name); sb_str(" basks in sunshine. Gloom-things cannot step into the light."); }
        else { sb_str("You step into "); sb_str(zones[id].name); sb_str(". Somewhere ahead, its gloom champion waits."); }
        msg(sb);
    } else {
        msg("Drizzlewick: always sunny, always safe. Rest here to heal.");
    }
}

static void on_gate(u8 gi)
{
    const Gate *g = &gates[gi];
    switch (g->kind) {
    case G_ZONE:
        travel(g->zone, zones[g->zone].entry[0], zones[g->zone].entry[1]);
        break;
    case G_HOME:
        travel(MAP_VILLAGE, zones[map_id].home[0], zones[map_id].home[1]);
        save_game();                    /* autosave on coming home */
        break;
    case G_CLOUD:
        say("The Cloudgate", "An old rainbow arch, cold and dormant. The Mayor says it only wakes once all four lands shine.");
        break;
    case G_FORGE:
        say("The Glassworks Kiln", "The kiln has been cold for a hundred years. Prism Facets can be fused here - in a later version of this port.");
        break;
    default:
        open_ledger();
        redraw_all();
        break;
    }
}

static void mine(u8 ni)
{
    Node *n = &nodes[ni];
    static const u8 rare[3] = { AQUAMARINE, EMERALD, ROSEOPAL };
    u8 amt = 1 + chance(35) + eff(E_MINEYIELD), luck = eff(E_RARELUCK), b;
    P.raw[n->mineral] += amt;
    n->respawn = seconds + 60;
    sfx(SFX_MINE);
    sb_reset(); sb_str("+"); sb_num(amt); sb_str(" raw "); sb_str(mineral_name[n->mineral]); sb_str("!");
    if (luck && chance(luck)) {
        b = rare[rnd(3)];
        ++P.raw[b];
        sb_str(" Lucky: +1 "); sb_str(mineral_name[b]); sb_str("!");
    }
    msg(sb);
    queue_tile(n->x, n->y);
}

static void zone_cleared(void)
{
    u8 i, n = 0;
    storm_clears();                         /* the rain thins out, then the sun */
    P.zones_cleared |= 1 << map_id;
    music(TUNE_VILLAGE);
    for (i = 0; i < nmobs; ++i) { mobs[i].alive = 0; mobs[i].respawn = 0xFFFF; }
    for (i = 0; i < NZONE; ++i) if (P.zones_cleared & (1 << i)) ++n;
    set_palette();
    draw_map();
    sb_reset(); sb_str("Sunlight floods "); sb_str(zones[map_id].name); sb_str("! The gloom-things melt into dew.");
    say(0, sb);
    if (n == NZONE) {
        P.main_quest = 2;
        say(0, "The last land brightens - and all the rain rushes UP at once, into a castle of cloud. The RAINYCASTLE has risen. Report to Mayor Puddle.");
    }
}

/* fight the mob at index mi; returns 1 if the hero died */
static u8 fight(u8 mi, u8 ambush)
{
    u8 r, i;
    static const i8 hop[4][2] = { { 0, 1 }, { 0, -1 }, { 1, 0 }, { -1, 0 } };
#ifdef BENCH
    return 0;                           /* (scroller tests: just keep walking) */
#endif
    POKE(0xD015, 0);
    r = battle(mi, ambush);
    if (r == 2) return 1;
    if (r == 0) {
        /* fled: hop one tile away from the monster if possible */
        for (i = 0; i < 4; ++i) {
            u8 nx = P.x + hop[i][0], ny = P.y + hop[i][1];
            if (walkable(nx, ny) && mob_at(nx, ny) == 0xFF) { P.x = nx; P.y = ny; break; }
        }
    }
    redraw_all();
    if (r == 1) {
        if (monsters[mobs[mi].type].flags & MF_BOSS) zone_cleared();
        else if (map_id == Z_SOUTH && P.pip_stage == 1 && P.pip_n < 5) {
            if (++P.pip_n == 5) msg("That should scare the swamp quiet - tell Pip!");
        }
    }
    return 0;
}

static const i8 dirs[4][2] = { { 0, -1 }, { 0, 1 }, { -1, 0 }, { 1, 0 } };

/* monsters wander, chase, and respawn. Returns 1 if the hero died. */
static u8 update_mobs(void)
{
    u8 i, nx, ny, d;
    /* a step costs ~5,000 cycles: one a frame, if there's time -- their clocks
     * run on, and the rest step in the next frame */
    u8 moves = 0;
    i8 dx, dy;
    Mob *m;
    for (i = 0, m = mobs; i < nmobs; ++i, ++m) {
        if (!m->alive) {
            if (m->respawn != 0xFFFF && seconds >= m->respawn && !zone_sunny()
                && cheb(m->hx, m->hy, P.x, P.y) > 4 && mob_at(m->hx, m->hy) == 0xFF) {
                m->alive = 1; m->x = m->hx; m->y = m->hy;
                queue_tile(m->x, m->y);
            }
            continue;
        }
        if (m->move_t == 0xFF) continue;
        if (--m->move_t) continue;
        if (++moves > 1 || !frame_left()) { m->move_t = 1; continue; }
        m->move_t = 40 + (rnd16() & 31) + (rnd16() & 7);
        if (cheb(m->x, m->y, P.x, P.y) <= 5) {
            dx = P.x > m->x ? 1 : P.x < m->x ? -1 : 0;
            dy = P.y > m->y ? 1 : P.y < m->y ? -1 : 0;
            if (dx && dy) { if (rnd16() & 1) dx = 0; else dy = 0; }
        } else {
            d = rnd16() & 3;
            dx = dirs[d][0]; dy = dirs[d][1];
        }
        nx = m->x + dx; ny = m->y + dy;
        if (cheb(nx, ny, m->hx, m->hy) > 7) continue;
        if (nx == P.x && ny == P.y) return fight(i, 1);
        if (walkable(nx, ny) && mob_at(nx, ny) == 0xFF && gate_at(nx, ny) == 0xFF) {
            dx = m->x; dy = m->y;
            m->x = nx; m->y = ny;
            queue_tile(dx, dy);
            queue_tile(nx, ny);
        }
    }
    return 0;
}

/* villagers mill about their spots */
static void update_npcs(void)
{
    u8 i, nx, ny, d, ox, oy;
    Npc *n;
    for (i = 0; i < NNPC; ++i) {
        n = &npcs[i];
        if (--n->move_t) continue;
        n->move_t = 80 + rnd(170);
        if (cheb(n->x, n->y, P.x, P.y) <= 1) continue;
        if (chance(40)) continue;
        d = rnd(4);
        nx = n->x + dirs[d][0]; ny = n->y + dirs[d][1];
        if (cheb(nx, ny, npc_home[i][0], npc_home[i][1]) > 2) continue;
        if (nx == P.x && ny == P.y) continue;
        if (gate_at(nx, ny) != 0xFF) continue;
        if (walkable(nx, ny)) {
            ox = n->x; oy = n->y;
            n->x = nx; n->y = ny;
            queue_tile(ox, oy);
            queue_tile(nx, ny);
        }
    }
}

/* try to step: talk, fight, or start the walk over. Returns 1 if the hero died. */
static u8 step(i8 dx, i8 dy)
{
    u8 nx = P.x + dx, ny = P.y + dy, k;
    if ((k = npc_at(nx, ny)) != 0xFF) {
#ifdef BENCH
        return 0;                       /* (scroller tests: just keep walking) */
#endif
        talk(k);
        hud_dirty = 1;
        return 0;
    }
    if ((k = mob_at(nx, ny)) != 0xFF) return fight(k, 0);
    if (!walkable(nx, ny)) {
#ifndef BENCH
        if (map_id == MAP_VILLAGE && (k = camp_plot(nx, ny)) != 0xFF) { open_build(k); redraw_all(); }
#endif
        return 0;
    }
    P.x = nx; P.y = ny;                 /* the tile is ours (monsters see it taken) */
    if (!cq_n) push_frame(phx, phy);    /* from a standstill: a frame's grace to start building */
    gdx = dx; gdy = dy;
    glide = 8;                          /* 2 px a frame: one 16 px tile in 8 */
    plan_step(phx, phy);
    k = arr_n++;
    arr_x[k] = nx; arr_y[k] = ny; arr_at[k] = pushed + 8;
    return 0;
}

/* the hero's walked onto (x, y): gates and nodes */
static void arrive(u8 x, u8 y)
{
    u8 k;
    if ((k = gate_at(x, y)) == 0xFF) gate_armed = 1;
#ifdef BENCH                            /* (scroller tests: just keep walking) */
    else if (gate_armed && gates[k].kind <= G_HOME) { on_gate(k); return; }
#else
    else if (gate_armed) { on_gate(k); return; }
#endif
    if ((k = node_at(x, y)) != 0xFF && nodes[k].respawn <= seconds) mine(k);
}

/* once a second: prismatite shimmers, mined nodes grow back */
static void shimmer(void)
{
    u8 i;
    if (++prism_col > 7) prism_col = 1;
    for (i = 0; i < nnodes; ++i)
        if (nodes[i].mineral == PRISMATITE || nodes[i].respawn == seconds)
            queue_tile(nodes[i].x, nodes[i].y);
}

void world_loop(void)
{
    u8 last_sec = 0, k;
    i8 dx, dy;

#ifdef GALLERY
    {   /* test builds: a battle portrait (-DGALLERY=n) next to the hero */
        u8 i;
        cls();
        hero_sprites(P.cls);
        mon_sprites(GALLERY);
        for (i = 0; i < 7; ++i) spr_pos(i, i < 3 ? 56 : 224, 68);
        POKE(0xD017, 0x7F); POKE(0xD01D, 0x7F); POKE(0xD01C, 0x04);
        POKE(0xD015, 0x7F);
        put_str(1, 0, monsters[GALLERY].name, WHITE);
        for (;;) wait_frame();
    }
#endif
    build_map(P.map);
    if (!walkable(P.x, P.y) && gate_at(P.x, P.y) == 0xFF) {
        /* a freshly generated zone may have a tree where you stood: go to its gate */
        if (in_zone()) { P.x = zones[map_id].entry[0]; P.y = zones[map_id].entry[1]; }
        else { P.x = 6; P.y = 6; }
    }
    gate_armed = gate_at(P.x, P.y) == 0xFF;
    redraw_all();
    if (P.kills || P.main_quest) {
        sb_reset(); sb_str("Welcome back, "); sb_str(classes[P.cls].name); sb_str("!");
        msg(sb);
    } else
        msg("Welcome to Drizzlewick! Mayor Puddle is waiting to speak with you. Walk into people to talk.");
    heal_at = seconds + 2;

    for (;;) {
        wait_frame();
        vbl0 = vbl;
        scroll_sync();
        input_poll();

        /* steps the hero has finished walking */
        if (arr_n && (u8)(cq_done - arr_at[0]) < 128) {
            k = arr_x[0]; dx = arr_y[0];
            arr_x[0] = arr_x[1]; arr_y[0] = arr_y[1]; arr_at[0] = arr_at[1];
            --arr_n;
            arrive(k, dx);
        }

        if (!cq_n && !glide && !arr_n) {    /* standing still */
            if (key_hit(K_I)) { open_bag(); redraw_all(); }
            if (key_hit(K_C)) { open_spellbook(); redraw_all(); }
            if (key_hit(K_T)) { open_tree(); redraw_all(); }
            if (key_hit(K_G)) { open_gear(); redraw_all(); }
            if ((in_new & IN_FIRE) && !(in_now & 0x0F)) { camp_menu(); redraw_all(); }
        }
        /* the next step, once this one's queued (and not onto a gate: that
         * waits for the arrival) */
        if (!glide && arr_n < 2 && (in_now & (IN_UP | IN_DOWN | IN_LEFT | IN_RIGHT))
            && !(arr_n && gate_at(arr_x[arr_n - 1], arr_y[arr_n - 1]) != 0xFF)) {
            dx = dy = 0;
            if (in_now & IN_UP) dy = -1;
            else if (in_now & IN_DOWN) dy = 1;
            else if (in_now & IN_LEFT) dx = -1;
            else dx = 1;
            if (step(dx, dy)) return;
        }
        /* keep the camera queue a few frames ahead */
        while (glide && cq_n < CQ_DEPTH) {
            phx += gdx * 2; phy += gdy * 2;
            push_frame(phx, phy);
            --glide;
        }
#ifdef CHECK
        {   /* test builds: after each swap, the screen on show against a fresh render */
            static u8 last_swaps, bad, checks;
            u16 i;
            u8 *f, *k;
            if (cq_swaps != last_swaps && !sw_n && !tq_n && !cq_ready) {
                last_swaps = cq_swaps;
                roc = foc; rorb = forb;
                render(0, 0, 40, 20, back(), edge, 0);
                f = front(); k = back();
                for (i = 0; i < 800; ++i) if (f[i] != k[i]) { ++bad; break; }
                ++checks;
                put_num(0, 3, checks, CYAN); put_num(6, 3, bad, RED);
            }
        }
#endif
        scroll_build();                 /* the next crossing's back screen comes first */

        if (in_zone()) {
            if (update_mobs()) return;
            if (!zone_sunny()) storm_tick(zones[map_id].tier, zones[map_id].bg);
        }
        else {
            update_npcs();
            if (seconds >= heal_at) {
                heal_at = seconds + 2;
                if (P.hp < P.hpmax) {   /* resting: the House and Kitchen make it heartier */
                    P.hp += 2 + P.base[B_HOUSE] + 2 * P.base[B_KITCHEN];
                    if (P.hp > P.hpmax) P.hp = P.hpmax;
                    hud_dirty = 1;
                }
            }
        }
        if ((u8)seconds != last_sec) { last_sec = (u8)seconds; shimmer(); }
        if (hud_dirty) { draw_hud(); hud_dirty = 0; }

        flush_tiles();                  /* last: with whatever time is left */
#ifdef BENCH
        if ((frame & 31) == 0) {        /* frames the picture held, of swaps */
            put_num(26, 4, cq_swaps, CYAN);
            put_num(32, 4, cq_stalls, RED);
        }
#endif
    }
}

/* hooks for other modules */
void world_hud_dirty(void) { hud_dirty = 1; }
