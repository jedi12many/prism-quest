#!/usr/bin/env python3
"""Headless test run: put a build on a .d64, boot VICE with real ROMs, run for
a number of CPU cycles, save a screenshot.

  ROMDIR=... vicerun.py <prg> <out.png> <cycles> [--truedrive] [--wav=FILE]

The game loads its second file (PQ.HI) and its overlays (PQ.OV1..25) from disk
as it goes, so tests need a working KERNAL and drive. ROMDIR must hold kernal,
basic, chargen (and dos1541 for --truedrive), e.g. from the data/ folder of
the upstream VICE source release; they're copyrighted, so not in this repo.

By default the drive is VICE's IEC-level virtual device, and the game goes on
the disk as PRISMQUEST itself: VICE's autostart loads it quickly, and then
the game's own loads take almost no emulated time, so tests stay fast. (No
fast loader: it needs a drive that runs code.)

--truedrive emulates a real 1541 instead, and the disk is the real thing:
the boot file (the build's own .boot, or the main build's) as PRISMQUEST,
the game as PQ.MAIN and the fast loader's PQ.DRV, every load as long as on
real hardware. A fresh disk is laid out by mkd64.py either way.

--wav=FILE records the SID to a WAV file. That runs in real time, not warp
(VICE makes no sound in warp), so keep the cycle count small.
"""
import os
import subprocess
import sys
import tempfile

args = [a for a in sys.argv[1:] if not a.startswith('--')]
truedrive = '--truedrive' in sys.argv
wav = next((a[6:] for a in sys.argv if a.startswith('--wav=')), None)   # record the SID (real time)
prg, out, cycles = args[0], args[1], args[2]
d64 = args[3] if len(args) > 3 else None          # keep a disk across runs (saves)
roms = os.environ.get('ROMDIR')
if not roms:
    sys.exit('set ROMDIR to a folder with kernal, basic, chargen (and dos1541)')

tmp = tempfile.mkdtemp()
if not d64:
    d64 = os.path.join(tmp, 'test.d64')
# the boot file and the fast loader's drive code: the build's own, or the
# main build's (a test build doesn't change them)
here = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'build', 'prismquest.prg')
extra = {x: prg + x if os.path.exists(prg + x) else here + x for x in ('.boot', '.drv')}
if truedrive and os.path.exists(extra['.boot']):
    files = [(extra['.boot'], 'prismquest'), (prg, 'pq.main'), (extra['.drv'], 'pq.drv')]
else:
    files = [(prg, 'prismquest')]
files.append((prg + '.hi', 'pq.hi'))
n = 1
while os.path.exists('%s.%d' % (prg, n)):
    files.append(('%s.%d' % (prg, n), 'pq.ov%d' % n))
    n += 1
if not os.path.exists(d64):                        # a fresh disk: laid out for the fast loader
    subprocess.run([os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mkd64.py'), d64, 'prism quest,pq']
                   + ['%s=%s' % f for f in files], check=True)
else:                                              # a kept one (its saves stay): swap the game in
    cmd = ['c1541', '-attach', d64]
    for _, name in files:
        cmd += ['-delete', name]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    cmd = ['c1541', '-attach', d64]
    for path, name in files:
        cmd += ['-write', path, name]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL)

drive = (['-dos1541', roms + '/dos1541', '-drive8type', '1541', '-drive8truedrive', '-autostart-handle-tde']
         if truedrive else ['-drive8type', '1541', '+drive8truedrive', '-iecdevice8'])
subprocess.run(['timeout', '900', 'xvfb-run', '-a', 'x64sc',
                '-kernal', roms + '/kernal', '-basic', roms + '/basic', '-chargen', roms + '/chargen']
               + drive + (['-sound', '-sounddev', 'wav', '-soundarg', os.path.abspath(wav)] if wav else ['+sound', '-warp'])
               + ['-autostart', '%s:prismquest' % os.path.abspath(d64),
                          '-limitcycles', cycles, '-exitscreenshot', os.path.abspath(out)],
               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
print('screenshot: %s' % out if os.path.exists(out) else 'no screenshot')
