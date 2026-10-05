/* Overlay: the big foes -- the dungeon keepers' and the Rainycastle's
 * battle portraits (foe_art, assets.c), and the castle's foes' names, battle
 * cries and falls (js/data.js BOSS_INTROS, BOSS_EULOGY; js/battle.js).
 * mon_sprites() loads it for any of their fights, so all of this is in the
 * window for the battle and just after it. */
#include "game.h"

#pragma code-name("OVFOESCODE")
#pragma rodata-name("OVFOESDATA")
#pragma bss-name("OVFOESDATA")

static u8 i;

const char nm_sentinel[] = "Galeheart, the Storm Sentinel";
const char nm_raincaller[] = "The Raincaller";
const char nm_wyrm[] = "The Rainwyrm";
const char nm_herald[] = "The Herald Below";
const char nm_voidmaw[] = "The Voidmaw";
const char nm_sog[] = "Sog'naroth, the Endless Drizzle";
const char *const castle_cry[6] = {
    "\"None climb past me. The storm keeps its crown, and I keep its stair.\"",
    "\"I have called this rain down for a hundred years. I will call your name down next.\"",
    "\"I AM THE STORM'S TOOTH, groundling. The sky was never yours.\"",
    "\"Turn back, sunlit thing. You only hurry toward the mouth that waits below.\"",
    "\"I am the last dark before the dark. Everything bright ends in me.\"",
    "\"little light. i have drowned ten thousand dawns. yours will not even ripple.\"",
};
/* as each falls, who it was before the rain (js/data.js BOSS_EULOGY) */
static const char *const eulogy[5] = {
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
    if (monsters[t].flags & MF_KEEPER) msg("The keeper falls, and its hoard is yours. The way out is behind you.");
    else if (t == MO_WYRM) {
        P.castle |= CA_WYRM;
        if (P.main_quest < 5) P.main_quest = 5;
        say(nm_wyrm, eulogy[2]);
        add_gate(15, 7, G_CASTLE, CG_HOARD);    /* its hoard settles where it fell */
        gate_t[ngates - 1] = T_NODE;
        queue_tile(15, 7);
        msg("The Rainwyrm bursts into mist - leaving a great hoard amid the clouds. Claim it!");
    } else if (t == MO_SENTINEL || t == MO_RAINCALLER) {
        i = t == MO_SENTINEL ? 0 : 1;
        P.castle |= 1 << i;
        dg.has_key = 1;
        say(i ? nm_raincaller : nm_sentinel, eulogy[i]);
        msg("The storm-wards fade - the stair up is open!");
    } else if (t == MO_HERALD || t == MO_VOIDMAW) {
        dg.has_key = 1;
        say(t == MO_HERALD ? nm_herald : nm_voidmaw, eulogy[t - MO_HERALD + 3]);
        msg("The rift down stands open.");
    } else if (t == MO_SOG) {               /* the end: world.c brings on ov_end.c */
        P.castle |= CA_SUN;
        P.main_quest = 7;
    }
}
