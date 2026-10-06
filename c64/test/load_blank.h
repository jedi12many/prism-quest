/* Disk test: "Continue from disk" with no save on the disk -> explains why. */
#define U 0x01
#define F 0x10
#define PRESS(k) 2, k, 12, 0
#ifdef AUTOPLAY_INPUTS               /* only system.c needs the inputs */
static const unsigned char autoplay[] = { 30, 0, PRESS(U), PRESS(U), PRESS(F), 0 };
#endif
