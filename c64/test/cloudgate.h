/* The Mayor opens the Cloudgate: all four lands shine, and a level-12
 * Crystal Knight stands beside Mayor Puddle. He talks to him (the Mayor
 * unseals the Cloudgate), then opens the Ledger: the quest now says to
 * ride it. */
#define U 0x01
#define D 0x02
#define L 0x04
#define R 0x08
#define F 0x10
#define TEST_SEED 1234
#define TEST_SETUP P.level = 12; P.zones_cleared = 0x0F; P.main_quest = 2; P.x = 13; P.y = 6; P.kills = 1;
#define PRESS(k) 2, k, 40, 0
#ifdef AUTOPLAY_INPUTS               /* only system.c needs the inputs */
static const unsigned char autoplay[] = {
    30, 0, 2, D, 10, 0, 2, F, 250, 0,
    1, R, 250, 0, 250, 0,                               /* talk to the Mayor */
    PRESS(F), PRESS(F), PRESS(F), 250, 0,
    PRESS(F), PRESS(D), PRESS(D), PRESS(D), PRESS(D), PRESS(D), PRESS(F), 250, 0,   /* camp: the Ledger */
    0
};
#endif
