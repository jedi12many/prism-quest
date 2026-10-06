/* pick the Prism Mage, walk right to Mayor Puddle and talk */
#define U 0x01
#define D 0x02
#define L 0x04
#define R 0x08
#define F 0x10
#ifdef AUTOPLAY_INPUTS               /* only system.c needs the inputs */
static const unsigned char autoplay[] = {
    30, 0, 2, F, 60, 0,
    80, R,             /* walk east toward the Mayor */
    0
};
#endif
