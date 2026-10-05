/* Overlay: the ending (index.html winBanner, js/ui.js villageCelebration) --
 * Sog'naroth falls, the sun comes back, and Drizzlewick cheers.
 * Loaded from disk on demand into the overlay window (see ovl() in save.c),
 * after the last fight; then world.c takes the hero home. */
#include "game.h"

#pragma code-name("OVENDCODE")
#pragma rodata-name("OVENDDATA")
#pragma bss-name("OVENDDATA")

static const u8 rainbow[6] = { RED, ORANGE, YELLOW, GREEN, CYAN, PURPLE };
static const char *const page[3] = {
    "\"so. a morning, after all. how it... stings. there will be other darks - there is always more. "
    "but this one dawn is yours, little light. it actually h-\"",
    "So this is what was really happening. Beneath the rain, all along: Sog'naroth, the Endless Drizzle - an ancient "
    "thing that could only exist where the sun never shines, sending its storm up through the tear in the sky. "
    "The Rainwyrm was only its doorman. The champions, only its fingers.",
    "Now it unravels into harmless drizzle and blows away on a warm breeze. The last raincloud breaks, colour floods "
    "the valley, and for the first time in a hundred years - morning.",
};
static const char gloombreaker[] =
    "The valley gives you a new name. For standing between the world and the thing beneath it, you are the first "
    "GLOOMBREAKER - the one who holds back the dark. Others will come after. The gloom is patient, and there is "
    "always more of it, somewhere below.";
static const char cheers[] =
    "The whole village is packed into the square - Pip is up on Barnaby's shoulders, Grandma is crying into her "
    "shawl, and Foreman Flint is pretending very hard that he isn't.\n\n"
    "\"THREE CHEERS FOR THE HERO OF RAINYDAY! You walked into the dark that ate a hundred years of mornings... and "
    "you carried the SUN home on your back. Drizzlewick will bake about this, sing about this, and absolutely "
    "exaggerate about this for generations. HIP HIP-\"";

static u8 t, i;

/* a fresh page between two rainbow bars; fire to go on (the bars run meanwhile) */
static void open_page(const char *title)
{
    cls();
    POKE(0xD021, BLACK);
    POKE(0xD020, BLACK);
    for (i = 0; i < 40; ++i) { put_ch(i, 0, CH_SOLID, WHITE); put_ch(i, 24, CH_SOLID, WHITE); }
    put_center(2, title, YELLOW);
}

static void wait_page(void)
{
    put_str(30, 23, "Fire", BLUE);
    do {
        wait_frame(); input_poll();
        if (!(frame & 3)) {
            ++t;
            for (i = 0; i < 40; ++i) COLORRAM[i] = COLORRAM[24 * 40 + 39 - i] = rainbow[(u8)(i / 7 + t) % 6];
        }
    } while (!(in_new & IN_FIRE));
}

void the_end(void)
{
    ++deeds.runs; ++deeds.wins;                         /* (told of and written once home) */
    deeds.won_cls |= 1 << P.cls;
    if (!deeds.best || seconds < deeds.best) deeds.best = seconds;
    deed(DE_SUNBRINGER);
    if (seconds < 2400) deed(DE_SUPPER);        /* (under 40 minutes) */
    if (!P.hurt) deed(DE_UNTOUCHABLE);
    if (deeds.won_cls == (1 << NCLASS) - 1) deed(DE_TRIPLE);
    POKE(0xD015, 0);
    irq_stop();
    music(TUNE_TITLE);
    sfx(SFX_WIN);

    open_page("The sun returns to Rainyday!");
    wrap(page[0], 5, 5, LTBLUE);
    wrap(page[1], 11, 9, WHITE);
    wait_page();

    open_page("Morning");
    wrap(page[2], 5, 5, WHITE);
    wrap(gloombreaker, 11, 7, YELLOW);
    sb_reset(); sb_str("Sun restored in "); sb_num(seconds / 60); sb_str(" min, with ");
    sb_num(P.kills); sb_str(" foes beaten.");
    wrap(sb, 19, 2, CYAN);
    wait_page();

    open_page("Home to Drizzlewick");
    wrap(cheers, 5, 15, WHITE);
    wait_page();
    sfx(SFX_LEVEL);
    put_center(21, "HOORAY!", YELLOW);
    wait_page();
}
