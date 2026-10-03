/* Overlay: the villagers' dialogue (js/ui.js npcDialog) -- Pip, Barnaby, Willow
 * Loaded from disk on demand into the overlay window (see ovl() in save.c). */
#include <string.h>
#include "game.h"

#pragma code-name("OVTALKBCODE")
#pragma rodata-name("OVTALKBDATA")

/* ---------- villagers (js/ui.js npcDialog) ---------- */

void talk_b(u8 id)
{
    const char *who = npc_name[id];
    u8 q = P.main_quest, i, n = lands_freed();
    switch (id) {
    case NPC_PIP:
        if (P.pip_stage == 0) {
            say(who, "*sniff* Mister hero? My frog Sir Croaksworth hopped off toward the South swamp and he's too scared "
                     "to come home with all those monsters croaking around... Could you scare off five of them? Please?");
            P.pip_stage = 1;
            msg("Favor accepted: scare off 5 monsters in Bogmire (South).");
        } else if (P.pip_stage == 1 && P.pip_n < 5) {
            sb_reset(); sb_str("You scared off "); sb_num(P.pip_n); sb_str("/5 so far! Sir Croaksworth says ribbit. That means hurry.");
            say(who, sb);
        } else if (P.pip_stage == 1) {
            say(who, "HE CAME HOME! Sir Croaksworth hopped right onto my head! You're the best hero EVER. Here - I found these in a puddle.");
            P.pip_stage = 2;
            P.raw[QUARTZ] += 3;
            msg("Pip's favor complete: +3 Quartz!");
        } else {
            say(who, "Sir Croaksworth and me are gonna be knights when we grow up. Like YOU!");
        }
        break;
    case NPC_BAKER:
        if (P.baker_stage == 0) {
            say(who, "A customer! Oh - no, no bread today, friend. The rain got into my ovens and the sourdough has gone gloomy. "
                     "Four Sunstones would warm them right up.");
            P.baker_stage = 1;
            msg("Favor accepted: bring Barnaby 4 Sunstone.");
        } else if (P.baker_stage == 1 && gem_stock(SUNSTONE) < 4) {
            sb_reset(); sb_str("Any luck? You've got "); sb_num(gem_stock(SUNSTONE));
            sb_str("/4 Sunstone. The Thunderfen (East) practically glows with them.");
            say(who, sb);
        } else if (P.baker_stage == 1) {
            say(who, "FOUR SUNSTONES! Feel that? The ovens are singing already. First batch of Sunshine Buns is yours.");
            consume_gems(SUNSTONE, 4);
            P.baker_stage = 2;
            P.bonus_hp += 10;
            calc_stats();
            P.hp += 10;
            msg("Sunshine Buns! +10 max HP for the rest of this run.");
        } else {
            say(who, "Smell that? THAT is what sunshine tastes like. Come back any time, friend.");
        }
        break;
    default: /* willow */
        if (P.willow_stage == 0) {
            say(who, "Careful of the flowerbeds, love. My rainbow tulips refuse to bloom. They just need a dusting of "
                     "Rose Opal. Two would do it. The far lands grow them... so I'm told.");
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
        } else {
            say(who, "The tulips turn to follow you when you walk past. They remember.");
        }
        break;
    }
    world_hud_dirty();
}
