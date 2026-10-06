/* The Power Tree screen. Built three times, once per class (ov_tree_*.c),
 * so each overlay carries only that class's skill text. Expects TREE_CLASS,
 * show_tree renamed, and the segment pragmas set by the including file. */
#include <string.h>
#include "game.h"
#include "tree_text.h"

/* ---------- the Power Tree ---------- */

#define TREE_X(b) ((b) * 13 + 1)
#define TREE_Y(t) (4 + (t) * 2)

static u8 unlocked(u8 b, u8 t) { return t == 0 || skill_owned(b, t - 1); }

static void draw_node(u8 b, u8 t, u8 selected)
{
    u8 x = TREE_X(b), y = TREE_Y(t);
    u8 col = skill_owned(b, t) ? YELLOW : unlocked(b, t) ? WHITE : BLUE;
    put_ch(x - 1, y, selected ? CH_POINTER : 0, CYAN);
    put_ch(x, y, skill_owned(b, t) ? CH_STAR : unlocked(b, t) ? '+' - 32 : '-' - 32, col);
    put_strn(x + 1, y, skill_name[b][t], 11, selected ? CYAN : col);
}

static void draw_tree_info(u8 b, u8 t)
{
    clear_rows(15, 19);
    if (t == 5) { put_str(1, 15, "Back to Drizzlewick", WHITE); return; }
    put_str(1, 15, skill_name[b][t], tree[TREE_CLASS][b].color);
    put_str(30, 15, skill_owned(b, t) ? "learned" : unlocked(b, t) ? "available" : "locked", skill_owned(b, t) ? YELLOW : unlocked(b, t) ? WHITE : BLUE);
    wrap(skill_desc[b][t], 16, 2, WHITE);
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
    put_str(13, 0, classes[TREE_CLASS].name, CYAN);
    for (i = 0; i < 3; ++i) {
        put_str(TREE_X(i), 2, branch_name[i], tree[TREE_CLASS][i].color);
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
            if (skill_owned(b, t)) ;
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
                sb_reset(); sb_str("Learned "); sb_str(skill_name[b][t]); sb_str("!");
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

