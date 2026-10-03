/* Prism Quest: Rainyday -- Commodore 64 port. */
#include "game.h"


int main(void)
{
    /* move the C stack to its home under the KERNAL (see prismquest.cfg).
     * cc65 keeps the C stack pointer `sp` at zero page $02. */
    *(u16 *)0x02 = 0xFFF0;
    disk_init();
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
