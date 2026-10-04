/* Turn-based combat -- ported from js/battle.js with the same formulas.
 * Fractions are done in fixed point (x100) with 32-bit longs. */
#include <string.h>
#include "game.h"

#define LOG_Y 15
#define LOG_ROWS 10
#define MENU_Y 13

static const MonsterDef *md;
static Mob *mob;
static i16 mhp, mhpmax;
static u8 mdef, tier;
static u16 atk_scale;                   /* x100 */
static u8 el;                           /* elite: 0, or 1 + its mod */

/* elites (js/data.js ELITE_MODS): name, colour, HP and attack (%), defense,
 * XP (%). Swift strikes twice more often, Venomous poisons harder, Cursed
 * dreads, Radiant drops something rare. */
static const char *const elite_name[NELITE] = { "Vicious", "Armored", "Swift", "Venomous", "Cursed", "Radiant" };
static const u8 elite_col[NELITE] = { LTRED, LTBLUE, LTGREEN, PURPLE, PURPLE, YELLOW };
static const u8 elite_hp[NELITE] = { 6, 20, 6, 7, 8, 12 };   /* +twentieths: x1.3, x2, x1.3, x1.35, x1.4, x1.6 */
static const u8 elite_def[NELITE] = { 0, 3, 0, 0, 0, 0 };
static const u8 elite_xp[NELITE] = { 16, 16, 16, 16, 18, 30 };   /* +twentieths: x1.8 .. x2.5 */
static u8 m_burn_t, m_burn_d, m_pois_t, m_pois_d, m_weak_t;
static u8 p_shield_t, p_shield_red, p_pois_t, p_pois_d, p_dread_t;
static u8 uni_t;
static u16 uni_pow;
static u8 over, result;
static u8 last_stand_used;

static void pause(u8 n) { while (n--) wait_frame(); }

static void blog(const char *s, u8 col)
{
    log_add(s, col);
    pause(14);
}

static u8 variance(void) { return 90 + rnd(21); }
static u8 is_crit(void) { return chance(5 + eff(E_CRIT)); }
static u8 dread_pct(void) { return p_dread_t ? 75 : 100; }

static i16 finish(long d100)
{
    i16 d = (i16)((d100 + 50) / 100);
    return d < 1 ? 1 : d;
}

/* ---------- drawing ---------- */

static void bar(u8 x, u8 y, i16 v, i16 max, u8 w, u8 col)
{
    u8 i, n = max > 0 && v > 0 ? (u8)(((long)v * w + max - 1) / max) : 0;
    for (i = 0; i < w; ++i) put_ch(x + i, y, i < n ? CH_BAR : '-' - 32, i < n ? col : BLUE);
}

#pragma bss-name(push, "LOWBSS")
static char sb_keep[sizeof(sb)];
#pragma bss-name(pop)

/* redraw both health lines; preserves the shared string builder */
static void draw_status(void)
{
    memcpy(sb_keep, sb, sizeof(sb));
    clear_rows(1, 1);
    bar(1, 1, mhp, mhpmax, 20, RED);
    sb_reset(); sb_num(mhp > 0 ? mhp : 0); sb_str("/"); sb_num(mhpmax);
    put_str(22, 1, sb, WHITE);
    if (m_burn_t) put_str(31, 1, "BURN", RED);
    if (m_pois_t) put_str(36, 1, "PSN", PURPLE);

    clear_rows(11, 11);
    put_str(1, 11, classes[P.cls].name, YELLOW);
    clear_rows(12, 12);
    put_ch(1, 12, CH_HEART, RED);
    bar(2, 12, P.hp, P.hpmax, 16, GREEN);
    sb_reset(); sb_num(P.hp > 0 ? P.hp : 0); sb_str("/"); sb_num(P.hpmax);
    put_str(19, 12, sb, WHITE);
    if (p_shield_t) put_str(27, 12, "SHLD", CYAN);
    if (p_pois_t) put_str(32, 12, "PSN", PURPLE);
    if (p_dread_t) put_str(36, 12, "DRD", BLUE);
    if (uni_t) put_str(27, 11, "Unicorn!", WHITE);
    memcpy(sb, sb_keep, sizeof(sb));
}

/* the foe's portrait: sprites 3-6, as many as it has layers */
static u8 foe_spr;
static const u8 foe_mask[5] = { 0x00, 0x08, 0x18, 0x38, 0x78 };

/* shake the hero (first = 0: sprites 0-2) or the foe (3: sprites 3-6) */
static void shake(u8 first)
{
    u8 i, k, last = first ? 7 : 3;
    u8 x0 = PEEK(0xD000 + first * 2);
    for (k = 0; k < 6; ++k) {
        for (i = first; i < last; ++i) POKE(0xD000 + i * 2, x0 + ((k & 1) ? 3 : -3));
        wait_frame();
    }
    for (i = first; i < last; ++i) POKE(0xD000 + i * 2, x0);
}

static void flash(u8 col)
{
    POKE(0xD020, col);
    pause(4);
    POKE(0xD020, BLACK);
}

/* ---------- combat ---------- */

static void victory(void);
static void defeat(void);

static u8 hit_monster(i16 dmg, const char *label)
{
    mhp -= dmg;
    sb_reset(); sb_str(label); sb_str(" "); sb_num(dmg); sb_str(" damage!");
    shake(3);
    draw_status();
    blog(sb, WHITE);
    if (mhp <= 0) { victory(); return 1; }
    return 0;
}

static void player_damage(i16 dmg)
{
    i16 r;
    if (over) return;
    P.hp -= dmg;
    if (P.hp > 0) return;
    /* Last Stand: survive at 1 HP, once per battle */
    if (eff(E_LASTSTAND) && !last_stand_used) {
        last_stand_used = 1;
        P.hp = 1;
        blog("Last Stand! You refuse to fall!", YELLOW);
        return;
    }
    /* revive capstone: cheat death once per life */
    if ((r = eff(E_REVIVE)) && !P.revive_used) {
        P.revive_used = 1;
        P.hp = (P.hpmax * r + 50) / 100;
        if (P.hp < 1) P.hp = 1;
        sfx(SFX_LEVEL);
        sb_reset(); sb_str("Death denied! You surge back to "); sb_num(P.hp); sb_str(" HP - but only once.");
        blog(sb, PURPLE);
        return;
    }
    P.hp = 0;
    defeat();
}

static void monster_hit(void)
{
    long a;
    i16 dmg;
    if (over) return;
    /* dodge: a defensive stat from boots and affixes, capped at 60% */
    a = eff(E_DODGE);
    if (a && chance(a > 60 ? 60 : a)) {
        sb_reset(); sb_str("You dance aside - "); sb_str(md->name); sb_str("'s attack whiffs!");
        blog(sb, CYAN);
        return;
    }
    a = (long)md->atk * atk_scale;                 /* x100 */
    if (m_weak_t) a = a * 70 / 100;
    a = a * variance() / 100 * 17 / 10 - P.def * 50;
    dmg = finish(a);
    if (p_shield_t) {
        dmg = finish((long)dmg * (100 - p_shield_red));
        --p_shield_t;
        sb_reset(); sb_str("Shield absorbs the blow - only "); sb_num(dmg); sb_str(" gets through!");
        draw_status();
        blog(sb, CYAN);
    } else {
        sfx(SFX_HURT);
        flash(RED);
        shake(0);
        sb_reset(); sb_str(md->name); sb_str(" hits you for "); sb_num(dmg); sb_str("!");
        blog(sb, RED);
    }
    player_damage(dmg);
    draw_status();
    if (over) return;

    if ((md->flags & MF_POISON || el == EL_VENOMOUS) && chance(40)) {
        p_pois_t = 3; p_pois_d = el == EL_VENOMOUS ? 3 : 2;
        blog("You've been poisoned!", PURPLE);
    }
    if (p_pois_t) {
        --p_pois_t;
        sb_reset(); sb_str("Poison stings you for "); sb_num(p_pois_d); sb_str(".");
        blog(sb, PURPLE);
        player_damage(p_pois_d);
        draw_status();
        if (over) return;
    }
    if ((md->flags & MF_DREAD || el == EL_CURSED) && chance(35)) {
        p_dread_t = 2;
        blog("It whispers something you should not have heard... (your damage -25%)", BLUE);
    }
    if (md->regen && mhp > 0 && mhp < mhpmax) {
        mhp += md->regen;
        if (mhp > mhpmax) mhp = mhpmax;
        sb_reset(); sb_str("The rain knits its wounds closed (+"); sb_num(md->regen); sb_str(").");
        blog(sb, CYAN);
    }
    draw_status();
}

static void enemy_turn(void)
{
    if (over) return;
    monster_hit();
    if (!over && chance(md->double_hit + (el == EL_SWIFT ? 50 : 0))) {
        blog(el == EL_SWIFT ? "It blurs and strikes again!" : "It attacks again!", YELLOW);
        monster_hit();
    }
}

static void bonk(void)
{
    u8 crit = is_crit();
    long d = (long)P.atk * 2 * (100 + eff(E_BASICDMG)) * variance() / 100;
    d = d * dread_pct() / 100;
    if (crit) d = d * 17 / 10;
    d -= mdef * 50;
    sfx(crit ? SFX_CRIT : SFX_BONK);
    hit_monster(finish(d), crit ? "CRITICAL BONK!" : "Bonk!");
}

static void cast(u8 sp)
{
    u8 save = eff(E_CHARGESAVE);
    u8 pet_free = sp == SP_UNICORN && P.cls == CL_WHISPERER;
    u8 crit;
    long d;
    i16 heal;
    if (!pet_free) {
        if (save && chance(save)) blog("Chain Light - the charge is refunded!", CYAN);
        else --P.spells[sp];
    }
    sfx(SFX_SPELL);
    flash(sp == SP_SUNFLARE ? YELLOW : sp == SP_TIDEPOP ? BLUE : PURPLE);
    switch (sp) {
    case SP_SHIELD:
        p_shield_t = 2;
        p_shield_red = 60 * (100 + eff(E_SHIELD)) / 100;
        if (p_shield_red > 90) p_shield_red = 90;
        sb_reset(); sb_str("Prism Shield! Blocking "); sb_num(p_shield_red); sb_str("% damage for 2 turns.");
        blog(sb, CYAN);
        break;
    case SP_BLOOM:
        heal = (i16)(((long)P.hpmax * 40 * (100 + eff(E_HEALPOWER)) + 5000) / 10000);
        P.hp += heal; if (P.hp > P.hpmax) P.hp = P.hpmax;
        sb_reset(); sb_str("Healing Bloom restores "); sb_num(heal); sb_str(" HP!");
        draw_status();
        blog(sb, GREEN);
        break;
    case SP_UNICORN:
        uni_t = 4 + eff(E_SUMMONTURNS);
        uni_pow = 100 + eff(E_UNICORN);
        sb_reset(); sb_str(pet_free ? "Your bonded" : "A radiant"); sb_str(" unicorn gallops to your side! (");
        sb_num(uni_t); sb_str(" turns)");
        blog(sb, WHITE);
        break;
    default:
        crit = is_crit();
        d = (long)spells[sp].power * (100 + P.mag * 5) * (100 + eff(E_SPELLDMG)) / 100;
        d = d * variance() / 100 * dread_pct() / 100;
        if (crit) d = d * 17 / 10;
        d -= mdef * 30;
        sb_reset(); sb_str(spells[sp].name); sb_str(crit ? " CRIT!" : "!");
        if (hit_monster(finish(d), sb)) return;
        if (sp == SP_SUNFLARE) { m_burn_t = 3; m_burn_d = 4; blog("It's burning!", RED); }
        if (sp == SP_BUTTERFLY) { m_pois_t = 4; m_pois_d = 3; blog("It's poisoned!", PURPLE); }
        if (sp == SP_TIDEPOP) { m_weak_t = 3; blog("Its attacks are weakened!", BLUE); }
        break;
    }
}

/* after the hero acts: status ticks, the unicorn, then the monster's turn */
static void end_of_turn(void)
{
    i16 d, heal;
    if (over) return;
    if (m_burn_t) {
        --m_burn_t; mhp -= m_burn_d;
        sb_reset(); sb_str(md->name); sb_str(" takes "); sb_num(m_burn_d); sb_str(" burn damage.");
        draw_status(); blog(sb, RED);
        if (mhp <= 0) { victory(); return; }
    }
    if (m_pois_t) {
        --m_pois_t; mhp -= m_pois_d;
        sb_reset(); sb_str(md->name); sb_str(" takes "); sb_num(m_pois_d); sb_str(" poison damage.");
        draw_status(); blog(sb, PURPLE);
        if (mhp <= 0) { victory(); return; }
    }
    if (m_weak_t) --m_weak_t;
    if (p_dread_t) --p_dread_t;
    if (uni_t) {
        --uni_t;
        d = finish(8L * uni_pow * (100 + 4 * P.mag) / 100 * variance() / 100);
        heal = (i16)((6L * uni_pow * (100 + eff(E_HEALPOWER)) + 5000) / 10000);
        P.hp += heal; if (P.hp > P.hpmax) P.hp = P.hpmax;
        mhp -= d;
        sb_reset(); sb_str("Unicorn charges for "); sb_num(d); sb_str(" and heals you "); sb_num(heal); sb_str("!");
        shake(3);
        draw_status(); blog(sb, WHITE);
        if (mhp <= 0) { victory(); return; }
        if (!uni_t) blog("The unicorn bows and departs.", CYAN);
    }
    if ((d = eff(E_REGEN)) && P.hp < P.hpmax) {
        P.hp += d; if (P.hp > P.hpmax) P.hp = P.hpmax;
        draw_status();
    }
    enemy_turn();
}

static void victory(void)
{
    u8 i, total, pick;
    i16 roll;
    u16 xp;
    over = 1; result = 1;
    ++P.kills;
    POKE(0xD015, 0x07);                         /* the foe vanishes */
    sfx(SFX_WIN);
    sb_reset(); sb_str(md->name); sb_str(" is defeated!");
    blog(sb, YELLOW);
    xp = (md->xp * (10 + 3 * (tier - 1)) + 5) / 10;
    if (el) xp += xp * elite_xp[el - 1] / 20;
    xp = gain_xp(xp);
    sb_reset(); sb_str("+"); sb_num(xp); sb_str(" XP");
    blog(sb, CYAN);
    if ((md->flags & MF_BOSS) || chance(60)) {
        for (total = 0, i = 0; i < NMIN; ++i) total += md->drop[i];
        roll = rnd(total);
        for (pick = 0, i = 0; i < NMIN; ++i) {
            if (!md->drop[i]) continue;
            pick = i;
            roll -= md->drop[i];
            if (roll < 0) break;
        }
        i = (md->flags & MF_BOSS) ? 2 : 1;
        P.raw[pick] += i;
        sb_reset(); sb_str("It dropped "); sb_num(i); sb_str(" raw "); sb_str(mineral_name[pick]); sb_str("!");
        blog(sb, WHITE);
    }
    if ((total = eff(E_HEALONWIN))) {
        roll = (P.hpmax * total + 50) / 100;
        P.hp += roll; if (P.hp > P.hpmax) P.hp = P.hpmax;
        sb_reset(); sb_str("Second Wind restores "); sb_num(roll); sb_str(" HP.");
        blog(sb, GREEN);
    }
    monster_loot(mob->type);
    if (sb[0]) blog(sb, ORANGE);
    mob->alive = 0;
    mob->respawn = (md->flags & MF_BOSS) ? 0xFFFF : seconds + 45;
    draw_status();
}

static void defeat(void)
{
    over = 1; result = 2;
    sfx(SFX_DEATH);
    POKE(0xD015, foe_spr);                      /* the hero falls */
    sb_reset(); sb_str(classes[P.cls].name); sb_str(" has fallen. The gloom claims another hero...");
    blog(sb, RED);
}

/* ---------- menus ---------- */

static const char *const opts[3] = { "Bonk", "Spell", "Run" };

static void draw_menu(u8 sel)
{
    u8 i;
    clear_rows(MENU_Y, MENU_Y);
    for (i = 0; i < 3; ++i) {
        if (i == sel) put_ch(1 + i * 13, MENU_Y, CH_POINTER, YELLOW);
        put_str(2 + i * 13, MENU_Y, opts[i], i == sel ? YELLOW : BLUE);
        put_ch(2 + i * 13, MENU_Y, glyph(opts[i][0]), i == sel ? WHITE : CYAN);
    }
}

/* returns spell id, or 0xFF to cancel */
static u8 spell_menu(void)
{
    u8 list[NSPELL], n = 0, i, sel = 0;
    for (i = 0; i < NSPELL; ++i)
        if (i != SP_DWARVES && (P.spells[i] || (i == SP_UNICORN && P.cls == CL_WHISPERER))) list[n++] = i;
    log_reset(LOG_Y, LOG_ROWS);
    if (!n) { blog("No spell charges! Craft spells at camp.", BLUE); return 0xFF; }
    put_str(1, LOG_Y, "Cast which spell? (fire, or R to go back)", CYAN);
    for (;;) {
        for (i = 0; i < n; ++i) {
            put_ch(1, LOG_Y + 2 + i, i == sel ? CH_POINTER : 0, YELLOW);
            put_str(3, LOG_Y + 2 + i, spells[list[i]].name, i == sel ? YELLOW : WHITE);
            sb_reset();
            if (list[i] == SP_UNICORN && P.cls == CL_WHISPERER) sb_str("bonded");
            else { sb_str("x"); sb_num(P.spells[list[i]]); }
            put_str(21, LOG_Y + 2 + i, sb, CYAN);
        }
        do { wait_frame(); input_poll(); } while (!in_new && !key_hit(K_R));
        if (in_new & IN_UP && sel) --sel;
        else if (in_new & IN_DOWN && sel + 1 < n) ++sel;
        else if (in_new & IN_FIRE) { log_reset(LOG_Y, LOG_ROWS); return list[sel]; }
        else if (in_new & IN_LEFT || !in_new) { log_reset(LOG_Y, LOG_ROWS); return 0xFF; }
    }
}

static u8 choose(void)
{
    static u8 sel;
    for (;;) {
        draw_menu(sel);
        for (;;) {
            wait_frame(); input_poll();
            if (in_new & IN_BONK) { sel = 0; break; }
            if (key_hit(K_S)) { sel = 1; break; }
            if (key_hit(K_R)) { sel = 2; break; }
            if (in_new & IN_LEFT) { sel = sel ? sel - 1 : 2; draw_menu(sel); }
            if (in_new & IN_RIGHT) { sel = sel == 2 ? 0 : sel + 1; draw_menu(sel); }
            if (in_new & IN_FIRE) break;
        }
        draw_menu(sel);
        return sel;
    }
}

/* what falls out of a defeated monster (js/loot.js rollMonsterLoot); leaves a
 * log line in sb (or "") */
void monster_loot(u8 type)
{
    static Item it;
    const MonsterDef *md = &monsters[type];
    u8 ilvl = (md->xp + 6) / 12, r;
    if (ilvl < 1) ilvl = 1;
    if (ilvl > 10) ilvl = 10;
    sb_reset();
    if (md->flags & MF_BOSS) {                 /* a gloom champion */
        r = rnd(100);
        roll_item(&it, ilvl, r < 25 ? R_SET : r < 45 ? R_LEGEND : R_RARE, 0xFF);
    } else if (el == EL_RADIANT)               /* radiant: something rare, at least */
        roll_item(&it, tier < 2 ? 2 : tier * 2, chance(30) ? R_LEGEND : R_RARE, 0xFF);
    else if (el) roll_item(&it, tier * 2, 0xFF, 0xFF);   /* elites always drop */
    else if (chance(25)) roll_item(&it, ilvl, 0xFF, 0xFF);
    else return;
    if (!give_item(&it)) { sb_str("Bag full! The item crumbled into 2 raw Quartz."); return; }
    sb_str("Loot: "); sb_item_name(&it); sb_str(" (");
    sb_str(rarity_name[ITEM_RARITY(&it)]); sb_str(" "); sb_str(slot_name[ITEM_SLOT(&it)]); sb_str(")");
}


/* ---------- entry ---------- */

u8 battle(u8 mi, u8 ambush)
{
    u8 i, act, sp;
    mob = &mobs[mi];
    md = &monsters[mob->type];
    tier = combat_tier();
    if (map_id == MAP_DUNGEON && (md->flags & (MF_BOSS | MF_KEEPER)) == MF_BOSS)
        tier = dg.tier - dg.floor + 1;      /* a champion below fights as it would above */
    mhpmax = mhp = (md->hp * (10 + 4 * (tier - 1)) + 5) / 10;
    atk_scale = 100 + 22 * (tier - 1);
    mdef = md->def;
    if ((el = mob_elite[mi])) {
        mhpmax = mhp += (u16)mhp * elite_hp[el - 1] / 20;
        if (el == EL_VICIOUS) atk_scale += atk_scale * 9 / 20;   /* x1.45 */
        mdef += elite_def[el - 1];
    }
    if (map_id == MAP_DUNGEON && mi == dg.warden) {   /* the Warden (an armored elite): tougher still */
        mhpmax = mhp += (u16)mhp * 3 / 5;
        atk_scale += atk_scale * 3 / 20;
    }
#ifdef TEST_WEAK
    mhpmax = mhp = 1;                   /* (tests: one bonk does it) */
#endif
    m_burn_t = m_pois_t = m_weak_t = 0;
    p_shield_t = p_pois_t = p_dread_t = 0;
    uni_t = 0;
    last_stand_used = 0;
    over = 0; result = 0;

    POKE(0xD015, 0);
    cls();
    POKE(0xD021, BLACK);
    POKE(0xD020, BLACK);
    foe_spr = foe_mask[mon_sprites(md->sprite)];    /* (first: it may load the big foes' overlay, with the castle's names) */
    sb_reset();
    if (el) { sb_str(elite_name[el - 1]); sb_str(" "); }
    sb_str(md->name);
    put_str(1, 0, sb, el ? elite_col[el - 1] : (md->flags & MF_BOSS) ? YELLOW : WHITE);
    hero_sprites(P.cls);
    for (i = 0; i < 7; ++i)             /* both doubled: 48x42, feet level */
        spr_pos(i, i < 3 ? 56 : 224, 68);
    POKE(0xD017, 0x7F); POKE(0xD01D, 0x7F);
    POKE(0xD01C, 0x04);                 /* (the hero's fill is multicolour) */
    POKE(0xD015, 0x07 | foe_spr);
    music(TUNE_BATTLE);
    draw_status();
    log_reset(LOG_Y, LOG_ROWS);
    sb_reset();
    if (md->flags & MF_BOSS) { sb_str(md->name); sb_str(" bars your way!"); }
    else {
        sb_str("A wild "); if (el) { sb_str(elite_name[el - 1]); sb_str(" "); }
        sb_str(md->name); sb_str(" appears!");
    }
    blog(sb, WHITE);
    if (md->sprite >= CASTLE_SPRITE0) blog(castle_cry[md->sprite - CASTLE_SPRITE0], YELLOW);
    else if (md->flags & MF_KEEPER) blog("The keeper of this place stirs - deadly, but its hoard is legendary!", YELLOW);
    else if (md->flags & MF_BOSS) blog("A champion of the gloom! Defeat it and the light returns to this land!", YELLOW);
    else if (map_id == MAP_DUNGEON && mi == dg.warden) blog("The Warden! It carries the key to the stair.", YELLOW);
    if (ambush && !eff(E_FLEESURE)) { blog("Ambush! It strikes first!", RED); monster_hit(); }

    while (!over) {
        act = choose();
        if (act == 0) bonk();
        else if (act == 1) {
            sp = spell_menu();
            if (sp == 0xFF) continue;
            cast(sp);
        } else {
            if (eff(E_FLEESURE) || chance(60)) { blog("You slip away in a puff of glitter!", CYAN); over = 1; result = 0; break; }
            blog("Couldn't escape!", RED);
        }
        draw_status();
        end_of_turn();
        draw_status();
    }
    clear_rows(MENU_Y, MENU_Y);
    put_str(1, MENU_Y, "Press fire to continue", BLUE);
    wait_fire();
    POKE(0xD015, 0);
    POKE(0xD017, 0); POKE(0xD01D, 0);
    world_hud_dirty();
    return result;
}
