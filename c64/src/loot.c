/* Diablo-style loot: random drops, affixes, sockets, legendaries and the
 * Rainbow Raiment set -- ported from js/loot.js (same tables and odds).
 *
 * The item engine (tables, rolling) lives in PQ.HI at $E580, loaded at
 * startup; stats and names are in items.c, and the gear screens in gear.c,
 * in the main program. */
#include <string.h>
#include "game.h"

#pragma code-name(push, "HICODE")
#pragma rodata-name(push, "HIDATA")

const char *const slot_name[NSLOT] = { "Weapon", "Helm", "Armor", "Boots", "Charm" };
const char *const rarity_name[6] = { "Common", "Magic", "Rare", "Legendary", "Set", "Prism" };
const u8 rarity_color[6] = { LTGREY, LTBLUE, YELLOW, ORANGE, LTGREEN, PURPLE };

/* implicit base stat per slot */
const char *const base_name[NSLOT][3] = {
    { "Wand", "Rod", "Staff" }, { "Cap", "Hood", "Circlet" }, { "Cloak", "Robe", "Raincoat" },
    { "Boots", "Striders", "Galoshes" }, { "Charm", "Amulet", "Locket" },
};
const u8 base_key[NSLOT] = { E_ATKFLAT, E_MAGFLAT, E_DEFFLAT, E_DODGE, E_HPMAX };
static const u8 base_min[NSLOT] = { 1, 1, 1, 2, 6 };
static const u8 base_max[NSLOT] = { 4, 3, 3, 5, 14 };

/* affixes: percentages are stored as whole percent */
#define NAFFIX 12
const u8 affix_key[NAFFIX] = { E_ATKFLAT, E_MAGFLAT, E_DEFFLAT, E_HPMAX, E_BASICDMG, E_SPELLDMG,
                                      E_CRIT, E_DODGE, E_HEALPOWER, E_UNICORN, E_XPGAIN, E_RARELUCK };
static const u8 affix_min[NAFFIX] = { 1, 1, 1, 8, 6, 6, 3, 3, 10, 10, 5, 5 };
static const u8 affix_max[NAFFIX] = { 4, 4, 3, 24, 18, 18, 8, 8, 25, 30, 15, 12 };
const char *const affix_pre[NAFFIX] = { "Sharp", "Arcane", "Sturdy", "Vital", "Brutal", "Radiant",
                                               "Keen", "Nimble", "Blessed", "Gleaming", "Scholarly", "Lucky" };
const char *const affix_suf[NAFFIX] = { "of Fangs", "of Stars", "of Stone", "of the Bear", "of Bonking",
                                               "of Rainbows", "of the Fox", "of Puddles", "of Blooms", "of the Herd",
                                               "of Tales", "of Clover" };

/* what a polished gem grants in a socket: [rough, fine, brilliant] */
const u8 gem_key[NMIN] = { E_HPMAX, E_MAGFLAT, E_ATKFLAT, E_DEFFLAT, E_REGEN, E_UNICORN, E_SPELLDMG };
const u8 gem_val[NMIN][3] = { { 6, 10, 16 }, { 1, 2, 3 }, { 1, 2, 3 }, { 1, 2, 3 }, { 1, 2, 3 },
                              { 10, 20, 30 }, { 8, 12, 18 } };

/* legendaries: one per slot, two fixed affixes each */
const char *const legend_name[NSLOT] = { "Sunsplitter", "Gloomveil Crown", "The Drizzleproof Coat",
                                         "Puddlejumper Boots", "Grandma's Other Locket" };
const char *const legend_lore[NSLOT] = { "Forged from a sunbeam that refused to give up.",
                                         "Worn by the last king who ever saw the sun.",
                                         "Not a single drop gets through.", "Splish, splash, slash.",
                                         "She has so many." };
static const u8 legend_key[NSLOT][2] = { { E_ATKFLAT, E_SPELLDMG }, { E_MAGFLAT, E_CHARGESAVE },
                                         { E_DEFFLAT, E_REGEN }, { E_DODGE, E_CRIT }, { E_HPMAX, E_HEALPOWER } };
static const u8 legend_min[NSLOT][2] = { { 3, 15 }, { 2, 10 }, { 3, 2 }, { 8, 4 }, { 15, 15 } };
static const u8 legend_max[NSLOT][2] = { { 6, 25 }, { 5, 20 }, { 5, 4 }, { 14, 8 }, { 30, 30 } };
static const u8 legend_sockets[NSLOT] = { 2, 1, 1, 1, 1 };

/* the Rainbow Raiment: 3 pieces +15% spell, +10% crit; all 5 DOUBLE RAINBOW */
const char *const set_name[NSLOT] = { "Prism Blade", "Prism Crown", "Prism Mantle", "Prism Striders", "Prism Heart" };

/* labels for the stats gear can carry (index: effect key) */
static const char *const stat_label[E_COUNT] = {
    0, "Spell damage", "Bonk damage", "Crit chance", 0, 0, "Free cast chance", 0, 0, "XP gain", "Rare luck",
    "Max HP", "Defense", 0, 0, 0, "Regen per turn", "Unicorn power", 0, "Healing", 0, "Attack", "Magic", "Dodge chance",
};
static u8 is_flat(u8 key)
{
    return key == E_ATKFLAT || key == E_MAGFLAT || key == E_DEFFLAT || key == E_HPMAX || key == E_REGEN;
}

/* ---------- rolling ---------- */

static u8 roll_stat(u8 mn, u8 mx, u8 ilvl)
{
    u16 q = 350 + ilvl * 1000u / 12;           /* higher item level = better rolls */
    unsigned long v;
    if (q > 1000) q = 1000;
    v = mn * 1000ul + (unsigned long)(mx - mn) * rnd(1000) * q / 1000;
    return (u8)((v + 500) / 1000);
}

static u8 pick_affix(const u8 *taken, u8 n)
{
    u8 a, i;
    for (;;) {
        a = rnd(NAFFIX);
        for (i = 0; i < n && taken[i] != a; ++i) ;
        if (i == n) return a;
    }
}

void roll_item(Item *it, u8 ilvl, u8 rarity, u8 slot)
{
    u8 picks[3], n, i, r;
    memset(it, 0, sizeof(Item));
    it->gem[0] = it->gem[1] = 0xFF;
    if (rarity == 0xFF) {                      /* weights 55 / 27 / 14 / 3 / 1 */
        r = rnd(100);
        rarity = r < 55 ? R_COMMON : r < 82 ? R_MAGIC : r < 96 ? R_RARE : r < 99 ? R_LEGEND : R_SET;
    }
    if (slot == 0xFF) slot = rnd(NSLOT);
    if (rarity >= R_LEGEND && ilvl < 6) ilvl = 6;
    it->kind = slot | (rarity << 4);
    if (rarity == R_LEGEND) {
        it->name = slot;
        for (i = 0; i < 2; ++i) {
            it->key[i] = legend_key[slot][i];
            it->val[i] = roll_stat(legend_min[slot][i], legend_max[slot][i], ilvl);
        }
        it->sockets = legend_sockets[slot];
        return;
    }
    if (rarity == R_SET) {
        it->name = slot;
        for (i = 0; i < 2; ++i) {
            picks[i] = pick_affix(picks, i);
            it->key[i] = affix_key[picks[i]];
            it->val[i] = roll_stat((affix_min[picks[i]] + affix_max[picks[i]] + 1) / 2, affix_max[picks[i]], ilvl);
        }
        it->sockets = 1;
        return;
    }
    it->name = rnd(3);
    it->base = roll_stat(base_min[slot], base_max[slot], ilvl);
    n = rarity == R_COMMON ? 0 : rarity == R_MAGIC ? 1 : 2 + (rnd16() & 1);
    for (i = 0; i < n; ++i) {
        picks[i] = pick_affix(picks, i);
        it->key[i] = affix_key[picks[i]];
        it->val[i] = roll_stat(affix_min[picks[i]], affix_max[picks[i]], ilvl);
    }
    it->sockets = rarity == R_RARE ? 1 + chance(40) : chance(rarity == R_MAGIC ? 35 : 20);
}

/* ---------- stats ---------- */

/* a quick power rating: offensive + defensive stats, weighted as in loot.js */
static const u8 rate_key[12] = { E_ATKFLAT, E_MAGFLAT, E_SPELLDMG, E_BASICDMG, E_CRIT, E_UNICORN, E_CHARGESAVE,
                                 E_DEFFLAT, E_HPMAX, E_DODGE, E_REGEN, E_HEALPOWER };
static const u16 rate_w[12] = { 300, 300, 60, 55, 90, 22, 40, 400, 50, 90, 400, 45 };   /* x100 */
u16 item_power(const Item *it)
{
    u16 p = 0;
    u8 i;
    if (it->kind == 0xFF) return 0;
    for (i = 0; i < 12; ++i) p += item_stat(it, rate_key[i]) * rate_w[i];
    return (p + 50) / 100;
}

/* ---------- text ---------- */

void sb_stat(u8 key, i16 v)
{
    sb_str(v < 0 ? "-" : "+");
    sb_num(v < 0 ? -v : v);
    if (!is_flat(key)) sb_str("%");
    sb_str(" ");
    sb_str(stat_label[key]);
}

/* ---------- drops ---------- */

/* put an item in the bag; a full bag crumbles it into 2 raw Quartz */
u8 give_item(const Item *it)
{
    if (P.ninv >= INV_CAP) { P.raw[QUARTZ] += 2; return 0; }
    P.inv[P.ninv++] = *it;
    return 1;
}

/* (no pops: cc65 emits string literals at the end of the file, and they
 * belong in PQ.HI too) */
