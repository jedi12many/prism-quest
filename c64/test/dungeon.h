/* Dungeons: the Crystal Knight walks out the South gate into Bogmire. Build
 * with DEFS="-DTEST_DUNGEON=n" (0 cave, 1 ruins, 2 haunted house) and he goes
 * straight down a dungeon of that kind (add -DTEST_KEEPER for the keeper's
 * floor). With -DTEST_DUNGEON=2 -DTEST_EMPTY he then walks back onto the way
 * out and climbs back up into Bogmire beside the entrance. */
#define U 0x01
#define D 0x02
#define L 0x04
#define R 0x08
#define F 0x10
#define TEST_SEED 1234
#ifdef AUTOPLAY_INPUTS               /* only system.c needs the inputs */
static const unsigned char autoplay[] = {
    30, 0, 2, D, 10, 0, 2, F, 60, 0,
    68, D,                      /* down to the bottom of the village (9 tiles) */
    60, R,                      /* east to the South gate column (8) */
    12, D, 250, 0,              /* through the gate (2), and down the dungeon */
    250, 0,
    1, U, 40, 0, 1, L, 40, 0,   /* (the walk in carries him 3 east, 1 south of the */
    1, L, 40, 0, 1, L, 250, 0,  /* way out, in the Haunted House:) back onto it, and up */
    0
};
#endif
