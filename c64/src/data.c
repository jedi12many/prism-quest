/* Game data, ported from js/data.js (numbers kept identical). */
#include "game.h"

const char *const mineral_name[NMIN] = {
    "Quartz", "Amethyst", "Sunstone", "Aquamarine", "Emerald", "Rose Opal", "Prismatite"
};
/* node colours (cell colour 0-7); prismatite cycles through the rainbow */
const u8 mineral_color[NMIN] = { WHITE, PURPLE, YELLOW, CYAN, GREEN, RED, BLUE };

/* recipes and charges from js/data.js SPELLS */
const SpellDef spells[NSPELL] = {
    { "Glitter Bomb", 8, 4, { QUARTZ }, { 2 } },
    { "Prism Shield", 0, 3, { QUARTZ, AMETHYST }, { 1, 1 } },
    { "Sunflare", 12, 3, { SUNSTONE }, { 2 } },
    { "Tide Pop", 12, 3, { AQUAMARINE }, { 2 } },
    { "Healing Bloom", 0, 3, { EMERALD }, { 2 } },
    { "Butterfly Swarm", 6, 3, { AMETHYST, EMERALD }, { 1, 1 } },
    { "Summon Dwarves", 0, 2, { SUNSTONE, EMERALD }, { 1, 1 } },
    { "Rainbow Beam", 18, 3, { QUARTZ, AMETHYST, SUNSTONE }, { 1, 1, 1 } },
    { "Summon Unicorn", 8, 2, { ROSEOPAL, AQUAMARINE }, { 1, 1 } },
    { "Stardust Storm", 40, 2, { PRISMATITE, QUARTZ }, { 1, 1 } },
};

const ClassDef classes[NCLASS] = {
    { "Prism Mage", "A scholar of light. Spells hit harder, but robes are thin.", 40, 4, 9, 3, 1 },
    { "Crystal Knight", "A walking geode. Bonks first, asks questions never.", 46, 8, 4, 4, 2 },
    { "Unicorn Whisperer", "Speaks fluent sparkle. Unicorns answer the call.", 38, 5, 6, 3, 1 },
};

/*            name                  hp  atk def  xp flags                 dbl rgn tile           spr  Qz Am Su Aq Em Ro Pr */
const MonsterDef monsters[NMON] = {
    { "Gloom Slime",            14,  4, 0,  8, 0,                     0, 0, T_M_SLIME,     0, { 3, 1, 0, 0, 0, 0, 0 } },
    { "Cave Bat",               10,  5, 0,  9, 0,                     0, 0, T_M_BAT,       1, { 2, 2, 0, 0, 0, 0, 0 } },
    { "Sporeshroom",            16,  5, 0, 12, MF_POISON,             0, 0, T_M_SHROOM,    2, { 0, 2, 0, 0, 2, 0, 0 } },
    { "Shadow Fox",             20,  7, 1, 16, 0,                     0, 0, T_M_FOX,       3, { 0, 0, 2, 2, 0, 0, 0 } },
    { "Rock Golem",             30,  6, 3, 22, 0,                     0, 0, T_M_GOLEM,     4, { 0, 0, 0, 2, 2, 1, 0 } },
    { "Drowned Gazer",          26,  9, 1, 30, MF_DREAD,              0, 0, T_M_GAZER,     5, { 0, 0, 0, 0, 0, 2, 1 } },
    { "Spawn of Sog",           24, 10, 1, 26, 0,                     0, 0, T_M_SPAWNLING, 6, { 0, 0, 0, 0, 0, 1, 0 } },
    { "Bogmaw the Damp",        46,  8, 2, 60, MF_BOSS | MF_POISON,   0, 0, T_M_BOGMAW,    7, { 0, 0, 0, 2, 0, 0, 1 } },
    { "Voltra the Storm Serpent", 55, 11, 2, 70, MF_BOSS,            35, 0, T_M_VOLTRA,    8, { 0, 0, 2, 0, 0, 0, 1 } },
    { "Mildew Prime",           65, 10, 3, 80, MF_BOSS,               0, 2, T_M_MILDEW,    9, { 0, 0, 0, 0, 2, 0, 1 } },
    { "The Umbrella King",      60, 10, 4, 75, MF_BOSS | MF_DREAD,    0, 0, T_M_UMBRELLA, 10, { 0, 0, 0, 0, 0, 2, 1 } },
};

const ZoneDef zones[NZONE] = {
    /* north */
    { "North", "The Weeping Heights", MO_UMBRELLA, 4,
      { MO_GOLEM, MO_GAZER, MO_FOX, 0 }, { 3, 3, 2, 0 },
      { ROSEOPAL, EMERALD, SUNSTONE, ROSEOPAL },
      { { 13, 2 }, { 14, 2 } }, { 17, 21 }, { 17, 3 }, { 14, 3 }, GREY, LTGREEN },
    /* east */
    { "East", "The Thunderfen", MO_VOLTRA, 2,
      { MO_BAT, MO_FOX, MO_SLIME, 0 }, { 4, 4, 2, 0 },
      { SUNSTONE, AQUAMARINE, QUARTZ, AMETHYST },
      { { 25, 8 }, { 25, 9 } }, { 4, 13 }, { 30, 13 }, { 24, 8 }, CYAN, LTGREEN },
    /* west */
    { "West", "The Moldwood", MO_MILDEW, 3,
      { MO_SHROOM, MO_GOLEM, MO_FOX, MO_GAZER }, { 5, 2, 2, 1 },
      { EMERALD, AQUAMARINE, EMERALD, QUARTZ },
      { { 2, 13 }, { 2, 14 } }, { 30, 13 }, { 4, 13 }, { 3, 13 }, GREEN, LTGREEN },
    /* south */
    { "South", "Bogmire", MO_BOGMAW, 1,
      { MO_SLIME, MO_BAT, MO_SHROOM, 0 }, { 5, 3, 2, 0 },
      { QUARTZ, QUARTZ, AMETHYST, SUNSTONE },
      { { 13, 15 }, { 14, 15 } }, { 17, 4 }, { 17, 22 }, { 14, 14 }, GREEN, LTGREEN },
};

const char *const npc_name[NNPC] = {
    "Mayor Puddle", "Grandma Nimbus", "Foreman Flint", "Pip", "Barnaby the Baker", "Willow the Gardener"
};
const u8 npc_home[NNPC][2] = { { 14, 6 }, { 17, 9 }, { 10, 12 }, { 20, 7 }, { 22, 11 }, { 13, 10 } };

/* round(18 * level^1.5) */
const u16 xp_next[13] = { 0, 18, 51, 94, 144, 201, 265, 333, 407, 486, 569, 657, 748 };
