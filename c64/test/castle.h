/* The Rainycastle: a level-12 Crystal Knight who has freed all four lands
 * and ridden the rainbow starts on its first floor. Built with
 * DEFS="-DTEST_EMPTY -DTEST_WEAK" (no attendants; every foe falls to one
 * bonk) he walks east along row 7, bonks down Galeheart, climbs, bonks down
 * the Raincaller, climbs to the throne, bonks down the Rainwyrm and claims
 * its hoard -- and the portal opens. */
#define U 0x01
#define D 0x02
#define L 0x04
#define R 0x08
#define F 0x10
#define B 0x20
#define TEST_SEED 1234
#define TEST_SETUP P.level = 12; P.zones_cleared = 0x0F; P.main_quest = 4; P.map = MAP_CASTLE;
#define ST 1, R, 14, 0
#define BONK 2, B, 40, 0
#define PRESS(k) 2, k, 40, 0
#ifdef AUTOPLAY_INPUTS               /* only system.c needs the inputs */
static const unsigned char autoplay[] = {
    30, 0, 2, D, 10, 0, 2, F, 250, 0,
    1, U, 20, 0,                                        /* onto row 7 */
    ST, ST, ST, ST, ST, ST, ST, ST, ST, ST, ST,         /* to (15, 7) */
    1, R, 250, 0, 100, 0,                               /* bump Galeheart */
    BONK, PRESS(F), 60, 0, PRESS(F), PRESS(F), 60, 0,   /* (his fall) */
    ST, ST, ST, ST, 250, 0, 100, 0,                     /* up the stair */
    ST, ST, ST, ST, ST, ST, ST, ST, ST, ST, ST,
    1, R, 250, 0, 100, 0,                               /* bump the Raincaller */
    BONK, PRESS(F), 60, 0, PRESS(F), PRESS(F), 60, 0,
    ST, ST, ST, ST, 250, 0, 100, 0,                     /* up to the throne */
    ST, ST, ST, ST, ST, ST, ST, ST, ST, ST,
    1, R, 250, 0, 100, 0,                               /* bump the Rainwyrm */
    BONK, PRESS(F), 60, 0, PRESS(F), PRESS(F), 60, 0,   /* (its fall) */
    ST, 60, 0, PRESS(F), PRESS(F), 60, 0,               /* onto its hoard */
    0
};
#endif
