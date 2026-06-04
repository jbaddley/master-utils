#!/usr/bin/env bash
# Deploy master-utils / image-tools to theater-stack Lightsail instance.
#
# Usage:
#   set -a && source .env.deploy.local && set +a   # S3 keys + AUTH_SECRET only
#   ./scripts/deploy-utilio.sh
#
# DB_PASS is fetched automatically via your default AWS CLI credentials
# (just-write-cli). Do NOT use utilio-s3 for Lightsail API calls.
#
# SSH uses a short-lived Lightsail certificate from get-instance-access-details
# (theater-stack-deploy.pem on disk is not required).

set -euo pipefail

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
AUTH_SECRET="${AUTH_SECRET:-$(openssl rand -base64 32)}"

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
  cd $APP_DIR && git pull
fi
REMOTE_SYNC

echo "▸ Write .env.local"
"${SSH[@]}" "ubuntu@$HOST" bash <<REMOTE_ENV
set -e
cat > $APP_DIR/.env.local <<ENV
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS_ENC}@${DB_HOST}:5432/${DB_NAME}"
AUTH_SECRET="${AUTH_SECRET}"
AUTH_URL="https://${DOMAIN}"
AUTH_TRUST_HOST="true"
NEXT_PUBLIC_SITE_URL="https://${DOMAIN}"
NEXT_PUBLIC_SITE_NAME="Utilio"
GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID:-}"
GOOGLE_CLIENT_SECRET="${GOOGLE_CLIENT_SECRET:-}"
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="${UTILIO_AWS_KEY}"
AWS_SECRET_ACCESS_KEY="${UTILIO_AWS_SECRET}"
AWS_S3_BUCKET="utilio-uploads"
ENV
REMOTE_ENV

echo "▸ Build and migrate"
"${SSH[@]}" "ubuntu@$HOST" bash <<REMOTE_BUILD
set -e
cd $APP_DIR
df -h / | tail -1
rm -rf node_modules .next
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

echo "▸ Caddy reverse proxy (this instance uses Caddy, not nginx)"
"${SSH[@]}" "ubuntu@$HOST" bash <<REMOTE_CADDY
set -e
sudo tee /etc/caddy/Caddyfile >/dev/null <<'CADDY'
utilio.solutions, www.utilio.solutions {
	encode gzip
	header {
		Cross-Origin-Opener-Policy "same-origin"
		Cross-Origin-Embedder-Policy "require-corp"
	}
	reverse_proxy 127.0.0.1:3000 {
		header_up Host {host}
		header_up X-Forwarded-Host {host}
		header_up X-Forwarded-Proto {scheme}
	}
}
CADDY
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
REMOTE_CADDY

echo ""
echo "=== Deploy complete ==="
echo "https://${DOMAIN}"
