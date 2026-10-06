; The frame interrupt: the rain (a raster-interrupt sprite multiplexer) and,
; in the world, the split screen that lets the map scroll smoothly.
;
; Rain: sprites 3-7 (double-wide) are reused seven times down the screen: just
; before each 21-line band starts, the interrupt moves all five down into it.
; Each sprite image holds a cluster of slanted streaks; seven animation frames
; move them down 3 pixels a frame and wrap, so stacked bands read as
; continuous rain -- 35 sprite images, ~245 drops, from 5 hardware sprites.
; Every band and column runs its own phase so there's no visible grid.
;
; Three modes:
;   plain (title)  rain over rows 1-19 of an ordinary text screen
;   world          rows 0-4 are a fixed status panel (hi-res text on black).
;                  At line 90 the interrupt switches to the map's settings --
;                  fine scroll x/y, 38 columns, 24 rows, which screen buffer,
;                  the land's background colour -- and masks lines 90-98 black
;                  (ECM + multicolour is an invalid mode: the VIC draws black)
;                  to hide the map's moving top edge. Line 250 switches back.
;                  The rain falls over the map, lines 99-245.
;   quiet          no rain, no split: one interrupt at line 250
; All three tick the music (music.s) once a frame.
;
; Changing the vertical scroll mid-screen is touchy: a bad line must never
; start in the middle of a raster line. The status panel ends on line 90, so
; the new scroll value is written during line 90, and the scroller only ever
; asks for odd values (3, 5, 7, 1: the map starts 0, 2, 4 or 6 lines down),
; none of which is line 90's -- 2 px steps, so that's all it needs.
;
;
; The disk routines can hold interrupts off for a while, so the handler can
; run late. It must never change the y scroll in the middle of a raster line
; that could then become a bad line (the VIC starts fetching mid-line: "VSP",
; which crashes some real C64s), so if it's late it leaves the y scroll alone
; and the map just looks wrong for a frame. While disk_op runs (irq_hold) --
; the KERNAL keeps interrupts off for long stretches as it waits on the drive
; -- the screen is blanked and nothing here touches $D011 at all.
;
; Sprites 0-2 (the hero) are never touched. The handler banks I/O in itself,
; so it's safe when it interrupts code running with $01 = $34, and _kirq lets
; it keep running through the KERNAL's IRQ vector while disk_op has the
; KERNAL banked in (so the screen holds still while files load).
;
; (Named rainirq.s, not rain.s: cl65 turns rain.c into a temporary rain.s.)
;
;   void rain_on(u8 mask);   which of sprites 3-7 rain (bit 3 = sprite 3 ...)
;   void rain_off(void);
;   void split_on(void);     the world's split screen (rain stays as it was)
;   void irq_stop(void);     everything off, plain text-screen registers
;   rain_irq / kirq          the handler, via $FFFE / via the KERNAL's $0314

        .export _rain_on, _rain_off, _rain_irq, _rain_mask, _kirq
        .export _split_on, _irq_stop
        .export _sc_d011, _sc_d016, _sc_d018, _map_bg, _vbl, _irq_hold
        .export _split_mode
        .export _cq, _cq_head, _cq_n, _cq_ready, _cq_swaps, _cq_done, _cq_stalls
        .import _col_shift, _sc_front
        .import music_tick

NB      = 7                     ; bands
PTR0    = $78                   ; sprite pointer of frame 0: $DE00 in bank 3
SPRPTR  = $E3F8                 ; sprite pointers for the screen at $E000
SPRPTR2 = $C3F8                 ; ...and for the map's second screen at $C000
EV_SPLIT  = 0                   ; world events (the band counter's values)
EV_UNMASK = 1
EV_BOTTOM = 8
QLINE   = 250                   ; quiet mode's line

        .bss
band:           .res 1          ; plain: band 0-6; world: event 0-8
anim:           .res 1
slate:          .res 1          ; this frame's split ran late

        .data
_rain_mask:     .byte 0         ; (not BSS: disk_op saves it while PQ.HI loads over BSS)
; the map's register values, set by the scroller (world.c) once a frame
_sc_d011:       .byte $17       ; y scroll, 24 rows, screen on (ECM added at the split)
_sc_d016:       .byte $17       ; x scroll, 38 columns, multicolour
_sc_d018:       .byte $84       ; which screen holds the map ($E000 or $C000)
_map_bg:        .byte 5         ; the land's background colour (lightning: white)
_vbl:           .byte 0         ; world frames shown (the scroller's tests check it)
_split_mode:                    ; (C's name for it)
mode:           .byte 0         ; 0 plain, 1 world, 2 quiet (just the music)
_irq_hold:      .byte 0         ; disk_op is running: the screen is blanked (below)

; The camera queue. The world's main loop queues the hero's walk a few frames
; ahead -- per frame: the map's y and x scroll, the hero sprite's x (low byte,
; then 7 if past 255) and y, and whether the map crosses a character boundary
; that frame (dir + 1: the screens swap). At the bottom of each frame this
; takes the next one: so the map glides at a steady 50 frames a second even
; when the main loop has a slow frame. A swap needs its back screen built
; (cq_ready); if it isn't yet, the picture holds for a frame (cq_stalls).
CQ_LEN  = 16
_cq:            .res CQ_LEN * 6
_cq_head:       .byte 0         ; byte offset of the next entry
_cq_n:          .byte 0         ; entries queued
_cq_ready:      .byte 0         ; the back screen for the next swap is built
_cq_swaps:      .byte 0         ; swaps done (the main loop counts them off)
_cq_done:       .byte 0         ; entries shown
_cq_stalls:     .byte 0

        .rodata
; plain: raster line of each band's interrupt (band 0 sets up in the top
; border), and the line each band starts on: 21 lines apart, over rows 1-19
irqline:        .byte 40, 76, 97, 118, 139, 160, 181
top:            .byte 58, 79, 100, 121, 142, 163, 184
; world: the events' lines (split, unmask, bands 1-6, bottom), and the bands
wline:          .byte 88, 96, 117, 138, 159, 180, 201, 222, 250
wtop:           .byte 99, 120, 141, 162, 183, 204, 225
; per band x column: phase offset into the 7 animation frames
phase:          .byte 0,3,5,1,6,  4,0,2,5,1,  2,6,4,0,3,  5,1,3,6,2
                .byte 1,4,6,2,0,  6,2,0,3,5,  3,5,1,4,6
bandx5:         .byte 0, 5, 10, 15, 20, 25, 30
ptrtab:         .byte PTR0+0, PTR0+1, PTR0+2, PTR0+3, PTR0+4, PTR0+5, PTR0+6
                .byte PTR0+0, PTR0+1, PTR0+2, PTR0+3, PTR0+4, PTR0+5, PTR0+6

        .code
_kirq:                          ; via $0314: the KERNAL has pushed A, X, Y
        jsr body
        jmp out
_rain_irq:
        pha
        txa
        pha
        tya
        pha
        jsr body
out:    pla
        tay
        pla
        tax
        pla
        rti

body:   lda $01
        pha
        lda #$35                ; I/O in, whatever the interrupted code had
        sta $01
        lda $D019
        and #$01
        bne raster
        lda $DC0D               ; a CIA interrupt (the KERNAL may arm one): ack
        jmp done
raster: sta $D019               ; acknowledge the raster interrupt
        lda mode
        bne :+
        jmp plain
:       cmp #1
        beq world
        jsr music_tick          ; quiet: just the music, once a frame
        lda #QLINE
        sta $D012
        jmp done

; ---------- world mode ----------
world:  ldx band
        bne @notsplit
        ; EV_SPLIT: wait for line 90, then switch to the map's settings
        lda _sc_d011
        ora #$40                ; + ECM: invalid mode, black, until line 98
        ldx _irq_hold
        bne @hold
        ldx #90
:       cpx $D012               ; wait for line 90 (never "== 90": arriving at
        beq :+                  ; the very end of it, that would wait a frame)
        bcs :-
:       ldx $D012
        cpx #92                 ; line 92 or later (93 might be a bad line for
        bcs @late               ; the new scroll): leave it alone this frame
        sta $D011               ; line 90, 91 or 92: none can turn bad mid-line
        lda #0
        beq @split
@late:  lda #$5B                ; late or holding: just the mask, y scroll as it was
        sta $D011
        lda #1
@split: sta slate
@hold:
        lda _map_bg
        sta $D021
        lda _sc_d016
        sta $D016
        lda _sc_d018
        sta $D018
        lda #EV_UNMASK          ; (quick: the unmask interrupt is due at 94)
        jmp @next

@notsplit:
        cpx #EV_UNMASK
        bne @notunmask
        ; EV_UNMASK: drop the mask at the very end of line 98, in the border
        lda _irq_hold
        bne @held
        lda slate
        bne @late2              ; the split ran late: leave the y scroll be
        lda _sc_d011
        ldx #97
:       cpx $D012               ; until line 98 (polled: ~cycle 3-9; again,
        bcs :-                  ; never wait for "== 98")
        ldx $D012
        cpx #99
        bcs @now                ; (late: unmask straight away)
        ldx #9
:       dex
        bne :-                  ; 44 cycles
@now:   sta $D011               ; cycle ~61-67: line 98's right border
        jmp @held
@late2: lda $D011               ; late: unmask, but keep the y scroll
        and #$BF
        sta $D011
@held:
        lda #2
        jmp @next

@notunmask:
        cpx #EV_BOTTOM
        beq @bottom
        ; EV 2-7: rain bands 1-6
        dex                     ; event 2 -> band 1
        lda wtop,x
        jsr move
        ldx band
        inx
        txa
        jmp @next

@bottom:                        ; below the map: back to the status panel's settings
        lda _irq_hold
        bne :+
        lda #$1B
        sta $D011
:
        lda #$18
        sta $D016
        lda #$84
        sta $D018
        lda #0
        sta $D021
        inc _vbl
        jsr camera
        jsr nextanim
        jsr music_tick
        jsr claim               ; rain sprites for the next frame, band 0
        ldx #0
        lda wtop
        jsr move
        lda #EV_SPLIT
@next:  sta band
        tax
        lda wline,x
        sta $D012
        jmp done

; ---------- plain mode (the title) ----------
plain:  ldx band
        bne @move
        jsr claim
        ldx #0
@move:  lda top,x
        jsr move
        ldx band
        inx
        cpx #NB
        bcc @n
        jsr nextanim
        jsr music_tick
        ldx #0
@n:     stx band
        lda irqline,x
        sta $D012

done:   pla
        sta $01
        rts

; (re)claim sprites 3-7 for this frame
claim:  lda $D015
        and #$07
        ora _rain_mask
        sta $D015
        lda $D01D               ; double width
        ora #$F8
        sta $D01D
        lda $D017               ; normal height
        and #$07
        sta $D017
        lda $D01B               ; in front of the scenery
        and #$07
        sta $D01B
        lda $D01C               ; hi-res
        and #$07
        sta $D01C
        lda $D010               ; sprite 7 sits past x = 255
        and #$07
        ora #$80
        sta $D010
        lda #32
        sta $D006
        lda #96
        sta $D008
        lda #160
        sta $D00A
        lda #224
        sta $D00C
        lda #32                 ; 288 - 256
        sta $D00E
        lda #14                 ; light blue rain
        sta $D02A
        sta $D02B
        sta $D02C
        sta $D02D
        sta $D02E
        rts

; move all five rain sprites to line A, band X (animation frames per column)
move:   sta $D007
        sta $D009
        sta $D00B
        sta $D00D
        sta $D00F
        ldy bandx5,x
        .repeat 5, c
        ldx phase+c,y
        .ident(.sprintf("pt%d", c)) = * + 1
        lda ptrtab,x            ; (nextanim points it at ptrtab + anim)
        sta SPRPTR+3+c
        sta SPRPTR2+3+c
        .endrepeat
        rts

; the next frame from the camera queue (in the bottom border)
camera: lda _cq_n
        beq @d018
        ldx _cq_head
        lda _cq+5,x             ; a swap?
        beq @apply
        ldy _cq_ready
        bne :+
        inc _cq_stalls          ; its back screen isn't built yet: hold
        rts
:       sec
        sbc #1
        jsr _col_shift          ; colour RAM: ~8,000 cycles, done by line ~70
        lda _sc_front
        eor #1
        sta _sc_front
        lda #0
        sta _cq_ready
        inc _cq_swaps
        ldx _cq_head
@apply: lda _cq,x
        sta _sc_d011
        lda _cq+1,x
        sta _sc_d016
        lda _cq+2,x             ; the hero: sprites 0-2, stacked
        sta $D000
        sta $D002
        sta $D004
        lda _cq+4,x
        sta $D001
        sta $D003
        sta $D005
        lda $D010
        and #$F8
        ora _cq+3,x
        sta $D010
        txa
        clc
        adc #6
        cmp #CQ_LEN * 6
        bcc :+
        lda #0
:       sta _cq_head
        dec _cq_n
        inc _cq_done
@d018:  lda #$84                ; the map's screen
        ldx _sc_front
        beq :+
        lda #$04
:       sta _sc_d018
        rts

nextanim:
        ldy anim
        iny
        cpy #7
        bcc :+
        ldy #0
:       sty anim
        tya
        clc
        adc #<ptrtab
        .repeat 5, c
        sta .ident(.sprintf("pt%d", c))
        .endrepeat
        lda #>ptrtab
        adc #0
        .repeat 5, c
        sta .ident(.sprintf("pt%d", c)) + 1
        .endrepeat
        rts

; ---------- switching ----------
_rain_on:
        php
        sei
        sta _rain_mask
        lda mode
        cmp #1
        beq :+                  ; the world's chain is already running
        lda #0
        sta mode
        sta band
        lda #40
        jsr start
:       plp
        rts

_rain_off:
        lda mode
        beq _irq_stop
        php
        sei
        lda #0
        sta _rain_mask
        jsr release
        plp
        rts

_split_on:
        php
        sei
        lda #1
        sta mode
        lda #EV_SPLIT
        sta band
        lda wline
        jsr start
        plp
        rts

_irq_stop:
        php
        sei
        lda #0                  ; quiet: one interrupt a frame, for the music
        sta _rain_mask
        sta $D021
        lda #2
        sta mode
        lda #QLINE
        sta $D012
        lda #$01
        sta $D019
        sta $D01A
        jsr release
:       bit $D011               ; wait for the bottom border (line 256+): a new
        bpl :-                  ; y scroll mid-screen could start a bad line mid-line
        lda #$1B                ; 25 rows, y scroll 3, no ECM
        sta $D011
        lda #$18
        sta $D016
        lda #$84
        sta $D018
        plp
        rts

; raster interrupt on, first at line A
start:  sta $D012
        lda #$1B                ; (bit 7 = raster compare bit 8 = 0)
        sta $D011
        lda #$01
        sta $D019
        sta $D01A
        rts

; hand sprites 3-7 back
release:
        lda $D015
        and #$07
        sta $D015
        lda $D01D
        and #$07
        sta $D01D
        rts
