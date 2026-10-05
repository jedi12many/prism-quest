/* How to Play: the first hero on a disk gets the guide (build with
 * -DTEST_GUIDE). Forward two pages, back one; then through to the end, into
 * Drizzlewick, and fire for the camp menu, which offers the guide again */
#define U 0x01
#define D 0x02
#define L 0x04
#define R 0x08
#define F 0x10
#ifdef AUTOPLAY_INPUTS               /* only system.c needs the inputs */
static const unsigned char autoplay[] = {
    30, 0, 2, F, 150, 0,                /* the Prism Mage; the guide opens */
    1, F, 40, 0, 1, F, 40, 0, 1, U, 250, 0,     /* page 3, back to page 2 */
    1, F, 40, 0, 1, F, 40, 0, 1, F, 40, 0, 1, F, 40, 0,
    1, F, 40, 0, 1, F, 40, 0, 1, F, 40, 0, 1, F, 250, 0,    /* to the last page */
    1, F, 200, 0,                       /* let's play! */
    1, F, 250, 0,                       /* make camp */
    0
};
#endif
