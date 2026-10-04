/* Overlay: digging up a Prism Facet (js/game.js digTreasure), with the
 * whisper each one brings. (The Glassworks that fuses them: ov_glass.c.)
 * Loaded from disk on demand into the overlay window (see ovl() in save.c). */
#include <string.h>
#include "game.h"

#pragma code-name("OVDIGCODE")
#pragma rodata-name("OVDIGDATA")
#pragma bss-name("OVDIGDATA")

/* (js/data.js FACET_WHISPERS: the shards tell a little more each time) */
static const char *const whisper[NZONE] = {
    "You hold the shard to your ear. The rain isn't rain - it's slow, and wet, and it is breathing.",
    "Two shards now, and they hum to one another - a thin, frightened note, like they remember the light they were cut from.",
    "Three. The hum sharpens into a warning: the sun did not set a hundred years ago. It did not leave. It was swallowed.",
    "Four. In your hands they know each other and blaze - and far below the world, something vast and patient flinches from the glare.",
};
static Item made;
static u8 i, k, power;

/* facet power held: a facet counts 1, a prism weapon its tier (2-4); and
 * how many loose facets */
static u8 facet_count(u8 *loose)
{
    u8 i, p = 0, n = 0;
    const Item *it = P.inv;
    for (i = 0; i < INV_CAP + NSLOT; ++i, ++it) {
        if (i == INV_CAP) it = P.equip;
        if ((i < INV_CAP && i >= P.ninv) || it->kind == 0xFF || ITEM_RARITY(it) != R_PRISM) continue;
        if (it->name < PRISM_TWIN) { ++p; ++n; } else p += it->name - PRISM_TWIN + 2;
    }
    if (loose) *loose = n;
    return p > 4 ? 4 : p;
}


static void make(u8 name)
{
    memset(&made, 0, sizeof(Item));
    made.kind = SL_WEAPON | (R_PRISM << 4);
    made.name = name;
    made.sockets = name < PRISM_TWIN ? 1 : 2;   /* (the web game's Prismblade has 3) */
    made.gem[0] = made.gem[1] = 0xFF;
}

static u8 found(void)
{
    for (k = 0, i = 0; i < NZONE; ++i) if (P.facets & (1 << i)) ++k;
    return k;
}

/* walked onto gate g: the zone's facet */
void dig_facet(u8 gate)
{
    if (P.ninv >= INV_CAP) { msg("Your bag is full - the shard stays buried for now."); return; }
    make(map_id);
    give_item(&made);
    P.facets |= 1 << map_id;
    queue_tile(gates[gate].x, gates[gate].y);
    --ngates;                                   /* (dug: the last gate takes its place) */
    gates[gate] = gates[ngates];
    gate_t[gate] = gate_t[ngates];
    sfx(SFX_LEVEL);
    power = facet_count(0);
    sb_reset(); sb_str("You unearth the "); sb_str(prism_name[map_id]); sb_str("! (");
    sb_num(power); sb_str("/4 facets - the Glassworks can fuse ");
    sb_str(power >= 2 ? "them)" : "two or more)");
    say(0, sb);
    say(0, whisper[found() - 1]);
}

