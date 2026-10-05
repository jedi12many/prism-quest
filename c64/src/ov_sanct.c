/* Overlay: the Sanctuary (js/data.js META_UPGRADES, js/ui.js openMeta and
 * renderMemorial) -- spend the Motes fallen heroes left behind on upgrades
 * for every hero after; and the roll of the fallen. It all lives in PQ.DEEDS
 * (see game.h): the effects in eff() and new_game(), the Motes banked and the
 * fallen named by game_over() (kit.c).
 * Loaded from disk on demand into the overlay window (see ovl() in save.c). */
#include "game.h"

#pragma code-name("OVSANCTCODE")
#pragma rodata-name("OVSANCTDATA")
#pragma bss-name("OVSANCTDATA")

static const char *const up_name[NSANCT] = {
    "Hearty", "Veteran", "Fleet-footed", "Keen Eye", "Well-Trained", "Prospector", "Arsenal",
};
static const char *const up_desc[NSANCT] = {      /* (each rank) */
    "Every hero: +8 max HP.",
    "Every hero: +6% XP gained.",
    "Every hero: +3% dodge chance.",
    "Every hero: +3% crit chance.",
    "Each new hero: +1 skill point.",
    "Each new hero: 2 Fine Quartz.",
    "Each new hero: a Magic weapon.",
};
static const u8 up_max[NSANCT] = { 4, 3, 3, 3, 2, 3, 1 };
static const u8 cost_base[NSANCT] = { 20, 30, 30, 30, 50, 25, 90 };   /* the next rank: base + rank * step */
static const u8 cost_step[NSANCT] = { 20, 30, 25, 25, 50, 20, 0 };

#define LIST_Y 5
#define ROLL_Y 15

static u8 i, y, bought;
static const Fallen *f;

static u16 cost(u8 u) { return cost_base[u] + deeds.rank[u] * cost_step[u]; }

static void draw(u8 sel)
{
    u8 r;
    clear_rows(3, 3);
    sb_reset(); sb_num(deeds.motes); sb_str(" Motes to spend");
    put_str(1, 3, sb, YELLOW);
    for (i = 0, y = LIST_Y; i < NSANCT; ++i, ++y) {
        r = deeds.rank[i];
        clear_rows(y, y);
        put_ch(1, y, i == sel ? CH_POINTER : 0, YELLOW);
        put_str(3, y, up_name[i], i == sel ? YELLOW : r ? CYAN : WHITE);
        sb_reset();
        if (r) { sb_num(r); sb_str("/"); sb_num(up_max[i]); }
        put_str(17, y, sb, CYAN);
        if (r >= up_max[i]) put_str(24, y, "MAX", YELLOW);
        else { sb_reset(); sb_num(cost(i)); sb_str(" Motes"); put_str(24, y, sb, deeds.motes >= cost(i) ? GREEN : DKGREY); }
    }
    clear_rows(LIST_Y + NSANCT + 1, LIST_Y + NSANCT + 1);
    put_str(1, LIST_Y + NSANCT + 1, up_desc[sel], GREY);
}

/* the roll of the fallen, and the Gloombreakers before them */
static void memorial(void)
{
    y = ROLL_Y;
    if (deeds.wins) {
        sb_reset(); sb_str("Suns brought back by those before you: "); sb_num(deeds.wins);
        put_str(1, y++, sb, YELLOW);
    }
    if (!deeds.fallen[NFALLEN - 1].cls) {
        if (!deeds.wins) wrap("No hero has fallen yet, and none has seen the sun. Be the first the village remembers.", y, 2, GREY);
        return;
    }
    put_str(1, y++, "The Roll of the Fallen", PURPLE);
    for (f = &deeds.fallen[NFALLEN - 1]; f >= deeds.fallen && f->cls && y < 24; --f, ++y) {
        sb_reset(); sb_str(classes[f->cls - 1].name); sb_str(" Lv"); sb_num(f->level); sb_str(" - ");
        sb_str(f->where < NZONE ? zones[f->where].name : dungeon_name[f->where - NZONE]);
        put_str(2, y, sb, WHITE);
        sb_reset(); sb_num(f->zones); sb_str("/4");
        put_str(36, y, sb, CYAN);
    }
}

void show_sanctuary(void)
{
    u8 sel = 0, in;
    screen_open("The Sanctuary");
    wrap("Every hero who falls leaves a little light behind. No one here is forgotten.", 1, 2, GREY);
    put_str(1, 24, "Fire: buy   R: back to the heroes", BLUE);
    memorial();
    draw(sel);
    bought = 0;
    for (;;) {
        in = get_input();
        if (in & IN_UP) sel = sel ? sel - 1 : NSANCT - 1;
        else if (in & IN_DOWN) sel = sel == NSANCT - 1 ? 0 : sel + 1;
        else if (in & IN_FIRE) {
            if (deeds.rank[sel] >= up_max[sel] || deeds.motes < cost(sel)) { sfx(SFX_BONK); continue; }
            deeds.motes -= cost(sel);
            ++deeds.rank[sel];
            bought = 1;
            sfx(SFX_LEVEL);
        } else if (in & IN_LEFT) break;
        draw(sel);
    }
    if (bought) deeds_write();              /* (kept on the disk) */
}
