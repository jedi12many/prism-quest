/* Overlay: the villagers' dialogue (js/ui.js npcDialog) -- Grandma Nimbus,
 * Foreman Flint. She remembers the heroes before you (the disk's deeds file: the suns
 * brought back, the heroes lost), and changes her tune as the story moves on.
 * Loaded from disk on demand into the overlay window (see ovl() in save.c). */
#include "game.h"

#pragma code-name("OVTALKCCODE")
#pragma rodata-name("OVTALKCDATA")


/* Grandma's lineage: she knows the look of a hero who came before */
static void lineage(const char *who)
{
    u16 n;
    sb_reset();
    if ((n = deeds.wins)) {
        sb_str("...oh. Oh. I know that look. ");
        if (n == 1) sb_str("A hero already has");
        else { sb_num(n); sb_str(" heroes have"); }
        sb_str(" walked out of that dark with the sun on their shoulders");
        say(who, sb);
        say(who, "- and still you came back for more. Rainyday makes them, and Rainyday keeps them. "
                 "Welcome home, whoever you are this time.");
    } else if ((n = deeds.losses)) {
        sb_str("...have we met, dearie? You've the eyes of the last one. And the one before. ");
        if (n == 1) sb_str("One brave soul");
        else { sb_num(n); sb_str(" brave souls"); }
        sb_str(" this valley has sent into the gloom");
        say(who, sb);
        say(who, "- and it remembers every single one. Come home this time.");
    }
}

void talk_c(u8 id)
{
    const char *who = npc_name[id];
    u8 q = P.main_quest;
    if (id == NPC_FOREMAN) {
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
    } else {
        if (!(P.npc_flags & 1)) {
            P.npc_flags |= 1;
            P.raw[QUARTZ] += 4;
            say(who, "Oh, sweetheart, you'll catch your death out there. Here - some quartz from my rock garden, for practice. "
                     "Mind the rain: the gloom-things cannot step into sunshine. If they gang up on you, run for the light.");
            lineage(who);
            msg("Grandma Nimbus gave you 4 raw Quartz!");
        } else if (q <= 1) {
            say(who, "The champions? Nasty things - the toad spits poison, the serpent strikes twice, the mold regrows, "
                     "and the umbrella... whispers. Bring healing blooms.");
            say(who, P.zones_cleared
                ? "Mark an old woman's words: every land you free, the rain leans harder toward the middle of the world - like "
                  "a breath being drawn in. I don't think we're ending this storm, dearie. I think we're waking what makes it."
                : "You asked me once why it rains. I was a girl when the sun went out - and it didn't sink, child, and it didn't "
                  "dim. It was there, and then it was gone into something's mouth. We've lived under the drip of that mouth ever since.");
        } else if (q <= 4) {
            say(who, "The rain's climbing back into the sky now - see it? That is not the weather breaking, child. That is "
                     "something inhaling. Whatever's been drinking our sun for a hundred years is sitting up to see who's been "
                     "pestering it. It fears pure light - Sunflare, Rainbow Beam, Stardust.");
        } else if (q <= 6) {
            say(who, "Beyond the portal there are no gems, no way home until it's done. Down there is the thing itself, dearie "
                     "- and it has no morning. Take the blade that outshines the sun, and give it one.");
        } else say(who, "Sunshine on my rocking chair at last, and I lived to feel it. You wonderful child.");
    }
    world_hud_dirty();
}
