/* Freeing a land: the Crystal Knight walks out the South gate into Bogmire,
 * which (built with DEFS="-DTEST_CLEAR") is freed at once: the rain thins
 * out, the sun breaks through, and the land's freeing is announced
 * (zone_cleared, loaded from PQ.OV12). */
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
    PRESS(F), 150, 0,
    0
};
#endif
