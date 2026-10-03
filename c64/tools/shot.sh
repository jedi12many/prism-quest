#!/bin/sh
# Headless smoke test: boot VICE on stub ROMs, load the program through the
# monitor, run for a number of CPU cycles, and save a screenshot.
#   tools/shot.sh <prg> <out.png> [cycles]
set -e
PRG=$1
OUT=$2
CYCLES=${3:-4000000}
DIR=$(dirname "$0")
TMP=$(mktemp -d)
python3 "$DIR/stubroms.py" "$TMP/roms"
printf 'l "%s" 0\ng 080d\n' "$(realpath "$PRG")" > "$TMP/mon.txt"
timeout 300 xvfb-run -a x64sc -kernal "$TMP/roms/kernal" -basic "$TMP/roms/basic" -chargen "$TMP/roms/chargen" \
  -drive8type 0 +sound -warp -moncommands "$TMP/mon.txt" -limitcycles "$CYCLES" \
  -exitscreenshot "$(realpath -m "$OUT")" >"$TMP/vice.log" 2>&1 || true
rm -rf "$TMP"
test -f "$OUT" && echo "screenshot: $OUT"
