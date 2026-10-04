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
    const char *blurb;
    u8 hp, atk, mag, def;
    u8 def_grow2;          /* defence growth per level, in halves */
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

/* ---------- loot (loot.c, in PQ.HI) ---------- */
#define NSLOT 5
enum { SL_WEAPON, SL_HELM, SL_ARMOR, SL_BOOTS, SL_CHARM };
enum { R_COMMON, R_MAGIC, R_RARE, R_LEGEND, R_SET };
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
extern const char *const rarity_name[5];
extern const u8 rarity_color[5];
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
#define OV_COUNT 7
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
void erase_save(void);

#endif
