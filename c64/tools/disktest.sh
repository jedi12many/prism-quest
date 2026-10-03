#!/bin/sh
# Disk test: put a build on a .d64 image, boot VICE with real ROMs and a
# true-emulated 1541, autostart the game from the disk, run for a number of
# CPU cycles, screenshot, then list the disk. The disk image persists between
# runs, so a save made in one run can be loaded in the next.
#
#   ROMDIR=/path/to/roms tools/disktest.sh <prg> <disk.d64> <out.png> [cycles]
#
# ROMDIR must hold kernal, basic, chargen and dos1541 images (for example from
# the data/ folder of the upstream VICE source release). They are copyrighted,
# so they are not part of this repository.
set -e
PRG=$1
D64=$2
OUT=$3
CYCLES=${4:-200000000}
: "${ROMDIR:?set ROMDIR to a folder with kernal, basic, chargen and dos1541}"

if [ ! -f "$D64" ]; then
  c1541 -format "prism quest,pq" d64 "$D64" >/dev/null
fi
c1541 -attach "$D64" -delete prismquest -delete pq.hi >/dev/null 2>&1 || true
c1541 -attach "$D64" -write "$PRG" prismquest -write "$PRG.hi" pq.hi >/dev/null

LOG=$(mktemp)
timeout 600 xvfb-run -a x64sc \
  -kernal "$ROMDIR/kernal" -basic "$ROMDIR/basic" -chargen "$ROMDIR/chargen" \
  -dos1541 "$ROMDIR/dos1541" -drive8type 1541 -drive8truedrive \
  +sound -warp -autostart-handle-tde \
  -autostart "$(realpath "$D64"):prismquest" \
  -limitcycles "$CYCLES" -exitscreenshot "$(realpath -m "$OUT")" >"$LOG" 2>&1 || true
rm -f "$LOG"
test -f "$OUT" && echo "screenshot: $OUT"
c1541 -attach "$D64" -list
