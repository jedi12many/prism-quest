; The fast loader's drive side: runs in the 1541 at $0400 (its buffer 1),
; uploaded with M-W and started with M-E. The file name rides in the M-E
; command itself: the DOS leaves the whole command in its buffer at $0200,
; so the name (16 bytes, padded with $A0) is at $0205.
;
; It finds the file in the directory and sends it to the C64 a sector at a
; time, through its own job queue entry (buffer 0, $0300). The C64 clocks
; every two bits with ATN, so the transfer is fully handshaked: the C64 can
; be held up by interrupts, sprites or bad lines and nothing is lost.
;
;   lines (as the C64 sees them): CLK and DATA both held = busy (reading a
;   sector); both free = ready. Then, for each byte, four ATN toggles: after
;   each, two bits: DATA = the higher, CLK = the lower, held = 0.
;   A sector: a count byte (1-254, then that many bytes), 0 for the end of
;   the file or $FF for an error; after it, one more ATN toggle (the C64 has
;   read it all: busy again). At the end, ATN is left free and the drive
;   goes back to the DOS.
;
; ATNA (VIA1 PB4) follows ATN, or the hardware would pull DATA low itself
; whenever ATN is held. The ATN interrupt is off meanwhile: no DOS. It ends
; through the DOS's own end of a command, as the DOS's commands do.

VIA1PB  = $1800
VIA1PA  = $1801
VIA1IER = $180E
JOB0    = $00                   ; job code / result for buffer 0
TRK0    = $06
SEC0    = $07
BUF0    = $0300
NAME    = $0205                 ; in the M-E command
ENDCMD  = $C194                 ; the DOS's end of a command (all its own
                                ; commands end there: an M-E that just
                                ; returns leaves its command to run again)

BUSY    = $0A                   ; CLK and DATA held

; variables: the track/sector slots of job queue entries 1-3 ($08-$0D), which
; nothing uses while this runs (the DOS sets them afresh for every job). Not
; entry 4's, $0E/$0F: its buffer, $0700, holds the BAM, and the DOS writes it
; back to the track and sector there (18/0) when it saves.
ent     = $08
atnexp  = $09                   ; ATN after the next toggle ($80: held;
                                ; ATNA, $10, matches it)
outv    = $0A
sb      = $0B
pairs   = $0C
count   = $0D

        .segment "DRIVE"
start:  sei
        lda #$02                ; no ATN interrupt for now
        sta VIA1IER
        lda #0
        sta atnexp
        lda #BUSY
        sta VIA1PB
        jsr waitout             ; the C64's go-ahead (stays busy)

        ldx #18                 ; the directory
        ldy #1
dir:    jsr read
        bcs fail
        lda #0
entry:  sta ent
        tax
        lda BUF0+2,x
        cmp #$82                ; a closed PRG
        bne next
        ldy #0
cmpn:   lda BUF0+5,x
        cmp NAME,y
        bne next
        inx
        iny
        cpy #16
        bne cmpn
        ldx ent
        ldy BUF0+4,x
        lda BUF0+3,x
        tax
        bne file                ; (always: a track is never 0)
next:   lda ent
        clc
        adc #32
        bne entry
        ldx BUF0                ; the next directory sector
        beq fail
        ldy BUF0+1
        bne dir                 ; (sector 0 is never in the directory chain)

file:   jsr read                ; X/Y: track/sector
        bcs fail
        ldx #254
        lda BUF0
        bne :+
        ldx BUF0+1              ; the last sector: bytes 2 .. its link byte
        dex
:       stx count
        txa
        jsr sendhdr
        ldy #2
data:   lda BUF0,y
        jsr sendbyte
        iny
        dec count
        bne data
        lda #BUSY
        jsr waitout             ; the C64 has it all
        ldx BUF0
        beq done
        ldy BUF0+1
        jmp file

done:   lda #0
        .byte $2C               ; (skip the next)
fail:   lda #$FF
        jsr sendhdr             ; the end, or an error
        lda #0
        jsr waitout             ; the last toggle: let go
        lda atnexp
        beq exit
        lda #0
        jsr waitout             ; ATN held: wait for the C64 to free it
exit:   lda VIA1PA              ; forget the ATN edges we caused (the lines
        lda #$82                ; are free: the last toggle saw to that);
                                ; the DOS listens again
        sta VIA1IER
        cli
        jmp ENDCMD              ; ("00, OK")

; read track X sector Y into buffer 0: carry set on an error
read:   stx TRK0
        sty SEC0
        lda #$80                ; READ
        sta JOB0
        cli                     ; (the job runs in the drive's interrupt)
:       lda JOB0
        bmi :-
        sei
        cmp #2                  ; 1: OK
        rts

; a sector's ready (both lines free), then send its first byte
sendhdr:
        pha
        lda atnexp              ; (ATNA)
        lsr a
        lsr a
        lsr a
        sta VIA1PB
        pla
; send A: four pairs, the highest first. Keeps Y.
sendbyte:
        sta sb
        lda #4
        sta pairs
:       lda #0
        asl sb
        rol a
        asl sb
        rol a
        tax
        lda enc,x
        jsr waitout
        dec pairs
        bne :-
        rts

; wait for ATN to toggle, then put A (CLK/DATA bits) on the lines. Keeps Y.
waitout:
        sta outv
        lda atnexp
        eor #$80
        sta atnexp
        lsr a                   ; (ATNA)
        lsr a
        lsr a
        ora outv
        tax
:       lda VIA1PB
        eor atnexp
        bmi :-
        stx VIA1PB
        rts

enc:    .byte BUSY, $02, $08, $00   ; two bits -> the lines (a 0 bit is held)
