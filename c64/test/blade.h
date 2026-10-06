/* Prism Facets, part 3: a Crystal Knight with THE PRISMBLADE in hand opens
 * Gear from the camp menu and inspects it: seven bonuses and two sockets. */
#define U 0x01
#define D 0x02
#define L 0x04
#define R 0x08
#define F 0x10
#define TEST_SETUP P.equip[SL_WEAPON].kind = SL_WEAPON | (R_PRISM << 4); P.equip[SL_WEAPON].name = PRISM_BLADE; \
                   P.equip[SL_WEAPON].key[0] = 0; P.equip[SL_WEAPON].sockets = 2; \
                   P.equip[SL_WEAPON].gem[0] = EMERALD | (Q_BRILLIANT << 4); P.equip[SL_WEAPON].gem[1] = 0xFF;
#define PRESS(k) 2, k, 40, 0
#ifdef AUTOPLAY_INPUTS               /* only system.c needs the inputs */
static const unsigned char autoplay[] = {
    30, 0, 2, D, 10, 0, 2, F, 120, 0,
    PRESS(F), 60, 0, PRESS(D), PRESS(F), 120, 0,   /* camp menu -> Gear */
    PRESS(F), 100, 0,                              /* inspect the weapon */
    0
};
#endif
