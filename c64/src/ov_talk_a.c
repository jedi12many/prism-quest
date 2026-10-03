/* Overlay: the villagers' dialogue (js/ui.js npcDialog) -- Mayor Puddle, Grandma Nimbus, Foreman Flint
 * Loaded from disk on demand into the overlay window (see ovl() in save.c). */
#include <string.h>
#include "game.h"

#pragma code-name("OVTALKACODE")
#pragma rodata-name("OVTALKADATA")

/* ---------- villagers (js/ui.js npcDialog) ---------- */

void talk_a(u8 id)
{
    const char *who = npc_name[id];
    u8 q = P.main_quest, i, n = lands_freed();
    switch (id) {
    case NPC_MAYOR:
        if (q == 0) {
            say(who, "Ah, a hero at last! Welcome to Drizzlewick - the last sunny speck in all of Rainyday. "
                     "A gate leads out of the village in each direction, and each way lies a land held by a gloom champion: "
                     "South to Bogmire's damp toad, East to the Thunderfen's serpent, West to the Moldwood's creeping rot, "
                     "and North to the haunted heights. Strike each champion down and the sun returns to that land!");
            P.main_quest = 1;
            msg("Quest: defeat the gloom champion in each direction.");
        } else if (q == 1) {
            sb_reset(); sb_num(n); sb_str("/4 lands shine again. Still under the storm:");
            for (i = 0; i < NZONE; ++i)
                if (!(P.zones_cleared & (1 << i))) { sb_str(" "); sb_str(zones[i].dir); }
            sb_str(". Start with the South if you're fresh; it's the gentlest.");
            say(who, sb);
        } else {
            say(who, "You DID it! The whole land glitters - but do you feel that drizzle? The RAINYCASTLE has risen in the "
                     "rainclouds, and something up there is brewing the storm all over again. "
                     "(The climb to the Rainycastle comes in a later version of the C64 port.)");
        }
        break;
    case NPC_GRANDMA:
        if (!(P.npc_flags & 1)) {
            P.npc_flags |= 1;
            P.raw[QUARTZ] += 4;
            say(who, "Oh, sweetheart, you'll catch your death out there. Here - some quartz from my rock garden, for practice. "
                     "Mind the rain: the gloom-things cannot step into sunshine. If they gang up on you, run for the light.");
            msg("Grandma Nimbus gave you 4 raw Quartz!");
        } else {
            say(who, "The champions? Nasty things - the toad spits poison, the serpent strikes twice, the mold regrows, "
                     "and the umbrella... whispers. Bring healing blooms.");
        }
        break;
    case NPC_FOREMAN:
        if (!(P.npc_flags & 2)) {
            P.npc_flags |= 2;
            ++P.spells[SP_DWARVES];
            say(who, "Flint's the name - stone, gems, and honest work. The crew owes me a favor, so here: one dwarf crew "
                     "summons, on the house. They'll polish your whole bag, and they don't do sloppy work.");
            msg("Foreman Flint taught you Summon Dwarves! (+1 charge, cast it from your Bag)");
        } else {
            say(who, "Walk over a sparkling node out in the wilds to scoop up raw minerals, then polish them in your Bag. "
                     "Better cuts make more spell charges.");
        }
        break;
    }
    world_hud_dirty();
}
