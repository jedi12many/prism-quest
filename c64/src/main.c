/* Prism Quest: Rainyday -- Commodore 64 port. */
#include <string.h>
#include "game.h"


int main(void)
{
    /* move the C stack to its home under the KERNAL (see prismquest.cfg).
     * cc65 keeps the C stack pointer `sp` at zero page $02. */
    *(u16 *)0x02 = 0xFFF0;
    /* ...which is only RAM to the CPU with the ROMs banked out: do that before
     * any C code reads its arguments back off that stack. (disk_op banks the
     * KERNAL in only for the length of each disk call.) */
    __asm__("sei");
    POKE(0x00, 0x2F);
    POKE(0x01, 0x35);
    {   /* the music player's start/stop code rides in the second screen with
         * the startup code: move it to the tape buffer */
        extern u8 _CASSCODE_LOAD__[], _CASSCODE_RUN__[], _CASSCODE_SIZE__[];
        memcpy(_CASSCODE_RUN__, _CASSCODE_LOAD__, (u16)_CASSCODE_SIZE__);
    }
    /* the startup functions up to rain_init run where they loaded, in the
     * second screen (INITCODE), before anything is drawn there */
    disk_init();
    /* the second file: loot code, plus the charset and sprite art. (A test
     * harness may have put everything in place already: then skip it all.) */
    if (!hi_present()) {
        if (!load_hi()) {
            /* still on the KERNAL's own text screen at $0400 */
            static const char err[] = "pq.hi is missing - load the game from its disk";
            u8 i;
            for (i = 0; err[i]; ++i) ((u8 *)0x0400)[200 + i] = err[i] & 0x3F;
            for (;;) ;
        }
        unpack_hi();
    }
    hw_init();
    rain_init();                             /* also enables the raster interrupt */
    {   /* world.c's variables, in main RAM where crt0 doesn't clear */
        extern u8 _WBSS_RUN__[], _WBSS_SIZE__[];
        memset(_WBSS_RUN__, 0, (u16)_WBSS_SIZE__);
    }
    for (;;) {
        u8 c;
        ovl(OV_TITLE);
        c = title_screen();
        if (c == NCLASS) {
            if (!load_game()) { continue_failed(); continue; }
        } else new_game(c);
        world_loop();                           /* returns when the hero falls */
        ovl(OV_TITLE);
        game_over();
    }
    return 0;
}
