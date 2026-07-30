# Shop Manager deployment on Termux

These instructions assume the repository is located at `$HOME/shop-manager`. Change
`SHOP_MANAGER_DIR` in the helper scripts if a different directory is used.

## 1. Install Termux requirements

Install **Termux**, **Termux:API**, and **Termux:Boot** from the same F-Droid source.
Open Termux:Boot once after installing it, then exempt all three apps from Android
battery optimization.

```bash
pkg update
pkg upgrade
pkg install nodejs-lts git rclone sqlite termux-api
node --version
```

The Node version must satisfy `22.x || >=24`. The expected `node:sqlite`
`ExperimentalWarning` on Node 22 is harmless.

## 2. Install, migrate, build, and test

```bash
cd "$HOME/shop-manager"
npm ci
npm run db:migrate
npm run build
npm run typecheck
```

This repository's Vite config builds into `dist/client/`. `@fastify/static` serves
that directory. The not-found handler sends `dist/client/index.html` only for
non-API GET/HEAD routes without an asset extension, enabling React Router while
keeping missing API and asset responses as structured 404 errors. If another Vite
setup outputs directly to `dist/`, start the server with `FRONTEND_PATH=dist`.

## 3. Start the TypeScript server under PM2

Acquire the Android wake lock before starting the service:

```bash
termux-wake-lock
```

Start `src/server/index.ts` through the project's local `tsx` executable:

```bash
cd "$HOME/shop-manager"
NODE_ENV=production PORT=3000 DATABASE_PATH=shop.db \
  ./node_modules/.bin/pm2 start ./node_modules/.bin/tsx \
  --name shop-manager \
  --cwd "$HOME/shop-manager" \
  --interpreter none \
  --time \
  -- src/server/index.ts
./node_modules/.bin/pm2 save
./node_modules/.bin/pm2 status
```

Open `http://127.0.0.1:3000` on the phone. Other LAN devices can use the phone's
Wi-Fi IP and port 3000 if Android and the network permit it.

## 4. Restore PM2 after a phone reboot

Termux does not use systemd. Install the repository boot script for Termux:Boot:

```bash
cd "$HOME/shop-manager"
chmod +x deploy/termux/start-shop-manager.sh
mkdir -p "$HOME/.termux/boot"
ln -sfn \
  "$HOME/shop-manager/deploy/termux/start-shop-manager.sh" \
  "$HOME/.termux/boot/shop-manager"
```

The boot script executes `termux-wake-lock` and then `pm2 resurrect`. Run `pm2 save`
again whenever the PM2 process list changes.

If Termux:Boot cannot be installed, this less reliable `.bashrc` fallback restores
PM2 only when a Termux shell is opened:

```bash
cat >> "$HOME/.bashrc" <<'BASHRC'
if [[ -x "$HOME/shop-manager/node_modules/.bin/pm2" ]]; then
  termux-wake-lock
  "$HOME/shop-manager/node_modules/.bin/pm2" resurrect >/dev/null 2>&1 || true
fi
BASHRC
```

Release the wake lock only when intentionally taking the server offline:

```bash
cd "$HOME/shop-manager"
./node_modules/.bin/pm2 stop shop-manager
termux-wake-unlock
```

## 5. Configure Google Drive with rclone

Run the interactive configuration and create a remote named `gdrive`:

```bash
rclone config
```

Choose `n` (new remote), enter `gdrive`, choose the Google Drive provider, accept
the default client ID/secret unless you own OAuth credentials, choose the required
Drive scope, and complete browser authorization. Verify it without exposing tokens:

```bash
rclone lsd gdrive:
```

The generated `$HOME/.config/rclone/rclone.conf` contains OAuth secrets. Never add
it to Git or copy it into this repository.

## 6. Run and schedule a consistent daily database backup

The script uses SQLite's online `.backup` command rather than copying a live WAL
database directly. It validates the snapshot and uploads it as a timestamped
`shop.db` file.

```bash
cd "$HOME/shop-manager"
chmod +x deploy/termux/backup-shop-db.sh
./deploy/termux/backup-shop-db.sh
tail -n 50 logs/backup.log
```

Schedule it approximately once every 24 hours with Android JobScheduler:

```bash
termux-job-scheduler \
  --job-id 1001 \
  --script "$HOME/shop-manager/deploy/termux/backup-shop-db.sh" \
  --period-ms 86400000 \
  --network any \
  --battery-not-low true \
  --storage-not-low true \
  --persisted true
termux-job-scheduler --pending
```

Android chooses the exact execution time. To remove the schedule:

```bash
termux-job-scheduler --cancel 1001
```

Set a different remote folder by editing `RCLONE_DESTINATION` in the script or by
using a small wrapper script, because JobScheduler does not source `.bashrc`.

## 7. Import historical inventory once

The CSV header must be:

```csv
type,design_name,cost_price,listed_price
shirt,Blue floral,500,800
shirt,Blue floral,500,800
kurta,Gold border,700,1100
```

Back up the database first, then run migrations and import:

```bash
cd "$HOME/shop-manager"
./deploy/termux/backup-shop-db.sh
INITIAL_STOCK_DATE=2026-07-30 npm run db:import -- ./initial-stock.csv
```

The importer creates one closed `Initial Stock` Order. To preserve the immutable
cost inheritance rule, it creates one arrived Bundle per unique
`(type, design_name, cost_price)` group and links one InventoryItem to that Bundle
for every CSV row. Imported marked/listed/target prices use `listed_price`, floor
price uses immutable `cost_price`, and max discount starts at zero. The entire
operation is transactional and refuses to create a second Initial Stock order.