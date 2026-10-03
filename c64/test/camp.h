/* Prism Mage with a bag of raw gems and 3 skill points: polish everything,
 * craft Rainbow Beam, then learn Steady Hands and Echo Casting.
 * Screenshot checkpoints (CYCLES): ~5.0M bag, ~9.5M spellbook, ~14M tree. */
#define U 0x01
#define D 0x02
#define L 0x04
#define R 0x08
#define F 0x10
#define TEST_SETUP P.raw[QUARTZ] = 6; P.raw[AMETHYST] = 3; P.raw[SUNSTONE] = 3; P.skill_points = 3;
#define PRESS(k) 2, k, 12, 0
static const unsigned char autoplay[] = {
    30, 0, PRESS(F), 60, 0,           /* pick the Mage */
    PRESS(F), PRESS(F),               /* camp menu -> Bag */
    PRESS(F), 120, 0,                 /* Polish all */
    PRESS(D), PRESS(D), PRESS(F),     /* Back */
    PRESS(F), PRESS(D), PRESS(F),     /* camp menu -> Spellbook */
    PRESS(D), PRESS(D), PRESS(D), PRESS(D), PRESS(D), PRESS(D), PRESS(D),
    PRESS(F), 120, 0,                 /* craft Rainbow Beam */
    PRESS(L),                         /* back */
    PRESS(F), PRESS(D), PRESS(D), PRESS(F),   /* camp menu -> Power Tree */
    PRESS(R), PRESS(F), PRESS(D), PRESS(F), 200, 0,
    0
};
