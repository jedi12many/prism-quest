; The boot file, PRISMQUEST: the first on the disk, so LOAD"*",8,1 and RUN
; (or a drag and drop onto VICE) starts it. It's small, so the KERNAL's slow
; load is short. Then:
;   - the fast loader's C64 side (fastrecv.inc) goes to low RAM, where the
;     game calls it too (and where its music code, at $0334, leaves it be);
;   - the drive code (drive.s) goes up to the 1541 with M-W;
;   - the game, PQ.MAIN, comes in through the fast loader -- or, if the
;     drive doesn't answer (VICE's virtual drive, an SD2IEC...), the KERNAL;
;   - $02FF tells the game which: $A5 = the fast loader is in place.
; It runs from the overlay window ($C540), which the game's file stops short of.

CHROUT  = $FFD2
SETLFS  = $FFBA
SETNAM  = $FFBD
LOAD    = $FFD5
LISTEN  = $FFB1
SECOND  = $FF93
CIOUT   = $FFA8
UNLSN   = $FFAE
DEV     = $BA                   ; the KERNAL's last-used device
MAGIC   = $02FF
GAME    = $080D                 ; PQ.MAIN's start (its SYS 2061)
PTR     = $FB

        .import __PAYLOAD_LOAD__, __PAYLOAD_RUN__, __PAYLOAD_SIZE__
        .import __CORE1_LOAD__, __CORE1_RUN__, __CORE1_SIZE__
        .import __CORE2_LOAD__, __CORE2_RUN__, __CORE2_SIZE__
        .import __CORE3_LOAD__, __CORE3_RUN__, __CORE3_SIZE__

        .segment "LOADADDR"
        .word $0801

        .segment "STUB"
        .word @next, 10
        .byte $9E, "2061", 0    ; 10 SYS 2061
@next:  .word 0
        ldx #<__CORE1_SIZE__    ; the low-RAM pieces, to the byte (the
:       lda __CORE1_LOAD__-1,x  ; KERNAL's tables lie between them)
        sta __CORE1_RUN__-1,x
        dex
        bne :-
        ldx #<__CORE2_SIZE__
:       lda __CORE2_LOAD__-1,x
        sta __CORE2_RUN__-1,x
        dex
        bne :-
        ldx #<__CORE3_SIZE__
:       lda __CORE3_LOAD__-1,x
        sta __CORE3_RUN__-1,x
        dex
        bne :-
        lda #<__PAYLOAD_LOAD__  ; and the rest, whole pages (past its end
        sta PTR                 ; is free)
        lda #>__PAYLOAD_LOAD__
        sta PTR+1
        lda #<__PAYLOAD_RUN__
        sta PTR+2
        lda #>__PAYLOAD_RUN__
        sta PTR+3
        ldx #>(__PAYLOAD_SIZE__ + 255)
        ldy #0
:       lda (PTR),y
        sta (PTR+2),y
        iny
        bne :-
        inc PTR+1
        inc PTR+3
        dex
        bne :-
        jmp boot

        .segment "PAYLOAD"
boot:   ldy #0
:       lda hello,y
        beq :+
        jsr CHROUT
        iny
        bne :-
:       lda DEV
        cmp #8
        bcs :+
        lda #8
        sta DEV
:
        ldy #0                  ; the drive code, 32 bytes a time
@up:    sty off
        lda #'M'
        sta cmd
        lda #'-'
        sta cmd+1
        lda #'W'
        sta cmd+2
        sty cmd+3               ; at $0400 + off
        lda #$04
        sta cmd+4
        lda #32
        sta cmd+5
        ldx #0
:       lda drive,y
        sta cmd+6,x
        iny
        inx
        cpx #32
        bne :-
        lda #38
        jsr send
        ldy off
        tya
        clc
        adc #32
        tay
        bne @up

        ldx #20                 ; "M-E" $0400, and the name
:       lda me,x
        sta cmd,x
        dex
        bpl :-
        lda #21
        jsr send
.ifdef DEBUGSTOP
        lda #0                  ; (debug: time it in jiffies)
        sta $A1
        sta $A2
.endif
        jsr fr_recv
.ifdef DEBUGSTOP
        tax
        lda #5                  ; (debug: green = fast, red = not; the time; stop)
        cpx #0
        beq :+
        lda #2
:       sta $D020
        lda $A1
        jsr hex
        lda $A2
        jsr hex
        jmp *
hex:    pha
        lsr a
        lsr a
        lsr a
        lsr a
        jsr :+
        pla
        and #$0F
:       cmp #10
        bcc :+
        adc #6
:       adc #$30
        jmp CHROUT
.endif
        tax
        bne kernal
        lda #$A5
        sta MAGIC
        jmp GAME

kernal: lda #0                  ; no fast loader: the KERNAL's own load
        sta MAGIC
        lda #1
        ldx DEV
        ldy #1                  ; to the file's own address
        jsr SETLFS
        lda #7
        ldx #<(me+5)
        ldy #>(me+5)
        jsr SETNAM
        lda #0
        jsr LOAD
        bcs :+
        jmp GAME
:       ldy #0
:       lda missing,y
        beq :+
        jsr CHROUT
        iny
        bne :-
:       rts                     ; back to BASIC

; send cmd (A bytes) to the drive's command channel
send:   sta len
        lda DEV
        jsr LISTEN
        lda #$6F                ; channel 15
        jsr SECOND
        ldy #0
:       lda cmd,y
        jsr CIOUT
        iny
        cpy len
        bne :-
        jmp UNLSN

hello:  .byte $93, 5, 13, "PRISM QUEST: RAINYDAY", 13, 13, "LOADING...", 0
missing: .byte 13, "PQ.MAIN IS MISSING", 13, 0
me:     .byte "M-E", $00, $04, "PQ.MAIN"
        .res 9, $A0
off:    .byte 0
len:    .byte 0
cmd:    .res 38
drive:  .incbin "build/drive.bin"
        .res 256 - (* - drive), 0

        .include "fastrecv.inc"

        .assert fr_recv = $02A7, error, "the game calls fr_recv at $02A7"
