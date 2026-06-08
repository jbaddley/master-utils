#!/usr/bin/env bash
# Runs on the Lightsail instance (uploaded by deploy-utilio.sh).
set -euo pipefail

STAGING="${STAGING:-/srv/app-staging}"
LIVE="${LIVE:-/srv/app}"
DEPLOY_STOP_FOR_BUILD="${DEPLOY_STOP_FOR_BUILD:-1}"

log() {
  echo "[$(date -u +%H:%M:%S)] $*"
}

swap_dirs() {
  local live="$1" staging="$2"
  local swap_tmp="${live}.swap.$$"
  sudo mv "$live" "$swap_tmp"
  sudo mv "$staging" "$live"
  sudo mv "$swap_tmp" "$staging"
  sudo chown -R ubuntu:ubuntu "$live" "$staging"
}

clean_deps() {
  log "Cleaning node_modules and .next"
  pm2 stop utilio 2>/dev/null || true
  chmod -R u+w node_modules 2>/dev/null || true
  sudo rm -rf node_modules .next
  npm cache clean --force
  sync
}

npm_ci_with_retry() {
  local attempt
  for attempt in 1 2 3; do
    log "npm ci attempt ${attempt}/3"
    if npm ci --include=dev --no-audit --no-fund --maxsockets=3; then
      log "npm ci succeeded"
      return 0
    fi
    log "npm ci failed on attempt ${attempt}"
    clean_deps
    sleep 10
  done
  return 1
}

cd "$STAGING"

log "Disk and memory before build"
df -h / | tail -1
free -h | head -2

sudo swapon /swapfile 2>/dev/null || true

if [[ "$DEPLOY_STOP_FOR_BUILD" == "1" ]]; then
  log "Stopping utilio during build (DEPLOY_STOP_FOR_BUILD=1)"
  pm2 stop utilio 2>/dev/null || true
fi

clean_deps
npm_ci_with_retry

set -a && source .env.local && set +a
log "Prisma generate + migrate"
npx prisma generate
npx prisma migrate deploy

log "Next.js build"
NODE_OPTIONS="--max-old-space-size=3072" npm run build

if pm2 describe utilio >/dev/null 2>&1; then
  log "Atomic swap staging → live, then pm2 reload"
  swap_dirs "$LIVE" "$STAGING"
  cd "$LIVE"
  pm2 reload utilio --update-env
else
  log "First deploy — promoting staging to live"
  if [ -d "$LIVE" ] && [ ! -e "$LIVE/.git" ]; then
    sudo rm -rf "$LIVE"
  fi
  if [ ! -d "$LIVE" ]; then
    sudo mv "$STAGING" "$LIVE"
    sudo chown -R ubuntu:ubuntu "$LIVE"
  else
    swap_dirs "$LIVE" "$STAGING"
  fi
  cd "$LIVE"
  pm2 delete utilio 2>/dev/null || true
  HOSTNAME=0.0.0.0 NODE_ENV=production pm2 start "npm start" --name utilio --cwd "$LIVE"
fi

pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu 2>/dev/null || true

log "UTILIO_DEPLOY_OK"
