/* Deeds, part 2: boot again from the disk test/deeds.h wrote to, start a new
 * hero (the deeds are the disk's, not the hero's), and open the Deeds page:
 * First Light is still there. */
#define U 0x01
#define D 0x02
#define L 0x04
#define R 0x08
#define F 0x10
#define TEST_SEED 1234
#define PRESS(k) 2, k, 40, 0
#ifdef AUTOPLAY_INPUTS               /* only system.c needs the inputs */
static const unsigned char autoplay[] = {
    30, 0, 2, D, 10, 0, 2, F, 250, 0,
    PRESS(F), PRESS(D), PRESS(D), PRESS(D), PRESS(D), PRESS(D), PRESS(D), PRESS(F), 150, 0,   /* camp: Deeds */
    0
};
#endif
