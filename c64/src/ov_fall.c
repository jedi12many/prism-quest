/* Overlay: a named villain falls (js/data.js BOSS_EULOGY; js/battle.js
 * victory) -- its last words, who it was before the rain, and what its fall
 * opens: the keepers' hoards, the castle's stairs and hoard, the realm's
 * rifts, the sun. world.c loads it after any of their fights (a champion's
 * land is freed after, from PQ.OV12). Sog'naroth's words close the ending.
 * Loaded from disk on demand into the overlay window (see ovl() in save.c). */
#include "game.h"

#pragma code-name("OVFALLCODE")
#pragma rodata-name("OVFALLDATA")
#pragma bss-name("OVFALLDATA")

static u8 i;

/* by battle sprite, from SPECIAL_SPRITE0 (Bogmaw's) on */
static const char *const eulogy[NSPECIAL - 1] = {
    "\"...the lantern. I kept it lit so long. Ninety-nine I ferried down, and could not carry one back up. "
    "...thank you, hero. Thank you for finally letting it go out.\"",
    "\"I rang the warning-bell the night the sky broke. No one came. The lightning found me first... and never "
    "let go. Tell them I rang it. I DID ring it-\"",
    "\"I only wanted to keep one green thing alive under all that rain. The rot came in through my fingernails. "
    "...I am so very tired of blooming.\"",
    "\"A hundred years I held it over an empty chair. They were gone before the first storm - and still I kept them "
    "dry. ...I can put it down now? I can finally put it down.\"",
    "\"Cave lonely now. Hero was shiniest thing... stay? ...no. ...oh. Cave so lonely.\"",
    "\"Before your sun there was another, and I guarded these stones then too. The dark is older than the light "
    "here, child. ...remember that, down below.\"",
    "\"Everyone who dies here stays to play. But you - you are LEAVING. Oh, lucky thing, lucky thing. Run, before "
    "you learn why the rest of us stay.\"",
    "\"I kept the stair so no one would ever have to see what waits at the top of it. ...go on, then. Someone finally has to.\"",
    "\"I called the rain down a hundred years - it swore it would stop if I served. It lied. It always, always lied.\"",
    "\"I was the last cloud that still remembered being sky. It fed on me, and fed, and made a serpent of my longing. "
    "The mouth below made ALL of us, groundling - and it is still hungry. Climb down. See.\"",
    "\"I heard it first, and could never be silent again. You are almost close enough now. ...soon you will hear it too.\"",
    "\"You are the first light to reach this deep in a hundred years. It felt you arrive. It is glad.\"",
};

void foe_won(u8 mi)
{
    u8 t = mobs[mi].type;
    if (t == MO_SOG) {                      /* the end: world.c brings on ov_end.c */
        P.castle |= CA_SUN;
        P.main_quest = 7;
        return;
    }
    say(monsters[t].name, eulogy[monsters[t].sprite - SPECIAL_SPRITE0]);
    if (monsters[t].flags & MF_KEEPER) {
        msg("The keeper falls, and its hoard is yours. The way out is behind you.");
        if ((deeds.keepers |= 1 << (t - MO_TROLL)) == 7) deed(DE_KEEPERS);
    } else if (t == MO_WYRM) {
        P.castle |= CA_WYRM;
        deed(DE_STORMBREAKER);
        if (P.main_quest < 5) P.main_quest = 5;
        add_gate(15, 7, G_CASTLE, CG_HOARD);    /* its hoard settles where it fell */
        gate_t[ngates - 1] = T_NODE;
        queue_tile(15, 7);
        msg("The Rainwyrm bursts into mist - leaving a great hoard amid the clouds. Claim it!");
    } else if (t == MO_SENTINEL || t == MO_RAINCALLER) {
        P.castle |= t == MO_SENTINEL ? CA_FLOOR1 : CA_FLOOR2;
        dg.has_key = 1;
        msg("The storm-wards fade - the stair up is open!");
    } else if (t == MO_HERALD || t == MO_VOIDMAW) {
        dg.has_key = 1;
        msg("The rift down stands open.");
    }
}
