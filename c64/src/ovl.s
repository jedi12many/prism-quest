; Overlay file headers: each PQ.OVn starts with its load address (the
; overlay window) and a two-byte signature, "O" and its number, which ovl()
; in save.c checks after loading.
;   1 title + game over   2 talk: Mayor, Grandma, Flint   3 talk: Pip, Barnaby, Willow
;   4 Spellbook           5-7 Power Tree for the mage, knight, whisperer
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
