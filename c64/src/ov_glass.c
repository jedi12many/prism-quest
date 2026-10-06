/* Overlay: the Glassworks kiln, which fuses Prism Facets into a weapon
 * (js/ui.js renderForge / forgePrism). (Digging one up: ov_dig.c.)
 * Loaded from disk on demand into the overlay window (see ovl() in save.c). */
#include <string.h>
#include "game.h"

#pragma code-name("OVGLASSCODE")
#pragma rodata-name("OVGLASSDATA")
#pragma bss-name("OVGLASSDATA")

static const u8 facet_col[NZONE] = { LTBLUE, YELLOW, LTGREEN, LTRED };   /* azure, amber, verdant, crimson */

static Item made;
static u8 i, k, g, power, loose;
static Item *it;

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

/* melt down everything prismatic (socketed gems come back) into one weapon */
static void fuse(void)
{
    for (i = 0, k = 0, it = P.inv; i < P.ninv; ++i, ++it) {
        if (ITEM_RARITY(it) == R_PRISM) {
            for (g = 0; g < 2; ++g) if (it->gem[g] != 0xFF) ++P.polished[it->gem[g] & 15][it->gem[g] >> 4];
            continue;
        }
        if (k != i) P.inv[k] = *it;
        ++k;
    }
    P.ninv = k;
    it = &P.equip[SL_WEAPON];
    if (it->kind != 0xFF && ITEM_RARITY(it) == R_PRISM) {
        for (g = 0; g < 2; ++g) if (it->gem[g] != 0xFF) ++P.polished[it->gem[g] & 15][it->gem[g] >> 4];
        it->kind = 0xFF;
    }
    make(PRISM_TWIN + power - 2);
    deed(DE_GLASSSMITH);
    if (power >= 4) deed(DE_PRISMBLADE);
    if (it->kind == 0xFF) *it = made;           /* the slot's free: wield it */
    else give_item(&made);
    calc_stats();
    sfx(SFX_WIN);
}

static const char *const tier_line[3] = { "Twinlight Prism  (2 facets)", "Trilight Prism  (3 facets)", "THE PRISMBLADE  (4 facets)" };

void show_glassworks(void)
{
    static const char *items[2];
    const char *note = 0;
    items[1] = "Back";
    for (;;) {
        screen_open("The Glassworks Kiln");
        put_str(1, 2, "The shattered Prismblade's four facets:", PURPLE);
        for (i = 0; i < NZONE; ++i) {
            put_ch(2, 4 + i, CH_GEM, facet_col[i]);
            put_str(4, 4 + i, prism_name[i], facet_col[i]);
            if (P.facets & (1 << i)) put_str(20, 4 + i, "found", YELLOW);
            else { sb_reset(); sb_str(zones[i].dir); sb_str(" - a glint in the grass"); put_str(20, 4 + i, sb, GREY); }
        }
        power = facet_count(&loose);
        sb_reset(); sb_str("Facet power held: "); sb_num(power); sb_str("/4");
        put_str(1, 9, sb, WHITE);
        for (i = 0; i < 3; ++i) {
            put_ch(2, 10 + i, CH_STAR, power >= i + 2 ? YELLOW : DKGREY);
            put_str(4, 10 + i, tier_line[i], power >= i + 2 ? YELLOW : GREY);
        }
        wrap("Fusing melts down everything prismatic you carry - an earlier prism weapon too - so another facet always lets you reforge stronger. Socketed gems are returned.", 14, 3, GREY);
        if (note) wrap(note, 22, 2, LTGREEN);
        if (power >= 2 && loose) { sb_reset(); sb_str("Fuse into the "); sb_str(prism_name[PRISM_TWIN + power - 2]); items[0] = sb; }
        else items[0] = power >= 2 ? "Nothing new to fuse" : "Bring at least two facets";
        if (menu_pick(1, 18, items, 2, 0) != 0) return;
        if (power < 2 || !loose) { note = "Find more facets: one in each land, a glint in the grass."; continue; }
        fuse();
        note = power >= 4 ? "THE PRISMBLADE IS WHOLE. Go blast everything."
                          : "Forged! Another facet would make it stronger - the kiln can always reforge.";
    }
}
