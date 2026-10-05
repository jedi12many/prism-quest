/* Overlay: a Gloom Pact (js/ui.js offerPact) -- on stepping into a land still
 * under the gloom, three bargains at random: a blessing and a curse each, for
 * as long as you stay. Or refuse. The effects are pact_eff (data.c).
 * Loaded from disk on demand into the overlay window (see ovl() in save.c). */
#include "game.h"

#pragma code-name("OVPACTCODE")
#pragma rodata-name("OVPACTDATA")
#pragma bss-name("OVPACTDATA")

static const char *const pact_bless[NPACT] = {
    "+35% spell damage", "+40% Bonk damage, +8% crit", "+25% rare-gem luck, +1 mining", "+4 defense, +20 max HP",
    "+60% unicorn power, +30% healing", "+12% dodge, +8% crit", "+50% XP, 15% free casts", "+20% all damage, +2 regen",
};
static const char *const pact_curse[NPACT] = {
    "-18 max HP", "-3 defense", "-30% XP", "-20% all damage",
    "-2 attack", "-12 max HP", "-2 defense", "-25 max HP",
};

static u8 pick[3], sel, i, y;

static void draw(void)
{
    for (i = 0, y = 6; i < 4; ++i, y += 4) {
        put_ch(1, y, i == sel ? CH_POINTER : 0, YELLOW);
        if (i == 3) { put_str(3, y, "Refuse the bargain", i == sel ? YELLOW : WHITE); break; }
        put_str(3, y, pact_name[pick[i]], i == sel ? YELLOW : PURPLE);
        put_str(5, y + 1, pact_bless[pick[i]], LTGREEN);
        put_str(5, y + 2, pact_curse[pick[i]], LTRED);
    }
}

static void step_into(u8 zone) { sb_reset(); sb_str("You step into "); sb_str(zones[zone].name); }

void zone_hello(u8 zone)
{
    step_into(zone);
    sb_str(P.champ_below & (1 << zone) ? ". Its champion has gone to ground - three floors down, in one of the dungeons here."
                                       : ". Somewhere ahead, its gloom champion waits.");
    msg(sb);
}

void offer_pact(u8 zone)
{
    u8 in;
    pick[0] = rnd(NPACT);                       /* three different ones */
    do pick[1] = rnd(NPACT); while (pick[1] == pick[0]);
    do pick[2] = rnd(NPACT); while (pick[2] == pick[0] || pick[2] == pick[1]);
    screen_open("A Gloom Pact");
    step_into(zone);
    sb_str(". The gloom offers a bargain - choose a pact, or refuse it.");
    wrap(sb, 2, 3, GREY);
    put_str(1, 24, "Up/Down: choose  Fire: seal it", BLUE);
    sel = 0;
    wait_frame(); input_poll();                 /* (whatever's still held from the walk doesn't count) */
    for (;;) {
        draw();
        in = get_input();
        if (in & IN_UP) sel = sel ? sel - 1 : 3;
        else if (in & IN_DOWN) sel = sel == 3 ? 0 : sel + 1;
        else if (in & IN_FIRE) break;
    }
    if (sel < 3) { P.pact = pick[sel] + 1; sfx(SFX_SPELL); }
}
