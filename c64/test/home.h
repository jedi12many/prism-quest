/* walk out the South gate into Bogmire, step off the entry and back onto
 * its home gate (travel + autosave), then walk laps of the village */
#define U 0x01
#define D 0x02
#define L 0x04
#define R 0x08
#define F 0x10
#define TEST_SEED 1234
#ifdef AUTOPLAY_INPUTS               /* only system.c needs the inputs */
static const unsigned char autoplay[] = {
    30, 0, 2, D, 10, 0, 2, F, 60, 0,
    68, D, 60, R, 12, D, 60, 0,  /* through the South gate */
    6, D, 30, 0, 6, U, 120, 0,   /* off the entry, back onto the home gate */
    0
};
#define AUTOPLAY_LOOP
static const unsigned char autoplay_loop[] = { 24, L, 24, U, 24, R, 24, D, 0 };
#endif
