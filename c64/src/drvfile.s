; PQ.DRV: the fast loader's drive code (drive.s) with the routine that sends
; it up. The game loads it into the overlay window with the KERNAL and calls
; $C540, A/X = its routine that sends a command (fast.s), whenever a disk call
; may have let the DOS reuse the drive code's buffers.

CMD     = $CFC0                 ; (the overlay window's tail: fast.s, disk.s)

        .segment "LOADADDR"
        .word $C540

        .segment "CODE"
install:
        sta @send+1
        stx @send+2
        ldy #0                  ; 32 bytes at a time: "M-W" lo hi 32 data
@chunk: lda #$4D                ; "M-W" (bytes: the DOS wants plain ASCII)
        sta CMD
        lda #$2D
        sta CMD+1
        lda #$57
        sta CMD+2
        sty CMD+3               ; to $0400 + Y
        lda #$04
        sta CMD+4
        lda #32
        sta CMD+5
        ldx #0
:       lda drive,y
        sta CMD+6,x
        iny
        inx
        cpx #32
        bne :-
        lda #38
@send:  jsr $FFFF               ; (keeps Y)
        tya
        bne @chunk              ; (Y wraps after the eighth)
        rts

drive:  .incbin "build/drive.bin"
