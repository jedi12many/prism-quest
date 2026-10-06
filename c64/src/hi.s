; Header of the second file, PQ.HI: its load address, then a signature the
; game checks to know whether the file is in memory (see load_hi in save.c).
        .segment "HILOAD"
        .word   $E000                   ; the file starts with the sprite art
        .segment "HISIG"
        .byte   $50, $51, $48, $49, 1   ; "PQHI", version 1
