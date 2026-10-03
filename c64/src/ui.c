/* Title, hero creation, villagers, bag, ledger and game over. */
#include <string.h>
#include "game.h"

#ifdef AUTOPLAY
#include AUTOPLAY          /* test builds may define TEST_SETUP */
#endif

Player P;

/* ---------- stats (js/game.js calcStats / gainXp) ---------- */

void calc_stats(void)
{
    const ClassDef *c = &classes[P.cls];
    u8 l = P.level - 1;
    P.hpmax = c->hp + 6 * l + 10 /* camp house, level 1 */ + P.bonus_hp + eff(E_HPMAX);
    P.atk = c->atk + l;
    P.mag = c->mag + l;
    P.def = (c->def * 2 + l * c->def_grow2) / 2 + eff(E_DEFFLAT);
    if (P.hp > P.hpmax) P.hp = P.hpmax;
}

u16 gain_xp(u16 n)
{
    u8 leveled = 0;
    n = (n * (100 + eff(E_XPGAIN)) + 50) / 100;
    P.xp += n;
    while (P.level < LEVEL_CAP && P.xp >= xp_next[P.level]) {
        P.xp -= xp_next[P.level];
        ++P.level;
        ++P.skill_points;
        leveled = 1;
    }
    if (P.level >= LEVEL_CAP) P.xp = 0;
    if (leveled) {
        calc_stats();
        P.hp = P.hpmax;
        sfx(SFX_LEVEL);
        sb_reset(); sb_str("Level "); sb_num(P.level); sb_str("! Fully healed. +1 skill point");
        log_add(sb, YELLOW);
    }
    return n;
}

void new_game(u8 cls)
{
    memset(&P, 0, sizeof(P));
    P.cls = cls;
    P.level = 1;
    P.skill_points = 1;
    P.spells[SP_GLITTER] = 4;
    if (cls == CL_WHISPERER) P.spells[SP_UNICORN] = 2;
#ifdef TEST_SETUP
    TEST_SETUP
#endif
    calc_stats();
    P.hp = P.hpmax;
    P.x = 6; P.y = 6;
    P.map = MAP_VILLAGE;
}

/* ---------- title ---------- */

static void show_class(u8 c)
{
    u8 i;
    put_ch(3, 17, c == NCLASS ? CH_POINTER : 0, YELLOW);
    put_str(5, 17, "Continue from disk", c == NCLASS ? YELLOW : PURPLE);
    if (c == NCLASS) {
        POKE(0xD015, 0);
        for (i = 0; i < NCLASS; ++i) {
            put_ch(3, 11 + i * 2, 0, YELLOW);
            put_str(5, 11 + i * 2, classes[i].name, WHITE);
        }
        clear_rows(18, 21);
        wrap("Load your saved hero from the disk in the drive.", 18, 2, CYAN);
        return;
    }
    for (i = 0; i < 3; ++i) {
        spr_load(i, player_spr[c][i]);
        SPR_PTR[i] = SPR_BASE + i;
        POKE(0xD027 + i, player_spr_col[c][i]);
        spr_pos(i, 248, 118);
    }
    POKE(0xD017, 0x07); POKE(0xD01D, 0x07);
    POKE(0xD015, 0x07);
    for (i = 0; i < NCLASS; ++i) {
        put_ch(3, 11 + i * 2, i == c ? CH_POINTER : 0, YELLOW);
        put_str(5, 11 + i * 2, classes[i].name, i == c ? YELLOW : WHITE);
    }
    clear_rows(18, 21);
    wrap(classes[c].blurb, 18, 2, CYAN);
    sb_reset(); sb_str("HP "); sb_num(classes[c].hp + 10); sb_str("  ATK "); sb_num(classes[c].atk);
    sb_str("  MAG "); sb_num(classes[c].mag); sb_str("  DEF "); sb_num(classes[c].def);
    put_center(21, sb, WHITE);
}

u8 title_screen(void)
{
    u8 c = 0, i;
    cls();
    POKE(0xD020, BLACK); POKE(0xD021, BLACK);
    for (i = 0; i < 40; ++i) {
        put_ch(i, 1, CH_SOLID, 2 + (i / 5) % 6);
        put_ch(i, 23, CH_SOLID, 2 + ((39 - i) / 5) % 6);
    }
    put_center(3, "PRISM QUEST", YELLOW);
    put_center(4, "R A I N Y D A Y", CYAN);
    put_center(6, "The world of Rainyday has spent a", WHITE);
    put_center(7, "hundred years beneath one endless storm.", WHITE);
    put_str(3, 9, "Choose your hero:", PURPLE);
    show_class(c);
    put_center(24, "Joystick 2 or W/S + fire/space", BLUE);
    for (;;) {
        wait_frame(); input_poll();
        if (in_new & IN_UP) { c = c ? c - 1 : NCLASS; show_class(c); }
        if (in_new & IN_DOWN) { c = c == NCLASS ? 0 : c + 1; show_class(c); }
        if (key_hit(K_1)) { c = 0; break; }
        if (key_hit(K_2)) { c = 1; break; }
        if (key_hit(K_3)) { c = 2; break; }
        if (in_new & IN_FIRE) break;
    }
    rng_seed(frame * 31 + PEEK(0xD012));
    POKE(0xD015, 0);
    POKE(0xD017, 0); POKE(0xD01D, 0);
    return c;
}

/* ---------- villagers (js/ui.js npcDialog) ---------- */

static u8 lands_freed(void)
{
    u8 i, n = 0;
    for (i = 0; i < NZONE; ++i) if (P.zones_cleared & (1 << i)) ++n;
    return n;
}

void talk_npc(u8 id)
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

/* ---------- the Village Ledger ---------- */

static const char *const quest_text[3] = {
    "Talk to Mayor Puddle in Drizzlewick.",
    "Take a gate out of the village and defeat the gloom champion in each direction.",
    "The land shines! Report to Mayor Puddle.",
};

void show_ledger(void)
{
    u8 i;
    POKE(0xD015, 0);
    cls();
    POKE(0xD021, BLACK);
    put_str(1, 0, "The Village Ledger", YELLOW);
    put_str(1, 2, "Current quest:", PURPLE);
    log_reset(3, 3);
    log_add(quest_text[P.main_quest > 2 ? 2 : P.main_quest], WHITE);
    put_str(1, 7, "The four lands:", PURPLE);
    for (i = 0; i < NZONE; ++i) {
        sb_reset(); sb_str(zones[i].dir); sb_str(" - "); sb_str(zones[i].name);
        put_str(2, 8 + i, sb, WHITE);
        put_str(30, 8 + i, (P.zones_cleared & (1 << i)) ? "sunny" : "gloom", (P.zones_cleared & (1 << i)) ? YELLOW : BLUE);
    }
    put_str(1, 13, "Favors:", PURPLE);
    put_str(2, 14, "Pip's lost frog", WHITE);
    put_str(30, 14, P.pip_stage == 2 ? "done" : P.pip_stage ? "open" : "-", CYAN);
    put_str(2, 15, "Barnaby's cold ovens", WHITE);
    put_str(30, 15, P.baker_stage == 2 ? "done" : P.baker_stage ? "open" : "-", CYAN);
    put_str(2, 16, "Willow's stubborn tulips", WHITE);
    put_str(30, 16, P.willow_stage == 2 ? "done" : P.willow_stage ? "open" : "-", CYAN);
    sb_reset(); sb_str("Kills: "); sb_num(P.kills); sb_str("   Time: "); sb_num(seconds / 60); sb_str(" min");
    put_str(1, 19, sb, WHITE);
    put_str(1, 24, "Fire: back", BLUE);
    wait_fire();
}

/* ---------- rogue-like death ---------- */

void game_over(void)
{
    POKE(0xD015, 0);
    erase_save();                       /* one life: the save falls with the hero */
    cls();
    POKE(0xD020, BLACK); POKE(0xD021, BLACK);
    sb_reset(); sb_str(classes[P.cls].name); sb_str(" has fallen.");
    put_center(6, sb, RED);
    put_center(8, "The gloom claims another hero...", WHITE);
    sb_reset(); sb_str("Level "); sb_num(P.level); sb_str("  -  "); sb_num(lands_freed());
    sb_str("/4 lands freed  -  "); sb_num(P.kills); sb_str(" kills");
    put_center(11, sb, CYAN);
    put_center(14, "Drizzlewick will light a candle", PURPLE);
    put_center(15, "for you - and send the next.", PURPLE);
    put_center(20, "Press fire", BLUE);
    wait_fire();
}
