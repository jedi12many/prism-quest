/* The hero's stats: levelling, derived stats. (The title, villagers and
 * ledger moved to overlays: ov_*.c.) */
#include <string.h>
#include "game.h"


Player P;

/* ---------- stats (js/game.js calcStats / gainXp) ---------- */

void calc_stats(void)
{
    const ClassDef *c = &classes[P.cls];
    u8 l = P.level - 1;
    P.hpmax = c->hp + 6 * l + 10 /* camp house, level 1 */ + P.bonus_hp + eff(E_HPMAX);
    P.atk = c->atk + l + eff(E_ATKFLAT);
    P.mag = c->mag + l + eff(E_MAGFLAT);
    P.def = (c->def * 2 + l * c->def_grow2) / 2 + eff(E_DEFFLAT);
    if (P.hp > P.hpmax) P.hp = P.hpmax;
}

u16 gain_xp(u16 n)
{
    u8 leveled = 0;
    n = (n * (100 + eff(E_XPGAIN)) + 50) / 100;
    P.xp += n;
    while (P.level < LEVEL_CAP && P.xp >= xp_next[P.level]) {
        P.xp -= xp_next[P.level];
        ++P.level;
        ++P.skill_points;
        leveled = 1;
    }
    if (P.level >= LEVEL_CAP) P.xp = 0;
    if (leveled) {
        calc_stats();
        P.hp = P.hpmax;
        sfx(SFX_LEVEL);
        sb_reset(); sb_str("Level "); sb_num(P.level); sb_str("! Fully healed. +1 skill point");
        log_add(sb, YELLOW);
    }
    return n;
}

u8 lands_freed(void)
{
    u8 i, n = 0;
    for (i = 0; i < NZONE; ++i) if (P.zones_cleared & (1 << i)) ++n;
    return n;
}

