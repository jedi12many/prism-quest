/* Overlay: the bosses' specials (js/data.js BOSS_SPECIALS; js/battle.js
 * runBossSpecial). Every named villain -- the four champions, the three
 * keepers, the castle's three and the realm's three -- has a signature blow:
 * every third turn, and always the first time it's wounded past half, it cuts
 * to a battle cry and lands that instead of a swing. battle.c loads this the
 * first time one gathers its power (fights that end sooner never touch the
 * disk), and nothing else loads during a fight, so it stays for the rest.
 * The blow itself is here too, with battle.c's state and helpers.
 * Loaded from disk on demand into the overlay window (see ovl() in save.c). */
#include "game.h"

#pragma code-name("OVBOSSCODE")
#pragma rodata-name("OVBOSSDATA")
#pragma bss-name("OVBOSSDATA")

/* by battle sprite, from the first champion's (Bogmaw's) on:
 *   name, battle cry, damage (x20 a swing's base), strikes, poison per turn,
 *   dread, self-heal (% of max HP), lifesteal (% of the damage) */
static const Special specials[NSPECIAL] = {
    { "Tidal Gulp", "\"GLORP - straight down the gullet! The swamp always comes back for seconds.\"", 52, 1, 0, 0, 8, 0 },
    { "Chain Lightning", "\"The sky ANSWERS me - and it is screaming your name in thunder!\"", 23, 3, 0, 0, 0, 0 },
    { "Spore Bloom", "\"Breathe deep, little sunbeam. Let the rot bloom inside you.\"", 38, 1, 5, 0, 0, 0 },
    { "Endless Downpour", "\"Beneath my canopy the sun has never once touched the ground. Now drown.\"", 30, 2, 0, 0, 0, 0 },
    { "Cave-In", "\"HRRN. Roof come DOWN. Cave keep hero, keep shiny, keep ALL.\"", 54, 1, 0, 0, 0, 0 },
    { "Grave Weight", "\"Kneel. The centuries I have carried, I lay now upon your shoulders.\"", 38, 1, 0, 1, 0, 0 },
    { "The Haunting", "\"Ahaha! Round and round and round - you will NEVER find the door!\"", 22, 3, 0, 1, 0, 0 },
    { "Bulwark Slam", "\"NONE climb past me. I am the storm's locked and bolted door.\"", 54, 1, 0, 0, 0, 0 },
    { "Cloudburst", "\"I called this hundred-year rain. Now I call every drop of it down on YOU.\"", 36, 1, 4, 0, 0, 0 },
    { "Storm Breath", "\"I AM THE STORM'S TOOTH - and I bite the very sky in HALF!\"", 56, 1, 4, 0, 0, 0 },
    { "Dread Knell", "\"Listen - the mouth below is opening. It has already heard you coming.\"", 34, 1, 0, 1, 0, 0 },
    { "Devour the Light", "\"Everything bright ends in me. Give me that little glow of yours.\"", 44, 1, 0, 0, 0, 60 },
    { "Drowned Dawn", "\"witness the tide that has no morning. it is very old, and it is very, very hungry.\"", 32, 2, 0, 1, 0, 0 },
};

/* battle.c's */
extern const MonsterDef *md;
extern i16 mhp, mhpmax;
extern u16 atk_scale;
extern u8 m_weak_t, p_shield_t, p_shield_red, p_pois_t, p_pois_d, p_dread_t, over;
void blog(const char *s, u8 col);
u8 variance(void);
i16 finish(long d100);
void draw_status(void);
void shake(u8 first);
void flash(u8 col);
void player_damage(i16 dmg);

/* a boss's signature blow (js/battle.js resolveBossSpecial), in place of
 * its turn: its battle cry, then mult x a swing's base, once or more; the
 * shield takes a share of each and buckles; then poison, dread, a heal */
void boss_special(void)
{
    const Special *s;
    long a;
    i16 dmg, total = 0;
    u8 i;
    s = &specials[md->sprite - SPECIAL_SPRITE0];
    sb_reset(); sb_str(md->name); sb_str(" gathers its power...");
    blog(sb, ORANGE);
    blog(s->cry, YELLOW);
    for (i = 0; i < s->hits; ++i) {
        a = (long)md->atk * atk_scale * s->mult20 / 20;     /* x100 */
        if (m_weak_t) a = a * 70 / 100;
        a = a * variance() / 100 - P.def * 50;
        dmg = finish(a);
        if (p_shield_t) dmg = finish((long)dmg * (100 - p_shield_red));
        total += dmg;
    }
    if (p_shield_t) { --p_shield_t; blog("Your shield buckles under the blow!", CYAN); }
    sfx(SFX_HURT);
    flash(RED);
    shake(0);
    sb_reset(); sb_str(s->name); sb_str(" - "); sb_num(total); sb_str(" damage!");
    blog(sb, RED);
    player_damage(total);
    draw_status();
    if (over) return;
    if (s->poison) { p_pois_t = 3; p_pois_d = s->poison; blog("Its venom courses through you!", PURPLE); }
    if (s->dread) { p_dread_t = 2; blog("Dread grips you - your damage is sapped!", BLUE); }
    if ((dmg = (long)total * s->steal / 100 + (long)mhpmax * s->heal / 100)) {
        mhp += dmg;
        if (mhp > mhpmax) mhp = mhpmax;
        sb_reset(); sb_str(md->name); sb_str(s->steal ? " drinks the light from your wounds (+" : " knits itself back together (+");
        sb_num(dmg); sb_str(").");
        blog(sb, CYAN);
    }
    draw_status();
}
