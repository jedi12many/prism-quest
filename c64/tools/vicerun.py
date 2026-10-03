#!/usr/bin/env python3
"""Headless smoke test on stub ROMs (see stubroms.py).

  vicerun.py <prg> <map> <out.png> <cycles>

The game normally loads its second file, PQ.HI, through the KERNAL and then
unpacks it: sprite art and charset go into the RAM under the I/O chips. The
stub ROMs can't load files, so this puts everything where unpacking would
leave it, through VICE's monitor (`bank ram` writes under the I/O chips).
The game then finds PQ.HI present and skips both steps.
"""
import os
import re
import subprocess
import sys
import tempfile

prg, mapfile, out, cycles = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
here = os.path.dirname(os.path.abspath(__file__))
tmp = tempfile.mkdtemp()
subprocess.run([sys.executable, os.path.join(here, 'stubroms.py'), tmp + '/roms'], check=True)

cmds = []
hi = prg + '.hi'
if os.path.exists(hi):
    sym = dict((k, int(v, 16)) for k, v in re.findall(r'(__HI\w+?__)\s+([0-9A-F]{6})', open(mapfile).read()))
    data = open(hi, 'rb').read()
    base = data[0] | data[1] << 8
    cmds.append('bank ram')
    for seg in ('HISPR', 'HICHR'):          # copy each tail to where unpack_hi() puts it
        load, run, size = sym['__%s_LOAD__' % seg], sym['__%s_RUN__' % seg], sym['__%s_SIZE__' % seg]
        part = os.path.join(tmp, seg + '.prg')
        with open(part, 'wb') as f:
            f.write(bytes([run & 255, run >> 8]) + data[2 + load - base: 2 + load - base + size])
        cmds.append('l "%s" 0' % part)
    cmds.append('l "%s" 0' % os.path.abspath(hi))
    cmds.append('bank cpu')
cmds += ['l "%s" 0' % os.path.abspath(prg), 'g 080d']
with open(tmp + '/mon.txt', 'w') as f:
    f.write('\n'.join(cmds) + '\n')

subprocess.run(['timeout', '600', 'xvfb-run', '-a', 'x64sc',
                '-kernal', tmp + '/roms/kernal', '-basic', tmp + '/roms/basic', '-chargen', tmp + '/roms/chargen',
                '-drive8type', '0', '+sound', '-warp', '-moncommands', tmp + '/mon.txt',
                '-limitcycles', cycles, '-exitscreenshot', os.path.abspath(out)],
               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
print('screenshot: %s' % out if os.path.exists(out) else 'no screenshot')
