/* Overlay part: the village's layout (built on coming home) and a land
 * freed from the gloom -- rare moments, riding with digging up a facet
 * (ov_dig.c) in PQ.OV12. */
#include "game.h"

#pragma code-name("OVDIGCODE")
#pragma rodata-name("OVDIGDATA")
#pragma bss-name("OVDIGDATA")

static const u8 village_cottages[5][2] = { { 16, 3 }, { 21, 5 }, { 24, 9 }, { 20, 12 }, { 15, 12 } };
static const u8 village_decor[8][2] = { { 16, 10 }, { 19, 11 }, { 22, 8 }, { 24, 12 }, { 14, 12 }, { 18, 13 }, { 21, 14 }, { 12, 13 } };

void build_village(void)
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

void village_hello(u8 first)
{
    msg(first ? "Welcome to Drizzlewick! Mayor Puddle is waiting to speak with you. Walk into people to talk."
              : "Drizzlewick: always sunny, always safe. Rest here to heal.");
}

void zone_cleared(u8 z)                 /* (z: map_id is MAP_DUNGEON for a champion below) */
{
    u8 i, n = 0;
    storm_clears();                         /* the rain thins out, then the sun */
    P.zones_cleared |= 1 << z;
    music(TUNE_VILLAGE);
    for (i = 0; i < nmobs; ++i) { mobs[i].alive = 0; mobs[i].respawn = 0xFFFF; }
    for (i = 0; i < NZONE; ++i) if (P.zones_cleared & (1 << i)) ++n;
    set_palette();
    draw_map();
    sb_reset(); sb_str("Sunlight floods "); sb_str(zones[z].name); sb_str("! The gloom-things melt into dew.");
    say(0, sb);
    if (n == NZONE) {
        P.main_quest = 2;
        say(0, "The last land brightens - and all the rain rushes UP at once, into a castle of cloud. The RAINYCASTLE has risen. Report to Mayor Puddle.");
    }
}

