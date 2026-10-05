/* Overlay part: saving and loading the hero (rides with the Village Ledger,
 * PQ.OV9; the doors save_game/load_game are in save.c). */
#include <string.h>
#include "game.h"

#pragma code-name("OVLEDGERCODE")
#pragma rodata-name("OVLEDGERDATA")
#pragma bss-name("OVLEDGERDATA")

extern u8 __fastcall__ disk_op(u8 op);
extern u16 disk_start, disk_end;
extern char disk_status[40];
void disk_file(const char *s);       /* save.c: the file name for the next disk_op */

enum { OP_SAVE, OP_LOAD, OP_CMD, OP_LOADHI };

#define SAVE_VERSION 8                  /* 3: camp buildings; 4: Prism Facets; 5: pacts; 6: champions below; 7: the Rainycastle; 8: deeds */
/* "PQ", version, the Player struct, the play clock, a checksum. The buffer
 * is LOWSCRATCH ($0400), below the KERNAL where its SAVE/LOAD can reach it;
 * the map view shares it (it's rebuilt after every save or load). */
#define SAVE_LEN (3 + sizeof(Player) + 2 + 1)
#define savebuf ((u8 *)LOWSCRATCH)

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

u8 do_save(void)
{
    u8 err;
    savebuf[0] = 'P'; savebuf[1] = 'Q'; savebuf[2] = SAVE_VERSION;
    memcpy(savebuf + 3, &P, sizeof(Player));
    savebuf[3 + sizeof(Player)] = seconds & 0xFF;
    savebuf[4 + sizeof(Player)] = seconds >> 8;
    savebuf[SAVE_LEN - 1] = checksum();

    msg("Saving your hero to disk...");
    disk_file("s0:pq.save");             /* replace any older save */
    err = disk_op(OP_CMD);
    if (!err) {
        disk_file("pq.save");
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
u8 do_load(void)
{
    u8 err;
    disk_file("pq.save");
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

