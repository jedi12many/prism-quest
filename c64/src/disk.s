; Disk access through the KERNAL -- the game normally runs with the ROMs
; banked out (its variables, C stack and graphics live in the RAM under the
; KERNAL), so this routine switches the KERNAL in, calls it, and switches it
; back out. It touches nothing but its own data (below) and the hardware stack,
; so it is safe while the KERNAL hides $E000-$FFFF from the CPU.
;
; If interrupts were on, they stay on: the frame interrupt keeps the split
; screen steady, reached through the KERNAL's $0314 vector (rain.c sets it).
; The sprites -- hero and rain -- are off meanwhile: their DMA steals cycles
; the KERNAL's serial timing needs (loads stall or corrupt bytes with them on).
;
;   u8 __fastcall__ disk_op(u8 op);
;     op 0  SAVE   disk_name -> file, data disk_start..disk_end (exclusive)
;     op 1  LOAD   file disk_name -> disk_start (secondary address 0)
;     op 3  LOAD   file disk_name -> the address in its header (secondary address 1)
;     op 2  CMD    send disk_name as a DOS command on channel 15
;     op 4  SEND   open channel 15 with disk_sendlen bytes from DISK_CMD as
;                  its name: a DOS command (the fast loader's M-W and M-E:
;                  fast.s); no status read
;     op 5  CLOSE  close channel 15 again (after an M-E: once its drive code
;                  is done). Always close what SEND opened: a command channel
;                  left open makes the DOS run its old command again
;   Every other op then reads the drive's error channel into disk_status --
;   and, as the DOS may have used its buffers, marks the fast loader's drive
;   code as gone (fast = 2: fast.s puts it back before the next fast load).
;   Returns 0 if the KERNAL call succeeded, else its error code
;   (5 = device not present, 4 = file not found, ...).

        .export _disk_op, _disk_dev, _disk_name, _disk_namelen
        .export _disk_start, _disk_end, _disk_status
        .export _disk_sendlen, _fast
        .import _rain_mask, _irq_hold, _split_mode, _music_hold

SETLFS  = $FFBA
SETNAM  = $FFBD
OPEN    = $FFC0
CLOSE   = $FFC3
CHKIN   = $FFC6
CLRCHN  = $FFCC
CHRIN   = $FFCF
LOAD    = $FFD5
SAVE    = $FFD8
DISK_CMD = $CFC0                ; the fast loader's commands: the overlay window's
                                ; tail, which an overlay load is about to replace
READST  = $FFB7
PTR     = $FB                   ; KERNAL-free zero page for SAVE's start pointer

        .data
_disk_dev:      .byte 8
_disk_namelen:  .byte 0
_disk_name:     .res 20, 0
_disk_start:    .word 0
_disk_end:      .word 0
_disk_status:   .res 40, 0      ; "00, OK,00,00" from the drive, 0-terminated
_disk_sendlen:  .byte 0
_fast:          .byte 0         ; the fast loader: 0 none, 1 ready, 2 its drive
                                ; code needs putting back (save.c)
result:         .byte 0
op:             .byte 0
loadsa:         .byte 0
saved01:        .byte 0
savedspr:       .byte 0
savedmask:      .byte 0
savedptr:       .word 0

        .code
_disk_op:
        sta op
        tax
        php
        sei
        lda $01
        sta saved01
        lda _rain_mask          ; sprites off (the interrupt would turn the
        sta savedmask           ; rain back on)
        lda $D015
        sta savedspr
        lda #0
        sta _rain_mask
        sta $D015
        lda #1                  ; the music waits (its timing would stumble),
        sta _music_hold         ; silent
        lda #0
        sta $D418
        lda _split_mode         ; the world's split screen can't be kept up
        cmp #1
        bne :+                  ; (the KERNAL holds interrupts off): blank
        jsr border              ; the screen meanwhile
        lda #$0B
        sta $D011
        lda #1
        sta _irq_hold
:
        lda PTR
        sta savedptr
        lda PTR+1
        sta savedptr+1
        lda #$36                ; KERNAL + I/O in, BASIC out
        sta $01
        pla                     ; were interrupts on when we came in?
        pha
        and #$04
        bne :+
        cli
:       lda #0
        sta result
        sta _disk_status

        ldy #0
        cpx #1
        beq do_load
        ldy #1
        cpx #3
        beq do_load
        cpx #2
        beq do_cmd
        cpx #4
        beq do_send
        cpx #5
        bne do_save
        jmp do_close

do_save:
        lda #1
        ldx _disk_dev
        ldy #1                  ; secondary address 1: save
        jsr SETLFS
        jsr setname
        lda _disk_start
        sta PTR
        lda _disk_start+1
        sta PTR+1
        lda #PTR
        ldx _disk_end
        ldy _disk_end+1
        jsr SAVE
        bcc status
        sta result
        jmp done

do_load:
        sty loadsa              ; 0: load to X/Y, 1: to the file's own address
        lda #1
        ldx _disk_dev
        ldy loadsa
        jsr SETLFS
        jsr setname
        lda #0                  ; 0 = load (not verify)
        ldx _disk_start
        ldy _disk_start+1
        jsr LOAD
        bcc status
        sta result
        jmp done

do_cmd:
        lda #15
        ldx _disk_dev
        ldy #15
        jsr SETLFS
        jsr setname
        jsr OPEN
        bcc :+
        sta result
        lda #15
        jsr CLOSE
        jmp done
:       lda #15
        jsr CLOSE
        jmp status

do_send:                        ; the DOS runs the command at the end of the OPEN
        lda #15
        ldx _disk_dev
        ldy #15
        jsr SETLFS
        lda _disk_sendlen
        ldx #<DISK_CMD
        ldy #>DISK_CMD
        jsr SETNAM
        jsr OPEN
        jmp done2
do_close:
        lda #15
        jsr CLOSE
        jmp done2

status:                         ; read the drive's error channel
        lda #0
        jsr SETNAM
        lda #15
        ldx _disk_dev
        ldy #15
        jsr SETLFS
        jsr OPEN
        bcs closest
        ldx #15
        jsr CHKIN
        bcs closest
        ldy #0
@rd:    jsr READST
        bne @end
        jsr CHRIN
        cmp #13
        beq @end
        sta _disk_status,y
        iny
        cpy #39
        bcc @rd
@end:   lda #0
        sta _disk_status,y
closest:
        jsr CLRCHN
        lda #15
        jsr CLOSE

done:
        lda _fast               ; the DOS may have used the drive code's buffers
        cmp #1
        bne done2
        inc _fast
done2:
        sei
        lda #$7F                ; the KERNAL may have re-armed the CIA timer
        sta $DC0D               ; interrupt; the game only uses the raster one
        lda $DC0D
        lda savedptr
        sta PTR
        lda savedptr+1
        sta PTR+1
        lda saved01
        sta $01
        lda savedmask
        sta _rain_mask
        lda _irq_hold
        beq :+
        jsr border
        lda #$1B                ; screen back on, status panel settings
        sta $D011
        lda #0
        sta _irq_hold
:
        lda savedspr
        sta $D015
        lda #$0F
        sta $D418
        lda #0
        sta _music_hold
        plp
        lda result
        ldx #0
        rts

; wait for the bottom border (line 256+), where changing $D011 is safe
border: bit $D011
        bpl border
        rts

setname:
        lda _disk_namelen
        ldx #<_disk_name
        ldy #>_disk_name
        jmp SETNAM
