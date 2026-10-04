/* Prism Facets, part 2: a Crystal Knight who has already dug up the Crimson
 * and Amber Facets walks to the Glassworks kiln (east of the camp) and fuses
 * them into the Twinlight Prism, then opens Gear to see it in hand. */
#define U 0x01
#define D 0x02
#define L 0x04
#define R 0x08
#define F 0x10
#define TEST_SETUP P.inv[0].kind = P.inv[1].kind = SL_WEAPON | (R_PRISM << 4); \
                   P.inv[0].name = Z_SOUTH; P.inv[1].name = Z_EAST; P.inv[0].sockets = P.inv[1].sockets = 1; \
                   P.inv[0].gem[0] = P.inv[0].gem[1] = P.inv[1].gem[0] = P.inv[1].gem[1] = 0xFF; \
                   P.ninv = 2; P.facets = (1 << Z_SOUTH) | (1 << Z_EAST);
#define PRESS(k) 2, k, 40, 0
#define STEP(k) 1, k, 14, 0
#ifdef AUTOPLAY_INPUTS               /* only system.c needs the inputs */
static const unsigned char autoplay[] = {
    30, 0, 2, D, 10, 0, 2, F, 60, 0,
    STEP(R), STEP(R), STEP(R), STEP(R), STEP(R), STEP(R),   /* (6, 6) -> (12, 6) */
    STEP(D), 250, 0,            /* onto the kiln (12, 7) */
    PRESS(F), 120, 0,           /* fuse */
    PRESS(D), PRESS(F), 250, 0, /* back */
    PRESS(F), 80, 0, PRESS(D), PRESS(F), 150, 0,   /* camp menu -> Gear */
    PRESS(D), PRESS(D), PRESS(D), PRESS(D), PRESS(D), PRESS(F), 100, 0,   /* the bag's first item */
    0
};
#endif
