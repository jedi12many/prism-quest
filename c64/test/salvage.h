/* Auto-salvage: a level-12 Crystal Knight in legendaries all over, set to
 * salvage up to Rare (build with DEFS="-DTEST_ELITE=3 -DTEST_DUNGEON=0": every
 * monster a Swift elite), walks down a Gloom Cave, and bonks the elite that
 * ambushes him. Its drop is no match for his gear: 1 Quartz instead. Then
 * the camp menu: Auto-salvage turned round from up to Rare to off, to Common. */
#define U 0x01
#define D 0x02
#define L 0x04
#define R 0x08
#define F 0x10
#define B 0x20
#define TEST_SEED 1234
#define TEST_SETUP P.level = 12; deeds.auto_salvage = 3; for (c = 0; c < NSLOT; ++c) roll_item(&P.equip[c], 10, R_LEGEND, c);
#define BONK 2, B, 40, 0
#ifdef AUTOPLAY_INPUTS               /* only system.c needs the inputs */
static const unsigned char autoplay[] = {
    30, 0, 2, D, 10, 0, 2, F, 60, 0,
    68, D, 60, R, 12, D,        /* out the South gate, and down */
    250, 0, 250, 0, 250, 0,     /* wait for an ambush */
    BONK, BONK, BONK, BONK, 250, 0,
    1, F, 150, 0, 1, F, 150, 0,     /* out of the fight; make camp */
    1, D, 10, 0, 1, D, 10, 0, 1, D, 10, 0, 1, D, 10, 0, 1, D, 10, 0,
    1, D, 10, 0, 1, D, 10, 0, 1, D, 10, 0, 1, D, 10, 0,
    1, F, 30, 0, 1, F, 250, 0,      /* off, then Common */
    0
};
#endif
