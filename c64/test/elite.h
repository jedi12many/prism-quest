/* Elites: a level-12 Crystal Knight walks out into Bogmire and straight down
 * a Gloom Cave (build with DEFS="-DTEST_ELITE=6 -DTEST_DUNGEON=0": every
 * monster a Radiant elite). He waits to be ambushed, bonks it down, and reads
 * the spoils: the XP bonus and the rare drop. */
#define U 0x01
#define D 0x02
#define L 0x04
#define R 0x08
#define F 0x10
#define B 0x20
#define TEST_SEED 1234
#define TEST_SETUP P.level = 12;
#define BONK 2, B, 40, 0
#ifdef AUTOPLAY_INPUTS               /* only system.c needs the inputs */
static const unsigned char autoplay[] = {
    30, 0, 2, D, 10, 0, 2, F, 60, 0,
    68, D, 60, R, 12, D,        /* out the South gate, and down */
    250, 0, 250, 0, 250, 0,     /* wait for an ambush */
    BONK, BONK, BONK, BONK, 250, 0,
    0
};
#endif
