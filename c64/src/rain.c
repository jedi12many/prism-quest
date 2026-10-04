/* The storm: rain frames, lightning and thunder. The rain itself is the
 * raster-interrupt sprite multiplexer in rain.s. */
#include <string.h>
#include "game.h"

#define RAIN_FRAMES 0xDD40          /* 7 sprite frames, under the I/O chips */

/* one cluster of slanted streaks in a 24x21 sprite (x, y of each streak's top) */
static const u8 drop_x[7] = { 3, 10, 17, 22, 6, 14, 20 };
static const u8 drop_y[7] = { 0, 7, 14, 3, 11, 18, 9 };

void rain_init(void)
{
    u8 f, d, k, y, x;
    u8 *p;
    __asm__("sei");
    POKE(0x01, 0x34);                       /* the frames live under I/O */
    for (f = 0; f < 7; ++f) {
        p = (u8 *)(RAIN_FRAMES + f * 64);
        memset(p, 0, 64);
        for (d = 0; d < 7; ++d)
            for (k = 0; k < 4; ++k) {       /* 4 pixels long, leaning with the wind */
                y = (drop_y[d] + 3 * f + k) % 21;   /* falls 3 px a frame, wraps */
                x = drop_x[d] - (k >> 1);
                p[y * 3 + (x >> 3)] |= 0x80 >> (x & 7);
            }
    }
    POKE(0x01, 0x35);
    *(u16 *)0xFFFE = (u16)rain_irq;
    *(u16 *)0x0314 = (u16)kirq;             /* (the KERNAL's, while disk_op has it in) */
    __asm__("cli");                         /* only the raster interrupt is ever enabled */
}

/* how hard it rains: the deeper the land, the heavier the storm */
static const u8 storm_mask[5] = { 0, 0xA8, 0xB8, 0xF8, 0xF8 };   /* by zone tier */

static u8 flash_t;                          /* frames of lightning left */
static u16 thunder_at;                      /* frame the thunder arrives */
static u16 strike_t;                        /* frames to the next strike */

void storm_start(u8 tier)
{
    rain_on(storm_mask[tier]);
    strike_t = 1 + rnd(1000 / (2 + tier));
    flash_t = 0;
    thunder_at = 0;
}

/* once a frame while in a gloomy land */
void storm_tick(u8 tier, u8 bg)
{
    if (flash_t) {
        if (--flash_t == 0) map_bg = bg;
    } else if (!--strike_t) {               /* now and then, a strike */
        strike_t = 1 + rnd(1000 / (2 + tier));
        flash_t = 2 + rnd(3);
        map_bg = WHITE;
        thunder_at = frame + 15 + rnd(45);  /* sound travels slower than light */
    }
    if (thunder_at && (i16)(frame - thunder_at) >= 0) { thunder_at = 0; thunder(); }
}

/* the champion falls: the rain thins out column by column, then the sun */
void storm_clears(void)
{
    static const u8 thinning[5] = { 0xF8, 0xB8, 0xA8, 0x88, 0x00 };
    u8 i, n;
    for (i = 0; i < 5; ++i) {
        if ((thinning[i] & rain_mask) != rain_mask) rain_mask &= thinning[i];
        for (n = 0; n < 20; ++n) wait_frame();
    }
    rain_off();
    for (i = 0; i < 3; ++i) {               /* a burst of sunlight */
        map_bg = YELLOW; wait_frame(); wait_frame();
        map_bg = LTGREEN; wait_frame(); wait_frame();
    }
}
