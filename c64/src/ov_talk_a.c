/* Overlay: the villagers' dialogue (js/ui.js npcDialog) -- Mayor Puddle, Willow
 * Loaded from disk on demand into the overlay window (see ovl() in save.c). */
#include <string.h>
#include "game.h"

#pragma code-name("OVTALKACODE")
#pragma rodata-name("OVTALKADATA")

/* ---------- villagers (js/ui.js npcDialog) ---------- */

static const char *const willow_later[4] = {   /* once her favor's done (as talk_b's later()) */
    "Look at the beds now - every colour at once, drinking real sun. A century of drizzle, and they never forgot how "
    "to bloom. Neither did we.",
    "*presses a dried tulip into your hand* Take this down with you, love. So you remember there's colour up here worth "
    "climbing back for.",
    "The puddles are drying and the beds are waking. You're not just felling monsters, love - you're giving the valley "
    "back its spring.",
    "The tulips turn to follow you when you walk past. They remember.",
};

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
        } else if (q == 2) {
            say(who, "You DID it! The whole land glitters - but do you feel that drizzle? The RAINYCASTLE has risen in the "
                     "rainclouds, and something up there is brewing the storm all over again. There's only one road up: a rainbow. I've unsealed the old Cloudgate in the plaza. Ride well, hero.");
            P.main_quest = 3;
            msg("Quest: step onto the Cloudgate in the plaza and ride to the Rainycastle.");
        } else if (q == 3) {
            say(who, "The Cloudgate glows in the plaza. Step onto it, and ride!");
        } else if (q == 4) {
            say(who, "Climb the castle floor by floor - its guardians seal every stair. Sun spells burn brightest "
                     "up there, they say.");
        } else if (q == 7) {
            say(who, "The HERO OF RAINYDAY! Statues shall be raised. Pies shall be baked. Welcome home.");
        } else {
            say(who, "So the serpent was only the doorman... something older than weather waits beyond that portal, and it "
                     "only opens ONE way.");
        }
        break;
    default: /* Willow */
        if (P.willow_stage == 0) {
            say(who, "Careful of the flowerbeds, love. My rainbow tulips refuse to bloom. They just need a dusting of Rose Opal. Two would do it. The far lands grow them... so I'm told.");
            P.willow_stage = 1;
            msg("Favor accepted: bring Willow 2 Rose Opal.");
        } else if (P.willow_stage == 1 && gem_stock(ROSEOPAL) < 2) {
            sb_reset(); sb_str("The tulips are holding their breath. "); sb_num(gem_stock(ROSEOPAL)); sb_str("/2 Rose Opal so far.");
            say(who, sb);
        } else if (P.willow_stage == 1) {
            say(who, "Oh, they're PERFECT. *dusts the beds* ...Look at that. First bloom in a century.");
            consume_gems(ROSEOPAL, 2);
            P.willow_stage = 2;
            ++P.skill_points;
            msg("The tulips bloom! Willow's wisdom: +1 skill point.");
        } else say(who, willow_later[P.castle & CA_SUN ? 0 : q >= 5 ? 1 : P.zones_cleared ? 2 : 3]);
        if (P.pip_stage == 2 && P.baker_stage == 2 && P.willow_stage == 2) deed(DE_NEIGHBOR);

        break;
    }
    world_hud_dirty();
}
