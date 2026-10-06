; The keyboard matrix, read in one go (~250 cycles; in C it was ~1,500):
; kb[column] has a bit set for each key down in that column.
;
;   void kb_scan(void);

        .export _kb_scan, _kb

        .data
_kb:    .res 8

        .code
_kb_scan:
        ldx #0
        lda #$FE                ; column 0
@col:   sta $DC00
        ldy $DC01
        pha
        tya
        eor #$FF
        sta _kb,x
        pla
        sec
        rol a                   ; next column
        inx
        cpx #8
        bne @col
        lda #$FF
        sta $DC00
        rts

