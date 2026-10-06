#!/usr/bin/env python3
"""Build a 1541 disk image (.d64) with the files' sectors spaced for the fast
loader (src/drive.s).

  mkd64.py out.d64 "disk name,id" local1=name1 local2=name2[:extra] ...

(:extra spaces that file's blocks that many sectors further apart.)

The 1541's own DOS (and VICE's c1541) leaves 10 sectors between a file's
blocks: about 95 ms of spin on the outer tracks. The fast loader takes longer
than that over a block -- sending it to the C64, then the DOS's own job
handling of the next read -- about 145 ms all told (measured in VICE's true
drive emulation), so it would miss the next block and wait a whole
revolution. Here each track gets the spacing that just covers it (about
150 ms on every track), so the next block is always coming up. The DOS
reads these files as usual, only a little slower.

Files go in the order given (the first is what LOAD"*",8,1 finds), filling
the tracks out from the directory: 17 down to 1, then 19 up to 35. Names are
ASCII, stored as PETSCII the way c1541 does (letters upper case).
"""
import sys

SPT = [0] + [21] * 17 + [19] * 7 + [18] * 6 + [17] * 5     # sectors per track, 1-35
# spacing per zone: about 150 ms of the 200 ms revolution (one sector: 9.5-11.8 ms)
GAP = {21: 16, 19: 15, 18: 14, 17: 13}
DIR_GAP = 3                                                 # (as the DOS spaces the directory)


def offset(t, s):
    return (sum(SPT[1:t]) + s) * 256


def petscii(name):
    return bytes(ord(c.upper()) if c.isalpha() else ord(c) for c in name)


def main():
    out, label = sys.argv[1], sys.argv[2]
    title, _, disk_id = label.partition(',')
    files = []
    for a in sys.argv[3:]:
        local, name = a.split('=', 1)
        name, _, extra = name.partition(':')
        files.append((local, name, int(extra or 0)))
    img = bytearray(offset(36, 0))
    free = {t: set(range(SPT[t])) for t in range(1, 36)}
    free[18] -= {0, 1}

    tracks = list(range(17, 0, -1)) + list(range(19, 36))
    entries = []
    for local, name, extra in files:
        data = open(local, 'rb').read()
        blocks = [data[i:i + 254] for i in range(0, len(data), 254)] or [b'']
        chain, ti, s = [], 0, 0
        for _ in blocks:
            while not free[tracks[ti]]:
                ti, s = ti + 1, 0
            t = tracks[ti]
            if chain and chain[-1][0] == t:
                s = (chain[-1][1] + GAP[SPT[t]] + extra) % SPT[t]
            while s not in free[t]:                     # (the next free one on)
                s = (s + 1) % SPT[t]
            free[t].discard(s)
            chain.append((t, s))
        for i, (t, s) in enumerate(chain):
            o = offset(t, s)
            b = blocks[i]
            if i + 1 < len(chain):
                img[o:o + 2] = bytes(chain[i + 1])
            else:
                img[o:o + 2] = bytes((0, len(b) + 1))
            img[o + 2:o + 2 + len(b)] = b
        entries.append((petscii(name), chain[0], len(chain)))

    # the directory: 8 entries a sector, from 18/1
    dsecs, s = [], 1
    for i in range(0, max(len(entries), 1), 8):
        dsecs.append(s)
        free[18].discard(s)
        s = (s + DIR_GAP) % SPT[18]
        while s not in free[18] and len(dsecs) < 18:
            s = (s + 1) % SPT[18]
    for k, ds in enumerate(dsecs):
        o = offset(18, ds)
        img[o:o + 2] = bytes((18, dsecs[k + 1])) if k + 1 < len(dsecs) else bytes((0, 255))
        for j, (nm, (t, s), n) in enumerate(entries[k * 8:k * 8 + 8]):
            e = o + j * 32
            img[e + 2] = 0x82                           # a closed PRG
            img[e + 3], img[e + 4] = t, s
            img[e + 5:e + 21] = nm[:16].ljust(16, b'\xa0')
            img[e + 30], img[e + 31] = n & 0xFF, n >> 8

    # the BAM, 18/0
    o = offset(18, 0)
    img[o:o + 4] = bytes((18, 1, 0x41, 0))
    for t in range(1, 36):
        bits = sum(1 << s for s in free[t])
        img[o + 4 * t:o + 4 * t + 4] = bytes((len(free[t]), bits & 0xFF, (bits >> 8) & 0xFF, bits >> 16))
    img[o + 0x90:o + 0xA0] = petscii(title)[:16].ljust(16, b'\xa0')
    img[o + 0xA0:o + 0xA2] = b'\xa0\xa0'
    img[o + 0xA2:o + 0xA4] = petscii(disk_id or 'pq')[:2].ljust(2, b' ')
    img[o + 0xA4] = 0xA0
    img[o + 0xA5:o + 0xA7] = b'2A'
    img[o + 0xA7:o + 0xAB] = b'\xa0' * 4
    open(out, 'wb').write(img)


if __name__ == '__main__':
    main()
