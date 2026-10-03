/* Prism Quest: Rainyday -- Commodore 64 port.  Shared declarations. */
#ifndef GAME_H
#define GAME_H

#include "assets.h"

typedef unsigned char u8;
typedef signed char i8;
typedef unsigned int u16;
typedef int i16;

#define PEEK(a)    (*(volatile u8 *)(a))
#define POKE(a, v) (*(volatile u8 *)(a) = (v))

/* ---------- memory map (VIC bank 3) ---------- */
#define SCREEN    ((u8 *)0xC000)
#define SPRITES   0xC400          /* 16 sprite slots, pointer values 16..31 */
#define CHARSET   0xC800
#define COLORRAM  ((u8 *)0xD800)
#define SPR_PTR   ((u8 *)0xC3F8)
#define SPR_SLOT(n) ((u8 *)(SPRITES + (n) * 64))

/* screen layout: row 0 HUD, rows 1-20 map (10 tiles), rows 21-24 messages */
#define VIEW_W 20
#define VIEW_H 10
#define MSG_ROW 21
#define MSG_ROWS 4

/* colours */
enum { BLACK, WHITE, RED, CYAN, PURPLE, GREEN, BLUE, YELLOW,
       ORANGE, BROWN, LTRED, DKGREY, GREY, LTGREEN, LTBLUE, LTGREY };

/* ---------- input ---------- */
#define IN_UP    0x01
#define IN_DOWN  0x02
#define IN_LEFT  0x04
#define IN_RIGHT 0x08
#define IN_FIRE  0x10
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

/* ---------- sprites ---------- */
void spr_load(u8 slot, const u8 *data);
void spr_pos(u8 n, u16 x, u8 y);
void spr_hide_all(void);

/* ---------- game data ---------- */
#define NMIN 7
enum { QUARTZ, AMETHYST, SUNSTONE, AQUAMARINE, EMERALD, ROSEOPAL, PRISMATITE };
extern const char *const mineral_name[NMIN];
extern const u8 mineral_color[NMIN];

#define NSPELL 9
enum { SP_GLITTER, SP_SHIELD, SP_SUNFLARE, SP_TIDEPOP, SP_BLOOM, SP_BUTTERFLY, SP_RAINBOW, SP_UNICORN, SP_STARDUST };
typedef struct {
    const char *name;
    u8 power;
} SpellDef;
extern const SpellDef spells[NSPELL];

#define NCLASS 3
enum { CL_MAGE, CL_KNIGHT, CL_WHISPERER };
typedef struct {
    const char *name;
    const char *blurb;
    u8 hp, atk, mag, def;
    u8 def_grow2;          /* defence growth per level, in halves */
    i8 spell_dmg;          /* perk percentages */
    i8 basic_dmg;
    u8 charge_save;
    u8 unicorn_power;
} ClassDef;
extern const ClassDef classes[NCLASS];

/* monster flags */
#define MF_BOSS   0x01
#define MF_POISON 0x02
#define MF_DREAD  0x04
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
       MO_BOGMAW, MO_VOLTRA, MO_MILDEW, MO_UMBRELLA, NMON };
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
    u8 spells[NSPELL];
    u8 zones_cleared;      /* bitmask by zone id */
    u8 main_quest;
    u16 kills;
    u8 npc_flags;          /* 1 grandma gift, 2 foreman gift */
    u8 pip_stage, pip_n;
    u8 baker_stage, willow_stage;
    u8 x, y;
} Player;
extern Player P;

void calc_stats(void);
u16 gain_xp(u16 n);

/* ---------- world ---------- */
#define MAP_W 34
#define MAP_H 26
enum { MAP_VILLAGE = 0xFF };    /* otherwise a zone id */
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

#define MAXNODE 14
typedef struct { u8 x, y, mineral; u16 respawn; } Node;
extern Node nodes[MAXNODE];
extern u8 nnodes;

enum { G_ZONE, G_HOME, G_CLOUD, G_FORGE, G_BOARD };
#define MAXGATE 12
typedef struct { u8 x, y, kind, zone; } Gate;
extern Gate gates[MAXGATE];
extern u8 ngates;

typedef struct { u8 x, y, move_t; } Npc;
extern Npc npcs[NNPC];

void build_map(u8 id);
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
u8 battle(u8 mob, u8 ambush);   /* 0 fled, 1 won, 2 died */
void game_over(void);

#endif
