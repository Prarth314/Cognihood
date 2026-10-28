#!/usr/bin/env bash
set -euo pipefail

APP_URL="${COGNIHOOD_APP_URL:-http://127.0.0.1:3001}"
HEALTH_URL="${APP_URL%/}/healthz"
CHROMIUM_BIN="${CHROMIUM_BIN:-chromium}"
READY=0

if ! command -v "$CHROMIUM_BIN" >/dev/null 2>&1; then
  echo "Chromium executable not found: $CHROMIUM_BIN" >&2
  exit 1
fi

for _ in {1..30}; do
  if curl --fail --silent "$HEALTH_URL" >/dev/null; then
    READY=1
    break
  fi
  sleep 1
done

if [[ "$READY" -ne 1 ]]; then
  echo "CogniHood bridge did not become ready at $HEALTH_URL" >&2
  exit 1
fi

exec "$CHROMIUM_BIN" \
  --kiosk \
  --no-first-run \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --enable-gpu-rasterization \
  --enable-accelerated-2d-canvas \
  --enable-webgl \
  --enable-zero-copy \
  --ignore-gpu-blocklist \
  --use-gl=egl \
  --user-data-dir="$HOME/.config/chromium-cognihood" \
  "$APP_URL"
