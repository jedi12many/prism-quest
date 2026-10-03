/* The gear screens: what you wear, the bag of items, item cards, faceting
 * gems into sockets, and salvage -- ported from js/ui.js. */
#include <string.h>
#include "game.h"

#define LIST_Y 10
#define LIST_ROWS 12

static u8 top;                         /* first bag item shown */

static void wait_input(void)
{
    do { wait_frame(); input_poll(); } while (!in_new && !key_hit(K_R));
}

static void put_name(u8 x, u8 y, const Item *it, u8 max)
{
    sb_reset();
    if (it->kind == 0xFF) { put_str(x, y, "-", DKGREY); return; }
    sb_item_name(it);
    if (strlen(sb) > max) sb[max] = 0;
    put_str(x, y, sb, rarity_color[ITEM_RARITY(it)]);
}

/* '+' if it beats what's worn in its slot, '-' if worse */
static void put_verdict(u8 x, u8 y, const Item *it)
{
    u16 a = item_power(it), b = item_power(&P.equip[ITEM_SLOT(it)]);
    put_ch(x, y, a > b ? '+' - 32 : a < b ? '-' - 32 : '=' - 32, a > b ? GREEN : a < b ? RED : GREY);
}

static void draw_gear(u8 sel)
{
    u8 i, y, n;
    clear_rows(2, 22);
    for (i = 0; i < NSLOT; ++i) {
        put_ch(0, 2 + i, sel == i ? CH_POINTER : 0, YELLOW);
        put_str(1, 2 + i, slot_name[i], sel == i ? WHITE : GREY);
        put_name(8, 2 + i, &P.equip[i], 31);
    }
    if ((n = set_count())) {
        sb_reset(); sb_str("Rainbow Raiment "); sb_num(n); sb_str("/5");
        if (n >= 3) sb_str(n == 5 ? ": DOUBLE RAINBOW!" : ": +15% spell, +10% crit");
        put_str(1, 8, sb, LTGREEN);
    }
    put_str(1, 24, "Fire: inspect   Left/R: back", BLUE);
    sb_reset(); sb_str("Bag "); sb_num(P.ninv); sb_str("/24");
    put_str(1, LIST_Y - 1, sb, PURPLE);
    if (!P.ninv) put_str(2, LIST_Y, "empty - monsters drop gear", DKGREY);
    for (i = 0; i < LIST_ROWS && top + i < P.ninv; ++i) {
        y = LIST_Y + i;
        put_ch(0, y, sel == NSLOT + top + i ? CH_POINTER : 0, YELLOW);
        put_name(2, y, &P.inv[top + i], 34);
        put_verdict(38, y, &P.inv[top + i]);
    }
    if (top) put_ch(39, LIST_Y, '^' - 32, GREY);
    if (top + LIST_ROWS < P.ninv) put_ch(39, LIST_Y + LIST_ROWS - 1, 'V' - 32, GREY);
}

/* pick a polished gem to facet; returns mineral | quality << 4, or 0xFF */
static u8 pick_gem(void)
{
    static u8 opt[NMIN * 3];
    static const char *const qname[3] = { "Rough", "Fine", "Brilliant" };
    u8 n = 0, m, q, sel = 0, i;
    clear_rows(2, 24);
    put_str(1, 2, "Facet which gem?", PURPLE);
    for (m = 0; m < NMIN; ++m)
        for (q = 3; q--; )
            if (P.polished[m][q]) opt[n++] = m | q << 4;
    if (!n) { put_str(1, 4, "No polished gems - polish some in your Bag.", RED); wait_fire(); return 0xFF; }
    for (;;) {
        for (i = 0; i < n; ++i) {
            m = opt[i] & 15; q = opt[i] >> 4;
            put_ch(0, 4 + i, i == sel ? CH_POINTER : 0, YELLOW);
            put_ch(1, 4 + i, CH_GEM, mineral_color[m]);
            sb_reset(); sb_str(qname[q]); sb_str(" "); sb_str(mineral_name[m]);
            sb_str(" x"); sb_num(P.polished[m][q]);
            put_str(3, 4 + i, sb, i == sel ? WHITE : GREY);
            sb_reset(); sb_stat(gem_key[m], gem_val[m][q]);
            put_str(24, 4 + i, sb, CYAN);
        }
        wait_input();
        if (in_new & IN_UP && sel) --sel;
        else if (in_new & IN_DOWN && sel + 1 < n) ++sel;
        else if (in_new & IN_FIRE) return opt[sel];
        else if (in_new & IN_LEFT || !in_new) return 0xFF;
    }
}

/* the item card; `slot` is the worn slot, or 0xFF for bag item `idx`.
 * Returns 1 if the item moved (equipped, unequipped or salvaged). */
static u8 item_card(u8 slot, u8 idx)
{
    static u8 keys[6];
    static i16 vals[6];
    static const char *const bag_acts[4] = { "Equip", "Facet a gem", "Salvage", "Back" };
    static const char *const worn_acts[3] = { "Unequip", "Facet a gem", "Back" };
    Item *it = slot == 0xFF ? &P.inv[idx] : &P.equip[slot];
    Item old;
    u8 i, n, y, g, act, s = ITEM_SLOT(it);

    for (;;) {
        clear_rows(2, 24);
        put_name(1, 2, it, 38);
        sb_reset(); sb_str(rarity_name[ITEM_RARITY(it)]); sb_str(" "); sb_str(slot_name[s]);
        sb_str("   Power "); sb_num(item_power(it));
        put_str(1, 3, sb, GREY);
        n = item_lines(it, keys, vals);
        for (y = 5, i = 0; i < n; ++i, ++y) { sb_reset(); sb_stat(keys[i], vals[i]); put_str(2, y, sb, WHITE); }
        for (i = 0; i < it->sockets; ++i, ++y) {
            g = it->gem[i];
            sb_reset(); sb_str("Socket: ");
            if (g == 0xFF) sb_str("empty");
            else { sb_str(mineral_name[g & 15]); sb_str(" "); sb_stat(gem_key[g & 15], gem_val[g & 15][g >> 4]); }
            put_str(2, y, sb, g == 0xFF ? DKGREY : CYAN);
        }
        if (ITEM_RARITY(it) == R_LEGEND) { log_reset(y + 1, 2); log_add(legend_lore[s], ORANGE); }
        if (slot == 0xFF) {
            put_str(1, 15, "Worn:", GREY);
            put_name(7, 15, &P.equip[s], 32);
            if (P.equip[s].kind != 0xFF) { sb_reset(); sb_str("Power "); sb_num(item_power(&P.equip[s])); put_str(7, 16, sb, GREY); }
        }
        act = slot == 0xFF ? menu_pick(1, 18, bag_acts, 4, 0) : menu_pick(1, 18, worn_acts, 3, 0);
        clear_rows(23, 24);
        if (act == 0xFF || (slot == 0xFF ? act == 3 : act == 2)) return 0;
        if (act == 1) {                                  /* facet a gem */
            for (i = 0; i < it->sockets && it->gem[i] != 0xFF; ++i) ;
            if (i == it->sockets) { log_reset(23, 2); log_add(it->sockets ? "Every socket is already filled." : "This item has no sockets.", RED); wait_fire(); continue; }
            g = pick_gem();
            if (g == 0xFF) continue;
            --P.polished[g & 15][g >> 4];
            it->gem[i] = g;
            sfx(SFX_LEVEL);
            calc_stats();
            continue;
        }
        if (slot != 0xFF) {                              /* unequip */
            if (P.ninv >= INV_CAP) { log_reset(23, 2); log_add("Bag is full - make room first.", RED); wait_fire(); continue; }
            P.inv[P.ninv++] = *it;
            it->kind = 0xFF;
        } else if (act == 0) {                           /* equip: swap with what's worn */
            old = P.equip[s];
            P.equip[s] = *it;
            if (old.kind != 0xFF) *it = old;
            else { --P.ninv; memmove(it, it + 1, (P.ninv - idx) * sizeof(Item)); }
            sfx(SFX_GATE);
        } else {                                         /* salvage: gems back, plus quartz */
            for (i = 0; i < 2; ++i) if ((g = it->gem[i]) != 0xFF) ++P.polished[g & 15][g >> 4];
            P.raw[QUARTZ] += ITEM_RARITY(it) >= R_LEGEND ? 3 : 1;
            --P.ninv;
            memmove(it, it + 1, (P.ninv - idx) * sizeof(Item));
            sfx(SFX_MINE);
        }
        calc_stats();
        return 1;
    }
}

void show_gear(void)
{
    u8 sel = 0, total, last = 0xFF;
    POKE(0xD015, 0);
    cls();
    POKE(0xD020, BLACK);
    POKE(0xD021, BLACK);
    put_str(1, 0, "Gear", YELLOW);
    put_str(7, 0, classes[P.cls].name, CYAN);
    for (;;) {
        total = NSLOT + P.ninv;
        if (sel >= total) sel = total - 1;
        if (sel >= NSLOT && sel - NSLOT < top) top = sel - NSLOT;
        if (sel >= NSLOT && sel - NSLOT >= top + LIST_ROWS) top = sel - NSLOT - LIST_ROWS + 1;
        if (sel != last) { draw_gear(sel); last = sel; }
        sb_reset(); sb_str("ATK "); sb_num(P.atk); sb_str(" MAG "); sb_num(P.mag); sb_str(" DEF "); sb_num(P.def);
        sb_str(" HP "); sb_num(P.hpmax);
        clear_rows(22, 22);
        put_str(1, 22, sb, WHITE);
        wait_input();
        if (in_new & IN_UP && sel) --sel;
        else if (in_new & IN_DOWN && sel + 1 < total) ++sel;
        else if (in_new & IN_FIRE) {
            if (sel < NSLOT && P.equip[sel].kind == 0xFF) continue;
            item_card(sel < NSLOT ? sel : 0xFF, sel - NSLOT);
            last = 0xFF;
        } else if (in_new & IN_LEFT || !in_new) return;
    }
}
