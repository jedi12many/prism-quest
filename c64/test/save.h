/* Disk test, part 1: a level-5 Crystal Knight with a full bag saves to disk
 * from the camp menu. Run with tools/disktest.sh (needs real ROMs). */
#define U 0x01
#define D 0x02
#define L 0x04
#define R 0x08
#define F 0x10
#define TEST_SETUP P.level = 5; P.kills = 42; P.raw[QUARTZ] = 9; P.raw[ROSEOPAL] = 2; \
                   P.spells[SP_SUNFLARE] = 3; P.skills = 0x0003; P.skill_points = 2; P.main_quest = 1; \
                   roll_item(&P.equip[SL_CHARM], 9, R_LEGEND, SL_CHARM); roll_item(&P.inv[0], 5, R_RARE, SL_BOOTS); P.ninv = 1;
#define PRESS(k) 2, k, 12, 0
#ifdef AUTOPLAY_INPUTS               /* only system.c needs the inputs */
static const unsigned char autoplay[] = {
    30, 0, PRESS(D), PRESS(F), 60, 0,         /* pick the Knight */
    PRESS(F),                                 /* camp menu */
    PRESS(D), PRESS(D), PRESS(D), PRESS(D), PRESS(D), PRESS(D),   /* -> Save game */
    PRESS(F),
    0
};
#endif
