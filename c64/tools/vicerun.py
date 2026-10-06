#!/usr/bin/env python3
"""Headless test run: put a build on a .d64, boot VICE with real ROMs, run for
a number of CPU cycles, save a screenshot.

  ROMDIR=... vicerun.py <prg> <out.png> <cycles> [--truedrive] [--wav=FILE]

The game loads its second file (PQ.HI) and its overlays (PQ.OV1..7) from disk
as it goes, so tests need a working KERNAL and drive. ROMDIR must hold kernal,
basic, chargen (and dos1541 for --truedrive), e.g. from the data/ folder of
the upstream VICE source release; they're copyrighted, so not in this repo.

By default the drive is VICE's IEC-level virtual device: disk access is
instant in emulated time, so tests stay fast. --truedrive emulates a real 1541
instead (every load takes as long as on the real thing).

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
if not os.path.exists(d64):
    subprocess.run(['c1541', '-format', 'prism quest,pq', 'd64', d64], check=True, stdout=subprocess.DEVNULL)
files = [(prg, 'prismquest'), (prg + '.hi', 'pq.hi')]
n = 1
while os.path.exists('%s.%d' % (prg, n)):
    files.append(('%s.%d' % (prg, n), 'pq.ov%d' % n))
    n += 1
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
