; The rain: a raster-interrupt sprite multiplexer.
;
; Sprites 3-7 (double-wide) are reused seven times down the map: just before
; each 21-line band starts, the interrupt moves all five down into it. Each
; sprite image holds a cluster of slanted streaks; seven animation frames move
; them down 3 pixels a frame and wrap, so stacked bands read as continuous
; rain -- 35 sprite images, ~245 drops, from 5 hardware sprites. Every band
; and column runs its own phase so there's no visible grid.
;
; Sprites 0-2 (the hero) are never touched. The handler banks I/O in itself,
; so it's safe even when it interrupts code running with $01 = $34.
;
; (Named rainirq.s, not rain.s: cl65 turns rain.c into a temporary rain.s.)
;
;   void rain_on(u8 mask);   which of sprites 3-7 rain (bit 3 = sprite 3 ...)
;   void rain_off(void);
;   rain_irq                 the handler (rain.c points $FFFE at it)

        .export _rain_on, _rain_off, _rain_irq, _rain_mask

NB      = 7                     ; bands
PTR0    = $75                   ; sprite pointer of frame 0: $DD40 in bank 3
SPRPTR  = $E3F8                 ; sprite pointers for the screen at $E000

        .bss
_rain_mask:     .res 1
band:           .res 1
anim:           .res 1

        .rodata
; raster line of each band's interrupt (band 0 sets up in the top border),
; and the line each band starts on: 21 lines apart, over the map (rows 1-19)
irqline:        .byte 40, 76, 97, 118, 139, 160, 181
top:            .byte 58, 79, 100, 121, 142, 163, 184
; per band x column: phase offset into the 7 animation frames
phase:          .byte 0,3,5,1,6,  4,0,2,5,1,  2,6,4,0,3,  5,1,3,6,2
                .byte 1,4,6,2,0,  6,2,0,3,5,  3,5,1,4,6
bandx5:         .byte 0, 5, 10, 15, 20, 25, 30
ptrtab:         .byte PTR0+0, PTR0+1, PTR0+2, PTR0+3, PTR0+4, PTR0+5, PTR0+6
                .byte PTR0+0, PTR0+1, PTR0+2, PTR0+3, PTR0+4, PTR0+5, PTR0+6

        .code
_rain_irq:
        pha
        txa
        pha
        tya
        pha
        lda $01
        pha
        lda #$35                ; I/O in, whatever the interrupted code had
        sta $01
        lda #$01
        sta $D019               ; acknowledge the raster interrupt
        lda $DC0D               ; and any CIA timer interrupt (belt and braces)

        ldx band
        bne @move
        ; top border: (re)claim sprites 3-7 for this frame
        lda $D015
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

@move:  lda top,x               ; move all five into this band
        sta $D007
        sta $D009
        sta $D00B
        sta $D00D
        sta $D00F
        ldy bandx5,x            ; animation frame per sprite
        .repeat 5, c
        lda anim
        clc
        adc phase+c,y
        tax
        lda ptrtab,x
        sta SPRPTR+3+c
        .endrepeat

        ldx band
        inx
        cpx #NB
        bcc @next
        ldx #0                  ; frame done: next animation frame
        ldy anim
        iny
        cpy #7
        bcc :+
        ldy #0
:       sty anim
@next:  stx band
        lda irqline,x
        sta $D012

        pla
        sta $01
        pla
        tay
        pla
        tax
        pla
        rti

_rain_on:
        sta _rain_mask
        php
        sei
        lda #0
        sta band
        lda #40
        sta $D012
        lda $D011
        and #$7F                ; raster compare bit 8 = 0
        sta $D011
        lda #$01
        sta $D019
        sta $D01A               ; raster interrupt on
        plp
        rts

_rain_off:
        php
        sei
        lda #0
        sta $D01A               ; raster interrupt off
        sta _rain_mask
        lda #$01
        sta $D019
        lda $D015               ; hand sprites 3-7 back
        and #$07
        sta $D015
        lda $D01D
        and #$07
        sta $D01D
        plp
        rts
