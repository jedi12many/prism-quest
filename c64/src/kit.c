/* Resident helpers shared by the overlays: skill effects, gems, menu kit,
 * and the camp menu that opens the overlay screens. */
#include <string.h>
#include "game.h"

/* ---------- effects (js/game.js eff) ---------- */

/* Is skill (branch b, tier t) learned? Note: written as a shift-and-mask on
 * purpose -- cc65 2.19 miscompiles `!(P.skills & (1u << n))` (it tests only
 * the high byte of the result), which silently disabled the first 8 skills. */
u8 skill_owned(u8 b, u8 t) { return (P.skills >> (b * 5 + t)) & 1; }

i16 eff(u8 key)
{
    i16 v = 0;
    u8 b, t, k;
    const Eff *e;
    for (k = 0; k < 2; ++k)
        if (class_perk[P.cls][k].key == key) v += class_perk[P.cls][k].val;
    v += gear_eff(key);
    for (b = 0, e = bld_eff[0]; b < NBLD; ++b, e += 2) {   /* camp buildings, per level */
        if (!(t = P.base[b])) continue;
        if (e[0].key == key) v += e[0].val * t;
        if (e[1].key == key) v += e[1].val * t;
    }
    if (P.pact)                                       /* a Gloom Pact, while in its land */
        for (k = 0, e = pact_eff[P.pact - 1]; k < 4; ++k, ++e) if (e->key == key) v += e->val;
    if (!P.skills) return v;
    for (b = 0; b < 3; ++b)
        for (t = 0; t < 5; ++t) {
            if (!skill_owned(b, t)) break;               /* tiers unlock in order */
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

/* ---------- shared UI ---------- */

void put_strn(u8 x, u8 y, const char *s, u8 max, u8 col)
{
    while (*s && max--) put_ch(x++, y, glyph(*s++), col);
}

void screen_open(const char *title)
{
    POKE(0xD015, 0);
    cls();
    POKE(0xD021, BLACK);
    POKE(0xD020, BLACK);
    put_str(1, 0, title, YELLOW);
}

/* wait for a joystick/keyboard decision: returns the in_new bits, or IN_LEFT for R/STOP */
u8 get_input(void)
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

u8 at_camp(const char *what)
{
    if (map_id == MAP_VILLAGE || (home_base() && what[0] != 'b')) return 1;   /* (the castle's no place to build) */
    sb_reset(); sb_str("Too dangerous out here! Return to Drizzlewick to "); sb_str(what); sb_str(".");
    say(0, sb);
    return 0;
}

/* ---------- deeds (the rest: ov_deeds.c) ---------- */

#pragma bss-name(push, "LOWBSS")        /* (below the ROMs: the KERNAL writes it to disk from here) */
Deeds deeds;
u8 deeds_told[3];
#pragma bss-name(pop)

void deed(u8 id) { deeds.got[id >> 3] |= 1 << (id & 7); }
extern u8 __fastcall__ disk_op(u8 op);
extern u16 disk_start, disk_end;
void disk_file(const char *s);
enum { OP_SAVE, OP_LOAD, OP_CMD };
#define DEEDS_VERSION 1

/* at startup: the disk's deeds, or a fresh slate */
void deeds_read(void)
{
    disk_file("pq.deeds");
    disk_start = (u16)&deeds;
    if (disk_op(OP_LOAD) || deeds.magic[0] != 'P' || deeds.magic[1] != 'D' || deeds.magic[2] != DEEDS_VERSION) {
        memset(&deeds, 0, sizeof(deeds));
        deeds.magic[0] = 'P'; deeds.magic[1] = 'D'; deeds.magic[2] = DEEDS_VERSION;
    }
    memcpy(deeds_told, deeds.got, sizeof(deeds_told));
}

void deeds_write(void)
{
    disk_file("s0:pq.deeds");                   /* replace the old one */
    if (disk_op(OP_CMD)) return;                /* (no drive: they live on in memory) */
    disk_file("pq.deeds");
    disk_start = (u16)&deeds;
    disk_end = (u16)&deeds + sizeof(deeds);
    disk_op(OP_SAVE);
}

u8 deeds_news(void) { return (deeds.got[0] ^ deeds_told[0]) | (deeds.got[1] ^ deeds_told[1]) | (deeds.got[2] ^ deeds_told[2]); }

/* ---------- the camp menu (fire in the world) ---------- */

static const char *const camp_items[9] = { "Bag & polishing", "Gear", "Spellbook", "Power Tree", "Build the camp", "Village Ledger", "Deeds", "Save game", "Back" };

void camp_menu(void)
{
    u8 sel;
    POKE(0xD015, 0);
    cls();
    POKE(0xD021, BLACK);
    put_str(1, 7, "Make camp:", PURPLE);
    sel = menu_pick(1, 9, camp_items, 9, 0);
    if (sel == 0) open_bag();
    else if (sel == 1) open_gear();
    else if (sel == 2) open_spellbook();
    else if (sel == 3) open_tree();
    else if (sel == 4) open_build(0xFF);
    else if (sel == 5) open_ledger();
    else if (sel == 6) { ovl(OV_DEEDS); show_deeds(); }
    else if (sel == 7) { clear_rows(7, 24); save_game(); wait_fire(); }
}

/* ---------- doors into the overlays ---------- */

void open_bag(void)  { ovl(OV_BAG); show_bag(); }
void open_gear(void) { show_gear(); }     /* resident */
void open_ledger(void) { ovl(OV_LEDGER); show_ledger(); }
/* check "only in camp" first, so a refusal doesn't cost a disk load */
u8 build_sel;
void open_build(u8 b)
{
    if (b != 0xFF) build_sel = b;
    if (!at_camp("build")) return;
    ovl(OV_BUILD);
    show_build();
    place_buildings();                    /* (whatever went up) */
}
void open_spellbook(void) { if (at_camp("craft spells")) { ovl(OV_CAMP); show_spellbook(); } }
void open_tree(void)
{
    if (!at_camp("train your powers")) return;
    ovl(OV_TREE + P.cls);                 /* each class's tree is its own overlay */
    if (P.cls == CL_MAGE) show_tree_mage();
    else if (P.cls == CL_KNIGHT) show_tree_knight();
    else show_tree_whisperer();
}
void talk(u8 npc)
{
    if (npc < NPC_PIP) { ovl(OV_TALKA); talk_a(npc); }
    else { ovl(OV_TALKB); talk_b(npc); }
}
