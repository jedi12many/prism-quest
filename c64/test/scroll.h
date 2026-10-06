/* pick the Prism Mage and walk laps of the village: the map scrolls under
 * the hero both ways on both axes */
#define U 0x01
#define D 0x02
#define L 0x04
#define R 0x08
#define F 0x10
#ifdef AUTOPLAY_INPUTS               /* only system.c needs the inputs */
static const unsigned char autoplay[] = {
    30, 0, 2, F, 60, 0,
    0
};
#define AUTOPLAY_LOOP
static const unsigned char autoplay_loop[] = { 48, D, 80, R, 48, U, 80, L, 0 };
#endif
