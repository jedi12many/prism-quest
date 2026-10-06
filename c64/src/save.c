/* The disk: overlays, PQ.HI at startup, and the doors into saving and
 * loading (ov_save.c). Device 8 by default, or whichever drive the game was
 * loaded from. The KERNAL calls live in disk.s; PQ.HI and the overlays come
 * through the fast loader (fast.s) when the boot file put it in place. */
#include <string.h>
#include "game.h"

extern u8 __fastcall__ disk_op(u8 op);
extern u8 disk_dev, disk_namelen;
extern char disk_name[20];
extern u16 disk_start, disk_end;
extern char disk_status[40];
extern u8 fast;                         /* 0 no fast loader; 1 ready; 2 put its drive code back first */
u8 fast_load(void);
void drive_install(void);

enum { OP_SAVE, OP_LOAD, OP_CMD, OP_LOADHI };

/* saving and loading themselves ride with the Village Ledger (ov_save.c):
 * a disk operation anyway, so one more short load costs little */
u8 save_game(void) { ovl(OV_LEDGER); return do_save(); }
u8 load_game(void) { ovl(OV_LEDGER); return do_load(); }

/* The startup functions (disk_init .. unpack_hi) keep their locals -- static,
 * under -Cl -- out of BSS: PQ.HI loads its tail on top of BSS, so anything
 * written there before unpack_hi has copied it away would corrupt it. */
#pragma bss-name (push, "EARLYBSS")
void disk_file(const char *s)
{
    disk_namelen = strlen(s);
    memcpy(disk_name, s, disk_namelen);
}

#ifdef LOADTIME                         /* (measuring: time spent loading overlays, by the CIA's clock) */
u8 load_count;
u8 calls[8], ncalls;
static u16 tod(void)
{
    u8 m, sec, t;
    m = PEEK(0xDC0B);                   /* (reading the hours holds the rest still) */
    m = PEEK(0xDC0A); sec = PEEK(0xDC09); t = PEEK(0xDC08);
    return ((m >> 4) * 10 + (m & 15)) * 600 + ((sec >> 4) * 10 + (sec & 15)) * 10 + t;
}
#endif

/* disk_name -> the address in its header: fast if the drive code's there,
 * else (or if that fails) the KERNAL. 0 when loaded. */
u8 load_file(void)                      /* (its local stays out of BSS: load_hi uses it) */
{
    u8 r;
    if (fast == 1) {
#ifdef LOADTIME
        u16 t0 = tod();
        r = fast_load();
        t0 = tod() - t0;
        if (ncalls < 8) calls[ncalls++] = t0 > 255 ? 255 : t0;
        if (!r) return 0;
#else
        if (!(r = fast_load())) return 0;
#endif
        if (r == 2) fast = 0;           /* (no answer: a drive that can't run it) */
    }
    return disk_op(OP_LOADHI);
}

#pragma code-name (push, "INITCODE")      /* (startup only: see main) */
void disk_init(void)
{
    u8 d = PEEK(0xBA);                  /* the KERNAL's last-used device */
    disk_dev = (d >= 8 && d <= 30) ? d : 8;
    fast = PEEK(0x2FF) == 0xA5;         /* (the boot file's word for it) */
#ifdef LOADTIME
    POKE(0xDC0B, 0); POKE(0xDC0A, 0); POKE(0xDC09, 0); POKE(0xDC08, 0);   /* (start the clock) */
#endif
#ifdef NOFAST
    fast = 0;
#endif
    POKE(0x2FF, 0);
}
#pragma code-name (pop)

#pragma code-name (push, "INITCODE")      /* (startup only: see main) */
/* PQ.HI holds code and data for $E580-$F67F (the loot engine). It's loaded once
 * at startup, unless it's already there (e.g. a test harness put it there). */
u8 hi_present(void)
{
    const u8 *p = (const u8 *)HIRAM;
    u8 port = PEEK(0x01), ok;
    POKE(0x01, 0x35);                   /* it's under the KERNAL: look at the RAM */
    ok = p[0] == 0x50 && p[1] == 0x51 && p[2] == 0x48 && p[3] == 0x49 && p[4] == 1;
    POKE(0x01, port);
    return ok;
}

u8 load_hi(void)
{
    disk_file("pq.hi");
    load_file();
    return hi_present();
}

/* PQ.HI carries the sprite art and tunes (landing on the not-yet-used screen)
 * and the charset (landing on BSS): move them under the I/O chips, then clear
 * BSS. Runs with interrupts off, before anything has used BSS. */
extern u8 _HICHR_LOAD__[], _HICHR_RUN__[], _HICHR_SIZE__[];
extern u8 _HISPR_LOAD__[], _HISPR_RUN__[], _HISPR_SIZE__[];
extern u8 _BSS_RUN__[], _BSS_SIZE__[];
void unpack_hi(void)
{
    u8 port = PEEK(0x01);
    POKE(0x01, 0x34);                   /* RAM everywhere */
    memcpy(_HICHR_RUN__, _HICHR_LOAD__, (u16)_HICHR_SIZE__);
    memset(_HICHR_RUN__ + (u16)_HICHR_SIZE__, 0, 2048 - (u16)_HICHR_SIZE__);
    memcpy(_HISPR_RUN__, _HISPR_LOAD__, (u16)_HISPR_SIZE__);
    memset(_BSS_RUN__, 0, (u16)_BSS_SIZE__);
    POKE(0x01, port);
}
#pragma code-name (pop)

/* ---------- overlays ---------- */

#pragma bss-name (pop)

/* after any other disk call, the drive code may be gone: put it back */
static void fast_ready(void)
{
    if (fast != 2) return;
    fast = 0;
    disk_file("pq.drv");                /* (into the overlay window, about to be reloaded anyway) */
    if (!disk_op(OP_LOADHI)) { drive_install(); fast = 1; }
}

static u8 cur_ovl;

/* make sure overlay `id` (file PQ.OVid) is in the window */
void ovl(u8 id)
{
    u8 err, y;
    const u8 *w = (const u8 *)OVL_START;
    if (cur_ovl == id) return;
    cur_ovl = 0;
    y = split_mode == 1 ? MSG_ROW + MSG_ROWS - 2 : 23;  /* in the world: the message panel */
    for (;;) {
        fast_ready();
        if (id < 10) { disk_file("pq.ov0"); err = id; }   /* PQ.OV1 .. PQ.OV20: the last digit */
        else if (id < 20) { disk_file("pq.ov10"); err = id - 10; }
        else { disk_file("pq.ov20"); err = id - 20; }
        disk_name[disk_namelen - 1] += err;
        put_str(32, y + 1, "Loading", GREY);
        err = load_file();
        put_str(32, y + 1, "       ", GREY);
        if (!err && w[0] == 0x4F && w[1] == id) {
            cur_ovl = id;
#ifdef LOADTIME
            ++load_count;
#endif
            return;
        }
        /* keep asking: the game can't go on without it */
        sb_reset(); sb_str("Couldn't load PQ.OV"); sb_num(id); sb_str(" - check the disk, then press fire.");
        clear_rows(y, y + 1);
        wrap(sb, y, 2, RED);
        wait_fire();
        clear_rows(y, y + 1);
    }
}

/* rogue-like: a fallen hero's save goes with them */
void erase_save(void)
{
    disk_file("s0:pq.save");
    disk_op(OP_CMD);
}
