/* Loading overlays in the village: the camp menu's Bag (PQ.OV20), Spellbook
 * (PQ.OV4), Deeds (PQ.OV19) and How to Play (PQ.OV25), backing out after
 * each. For timing the fast loader on a real drive (vicerun.py --truedrive):
 * the script waits for each load, so the screenshots say how far it got. */
#define U 0x01
#define D 0x02
#define L 0x04
#define R 0x08
#define F 0x10
#define TEST_SEED 1234
#ifdef AUTOPLAY_INPUTS               /* only system.c needs the inputs */
static const unsigned char autoplay[] = {
    30, 0, 2, F, 150, 0,                /* the Prism Mage, into Drizzlewick */
    1, F, 60, 0, 1, F, 150, 0,          /* camp: the Bag */
    1, L, 100, 0,
    1, F, 60, 0, 1, D, 10, 0, 1, D, 10, 0, 1, F, 150, 0,   /* the Spellbook */
    1, L, 100, 0,
    1, F, 60, 0, 1, U, 10, 0, 1, U, 10, 0, 1, U, 10, 0, 1, U, 10, 0, 1, U, 10, 0,
    1, F, 150, 0,                       /* the Deeds */
    1, L, 100, 0,
    1, F, 60, 0, 1, U, 10, 0, 1, U, 10, 0, 1, U, 10, 0, 1, F, 250, 0,   /* How to Play */
    0
};
#endif
