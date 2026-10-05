; Overlay file headers: each PQ.OVn starts with its load address (the
; overlay window) and a two-byte signature, "O" and its number, which ovl()
; in save.c checks after loading.
;   1 title + game over   2 talk: Mayor, Grandma, Flint   3 talk: Pip, Barnaby, Willow
;   4 Spellbook           5-7 Power Tree for the mage, knight, whisperer
;   8 building the camp   9 the Village Ledger   10 the dungeons' floors   11 growing a zone
;   12 digging up a Prism Facet   13 the Glassworks   14 a Gloom Pact
;   15 the Rainycastle's floors   16 the big foes: the keepers', the castle's and the realm's portraits, and more
;   17 the ending   18 Sog'naroth's realm   19 the deeds   20 the Bag
;   21 the Sanctuary
        .import __OVL_START__
        .segment "OV1LOAD"
        .word   __OVL_START__
        .segment "OV1SIG"
        .byte   $4F, 1
        .segment "OV2LOAD"
        .word   __OVL_START__
        .segment "OV2SIG"
        .byte   $4F, 2
        .segment "OV3LOAD"
        .word   __OVL_START__
        .segment "OV3SIG"
        .byte   $4F, 3
        .segment "OV4LOAD"
        .word   __OVL_START__
        .segment "OV4SIG"
        .byte   $4F, 4
        .segment "OV5LOAD"
        .word   __OVL_START__
        .segment "OV5SIG"
        .byte   $4F, 5
        .segment "OV6LOAD"
        .word   __OVL_START__
        .segment "OV6SIG"
        .byte   $4F, 6
        .segment "OV7LOAD"
        .word   __OVL_START__
        .segment "OV7SIG"
        .byte   $4F, 7
        .segment "OV8LOAD"
        .word   __OVL_START__
        .segment "OV8SIG"
        .byte   $4F, 8
        .segment "OV9LOAD"
        .word   __OVL_START__
        .segment "OV9SIG"
        .byte   $4F, 9
        .segment "OV10LOAD"
        .word   __OVL_START__
        .segment "OV10SIG"
        .byte   $4F, 10
        .segment "OV11LOAD"
        .word   __OVL_START__
        .segment "OV11SIG"
        .byte   $4F, 11
        .segment "OV12LOAD"
        .word   __OVL_START__
        .segment "OV12SIG"
        .byte   $4F, 12
        .segment "OV13LOAD"
        .word   __OVL_START__
        .segment "OV13SIG"
        .byte   $4F, 13
        .segment "OV14LOAD"
        .word   __OVL_START__
        .segment "OV14SIG"
        .byte   $4F, 14
        .segment "OV15LOAD"
        .word   __OVL_START__
        .segment "OV15SIG"
        .byte   $4F, 15
        .segment "OV16LOAD"
        .word   __OVL_START__
        .segment "OV16SIG"
        .byte   $4F, 16
        .segment "OV17LOAD"
        .word   __OVL_START__
        .segment "OV17SIG"
        .byte   $4F, 17
        .segment "OV18LOAD"
        .word   __OVL_START__
        .segment "OV18SIG"
        .byte   $4F, 18
        .segment "OV19LOAD"
        .word   __OVL_START__
        .segment "OV19SIG"
        .byte   $4F, 19
        .segment "OV20LOAD"
        .word   __OVL_START__
        .segment "OV20SIG"
        .byte   $4F, 20
        .segment "OV21LOAD"
        .word   __OVL_START__
        .segment "OV21SIG"
        .byte   $4F, 21
