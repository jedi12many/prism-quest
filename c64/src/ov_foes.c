/* Overlay: the big foes -- the dungeon keepers', the castle's and the realm's
 * battle portraits (foe_art, assets.c), and every named villain's battle cry
 * as it bars your way (js/data.js BOSS_INTROS). mon_sprites() loads it for
 * any of their fights, the champions' too (their portraits are under I/O,
 * but their cries are here), so the cry is in the window as the fight opens. */
#include "game.h"

#pragma code-name("OVFOESCODE")
#pragma rodata-name("OVFOESDATA")
#pragma bss-name("OVFOESDATA")

/* by battle sprite, from SPECIAL_SPRITE0 (Bogmaw's) on */
const char *const boss_cry[NSPECIAL] = {
    "\"GLORP. This swamp has drowned ninety-nine heroes. You make it a nice round number.\"",
    "\"Ssssso. A little spark crawls in... to challenge the storm itself.\"",
    "\"Everything rots. Everything joins us. You will make LOVELY compost.\"",
    "\"A hundred years I have kept the rain off my betters. You? You are merely damp.\"",
    "\"HRRN. Shiny go in cave. Hero go in cave. Cave keeps ALL.\"",
    "\"I have guarded these stones since before your sun. Kneel, or be rubble.\"",
    "\"Ahaha - a VISITOR! Stay. Stay forever. Everyone here does.\"",
    "\"None climb past me. The storm keeps its crown, and I keep its stair.\"",
    "\"I have called this rain down for a hundred years. I will call your name down next.\"",
    "\"I AM THE STORM'S TOOTH, groundling. The sky was never yours.\"",
    "\"Turn back, sunlit thing. You only hurry toward the mouth that waits below.\"",
    "\"I am the last dark before the dark. Everything bright ends in me.\"",
    "\"little light. i have drowned ten thousand dawns. yours will not even ripple.\"",
};
