/* The difficulty: test/keeper.h, but on Hard (Right once on the title
 * screen). Build with DEFS="-DTEST_DUNGEON=0 -DTEST_EMPTY -DTEST_NEAR
 * -DTEST_KEEPER": the Gloomtroll has 8% more HP (128, not 119), and hits
 * 15% harder. */
#define U 0x01
#define D 0x02
#define L 0x04
#define R 0x08
#define F 0x10
#define B 0x20
#define TEST_SEED 1234
#define TEST_SETUP P.level = 12;
#define BONK 2, B, 40, 0
#define FIGHT BONK, BONK, BONK, BONK, BONK, BONK, BONK, BONK, 2, F, 100, 0   /* (B: Bonk; fire on through the win) */
#ifdef AUTOPLAY_INPUTS               /* only system.c needs the inputs */
static const unsigned char autoplay[] = {
    30, 0, 2, R, 20, 0, 2, D, 10, 0, 2, F, 60, 0,   /* Hard; the Knight */
    68, D, 60, R, 12, D,        /* out the South gate */
    250, 0, 250, 0,             /* into Bogmire, and down the dungeon */
    1, R, 40, 0, 1, R, 150, 0,  /* east, and bump the keeper */
    BONK, BONK,
    0
};
#endif
