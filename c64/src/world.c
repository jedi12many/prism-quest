/* Maps, rendering and the exploration loop -- ported from js/game.js. */
#include <string.h>
#include "game.h"

u8 map_id;
u8 mw, mh;
u8 map[MAP_H][MAP_W];
Mob mobs[MAXMON];
u8 nmobs;
Node nodes[MAXNODE];
u8 nnodes;
Gate gates[MAXGATE];
u8 ngates;
Npc npcs[NNPC];

static u8 camx, camy;
static u8 dirty, hud_dirty;
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
    map[4][6] = T_HOUSE;                      /* your camp house */
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

static u8 clampu(i16 v, i16 lo, i16 hi) { return (u8)(v < lo ? lo : v > hi ? hi : v); }

static u8 mob_at(u8 x, u8 y)
{
    u8 i;
    for (i = 0; i < nmobs; ++i)
        if (mobs[i].alive && mobs[i].x == x && mobs[i].y == y) return i;
    return 0xFF;
}

static u8 node_at(u8 x, u8 y)
{
    u8 i;
    for (i = 0; i < nnodes; ++i)
        if (nodes[i].x == x && nodes[i].y == y) return i;
    return 0xFF;
}

static u8 gate_at(u8 x, u8 y)
{
    u8 i;
    for (i = 0; i < ngates; ++i)
        if (gates[i].x == x && gates[i].y == y) return i;
    return 0xFF;
}

static u8 npc_at(u8 x, u8 y)
{
    u8 i;
    if (in_zone()) return 0xFF;
    for (i = 0; i < NNPC; ++i)
        if (npcs[i].x == x && npcs[i].y == y) return i;
    return 0xFF;
}

/* a directional zone: a fresh procedural level with a champion at the far end */
static void build_zone(u8 z)
{
    const ZoneDef *zd = &zones[z];
    u8 i, x, y, k, placed;
    u16 guard;
    i16 cx, cy, rx, ry, dx, dy;
    u8 ex = zd->entry[0], ey = zd->entry[1], lx = zd->lair[0], ly = zd->lair[1];
    u8 W = 34, H = 26;

    blank_map(W, H);
    /* lakes */
    k = 2 + rnd(2);
    for (i = 0; i < k; ++i) {
        cx = 6 + rnd(W - 12); cy = 5 + rnd(H - 10);
        rx = 2 + rnd(3); ry = 2 + rnd(2);
        for (y = 2; y < H - 2; ++y)
            for (x = 2; x < W - 2; ++x) {
                dx = x - cx; dy = y - cy;
                if (dx * dx * ry * ry + dy * dy * rx * rx < rx * rx * ry * ry) map[y][x] = T_WATER;
            }
    }
    /* forest scatter */
    for (y = 2; y < H - 2; ++y)
        for (x = 2; x < W - 2; ++x)
            if (map[y][x] != T_WATER && chance(9)) map[y][x] = T_TREE;
    /* clearings at the entry and the lair */
    for (y = ey - 2; y <= ey + 2; ++y) for (x = ex - 2; x <= ex + 2; ++x) map[y][x] = T_GRASS;
    for (y = ly - 2; y <= ly + 2; ++y) for (x = lx - 2; x <= lx + 2; ++x) map[y][x] = T_GRASS;
    /* carve a wandering path from entry to lair so it's always traversable */
    cx = ex; cy = ey; guard = 0;
    while ((cx != lx || cy != ly) && guard++ < 800) {
        dx = lx > cx ? 1 : lx < cx ? -1 : 0;
        dy = ly > cy ? 1 : ly < cy ? -1 : 0;
        if (ABSD(lx, cx) > ABSD(ly, cy)) {
            cx = clampu(cx + dx, 3, W - 4);
            if (dy && chance(40)) cy = clampu(cy + dy, 3, H - 4);
        } else {
            cy = clampu(cy + dy, 3, H - 4);
            if (dx && chance(40)) cx = clampu(cx + dx, 3, W - 4);
        }
        map[cy][cx] = T_PATH;
        if (cx + 1 < W - 2 && map[cy][cx + 1] != T_WATER) map[cy][cx + 1] = T_GRASS;
    }
    /* way-home 2x2 gate at the entry */
    add_gate(ex - 1, ey - 1, G_HOME, z); add_gate(ex, ey - 1, G_HOME, z);
    add_gate(ex - 1, ey, G_HOME, z);     add_gate(ex, ey, G_HOME, z);

    /* mineral nodes (themed pool); legendary prismatite by the lair */
    placed = 0; guard = 0;
    while (placed < 10 && guard++ < 3000) {
        x = 3 + rnd(W - 6); y = 3 + rnd(H - 6);
        if (map[y][x] != T_GRASS && map[y][x] != T_GRASS2) continue;
        if (cheb(x, y, ex, ey) < 3) continue;
        for (i = 0; i < nnodes && cheb(nodes[i].x, nodes[i].y, x, y) >= 2; ++i) ;
        if (i < nnodes) continue;
        nodes[nnodes].x = x; nodes[nnodes].y = y;
        nodes[nnodes].mineral = zd->minerals[rnd(4)];
        nodes[nnodes++].respawn = 0;
        ++placed;
    }
    nodes[nnodes].x = lx + 1; nodes[nnodes].y = ly + 1; nodes[nnodes].mineral = PRISMATITE; nodes[nnodes++].respawn = 0;
    nodes[nnodes].x = lx - 1; nodes[nnodes].y = ly + 1; nodes[nnodes].mineral = PRISMATITE; nodes[nnodes++].respawn = 0;

    /* monsters + the champion (none once the zone is cleared) */
    if (!(P.zones_cleared & (1 << z))) {
        for (k = 0; k < 4; ++k) {
            placed = 0; guard = 0;
            while (placed < zd->pack_n[k] && guard++ < 3000 && nmobs < MAXMON - 1) {
                x = 3 + rnd(W - 6); y = 3 + rnd(H - 6);
                if (!walkable(x, y)) continue;
                if (cheb(x, y, ex, ey) < 5 || cheb(x, y, lx, ly) < 2) continue;
                for (i = 0; i < nmobs && cheb(mobs[i].x, mobs[i].y, x, y) >= 3; ++i) ;
                if (i < nmobs) continue;
                if (node_at(x, y) != 0xFF) continue;
                mobs[nmobs].x = mobs[nmobs].hx = x;
                mobs[nmobs].y = mobs[nmobs].hy = y;
                mobs[nmobs].type = zd->pack_type[k];
                mobs[nmobs].alive = 1;
                mobs[nmobs].respawn = 0;
                mobs[nmobs].move_t = 50 + rnd(100);
                ++nmobs; ++placed;
            }
        }
        mobs[nmobs].x = mobs[nmobs].hx = lx;
        mobs[nmobs].y = mobs[nmobs].hy = ly;
        mobs[nmobs].type = zd->champion;
        mobs[nmobs].alive = 1;
        mobs[nmobs].respawn = 0xFFFF;
        mobs[nmobs].move_t = 0xFF;            /* champions hold their ground */
        ++nmobs;
    }
}

static void set_palette(void)
{
    u8 bg = GREEN;
    if (in_zone()) bg = zone_sunny() ? zones[map_id].bg_sun : zones[map_id].bg;
    POKE(0xD021, bg);
    POKE(0xD020, in_zone() && !zone_sunny() ? DKGREY : BLACK);
}

void build_map(u8 id)
{
    map_id = id;
    nmobs = nnodes = ngates = 0;
    if (id == MAP_VILLAGE) build_village();
    else build_zone(id);
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

/* ---------- rendering ---------- */

static u8 vt[VIEW_H][VIEW_W];
static u8 vc[VIEW_H][VIEW_W];

static void put_view(u8 x, u8 y, u8 t, u8 c)
{
    x -= camx; y -= camy;
    if (x < VIEW_W && y < VIEW_H) { vt[y][x] = t; vc[y][x] = c; }
}

void draw_map(void)
{
    u8 x, y, i, t, c, ch;
    u8 *scr, *col;
    const u8 *tc;

    camx = clampu((i16)P.x - VIEW_W / 2, 0, mw - VIEW_W);
    camy = clampu((i16)P.y - VIEW_H / 2, 0, mh - VIEW_H);

    for (y = 0; y < VIEW_H; ++y) {
        memcpy(vt[y], &map[camy + y][camx], VIEW_W);
        memset(vc[y], 0xFF, VIEW_W);
    }
    for (i = 0; i < ngates; ++i) {
        const Gate *g = &gates[i];
        switch (g->kind) {
        case G_ZONE:  t = (g->y == zones[g->zone].gate[0][1] && g->x == zones[g->zone].gate[0][0]) ? T_SIGN : T_PATH; break;
        case G_HOME:  t = (i & 3) == 0 ? T_HOMESIGN : T_PATH; break;
        case G_CLOUD: t = T_CLOUDGATE; break;
        case G_FORGE: t = T_FORGE; break;
        default:      t = T_BOARD; break;
        }
        put_view(g->x, g->y, t, 0xFF);
    }
    for (i = 0; i < nnodes; ++i)
        if (nodes[i].respawn <= seconds) {
            c = nodes[i].mineral == PRISMATITE ? 1 + (frame >> 4) % 7 : mineral_color[nodes[i].mineral];
            put_view(nodes[i].x, nodes[i].y, T_NODE, c);
        }
    if (!in_zone())
        for (i = 0; i < NNPC; ++i) put_view(npcs[i].x, npcs[i].y, T_N_MAYOR + i, 0xFF);
    for (i = 0; i < nmobs; ++i)
        if (mobs[i].alive) put_view(mobs[i].x, mobs[i].y, monsters[mobs[i].type].tile, 0xFF);

    for (y = 0; y < VIEW_H; ++y) {
        scr = SCREEN + 40 + y * 80;
        col = COLORRAM + 40 + y * 80;
        for (x = 0; x < VIEW_W; ++x) {
            t = vt[y][x];
            ch = TILE_BASE + (t << 2);
            tc = tile_color[t];
            c = vc[y][x];
            scr[0] = ch;     scr[1] = ch + 1;
            scr[40] = ch + 2; scr[41] = ch + 3;
            if (c == 0xFF) {
                col[0] = tc[0] | 8;  col[1] = tc[1] | 8;
                col[40] = tc[2] | 8; col[41] = tc[3] | 8;
            } else {
                col[0] = col[1] = col[40] = col[41] = c | 8;
            }
            scr += 2; col += 2;
        }
    }
    place_player_sprite();
}

void place_player_sprite(void)
{
    u16 sx = 24 + (P.x - camx) * 16;
    u8 sy = 50 + 8 + (P.y - camy) * 16;
    u8 i;
    for (i = 0; i < 3; ++i) {
        spr_load(i, player_spr[P.cls][i]);
        SPR_PTR[i] = 16 + i;
        POKE(0xD027 + i, player_spr_col[P.cls][i]);
        spr_pos(i, sx, sy);
    }
    POKE(0xD017, 0); POKE(0xD01D, 0);
    POKE(0xD015, 0x07);
}

void draw_hud(void)
{
    clear_rows(0, 0);
    put_ch(0, 0, CH_HEART, RED);
    sb_reset(); sb_num(P.hp); sb_str("/"); sb_num(P.hpmax);
    put_str(1, 0, sb, P.hp * 4 < P.hpmax ? RED : WHITE);
    sb_reset(); sb_str("Lv"); sb_num(P.level);
    put_str(9, 0, sb, YELLOW);
    sb_reset(); sb_str("XP "); sb_num(P.xp); sb_str("/"); sb_num(xp_next[P.level]);
    put_str(14, 0, sb, CYAN);
    if (in_zone()) put_str(40 - strlen(zones[map_id].name), 0, zones[map_id].name, zone_sunny() ? YELLOW : PURPLE);
    else put_str(29, 0, "Drizzlewick", YELLOW);
}

static void redraw_all(void)
{
    cls();
    set_palette();
    draw_hud();
    draw_map();
}

/* ---------- actions ---------- */

static void travel(u8 id, u8 x, u8 y)
{
    sfx(SFX_GATE);
    POKE(0xD015, 0);
    build_map(id);
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
        break;
    case G_CLOUD:
        say("The Cloudgate", "An old rainbow arch, cold and dormant. The Mayor says it only wakes once all four lands shine.");
        break;
    case G_FORGE:
        say("The Glassworks Kiln", "The kiln has been cold for a hundred years. Prism Facets can be fused here - in a later version of this port.");
        break;
    default:
        show_ledger();
        redraw_all();
        break;
    }
}

static void mine(u8 ni)
{
    Node *n = &nodes[ni];
    u8 amt = 1 + chance(35);
    P.raw[n->mineral] += amt;
    n->respawn = seconds + 60;
    sfx(SFX_MINE);
    sb_reset(); sb_str("+"); sb_num(amt); sb_str(" raw "); sb_str(mineral_name[n->mineral]); sb_str("!");
    msg(sb);
}

static void zone_cleared(void)
{
    u8 i, n = 0;
    P.zones_cleared |= 1 << map_id;
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
    i8 dx, dy;
    Mob *m;
    for (i = 0; i < nmobs; ++i) {
        m = &mobs[i];
        if (!m->alive) {
            if (m->respawn != 0xFFFF && seconds >= m->respawn && !zone_sunny()
                && cheb(m->hx, m->hy, P.x, P.y) > 4 && mob_at(m->hx, m->hy) == 0xFF) {
                m->alive = 1; m->x = m->hx; m->y = m->hy;
                dirty = 1;
            }
            continue;
        }
        if (m->move_t == 0xFF) continue;
        if (--m->move_t) continue;
        m->move_t = 40 + rnd(40);
        if (cheb(m->x, m->y, P.x, P.y) <= 5) {
            dx = P.x > m->x ? 1 : P.x < m->x ? -1 : 0;
            dy = P.y > m->y ? 1 : P.y < m->y ? -1 : 0;
            if (dx && dy) { if (rnd16() & 1) dx = 0; else dy = 0; }
        } else {
            d = rnd(4);
            dx = dirs[d][0]; dy = dirs[d][1];
        }
        nx = m->x + dx; ny = m->y + dy;
        if (cheb(nx, ny, m->hx, m->hy) > 7) continue;
        if (nx == P.x && ny == P.y) return fight(i, 1);
        if (walkable(nx, ny) && mob_at(nx, ny) == 0xFF && gate_at(nx, ny) == 0xFF) {
            m->x = nx; m->y = ny;
            dirty = 1;
        }
    }
    return 0;
}

/* villagers mill about their spots */
static void update_npcs(void)
{
    u8 i, nx, ny, d;
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
        if (walkable(nx, ny)) { n->x = nx; n->y = ny; dirty = 1; }
    }
}

/* try to step; returns 1 if the hero died */
static u8 step(i8 dx, i8 dy)
{
    u8 nx = P.x + dx, ny = P.y + dy, k;
    if ((k = npc_at(nx, ny)) != 0xFF) {
        talk_npc(k);
        hud_dirty = 1;
        return 0;
    }
    if ((k = mob_at(nx, ny)) != 0xFF) return fight(k, 0);
    if (!walkable(nx, ny)) return 0;
    P.x = nx; P.y = ny;
    dirty = 1;
    if ((k = gate_at(nx, ny)) == 0xFF) gate_armed = 1;
    else if (gate_armed) { on_gate(k); return 0; }
    if ((k = node_at(nx, ny)) != 0xFF && nodes[k].respawn <= seconds) mine(k);
    return 0;
}

void world_loop(void)
{
    u8 cool = 0;
    u8 last_sec = 0;
    i8 dx, dy;

    build_map(MAP_VILLAGE);
    gate_armed = gate_at(P.x, P.y) == 0xFF;
    redraw_all();
    msg("Welcome to Drizzlewick! Mayor Puddle is waiting to speak with you. Walk into people to talk.");
    heal_at = seconds + 2;

    for (;;) {
        wait_frame();
        input_poll();

        if (key_hit(K_I)) { show_bag(); redraw_all(); }

        if (cool) --cool;
        else if (in_now & (IN_UP | IN_DOWN | IN_LEFT | IN_RIGHT)) {
            dx = dy = 0;
            if (in_now & IN_UP) dy = -1;
            else if (in_now & IN_DOWN) dy = 1;
            else if (in_now & IN_LEFT) dx = -1;
            else dx = 1;
            if (step(dx, dy)) { game_over(); return; }
            cool = 9;
        }

        if (in_zone()) { if (update_mobs()) { game_over(); return; } }
        else {
            update_npcs();
            if (seconds >= heal_at) {
                heal_at = seconds + 2;
                if (P.hp < P.hpmax) { P.hp += 3; if (P.hp > P.hpmax) P.hp = P.hpmax; hud_dirty = 1; }
            }
        }

        /* prismatite nodes shimmer; regrown nodes reappear */
        if ((u8)seconds != last_sec) { last_sec = (u8)seconds; dirty = 1; }

        if (dirty) { draw_map(); dirty = 0; }
        if (hud_dirty) { draw_hud(); hud_dirty = 0; }
    }
}

/* hooks for other modules */
void world_hud_dirty(void) { hud_dirty = 1; }
