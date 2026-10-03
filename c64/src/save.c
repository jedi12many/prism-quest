/* Saving and loading the hero on disk (device 8 by default, or whichever
 * drive the game was loaded from). The KERNAL calls live in disk.s. */
#include <string.h>
#include "game.h"

extern u8 __fastcall__ disk_op(u8 op);
extern u8 disk_dev, disk_namelen;
extern char disk_name[20];
extern u16 disk_start, disk_end;
extern char disk_status[40];

enum { OP_SAVE, OP_LOAD, OP_CMD };

#define SAVE_VERSION 1
/* "PQ", version, the Player struct, the play clock, a checksum.
 * Initialised so it lands in the DATA segment, below the KERNAL, where the
 * KERNAL's own SAVE/LOAD can reach it. */
#define SAVE_LEN (3 + sizeof(Player) + 2 + 1)
static u8 savebuf[SAVE_LEN] = { 1 };

static void set_name(const char *s)
{
    disk_namelen = strlen(s);
    memcpy(disk_name, s, disk_namelen);
}

static u8 checksum(void)
{
    u8 i, c = 0x5A;
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

void disk_init(void)
{
    u8 d = PEEK(0xBA);                  /* the KERNAL's last-used device */
    disk_dev = (d >= 8 && d <= 30) ? d : 8;
}

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

/* rogue-like: a fallen hero's save goes with them */
void erase_save(void)
{
    set_name("s0:pq.save");
    disk_op(OP_CMD);
}
