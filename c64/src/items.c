/* Item stats and names (js/loot.js itemStats and naming), in PQ.HI beside
 * the item engine that rolls them (loot.c).
 *
 * The Prism relics -- the four facets of the shattered Prismblade, and the
 * weapons the Glassworks fuses them into -- carry more bonuses than an item
 * has room for, so theirs live here, by the item's name byte (PRISM_*). */
#include "game.h"

#define NAFFIX 12
extern const u8 base_key[NSLOT], affix_key[NAFFIX];
extern const char *const base_name[NSLOT][3];
extern const char *const affix_pre[NAFFIX], *const affix_suf[NAFFIX];
extern const char *const legend_name[NSLOT], *const set_name[NSLOT];

/* (js/data.js FACETS, by zone id, then PRISM_TIERS 2-4) */
const char *const prism_name[PRISM_COUNT] = {
    "Azure Facet", "Amber Facet", "Verdant Facet", "Crimson Facet",
    "Twinlight Prism", "Trilight Prism", "THE PRISMBLADE",
};
const Eff prism_eff[PRISM_COUNT][PRISM_EFFS] = {
    { { E_MAGFLAT, 5 }, { E_SPELLDMG, 18 }, { E_DODGE, 5 } },
    { { E_ATKFLAT, 5 }, { E_BASICDMG, 15 }, { E_CRIT, 5 } },
    { { E_MAGFLAT, 4 }, { E_SPELLDMG, 15 }, { E_REGEN, 2 } },
    { { E_ATKFLAT, 4 }, { E_SPELLDMG, 12 }, { E_CRIT, 5 } },
    { { E_ATKFLAT, 6 }, { E_MAGFLAT, 4 }, { E_SPELLDMG, 22 }, { E_BASICDMG, 15 }, { E_CRIT, 8 } },
    { { E_ATKFLAT, 8 }, { E_MAGFLAT, 6 }, { E_SPELLDMG, 35 }, { E_BASICDMG, 25 }, { E_CRIT, 10 }, { E_CHARGESAVE, 12 } },
    { { E_ATKFLAT, 12 }, { E_MAGFLAT, 10 }, { E_SPELLDMG, 70 }, { E_BASICDMG, 70 }, { E_CRIT, 18 }, { E_CHARGESAVE, 25 }, { E_DODGE, 6 } },
};

/* the functions are PQ.HI's (the tables above stay in the main program) */
#pragma code-name(push, "HICODE")
#pragma rodata-name(push, "HIDATA")

static u8 affix_of(u8 key)
{
    u8 a;
    for (a = 0; a < NAFFIX && affix_key[a] != key; ++a) ;
    return a;
}

/* one item's total for an effect: base + affixes + faceted gems */
i16 item_stat(const Item *it, u8 key)
{
    i16 v = 0;
    u8 i, g;
    const Eff *e;
    if (it->kind == 0xFF) return 0;
    if (ITEM_RARITY(it) == R_PRISM) {
        for (e = prism_eff[it->name], i = 0; i < PRISM_EFFS && e->key; ++i, ++e) if (e->key == key) v += e->val;
    } else {
        if (ITEM_RARITY(it) < R_LEGEND && base_key[ITEM_SLOT(it)] == key) v += it->base;
        for (i = 0; i < 3; ++i) if (it->key[i] == key) v += it->val[i];
    }
    for (i = 0; i < 2; ++i) {
        g = it->gem[i];
        if (g != 0xFF && gem_key[g & 15] == key) v += gem_val[g & 15][g >> 4];
    }
    return v;
}

u8 set_count(void)
{
    u8 s, n = 0;
    for (s = 0; s < NSLOT; ++s) if (P.equip[s].kind != 0xFF && ITEM_RARITY(&P.equip[s]) == R_SET) ++n;
    return n;
}

/* everything worn, plus the Rainbow Raiment bonuses */
i16 gear_eff(u8 key)
{
    i16 v = 0;
    u8 s, n;
    for (s = 0; s < NSLOT; ++s) v += item_stat(&P.equip[s], key);
    n = set_count();
    if (n >= 3) { if (key == E_SPELLDMG) v += 15; if (key == E_CRIT) v += 10; }
    if (n == 5) { if (key == E_CHARGESAVE) v += 30; if (key == E_SPELLDMG) v += 25; if (key == E_UNICORN) v += 25; }
    return v;
}


void sb_item_name(const Item *it)
{
    u8 r = ITEM_RARITY(it), s = ITEM_SLOT(it);
    if (r == R_PRISM) { sb_str(prism_name[it->name]); return; }
    if (r == R_LEGEND) { sb_str(legend_name[s]); return; }
    if (r == R_SET) { sb_str(set_name[s]); return; }
    if (r >= R_MAGIC) { sb_str(affix_pre[affix_of(it->key[0])]); sb_str(" "); }
    sb_str(base_name[s][it->name]);
    if (r == R_RARE) { sb_str(" "); sb_str(affix_suf[affix_of(it->key[1])]); }
}


/* every stat line of an item, in order, as "+3 Attack" etc; returns the count */
u8 item_lines(const Item *it, u8 *keys, i16 *vals)
{
    u8 n = 0, i, k;
    const Eff *e;
    if (ITEM_RARITY(it) == R_PRISM) {
        for (e = prism_eff[it->name]; n < PRISM_EFFS && e->key; ++n, ++e) { keys[n] = e->key; vals[n] = e->val; }
        return n;
    }
    if (ITEM_RARITY(it) < R_LEGEND) { keys[n] = base_key[ITEM_SLOT(it)]; vals[n++] = it->base; }
    for (i = 0; i < 3; ++i) {
        if (!(k = it->key[i])) continue;
        keys[n] = k; vals[n++] = it->val[i];
    }
    return n;
}

#pragma rodata-name(pop)
#pragma code-name(pop)
