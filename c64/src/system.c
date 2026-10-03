/* Hardware setup, input, rng, text, sound and sprites. No KERNAL calls:
 * the ROMs are banked out and the game drives the chips directly. */
#include <string.h>
#include "game.h"

u8 in_now, in_new;
static u8 in_prev;
u16 frame, seconds;
static u8 sec_frames;

static const u8 rti_op = 0x40;

void hw_init(void)
{
    __asm__("sei");
    POKE(0x00, 0x2F);                       /* CPU port direction (KERNAL default) */
    POKE(0x01, 0x35);                       /* RAM everywhere except I/O */
    POKE(0xDC0D, 0x7F); POKE(0xDD0D, 0x7F); /* silence the CIAs */
    PEEK(0xDC0D); PEEK(0xDD0D);
    POKE(0xD01A, 0x00); POKE(0xD019, 0xFF);
    *(u16 *)0xFFFA = (u16)&rti_op;          /* NMI (RESTORE) -> RTI */
    *(u16 *)0xFFFE = (u16)&rti_op;

    POKE(0xDC02, 0xFF); POKE(0xDC03, 0x00); /* keyboard matrix */
    POKE(0xDD02, PEEK(0xDD02) | 0x03);
    POKE(0xDD00, PEEK(0xDD00) & 0xFC);      /* VIC bank 3: $C000-$FFFF */

    POKE(0xD011, 0x0B);                     /* blank while we set up */
    /* the character set is already under the I/O chips (unpack_hi) */
    POKE(0xD018, 0x84);                     /* screen $E000, chars $D000 */
    POKE(0xD016, 0x18);                     /* multicolour text */
    POKE(0xD020, BLACK);
    POKE(0xD021, BLACK);
    POKE(0xD022, MC1_COLOR);
    POKE(0xD023, MC2_COLOR);
    POKE(0xD015, 0); POKE(0xD017, 0); POKE(0xD01D, 0);
    POKE(0xD01C, 0); POKE(0xD01B, 0); POKE(0xD010, 0);
    cls();
    POKE(0xD011, 0x1B);

    memset((void *)0xD400, 0, 25);          /* SID */
    POKE(0xD418, 0x0F);
}

void wait_frame(void)
{
    while (PEEK(0xD012) != 251) ;
    while (PEEK(0xD012) == 251) ;
    ++frame;
    if (++sec_frames == 50) { sec_frames = 0; ++seconds; }
    sound_tick();
}

u8 key_down(u8 code)
{
    u8 r;
    POKE(0xDC00, ~(1 << (code >> 3)));
    r = PEEK(0xDC01);
    POKE(0xDC00, 0xFF);
    return !(r & (1 << (code & 7)));
}

static u8 keys_prev[8];
u8 key_hit(u8 code)
{
    u8 col = code >> 3, bit = 1 << (code & 7), r;
    POKE(0xDC00, ~(1 << col));
    r = ~PEEK(0xDC01);
    POKE(0xDC00, 0xFF);
    if ((r & bit) && !(keys_prev[col] & bit)) { keys_prev[col] |= bit; return 1; }
    if (!(r & bit)) keys_prev[col] &= ~bit;
    return 0;
}

#ifdef AUTOPLAY
/* test builds replay a scripted joystick: pairs of (frames, mask), 0-terminated.
 * A script may also define autoplay_loop[], replayed forever afterwards. */
#define AUTOPLAY_INPUTS
#include AUTOPLAY
static const u8 *ap = autoplay;
static u8 ap_left;
#endif

void input_poll(void)
{
    u8 j;
    POKE(0xDC00, 0xFF);
    j = ~PEEK(0xDC00) & 0x1F;               /* joystick port 2 */
#ifdef AUTOPLAY
#ifdef AUTOPLAY_LOOP
    if (!*ap) ap = autoplay_loop;
#endif
    if (*ap) {
        if (!ap_left) ap_left = ap[0];
        j = ap[1];
        if (!--ap_left) ap += 2;
    }
#endif
    if (key_down(K_W)) j |= IN_UP;
    if (key_down(K_S)) j |= IN_DOWN;
    if (key_down(K_A)) j |= IN_LEFT;
    if (key_down(K_D)) j |= IN_RIGHT;
    if (key_down(K_SPACE) || key_down(K_RETURN)) j |= IN_FIRE;
    if (key_down(K_B)) j |= IN_BONK;
    in_now = j;
    in_new = j & ~in_prev;
    in_prev = j;
}

void wait_fire(void)
{
    do { wait_frame(); input_poll(); } while (!(in_new & IN_FIRE));
}

/* ---------- rng: 16-bit xorshift ---------- */
static u16 rs = 0xACE1;
void rng_seed(u16 s) { rs = s ? s : 0xACE1; }
u16 rnd16(void)
{
    rs ^= rs << 7;
    rs ^= rs >> 9;
    rs ^= rs << 8;
    return rs;
}
u16 rnd(u16 n) { return n ? rnd16() % n : 0; }
u8 chance(u8 pct) { return rnd(100) < pct; }

/* ---------- text ---------- */
u8 glyph(char c)
{
    u8 u = (u8)c;
    if (u >= 0xC1 && u <= 0xDA) return u - 0xC1 + 33;   /* PETSCII upper -> A.. */
    if (u >= 0x41 && u <= 0x5A) return u - 0x41 + 64;   /* PETSCII lower -> a.. */
    if (u >= 32 && u < 64) return u - 32;
    if (u == 0x5F || u == 0xA4) return '_' - 32;
    return 0;
}

void cls(void)
{
    POKE(0xD016, 0x08);                     /* plain hi-res text: all 16 colours */
    memset(SCREEN, 0, 1000);
    memset(COLORRAM, WHITE, 1000);
}

void clear_rows(u8 y0, u8 y1)
{
    u16 o = y0 * 40;
    u16 n = (y1 - y0 + 1) * 40;
    memset(SCREEN + o, 0, n);
    memset(COLORRAM + o, WHITE, n);
}

void put_ch(u8 x, u8 y, u8 ch, u8 col)
{
    u16 o = y * 40 + x;
    SCREEN[o] = ch;
    COLORRAM[o] = col;
}

void put_str(u8 x, u8 y, const char *s, u8 col)
{
    u8 *scr = SCREEN + y * 40 + x;
    u8 *cr = COLORRAM + y * 40 + x;
    while (*s && x < 40) { *scr++ = glyph(*s++); *cr++ = col; ++x; }
}

void put_num(u8 x, u8 y, u16 n, u8 col)
{
    sb_reset(); sb_num(n);
    put_str(x, y, sb, col);
}

void put_center(u8 y, const char *s, u8 col)
{
    put_str((40 - strlen(s)) / 2, y, s, col);
}

char sb[160];
static u8 sbn;
void sb_reset(void) { sbn = 0; sb[0] = 0; }
void sb_str(const char *s) { while (*s && sbn < sizeof(sb) - 1) sb[sbn++] = *s++; sb[sbn] = 0; }
void sb_num(u16 n)
{
    char t[6];
    u8 i = 0;
    do { t[i++] = '0' + n % 10; n /= 10; } while (n);
    while (i && sbn < sizeof(sb) - 1) sb[sbn++] = t[--i];
    sb[sbn] = 0;
}

/* word-wrap s into the box starting at row y0, at most `rows` lines.
 * Returns a pointer to the text that didn't fit. */
const char *wrap(const char *s, u8 y0, u8 rows, u8 col)
{
    u8 y, x, len;
    const char *w;
    for (y = 0; y < rows && *s; ++y) {
        x = 1;
        while (*s == ' ') ++s;
        while (*s) {
            if (*s == '\n') { ++s; break; }
            for (w = s, len = 0; *w && *w != ' ' && *w != '\n'; ++w) ++len;
            if (x + len > 39 && x > 1) break;
            while (s < w) { put_ch(x++, y0 + y, glyph(*s++), col); }
            if (*s == ' ') { ++s; ++x; }
        }
    }
    return s;
}

void msg_clear(void) { clear_rows(MSG_ROW, MSG_ROW + MSG_ROWS - 1); }

void msg(const char *s)
{
    msg_clear();
    wrap(s, MSG_ROW, MSG_ROWS, WHITE);
}

/* paged dialogue: name on the first line, text below; fire to continue */
void say(const char *name, const char *s)
{
    sfx(SFX_TALK);
    do {
        msg_clear();
        if (name) put_str(1, MSG_ROW, name, YELLOW);
        s = wrap(s, name ? MSG_ROW + 1 : MSG_ROW, name ? MSG_ROWS - 1 : MSG_ROWS, WHITE);
        put_ch(38, MSG_ROW + MSG_ROWS - 1, CH_POINTER, CYAN);
        wait_fire();
    } while (*s);
    msg_clear();
}

static u8 log_y0 = MSG_ROW, log_rows = MSG_ROWS, log_n;
void log_reset(u8 y0, u8 rows)
{
    log_y0 = y0; log_rows = rows; log_n = 0;
    clear_rows(y0, y0 + rows - 1);
}

void log_add(const char *s, u8 col)
{
    while (*s) {
        if (log_n == log_rows) {
            memmove(SCREEN + log_y0 * 40, SCREEN + (log_y0 + 1) * 40, (log_rows - 1) * 40);
            memmove(COLORRAM + log_y0 * 40, COLORRAM + (log_y0 + 1) * 40, (log_rows - 1) * 40);
            clear_rows(log_y0 + log_rows - 1, log_y0 + log_rows - 1);
            --log_n;
        }
        s = wrap(s, log_y0 + log_n, 1, col);
        ++log_n;
    }
}

/* ---------- sound: one SID voice of short effects ---------- */
static u8 snd_t, snd_id;
static u16 snd_f;

static void voice(u16 f, u8 wave, u8 ad, u8 sr)
{
    POKE(0xD404, 0);
    POKE(0xD400, f & 0xFF); POKE(0xD401, f >> 8);
    POKE(0xD402, 0x00); POKE(0xD403, 0x08);
    POKE(0xD405, ad); POKE(0xD406, sr);
    POKE(0xD404, wave | 1);
}

void sfx(u8 id)
{
    snd_id = id;
    switch (id) {
    case SFX_MINE:  snd_f = 0x3000; snd_t = 8;  voice(snd_f, 0x10, 0x09, 0x00); break;
    case SFX_BONK:  snd_f = 0x0800; snd_t = 6;  voice(snd_f, 0x80, 0x08, 0x00); break;
    case SFX_CRIT:  snd_f = 0x1800; snd_t = 10; voice(snd_f, 0x80, 0x09, 0x00); break;
    case SFX_HURT:  snd_f = 0x0A00; snd_t = 10; voice(snd_f, 0x20, 0x09, 0x00); break;
    case SFX_SPELL: snd_f = 0x1000; snd_t = 16; voice(snd_f, 0x10, 0x0A, 0x00); break;
    case SFX_WIN:   snd_f = 0x1800; snd_t = 24; voice(snd_f, 0x10, 0x0A, 0x00); break;
    case SFX_LEVEL: snd_f = 0x1400; snd_t = 32; voice(snd_f, 0x40, 0x0A, 0x00); break;
    case SFX_DEATH: snd_f = 0x1000; snd_t = 40; voice(snd_f, 0x20, 0x0C, 0x00); break;
    case SFX_GATE:  snd_f = 0x0C00; snd_t = 20; voice(snd_f, 0x10, 0x0A, 0x00); break;
    case SFX_TALK:  snd_f = 0x2400; snd_t = 3;  voice(snd_f, 0x10, 0x06, 0x00); break;
    }
}

void sound_tick(void)
{
    if (!snd_t) return;
    --snd_t;
    switch (snd_id) {
    case SFX_MINE: case SFX_SPELL: case SFX_GATE: snd_f += 0x0180; break;
    case SFX_WIN: case SFX_LEVEL: if (!(snd_t & 3)) snd_f += snd_f >> 2; break;
    case SFX_HURT: case SFX_DEATH: snd_f -= snd_f >> 4; break;
    }
    POKE(0xD400, snd_f & 0xFF); POKE(0xD401, snd_f >> 8);
    if (!snd_t) POKE(0xD404, PEEK(0xD404) & 0xFE);   /* release */
}

/* ---------- sprites ---------- */
/* sprite art is stored as 16x16 (2 bytes a row) under the I/O chips at
 * $D800; bank I/O out to read it, and pad it to the 24x21 slot */
void spr_load(u8 slot, const u8 *data)
{
    u8 *p = SPR_SLOT(slot);
    u8 y;
    POKE(0x01, 0x34);
    for (y = 0; y < 16; ++y) { p[0] = data[0]; p[1] = data[1]; p[2] = 0; p += 3; data += 2; }
    memset(p, 0, 15);
    POKE(0x01, 0x35);
}

void spr_pos(u8 n, u16 x, u8 y)
{
    POKE(0xD000 + n * 2, x & 0xFF);
    POKE(0xD001 + n * 2, y);
    if (x & 0x100) POKE(0xD010, PEEK(0xD010) | (1 << n));
    else POKE(0xD010, PEEK(0xD010) & ~(1 << n));
}

void spr_hide_all(void)
{
    POKE(0xD015, 0);
}
