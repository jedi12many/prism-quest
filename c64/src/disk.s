; Disk access through the KERNAL -- the game normally runs with the ROMs
; banked out (its variables, C stack and graphics live in the RAM under the
; KERNAL), so this routine switches the KERNAL in, calls it, and switches it
; back out. It touches nothing but its own data (below) and the hardware stack,
; so it is safe while the KERNAL hides $E000-$FFFF from the CPU.
;
;   u8 __fastcall__ disk_op(u8 op);
;     op 0  SAVE   disk_name -> file, data disk_start..disk_end (exclusive)
;     op 1  LOAD   file disk_name -> disk_start (secondary address 0)
;     op 3  LOAD   file disk_name -> the address in its header (secondary address 1)
;     op 2  CMD    send disk_name as a DOS command on channel 15
;   Every op then reads the drive's error channel into disk_status.
;   Returns 0 if the KERNAL call succeeded, else its error code
;   (5 = device not present, 4 = file not found, ...).

        .export _disk_op, _disk_dev, _disk_name, _disk_namelen
        .export _disk_start, _disk_end, _disk_status

SETLFS  = $FFBA
SETNAM  = $FFBD
OPEN    = $FFC0
CLOSE   = $FFC3
CHKIN   = $FFC6
CLRCHN  = $FFCC
CHRIN   = $FFCF
LOAD    = $FFD5
SAVE    = $FFD8
READST  = $FFB7
PTR     = $FB                   ; KERNAL-free zero page for SAVE's start pointer

        .data
_disk_dev:      .byte 8
_disk_namelen:  .byte 0
_disk_name:     .res 20, 0
_disk_start:    .word 0
_disk_end:      .word 0
_disk_status:   .res 40, 0      ; "00, OK,00,00" from the drive, 0-terminated
result:         .byte 0
loadsa:         .byte 0
saved01:        .byte 0
savedspr:       .byte 0
savedptr:       .word 0

        .code
_disk_op:
        tax                     ; op
        php
        sei
        lda $01
        sta saved01
        lda $D015               ; sprites off: their DMA steals cycles the
        sta savedspr            ; KERNAL's serial timing needs (loads stall
        lda #0                  ; or corrupt bytes with sprites on)
        sta $D015
        lda PTR
        sta savedptr
        lda PTR+1
        sta savedptr+1
        lda #$36                ; KERNAL + I/O in, BASIC out
        sta $01
        lda #0
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
        lda #$7F                ; the KERNAL may have re-armed the CIA timer
        sta $DC0D               ; interrupt; the game only uses the raster one
        lda $DC0D
        lda savedptr
        sta PTR
        lda savedptr+1
        sta PTR+1
        lda saved01
        sta $01
        lda savedspr
        sta $D015
        plp
        lda result
        ldx #0
        rts

setname:
        lda _disk_namelen
        ldx #<_disk_name
        ldy #>_disk_name
        jmp SETNAM
