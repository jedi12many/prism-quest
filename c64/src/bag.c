/* Overlay: the Bag -- raw and polished gems, "Polish all" and Summon
 * Dwarves. (Once resident, so polishing cost no disk load; it moved out to
 * make room. If it's still in the window from last time, it costs none.)
 * Loaded from disk on demand into the overlay window (see ovl() in save.c). */
#include <string.h>
#include "game.h"

#pragma code-name("OVBAGCODE")
#pragma rodata-name("OVBAGDATA")
#pragma bss-name("OVBAGDATA")

/* quality is luck: Steady Hands and dwarf crews raise the odds (per mille) */
static u8 roll_quality(u16 bonus)
{
    u16 luck = eff(E_POLISH) + bonus;
    u16 pb = 120 + luck * 18 / 10, pf = 330 + luck * 15 / 10;
    u16 r = rnd(1000);
    if (pb > 750) pb = 750;
    if (pf > 900 - pb) pf = 900 - pb;
    if (r < pb) return Q_BRILLIANT;
    if (r < pb + pf) return Q_FINE;
    return Q_ROUGH;
}

static u16 tally[3];

void polish_all(u16 bonus)
{
    u8 m, q;
    tally[0] = tally[1] = tally[2] = 0;
    for (m = 0; m < NMIN; ++m)
        while (P.raw[m]) {
            q = roll_quality(bonus);
            ++P.polished[m][q];
            ++tally[q];
            --P.raw[m];
        }
}

static void tally_msg(const char *who)
{
    sb_reset(); sb_str(who); sb_str(" ");
    sb_num(tally[0] + tally[1] + tally[2]); sb_str(" gems: ");
    sb_num(tally[2]); sb_str(" brilliant, "); sb_num(tally[1]); sb_str(" fine, ");
    sb_num(tally[0]); sb_str(" rough.");
}

/* ---------- the bag: polish, dwarves ---------- */

static void draw_bag(void)
{
    u8 i, y;
    clear_rows(2, 19);
    sb_reset(); sb_str("Lv "); sb_num(P.level); sb_str("  HP "); sb_num(P.hp); sb_str("/"); sb_num(P.hpmax);
    sb_str("  ATK "); sb_num(P.atk); sb_str("  MAG "); sb_num(P.mag); sb_str("  DEF "); sb_num(P.def);
    put_str(1, 2, sb, WHITE);
    put_str(1, 4, "Mineral        Raw  Rough Fine Brill", PURPLE);
    for (i = 0; i < NMIN; ++i) {
        y = 5 + i;
        put_ch(2, y, CH_GEM, mineral_color[i]);
        put_str(4, y, mineral_name[i], WHITE);
        put_num(16, y, P.raw[i], P.raw[i] ? YELLOW : BLUE);
        put_num(22, y, P.polished[i][0], CYAN);
        put_num(28, y, P.polished[i][1], CYAN);
        put_num(33, y, P.polished[i][2], WHITE);
    }
    put_str(1, 13, "Spell charges", PURPLE);
    for (y = 0, i = 0; i < NSPELL; ++i) {
        if (!P.spells[i] && !(i == SP_UNICORN && P.cls == CL_WHISPERER)) continue;
        put_strn(2 + (y & 1) * 20, 14 + y / 2, spells[i].name, 14, WHITE);
        sb_reset();
        if (i == SP_UNICORN && P.cls == CL_WHISPERER) sb_str("pet");
        else { sb_str("x"); sb_num(P.spells[i]); }
        put_str(17 + (y & 1) * 20, 14 + y / 2, sb, CYAN);
        ++y;
    }
    if (!y) put_str(2, 14, "none - craft some in the Spellbook", BLUE);
}

static const char *const bag_items[3] = { "Polish all", "Summon Dwarves", "Back" };

void show_bag(void)
{
    u8 sel = 0, raw, i;
    screen_open("Bag");
    put_str(8, 0, classes[P.cls].name, CYAN);
    for (;;) {
        draw_bag();
        for (raw = 0, i = 0; i < NMIN; ++i) raw += P.raw[i] ? 1 : 0;
        sel = menu_pick(1, 20, bag_items, 3, sel);
        clear_rows(23, 24);
        if (sel == 0) {
            if (!raw) { log_reset(23, 2); log_add("Nothing raw to polish. Mine some sparkling nodes!", BLUE); continue; }
            polish_all(0);
            sfx(tally[2] ? SFX_LEVEL : SFX_MINE);
            tally_msg("Polished");
            log_reset(23, 2); log_add(sb, tally[2] ? YELLOW : WHITE);
        } else if (sel == 1) {
            log_reset(23, 2);
            if (!P.spells[SP_DWARVES]) { log_add("You have no dwarf crews. Foreman Flint might help - or craft one.", BLUE); continue; }
            if (!raw) { log_add("The dwarves peer into your empty bag and shrug.", BLUE); continue; }
            --P.spells[SP_DWARVES];
            deed(DE_HIHO);
            polish_all(150);                    /* master craftsdwarves */
            sfx(SFX_LEVEL);
            tally_msg("Hi-ho! The dwarf crew polished");
            log_add(sb, YELLOW);
        } else return;
    }
}

