/* Prism Quest: Rainyday -- Commodore 64 port. */
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
    for (;;) {
        u8 c = title_screen();
        if (c == NCLASS) {
            if (!load_game()) {                 /* nothing to continue: say why */
                cls();
                put_center(10, "Continue from disk", YELLOW);
                wrap(sb, 12, 3, WHITE);
                put_center(16, "Press fire", BLUE);
                wait_fire();
                continue;
            }
        } else new_game(c);
        world_loop();
    }
    return 0;
}
