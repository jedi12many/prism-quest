/* Overlay: the villagers' dialogue (js/ui.js npcDialog) -- Pip, Barnaby
 * Loaded from disk on demand into the overlay window (see ovl() in save.c). */
#include <string.h>
#include "game.h"

#pragma code-name("OVTALKBCODE")
#pragma rodata-name("OVTALKBDATA")

/* ---------- villagers (js/ui.js npcDialog) ---------- */

/* once their favor's done: the sun back, past the castle, a land freed, or not yet */
static const char *later(const char *const *l)
{
    return P.castle & CA_SUN ? l[0] : P.main_quest >= 5 ? l[1] : P.zones_cleared ? l[2] : l[3];
}
static const char *const pip_later[4] = {
    "The sun's OUT and Sir Croaksworth won't stop hopping! A hundred adventures, starting NOW. You saved EVERYTHING, hero!",
    "Sir Croaksworth's hiding under my bed. He says something down below is looking back up at us... You're not scared, "
    "are you? ...Okay. Then I'm not either.",
    "Since you scared off the monsters, the puddles by our house keep shrinking! Sir Croaksworth misses splashing. I don't.",
    "Sir Croaksworth and me are gonna be knights when we grow up. Like YOU!",
};
static const char *const baker_later[4] = {
    "Every oven in Drizzlewick is roaring - the whole town smells of Sunshine Buns. THIS is what a hundred years of "
    "waiting tastes like. Thank you, friend.",
    "Here - a bag of buns for the road down. I don't know what waits past that portal, but nobody should face it on an "
    "empty stomach.",
    "Every land you brighten, my dough rises a little higher. Feels like the whole town exhaling at once.",
    "Smell that? THAT is what sunshine tastes like. Come back any time, friend.",
};

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
        } else say(who, later(pip_later));
        break;
    default: /* the baker */
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
        } else say(who, later(baker_later));
        break;
    }
    if (P.pip_stage == 2 && P.baker_stage == 2 && P.willow_stage == 2) deed(DE_NEIGHBOR);
    world_hud_dirty();
}
