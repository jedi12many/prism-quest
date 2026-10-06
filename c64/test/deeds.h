/* Deeds, part 1 (built with DEFS="-DTEST_CLEAR -DTEST_DEEDS"): the Crystal Knight walks
 * into Bogmire, which is freed at once -- a deed, First Light. Standing still
 * again, he's told of it, and PQ.DEEDS is written. Then the camp menu's
 * Deeds page shows it. Run it with a disk image to keep, then test/deeds2.h
 * on the same disk. */
#define U 0x01
#define D 0x02
#define L 0x04
#define R 0x08
#define F 0x10
#define TEST_SEED 1234
#define PRESS(k) 2, k, 40, 0
#ifdef AUTOPLAY_INPUTS               /* only system.c needs the inputs */
static const unsigned char autoplay[] = {
    30, 0, 2, D, 10, 0, 2, F, 60, 0,
    68, D, 60, R, 12, D,        /* out the South gate */
    250, 0, 250, 0,
    PRESS(F), 250, 0,           /* (the land freed) */
    PRESS(F), 250, 0, 250, 0, 250, 0,   /* (the deed: told, and written) */
    PRESS(F), PRESS(D), PRESS(D), PRESS(D), PRESS(D), PRESS(D), PRESS(D), PRESS(F), 150, 0,   /* camp: Deeds */
    0
};
#endif
