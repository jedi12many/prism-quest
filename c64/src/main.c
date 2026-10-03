/* Prism Quest: Rainyday -- Commodore 64 port. */
#include "game.h"


int main(void)
{
    /* move the C stack to its home under the KERNAL (see prismquest.cfg).
     * cc65 keeps the C stack pointer `sp` at zero page $02. */
    *(u16 *)0x02 = 0xFFF0;
    hw_init();
    for (;;) {
        new_game(title_screen());
        world_loop();
    }
    return 0;
}
