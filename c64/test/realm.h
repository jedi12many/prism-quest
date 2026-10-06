/* Sog'naroth: a level-12 Crystal Knight who has claimed the Rainwyrm's hoard
 * starts on the throne floor, walks east onto the portal, dares it, and
 * drops into the realm. Built with DEFS="-DTEST_EMPTY -DTEST_WEAK
 * -DTEST_NEAR" (no spawn; every foe falls to one bonk; each depth's far end
 * three steps east of the way in) he bonks down the Herald Below, takes the
 * rift, bonks down the Voidmaw, takes the next, and bonks down Sog'naroth:
 * the sun comes back, and he's home in Drizzlewick. */
#define U 0x01
#define D 0x02
#define L 0x04
#define R 0x08
#define F 0x10
#define B 0x20
#define TEST_SEED 1234
#define TEST_SETUP P.level = 12; P.zones_cleared = 0x0F; P.main_quest = 5; P.castle = 15; P.map = MAP_CASTLE; P.kills = 1;
#define ST 1, R, 14, 0
#define BONK 2, B, 40, 0
#define PRESS(k) 2, k, 40, 0
#ifdef AUTOPLAY_INPUTS               /* only system.c needs the inputs */
static const unsigned char autoplay[] = {
    30, 0, 2, D, 10, 0, 2, F, 250, 0,
    ST, ST, ST, ST, ST, ST, ST, ST, ST, ST, ST, 100, 0, /* onto the portal */
    PRESS(F), PRESS(F), 60, 0, PRESS(F), 250, 0, 250, 0, /* (its warning; dare it) */
    ST, 1, R, 250, 0, 100, 0,                           /* bump the Herald */
    BONK, PRESS(F), 60, 0, PRESS(F), PRESS(F), 60, 0,   /* (its fall) */
    ST, ST, 250, 0, 250, 0,                             /* the rift */
    ST, 1, R, 250, 0, 100, 0,                           /* bump the Voidmaw */
    BONK, PRESS(F), 60, 0, PRESS(F), 60, 0,
    ST, ST, 250, 0, 250, 0,                             /* the rift */
    ST, ST, 1, R, 250, 0, 100, 0,                       /* bump Sog'naroth */
    BONK, PRESS(F), 250, 0, 100, 0,
    PRESS(F), 60, 0, PRESS(F), 60, 0, PRESS(F), 60, 0, PRESS(F), 250, 0, 250, 0,   /* the ending */
    0
};
#endif
