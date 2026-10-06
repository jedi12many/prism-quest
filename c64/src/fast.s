; The fast loader, the game's side. The boot file (boot.s) has put the
; receiver in low RAM (fastrecv.inc, at $02A7) and the drive code in the 1541,
; and said so in $02FF (save.c reads it into `fast`). Any other disk call may
; let the DOS reuse the drive code's buffers: then `fast` = 2, and
; drive_install puts it back from PQ.DRV (loaded into the overlay window).
;
;   u8 fast_load(void)       disk_name -> the address in its header.
;                            0 done; 1 the drive couldn't; 2 no answer
;   void drive_install(void) PQ.DRV, loaded at the overlay window, sends its
;                            drive code up to the drive's $0400 (drvfile.s)

        .export _fast_load, _drive_install
        .import _disk_op, _disk_name, _disk_namelen, _disk_sendlen

FR_RECV = $02A7
CMD     = $CFC0                 ; (disk.s DISK_CMD: the overlay window's tail)
OVL     = $C540                 ; the overlay window
OP_SEND = 4

        .code
_fast_load:
        ldx #4                  ; "M-E" $0400, then the name, padded to 16
:       lda me,x
        sta CMD,x
        dex
        bpl :-
        inx
:       lda #$A0
        cpx _disk_namelen
        bcs :+
        lda _disk_name,x
:       sta CMD+5,x
        inx
        cpx #16
        bne :--
        lda #21
        jsr send
        jsr FR_RECV
        ldx #0
        rts

_drive_install:                 ; (PQ.DRV's own routine sends it up)
        lda #<send
        ldx #>send
        jmp OVL

send:   sta _disk_sendlen
        sty savey
        lda #OP_SEND
        jsr _disk_op
        ldy savey
        rts

me:     .byte $4D, $2D, $45, $00, $04  ; "M-E" $0400 (as bytes: -t c64 would make
                                ; PETSCII of a string, which the DOS rejects)
savey:  .byte 0
