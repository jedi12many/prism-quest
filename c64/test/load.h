/* Disk test, part 2: boot again, pick "Continue from disk", then open Gear. */
#define U 0x01
#define D 0x02
#define L 0x04
#define R 0x08
#define F 0x10
#define PRESS(k) 2, k, 12, 0
#ifdef AUTOPLAY_INPUTS               /* only system.c needs the inputs */
static const unsigned char autoplay[] = {
    30, 0, PRESS(U), PRESS(F),                /* Continue from disk */
    250, 0, PRESS(F),                         /* camp menu -> Gear */
    PRESS(D), PRESS(F),
    0
};
#endif
