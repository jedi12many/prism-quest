#!/usr/bin/env python3
"""Write placeholder ROM images so VICE can boot without Commodore's ROMs.

Ubuntu/Debian's VICE package ships without the C64 KERNAL, BASIC and character
ROMs (they're copyrighted). The game doesn't need them: it banks the ROMs out,
brings its own character set and drives the hardware directly. So for headless
testing we boot VICE on these stubs and load the program with the monitor.

  kernal  - every byte is RTS, so a stray KERNAL call just returns; RESET sets up
            the CPU port like the real one, then parks the CPU in a loop, IRQ/NMI point at an RTI
  basic   - zeros (never executed)
  chargen - zeros (the game brings its own font)

On a real C64, or a VICE with the real ROMs, none of this is used.
"""
import os
import sys

out = sys.argv[1] if len(sys.argv) > 1 else 'build/roms'
os.makedirs(out, exist_ok=True)

kernal = bytearray([0x60] * 8192)           # $E000-$FFFF, all RTS
reset = [0x78, 0xD8, 0xA2, 0xFF, 0x9A,      # SEI CLD LDX #$FF TXS
         0xA9, 0x2F, 0x85, 0x00,            # LDA #$2F STA $00  (CPU port direction,
         0xA9, 0x37, 0x85, 0x01,            # LDA #$37 STA $01   as the real KERNAL sets it)
         0x4C, 0x0D, 0xE0]                  # JMP $E00D (park)
kernal[0:len(reset)] = bytes(reset)
kernal[0x20] = 0x40                         # $E020: RTI
for vec, addr in ((0x1FFA, 0xE020), (0x1FFC, 0xE000), (0x1FFE, 0xE020)):
    kernal[vec] = addr & 0xFF
    kernal[vec + 1] = addr >> 8

for name, data in (('kernal', kernal), ('basic', bytes(8192)), ('chargen', bytes(4096))):
    with open(os.path.join(out, name), 'wb') as f:
        f.write(data)
