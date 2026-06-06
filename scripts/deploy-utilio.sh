#!/usr/bin/env bash
# Deploy master-utils / image-tools to the Lightsail instance in config/subdomains.json.
#
# Usage:
#   set -a && source .env.deploy.local && set +a   # S3 keys (required)
#   ./scripts/deploy-utilio.sh
#
# Production app config (DB, auth, Google OAuth) is read from .env.production.
#
# DB_PASS is fetched automatically via your default AWS CLI credentials
# (just-write-cli). Do NOT use utilio-s3 for Lightsail API calls.
#
# SSH: set LIGHTSAIL_SSH_KEY in .env.deploy.local, or uses a short-lived
# Lightsail certificate from get-instance-access-details.
#
# Zero-downtime: builds in /srv/app-staging while /srv/app keeps serving,
# then atomically swaps directories and pm2 reloads (~few seconds). Set
# DEPLOY_STOP_FOR_BUILD=1 to stop the app during build if the instance is
# low on memory.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=scripts/lib/deploy-common.sh
source "$ROOT/scripts/lib/deploy-common.sh"
deploy_common_load_config "$ROOT"

# Bash `source` breaks on DB passwords with backticks/shell metacharacters.
load_env_file() {
  local file="$1"
  [[ -f "$file" ]] || return 0
  eval "$(python3 - "$file" <<'PY'
import re, shlex, sys
path = sys.argv[1]
for raw in open(path):
    line = raw.strip()
    if not line or line.startswith("#"):
        continue
    m = re.match(r"([A-Za-z_][A-Za-z0-9_]*)=(.*)", line)
    if not m:
        continue
    key, val = m.group(1), m.group(2).strip()
    if len(val) >= 2 and val[0] == val[-1] and val[0] in "\"'":
        val = val[1:-1]
    print(f"export {key}={shlex.quote(val)}")
PY
)"
}

load_env_file "$ROOT/.env.production"

HOST="${DEPLOY_HOST:-$SUBDOMAIN_STATIC_IP}"
DOMAIN="${SUBDOMAIN_APEX:-utilio.solutions}"
APP_DIR="/srv/app"
STAGING_DIR="/srv/app-staging"
REPO="https://github.com/jbaddley/master-utils.git"

DB_REGION="us-west-2"
DB_LIGHTSAIL_NAME="master-utils"
DB_HOST="ls-58907195a82f03c61fc90514bcda4858f2ad4e4f.c9ikm6m4kgcr.us-west-2.rds.amazonaws.com"
DB_USER="dbmasteruser"
DB_NAME="dbmaster"

UTILIO_AWS_KEY="${AWS_ACCESS_KEY_ID:?Set AWS_ACCESS_KEY_ID in .env.deploy.local (utilio-s3)}"
UTILIO_AWS_SECRET="${AWS_SECRET_ACCESS_KEY:?Set AWS_SECRET_ACCESS_KEY in .env.deploy.local}"
AUTH_SECRET="${AUTH_SECRET:-${NEXTAUTH_SECRET:-$(openssl rand -base64 32)}}"
# Pin OAuth callbacks to apex; auth cookies use .utilio.solutions so swim can initiate sign-in.
AUTH_URL="${AUTH_URL:-${NEXTAUTH_URL:-https://${DOMAIN}}}"
GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID:-}"
GOOGLE_CLIENT_SECRET="${GOOGLE_CLIENT_SECRET:-}"

aws_admin() {
  env -u AWS_ACCESS_KEY_ID -u AWS_SECRET_ACCESS_KEY -u AWS_SESSION_TOKEN aws "$@"
}

fetch_db_pass() {
  if [[ -n "${DB_PASS:-}" ]]; then
    return
  fi
  echo "▸ Fetching DB password (default AWS CLI profile, not utilio-s3)"
  DB_PASS="$(aws_admin lightsail get-relational-database-master-user-password \
    --relational-database-name "$DB_LIGHTSAIL_NAME" \
    --region "$DB_REGION" \
    --query masterUserPassword \
    --output text)"
}

fetch_db_pass
deploy_common_setup_ssh

DB_PASS_ENC="$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$DB_PASS")"
# Lightsail Postgres requires SSL from the app instance (non-SSL → pg_hba "no encryption").
DATABASE_URL_ENC="postgresql://${DB_USER}:${DB_PASS_ENC}@${DB_HOST}:5432/${DB_NAME}?uselibpqcompat=true&sslmode=require"
export DATABASE_URL_ENC

echo "▸ SSH preflight"
"${SSH[@]}" "ubuntu@$HOST" "echo ok"

echo "▸ Bootstrap server (first run only)"
"${SSH[@]}" "ubuntu@$HOST" bash <<'REMOTE_BOOT'
set -e
# OpenClaw blueprint runs Apache on :80/:443 with an IP-only TLS cert — stop it so
# Caddy can obtain certificates for utilio.solutions and subdomains.
if systemctl is-active apache2 >/dev/null 2>&1; then
  sudo systemctl stop apache2
  sudo systemctl disable apache2
fi
if systemctl is-active nginx >/dev/null 2>&1; then
  sudo systemctl stop nginx
  sudo systemctl disable nginx
fi
if ! command -v caddy >/dev/null; then
  sudo apt-get install -y apt-transport-https curl gnupg ca-certificates
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    | sudo tee /etc/apt/sources.list.d/caddy-stable.list
  sudo apt-get update
  sudo apt-get install -y caddy
  sudo systemctl enable caddy
fi
need_node22() {
  command -v node >/dev/null || return 0
  node -p "process.version.slice(1).split('.')[0]" | grep -qv '^22$'
}
if need_node22; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs git
fi
if ! command -v pm2 >/dev/null; then
  sudo npm install -g pm2
fi
sudo mkdir -p /srv/app /srv/app-staging
if [ ! -f /swapfile ]; then
  sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi
REMOTE_BOOT

echo "▸ Sync app to staging"
"${SSH[@]}" "ubuntu@$HOST" bash <<REMOTE_SYNC
set -e
STAGING="$STAGING_DIR"
REPO="$REPO"
if [ ! -d "\$STAGING/.git" ]; then
  sudo rm -rf "\$STAGING"
  sudo git clone "\$REPO" "\$STAGING"
  sudo chown -R ubuntu:ubuntu "\$STAGING"
else
  cd "\$STAGING" && git fetch origin && git reset --hard origin/main
fi
REMOTE_SYNC

echo "▸ Write .env.local (staging)"
export AUTH_URL AUTH_SECRET GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET UTILIO_AWS_KEY UTILIO_AWS_SECRET
export NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL:-https://${DOMAIN}}"
export NEXT_PUBLIC_SITE_NAME="${NEXT_PUBLIC_SITE_NAME:-Utilio}"
export LLM_BASE_URL="${LLM_BASE_URL:-http://localhost:11434/v1}"
export LLM_API_KEY="${LLM_API_KEY:-ollama}"
export LLM_DEFAULT_MODEL="${LLM_DEFAULT_MODEL:-llama3.2}"
export NEXT_PUBLIC_LLM_MODE="${NEXT_PUBLIC_LLM_MODE:-server}"
export SWIM_EMAIL_FROM="${SWIM_EMAIL_FROM:-meets@utilio.solutions}"
export SWIM_EMAIL_FROM_NAME="${SWIM_EMAIL_FROM_NAME:-Utilio Swim}"
export NEXT_PUBLIC_SWIM_URL="${NEXT_PUBLIC_SWIM_URL:-https://swim.utilio.solutions}"
export AWS_SES_REGION="${AWS_SES_REGION:-${AWS_REGION:-us-east-1}}"
export STRIPE_SECRET_KEY="${STRIPE_SECRET_KEY:-}"
export NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:-}"
export NEXT_PUBLIC_STRIPE_PRO_BUY_BUTTON_ID="${NEXT_PUBLIC_STRIPE_PRO_BUY_BUTTON_ID:-}"
export DONATION_PRODUCT_ID="${DONATION_PRODUCT_ID:-${STRIPE_DONATION_PRODUCT_ID:-}}"
export STRIPE_WEBHOOK_SECRET="${STRIPE_WEBHOOK_SECRET:-}"
export STRIPE_HAMLET_PRODUCT_ID="${STRIPE_HAMLET_PRODUCT_ID:-}"
export STRIPE_HAMLET_PRICE_ID="${STRIPE_HAMLET_PRICE_ID:-}"
python3 - "$STAGING_DIR" <<'PY' | "${SSH[@]}" "ubuntu@$HOST" "python3 -c \"import sys; open(sys.argv[1], 'w').write(sys.stdin.read())\" $STAGING_DIR/.env.local"
import os, shlex, sys

app_dir = sys.argv[1]  # unused; path is passed on remote argv

def q(key: str) -> str:
    return shlex.quote(os.environ[key])

def add_if_set(key: str, lines: list[str]) -> None:
    val = os.environ.get(key)
    if val:
        lines.append(f"{key}={shlex.quote(val)}")

lines = [
    f"DATABASE_URL={q('DATABASE_URL_ENC')}",
    f"AUTH_SECRET={q('AUTH_SECRET')}",
    f"AUTH_URL={q('AUTH_URL')}",
    "AUTH_TRUST_HOST=true",
    f"NEXT_PUBLIC_SITE_URL={q('NEXT_PUBLIC_SITE_URL')}",
    f"NEXT_PUBLIC_SITE_NAME={q('NEXT_PUBLIC_SITE_NAME')}",
    f"GOOGLE_CLIENT_ID={q('GOOGLE_CLIENT_ID')}",
    f"GOOGLE_CLIENT_SECRET={q('GOOGLE_CLIENT_SECRET')}",
    f"LLM_BASE_URL={q('LLM_BASE_URL')}",
    f"LLM_API_KEY={q('LLM_API_KEY')}",
    f"LLM_DEFAULT_MODEL={q('LLM_DEFAULT_MODEL')}",
    f"NEXT_PUBLIC_LLM_MODE={q('NEXT_PUBLIC_LLM_MODE')}",
    f"SWIM_EMAIL_FROM={q('SWIM_EMAIL_FROM')}",
    f"SWIM_EMAIL_FROM_NAME={q('SWIM_EMAIL_FROM_NAME')}",
    f"NEXT_PUBLIC_SWIM_URL={q('NEXT_PUBLIC_SWIM_URL')}",
    f"AWS_SES_REGION={q('AWS_SES_REGION')}",
    "AWS_REGION=us-east-1",
    f"AWS_ACCESS_KEY_ID={q('UTILIO_AWS_KEY')}",
    f"AWS_SECRET_ACCESS_KEY={q('UTILIO_AWS_SECRET')}",
    "AWS_S3_BUCKET=utilio-uploads",
]
for key in (
    "STRIPE_SECRET_KEY",
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_STRIPE_PRO_BUY_BUTTON_ID",
    "DONATION_PRODUCT_ID",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_HAMLET_PRODUCT_ID",
    "STRIPE_HAMLET_PRICE_ID",
):
    add_if_set(key, lines)
os.environ.setdefault("NEXT_PUBLIC_SITE_URL", f"https://{os.environ.get('DOMAIN', 'utilio.solutions')}")
os.environ.setdefault("NEXT_PUBLIC_SITE_NAME", "Utilio")
os.environ.setdefault("LLM_BASE_URL", "http://localhost:11434/v1")
os.environ.setdefault("LLM_API_KEY", "ollama")
os.environ.setdefault("LLM_DEFAULT_MODEL", "llama3.2")
os.environ.setdefault("NEXT_PUBLIC_LLM_MODE", "server")
os.environ.setdefault("SWIM_EMAIL_FROM", "meets@utilio.solutions")
os.environ.setdefault("SWIM_EMAIL_FROM_NAME", "Utilio Swim")
os.environ.setdefault("NEXT_PUBLIC_SWIM_URL", "https://swim.utilio.solutions")
os.environ.setdefault("AWS_SES_REGION", os.environ.get("AWS_REGION", "us-east-1"))
sys.stdout.write("\n".join(lines) + "\n")
PY

echo "▸ Build in staging (live app keeps running until swap)"
"${SSH[@]}" "ubuntu@$HOST" bash <<REMOTE_BUILD
set -e
STAGING="$STAGING_DIR"
LIVE="$APP_DIR"
cd "\$STAGING"
df -h / | tail -1

if [[ "\${DEPLOY_STOP_FOR_BUILD:-}" == "1" ]]; then
  echo "▸ DEPLOY_STOP_FOR_BUILD=1 — stopping utilio during build"
  pm2 stop utilio 2>/dev/null || true
fi

if [ -d node_modules ]; then
  chmod -R u+w node_modules 2>/dev/null || true
  rm -rf node_modules
fi
rm -rf .next
npm ci --include=dev
set -a && source .env.local && set +a
npx prisma generate
npx prisma migrate deploy
NODE_OPTIONS="--max-old-space-size=3072" npm run build

if pm2 describe utilio >/dev/null 2>&1; then
  echo "▸ Atomic swap staging → live, then pm2 reload"
  SWAP_TMP="\${LIVE}.swap.\$\$"
  mv "\$LIVE" "\$SWAP_TMP"
  mv "\$STAGING" "\$LIVE"
  mv "\$SWAP_TMP" "\$STAGING"
  cd "\$LIVE"
  pm2 reload utilio --update-env
else
  echo "▸ First deploy — promoting staging to live"
  if [ -d "\$LIVE" ] && [ ! -e "\$LIVE/.git" ]; then
    rm -rf "\$LIVE"
  fi
  if [ ! -d "\$LIVE" ]; then
    mv "\$STAGING" "\$LIVE"
  else
    SWAP_TMP="\${LIVE}.swap.\$\$"
    mv "\$LIVE" "\$SWAP_TMP"
    mv "\$STAGING" "\$LIVE"
    mv "\$SWAP_TMP" "\$STAGING"
  fi
  cd "\$LIVE"
  pm2 delete utilio 2>/dev/null || true
  HOSTNAME=0.0.0.0 NODE_ENV=production pm2 start "npm start" --name utilio --cwd "\$LIVE"
fi
pm2 save
sudo env PATH=\$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu 2>/dev/null || true
REMOTE_BUILD

echo "▸ Caddy reverse proxy (generated from config/subdomains.json)"
CADDYFILE="$("$ROOT/scripts/generate-caddyfile.sh")"
printf '%s\n' "$CADDYFILE" | "${SSH[@]}" "ubuntu@$HOST" "sudo tee /etc/caddy/Caddyfile >/dev/null"
"${SSH[@]}" "ubuntu@$HOST" bash <<'REMOTE_CADDY'
set -e
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl enable caddy
if systemctl is-active --quiet caddy; then
  sudo caddy reload --config /etc/caddy/Caddyfile
else
  sudo systemctl start caddy
fi
REMOTE_CADDY

echo ""
echo "=== Deploy complete ==="
echo "https://${DOMAIN}"
