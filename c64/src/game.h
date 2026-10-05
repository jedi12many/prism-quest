/* Prism Quest: Rainyday -- Commodore 64 port.  Shared declarations. */
#ifndef GAME_H
#define GAME_H

#include "assets.h"
#include "tree.h"

typedef unsigned char u8;
typedef signed char i8;
typedef unsigned int u16;
typedef int i16;

#define PEEK(a)    (*(volatile u8 *)(a))
#define POKE(a, v) (*(volatile u8 *)(a) = (v))

/* ---------- memory map ----------
 * VIC bank 3, in the RAM under the (banked-out) KERNAL; see prismquest.cfg */
#define SCREEN    ((u8 *)0xE000)
#define SPRITES   0xE400          /* sprite slots (6 used) */
#define SPR_BASE  0x90            /* sprite pointer value of slot 0 */
#define CHARSET   0xD000          /* under the I/O chips; only the VIC reads it */
#define HIRAM     0xE580          /* code + data loaded from PQ.HI */
extern u8 _OVL_START__[];       /* the overlay window (prismquest.cfg) */
#define OVL_START ((u16)_OVL_START__)
#define LOWSCRATCH 0x0400         /* scratch: save buffer / map view buffers */
#define LOWSCRATCH_LEN 0x01F0
#define COLORRAM  ((u8 *)0xD800)
#define SPR_PTR   ((u8 *)0xE3F8)
#define SPR_PTR2  ((u8 *)0xC3F8)  /* the same, for the map's second screen at $C000 */
#define SPR_SLOT(n) ((u8 *)(SPRITES + (n) * 64))

/* the world's screen: row 0 HUD, rows 1-4 messages (a fixed panel), then a
 * black bar and the smooth-scrolling map in rows 5-24 */
#define MSG_ROW 1
#define MSG_ROWS 4
#define MAP_ROW 5

/* colours */
enum { BLACK, WHITE, RED, CYAN, PURPLE, GREEN, BLUE, YELLOW,
       ORANGE, BROWN, LTRED, DKGREY, GREY, LTGREEN, LTBLUE, LTGREY };

/* ---------- input ---------- */
#define IN_UP    0x01
#define IN_DOWN  0x02
#define IN_LEFT  0x04
#define IN_RIGHT 0x08
#define IN_FIRE  0x10
#define IN_BONK  0x20            /* the B key (Bonk in battle) */
/* keyboard matrix codes: (column << 3) | row */
#define K_RETURN 0x01
#define K_SPACE  0x3C
#define K_W 0x09
#define K_A 0x0A
#define K_S 0x0D
#define K_D 0x12
#define K_B 0x1C
#define K_F 0x15
#define K_I 0x21
#define K_C 0x14
#define K_T 0x16
#define K_G 0x1A
#define K_R 0x11
#define K_1 0x38
#define K_2 0x3B
#define K_3 0x08
#define K_4 0x0B
#define K_STOP 0x3F

extern u8 in_now, in_new;       /* held / newly pressed this frame */
extern u16 frame;               /* 50 Hz frame counter */
extern u16 seconds;             /* play clock */

void hw_init(void);
void wait_frame(void);
void input_poll(void);
u8 key_down(u8 code);
u8 key_hit(u8 code);            /* edge-triggered */
void wait_fire(void);           /* wait for a fresh fire/space/return */

/* ---------- rng ---------- */
void rng_seed(u16 s);
u16 rnd16(void);
u16 rnd(u16 n);                 /* 0..n-1 */
u8 chance(u8 pct);              /* pct in 0..100 */

/* ---------- text ---------- */
void cls(void);
void clear_rows(u8 y0, u8 y1);
void put_ch(u8 x, u8 y, u8 ch, u8 col);
void put_str(u8 x, u8 y, const char *s, u8 col);
void put_num(u8 x, u8 y, u16 n, u8 col);
void put_center(u8 y, const char *s, u8 col);
u8 glyph(char c);
const char *wrap(const char *s, u8 y0, u8 rows, u8 col);

/* a tiny string builder (no sprintf) */
extern char sb[160];
void sb_reset(void);
void sb_str(const char *s);
void sb_num(u16 n);

void msg_clear(void);
void msg(const char *s);                /* show in the message box, no wait */
void say(const char *name, const char *s);   /* paged dialogue, waits for fire */
void log_add(const char *s, u8 col);    /* scrolling log in the message box */
void log_reset(u8 y0, u8 rows);

/* ---------- sound ---------- */
enum { SFX_MINE, SFX_BONK, SFX_CRIT, SFX_HURT, SFX_SPELL, SFX_WIN, SFX_LEVEL, SFX_DEATH, SFX_GATE, SFX_TALK };
void sfx(u8 id);
void sound_tick(void);
void thunder(void);                      /* SID voice 3: noise through a falling low-pass */
/* music: SID voices 1-2, played by the frame interrupt (music.s, tools/music.js) */
enum { TUNE_TITLE, TUNE_VILLAGE, TUNE_WILDS, TUNE_BATTLE, TUNE_NONE = 0xFF };
void music(u8 tune);                     /* (carries on if it's already playing) */
void __fastcall__ music_play(u8 tune);
void music_stop(void);

/* ---------- the frame interrupt and the storm (rainirq.s, rain.c) ---------- */
void rain_init(void);
void __fastcall__ rain_on(u8 mask);      /* sprites 3-7 as a rain multiplexer */
void rain_off(void);
void split_on(void);                     /* the world's split screen */
void irq_stop(void);                     /* back to a plain text screen */
void rain_irq(void);
void kirq(void);
extern u8 rain_mask;
extern u8 sc_d011, sc_d016, sc_d018, map_bg;   /* the map's registers */
extern u8 split_mode;                    /* 1 while the world's split screen is up (2: quiet) */
void storm_start(u8 tier);
void storm_tick(u8 tier, u8 bg);
void storm_clears(void);

/* ---------- the scroller's shifts (scroll.s) ---------- */
void __fastcall__ scr_copy(u8 dir);      /* 0 left, 1 right, 2 up, 3 down */
void __fastcall__ col_shift(u8 dir);
extern u8 sc_front;                      /* 0: map on $E000, 1: on $C000 */
extern u8 edge[40];

/* ---------- sprites ---------- */
void hero_sprites(u8 cls);
u8 mon_sprites(u8 m);
void spr_pos(u8 n, u16 x, u8 y);
void spr_hide_all(void);

/* ---------- game data ---------- */
#define NMIN 7
enum { QUARTZ, AMETHYST, SUNSTONE, AQUAMARINE, EMERALD, ROSEOPAL, PRISMATITE };
extern const char *const mineral_name[NMIN];
extern const u8 mineral_color[NMIN];

#define NSPELL 10
enum { SP_GLITTER, SP_SHIELD, SP_SUNFLARE, SP_TIDEPOP, SP_BLOOM, SP_BUTTERFLY, SP_DWARVES, SP_RAINBOW, SP_UNICORN, SP_STARDUST };
typedef struct {
    const char *name;
    u8 power;
    u8 base;               /* charges per craft, before the quality bonus */
    u8 gem[3], n[3];       /* recipe: up to three minerals (n = 0 unused) */
} SpellDef;
extern const SpellDef spells[NSPELL];

#define NCLASS 3
enum { CL_MAGE, CL_KNIGHT, CL_WHISPERER };
typedef struct {
    const char *name;
    u8 hp, atk, mag, def;
    u8 def_grow2;          /* defence growth per level, in halves */
} ClassDef;
extern const ClassDef classes[NCLASS];

/* monster flags */
#define MF_BOSS   0x01
#define MF_POISON 0x02
#define MF_DREAD  0x04
#define MF_KEEPER 0x08           /* a dungeon keeper (also MF_BOSS: the loot, never respawns) */
typedef struct {
    const char *name;
    u8 hp, atk, def, xp;
    u8 flags;
    u8 double_hit;         /* % chance of a second swing */
    u8 regen;
    u8 tile, sprite;
    u8 drop[NMIN];         /* weights */
} MonsterDef;
enum { MO_SLIME, MO_BAT, MO_SHROOM, MO_FOX, MO_GOLEM, MO_GAZER, MO_SPAWNLING,
       MO_BOGMAW, MO_VOLTRA, MO_MILDEW, MO_UMBRELLA, MO_TROLL, MO_REVENANT, MO_POLTERGEIST,
       MO_SENTINEL, MO_RAINCALLER, MO_WYRM, MO_HERALD, MO_VOIDMAW, MO_SOG, NMON };
extern const MonsterDef monsters[NMON];

#define NZONE 4
enum { Z_NORTH, Z_EAST, Z_WEST, Z_SOUTH };
typedef struct {
    const char *dir;
    const char *name;
    u8 champion, tier;
    u8 pack_type[4], pack_n[4];
    u8 minerals[4];
    u8 gate[2][2];         /* gate tiles in the village */
    u8 entry[2], lair[2];  /* in the zone */
    u8 home[2];            /* where you land in the village coming back */
    u8 bg, bg_sun;
} ZoneDef;
extern const ZoneDef zones[NZONE];

#define NNPC 6
enum { NPC_MAYOR, NPC_GRANDMA, NPC_FOREMAN, NPC_PIP, NPC_BAKER, NPC_WILLOW };
extern const char *const npc_name[NNPC];
extern const u8 npc_home[NNPC][2];

extern const u16 xp_next[13];
#define LEVEL_CAP 12

/* ---------- loot (loot.c, in PQ.HI) ---------- */
#define NSLOT 5
enum { SL_WEAPON, SL_HELM, SL_ARMOR, SL_BOOTS, SL_CHARM };
enum { R_COMMON, R_MAGIC, R_RARE, R_LEGEND, R_SET, R_PRISM };
/* Prism relics (items.c): a weapon whose name byte says which -- a facet (by
 * zone id) or a fused prism weapon; its bonuses are in prism_eff */
enum { PRISM_TWIN = NZONE, PRISM_TRI, PRISM_BLADE, PRISM_COUNT };
#define PRISM_EFFS 7
extern const char *const prism_name[PRISM_COUNT];
extern const Eff prism_eff[PRISM_COUNT][PRISM_EFFS];
#define INV_CAP 24
typedef struct {
    u8 kind;               /* slot | rarity << 4; 0xFF = no item */
    u8 name;               /* base-name index, or the slot for legendaries/sets */
    u8 key[3], val[3];     /* affixes: effect key (E_*, 0 = none) and value */
    u8 base;               /* implicit stat (which one depends on the slot) */
    u8 sockets;            /* 0-2 */
    u8 gem[2];             /* faceted gem: mineral | quality << 4; 0xFF = empty */
} Item;
#define ITEM_SLOT(it)   ((it)->kind & 15)
#define ITEM_RARITY(it) ((it)->kind >> 4)
extern const char *const slot_name[NSLOT];
extern const char *const rarity_name[6];
extern const u8 rarity_color[6];
extern const char *const legend_lore[NSLOT];
extern const u8 gem_key[NMIN];
extern const u8 gem_val[NMIN][3];
void roll_item(Item *it, u8 ilvl, u8 rarity, u8 slot);   /* 0xFF = random */
i16 item_stat(const Item *it, u8 key);
i16 gear_eff(u8 key);
u8 set_count(void);
u16 item_power(const Item *it);
void sb_item_name(const Item *it);
void sb_stat(u8 key, i16 v);
u8 item_lines(const Item *it, u8 *keys, i16 *vals);
u8 give_item(const Item *it);
void monster_loot(u8 type);
void show_gear(void);                  /* gear.c */

/* ---------- camp buildings ----------
 * Built and upgraded with gems (raw or polished) from the build screen
 * (ov_build.c); their effects add into eff() (kit.c). The House comes built. */
#define NBLD 6
enum { B_HOUSE, B_KITCHEN, B_FACTORY, B_STALLS, B_TRAINING, B_WALLS };
#define BLD_MAX 3
extern const u8 bld_xy[NBLD - 1][2];    /* each building's tile (the walls ring the camp) */
extern const Eff bld_eff[NBLD][2];      /* per level */
extern const char *const bld_name[NBLD];
extern const u8 bld_cost[NBLD][BLD_MAX][6];   /* gems for each level: up to 3 (mineral, n) */
void place_buildings(void);             /* world.c: onto the village map */
void open_build(u8 b);                  /* kit.c: the door into the build screen (b: 0xFF as last time) */
void show_build(void);
extern u8 build_sel;                    /* the building the build screen opens on */

/* ---------- player state ---------- */
typedef struct {
    u8 cls;
    u8 level;
    u16 xp;
    u8 skill_points;
    i16 hp, hpmax;
    u8 atk, mag, def;
    u8 bonus_hp;
    u16 raw[NMIN];
    u16 polished[NMIN][3]; /* rough, fine, brilliant */
    u8 spells[NSPELL];
    u16 skills;            /* learned Power Tree nodes: bit branch*5 + tier */
    u8 revive_used;
    u8 zones_cleared;      /* bitmask by zone id */
    u8 main_quest;
    u16 kills;
    u8 npc_flags;          /* 1 grandma gift, 2 foreman gift */
    u8 pip_stage, pip_n;
    u8 baker_stage, willow_stage;
    u8 base[NBLD];         /* camp building levels, 0 = not built */
    u8 facets;             /* Prism Facets dug up, bitmask by zone id */
    u8 pact;               /* the Gloom Pact sealed for this land: 1 + its number, 0 none */
    u8 champ_below;        /* lands whose champion lurks at the bottom of a dungeon, by zone id */
    u8 castle;             /* the Rainycastle: CA_* bits */
    u8 hurt;               /* fell below 30% HP this run (no Untouchable) */
    u8 diff;               /* the difficulty, locked in for the run (DIFF_*) */
    u8 x, y;
    u8 map;                /* MAP_VILLAGE or a zone id */
    Item equip[NSLOT];
    Item inv[INV_CAP];
    u8 ninv;
} Player;
extern Player P;

void calc_stats(void);
u16 gain_xp(u16 n);
i16 eff(u8 key);           /* summed skill/perk effect (percent or flat) */

/* gems (ui.c) */
enum { Q_ROUGH, Q_FINE, Q_BRILLIANT };
u16 polished_count(u8 m);
u16 gem_stock(u8 m);       /* raw + polished */
void consume_gems(u8 m, u8 n);
void polish_all(u16 bonus);

/* ---------- world ---------- */
#define MAP_W 34
#define MAP_H 26
enum { MAP_VILLAGE = 0xFF, MAP_DUNGEON = 0xFE, MAP_CASTLE = 0xFD };    /* otherwise a zone id */
extern u8 map_id;
extern u8 mw, mh;
extern u8 map[MAP_H][MAP_W];

#define MAXMON 16
typedef struct {
    u8 x, y, hx, hy;
    u8 type;
    u8 alive;
    u8 move_t;             /* frames until next move */
    u16 respawn;           /* seconds; 0xFFFF never */
} Mob;
extern Mob mobs[MAXMON];
extern u8 nmobs;
/* elites (js/data.js ELITE_MODS): 0 none, else 1 + one of these */
enum { EL_VICIOUS = 1, EL_ARMORED, EL_SWIFT, EL_VENOMOUS, EL_CURSED, EL_RADIANT };
#define NELITE 6
extern u8 mob_elite[MAXMON];            /* world.c, beside mobs[] (scroll.s reads those) */
void maybe_elite(u8 tier);              /* the mob just added: elite now and then */

#define MAXNODE 14
typedef struct { u8 x, y, mineral; u16 respawn; } Node;
extern Node nodes[MAXNODE];
extern u8 nnodes;

enum { G_ZONE, G_HOME, G_CLOUD, G_FORGE, G_BOARD, G_FACET, G_DUNGEON, G_EXIT, G_STAIRS, G_CASTLE };
/* (G_FACET: a zone's buried Prism Facet; G_DUNGEON: zone = the dungeon's type;
 * G_CASTLE: zone = one of CG_*) */
#define MAXGATE 12
typedef struct { u8 x, y, kind, zone; } Gate;
extern Gate gates[MAXGATE];
extern u8 ngates;

typedef struct { u8 x, y, move_t; } Npc;
extern Npc npcs[NNPC];

/* ---------- dungeons (world.c; the floors themselves: ov_dungeon.c) ----------
 * Found in the zones; two or three floors down, each with a Warden holding the
 * key to the stair, and a keeper on the last. Not saved: a save made inside
 * one restarts in its zone. */
enum { DG_CAVE, DG_RUINS, DG_HOUSE, NDUNGEON };
typedef struct {
    u8 type, zone;         /* which dungeon, found in which zone */
    u8 tier;               /* the zone's, plus a floor's worth for every floor down */
    u8 floor, floors;      /* 1.., and how many */
    u8 has_key;            /* the Warden's fallen: the stair is open */
    u8 warden;             /* its mob index, 0xFF none */
    u8 ex, ey;             /* the way out (the floor's entry) */
    u8 champ;              /* the land's champion waits on the last floor (instead of a keeper) */
} Dungeon;
extern Dungeon dg;
u8 combat_tier(void);              /* the difficulty where we stand */
void build_dungeon(void);          /* ov_dungeon.c: the floor dg.floor of dg.type */
extern const char *const dungeon_name[NDUNGEON + 2];   /* (resident: the HUD; then the castle's, the realm's) */

/* ---------- the Rainycastle and the realm below (world.c; their floors and
 * doings: ov_castle.c) ----------
 * Three floors up, reached by the Cloudgate once all four lands shine: a
 * guardian seals each stair, and the Rainwyrm holds the throne. Past it, a
 * one-way portal down to Sog'naroth's realm: three depths, a guardian at
 * each rift down, and Sog'naroth at the bottom. Both are MAP_CASTLE (the
 * realm once P.castle has CA_REALM), and borrow dg: dg.floor is the floor or
 * depth (0: where to resume), dg.tier the fights', dg.has_key the way on's
 * open, dg.ex/ey where castle_gate sends you. */
enum { CA_FLOOR1 = 1, CA_FLOOR2 = 2, CA_WYRM = 4, CA_CLAIMED = 8, CA_REALM = 16, CA_SUN = 32 };   /* P.castle */
enum { CG_DOWN, CG_UP, CG_HOARD, CG_PORTAL };   /* its gates (CG_UP: the realm's rift down too) */
#define DG_CASTLE NDUNGEON                      /* (dg.type: its name) */
#define DG_REALM (NDUNGEON + 1)
void travel(u8 id, u8 x, u8 y);
void build_castle(void);           /* ov_castle.c: floor dg.floor */
void castle_hello(void);           /* the floor's greeting, on arriving */
u8 castle_gate(u8 gi);             /* a castle gate, or the Cloudgate: 1 down to the village, 2 to dg.floor at dg.ex, dg.ey */
/* (ov_foes.c, loaded for any fight with a keeper or the castle's foes:) */
void foe_won(u8 mi);               /* after beating mobs[mi], one of them */
extern const char *const castle_cry[6];        /* the guardians', the Wyrm's and Sog'naroth's battle cries */
void the_end(void);                /* ov_end.c: Sog'naroth falls, the sun comes back */
void build_realm(void);            /* ov_realm.c: depth dg.floor */
void realm_hello(void);
u8 realm_gate(void);               /* its rift down: 2 if it takes you (to dg.floor at dg.ex, dg.ey) */
u8 home_base(void);                /* the village, or the castle's throne once claimed */
void add_mob(u8 x, u8 y, u8 type, u8 move_t, u16 respawn);
void add_node(u8 x, u8 y, u8 m);
void add_gate(u8 x, u8 y, u8 kind, u8 zone);
void build_map(u8 id);
void build_zone(u8 z);             /* ov_lands.c */
void blank_map(u8 w, u8 h);        /* grass, ringed with trees */
u8 cheb(u8 x1, u8 y1, u8 x2, u8 y2);
u8 node_at(u8 x, u8 y);
u8 gate_at(u8 x, u8 y);
u8 walkable(u8 x, u8 y);
void draw_map(void);
void draw_hud(void);
void place_player_sprite(void);
void world_loop(void);
void world_hud_dirty(void);

/* ---------- screens ---------- */
u8 title_screen(void);          /* returns chosen class */
void new_game(u8 cls);
void talk_npc(u8 id);
void show_bag(void);
void show_ledger(void);
u8 lands_freed(void);
u8 skill_owned(u8 b, u8 t);
/* kit.c: menu kit shared by the overlay screens */
void put_strn(u8 x, u8 y, const char *s, u8 max, u8 col);
void screen_open(const char *title);
u8 get_input(void);
u8 at_camp(const char *what);
/* resident doors into the overlays: load it, then open the screen */
void open_bag(void);
void open_gear(void);
void open_spellbook(void);
void open_tree(void);
void open_ledger(void);
void talk(u8 npc);
void continue_failed(void);
void talk_a(u8 id);
void talk_b(u8 id);
void show_tree_mage(void);
void show_tree_knight(void);
void show_tree_whisperer(void);

/* ---------- overlays (save.c) ----------
 * Screens you open now and then live on disk (PQ.OV1 .. PQ.OV7) and load on
 * demand into one shared window at the end of the program. */
enum { OV_TITLE = 1, OV_TALKA, OV_TALKB, OV_CAMP, OV_TREE };   /* OV_TREE + class */
#define OV_BUILD 8
#define OV_LEDGER 9
#define OV_DUNGEON 10                   /* the dungeon floors' generators */
#define OV_LANDS 11                     /* the zone generator */
#define OV_DIG 12                       /* digging up a Prism Facet */
#define OV_GLASS 13                     /* the Glassworks */
#define OV_PACT 14                      /* the gloom's bargain */
#define OV_CASTLE 15                    /* the Rainycastle's floors */
#define OV_FOES 16                      /* the big foes: keepers' and castle's portraits, and the castle's battles */
#define OV_END 17                       /* the ending */
#define OV_REALM 18                     /* Sog'naroth's realm's depths */
#define OV_DEEDS 19                     /* the deeds: their page, their file */
#define OV_BAG 20                       /* the Bag: polishing, the dwarves */
#define OV_SANCT 21                     /* the Sanctuary */
#define OV_BOSS 22                      /* the bosses' specials */
#define OV_COUNT 22

/* a boss's signature blow (ov_boss.c), by battle sprite from SPECIAL_SPRITE0 */
#define SPECIAL_SPRITE0 7                /* (Bogmaw's: the champions, keepers, castle's and realm's after) */
#define NSPECIAL 13
typedef struct {
    const char *name, *cry;
    u8 mult20;             /* damage: x20 a swing's base */
    u8 hits, poison, dread;
    u8 heal, steal;        /* self-heal, % of max HP; lifesteal, % of the damage */
} Special;
void boss_special(void);           /* (and the blow: in place of mobs' turn) */

/* ---------- deeds (js/achievements.js) ----------
 * Kept on the disk in PQ.DEEDS, apart from the hero: a fallen hero's deeds
 * stay. deed() marks one done (resident, from anywhere); the world tells of
 * it, and writes the file, the next time the hero stands still. The run
 * tallies are written then, and when a run ends. */
enum { DE_FIRST_LIGHT, DE_FOUR_DAWNS, DE_STORMBREAKER, DE_SUNBRINGER, DE_GLASSSMITH, DE_PRISMBLADE,
       DE_GLINT_EYED, DE_KEEPERS, DE_AURA, DE_HIHO, DE_BEST_FRIENDS, DE_DEVILS_DUE, DE_NEIGHBOR,
       DE_SUPPER, DE_UNTOUCHABLE, DE_TRIPLE, DE_BOTTOM, DE_WALLS, DE_STORM_TESTED, DE_DELUGE, DE_WEATHER, NDEED };
/* the difficulty (js/data.js DIFFICULTIES): monsters' HP and damage, in percent
 * (battle.c); chosen on the title screen for the next hero */
enum { DIFF_EASY, DIFF_NORMAL, DIFF_HARD, DIFF_MONSOON, NDIFF };
/* The Sanctuary (js/data.js META_UPGRADES, js/ui.js openMeta) rides in the
 * same file: Motes banked by each fallen hero, the upgrades they bought
 * (always on, or granted to each new hero), and the roll of the fallen. */
enum { SA_HEARTY, SA_VETERAN, SA_FLEET, SA_KEEN, SA_TRAINED, SA_PROSPECTOR, SA_ARSENAL, NSANCT };
#define NSANCT_EFF 4                    /* the first four: always on (sanct_eff, kit.c) */
#define NFALLEN 8
typedef struct { u8 cls, level, zones, where; } Fallen;   /* where: a zone id, or 4 + a dungeon_name[] */
typedef struct {
    u8 magic[3];           /* "PD", version */
    u8 got[3];             /* deeds done, by bit */
    u8 elites;             /* elites slain, every run (counting to 25) */
    u8 keepers;            /* dungeon keepers beaten, by kind */
    u8 won_cls;            /* classes that have brought the sun back, by bit */
    u16 runs, wins, losses;
    u16 best;              /* the fastest sun, in seconds (0: none yet) */
    u8 diff_next;          /* the difficulty the next hero starts on */
    u8 won_diff;           /* difficulties the sun's been brought back on, by bit */
    u16 motes;             /* the Sanctuary's: to spend */
    u8 rank[NSANCT];       /* upgrades bought */
    Fallen fallen[NFALLEN];   /* the latest last */
} Deeds;
void show_sanctuary(void);              /* ov_sanct.c */
extern Deeds deeds;
extern u8 deeds_told[3];                /* the deeds the player's been told of */
void deed(u8 id);                       /* kit.c */
extern const char *const deed_name[NDEED];
extern const char *const diff_name[NDIFF];
u8 deeds_news(void);                    /* any done but not yet told */
void deeds_read(void);                  /* (kit.c too) */
void deeds_write(void);
void deeds_tell(void);                  /* ov_deeds.c */                  /* tell of the new ones, then write */
void show_deeds(void);
/* Gloom Pacts (js/data.js PACTS): a blessing and a curse, sealed on entering
 * a land still under the gloom, for as long as you stay (dungeons too) */
#define NPACT 8
extern const Eff pact_eff[NPACT][4];    /* data.c (resident: eff() adds it in) */
extern const char *const pact_name[NPACT];   /* kit.c (the offer and the Ledger name them) */
void offer_pact(u8 zone);               /* ov_pact.c */
void zone_hello(u8 zone);               /* (with it: stepping into a land under the gloom) */
void village_hello(u8 first);           /* ov_village.c: coming home (first: a new hero) */
void show_glassworks(void);
void dig_facet(u8 gate);
void build_village(void);               /* ov_village.c, in PQ.OV12 too */
void zone_cleared(u8 z);
void set_palette(void);                 /* world.c: the map's colours */
void queue_tile(u8 x, u8 y);            /* world.c: redraw this map tile soon */
extern u8 gate_t[MAXGATE];              /* world.c: each gate's tile */
void ovl(u8 id);
void camp_menu(void);
void show_spellbook(void);
void show_tree(void);
u8 menu_pick(u8 x, u8 y0, const char *const *items, u8 n, u8 sel);
void show_ledger(void);
u8 battle(u8 mob, u8 ambush);   /* 0 fled, 1 won, 2 died */
void game_over(void);

/* disk (save.c) */
void disk_init(void);
u8 hi_present(void);
u8 load_hi(void);
void unpack_hi(void);
u8 save_game(void);
u8 load_game(void);
u8 do_save(void);                  /* ov_save.c, in PQ.OV9 */
u8 do_load(void);
void erase_save(void);

#endif
