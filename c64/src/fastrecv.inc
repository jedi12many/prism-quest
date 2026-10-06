; The fast loader's C64 side: receives a file from the drive code
; (drive.s) once its M-E has gone out, into the address in the file's
; header. The boot file (boot.s) copies it into three free pieces of low
; RAM -- $0200, $02A7 and the tape buffer's tail, $03E4 -- where the game
; calls it too (fast.s).
;
; Fully handshaked: it toggles ATN for every two bits and reads them a fixed
; time later, which the drive always beats. So interrupts, sprites and bad
; lines can hold it up as they like: they only make it wait longer.
;
;   fr_recv ($02A7): A = 0 loaded, 1 the drive couldn't (no such file, a read
;   error), 2 no drive code answered (the caller falls back to the KERNAL).
;   Uses A, X, Y.

        .segment "CORE2"        ; $02A7-$02FE
fr_recv:
        ldx #0                  ; wait for busy: CLK and DATA both held
        ldy #0                  ; (about a second, then give up)
@det:   lda $DD00
        and #$C0
        beq @found
        dex
        bne @det
        dey
        bne @det
        lda #2
        rts
@found: jmp fr_go

fr_err: lda #1
        .byte $2C               ; (skip the next)
fr_end: lda #0
        pha
        jsr fr_tog              ; the last toggle: the drive lets go
        jsr fr_dly
        lda $DD00
        and #$08
        beq :+
        jsr fr_tog              ; leave ATN free
:       pla
        rts

; four toggles, two bits after each: DATA the higher, CLK the lower
fr_byte:
        ldx #4
:       lda $DD00
        eor #$08
        sta $DD00
        jsr fr_dly
        lda $DD00
        asl a
        rol fr_val
        asl a
        rol fr_val
        dex
        bne :-
        lda fr_val
        rts

        .segment "CORE3"        ; $03E4-$03FB
fr_tog: lda $DD00               ; (keeps the VIC bank bits)
        eor #$08
        sta $DD00
        rts

; 42 cycles from a toggle's write to the read. The drive answers a toggle
; within 19 cycles once it's waiting, and it's waiting again 77 after its last
; answer: so an early toggle is answered at most 96 after the one before.
; fr_byte reads 115 after the one before (73 + 42), so 19 to spare; at a byte
; boundary, 24 (the drive takes 110 there, the C64 158).
fr_dly: ldy #5
:       dey
        bne :-
        rts

fr_stage:       .byte 0
fr_cnt:         .byte 0
fr_val:         .byte 0

        .segment "CORE1"        ; $0200-$0258
fr_go:  lda #0
        sta fr_stage
@blk:   jsr fr_tog              ; go ahead (the drive reads a sector)
        jsr fr_dly
@rdy:   lda $DD00               ; until both lines are free: ready
        and #$C0
        cmp #$C0
        bne @rdy
        jsr fr_dly              ; (the drive readies its first two bits)
        jsr fr_dly
        jsr fr_byte             ; a count, 0 at the end, $FF: failed
        bne :+
        jmp fr_end
:       cmp #$FF
        bne :+
        jmp fr_err
:       sta fr_cnt
@dat:   jsr fr_byte
        ldx fr_stage
        cpx #2
        bcs @st
        sta @st+1,x             ; the file's first two bytes: where it goes
        inc fr_stage
        bne @nx                 ; (always)
@st:    sta $FFFF
        inc @st+1
        bne @nx
        inc @st+2
@nx:    dec fr_cnt
        bne @dat
        beq @blk                ; (always)
