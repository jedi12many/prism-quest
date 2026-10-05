/* The Sanctuary: built with DEFS="-DTEST_DUNGEON=0 -DTEST_EMPTY -DTEST_NEAR
 * -DTEST_KEEPER -DTEST_FRAIL -DTEST_MOTES=100", a new Crystal Knight walks
 * into Bogmire and down a dungeon to its keeper, which fells him with one
 * blow. The game-over screen banks his Motes and names him on the roll. Back
 * at the title he visits the Sanctuary and buys Hearty and Veteran; then a
 * new Knight starts with +8 max HP: 64. */
#define U 0x01
#define D 0x02
#define L 0x04
#define R 0x08
#define F 0x10
#define B 0x20
#define TEST_SEED 1234
#define PRESS(k) 2, k, 40, 0
#ifdef AUTOPLAY_INPUTS               /* only system.c needs the inputs */
static const unsigned char autoplay[] = {
    30, 0, 2, D, 10, 0, 2, F, 60, 0,
    68, D, 60, R, 12, D,        /* out the South gate */
    250, 0, 250, 0,             /* into Bogmire, and down the dungeon */
    1, R, 40, 0, 1, R, 150, 0,  /* east, and bump the keeper */
    PRESS(B), 250, 0,           /* bonk: it strikes back, and he falls */
    PRESS(F), 250, 0,           /* (press fire to continue) */
    PRESS(F), 250, 0, 100, 0,   /* (the game-over screen; the deeds written) */
    PRESS(U), PRESS(F), 150, 0, /* the title: the Sanctuary */
    PRESS(F), PRESS(D), PRESS(F), 150, 0,   /* buy Hearty, then Veteran */
    PRESS(L), 150, 0,           /* (back to the title) */
    PRESS(D), PRESS(F), 250, 0,   /* a new Knight (the title starts on the Mage again) */
    0
};
#endif
