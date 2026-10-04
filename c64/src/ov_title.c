/* Overlay: the title screen, hero creation and the game-over screen
 * Loaded from disk on demand into the overlay window (see ovl() in save.c). */
#include <string.h>
#include "game.h"

#ifdef AUTOPLAY
#include AUTOPLAY          /* test builds may define TEST_SETUP */
#endif

#pragma code-name("OVTITLECODE")
#pragma rodata-name("OVTITLEDATA")

void new_game(u8 cls)
{
    u8 c;
    memset(&P, 0, sizeof(P));
    P.cls = cls;
    P.level = 1;
    P.skill_points = 1;
    P.spells[SP_GLITTER] = 4;
    if (cls == CL_WHISPERER) P.spells[SP_UNICORN] = 2;
    P.x = 6; P.y = 6;
    P.map = MAP_VILLAGE;
    P.base[B_HOUSE] = 1;                    /* a cozy cabin to start */
#ifndef TEST_SEED                           /* (tests: all on the surface, and the old dice rolls) */
    P.champ_below = rnd(16);                /* each land's champion: on the surface, or gone to ground */
#endif
    for (c = 0; c < NSLOT; ++c) P.equip[c].kind = 0xFF;
    roll_item(&P.equip[SL_WEAPON], 1, R_COMMON, SL_WEAPON);   /* a humble starter weapon */
#ifdef TEST_SETUP
    TEST_SETUP
#endif
    calc_stats();
    P.hp = P.hpmax;
}

/* ---------- title ---------- */

static void show_class(u8 c)
{
    u8 i;
    put_ch(3, 17, c == NCLASS ? CH_POINTER : 0, YELLOW);
    put_str(5, 17, "Continue from disk", c == NCLASS ? YELLOW : PURPLE);
    if (c == NCLASS) {
        POKE(0xD015, 0);
        for (i = 0; i < NCLASS; ++i) {
            put_ch(3, 11 + i * 2, 0, YELLOW);
            put_str(5, 11 + i * 2, classes[i].name, WHITE);
        }
        clear_rows(18, 21);
        wrap("Load your saved hero from the disk in the drive.", 18, 2, CYAN);
        return;
    }
    hero_sprites(c);
    for (i = 0; i < 3; ++i) spr_pos(i, 240, 108);   /* (doubled: 48x42) */
    POKE(0xD017, 0x07); POKE(0xD01D, 0x07);
    POKE(0xD015, 0x07);
    for (i = 0; i < NCLASS; ++i) {
        put_ch(3, 11 + i * 2, i == c ? CH_POINTER : 0, YELLOW);
        put_str(5, 11 + i * 2, classes[i].name, i == c ? YELLOW : WHITE);
    }
    clear_rows(18, 21);
    wrap(classes[c].blurb, 18, 2, CYAN);
    sb_reset(); sb_str("HP "); sb_num(classes[c].hp + 10); sb_str("  ATK "); sb_num(classes[c].atk);
    sb_str("  MAG "); sb_num(classes[c].mag); sb_str("  DEF "); sb_num(classes[c].def);
    put_center(21, sb, WHITE);
}

u8 title_screen(void)
{
    u8 c = 0, i;
    cls();
    POKE(0xD020, BLACK); POKE(0xD021, BLACK);
    for (i = 0; i < 40; ++i) {
        put_ch(i, 1, CH_SOLID, 2 + (i / 5) % 6);
        put_ch(i, 23, CH_SOLID, 2 + ((39 - i) / 5) % 6);
    }
    put_center(3, "PRISM QUEST", YELLOW);
    put_center(4, "R A I N Y D A Y", CYAN);
    put_center(6, "The world of Rainyday has spent a", WHITE);
    put_center(7, "hundred years beneath one endless storm.", WHITE);
    put_str(3, 9, "Choose your hero:", PURPLE);
    show_class(c);
    put_center(24, "Joystick 2 or W/S + fire/space", BLUE);
    rain_on(0xF8);                          /* "...beneath one endless storm" */
#ifdef JUKEBOX
    music(JUKEBOX);                         /* (tests: hear any tune) */
#else
    music(TUNE_TITLE);
#endif
    for (;;) {
        wait_frame(); input_poll();
        if (in_new & IN_UP) { c = c ? c - 1 : NCLASS; show_class(c); }
        if (in_new & IN_DOWN) { c = c == NCLASS ? 0 : c + 1; show_class(c); }
        if (key_hit(K_1)) { c = 0; break; }
        if (key_hit(K_2)) { c = 1; break; }
        if (key_hit(K_3)) { c = 2; break; }
        if (in_new & IN_FIRE) break;
    }
#ifdef TEST_SEED
    rng_seed(TEST_SEED);                    /* (tests: the same lands every run) */
#else
    rng_seed(frame * 31 + PEEK(0xD012));
#endif
    POKE(0xD015, 0);
    POKE(0xD017, 0); POKE(0xD01D, 0);
    return c;
}

/* ---------- rogue-like death ---------- */

void game_over(void)
{
    POKE(0xD015, 0);
    music(TUNE_NONE);
    erase_save();                       /* one life: the save falls with the hero */
    cls();
    POKE(0xD020, BLACK); POKE(0xD021, BLACK);
    sb_reset(); sb_str(classes[P.cls].name); sb_str(" has fallen.");
    put_center(6, sb, RED);
    put_center(8, "The gloom claims another hero...", WHITE);
    sb_reset(); sb_str("Level "); sb_num(P.level); sb_str("  -  "); sb_num(lands_freed());
    sb_str("/4 lands freed  -  "); sb_num(P.kills); sb_str(" kills");
    put_center(11, sb, CYAN);
    put_center(14, "Drizzlewick will light a candle", PURPLE);
    put_center(15, "for you - and send the next.", PURPLE);
    put_center(20, "Press fire", BLUE);
    wait_fire();
}

/* "Continue from disk" found nothing to continue: say why (reason in sb) */
void continue_failed(void)
{
    cls();
    put_center(10, "Continue from disk", YELLOW);
    wrap(sb, 12, 3, WHITE);
    put_center(16, "Press fire", BLUE);
    wait_fire();
}
