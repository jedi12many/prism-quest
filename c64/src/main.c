/* Prism Quest: Rainyday -- Commodore 64 port. */
#include "game.h"

int main(void)
{
    hw_init();
    for (;;) {
        new_game(title_screen());
        world_loop();
    }
    return 0;
}
