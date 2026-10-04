/* Saving and loading the hero on disk (device 8 by default, or whichever
 * drive the game was loaded from). The KERNAL calls live in disk.s. */
#include <string.h>
#include "game.h"

extern u8 __fastcall__ disk_op(u8 op);
extern u8 disk_dev, disk_namelen;
extern char disk_name[20];
extern u16 disk_start, disk_end;
extern char disk_status[40];

enum { OP_SAVE, OP_LOAD, OP_CMD, OP_LOADHI };

#define SAVE_VERSION 3                  /* 3: camp buildings */
/* "PQ", version, the Player struct, the play clock, a checksum. The buffer
 * is LOWSCRATCH ($0400), below the KERNAL where its SAVE/LOAD can reach it;
 * the map view shares it (it's rebuilt after every save or load). */
#define SAVE_LEN (3 + sizeof(Player) + 2 + 1)
#define savebuf ((u8 *)LOWSCRATCH)

/* The startup functions (disk_init .. unpack_hi) keep their locals -- static,
 * under -Cl -- out of BSS: PQ.HI loads its tail on top of BSS, so anything
 * written there before unpack_hi has copied it away would corrupt it. */
#pragma bss-name (push, "EARLYBSS")
static void set_name(const char *s)
{
    disk_namelen = strlen(s);
    memcpy(disk_name, s, disk_namelen);
}

static u8 checksum(void)
{
    u16 i;                              /* the save is longer than 255 bytes */
    u8 c = 0x5A;
    for (i = 0; i < SAVE_LEN - 1; ++i) c = (c << 1 | c >> 7) ^ savebuf[i];
    return c;
}

/* "00, OK,00,00" and "01, FILES SCRATCHED,01,00" are fine */
static u8 drive_ok(void) { return disk_status[0] == '0' && disk_status[1] <= '1'; }

static void report(const char *what, u8 err)
{
    sb_reset(); sb_str(what);
    if (err == 5) sb_str(" No disk drive found.");
    else if (err == 4) sb_str(" No saved hero on this disk.");
    else if (err) { sb_str(" Disk error "); sb_num(err); sb_str("."); }
    else { sb_str(" Drive says: "); sb_str(disk_status); }
}

#pragma code-name (push, "INITCODE")      /* (startup only: see main) */
void disk_init(void)
{
    u8 d = PEEK(0xBA);                  /* the KERNAL's last-used device */
    disk_dev = (d >= 8 && d <= 30) ? d : 8;
}
#pragma code-name (pop)

u8 save_game(void)
{
    u8 err;
    savebuf[0] = 'P'; savebuf[1] = 'Q'; savebuf[2] = SAVE_VERSION;
    memcpy(savebuf + 3, &P, sizeof(Player));
    savebuf[3 + sizeof(Player)] = seconds & 0xFF;
    savebuf[4 + sizeof(Player)] = seconds >> 8;
    savebuf[SAVE_LEN - 1] = checksum();

    msg("Saving your hero to disk...");
    set_name("s0:pq.save");             /* replace any older save */
    err = disk_op(OP_CMD);
    if (!err) {
        set_name("pq.save");
        disk_start = (u16)savebuf;
        disk_end = (u16)savebuf + SAVE_LEN;
        err = disk_op(OP_SAVE);
    }
    if (err || !drive_ok()) {
        report("Couldn't save.", err);
        msg(sb);
        return 0;
    }
    msg("Hero saved to disk.");
    return 1;
}

/* returns 1 and fills P on success; otherwise leaves a reason in sb */
u8 load_game(void)
{
    u8 err;
    set_name("pq.save");
    disk_start = (u16)savebuf;
    memset(savebuf, 0, SAVE_LEN);
    err = disk_op(OP_LOAD);
    if (err) { report("Couldn't load.", err); return 0; }
    if (savebuf[0] != 'P' || savebuf[1] != 'Q' || savebuf[2] != SAVE_VERSION
        || savebuf[SAVE_LEN - 1] != checksum()) {
        sb_reset(); sb_str("That save is from another version, or damaged.");
        return 0;
    }
    memcpy(&P, savebuf + 3, sizeof(Player));
    seconds = savebuf[3 + sizeof(Player)] | (savebuf[4 + sizeof(Player)] << 8);
    calc_stats();
    return 1;
}

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
    set_name("pq.hi");
    disk_op(OP_LOADHI);
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
        if (id < 10) { set_name("pq.ov0"); err = id; }   /* PQ.OV1 .. PQ.OV11 */
        else { set_name("pq.ov10"); err = id - 10; }
        disk_name[disk_namelen - 1] += err;
        put_str(32, y + 1, "Loading", GREY);
        err = disk_op(OP_LOADHI);
        put_str(32, y + 1, "       ", GREY);
        if (!err && w[0] == 0x4F && w[1] == id) { cur_ovl = id; return; }
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
    set_name("s0:pq.save");
    disk_op(OP_CMD);
}
