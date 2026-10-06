/* Camp building: a Knight with a pocketful of Quartz and Amethyst, beside the
 * Kitchen's plot, walks into it and builds it, then upgrades the House and
 * raises the walls, goes back out to look, then opens the Village Ledger. */
#define U 0x01
#define D 0x02
#define L 0x04
#define R 0x08
#define F 0x10
#define TEST_SETUP P.raw[QUARTZ] = 30; P.raw[AMETHYST] = 10; P.x = 7; P.y = 5;
#define PRESS(k) 2, k, 12, 0
#ifdef AUTOPLAY_INPUTS               /* only system.c needs the inputs */
static const unsigned char autoplay[] = {
    30, 0, PRESS(D), PRESS(F), 60, 0,         /* the Knight */
    4, R, 150, 0,                             /* bump the Kitchen's plot: the build screen */
    PRESS(F), 100, 0,                         /* build it */
    PRESS(U), PRESS(F), 100, 0,               /* the House to level 2 */
    PRESS(U), PRESS(F), 100, 0,               /* round to the Castle Walls: raise them */
    PRESS(L), 150, 0,                         /* back out (R/left) */
    PRESS(F), 30, 0,                          /* the camp menu: */
    PRESS(D), PRESS(D), PRESS(D), PRESS(D), PRESS(D), PRESS(F), 250, 0,   /* the Village Ledger */
    0
};
#endif
