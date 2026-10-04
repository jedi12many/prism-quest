; The scroller's heavy lifting: moving the map one character over.
;
; The map is 40 x 20 characters in screen rows 5-24. Its characters are
; double-buffered (screens $E000 and $C000): scr_copy() builds the back
; screen as a shifted copy of the front one while the front is on show, and
; the C side draws the one new column or row. Colour RAM can't be
; double-buffered, so col_shift() moves it in place during the vertical blank
; -- ~7,400 cycles, done before the beam reaches the map again -- and drops in
; the new edge colours from edge[].
;
; Every routine is unrolled down the rows (lda abs,x / sta abs,x: 9 cycles a
; byte) and walks the columns in the order that's safe for an in-place move.
; The screen copy comes in halves (~4,000 cycles each), a frame apart.
;
;   void __fastcall__ scr_copy(u8 dh);    dir * 2 + half; dir 0 left, 1 right,
;                                         2 up, 3 down (the way the map moves)
;   void __fastcall__ col_shift(u8 dir);
;   u8 sc_front;                          0: $E000 on show, 1: $C000

        .export _scr_copy, _col_shift, _sc_front, _edge

SA      = $E000 + 200           ; row 5 of each screen
SB      = $C000 + 200
CR      = $D800 + 200

        .data
_sc_front:      .byte 0

        .data                   ; (not .bss: that's full, under the KERNAL)
_edge:          .res 40         ; the new column's (20) or row's (40) colours

; dst[r][x] = src[r][x+1], x ascending: the map moves left (rows r0..r0+n-1)
.macro LEFT src, dst, r0, n
        .local loop
        ldx #0
loop:   .repeat n, r
        lda src+40*(r0+r)+1,x
        sta dst+40*(r0+r),x
        .endrepeat
        inx
        cpx #39
        bne loop
        rts
.endmacro

; dst[r][x+1] = src[r][x], x descending: the map moves right
.macro RIGHT src, dst, r0, n
        .local loop
        ldx #38
loop:   .repeat n, r
        lda src+40*(r0+r),x
        sta dst+40*(r0+r)+1,x
        .endrepeat
        dex
        bpl loop
        rts
.endmacro

; dst[r][x] = src[r+1][x], rows ascending: the map moves up (dst rows r0..)
.macro UP src, dst, r0, n
        .local loop
        ldx #39
loop:   .repeat n, r
        lda src+40*(r0+r+1),x
        sta dst+40*(r0+r),x
        .endrepeat
        dex
        bpl loop
        rts
.endmacro

; dst[r+1][x] = src[r][x], rows descending: the map moves down (src rows ..r0+n-1)
.macro DOWN src, dst, r0, n
        .local loop
        ldx #39
loop:   .repeat n, r
        lda src+40*(r0+n-1-r),x
        sta dst+40*(r0+n-r),x
        .endrepeat
        dex
        bpl loop
        rts
.endmacro

        .rodata
; scr_copy: [front][dir][half]
cptab:  .word ab_l0-1, ab_l1-1, ab_r0-1, ab_r1-1, ab_u0-1, ab_u1-1, ab_d0-1, ab_d1-1
        .word ba_l0-1, ba_l1-1, ba_r0-1, ba_r1-1, ba_u0-1, ba_u1-1, ba_d0-1, ba_d1-1
crtab:  .word cr_l-1, cr_r-1, cr_u-1, cr_d-1

        .code
; void __fastcall__ scr_copy(u8 dir_half): dir * 2 + half (top / bottom ten rows)
_scr_copy:
        ldx _sc_front
        beq :+
        ora #8
:       asl a
        tax
        lda cptab+1,x
        pha
        lda cptab,x
        pha
        rts

_col_shift:
        asl a
        tax
        lda crtab+1,x
        pha
        lda crtab,x
        pha
        rts

ab_l0:  LEFT  SA, SB, 0, 10
ab_l1:  LEFT  SA, SB, 10, 10
ab_r0:  RIGHT SA, SB, 0, 10
ab_r1:  RIGHT SA, SB, 10, 10
ab_u0:  UP    SA, SB, 0, 10
ab_u1:  UP    SA, SB, 10, 9
ab_d0:  DOWN  SA, SB, 9, 10     ; (dst rows 10-19)
ab_d1:  DOWN  SA, SB, 0, 9      ; (dst rows 1-9)
ba_l0:  LEFT  SB, SA, 0, 10
ba_l1:  LEFT  SB, SA, 10, 10
ba_r0:  RIGHT SB, SA, 0, 10
ba_r1:  RIGHT SB, SA, 10, 10
ba_u0:  UP    SB, SA, 0, 10
ba_u1:  UP    SB, SA, 10, 9
ba_d0:  DOWN  SB, SA, 9, 10
ba_d1:  DOWN  SB, SA, 0, 9

; colour RAM in place, then the new edge
cr_l:   jsr cl
        .repeat 20, r
        lda _edge+r
        sta CR+40*r+39
        .endrepeat
        rts
cr_r:   jsr cr
        .repeat 20, r
        lda _edge+r
        sta CR+40*r
        .endrepeat
        rts
cr_u:   jsr cu
        ldx #39
:       lda _edge,x
        sta CR+40*19,x
        dex
        bpl :-
        rts
cr_d:   jsr cd
        ldx #39
:       lda _edge,x
        sta CR,x
        dex
        bpl :-
        rts

cl:     LEFT  CR, CR, 0, 20
cr:     RIGHT CR, CR, 0, 20
cu:     UP    CR, CR, 0, 19
cd:     DOWN  CR, CR, 0, 19

; ---------- the cell loop of world.c's render() ----------
; Draws r_h rows of r_w cells from the composed tiles at vt/vc (LOWSCRATCH,
; 21 tiles a row; compose() put tile row 0 at biased world row r_cty).
;   r_wx0  world character column of the first cell   r_wy  ...row (+2)
;   r_scr  first character cell (rows 40 apart)        r_col first colour (rows r_cs apart)
; ~50 cycles a cell, where the C version took ~300.

        .export _r_wx0, _r_wy, _r_w, _r_h, _r_cs, _r_cty, _r_scr, _r_col, _render_cells
        .import _tile_color
        .importzp ptr1, ptr2

VT      = $0400                 ; LOWSCRATCH
VC      = $0400 + 21 * 11
TILE_BASE = 96

        .data
_r_wx0: .res 1
_r_wy:  .res 1
_r_w:   .res 1
_r_h:   .res 1
_r_cs:  .res 1
_r_cty: .res 1
_r_scr: .res 2
_r_col: .res 2
qy:     .res 1
qx:     .res 1
tq:     .res 1
xs:     .res 1

        .rodata
voff:   .byte 0, 21, 42, 63, 84, 105, 126, 147, 168, 189, 210

        .code
_render_cells:
        lda _r_scr
        sta ptr1
        lda _r_scr+1
        sta ptr1+1
        lda _r_col
        sta ptr2
        lda _r_col+1
        sta ptr2+1
@row:   lda _r_wy               ; this row's tiles
        lsr a
        sec
        sbc _r_cty
        tax
        lda voff,x
        clc
        adc #<VT
        sta @t+1
        lda #>VT
        adc #0
        sta @t+2
        lda voff,x
        clc
        adc #<VC
        sta @c+1
        lda #>VC
        adc #0
        sta @c+2
        lda _r_wy
        and #1
        asl a
        sta qy
        lda _r_wx0
        and #1
        sta qx
        ldx #0                  ; tile
        ldy #0                  ; cell
@cell:
@t:     lda $FFFF,x
        asl a
        asl a
        ora qy
        ora qx
        sta tq                  ; tile * 4 + quadrant
        clc
        adc #TILE_BASE
        sta (ptr1),y
@c:     lda $FFFF,x
        cmp #$FF
        bne :+
        stx xs                  ; the tile's own colours
        ldx tq
        lda _tile_color,x
        ldx xs
:       ora #8                  ; multicolour
        sta (ptr2),y
        lda qx                  ; right half done: next tile
        eor #1
        sta qx
        bne :+
        inx
:       iny
        cpy _r_w
        bne @cell
        lda ptr1
        clc
        adc #40
        sta ptr1
        bcc :+
        inc ptr1+1
:       lda ptr2
        clc
        adc _r_cs
        sta ptr2
        bcc :+
        inc ptr2+1
:       inc _r_wy
        dec _r_h
        beq :+
        jmp @row
:       rts

; ---------- world.c's compose(), for speed ----------
; The c_tw x c_th tiles from (c_tx, c_ty - 1) -- terrain, gates, nodes,
; villagers, monsters -- into vt (tile) and vc (colour, $FF = the tile's own).
; Off the map is forest.

        .export _c_tx, _c_ty, _c_tw, _c_th, _prism_col, _compose, _edge_tile
        .import _map, _mw, _mh, _map_id
        .import _gates, _ngates, _gate_t
        .import _nodes, _nnodes, _seconds, _mineral_color
        .import _npcs, _mobs, _nmobs, _mob_tile

MAP_W   = 34
        .include "assets.inc"   ; the tile numbers
PRISM   = 6                     ; PRISMATITE
NNPC_   = 6
MAXGATE_ = 12

        .data
_c_tx:  .res 1
_c_ty:  .res 1
_c_tw:  .res 1
_c_th:  .res 1
_prism_col: .res 1
_edge_tile: .res 1              ; what lies past the map's edge (trees; the castle's sky)
cy:     .res 1                  ; row
cwy:    .res 1                  ; its biased world row
cn:     .res 1                  ; map tiles on a row
ci:     .res 1                  ; entity counter
cx_:    .res 1

        .code
_compose:
        ; ptr1 = &map[c_ty - 1][c_tx] (rows are 34 = 32 + 2 bytes)
        lda _c_ty
        sec
        sbc #1
        sta ptr1
        lda #0
        sbc #0
        sta ptr1+1              ; (c_ty - 1) as 16 bits
        lda ptr1
        asl a
        sta ptr2
        lda ptr1+1
        rol a
        sta ptr2+1              ; x2
        ldx #4
:       asl ptr1
        rol ptr1+1
        dex
        bne :-                  ; x16
        asl ptr1
        rol ptr1+1              ; x32
        lda ptr1
        clc
        adc ptr2
        sta ptr1
        lda ptr1+1
        adc ptr2+1
        sta ptr1+1
        lda ptr1
        clc
        adc #<_map
        sta ptr1
        lda ptr1+1
        adc #>_map
        sta ptr1+1
        lda ptr1
        clc
        adc _c_tx
        sta ptr1
        bcc :+
        inc ptr1+1
:       ; map tiles a row: min(c_tw, mw - c_tx), or none
        lda _mw
        sec
        sbc _c_tx
        bcs :+
        lda #0
:       cmp _c_tw
        bcc :+
        lda _c_tw
:       sta cn
        lda #0
        sta cy
        lda _c_ty
        sta cwy

@row:   ldx cy
        lda voff,x
        tax                     ; X = offset of this row in vt/vc
        ldy #0
        lda cwy                 ; on the map?
        beq @trees
        cmp _mh
        beq :+
        bcs @trees
:       cpy cn
        beq @fill
        lda (ptr1),y
        sta VT,x
        lda #$FF
        sta VC,x
        inx
        iny
        bne :-
@trees: ldy #0
@fill:  cpy _c_tw
        beq @next
        lda _edge_tile
        sta VT,x
        lda #$FF
        sta VC,x
        inx
        iny
        bne @fill
@next:  lda ptr1
        clc
        adc #MAP_W
        sta ptr1
        bcc :+
        inc ptr1+1
:       inc cwy
        inc cy
        lda cy
        cmp _c_th
        bne @row

        ; gates (4 bytes: x, y, kind, zone)
        lda #0
        sta ci
@gate:  lda ci
        cmp _ngates
        beq @gdone
        asl a
        asl a
        tay
        lda _gates,y
        sec
        sbc _c_tx
        cmp _c_tw
        bcs @gnext
        sta cx_
        lda _gates+1,y
        jsr rowof
        bcs @gnext
        ldy ci
        lda _gate_t,y
        sta VT,x
@gnext: inc ci
        bne @gate
@gdone:
        ; nodes (5 bytes: x, y, mineral, respawn lo/hi), showing once regrown
        lda #0
        sta ci
        ldy #0
@node:  lda ci
        cmp _nnodes
        beq @ndone
        lda _nodes+4,y          ; respawn <= seconds?
        cmp _seconds+1
        bcc @nshow
        bne @nnext
        lda _seconds
        cmp _nodes+3,y
        bcc @nnext
@nshow: lda _nodes,y
        sec
        sbc _c_tx
        cmp _c_tw
        bcs @nnext
        sta cx_
        lda _nodes+1,y
        sty ptr2                ; (rowof uses X)
        jsr rowof
        ldy ptr2
        bcs @nnext
        lda #T_NODE
        sta VT,x
        lda _nodes+2,y
        cmp #PRISM
        bne :+
        lda _prism_col
        bne @ncol
:       sty ptr2
        tay
        lda _mineral_color,y
        ldy ptr2
@ncol:  sta VC,x
@nnext: tya
        clc
        adc #5
        tay
        inc ci
        bne @node
@ndone:
        ; villagers (3 bytes: x, y, move_t), in the village only
        lda _map_id
        cmp #$FF
        bne @vdone
        lda #0
        sta ci
@vill:  lda ci
        cmp #NNPC_
        beq @vdone
        asl a
        adc ci                  ; x3 (carry clear: ci < 6)
        tay
        lda _npcs,y
        sec
        sbc _c_tx
        cmp _c_tw
        bcs @vnext
        sta cx_
        lda _npcs+1,y
        jsr rowof
        bcs @vnext
        lda ci
        clc
        adc #T_N_MAYOR
        sta VT,x
@vnext: inc ci
        bne @vill
@vdone:
        ; monsters (9 bytes: x, y, hx, hy, type, alive, ...)
        lda #0
        sta ci
        ldy #0
@mob:   lda ci
        cmp _nmobs
        beq @mdone
        lda _mobs+5,y
        beq @mnext
        lda _mobs,y
        sec
        sbc _c_tx
        cmp _c_tw
        bcs @mnext
        sta cx_
        lda _mobs+1,y
        sty ptr2
        jsr rowof
        ldy ptr2
        bcs @mnext
        sty ptr2
        ldy ci
        lda _mob_tile,y
        ldy ptr2
        sta VT,x
        lda #$FF
        sta VC,x
@mnext: tya
        clc
        adc #9
        tay
        inc ci
        bne @mob
@mdone: rts

; A = an entity's map row, cx_ = its column within the box: carry clear and
; X = its offset in vt/vc if the row is inside the box too
rowof:  clc
        adc #1
        sec
        sbc _c_ty
        cmp _c_th
        bcs :+
        tax
        lda voff,x
        clc
        adc cx_
        tax
        clc
:       rts
