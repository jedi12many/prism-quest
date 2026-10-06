/* Grandma remembers: built with DEFS="-DTEST_SUNS=2" (two heroes on this
 * disk have brought the sun back), a Crystal Knight who's brought it back
 * too stands beside Grandma Nimbus. Their first talk: her quartz, and her
 * lineage line ("2 heroes have walked out of that dark..."). The second:
 * sunshine on her rocking chair. */
#define U 0x01
#define D 0x02
#define L 0x04
#define R 0x08
#define F 0x10
#define TEST_SEED 1234
#define TEST_SETUP P.main_quest = 7; P.zones_cleared = 0x0F; P.castle = 0x3F; P.x = 16; P.y = 9;
#define PRESS(k) 2, k, 40, 0
#ifdef AUTOPLAY_INPUTS               /* only system.c needs the inputs */
static const unsigned char autoplay[] = {
    30, 0, 2, D, 10, 0, 2, F, 250, 0,
    1, R, 250, 0,                               /* talk: her gift */
    PRESS(F), 60, 0, PRESS(F), 60, 0,           /* (and the lineage) */
    PRESS(F), 60, 0, PRESS(F), 60, 0, PRESS(F), 150, 0,
    1, R, 150, 0,                               /* talk again */
    0
};
#endif
