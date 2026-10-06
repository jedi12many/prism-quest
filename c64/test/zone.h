/* pick the Crystal Knight, walk out the South gate into Bogmire (rain,
 * monsters) and walk laps: the scroller under the heaviest load */
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
    12, D, 60, 0,               /* through the gate (2) */
    0
};
#define AUTOPLAY_LOOP
static const unsigned char autoplay_loop[] = { 40, D, 40, R, 40, U, 40, L, 0 };
#endif
