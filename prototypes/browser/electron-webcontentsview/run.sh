#!/usr/bin/env bash
# Flauz Wave1-B — run the Electron WebContentsView browser-pane prototype.
# Starts a private Xvfb display, runs the demo, captures artifacts, cleans up.
set -uo pipefail
cd "$(dirname "$0")"
OUT="${FLAUZ_OUT:-./out}"
mkdir -p "$OUT"

XVFB_DISPLAY=":95"
Xvfb $XVFB_DISPLAY -screen 0 1440x900x24 -nolisten tcp &
XVFB_PID=$!
sleep 1

DISPLAY="$XVFB_DISPLAY" ELECTRON_DISABLE_SANDBOX=1 ./node_modules/.bin/electron . 2>&1 | tee "$OUT/demo-console.log"
STATUS=${PIPESTATUS[0]}

kill $XVFB_PID 2>/dev/null
echo "exit status: $STATUS (artifacts in $OUT)"
exit $STATUS
