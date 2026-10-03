/* Gems, polishing, spell crafting and the Power Tree -- ported from js/ui.js. */
#include <string.h>
#include "game.h"

/* ---------- effects (js/game.js eff) ---------- */

/* Is skill (branch b, tier t) learned? Note: written as a shift-and-mask on
 * purpose -- cc65 2.19 miscompiles `!(P.skills & (1u << n))` (it tests only
 * the high byte of the result), which silently disabled the first 8 skills. */
static u8 owned(u8 b, u8 t) { return (P.skills >> (b * 5 + t)) & 1; }

i16 eff(u8 key)
{
    i16 v = 0;
    u8 b, t, k;
    const Eff *e;
    for (k = 0; k < 2; ++k)
        if (class_perk[P.cls][k].key == key) v += class_perk[P.cls][k].val;
    if (!P.skills) return v;
    for (b = 0; b < 3; ++b)
        for (t = 0; t < 5; ++t) {
            if (!owned(b, t)) break;               /* tiers unlock in order */
            e = tree[P.cls][b].node[t].eff;
            if (e[0].key == key) v += e[0].val;
            if (e[1].key == key) v += e[1].val;
        }
    return v;
}

/* ---------- gems ---------- */

u16 polished_count(u8 m) { return P.polished[m][0] + P.polished[m][1] + P.polished[m][2]; }
u16 gem_stock(u8 m) { return P.raw[m] + polished_count(m); }

/* raw first, then polished cheapest-quality first */
void consume_gems(u8 m, u8 n)
{
    u8 q;
    while (n && P.raw[m]) { --P.raw[m]; --n; }
    for (q = 0; q < 3 && n; ++q)
        while (n && P.polished[m][q]) { --P.polished[m][q]; --n; }
}

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

/* ---------- shared UI ---------- */

static void put_strn(u8 x, u8 y, const char *s, u8 max, u8 col)
{
    while (*s && max--) put_ch(x++, y, glyph(*s++), col);
}

static void screen_open(const char *title)
{
    POKE(0xD015, 0);
    cls();
    POKE(0xD021, BLACK);
    POKE(0xD020, BLACK);
    put_str(1, 0, title, YELLOW);
}

/* wait for a joystick/keyboard decision: returns the in_new bits, or IN_LEFT for R/STOP */
static u8 get_input(void)
{
    for (;;) {
        wait_frame(); input_poll();
        if (key_hit(K_R) || key_hit(K_STOP)) return IN_LEFT;
        if (in_new) return in_new;
    }
}

u8 menu_pick(u8 x, u8 y0, const char *const *items, u8 n, u8 sel)
{
    u8 i, in;
    for (;;) {
        for (i = 0; i < n; ++i) {
            put_ch(x, y0 + i, i == sel ? CH_POINTER : 0, YELLOW);
            put_str(x + 2, y0 + i, items[i], i == sel ? YELLOW : WHITE);
        }
        in = get_input();
        if (in & IN_UP) sel = sel ? sel - 1 : n - 1;
        else if (in & IN_DOWN) sel = sel + 1 == n ? 0 : sel + 1;
        else if (in & IN_FIRE) return sel;
        else if (in & IN_LEFT) return 0xFF;
    }
}

static u8 at_camp(const char *what)
{
    if (map_id == MAP_VILLAGE) return 1;
    sb_reset(); sb_str("Too dangerous out here! Return to Drizzlewick to "); sb_str(what); sb_str(".");
    say(0, sb);
    return 0;
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
            polish_all(150);                    /* master craftsdwarves */
            sfx(SFX_LEVEL);
            tally_msg("Hi-ho! The dwarf crew polished");
            log_add(sb, YELLOW);
        } else return;
    }
}

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
    log_add(spells[sp].desc, WHITE);
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

/* ---------- the Power Tree ---------- */

#define TREE_X(b) ((b) * 13 + 1)
#define TREE_Y(t) (4 + (t) * 2)

static u8 unlocked(u8 b, u8 t) { return t == 0 || owned(b, t - 1); }

static void draw_node(u8 b, u8 t, u8 selected)
{
    u8 x = TREE_X(b), y = TREE_Y(t);
    u8 col = owned(b, t) ? YELLOW : unlocked(b, t) ? WHITE : BLUE;
    put_ch(x - 1, y, selected ? CH_POINTER : 0, CYAN);
    put_ch(x, y, owned(b, t) ? CH_STAR : unlocked(b, t) ? '+' - 32 : '-' - 32, col);
    put_strn(x + 1, y, tree[P.cls][b].node[t].name, 11, selected ? CYAN : col);
}

static void draw_tree_info(u8 b, u8 t)
{
    clear_rows(15, 19);
    if (t == 5) { put_str(1, 15, "Back to Drizzlewick", WHITE); return; }
    put_str(1, 15, tree[P.cls][b].node[t].name, tree[P.cls][b].color);
    put_str(30, 15, owned(b, t) ? "learned" : unlocked(b, t) ? "available" : "locked", owned(b, t) ? YELLOW : unlocked(b, t) ? WHITE : BLUE);
    wrap(tree[P.cls][b].node[t].desc, 16, 2, WHITE);
}

static void draw_points(void)
{
    clear_rows(20, 20);
    sb_reset(); sb_str("Skill points to spend: "); sb_num(P.skill_points);
    put_str(1, 20, sb, P.skill_points ? YELLOW : WHITE);
}

void show_tree(void)
{
    u8 b = 0, t = 0, i, k, in;
    if (!at_camp("train your powers")) return;
    screen_open("Power Tree");
    put_str(13, 0, classes[P.cls].name, CYAN);
    for (i = 0; i < 3; ++i) {
        put_str(TREE_X(i), 2, tree[P.cls][i].name, tree[P.cls][i].color);
        for (k = 0; k < 5; ++k) draw_node(i, k, 0);
    }
    put_str(2, TREE_Y(5), "Back", WHITE);
    log_reset(22, 3);
    log_add("Level cap 12 - you can't learn everything. You'll only reach 2 of the 3 capstones, so builds matter.", BLUE);
    draw_node(b, t, 1);
    draw_tree_info(b, t);
    draw_points();
    for (;;) {
        in = get_input();
        if ((in & IN_LEFT) && (b == 0 || t == 5)) return;
        if (t < 5) draw_node(b, t, 0);
        else { put_ch(0, TREE_Y(5), 0, CYAN); put_str(2, TREE_Y(5), "Back", WHITE); }
        if (in & IN_UP && t) --t;
        else if (in & IN_DOWN && t < 5) ++t;
        else if (in & IN_LEFT && b) --b;
        else if (in & IN_RIGHT && b < 2) ++b;
        else if (in & IN_FIRE) {
            if (t == 5) return;
            clear_rows(18, 19);
            if (owned(b, t)) ;
            else if (!unlocked(b, t)) put_str(1, 18, "Learn the skill above it first.", RED);
            else if (!P.skill_points) put_str(1, 18, "No skill points - level up by defeating monsters!", RED);
            else {
                --P.skill_points;
                P.skills |= 1u << (b * 5 + t);
                calc_stats();
                sfx(SFX_LEVEL);
                if (t + 1 < 5) draw_node(b, t + 1, 0);
                draw_points();
                draw_tree_info(b, t);
                sb_reset(); sb_str("Learned "); sb_str(tree[P.cls][b].node[t].name); sb_str("!");
                put_str(1, 18, sb, YELLOW);
                draw_node(b, t, 1);
                continue;
            }
        }
        if (t < 5) draw_node(b, t, 1);
        else { put_ch(0, TREE_Y(5), CH_POINTER, CYAN); put_str(2, TREE_Y(5), "Back", YELLOW); }
        draw_tree_info(b, t);
    }
}

/* ---------- the camp menu (fire in the world) ---------- */

static const char *const camp_items[6] = { "Bag & polishing", "Spellbook", "Power Tree", "Village Ledger", "Save game", "Back" };

void camp_menu(void)
{
    u8 sel;
    POKE(0xD015, 0);
    msg_clear();
    sel = menu_pick(1, MSG_ROW - 2, camp_items, 6, 0);
    if (sel == 0) show_bag();
    else if (sel == 1) show_spellbook();
    else if (sel == 2) show_tree();
    else if (sel == 3) show_ledger();
    else if (sel == 4) { clear_rows(MSG_ROW - 2, 24); save_game(); wait_fire(); }
}
