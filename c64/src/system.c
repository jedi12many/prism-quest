/* Hardware setup, input, rng, text, sound and sprites. No KERNAL calls:
 * the ROMs are banked out and the game drives the chips directly. */
#include <string.h>
#include "game.h"

u8 in_now, in_new;
static u8 in_prev;
u16 frame, seconds;
static u8 sec_frames;

static const u8 rti_op = 0x40;

#pragma code-name (push, "INITCODE")      /* (startup only: see main) */
void hw_init(void)
{
    __asm__("sei");
    POKE(0x00, 0x2F);                       /* CPU port direction (KERNAL default) */
    POKE(0x01, 0x35);                       /* RAM everywhere except I/O */
    POKE(0xDC0D, 0x7F); POKE(0xDD0D, 0x7F); /* silence the CIAs */
    __asm__("lda $dc0d");                   /* ...and acknowledge (cc65 drops a bare PEEK) */
    __asm__("lda $dd0d");
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
#pragma code-name (pop)

/* once a frame: as the beam enters the bottom border (watching for one exact
 * line could miss it under an interrupt) */
void wait_frame(void)
{
    extern volatile u8 vbl;
    u8 v;
    if (split_mode == 1) {                  /* the world: the frame interrupt's count */
        v = vbl;                            /* (its bottom-of-frame work can run */
        while (vbl == v) ;                  /* past line 256) */
    } else {
        while (PEEK(0xD011) & 0x80) ;
        while (!(PEEK(0xD011) & 0x80)) ;
    }
    ++frame;
    if (++sec_frames == 50) { sec_frames = 0; ++seconds; }
    sound_tick();
}

/* the keyboard matrix, read once per input_poll() (kb_scan, input.s):
 * bit set = key down */
extern u8 kb[8];
void kb_scan(void);
static u8 keys_prev[8];
static const u8 bitv[8] = { 1, 2, 4, 8, 16, 32, 64, 128 };
#define KEY(code) (kb[(code) >> 3] & (1 << ((code) & 7)))

u8 key_down(u8 code) { return kb[code >> 3] & bitv[code & 7]; }

/* down now, and wasn't at the last key_hit() for it */
u8 key_hit(u8 code)
{
    u8 col = code >> 3, bit = bitv[code & 7];
    if (kb[col] & bit) {
        if (keys_prev[col] & bit) return 0;
        keys_prev[col] |= bit;
        return 1;
    }
    keys_prev[col] &= ~bit;
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
    kb_scan();
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
    if (KEY(K_W)) j |= IN_UP;
    if (KEY(K_S)) j |= IN_DOWN;
    if (KEY(K_A)) j |= IN_LEFT;
    if (KEY(K_D)) j |= IN_RIGHT;
    if (KEY(K_SPACE) || KEY(K_RETURN)) j |= IN_FIRE;
    if (KEY(K_B)) j |= IN_BONK;
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
    irq_stop();                             /* every full-screen change stops the rain */
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

/* ---------- sound: effects on SID voice 3 (the music has 1 and 2) ---------- */
static u8 snd_t, snd_id, snd_wave;
static u16 snd_f;
static u8 thunder_t, cutoff;

static void voice(u16 f, u8 wave, u8 ad, u8 sr)
{
    thunder_t = 0;                          /* (an effect cuts the thunder short) */
    POKE(0xD417, 0x00); POKE(0xD418, 0x0F);
    POKE(0xD412, 0);
    POKE(0xD40E, f & 0xFF); POKE(0xD40F, f >> 8);
    POKE(0xD410, 0x00); POKE(0xD411, 0x08);
    POKE(0xD413, ad); POKE(0xD414, sr);
    snd_wave = wave;
    POKE(0xD412, wave | 1);
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

static u8 tune_now = TUNE_NONE;
void music(u8 tune)
{
#ifdef NOMUSIC
    return;                                 /* (tests: the scroller without it) */
#endif
    if (tune == tune_now) return;
    tune_now = tune;
    if (tune == TUNE_NONE) music_stop();
    else music_play(tune);
}

/* thunder, also on voice 3: a burst of noise rumbling down through the filter */
void thunder(void)
{
    snd_t = 0;
    POKE(0xD40E, 0x00); POKE(0xD40F, 0x05); /* low noise */
    POKE(0xD413, 0x0A); POKE(0xD414, 0x0B); /* instant crack, long decay and release */
    POKE(0xD417, 0xF4);                     /* resonant filter on voice 3 */
    cutoff = 0xFF;
    POKE(0xD416, cutoff);
    POKE(0xD418, 0x1F);                     /* low-pass, full volume */
    POKE(0xD412, 0x81);                     /* noise, gate on */
    thunder_t = 100;
}

void sound_tick(void)
{
    if (thunder_t) {
        --thunder_t;
        if (thunder_t == 85) POKE(0xD412, 0x80);   /* let it roll away */
        cutoff -= cutoff >> 5;
        POKE(0xD416, cutoff);
        if (!thunder_t) { POKE(0xD417, 0x00); POKE(0xD418, 0x0F); }
    }
    if (!snd_t) return;
    --snd_t;
    switch (snd_id) {
    case SFX_MINE: case SFX_SPELL: case SFX_GATE: snd_f += 0x0180; break;
    case SFX_WIN: case SFX_LEVEL: if (!(snd_t & 3)) snd_f += snd_f >> 2; break;
    case SFX_HURT: case SFX_DEATH: snd_f -= snd_f >> 4; break;
    }
    POKE(0xD40E, snd_f & 0xFF); POKE(0xD40F, snd_f >> 8);
    if (!snd_t) POKE(0xD412, snd_wave);     /* release */
}

/* ---------- sprites ---------- */

/* the hero in sprites 0-2: outline and detail (hi-res) over the multicolour
 * fill -- 24x21, drawn for the C64 (tools/heroes.js) */
void hero_sprites(u8 cls)
{
    u8 i;
    for (i = 0; i < 3; ++i) {
        memcpy(SPR_SLOT(i), hero_spr[cls][i], 63);
        SPR_PTR[i] = SPR_PTR2[i] = SPR_BASE + i;
        POKE(0xD027 + i, hero_col[cls][i]);
    }
    POKE(0xD025, hero_mc[cls][0]);
    POKE(0xD026, hero_mc[cls][1]);
    POKE(0xD01C, (PEEK(0xD01C) & 0xF8) | 0x04);
}

/* a battle portrait in sprites 3-6: hi-res layers, drawn for the C64
 * (tools/monsters.js). They're packed under the I/O chips as left halves (2
 * bytes a row, 6 bytes of mask first: which bytes aren't 0); this unpacks and
 * mirrors them into the map's second screen at $C000, idle during a battle.
 * Returns how many layers. */
#define MON_SLOT(n) ((u8 *)(0xC000 + (n) * 64))   /* sprite pointer n in bank 3 */
static u8 rev8(u8 b)
{
    u8 r = 0, i;
    for (i = 0; i < 8; ++i) { r = (r << 1) | (b & 1); b >>= 1; }
    return r;
}

u8 mon_sprites(u8 m)
{
    static u8 half[42];
    static const u8 bit[8] = { 0x80, 0x40, 0x20, 0x10, 0x08, 0x04, 0x02, 0x01 };
    const u8 *src = (m >= KEEPER_SPRITE0 ? keeper_art : mon_art) + mon_off[m];   /* (the keepers': resident) */
    u8 n = mon_nl[m], l, i, k, b0, b1;
    u8 *d;
    for (l = 0; l < n; ++l) {
        POKE(0x01, 0x34);                   /* (the art is under I/O; the keepers' isn't: RAM either way) */
        for (i = 0, k = 6; i < 42; ++i) half[i] = (src[i >> 3] & bit[i & 7]) ? src[k++] : 0;
        POKE(0x01, 0x35);
        src += k;
        d = MON_SLOT(l);
        for (i = 0; i < 42; i += 2) {
            b0 = half[i]; b1 = half[i + 1];
            d[0] = b0;
            d[1] = (b1 & 0xF0) | (rev8(b1) & 0x0F);
            d[2] = rev8(b0);
            d += 3;
        }
        SPR_PTR[3 + l] = l;
        POKE(0xD027 + 3 + l, mon_col[m][l]);
    }
    return n;
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
