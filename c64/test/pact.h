/* Gloom Pacts: the Crystal Knight walks out the South gate into Bogmire,
 * still under the gloom, and (built with DEFS="-DTEST_PACT": test builds skip
 * the bargain otherwise) is offered three pacts, and seals the second.
 * (test/pactledger.h shows a pact in the Ledger.) */
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
    250, 0, 250, 0,             /* the bargain */
    PRESS(F), 250, 0,           /* seal the second (the walk's last Down moved onto it) */
    0
};
#endif
