#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

APP_DIR="${SHOP_MANAGER_DIR:-$HOME/shop-manager}"
PM2_COMMAND="$APP_DIR/node_modules/.bin/pm2"
export PM2_HOME="${PM2_HOME:-$HOME/.pm2}"

# Keep the CPU awake so Android does not suspend the local server with the screen off.
termux-wake-lock

# Give Android networking and storage a moment to settle immediately after boot.
sleep "${TERMUX_BOOT_DELAY_SECONDS:-10}"

if [[ ! -x "$PM2_COMMAND" ]]; then
  echo "PM2 is missing at $PM2_COMMAND. Run npm ci in $APP_DIR first." >&2
  exit 1
fi

cd "$APP_DIR"
mkdir -p logs
"$PM2_COMMAND" resurrect >> logs/termux-boot.log 2>&1