/* Dungeon logic: a level-12 Crystal Knight walks out into Bogmire and straight
 * down a dungeon. Build with DEFS="-DTEST_DUNGEON=n -DTEST_EMPTY -DTEST_NEAR":
 * no wanderers, the Warden right east of the hero and the stair beyond it.
 * He fights the Warden for its key and takes the stair down to floor 2.
 * (test/keeper.h fights the keeper instead.) */
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
    30, 0, 2, D, 10, 0, 2, F, 60, 0,
    68, D, 60, R, 12, D,        /* out the South gate */
    250, 0, 250, 0,             /* into Bogmire, and down the dungeon */
    1, R, 150, 0,               /* bump the Warden */
    FIGHT,
    1, R, 40, 0, 1, R, 250, 0,  /* east, onto the stair: floor 2 */
    250, 0,
    0
};
#endif
