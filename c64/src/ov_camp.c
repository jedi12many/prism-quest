/* Overlay: the Spellbook.
 * Loaded from disk on demand into the overlay window (see ovl() in save.c). */
#include <string.h>
#include "game.h"

#pragma code-name("OVCAMPCODE")
#pragma rodata-name("OVCAMPDATA")

/* spell descriptions (js/data.js SPELLS), only shown here */
static const char *const spell_desc[NSPELL] = {
    "A fizzing burst of glitter. Cheap, cheerful, surprisingly painful.",
    "A shimmering barrier that blocks most damage for 2 turns.",
    "Scorching light that also burns the target for 3 turns.",
    "A splashy blast that weakens the enemy's attacks for 3 turns.",
    "Flowers burst around you, restoring 40% of your health.",
    "Glittering butterflies nip and poison the enemy for 4 turns.",
    "A dwarf crew polishes your ENTIRE bag of raw minerals with a big bonus to Brilliant cuts. Cast from your Bag.",
    "A full-spectrum blast of concentrated joy. Hits hard.",
    "A radiant unicorn fights beside you for 4 turns, attacking and healing.",
    "Calls down a storm of falling stars. Devastating.",
};

/* quality is luck: Steady Hands and dwarf crews raise the odds (per mille) */
/* ---------- spellbook ---------- */

static u8 can_craft(u8 sp)
{
    u8 k;
    for (k = 0; k < 3 && spells[sp].n[k]; ++k)
        if (polished_count(spells[sp].gem[k]) < spells[sp].n[k]) return 0;
    return 1;
}

static void draw_spell_row(u8 sp, u8 selected)
{
    u8 y = 2 + sp, k, x = 25, m, need;
    clear_rows(y, y);
    put_ch(0, y, selected ? CH_POINTER : 0, YELLOW);
    put_str(2, y, spells[sp].name, selected ? YELLOW : can_craft(sp) ? WHITE : CYAN);
    if (P.spells[sp]) { sb_reset(); sb_str("x"); sb_num(P.spells[sp]); put_str(19, y, sb, CYAN); }
    for (k = 0; k < 3 && spells[sp].n[k]; ++k) {
        m = spells[sp].gem[k]; need = spells[sp].n[k];
        put_ch(x, y, '0' - 32 + need, polished_count(m) >= need ? GREEN : RED);
        put_ch(x + 1, y, CH_GEM, mineral_color[m]);
        x += 4;
    }
}

static void draw_spell_info(u8 sp)
{
    u8 k, m;
    clear_rows(14, 19);
    if (sp >= NSPELL) return;
    log_reset(14, 3);
    log_add(spell_desc[sp], WHITE);
    sb_reset(); sb_str("Needs polished:");
    for (k = 0; k < 3 && spells[sp].n[k]; ++k) {
        m = spells[sp].gem[k];
        sb_str(k ? ", " : " "); sb_num(spells[sp].n[k]); sb_str(" "); sb_str(mineral_name[m]);
        sb_str(" ("); sb_num(polished_count(m)); sb_str(")");
    }
    log_reset(18, 2);
    log_add(sb, PURPLE);
}

static void craft(u8 sp)
{
    u8 k, m, need, q, gems = 0, qsum = 0, charges;
    for (k = 0; k < 3 && spells[sp].n[k]; ++k) {
        m = spells[sp].gem[k];
        for (need = spells[sp].n[k]; need; --need) {
            /* best quality first: better gems = more charges */
            for (q = 3; q-- && !P.polished[m][q]; ) ;
            --P.polished[m][q];
            qsum += q;
            ++gems;
        }
    }
    charges = spells[sp].base + (qsum * 2 + gems) / (gems * 2) + eff(E_CHARGES);
    P.spells[sp] += charges;
    sfx(SFX_SPELL);
    sb_reset(); sb_str("Crafted "); sb_str(spells[sp].name); sb_str("! +"); sb_num(charges); sb_str(" charges");
    if (charges > spells[sp].base) sb_str(" (quality bonus!)");
}

void show_spellbook(void)
{
    static char note[80];
    u8 sel = 0, i, in;
    if (!at_camp("craft spells")) return;
    screen_open("Spellbook");
    put_str(12, 0, "craft from polished gems", BLUE);
    for (i = 0; i < NSPELL; ++i) draw_spell_row(i, i == sel);
    put_str(2, 12, "Back", WHITE);
    draw_spell_info(sel);
    for (;;) {
        in = get_input();
        if (in & IN_LEFT) return;
        if (in & (IN_UP | IN_DOWN)) {
            if (sel < NSPELL) draw_spell_row(sel, 0);
            else { put_ch(0, 12, 0, YELLOW); put_str(2, 12, "Back", WHITE); }
            if (in & IN_UP) sel = sel ? sel - 1 : NSPELL;
            else sel = sel == NSPELL ? 0 : sel + 1;
            if (sel < NSPELL) draw_spell_row(sel, 1);
            else { put_ch(0, 12, CH_POINTER, YELLOW); put_str(2, 12, "Back", YELLOW); }
            draw_spell_info(sel);
        } else if (in & IN_FIRE) {
            if (sel == NSPELL) return;
            log_reset(21, 2);
            if (!can_craft(sel)) { log_add("Need more polished gems - polish raw ones in your Bag.", RED); continue; }
            craft(sel);
            strcpy(note, sb);                   /* draw_spell_info reuses sb */
            for (i = 0; i < NSPELL; ++i) draw_spell_row(i, i == sel);
            draw_spell_info(sel);
            log_reset(21, 2);
            log_add(note, YELLOW);
        }
    }
}

