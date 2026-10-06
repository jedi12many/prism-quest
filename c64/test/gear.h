/* Gear: a Mage starting with eight random items (every rarity) and two
 * Brilliant Emeralds. Opens Gear from the camp menu, inspects the first bag
 * item, equips it. Checkpoints (CYCLES): ~5M gear list, ~7M item card,
 * ~10M after equipping. */
#define U 0x01
#define D 0x02
#define L 0x04
#define R 0x08
#define F 0x10
#define TEST_SETUP { static Item t; for (c = 0; c < 8; ++c) { roll_item(&t, 8, c % 5, 0xFF); give_item(&t); } } \
                   P.polished[EMERALD][Q_BRILLIANT] = 2;
#define PRESS(k) 2, k, 12, 0
#ifdef AUTOPLAY_INPUTS               /* only system.c needs the inputs */
static const unsigned char autoplay[] = {
    30, 0, PRESS(F), 60, 0,                   /* pick the Mage */
    PRESS(F), PRESS(D), PRESS(F), 80, 0,      /* camp menu -> Gear */
    PRESS(D), PRESS(D), PRESS(D), PRESS(D), PRESS(D),   /* first bag item */
    PRESS(F), 100, 0,                         /* item card */
    PRESS(F), 150, 0,                         /* Equip */
    0
};
#endif
