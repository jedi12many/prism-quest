; The music player: two SID voices (1 the melody, 2 the bass), ticked once a
; frame by the frame interrupt (rainirq.s), so the tempo holds whatever the
; game is busy with. Voice 3 belongs to the sound effects and the thunder.
;
; The tunes (musicdata.s, built from tools/music.js) live under the I/O
; chips with the battle portraits: the player banks I/O out to read them and
; back in to play them.
;
;   void __fastcall__ music_play(u8 tune);
;   void music_stop(void);
;   u8 music_hold;      nonzero: frozen (disk_op sets it; the KERNAL holds
;                       interrupts off, which would garble the timing)
;   music_tick          from the interrupt, with I/O in; uses A, X, Y

        .export _music_play, _music_stop, _music_hold, music_tick
        .import mus_freq_lo, mus_freq_hi, mus_pat_lo, mus_pat_hi, mus_songs

SID     = $D400

        .segment "EARLYBSS"     ; (disk_op sets it before BSS is ready)
_music_hold:    .res 1

        .bss                    ; (zeroed at startup: not playing)
playing:        .res 1
tempo:          .res 1
v_cnt:          .res 2          ; frames left of the note
v_olo:          .res 2          ; the order list
v_ohi:          .res 2
v_opos:         .res 2
v_plo:          .res 2          ; the pattern playing
v_phi:          .res 2
v_ppos:         .res 2
v_tr:           .res 2          ; transpose
v_wave:         .res 2
v_pwlo:         .res 2          ; pulse width (swept on pulse voices)
v_pwhi:         .res 2
ad:             .res 2
sr:             .res 2
; what next_event decided, for writing with I/O back in
e_note:         .res 1          ; 0 rest, 62 hold, else a note
e_flo:          .res 1
e_fhi:          .res 1
shift:          .res 1
save01:         .res 1
odd:            .res 1


; The once-a-frame part runs from just below the overlay window
; (prismquest.cfg), loaded there with the main file.
        .segment "MUSCODE"
sidoff:         .byte 0, 7
steps:          .byte 1, 2, 4, 8

; ---------- once a frame ----------
music_tick:
        lda playing
        beq @out
        lda _music_hold
        bne @out
        ldx #1
@voice: dec v_cnt,x
        bne :+
        jsr next_event
        jsr play_event
:       dex
        bpl @voice
        lda odd                 ; every other frame, if the melody's a pulse,
        eor #1                  ; sweep its width $400-$BFF
        sta odd
        beq @out
        lda v_wave
        and #$40
        beq @out
        lda v_pwlo
        clc
        adc #48
        sta v_pwlo
        sta SID+2
        lda v_pwhi
        adc #0
        cmp #$0C
        bcc :+
        lda #$04
:       sta v_pwhi
        sta SID+3
@out:   rts

; ---------- the next note of voice X (reads the tune: I/O out) ----------
next_event:
        lda $01
        sta save01
        lda #$34
        sta $01
@again: lda v_plo,x
        sta @rp+1
        lda v_phi,x
        sta @rp+2
        ldy v_ppos,x
@rp:    lda $FFFF,y
        cmp #$FF
        bne @event
        ; the pattern's done: on along the order list
@order: lda v_olo,x
        sta @ro+1
        lda v_ohi,x
        sta @ro+2
        ldy v_opos,x
@ro:    lda $FFFF,y
        inc v_opos,x
        cmp #$FF
        bne :+
        lda #0                  ; the end: round again
        sta v_opos,x
        beq @order
:       cmp #$80
        bcc @pat
        sec                     ; a transpose: $80 + 32 + t
        sbc #$A0
        sta v_tr,x
        jmp @order
@pat:   tay
        lda mus_pat_lo,y
        sta v_plo,x
        lda mus_pat_hi,y
        sta v_phi,x
        lda #0
        sta v_ppos,x
        beq @again

@event: inc v_ppos,x
        pha
        rol a                   ; steps code (bits 7-6) -> 0-3
        rol a
        rol a
        and #3
        tay
        lda steps,y
        tay
        lda #0
:       clc                     ; x tempo
        adc tempo
        dey
        bne :-
        sta v_cnt,x
        pla
        and #$3F
        sta e_note
        beq @done               ; a rest
        cmp #62
        beq @done               ; a hold
        clc
        adc v_tr,x
        sec
        sbc #1                  ; 0 = A1
        ldy #0                  ; octaves below the table's
:       cmp #48
        bcs :+
        adc #12
        iny
        bne :-
:       sbc #48
        cmp #12
        bcc :+
        lda #11                 ; (out of range)
:       sty shift
        tay
        lda mus_freq_lo,y
        sta e_flo
        lda mus_freq_hi,y
        sta e_fhi
        ldy shift               ; halve it for each octave down
        beq @done
:       lsr e_fhi
        ror e_flo
        dey
        bne :-
@done:  lda save01
        sta $01
        rts

; ---------- play it (I/O in) ----------
play_event:
        ldy sidoff,x
        lda e_note
        beq @rest
        cmp #62
        beq @hold
        lda e_flo
        sta SID,y
        lda e_fhi
        sta SID+1,y
        lda v_wave,x            ; gate off, then on: the envelope starts again
        sta SID+4,y
        ora #1
        sta SID+4,y
@hold:  rts
@rest:  lda v_wave,x
        sta SID+4,y
        rts

; Starting and stopping run from the tape buffer (prismquest.cfg): main()
; copies them there from the second screen, where they load.
        .segment "CASSCODE"
endmark:        .byte $FF       ; an empty pattern: start on the order list

; ---------- void __fastcall__ music_play(u8 tune) ----------
_music_play:
        php
        sei
        asl a
        tay
        lda $01
        sta save01
        lda #$34                ; (the tunes are under I/O)
        sta $01
        lda mus_songs,y
        sta @rd+1
        lda mus_songs+1,y
        sta @rd+2
        ldy #0
        jsr @rd                 ; tempo
        sta tempo
        ldx #0
@voice: iny
        jsr @rd
        sta v_wave,x
        iny
        jsr @rd
        sta ad,x
        iny
        jsr @rd
        sta sr,x
        iny
        jsr @rd
        sta v_pwhi,x
        iny
        jsr @rd
        sta v_olo,x
        iny
        jsr @rd
        sta v_ohi,x
        lda #0
        sta v_opos,x
        sta v_ppos,x
        sta v_pwlo,x
        sta v_tr,x
        lda #<endmark
        sta v_plo,x
        lda #>endmark
        sta v_phi,x
        lda #1
        sta v_cnt,x
        inx
        cpx #2
        bne @voice
        lda save01
        sta $01
        ldx #1                  ; voices 1-2: silent, then their instruments
:       ldy sidoff,x
        lda #0
        sta SID+4,y
        lda ad,x
        sta SID+5,y
        lda sr,x
        sta SID+6,y
        lda #0
        sta SID+2,y
        lda v_pwhi,x
        sta SID+3,y
        dex
        bpl :-
        lda #1
        sta playing
        plp
        rts
@rd:    lda $FFFF,y
        rts

; ---------- void music_stop(void) ----------
_music_stop:
        lda #0
        sta playing
        sta SID+4               ; both voices' gates off
        sta SID+7+4
        rts
