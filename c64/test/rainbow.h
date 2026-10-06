/* The rainbow, both ways: a level-12 Crystal Knight who has beaten the
 * Rainwyrm (but not yet claimed its hoard) stands below the village's
 * Cloudgate, wounded. He steps onto it and rides up to the throne floor,
 * claims the hoard, rests a while -- the throne's a forward base now -- and
 * opens the Spellbook there. Then back out, west along row 7 onto the
 * rainbow down: home to Drizzlewick, onto the Cloudgate (and an autosave).
 * (Wounded? The setup's HP doesn't stick: calc_stats fills it.) */
#define U 0x01
#define D 0x02
#define L 0x04
#define R 0x08
#define F 0x10
#define TEST_SEED 1234
#define TEST_SETUP P.level = 12; P.zones_cleared = 0x0F; P.main_quest = 5; P.castle = 7; P.x = 18; P.y = 6; P.kills = 1; P.hp = 30;
#define ST(d) 1, d, 14, 0
#define PRESS(k) 2, k, 40, 0
#ifdef AUTOPLAY_INPUTS               /* only system.c needs the inputs */
static const unsigned char autoplay[] = {
    30, 0, 2, D, 10, 0, 2, F, 250, 0,
    ST(U), ST(U), 250, 0, 250, 0,                       /* onto the Cloudgate: up */
    ST(U), ST(R), ST(R), ST(R), ST(R), ST(R), ST(R), ST(R), ST(R), ST(R), ST(R),
    ST(R), 60, 0, PRESS(F), PRESS(F), 60, 0,            /* onto the hoard */
    250, 0,                                             /* (resting) */
    PRESS(F), PRESS(D), PRESS(D), PRESS(F), 150, 0,     /* camp: the Spellbook */
    PRESS(L), 60, 0,                                    /* (back) */
    ST(L), ST(L), ST(L), ST(L), ST(L), ST(L), ST(L), ST(L), ST(L), ST(L), ST(L),
    ST(L), 250, 0, 250, 0, 250, 0,                      /* onto the rainbow down: home */
    0
};
#endif
