/* Gloom Pacts in the Ledger: a Crystal Knight under Turtle's Patience opens
 * the Village Ledger from the camp menu. */
#define U 0x01
#define D 0x02
#define L 0x04
#define R 0x08
#define F 0x10
#define TEST_SETUP P.pact = 4;
#define PRESS(k) 2, k, 40, 0
#ifdef AUTOPLAY_INPUTS               /* only system.c needs the inputs */
static const unsigned char autoplay[] = {
    30, 0, 2, D, 10, 0, 2, F, 120, 0,
    PRESS(F), 60, 0, PRESS(D), PRESS(D), PRESS(D), PRESS(D), PRESS(D), PRESS(F), 250, 0,   /* camp menu -> Ledger */
    0
};
#endif
