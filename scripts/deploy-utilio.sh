#!/usr/bin/env bash
# Deploy master-utils / image-tools to theater-stack Lightsail instance.
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
# SSH uses a short-lived Lightsail certificate from get-instance-access-details
# (theater-stack-deploy.pem on disk is not required).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

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

HOST="54.152.205.78"
INSTANCE="theater-stack"
REGION="us-east-1"
DOMAIN="utilio.solutions"
APP_DIR="/srv/app"
REPO="https://github.com/jbaddley/master-utils.git"

DB_REGION="us-west-2"
DB_LIGHTSAIL_NAME="master-utils"
DB_HOST="ls-58907195a82f03c61fc90514bcda4858f2ad4e4f.c9ikm6m4kgcr.us-west-2.rds.amazonaws.com"
DB_USER="dbmasteruser"
DB_NAME="dbmaster"

UTILIO_AWS_KEY="${AWS_ACCESS_KEY_ID:?Set AWS_ACCESS_KEY_ID in .env.deploy.local (utilio-s3)}"
UTILIO_AWS_SECRET="${AWS_SECRET_ACCESS_KEY:?Set AWS_SECRET_ACCESS_KEY in .env.deploy.local}"
AUTH_SECRET="${AUTH_SECRET:-${NEXTAUTH_SECRET:-$(openssl rand -base64 32)}}"
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

setup_ssh() {
  SSH_DIR="$(mktemp -d)"
  trap 'rm -rf "$SSH_DIR"' EXIT
  echo "▸ Fetching temporary Lightsail SSH certificate"
  ACCESS_JSON="$(aws_admin lightsail get-instance-access-details \
    --instance-name "$INSTANCE" \
    --region "$REGION" \
    --protocol ssh \
    --output json)"
  python3 - "$SSH_DIR" "$ACCESS_JSON" <<'PY'
import json, os, stat, sys
ssh_dir, raw = sys.argv[1], sys.argv[2]
d = json.loads(raw)["accessDetails"]
priv = os.path.join(ssh_dir, "tempkey")
cert = os.path.join(ssh_dir, "tempkey-cert.pub")
open(priv, "w").write(d["privateKey"])
open(cert, "w").write(d["certKey"])
os.chmod(priv, stat.S_IRUSR | stat.S_IWUSR)
os.chmod(cert, stat.S_IRUSR | stat.S_IWUSR)
print(d.get("ipAddress") or "")
PY
  SSH_KEY="$SSH_DIR/tempkey"
  SSH=(ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no)
}

fetch_db_pass
setup_ssh

DB_PASS_ENC="$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$DB_PASS")"
# Lightsail Postgres requires SSL from the app instance (non-SSL → pg_hba "no encryption").
DATABASE_URL_ENC="postgresql://${DB_USER}:${DB_PASS_ENC}@${DB_HOST}:5432/${DB_NAME}?uselibpqcompat=true&sslmode=require"
export DATABASE_URL_ENC

echo "▸ SSH preflight"
"${SSH[@]}" "ubuntu@$HOST" "echo ok"

echo "▸ Bootstrap server (first run only)"
"${SSH[@]}" "ubuntu@$HOST" bash <<'REMOTE_BOOT'
set -e
need_node22() {
  command -v node >/dev/null || return 0
  node -p "process.version.slice(1).split('.')[0]" | grep -qv '^22$'
}
if need_node22; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs git nginx certbot python3-certbot-nginx
  sudo npm install -g pm2
fi
sudo mkdir -p /srv/app
if [ ! -f /swapfile ]; then
  sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi
REMOTE_BOOT

echo "▸ Sync app"
"${SSH[@]}" "ubuntu@$HOST" bash <<REMOTE_SYNC
set -e
if [ ! -d $APP_DIR/.git ]; then
  sudo rm -rf $APP_DIR
  sudo git clone $REPO $APP_DIR
  sudo chown -R ubuntu:ubuntu $APP_DIR
else
  cd $APP_DIR && git fetch origin && git reset --hard origin/main
fi
REMOTE_SYNC

echo "▸ Write .env.local"
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
python3 - "$APP_DIR" <<'PY' | "${SSH[@]}" "ubuntu@$HOST" "python3 -c \"import sys; open(sys.argv[1], 'w').write(sys.stdin.read())\" $APP_DIR/.env.local"
import os, shlex, sys

app_dir = sys.argv[1]  # unused; path is passed on remote argv

def q(key: str) -> str:
    return shlex.quote(os.environ[key])

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

echo "▸ Build and migrate (site will 502 until pm2 restarts — ~8–10 min)"
"${SSH[@]}" "ubuntu@$HOST" bash <<REMOTE_BUILD
set -e
cd $APP_DIR
df -h / | tail -1
pm2 stop utilio 2>/dev/null || true
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
pm2 delete utilio 2>/dev/null || true
HOSTNAME=0.0.0.0 NODE_ENV=production pm2 start "npm start" --name utilio
pm2 save
sudo env PATH=\$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu 2>/dev/null || true
REMOTE_BUILD

echo "▸ Caddy reverse proxy (generated from config/subdomains.json)"
setup_ssh
CADDYFILE="$("$ROOT/scripts/generate-caddyfile.sh")"
printf '%s\n' "$CADDYFILE" | "${SSH[@]}" "ubuntu@$HOST" "sudo tee /etc/caddy/Caddyfile >/dev/null"
"${SSH[@]}" "ubuntu@$HOST" bash <<'REMOTE_CADDY'
set -e
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
REMOTE_CADDY

echo ""
echo "=== Deploy complete ==="
echo "https://${DOMAIN}"
